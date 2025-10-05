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
import { PortManager } from "./server/port-manager"; // 🆕 Import PortManager

// Import collection system
import {
  ServiceContainer,
  ICollectionTreeService,
} from "./infrastructure/di/ServiceContainer";
import { CollectionService } from "./domain/collection/services/CollectionService";
import { CollectionProvider } from "./providers/CollectionProvider";
import { registerCollectionCommands } from "./commands/collection-commands";
import { PromptBuilder } from "./prompts/prompt-builder";
import { registerFileManagementCommands } from "./commands/collection/FileManagementCommands";
import { registerViewCommands } from "./commands/collection/ViewCommands";

let server: WebSocketServer;
let provider: EnhancedWebviewProvider;
let conversationStore: ConversationStore;
let collectionService: CollectionService;
let collectionProvider: CollectionProvider;

export async function activate(context: vscode.ExtensionContext) {
  // Lưu context vào global để dùng trong ServerCommands
  (global as any).extensionContext = context;

  // KHÔNG tự động tìm port, để người dùng tự nhập
  const defaultPort = 3031; // Port mặc định để khởi tạo server object

  // Initialize Dependency Injection Container
  const container = ServiceContainer.getInstance();
  container.initialize(context);

  // Resolve services from container
  collectionService = container.resolve<CollectionService>("CollectionService");
  const collectionTreeService = container.resolve<ICollectionTreeService>(
    "ICollectionTreeService"
  );

  // Initialize CollectionProvider with proper service
  collectionProvider = new CollectionProvider(collectionTreeService);

  // Register UI services in container
  container.registerUIServices(collectionProvider);

  // Register collection tree view TRƯỚC KHI đăng ký commands
  const collectionTreeView = vscode.window.createTreeView(
    "orbit-ai-collections",
    {
      treeDataProvider: collectionProvider,
      showCollapseAll: true,
      canSelectMany: false,
    }
  );

  context.subscriptions.push(collectionTreeView);

  // Register collection commands SAU KHI tree view đã sẵn sàng
  registerCollectionCommands(context);

  // Register file management commands
  registerFileManagementCommands(context);

  // Register view commands
  registerViewCommands(context);

  // Initialize core managers
  const promptBuilder = new PromptBuilder(collectionService);
  conversationStore = new ConversationStore(context);
  const codeEditor = new CodeEditor(); // 🆕 Khởi tạo CodeEditor

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
      collectionId: string | null
    ) => {
      // Callback to send prompt to Claude
      server.sendToAllClients({
        type: "sendPrompt",
        requestId,
        tabId,
        prompt,
        collectionId,
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
    (
      tabId: number, // 🆕 Thêm type annotation
      prompt: string, // 🆕 Thêm type annotation
      requestId: string, // 🆕 Thêm type annotation
      collectionId: string | null // 🆕 Thêm type annotation
    ) => {
      server.sendToAllClients({
        type: "sendPrompt",
        requestId,
        tabId,
        prompt,
        collectionId,
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

  // Update collections list in webview with increased delay
  setTimeout(() => {
    console.log("[Extension] Attempting to update collections list...");
    const allCollections = collectionService.getAllCollections();
    console.log(
      "[Extension] Collections available:",
      allCollections.length,
      allCollections.map((c) => c.name)
    );

    if (provider.updateCollectionsList) {
      console.log("[Extension] Calling updateCollectionsList...");
      provider.updateCollectionsList(allCollections);
    } else {
      console.log(
        "[Extension] WARNING: updateCollectionsList method not found!"
      );
    }
  }, 500); // Increased delay to ensure webview is fully initialized

  // Listen for collection changes
  const refreshCollections = () => {
    collectionProvider.refresh();

    // Update collections list in webview
    if (provider && provider.updateCollectionsList) {
      // Delay nhỏ để đảm bảo collection đã được lưu vào storage
      setTimeout(() => {
        const allCollections = collectionService.getAllCollections();
        console.log(
          "[Extension] Refreshing collections in webview:",
          allCollections.length
        );
        provider.updateCollectionsList(allCollections);
      }, 300);
    }
  };

  // Refresh collections when changes occur
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(() => {
      refreshCollections();
    })
  );

  // Expose collectionService globally for webview
  (global as any).collectionService = collectionService;

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
