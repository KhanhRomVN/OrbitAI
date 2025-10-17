// src/server/message-handler.ts
import * as vscode from "vscode";
import * as WebSocket from "ws";
import { ConversationStore } from "../storage/conversation-store";
import { CodeEditor } from "../editor/code-editor";
import {
  WebSocketMessage,
  PromptResponseData,
  FocusedTab,
} from "../types/interfaces";

export class MessageHandler {
  constructor(
    private conversationStore: ConversationStore,
    private codeEditor: CodeEditor,
    private onFocusedTabsUpdate: (tabs: FocusedTab[]) => void
  ) {}

  async handle(data: WebSocketMessage, ws: WebSocket): Promise<void> {
    switch (data.type) {
      case "browserExtensionConnected":
        break;

      case "focusedTabsUpdate":
        await this.handleFocusedTabsUpdate(data);
        break;

      case "promptResponse":
        await this.handlePromptResponse(data as unknown as PromptResponseData);
        break;

      default:
        console.log("[ZenChat] ⚠️ Unknown message type:", data.type);
    }
  }

  private async handleFocusedTabsUpdate(data: any): Promise<void> {
    const tabs: FocusedTab[] = data.data || [];
    this.conversationStore.setFocusedTabs(tabs);
    this.onFocusedTabsUpdate(tabs);
  }

  private async handlePromptResponse(data: PromptResponseData): Promise<void> {
    const tabId = data.tabId;

    if (data.success && data.response) {
      this.conversationStore.addMessage(tabId, {
        role: "assistant",
        content: data.response,
        timestamp: Date.now(),
      });

      await this.handleCodeChanges(data.response);
    } else {
      this.conversationStore.addMessage(tabId, {
        role: "error",
        content: data.error || "Unknown error",
        timestamp: Date.now(),
        errorType: data.errorType,
      });

      vscode.window.showErrorMessage(`Claude Error: ${data.error}`);
    }
  }

  private async handleCodeChanges(response: string): Promise<void> {
    const blocks = this.codeEditor.parseSearchReplaceBlocks(response);

    if (blocks.length === 0) {
      const shortResponse = response.substring(0, 100);
      vscode.window.showInformationMessage(
        `Claude: ${shortResponse}${response.length > 100 ? "..." : ""}`
      );
      return;
    }

    const action = await vscode.window.showInformationMessage(
      `Found ${blocks.length} code change(s). Apply them?`,
      "Apply",
      "Preview",
      "Reject"
    );

    if (action === "Apply") {
      const result = await this.codeEditor.applySearchReplace(blocks);

      if (result.success) {
        vscode.window.showInformationMessage(
          `Applied ${result.appliedChanges} change(s) successfully`
        );
      } else {
        vscode.window.showWarningMessage(
          `Applied ${result.appliedChanges}, failed ${result.failedChanges}. ` +
            `Errors: ${result.errors.join(", ")}`
        );
      }
    } else if (action === "Preview") {
      vscode.window.showInformationMessage("Preview feature coming soon!");
    }
  }
}
