// src/webview/webview-state.ts
import { FocusedTab, ConversationMessage } from "../types/interfaces";

export interface WebviewState {
  focusedTabs: FocusedTab[];
  currentTabId: number | null;
  conversations: Map<number, ConversationMessage[]>;
}

export class WebviewStateManager {
  private state: WebviewState = {
    focusedTabs: [],
    currentTabId: null,
    conversations: new Map(),
  };

  setState(newState: Partial<WebviewState>): void {
    this.state = { ...this.state, ...newState };
  }

  getState(): WebviewState {
    return { ...this.state };
  }

  setFocusedTabs(tabs: FocusedTab[]): void {
    this.state.focusedTabs = tabs;
  }

  getFocusedTabs(): FocusedTab[] {
    return this.state.focusedTabs;
  }

  setCurrentTabId(tabId: number | null): void {
    this.state.currentTabId = tabId;
  }

  getCurrentTabId(): number | null {
    return this.state.currentTabId;
  }

  addConversationMessage(tabId: number, message: ConversationMessage): void {
    if (!this.state.conversations.has(tabId)) {
      this.state.conversations.set(tabId, []);
    }
    this.state.conversations.get(tabId)!.push(message);
  }

  getConversation(tabId: number): ConversationMessage[] {
    return this.state.conversations.get(tabId) || [];
  }
}
