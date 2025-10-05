// src/webview/webview-html.ts
import * as vscode from "vscode";

export function getWebviewHtml(webview: vscode.Webview): string {
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
        
        // Load persisted state
        const previousState = vscode.getState() || {
            focusedTabs: [],
            currentTabId: null,
            conversations: {}
        };
        
        let focusedTabs = previousState.focusedTabs;
        let currentTabId = previousState.currentTabId;
        let conversations = previousState.conversations;
        let isWaitingResponse = false;
        
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

        // Persist state helper
        function saveState() {
            vscode.setState({
                focusedTabs: focusedTabs,
                currentTabId: currentTabId,
                conversations: conversations
            });
        }

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
            saveState();
            
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

            // Restore previously selected tab if exists
            if (currentTabId && focusedTabs.find(t => t.tabId === currentTabId)) {
                elements.tabSelect.value = currentTabId;
            } else if (focusedTabs.length > 0) {
                // Auto-select first tab
                currentTabId = focusedTabs[0].tabId;
                elements.tabSelect.value = currentTabId;
                saveState();
            }

            renderMessages();
            updateSendButtonState();
        }

        function onTabChanged() {
            const selectedTabId = parseInt(elements.tabSelect.value);
            if (selectedTabId) {
                currentTabId = selectedTabId;
                saveState();
                renderMessages();
            } else {
                currentTabId = null;
                saveState();
                renderMessages();
            }
            updateSendButtonState();
        }

        // Message handling
        function sendPrompt() {
            const prompt = elements.promptInput.value.trim();
            if (!prompt || !currentTabId || isWaitingResponse) return;

            isWaitingResponse = true;
            updateSendButtonState();

            const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);

            // Add user message
            const userMessage = {
                role: 'user',
                content: prompt,
                timestamp: Date.now()
            };
            
            if (!conversations[currentTabId]) {
                conversations[currentTabId] = [];
            }
            conversations[currentTabId].push(userMessage);
            saveState();
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
            const currentConversation = conversations[currentTabId] || [];
            
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

        // Message handling from extension
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
                        conversations[currentTabId] = message.conversation || [];
                        saveState();
                        renderMessages();
                    }
                    break;

                case 'promptResponse':
                    removeLoadingMessage();
                    isWaitingResponse = false;
                    updateSendButtonState();

                    if (message.tabId && conversations[message.tabId]) {
                        const responseMessage = {
                            role: message.success ? 'assistant' : 'error',
                            content: message.success ? message.response : message.error,
                            timestamp: Date.now(),
                            errorType: message.errorType
                        };

                        conversations[message.tabId].push(responseMessage);
                        saveState();
                        
                        if (message.tabId === currentTabId) {
                            renderMessages();
                        }
                    }
                    break;
                    
                case 'restoreState':
                    // Extension is telling us to restore state
                    if (message.state) {
                        focusedTabs = message.state.focusedTabs || [];
                        updateTabList(focusedTabs);
                    }
                    break;
            }
        });

        // Initialize on load
        updateCharCount();
        updateSendButtonState();
        
        // Restore UI from persisted state
        if (focusedTabs.length > 0) {
            updateTabList(focusedTabs);
        }
        
        // Request current state from extension
        vscode.postMessage({ type: 'requestState' });
    </script>
</body>
</html>`;
}
