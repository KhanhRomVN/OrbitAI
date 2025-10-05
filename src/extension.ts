import * as vscode from "vscode";
import * as WebSocket from "ws";

let provider: WebSocketViewProvider | undefined;
let cachedFocusedTabs: any[] = [];
let wss: WebSocket.Server | null = null;
let isServerRunning = false;

// Lưu conversation history cho mỗi tab
const conversationsByTab = new Map<number, ConversationMessage[]>();

interface ConversationMessage {
  role: "user" | "assistant" | "error";
  content: string;
  timestamp: number;
  errorType?: string;
}

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
        "[OrbitAI] ✅ WebSocket server listening on ws://localhost:3031"
      );
      vscode.window.showInformationMessage(
        "OrbitAI: Server started on port 3031"
      );
      isServerRunning = true;
      provider?.updateServerStatus(true);
    });

    wss.on("connection", (ws: WebSocket) => {
      console.log("[OrbitAI] 🔌 New client connected");

      ws.on("message", (message: WebSocket.Data) => {
        try {
          const data = JSON.parse(message.toString());
          console.log("[OrbitAI] 📩 Received:", data.type);
          handleMessage(data, ws);
        } catch (error) {
          console.error("[OrbitAI] ❌ Failed to parse message:", error);
        }
      });

      ws.on("close", () => {
        console.log("[OrbitAI] 🔌 Client disconnected");
      });

      ws.on("error", (error) => {
        console.error("[OrbitAI] ❌ WebSocket error:", error);
      });

      ws.send(
        JSON.stringify({
          type: "connected",
          message: "Welcome to OrbitAI",
        })
      );
    });

    wss.on("error", (error) => {
      console.error("[OrbitAI] ❌ Server error:", error);
      vscode.window.showErrorMessage(
        `OrbitAI: Server error - ${error.message}`
      );
      isServerRunning = false;
      provider?.updateServerStatus(false);
    });
  } catch (error) {
    console.error("[OrbitAI] ❌ Failed to start server:", error);
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
      console.log("[OrbitAI] 🛑 Server stopped");
      vscode.window.showInformationMessage("OrbitAI: Server stopped");
      isServerRunning = false;
      wss = null;
      provider?.updateServerStatus(false);
    });
  } catch (error) {
    console.error("[OrbitAI] ❌ Failed to stop server:", error);
    vscode.window.showErrorMessage("OrbitAI: Failed to stop server");
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("✅ OrbitAI Extension is now active");

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
      console.log("[OrbitAI] ✅ Firefox extension connected");
      break;

    case "focusedTabsUpdate":
      console.log("[OrbitAI] 🎯 Focused tabs update:", data.data?.length || 0);
      cachedFocusedTabs = data.data || [];

      if (provider && provider.getView()) {
        provider.getView()?.webview.postMessage({
          type: "focusedTabsUpdate",
          data: data.data,
        });
      }
      break;

    case "promptResponse":
      console.log("[OrbitAI] 💬 Prompt response:", {
        success: data.success,
        tabId: data.tabId,
        hasResponse: !!data.response,
        error: data.error,
      });

      // Lưu vào conversation history
      const tabId = data.tabId;
      if (!conversationsByTab.has(tabId)) {
        conversationsByTab.set(tabId, []);
      }

      const conversation = conversationsByTab.get(tabId)!;

      if (data.success) {
        conversation.push({
          role: "assistant",
          content: data.response,
          timestamp: Date.now(),
        });
      } else {
        conversation.push({
          role: "error",
          content: data.error || "Unknown error",
          timestamp: Date.now(),
          errorType: data.errorType,
        });
      }

      // Broadcast tới webview
      if (provider && provider.getView()) {
        provider.getView()?.webview.postMessage({
          type: "promptResponse",
          requestId: data.requestId,
          tabId: data.tabId,
          success: data.success,
          response: data.response,
          error: data.error,
          errorType: data.errorType,
          conversation: conversation,
        });
      }
      break;

    default:
      console.log("[OrbitAI] ⚠️ Unknown message type:", data.type);
  }
}

