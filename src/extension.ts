import * as vscode from "vscode";
import * as WebSocket from "ws";

export function activate(context: vscode.ExtensionContext) {
  console.log("OrbitAI Extension is now active");

  // Tạo WebSocket server
  const wss = new WebSocket.Server({ port: 3031 });

  wss.on("listening", () => {
    console.log(
      "[OrbitAI] WebSocket server is listening on ws://localhost:3031"
    );
    vscode.window.showInformationMessage(
      "OrbitAI: WebSocket server started on port 3031"
    );
  });

  wss.on("connection", (ws: WebSocket) => {
    console.log("[OrbitAI] New client connected");

    ws.on("message", (message: WebSocket.Data) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("[OrbitAI] Received message:", data);

        // Xử lý message từ Firefox extension
        handleMessage(data, ws);
      } catch (error) {
        console.error("[OrbitAI] Failed to parse message:", error);
      }
    });

    ws.on("close", () => {
      console.log("[OrbitAI] Client disconnected");
    });

    ws.on("error", (error) => {
      console.error("[OrbitAI] WebSocket error:", error);
    });

    // Gửi welcome message
    ws.send(
      JSON.stringify({ type: "connected", message: "Welcome to OrbitAI" })
    );
  });

  wss.on("error", (error) => {
    console.error("[OrbitAI] Server error:", error);
    vscode.window.showErrorMessage(
      `OrbitAI: Failed to start WebSocket server - ${error.message}`
    );
  });

  // Register webview provider
  const provider = new WebSocketViewProvider(context.extensionUri, wss);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      WebSocketViewProvider.viewType,
      provider
    )
  );

  // Cleanup on deactivation
  context.subscriptions.push({
    dispose: () => {
      wss.close();
    },
  });
}

function handleMessage(data: any, ws: WebSocket) {
  switch (data.type) {
    case "browserExtensionConnected":
      console.log(
        "[OrbitAI] ✅ Firefox extension connected at",
        new Date(data.timestamp)
      );
      break;

    case "tabCreated":
      console.log("[OrbitAI] 📝 Tab created:", data.tab);
      ws.send(JSON.stringify({ type: "ack", messageId: data.id }));
      break;

    case "tabRemoved":
      console.log("[OrbitAI] ❌ Tab removed:", data.tabId);
      ws.send(JSON.stringify({ type: "ack", messageId: data.id }));
      break;

    case "tabUpdated":
      console.log("[OrbitAI] 🔄 Tab updated:", data.tabId, data.changes);
      ws.send(JSON.stringify({ type: "ack", messageId: data.id }));
      break;

    case "groupsChanged":
      console.log("[OrbitAI] 📂 Groups changed, total:", data.groups?.length);
      ws.send(JSON.stringify({ type: "ack", messageId: data.id }));
      break;

    default:
      console.log("[OrbitAI] ⚠️ Unknown message type:", data.type);
  }
}

export function deactivate() {
  console.log("OrbitAI Extension is now deactivated");
}

class WebSocketViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "websocketView";
  private _view?: vscode.WebviewView;
  private _wss: WebSocket.Server;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    wss: WebSocket.Server
  ) {
    this._wss = wss;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "broadcast":
          // Broadcast message tới tất cả clients
          this._wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(data.message));
            }
          });
          break;
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OrbitAI Server</title>
    <style>
        body {
            padding: 10px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
        }
        .status {
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 4px;
            background-color: var(--vscode-testing-iconPassed);
            color: white;
        }
        #messages {
            margin-top: 10px;
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            max-height: 400px;
            overflow-y: auto;
        }
        .message {
            padding: 5px;
            margin: 5px 0;
            border-left: 3px solid var(--vscode-activityBarBadge-background);
            background-color: var(--vscode-input-background);
        }
    </style>
</head>
<body>
    <h2>OrbitAI WebSocket Server</h2>
    
    <div class="status">
        ✅ Server running on ws://localhost:3031
    </div>

    <div id="messages">
        <div class="message">Waiting for connections...</div>
    </div>
</body>
</html>`;
  }
}
