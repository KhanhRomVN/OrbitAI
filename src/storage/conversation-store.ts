// src/storage/conversation-store.ts
import * as vscode from "vscode";
import { ConversationMessage, FocusedTab } from "../types/interfaces";

export class ConversationStore {
  private conversationsByTab = new Map<number, ConversationMessage[]>();
  private focusedTabs: FocusedTab[] = [];
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadState();
  }

  // Conversation management
  addMessage(tabId: number, message: ConversationMessage): void {
    if (!this.conversationsByTab.has(tabId)) {
      this.conversationsByTab.set(tabId, []);
    }
    this.conversationsByTab.get(tabId)!.push(message);
    this.saveState();
  }

  getConversation(tabId: number): ConversationMessage[] {
    return this.conversationsByTab.get(tabId) || [];
  }

  clearConversation(tabId: number): void {
    this.conversationsByTab.delete(tabId);
    this.saveState();
  }

  // Focused tabs management
  setFocusedTabs(tabs: FocusedTab[]): void {
    this.focusedTabs = tabs;
    this.saveState();
  }

  getFocusedTabs(): FocusedTab[] {
    return this.focusedTabs;
  }

  // Persistence
  private saveState(): void {
    // Convert Map to array for serialization
    const conversations = Array.from(this.conversationsByTab.entries());

    this.context.globalState.update("conversations", conversations);
    this.context.globalState.update("focusedTabs", this.focusedTabs);
  }

  private loadState(): void {
    // Load conversations
    const savedConversations = this.context.globalState.get<
      [number, ConversationMessage[]][]
    >("conversations", []);

    this.conversationsByTab = new Map(savedConversations);

    // Load focused tabs
    this.focusedTabs = this.context.globalState.get<FocusedTab[]>(
      "focusedTabs",
      []
    );
  }
}
