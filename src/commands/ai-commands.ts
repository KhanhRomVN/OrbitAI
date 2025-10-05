// src/commands/ai-commands.ts
import * as vscode from "vscode";
import { ContextManager } from "../context/context-manager";
import { PromptBuilder, PromptIntent } from "../prompts/prompt-builder";
import { ConversationStore } from "../storage/conversation-store";
import { FocusedTab } from "../types/interfaces";

export class AICommands {
  constructor(
    private contextManager: ContextManager,
    private promptBuilder: PromptBuilder,
    private conversationStore: ConversationStore,
    private sendPromptCallback: (
      tabId: number,
      prompt: string,
      requestId: string
    ) => void
  ) {}

  async handleCommand(
    intent: PromptIntent,
    defaultMessage: string
  ): Promise<void> {
    try {
      const focusedTabs = this.conversationStore.getFocusedTabs();

      if (focusedTabs.length === 0) {
        vscode.window.showWarningMessage(
          "No focused Claude tabs available. Please focus a tab first."
        );
        return;
      }

      // Select tab if multiple
      const selectedTab = await this.selectTab(focusedTabs);
      if (!selectedTab) return;

      // Show progress
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `OrbitAI: ${intent}`,
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: "Collecting context..." });

          // Collect context
          const context = await this.contextManager.collectContext({
            includeOpenFiles: intent !== "chat",
            includeSelection: true,
            includeDiagnostics: intent === "fix",
            includeWorkspace: false,
            maxFiles: 5,
          });

          progress.report({ message: "Building prompt..." });

          // Build prompt
          const prompt = await this.promptBuilder.buildPrompt({
            intent,
            userMessage: defaultMessage,
            context,
          });

          progress.report({ message: "Sending to Claude..." });

          // Generate request ID
          const requestId =
            Date.now() + "-" + Math.random().toString(36).substr(2, 9);

          // Store user message
          this.conversationStore.addMessage(selectedTab.tabId, {
            role: "user",
            content: defaultMessage,
            timestamp: Date.now(),
          });

          // Send via callback
          this.sendPromptCallback(
            selectedTab.tabId,
            prompt.userPrompt,
            requestId
          );

          progress.report({ message: "Waiting for response..." });
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(`OrbitAI Error: ${error}`);
    }
  }

  async handleEditCommand(): Promise<void> {
    const instruction = await vscode.window.showInputBox({
      prompt: "What changes do you want to make?",
      placeHolder:
        'e.g., "Add error handling", "Rename variables to be more descriptive"',
    });

    if (instruction) {
      await this.handleCommand("edit", instruction);
    }
  }

  async handleChatCommand(): Promise<void> {
    const message = await vscode.window.showInputBox({
      prompt: "Ask me anything about your code",
      placeHolder: 'e.g., "How does this function work?"',
    });

    if (message) {
      await this.handleCommand("chat", message);
    }
  }

  private async selectTab(
    focusedTabs: FocusedTab[]
  ): Promise<FocusedTab | undefined> {
    if (focusedTabs.length === 1) {
      return focusedTabs[0];
    }

    const items = focusedTabs.map((tab) => ({
      label: tab.containerName,
      description: tab.title,
      tab: tab,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select Claude tab to use",
    });

    return selected?.tab;
  }
}