export function deactivate() {
  console.log("OrbitAI Extension deactivated");
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

    // Send initial data
    setTimeout(() => {
      this.updateServerStatus(isServerRunning);

      if (cachedFocusedTabs.length > 0) {
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

        case "sendPrompt":
          this.handleSendPrompt(data);
          break;

        case "getConversation":
          this.handleGetConversation(data);
          break;
      }
    });
  }

  private handleSendPrompt(data: any) {
    console.log(
      "[WebSocketViewProvider] 📤 Sending prompt to tab:",
      data.tabId
    );

    // Lưu user message vào conversation
    const tabId = data.tabId;
    if (!conversationsByTab.has(tabId)) {
      conversationsByTab.set(tabId, []);
    }

    conversationsByTab.get(tabId)!.push({
      role: "user",
      content: data.prompt,
      timestamp: Date.now(),
    });

    // Gửi qua WebSocket tới Firefox
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "sendPrompt",
              requestId: data.requestId,
              tabId: data.tabId,
              prompt: data.prompt,
            })
          );
        }
      });
    }
  }

  private handleGetConversation(data: any) {
    const conversation = conversationsByTab.get(data.tabId) || [];

    this._view?.webview.postMessage({
      type: "conversationHistory",
      tabId: data.tabId,
      conversation: conversation,
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OrbitAI Chat</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            padding: 0;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            font-size: 13px;
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
        }

        .server-controls {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-editor-background);
        }

        .status {
            padding: 8px;
            margin-bottom: 8px;
            border-radius: 4px;
            color: white;
            font-size: 12px;
            text-align: center;
        }

        .status.running {
            background-color: var(--vscode-testing-iconPassed);
        }

        .status.stopped {
            background-color: var(--vscode-testing-iconFailed);
        }

        .controls {
            display: flex;
            gap: 6px;
        }

        .controls button {
            flex: 1;
            padding: 6px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
        }

        .controls button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .controls button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .tab-selector {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-editor-background);
        }

        .tab-selector label {
            display: block;
            font-size: 11px;
            margin-bottom: 6px;
            color: var(--vscode-descriptionForeground);
        }

        .tab-selector select {
            width: 100%;
            padding: 6px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-size: 12px;
        }

        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }

        .message {
            margin-bottom: 12px;
            padding: 10px;
            border-radius: 6px;
            line-height: 1.5;
        }

        .message.user {
            background-color: var(--vscode-input-background);
            border-left: 3px solid var(--vscode-charts-blue);
        }

        .message.assistant {
            background-color: var(--vscode-editor-background);
            border-left: 3px solid var(--vscode-charts-green);
        }

        .message.error {
            background-color: var(--vscode-inputValidation-errorBackground);
            border-left: 3px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-errorForeground);
        }

        .message-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 11px;
            opacity: 0.8;
        }

        .message-role {
            font-weight: 600;
        }

        .message-time {
            color: var(--vscode-descriptionForeground);
        }

        .message-content {
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .error-type {
            display: inline-block;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            margin-left: 6px;
        }

        .no-messages {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }

        .input-area {
            padding: 10px;
            border-top: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-editor-background);
        }

        .input-area textarea {
            width: 100%;
            min-height: 60px;
            max-height: 150px;
            padding: 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            resize: vertical;
            font-family: var(--vscode-font-family);
            font-size: 13px;
        }

        .input-area textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .input-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
        }

        .input-controls button {
            padding: 6px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }

        .input-controls button:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }

        .input-controls button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .char-count {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }

        .loading {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid var(--vscode-button-foreground);
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 0.8s linear infinite;
            margin-right: 6px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="server-controls">
        <div id="status" class="status running">Server running</div>
        <div class="controls">
            <button id="start-btn" onclick="startServer()">Start</button>
            <button id="stop-btn" onclick="stopServer()">Stop</button>
            <button id="restart-btn" onclick="restartServer()">Restart</button>
        </div>
    </div>

    <div class="tab-selector">
        <label>Select Claude Tab:</label>
        <select id="tab-select" onchange="onTabChanged()">
            <option value="">-- No focused tabs --</option>
        </select>
    </div>

    <div class="chat-container">
        <div id="messages" class="messages">
            <div class="no-messages">Select a tab and start chatting</div>
        </div>
    </div>

    <div class="input-area">
        <textarea 
            id="prompt-input" 
            placeholder="Type your message to Claude..."
            onkeydown="handleKeyPress(event)"
        ></textarea>
        <div class="input-controls">
            <span id="char-count" class="char-count">0 characters</span>
            <button id="send-btn" onclick="sendPrompt()" disabled>Send</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        let focusedTabs = [];
        let currentTabId = null;
        let isWaitingResponse = false;
        let currentConversation = [];
        
        const elements = {
            status: document.getElementById('status'),
            startBtn: document.getElementById('start-btn'),
            stopBtn: document.getElementById('stop-btn'),
            restartBtn: document.getElementById('restart-btn'),
            tabSelect: document.getElementById('tab-select'),
            messages: document.getElementById('messages'),
            promptInput: document.getElementById('prompt-input'),
            sendBtn: document.getElementById('send-btn'),
            charCount: document.getElementById('char-count')
        };

        // Server controls
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
                elements.status.className = 'status running';
                elements.status.textContent = 'Server running on ws://localhost:3031';
                elements.startBtn.disabled = true;
                elements.stopBtn.disabled = false;
                elements.restartBtn.disabled = false;
            } else {
                elements.status.className = 'status stopped';
                elements.status.textContent = 'Server stopped';
                elements.startBtn.disabled = false;
                elements.stopBtn.disabled = true;
                elements.restartBtn.disabled = true;
            }
        }

        // Tab management
        function updateTabList(tabs) {
            focusedTabs = tabs || [];
            elements.tabSelect.innerHTML = '';

            if (focusedTabs.length === 0) {
                elements.tabSelect.innerHTML = '<option value="">-- No focused tabs --</option>';
                elements.sendBtn.disabled = true;
                return;
            }

            focusedTabs.forEach(tab => {
                const option = document.createElement('option');
                option.value = tab.tabId;
                option.textContent = \`\${tab.containerName} - \${tab.title.substring(0, 30)}\`;
                elements.tabSelect.appendChild(option);
            });

            // Auto-select first tab nếu chưa có tab nào được chọn
            if (!currentTabId && focusedTabs.length > 0) {
                currentTabId = focusedTabs[0].tabId;
                elements.tabSelect.value = currentTabId;
                loadConversation();
            }

            updateSendButtonState();
        }

        function onTabChanged() {
            const selectedTabId = parseInt(elements.tabSelect.value);
            if (selectedTabId) {
                currentTabId = selectedTabId;
                loadConversation();
            } else {
                currentTabId = null;
                currentConversation = [];
                renderMessages();
            }
            updateSendButtonState();
        }

        function loadConversation() {
            if (!currentTabId) return;
            
            vscode.postMessage({
                type: 'getConversation',
                tabId: currentTabId
            });
        }

        // Message handling
        function sendPrompt() {
            const prompt = elements.promptInput.value.trim();
            if (!prompt || !currentTabId || isWaitingResponse) return;

            isWaitingResponse = true;
            updateSendButtonState();

            // Generate request ID
            const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);

            // Add user message immediately
            const userMessage = {
                role: 'user',
                content: prompt,
                timestamp: Date.now()
            };
            currentConversation.push(userMessage);
            renderMessages();

            // Clear input
            elements.promptInput.value = '';
            updateCharCount();

            // Send to backend
            vscode.postMessage({
                type: 'sendPrompt',
                requestId: requestId,
                tabId: currentTabId,
                prompt: prompt
            });

            // Add loading indicator
            addLoadingMessage();
        }

        function addLoadingMessage() {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message assistant';
            loadingDiv.id = 'loading-message';
            loadingDiv.innerHTML = \`
                <div class="message-header">
                    <span class="message-role">Claude AI</span>
                    <span class="message-time">Thinking...</span>
                </div>
                <div class="message-content">
                    <span class="loading"></span>
                    Waiting for response...
                </div>
            \`;
            elements.messages.appendChild(loadingDiv);
            elements.messages.scrollTop = elements.messages.scrollHeight;
        }

        function removeLoadingMessage() {
            const loadingMsg = document.getElementById('loading-message');
            if (loadingMsg) {
                loadingMsg.remove();
            }
        }

        function renderMessages() {
            if (currentConversation.length === 0) {
                elements.messages.innerHTML = '<div class="no-messages">No messages yet. Start chatting!</div>';
                return;
            }

            elements.messages.innerHTML = '';
            currentConversation.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${msg.role}\`;

                const roleText = msg.role === 'user' ? 'You' : 
                               msg.role === 'assistant' ? 'Claude AI' : 
                               'Error';

                const timeStr = formatTime(msg.timestamp);

                let contentHTML = \`<div class="message-content">\${escapeHtml(msg.content)}</div>\`;
                
                if (msg.role === 'error' && msg.errorType) {
                    contentHTML = \`
                        <div class="message-content">
                            <span class="error-type">\${msg.errorType}</span>
                            <br><br>
                            \${escapeHtml(msg.content)}
                        </div>
                    \`;
                }

                messageDiv.innerHTML = \`
                    <div class="message-header">
                        <span class="message-role">\${roleText}</span>
                        <span class="message-time">\${timeStr}</span>
                    </div>
                    \${contentHTML}
                \`;

                elements.messages.appendChild(messageDiv);
            });

            elements.messages.scrollTop = elements.messages.scrollHeight;
        }

        function formatTime(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Input handling
        function handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendPrompt();
            }
        }

        elements.promptInput.addEventListener('input', updateCharCount);

        function updateCharCount() {
            const count = elements.promptInput.value.length;
            elements.charCount.textContent = \`\${count} characters\`;
            updateSendButtonState();
        }

        function updateSendButtonState() {
            const hasText = elements.promptInput.value.trim().length > 0;
            const hasTab = currentTabId !== null;
            elements.sendBtn.disabled = !hasText || !hasTab || isWaitingResponse;
        }

        // WebSocket message handling
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.type) {
                case 'serverStatusUpdate':
                    updateServerStatus(message.isRunning);
                    break;

                case 'focusedTabsUpdate':
                    updateTabList(message.data);
                    break;

                case 'conversationHistory':
                    if (message.tabId === currentTabId) {
                        currentConversation = message.conversation || [];
                        renderMessages();
                    }
                    break;

                case 'promptResponse':
                    removeLoadingMessage();
                    isWaitingResponse = false;
                    updateSendButtonState();

                    if (message.tabId === currentTabId) {
                        const responseMessage = {
                            role: message.success ? 'assistant' : 'error',
                            content: message.success ? message.response : message.error,
                            timestamp: Date.now(),
                            errorType: message.errorType
                        };

                        currentConversation.push(responseMessage);
                        renderMessages();
                    }
                    break;
            }
        });

        // Initialize
        updateCharCount();
        updateSendButtonState();
    </script>
</body>
</html>`;
  }
}
