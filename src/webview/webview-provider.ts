// src/webview/webview-provider.ts
import * as vscode from "vscode";
import { getWebviewHtml } from "./webview-html";
import { getCollectionHtml } from "./collection-html";
import { ConversationStore } from "../storage/conversation-store";
import { FocusedTab } from "../types/interfaces";

export class EnhancedWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "websocketView";
  private _view?: vscode.WebviewView;
  private currentView: "chat" | "collections" = "chat";

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly conversationStore: ConversationStore,
    private readonly promptBuilder: any,
    private readonly onSendPrompt: (
      tabId: number,
      prompt: string,
      requestId: string,
      collectionId: string | null
    ) => void
  ) {}

  public getView(): vscode.WebviewView | undefined {
    return this._view;
  }

  public updateServerStatus(isRunning: boolean, port?: number): void {
    console.log(
      `[WebviewProvider] Updating server status: running=${isRunning}, port=${port}`
    ); // DEBUG
    if (this._view) {
      this._view.webview.postMessage({
        type: "serverStatusUpdate",
        isRunning: isRunning,
        port: port,
      });
      console.log(`[WebviewProvider] Message sent to webview`); // DEBUG
    } else {
      console.log(`[WebviewProvider] Warning: _view is not initialized`); // DEBUG
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

  public updateCollectionsList(collections: any[]): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: "collectionsUpdate",
        collections: collections,
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

    // 🆕 GỬI PORT NGAY SAU KHI WEBVIEW LOAD
    setTimeout(() => {
      const extensionContext = (global as any).extensionContext as
        | vscode.ExtensionContext
        | undefined;
      const savedPort =
        extensionContext?.workspaceState.get<number>("orbitai.serverPort") ||
        3031;

      if (this._view) {
        this._view.webview.postMessage({
          type: "initialPort",
          port: savedPort,
        });
      }
    }, 200);

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

  private updateWebviewContent(): void {
    if (!this._view) return;

    if (this.currentView === "chat") {
      this._view.webview.html = getWebviewHtml(this._view.webview);
      // Restore chat state
      setTimeout(() => this.restoreState(), 100);
    } else {
      this._view.webview.html = getCollectionHtml(this._view.webview);
      // Request collections data
      setTimeout(() => this.sendCollectionsData(), 100);
    }
  }

  private sendCollectionsData(): void {
    if (!this._view) return;

    // Get collections from extension context
    const collections =
      (global as any).collectionService?.getAllCollections() || [];

    this._view.webview.postMessage({
      type: "collectionsUpdate",
      collections: collections.map((c: any) => c.toData()),
    });
  }

  public switchView(view: "chat" | "collections"): void {
    this.currentView = view;
    this.updateWebviewContent();
  }

  private handleWebviewMessage(data: any): void {
    switch (data.type) {
      case "startServer":
        vscode.commands.executeCommand("orbit-ai.startServer");
        break;

      case "connectToPort":
        vscode.commands.executeCommand("orbit-ai.connectToPort");
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
        this.restoreState();
        break;

      case "openCollections":
        // Switch to collections view
        this.switchView("collections");
        break;

      case "switchView":
        // Switch between chat and collections
        this.switchView(data.view);
        break;

      // Collection management messages
      case "requestCollections":
        this.sendCollectionsData();
        break;

      case "createCollection":
        vscode.commands.executeCommand("orbit-ai.createCollection");
        setTimeout(() => this.sendCollectionsData(), 200);
        break;

      case "refreshCollections":
        this.sendCollectionsData();
        break;

      case "renameCollection":
        vscode.commands.executeCommand("orbit-ai.renameCollection", {
          id: data.collectionId,
        });
        setTimeout(() => this.sendCollectionsData(), 200);
        break;

      case "deleteCollection":
        vscode.commands.executeCommand("orbit-ai.deleteCollection", {
          id: data.collectionId,
        });
        setTimeout(() => this.sendCollectionsData(), 200);
        break;

      case "addFilesToCollection":
        vscode.commands.executeCommand("orbit-ai.addFilesToCollection", {
          id: data.collectionId,
        });
        setTimeout(() => this.sendCollectionsData(), 200);
        break;

      case "addCurrentFileToCollection":
        vscode.commands.executeCommand("orbit-ai.addCurrentFileToCollection", {
          id: data.collectionId,
        });
        setTimeout(() => this.sendCollectionsData(), 200);
        break;

      case "removeFileFromCollection":
        vscode.commands.executeCommand("orbit-ai.removeFileFromCollection", {
          id: data.collectionId,
          resourceUri: vscode.Uri.parse(data.fileUri),
        });
        setTimeout(() => this.sendCollectionsData(), 200);
        break;
    }
  }

  private async handleSendPrompt(data: any): Promise<void> {
    const { tabId, prompt, requestId } = data;

    // Store user message
    this.conversationStore.addMessage(tabId, {
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    });

    // Send prompt directly
    this.onSendPrompt(tabId, prompt, requestId, null);
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
