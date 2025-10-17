// src/extension.ts
import * as vscode from "vscode";
import { WebSocketServer } from "./server/websocket-server";
import { MessageHandler } from "./server/message-handler";
import { ConversationStore } from "./storage/conversation-store";
import { EnhancedWebviewProvider } from "./webview/webview-provider";
import { CommandRegistry } from "./commands/command-registry";
import { ServerCommands } from "./commands/server-commands";
import { AICommands } from "./commands/ai-commands";
import { CodeEditor } from "./editor/code-editor";
import { PromptBuilder } from "./prompts/prompt-builder";

let server: WebSocketServer;
let provider: EnhancedWebviewProvider;
let conversationStore: ConversationStore;

export async function activate(context: vscode.ExtensionContext) {
  // Lưu context vào global để dùng trong ServerCommands
  (global as any).extensionContext = context;

  // KHÔNG tự động tìm port, để người dùng tự nhập
  const defaultPort = 3031; // Port mặc định để khởi tạo server object

  // Initialize core managers
  const promptBuilder = new PromptBuilder();
  conversationStore = new ConversationStore(context);
  const codeEditor = new CodeEditor();

  // Initialize WebSocket server với port mặc định (chưa start)
  server = new WebSocketServer(defaultPort);

  // Initialize message handler
  const messageHandler = new MessageHandler(
    conversationStore,
    codeEditor, // 🆕 Thêm codeEditor
    (tabs: any[]) => {
      // 🆕 Thêm type annotation
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
    promptBuilder,
    (
      tabId: number,
      prompt: string,
      requestId: string,
      systemPrompt?: string
    ) => {
      // Callback to send prompt to Claude
      server.sendToAllClients({
        type: "sendPrompt",
        requestId,
        tabId,
        prompt,
        systemPrompt,
      });
    }
  );

  // Lưu provider vào global để dùng trong ServerCommands
  (global as any).webviewProvider = provider;

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      EnhancedWebviewProvider.viewType,
      provider
    )
  );

  // Initialize commands
  const aiCommands = new AICommands(
    promptBuilder,
    conversationStore,
    (tabId: number, prompt: string, requestId: string) => {
      server.sendToAllClients({
        type: "sendPrompt",
        requestId,
        tabId,
        prompt,
      });
    }
  );

  const serverCommands = new ServerCommands(server);
  const commandRegistry = new CommandRegistry(aiCommands, serverCommands);

  commandRegistry.registerAll(context);

  // Hiển thị trạng thái ban đầu: chưa khởi động
  setTimeout(() => {
    provider.updateServerStatus(false, defaultPort);
  }, 200);

  // Cleanup
  context.subscriptions.push({
    dispose: async () => {
      server.dispose();
      // Optional: Release port when extension is deactivated
      // await PortManager.releaseWorkspacePort(context);
    },
  });
}

export async function deactivate() {
  if (server) {
    server.dispose();
  }
}
