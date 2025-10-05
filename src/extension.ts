// src/extension.ts
import * as vscode from "vscode";
import { WebSocketServer } from "./server/websocket-server";
import { MessageHandler } from "./server/message-handler";
import { ContextManager } from "./context/context-manager";
import { PromptBuilder } from "./prompts/prompt-builder";
import { CodeEditor } from "./editor/code-editor";
import { ConversationStore } from "./storage/conversation-store";
import { EnhancedWebviewProvider } from "./webview/webview-provider";
import { CommandRegistry } from "./commands/command-registry";
import { AICommands } from "./commands/ai-commands";
import { ServerCommands } from "./commands/server-commands";

let server: WebSocketServer;
let provider: EnhancedWebviewProvider;
let conversationStore: ConversationStore;

export function activate(context: vscode.ExtensionContext) {
  console.log("✅ OrbitAI Enhanced Extension is now active");

  // Initialize core managers
  const contextManager = new ContextManager();
  const promptBuilder = new PromptBuilder();
  const codeEditor = new CodeEditor();
  conversationStore = new ConversationStore(context);

  // Initialize WebSocket server
  server = new WebSocketServer(3031);

  // Initialize message handler
  const messageHandler = new MessageHandler(
    conversationStore,
    codeEditor,
    (tabs) => {
      // Callback when focused tabs update
      if (provider) {
        provider.updateFocusedTabs(tabs);
      }
    }
  );

  // Set message handler for server
  server.setMessageHandler(async (data, ws) => {
    await messageHandler.handle(data, ws);

    // Broadcast prompt response to webview
    if (data.type === "promptResponse" && provider) {
      const conversation = conversationStore.getConversation(data.tabId);
      provider.sendPromptResponse({
        requestId: data.requestId,
        tabId: data.tabId,
        success: data.success,
        response: data.response,
        error: data.error,
        errorType: data.errorType,
        conversation: conversation,
      });
    }
  });

  // Initialize webview provider
  provider = new EnhancedWebviewProvider(
    context.extensionUri,
    conversationStore,
    (tabId, prompt, requestId) => {
      // Callback to send prompt to Claude
      server.sendToAllClients({
        type: "sendPrompt",
        requestId,
        tabId,
        prompt,
      });
    }
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      EnhancedWebviewProvider.viewType,
      provider
    )
  );

  // Initialize commands
  const aiCommands = new AICommands(
    contextManager,
    promptBuilder,
    conversationStore,
    (tabId, prompt, requestId) => {
      server.sendToAllClients({
        type: "sendPrompt",
        requestId,
        tabId,
        prompt,
      });
    }
  );

  const serverCommands = new ServerCommands(server);
  const commandRegistry = new CommandRegistry(
    aiCommands,
    serverCommands,
    contextManager
  );

  commandRegistry.registerAll(context);

  // Start server automatically
  server.start().then(() => {
    provider.updateServerStatus(true);
  });

  // Cleanup
  context.subscriptions.push({
    dispose: () => {
      server.dispose();
    },
  });
}

export function deactivate() {
  console.log("OrbitAI Extension deactivated");
  if (server) {
    server.dispose();
  }
}
