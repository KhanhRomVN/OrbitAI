// src/webview/collection-html.ts
import * as vscode from "vscode";

export function getCollectionHtml(webview: vscode.Webview): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OrbitAI Collections</title>
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
            height: 100vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        /* ===== HEADER ===== */
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-editor-background);
        }

        .header-title {
            font-size: 14px;
            font-weight: 600;
        }

        .back-button {
            padding: 6px 12px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }

        .back-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        /* ===== TOOLBAR ===== */
        .toolbar {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-editor-background);
        }

        .toolbar button {
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin-right: 8px;
        }

        .toolbar button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        /* ===== COLLECTIONS LIST ===== */
        .collections-container {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }

        .collection-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .collection-card:hover {
            background: var(--vscode-list-hoverBackground);
        }

        .collection-card.selected {
            border-color: var(--vscode-focusBorder);
            background: var(--vscode-list-activeSelectionBackground);
        }

        .collection-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .collection-name {
            font-weight: 600;
            font-size: 13px;
        }

        .collection-actions {
            display: flex;
            gap: 4px;
        }

        .collection-actions button {
            padding: 4px 8px;
            background: transparent;
            color: var(--vscode-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }

        .collection-actions button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .collection-meta {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
        }

        .collection-files {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }

        .file-item {
            padding: 4px 8px;
            margin: 2px 0;
            background: var(--vscode-input-background);
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .file-name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .file-remove {
            color: var(--vscode-errorForeground);
            cursor: pointer;
            font-size: 10px;
            padding: 2px 4px;
        }

        .file-remove:hover {
            background: var(--vscode-inputValidation-errorBackground);
            border-radius: 2px;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--vscode-descriptionForeground);
        }

        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
        }

        .empty-state-text {
            font-size: 14px;
            margin-bottom: 16px;
        }

        .empty-state button {
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }

        .empty-state button:hover {
            background: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <span class="header-title">📁 Collections Manager</span>
        <button class="back-button" onclick="backToChat()">← Back to Chat</button>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
        <button onclick="createCollection()">+ New Collection</button>
        <button onclick="refreshCollections()">🔄 Refresh</button>
    </div>

    <!-- Collections List -->
    <div class="collections-container" id="collections-container">
        <div class="empty-state">
            <div class="empty-state-icon">📂</div>
            <div class="empty-state-text">No collections yet</div>
            <button onclick="createCollection()">Create Your First Collection</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let collections = [];
        let selectedCollectionId = null;

        function backToChat() {
            vscode.postMessage({ type: 'switchView', view: 'chat' });
        }

        function createCollection() {
            vscode.postMessage({ type: 'createCollection' });
        }

        function refreshCollections() {
            vscode.postMessage({ type: 'refreshCollections' });
        }

        function renameCollection(collectionId) {
            vscode.postMessage({ 
                type: 'renameCollection', 
                collectionId: collectionId 
            });
        }

        function deleteCollection(collectionId) {
            vscode.postMessage({ 
                type: 'deleteCollection', 
                collectionId: collectionId 
            });
        }

        function addFiles(collectionId) {
            vscode.postMessage({ 
                type: 'addFilesToCollection', 
                collectionId: collectionId 
            });
        }

        function addCurrentFile(collectionId) {
            vscode.postMessage({ 
                type: 'addCurrentFileToCollection', 
                collectionId: collectionId 
            });
        }

        function removeFile(collectionId, fileUri) {
            vscode.postMessage({ 
                type: 'removeFileFromCollection', 
                collectionId: collectionId,
                fileUri: fileUri
            });
        }

        function selectCollection(collectionId) {
            selectedCollectionId = collectionId;
            renderCollections();
        }

        function updateCollections(newCollections) {
            collections = newCollections || [];
            renderCollections();
        }

        function renderCollections() {
            const container = document.getElementById('collections-container');

            if (collections.length === 0) {
                container.innerHTML = \`
                    <div class="empty-state">
                        <div class="empty-state-icon">📂</div>
                        <div class="empty-state-text">No collections yet</div>
                        <button onclick="createCollection()">Create Your First Collection</button>
                    </div>
                \`;
                return;
            }

            container.innerHTML = '';

            collections.forEach(collection => {
                const card = document.createElement('div');
                card.className = 'collection-card';
                if (collection.id === selectedCollectionId) {
                    card.className += ' selected';
                }
                card.onclick = () => selectCollection(collection.id);

                const filesHtml = collection.files && collection.files.length > 0
                    ? collection.files.map(fileUri => {
                        const fileName = fileUri.split(/[\\/]/).pop() || fileUri;
                        return \`
                            <div class="file-item">
                                <span class="file-name" title="\${fileUri}">\${fileName}</span>
                                <span class="file-remove" onclick="event.stopPropagation(); removeFile('\${collection.id}', '\${fileUri}')">✕</span>
                            </div>
                        \`;
                    }).join('')
                    : '<div style="padding: 8px; font-style: italic; opacity: 0.6;">No files added yet</div>';

                card.innerHTML = \`
                    <div class="collection-header">
                        <span class="collection-name">\${collection.name}</span>
                        <div class="collection-actions">
                            <button onclick="event.stopPropagation(); addCurrentFile('\${collection.id}')">+ Current</button>
                            <button onclick="event.stopPropagation(); addFiles('\${collection.id}')">+ Files</button>
                            <button onclick="event.stopPropagation(); renameCollection('\${collection.id}')">✏️</button>
                            <button onclick="event.stopPropagation(); deleteCollection('\${collection.id}')">🗑️</button>
                        </div>
                    </div>
                    <div class="collection-meta">
                        📄 \${collection.fileCount || 0} files • 
                        Created: \${new Date(collection.createdAt).toLocaleDateString()}
                    </div>
                    <div class="collection-files">
                        \${filesHtml}
                    </div>
                \`;

                container.appendChild(card);
            });
        }

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.type) {
                case 'collectionsUpdate':
                    updateCollections(message.collections);
                    break;
            }
        });

        // Request initial data
        vscode.postMessage({ type: 'requestCollections' });
    </script>
</body>
</html>`;
}
