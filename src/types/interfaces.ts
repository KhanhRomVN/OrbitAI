// src/types/interfaces.ts
import * as vscode from "vscode";

export interface ConversationMessage {
  role: "user" | "assistant" | "error";
  content: string;
  timestamp: number;
  errorType?: string;
}

export interface FocusedTab {
  tabId: number;
  containerName: string;
  title: string;
  url?: string;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface PromptResponseData {
  requestId: string;
  tabId: number;
  success: boolean;
  response?: string;
  error?: string;
  errorType?: string;
}

export interface ServerStatus {
  isRunning: boolean;
  port: number;
}
