// src/commands/ai-commands.ts
import * as vscode from "vscode";
import { PromptBuilder } from "../prompts/prompt-builder";
import { ConversationStore } from "../storage/conversation-store";

export class AICommands {
  constructor(
    private promptBuilder: PromptBuilder,
    private conversationStore: ConversationStore,
    private onSendPrompt: (
      tabId: number,
      prompt: string,
      requestId: string
    ) => void
  ) {}

  async handleCommand(intent: string, defaultPrompt: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("No active editor found");
      return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showWarningMessage("Please select code first");
      return;
    }

    const selectedCode = editor.document.getText(selection);
    const fileName = editor.document.fileName;

    // Build prompt with context
    const fullPrompt = `${defaultPrompt}\n\nFile: ${fileName}\n\`\`\`\n${selectedCode}\n\`\`\``;

    // Get current focused tab (use first available tab or create dummy)
    const focusedTabs = this.conversationStore.getFocusedTabs();
    const tabId = focusedTabs.length > 0 ? focusedTabs[0].tabId : Date.now();
    const requestId = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Send prompt
    this.onSendPrompt(tabId, fullPrompt, requestId);

    // Show webview
    vscode.commands.executeCommand("websocketView.focus");
  }

  async handleEditCommand(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("No active editor found");
      return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showWarningMessage("Please select code first");
      return;
    }

    const userInstruction = await vscode.window.showInputBox({
      prompt: "What would you like to do with this code?",
      placeHolder: "e.g., Add error handling, Optimize performance...",
    });

    if (!userInstruction) {
      return;
    }

    const selectedCode = editor.document.getText(selection);
    const fileName = editor.document.fileName;

    const fullPrompt = `${userInstruction}\n\nFile: ${fileName}\n\`\`\`\n${selectedCode}\n\`\`\``;

    const focusedTabs = this.conversationStore.getFocusedTabs();
    const tabId = focusedTabs.length > 0 ? focusedTabs[0].tabId : Date.now();
    const requestId = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    this.onSendPrompt(tabId, fullPrompt, requestId);
    vscode.commands.executeCommand("websocketView.focus");
  }

  async handleChatCommand(): Promise<void> {
    vscode.commands.executeCommand("websocketView.focus");
  }
}
