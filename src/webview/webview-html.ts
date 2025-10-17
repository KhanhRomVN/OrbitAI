// src/webview/webview-html.ts
import * as vscode from "vscode";

export function getWebviewHtml(webview: vscode.Webview): string {
  // @ts-ignore - HTML template with embedded JavaScript
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZenChat Chat</title>
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

        /* ===== COMPACT SERVER STATUS ===== */
        .server-status-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-editor-background);
            font-size: 11px;
        }

        .status-indicator {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: var(--vscode-testing-iconFailed);
        }

        .status-dot.running {
            background-color: var(--vscode-testing-iconPassed);
        }

        .status-text {
            color: var(--vscode-descriptionForeground);
        }

        .server-controls-compact {
            display: flex;
            gap: 4px;
        }

        .server-controls-compact button {
            padding: 3px 8px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
        }

        .server-controls-compact button:hover:not(:disabled) {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .server-controls-compact button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* ===== CHAT AREA ===== */
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

        /* ===== INPUT AREA ===== */
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
            margin-bottom: 8px;
        }

        .input-area textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        /* ===== TAB SELECTOR (Moved below input) ===== */
        .tab-selector {
            margin-bottom: 8px;
        }

        .tab-selector label {
            display: block;
            font-size: 11px;
            margin-bottom: 4px;
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

        .selectors-container {
            margin-bottom: 8px;
        }

        .input-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
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
    <!-- Compact Server Status Bar -->
    <div class="server-status-bar">
        <div class="status-indicator">
            <span id="status-dot" class="status-dot"></span>
            <span id="status-text" class="status-text">Server: Not connected</span>
        </div>
        <div class="server-controls-compact">
            <button id="start-btn" onclick="startServer()">Connect</button>
            <button id="stop-btn" onclick="stopServer()" disabled>Stop</button>
            <button id="restart-btn" onclick="restartServer()" disabled>Restart</button>
        </div>
    </div>

    <!-- Chat Messages -->
    <div class="chat-container">
        <div id="messages" class="messages">
            <div class="no-messages">Select a tab and start chatting</div>
        </div>
    </div>

    <!-- Input Area (with Tab Selector moved here) -->
    <div class="input-area">
        <textarea 
            id="prompt-input" 
            placeholder="Type your message to Claude..."
            onkeydown="handleKeyPress(event)"
        ></textarea>

        <!-- Tab Selector -->
        <div class="selectors-container">
            <div class="tab-selector">
                <label>Claude Tab:</label>
                <select id="tab-select" onchange="onTabChanged()">
                    <option value="">-- No focused tabs --</option>
                </select>
            </div>
        </div>

        <div class="input-controls">
            <span id="char-count" class="char-count">0 characters</span>
            <button id="send-btn" onclick="sendPrompt()" disabled>Send</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
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
            statusDot: document.getElementById('status-dot'),
            statusText: document.getElementById('status-text'),
            startBtn: document.getElementById('start-btn'),
            stopBtn: document.getElementById('stop-btn'),
            restartBtn: document.getElementById('restart-btn'),
            tabSelect: document.getElementById('tab-select'),
            messages: document.getElementById('messages'),
            promptInput: document.getElementById('prompt-input'),
            sendBtn: document.getElementById('send-btn'),
            charCount: document.getElementById('char-count')
        };

        function saveState() {
            vscode.setState({
                focusedTabs: focusedTabs,
                currentTabId: currentTabId,
                conversations: conversations
            });
        }

        function startServer() {
            // Gọi command để mở form nhập port
            vscode.postMessage({ type: 'connectToPort' });
        }

        function stopServer() {
            vscode.postMessage({ type: 'stopServer' });
        }

        function restartServer() {
            vscode.postMessage({ type: 'restartServer' });
        }

        function updateServerStatus(isRunning, port) {
            const displayPort = port || 3031;
            if (isRunning) {
                elements.statusDot.className = 'status-dot running';
                elements.statusText.textContent = 'Server: ws://localhost:' + displayPort;
                elements.startBtn.disabled = false;
                elements.startBtn.textContent = 'Change Port';
                elements.stopBtn.disabled = false;
                elements.restartBtn.disabled = false;
            } else {
                elements.statusDot.className = 'status-dot';
                elements.statusText.textContent = 'Server: Not started';
                elements.startBtn.disabled = false;
                elements.startBtn.textContent = 'Start Server';
                elements.stopBtn.disabled = true;
                elements.restartBtn.disabled = true;
            }
        }

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
                option.textContent = tab.containerName + ' - ' + tab.title.substring(0, 30);
                elements.tabSelect.appendChild(option);
            });

            if (currentTabId && focusedTabs.find(t => t.tabId === currentTabId)) {
                elements.tabSelect.value = currentTabId;
            } else if (focusedTabs.length > 0) {
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

        function sendPrompt() {
            const prompt = elements.promptInput.value.trim();
            if (!prompt || !currentTabId || isWaitingResponse) return;

            isWaitingResponse = true;
            updateSendButtonState();

            const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);

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

            elements.promptInput.value = '';
            updateCharCount();

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
            loadingDiv.innerHTML = '' +
                '<div class="message-header">' +
                    '<span class="message-role">Claude AI</span>' +
                    '<span class="message-time">Thinking...</span>' +
                '</div>' +
                '<div class="message-content">' +
                    '<span class="loading"></span>' +
                    'Waiting for response...' +
                '</div>';
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
                messageDiv.className = 'message ' + msg.role;

                const roleText = msg.role === 'user' ? 'You' : 
                               msg.role === 'assistant' ? 'Claude AI' : 
                               'Error';

                const timeStr = formatTime(msg.timestamp);

                let contentHTML = '<div class="message-content">' + escapeHtml(msg.content) + '</div>';
                
                if (msg.role === 'error' && msg.errorType) {
                    contentHTML = '' +
                        '<div class="message-content">' +
                            '<span class="error-type">' + msg.errorType + '</span>' +
                            '<br><br>' +
                            escapeHtml(msg.content) +
                        '</div>';
                }

                messageDiv.innerHTML = '' +
                    '<div class="message-header">' +
                        '<span class="message-role">' + roleText + '</span>' +
                        '<span class="message-time">' + timeStr + '</span>' +
                    '</div>' +
                    contentHTML;

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

        function handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendPrompt();
            }
        }

        elements.promptInput.addEventListener('input', updateCharCount);

        function updateCharCount() {
            const count = elements.promptInput.value.length;
            elements.charCount.textContent = count + ' characters';
            updateSendButtonState();
        }

        function updateSendButtonState() {
            const hasText = elements.promptInput.value.trim().length > 0;
            const hasTab = currentTabId !== null;
            elements.sendBtn.disabled = !hasText || !hasTab || isWaitingResponse;
        }

        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.type) {
                case 'serverStatusUpdate':
                    updateServerStatus(message.isRunning, message.port);
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
                    if (message.state) {
                        focusedTabs = message.state.focusedTabs || [];
                        updateTabList(focusedTabs);
                    }
                    break;
            }
        });

        updateCharCount();
        updateSendButtonState();
        
        if (focusedTabs.length > 0) {
            updateTabList(focusedTabs);
        }
        
        vscode.postMessage({ type: 'requestState' });
    </script>
</body>
</html>`;
}
