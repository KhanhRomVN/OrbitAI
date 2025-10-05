import * as vscode from "vscode";
import * as WebSocket from "ws";

let provider: WebSocketViewProvider | undefined;
let cachedFocusedTabs: any[] = [];
let wss: WebSocket.Server | null = null;
let isServerRunning = false;

function startWebSocketServer(): void {
  if (isServerRunning) {
    vscode.window.showWarningMessage("OrbitAI: Server is already running");
    provider?.updateServerStatus(true);
    return;
  }

  try {
    wss = new WebSocket.Server({
      port: 3031,
      perMessageDeflate: false,
      clientTracking: true,
    });

    wss.on("listening", () => {
      console.log(
        "[OrbitAI] WebSocket server is listening on ws://localhost:3031"
      );
      vscode.window.showInformationMessage(
        "OrbitAI: Server started on port 3031"
      );
      isServerRunning = true;
      provider?.updateServerStatus(true);
    });

    wss.on("connection", (ws: WebSocket) => {
      console.log("[OrbitAI] New client connected");

      ws.on("message", (message: WebSocket.Data) => {
        try {
          const data = JSON.parse(message.toString());
          console.log("[OrbitAI] Received message:", data);
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

      ws.send(
        JSON.stringify({ type: "connected", message: "Welcome to OrbitAI" })
      );
    });

    wss.on("error", (error) => {
      console.error("[OrbitAI] Server error:", error);
      vscode.window.showErrorMessage(
        `OrbitAI: Server error - ${error.message}`
      );
      isServerRunning = false;
      provider?.updateServerStatus(false);
    });
  } catch (error) {
    console.error("[OrbitAI] Failed to start server:", error);
    vscode.window.showErrorMessage("OrbitAI: Failed to start server");
    isServerRunning = false;
    provider?.updateServerStatus(false);
  }
}

function stopWebSocketServer(): void {
  if (!isServerRunning || !wss) {
    vscode.window.showWarningMessage("OrbitAI: Server is not running");
    provider?.updateServerStatus(false);
    return;
  }

  try {
    wss.close(() => {
      console.log("[OrbitAI] Server stopped");
      vscode.window.showInformationMessage("OrbitAI: Server stopped");
      isServerRunning = false;
      wss = null;
      provider?.updateServerStatus(false);
    });
  } catch (error) {
    console.error("[OrbitAI] Failed to stop server:", error);
    vscode.window.showErrorMessage("OrbitAI: Failed to stop server");
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("OrbitAI Extension is now active");

  // Start server by default
  startWebSocketServer();

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("orbit-ai.startServer", () => {
      startWebSocketServer();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("orbit-ai.stopServer", () => {
      stopWebSocketServer();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("orbit-ai.restartServer", () => {
      stopWebSocketServer();
      setTimeout(() => startWebSocketServer(), 1000);
    })
  );

  // Register webview provider
  provider = new WebSocketViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      WebSocketViewProvider.viewType,
      provider
    )
  );

  // Cleanup on deactivation
  context.subscriptions.push({
    dispose: () => {
      if (wss) {
        wss.close();
      }
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

    case "focusedTabsUpdate":
      console.log(
        "[OrbitAI] 🎯 Focused tabs update:",
        data.data?.length || 0,
        "tabs"
      );
      console.log("[OrbitAI] 📋 Data:", JSON.stringify(data.data, null, 2));

      // Cache data
      cachedFocusedTabs = data.data || [];

      // Broadcast to webview
      if (provider && provider.getView()) {
        console.log("[OrbitAI] ✅ Sending to webview...");
        provider.getView()?.webview.postMessage({
          type: "focusedTabsUpdate",
          data: data.data,
        });
      } else {
        console.warn("[OrbitAI] ⚠️ WebView not ready yet");
      }
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
  if (wss) {
    wss.close();
  }
}

class WebSocketViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "websocketView";
  private _view?: vscode.WebviewView;

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

  constructor(private readonly _extensionUri: vscode.Uri) {}

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

    // Send initial server status
    setTimeout(() => {
      this.updateServerStatus(isServerRunning);
    }, 100);

    // Send cached data immediately when webview is ready
    setTimeout(() => {
      if (cachedFocusedTabs.length > 0) {
        console.log(
          "[OrbitAI] 📤 Sending cached focused tabs to webview:",
          cachedFocusedTabs.length
        );
        webviewView.webview.postMessage({
          type: "focusedTabsUpdate",
          data: cachedFocusedTabs,
        });
      }
    }, 500);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((data) => {
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
        case "broadcast":
          if (wss) {
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data.message));
              }
            });
          }
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
            color: white;
            transition: background-color 0.3s;
        }
        .status.running {
            background-color: var(--vscode-testing-iconPassed);
        }
        .status.stopped {
            background-color: var(--vscode-testing-iconFailed);
        }
        .controls {
            display: flex;
            gap: 8px;
            margin-bottom: 15px;
        }
        .controls button {
            flex: 1;
            padding: 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
        }
        .controls button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .controls button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .section {
            margin-top: 15px;
        }
        .section-title {
            font-weight: bold;
            margin-bottom: 8px;
            color: var(--vscode-foreground);
            font-size: 13px;
        }
        #focused-tabs {
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            max-height: 500px;
            overflow-y: auto;
        }
        .tab-item {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 8px;
            margin-bottom: 8px;
            background-color: var(--vscode-input-background);
            border-radius: 4px;
            border-left: 3px solid var(--vscode-charts-blue);
        }
        .tab-item:last-child {
            margin-bottom: 0;
        }
        .tab-favicon {
            width: 16px;
            height: 16px;
            flex-shrink: 0;
            margin-top: 2px;
        }
        .tab-info {
            flex: 1;
            min-width: 0;
        }
        .tab-title {
            font-weight: 500;
            font-size: 13px;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .tab-url {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 4px;
        }
        .tab-meta {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .tab-container {
            color: var(--vscode-charts-blue);
        }
        .tab-timestamp {
            color: var(--vscode-descriptionForeground);
        }
        .no-focus {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            font-size: 12px;
        }
        .count-badge {
            display: inline-block;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 11px;
            margin-left: 6px;
        }
    </style>
</head>
<body>
    <h2>OrbitAI WebSocket Server</h2>
    
    <div id="status" class="status running">
        Server running on ws://localhost:3031
    </div>

    <div class="controls">
        <button id="start-btn" onclick="startServer()">Start</button>
        <button id="stop-btn" onclick="stopServer()">Stop</button>
        <button id="restart-btn" onclick="restartServer()">Restart</button>
    </div>

    <div class="section">
        <div class="section-title">
            Focused Claude Tabs
            <span id="count-badge" class="count-badge">0</span>
        </div>
        <div id="focused-tabs">
            <div class="no-focus">No focused tabs</div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const focusedTabsContainer = document.getElementById('focused-tabs');
        const countBadge = document.getElementById('count-badge');
        const statusDiv = document.getElementById('status');
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        const restartBtn = document.getElementById('restart-btn');

        function startServer() {
            vscode.postMessage({ type: 'startServer' });
        }

        function stopServer() {
            vscode.postMessage({ type: 'stopServer' });
        }

        function restartServer() {
            vscode.postMessage({ type: 'restartServer' });
        }

        function updateServerStatus(isRunning) {
            if (isRunning) {
                statusDiv.className = 'status running';
                statusDiv.textContent = 'Server running on ws://localhost:3031';
                startBtn.disabled = true;
                stopBtn.disabled = false;
                restartBtn.disabled = false;
            } else {
                statusDiv.className = 'status stopped';
                statusDiv.textContent = 'Server stopped';
                startBtn.disabled = false;
                stopBtn.disabled = true;
                restartBtn.disabled = true;
            }
        }

        window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.type === 'focusedTabsUpdate') {
                updateFocusedTabs(message.data);
            } else if (message.type === 'serverStatusUpdate') {
                updateServerStatus(message.isRunning);
            }
        });

        function updateFocusedTabs(tabs) {
            if (!tabs || tabs.length === 0) {
                focusedTabsContainer.innerHTML = '<div class="no-focus">No focused tabs</div>';
                countBadge.textContent = '0';
                return;
            }

            countBadge.textContent = tabs.length.toString();
            
            focusedTabsContainer.innerHTML = tabs.map(tab => {
                const timeSince = getTimeSince(tab.timestamp);
                return \`
                    <div class="tab-item">
                        <img class="tab-favicon" 
                             src="\${tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text y="14" font-size="14">🌐</text></svg>'}" 
                             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><text y=%2214%22 font-size=%2214%22>🌐</text></svg>'"
                        />
                        <div class="tab-info">
                            <div class="tab-title">\${escapeHtml(tab.title)}</div>
                            <div class="tab-url">\${escapeHtml(tab.url)}</div>
                            <div class="tab-meta">
                                <span class="tab-container">\${escapeHtml(tab.containerName)}</span>
                                <span class="tab-timestamp">\${timeSince}</span>
                            </div>
                        </div>
                    </div>
                \`;
            }).join('');
        }

        function getTimeSince(timestamp) {
            const seconds = Math.floor((Date.now() - timestamp) / 1000);
            if (seconds < 60) return 'just now';
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return \`\${minutes} min\${minutes > 1 ? 's' : ''} ago\`;
            const hours = Math.floor(minutes / 60);
            return \`\${hours} hour\${hours > 1 ? 's' : ''} ago\`;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    </script>
</body>
</html>`;
  }
}
