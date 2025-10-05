// src/webview/webview-provider.ts
import * as vscode from "vscode";
import { getWebviewHtml } from "./webview-html";
import { ConversationStore } from "../storage/conversation-store";
import { FocusedTab } from "../types/interfaces";

export class EnhancedWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "websocketView";
  private _view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly conversationStore: ConversationStore,
    private readonly onSendPrompt: (
      tabId: number,
      prompt: string,
      requestId: string
    ) => void
  ) {}

  public getView(): vscode.WebviewView | undefined {
    return this._view;
  }

  public updateServerStatus(isRunning: boolean): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: "serverStatusUpdate",
        isRunning: isRunning,
      });
    }
  }

  public updateFocusedTabs(tabs: FocusedTab[]): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: "focusedTabsUpdate",
        data: tabs,
      });
    }
  }

  public sendPromptResponse(data: any): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: "promptResponse",
        ...data,
      });
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = getWebviewHtml(webviewView.webview);

    // Restore state khi webview được tạo lại
    this.restoreState();

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((data) => {
      this.handleWebviewMessage(data);
    });

    // Listen to visibility changes
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        // Webview becomes visible again - restore state
        this.restoreState();
      }
    });
  }

  private restoreState(): void {
    if (!this._view) return;

    // Send focused tabs
    const focusedTabs = this.conversationStore.getFocusedTabs();
    if (focusedTabs.length > 0) {
      setTimeout(() => {
        this._view?.webview.postMessage({
          type: "focusedTabsUpdate",
          data: focusedTabs,
        });
      }, 100);
    }
  }

  private handleWebviewMessage(data: any): void {
    switch (data.type) {
      case "startServer":
        vscode.commands.executeCommand("orbit-ai.startServer");
        break;

      case "stopServer":
        vscode.commands.executeCommand("orbit-ai.stopServer");
        break;

      case "restartServer":
        vscode.commands.executeCommand("orbit-ai.restartServer");
        break;

      case "sendPrompt":
        this.handleSendPrompt(data);
        break;

      case "getConversation":
        this.handleGetConversation(data);
        break;

      case "requestState":
        // Webview is requesting current state (on load)
        this.restoreState();
        break;
    }
  }

  private handleSendPrompt(data: any): void {
    const { tabId, prompt, requestId } = data;

    // Store user message
    this.conversationStore.addMessage(tabId, {
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    });

    // Send to Claude via callback
    this.onSendPrompt(tabId, prompt, requestId);
  }

  private handleGetConversation(data: any): void {
    const conversation = this.conversationStore.getConversation(data.tabId);
    this._view?.webview.postMessage({
      type: "conversationHistory",
      tabId: data.tabId,
      conversation: conversation,
    });
  }
}
