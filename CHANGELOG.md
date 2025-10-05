# CHANGELOG

All notable changes to the OrbitAI extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added

#### Core Features
- **WebSocket Server Integration**: Real-time communication between VS Code extension and Claude browser extension
  - Configurable port selection (3031-3040 range)
  - Automatic port detection and reuse
  - Server status indicator in UI
  - Start/Stop/Restart server commands
  
- **AI-Powered Code Assistant**:
  - Code explanation with context awareness
  - Intelligent bug fixing with SEARCH/REPLACE blocks
  - Code refactoring suggestions
  - Automated test generation
  - Documentation generation
  - Custom code editing with natural language instructions
  - Interactive chat interface

#### Collection System
- **File Collection Management**:
  - Create and organize code file collections
  - Workspace-aware collections
  - Global collection view across workspaces
  - Hierarchical file tree visualization
  - Add/remove files with interactive UI
  - File selection modes (individual, folder-level, all files)
  - Search and filter capabilities within collections
  - Copy collection contents to clipboard

- **Collection Features**:
  - Drag-and-drop file management
  - Bulk file operations
  - Collection rename and delete
  - File count indicators
  - Workspace-specific collections
  - Legacy collection support

#### Code Editor Integration
- **Smart Code Editing**:
  - SEARCH/REPLACE block parsing
  - Exact and fuzzy code matching
  - Multi-block code changes
  - Whitespace normalization
  - Diff preview before applying changes
  - Automatic code formatting
  - Streaming edit support

#### Prompt System
- **Advanced Prompt Building**:
  - System prompt with coding best practices
  - Collection-aware context injection
  - Language-specific instructions (Vietnamese/English)
  - Current file content integration
  - Token estimation
  - Complete code response enforcement

#### User Interface
- **Chat Interface**:
  - Tab-based conversation management
  - Message history persistence
  - Real-time response streaming
  - Error handling with detailed feedback
  - Character count indicator
  - Keyboard shortcuts (Enter to send, Shift+Enter for newline)

- **Collection Tree View**:
  - Collapsible/expandable file structure
  - File type icons and syntax highlighting
  - Context menus for quick actions
  - Search within collections
  - File management mode with visual feedback
  - Inline action buttons

- **Status Bar**:
  - Server connection status
  - Port information display
  - Quick access to server controls

### Architecture

#### Domain-Driven Design
- **Entities**: Collection, FileNode
- **Services**: CollectionService, FileService, TreeService
- **Repositories**: FileSystemCollectionStorage
- **Value Objects**: CollectionTypes, FileManagementState
- **Validators**: CollectionValidator

#### Application Layer
- **Use Cases**:
  - CreateCollectionUseCase
  - DeleteCollectionUseCase
  - RenameCollectionUseCase
  - AddFileToCollectionUseCase
  - RemoveFileFromCollectionUseCase

- **Application Services**:
  - CollectionApplicationService
  - NotificationService
  - UIRefreshService

#### Infrastructure
- **Storage**: File-system based JSON storage with migration support
- **File System**: VS Code FileSystem API integration
- **Workspace**: Multi-workspace support
- **Path Handling**: Cross-platform path normalization
- **UI Services**: VS Code native notification and tree view integration

#### Dependency Injection
- Centralized ServiceContainer
- Lazy initialization
- Scoped service lifetime management
- Interface-based dependencies

### Commands

#### Server Control
- `orbit-ai.startServer` - Start WebSocket server with port selection
- `orbit-ai.stopServer` - Stop running server
- `orbit-ai.restartServer` - Restart server
- `orbit-ai.showServerPort` - Display current server port info
- `orbit-ai.connectToPort` - Connect to specific port

#### AI Assistance
- `orbit-ai.explainCode` - Explain selected code (Ctrl+Shift+E / Cmd+Shift+E)
- `orbit-ai.fixCode` - Fix bugs in selected code (Ctrl+Shift+F / Cmd+Shift+F)
- `orbit-ai.refactorCode` - Refactor selected code
- `orbit-ai.generateTests` - Generate unit tests
- `orbit-ai.addDocumentation` - Add documentation
- `orbit-ai.editCode` - Custom code editing (Ctrl+Shift+K / Cmd+Shift+K)
- `orbit-ai.chat` - Open chat interface (Ctrl+Shift+L / Cmd+Shift+L)

#### Collection Management
- `orbit-ai.createCollection` - Create new collection
- `orbit-ai.refreshCollectionView` - Refresh collection tree
- `orbit-ai.renameCollection` - Rename collection
- `orbit-ai.deleteCollection` - Delete collection
- `orbit-ai.copyCollectionContent` - Copy collection to clipboard
- `orbit-ai.addFilesToCollection` - Add files to collection
- `orbit-ai.removeFilesFromCollection` - Remove files from collection

#### File Selection
- `orbit-ai.collection.toggleFileSelection` - Toggle file selection
- `orbit-ai.collection.selectAllFiles` - Select all files
- `orbit-ai.collection.deselectAllFiles` - Deselect all files
- `orbit-ai.collection.selectAllFilesInFolder` - Select all files in folder
- `orbit-ai.collection.unselectAllFilesInFolder` - Unselect all files in folder

#### Search
- `orbit-ai.collection.searchFiles` - Search files in collection
- `orbit-ai.collection.clearSearch` - Clear search filter

#### View Management
- `orbit-ai.expandCollection` - Expand collection
- `orbit-ai.collapseCollection` - Collapse collection
- `orbit-ai.showCollectionMenu` - Show collection actions menu

### Configuration

```json
{
  "orbitAI.maxContextTokens": 100000,
  "orbitAI.autoFormatCode": true,
  "orbitAI.previewChangesBeforeApplying": true,
  "orbitAI.includeOpenFiles": true,
  "orbitAI.includeDiagnostics": true,
  "orbitAI.maxOpenFiles": 10,
  "orbitAI.serverPort": 3031
}
```

### Technical Details

#### Performance Optimizations
- Tree view caching for faster rendering
- Lazy loading of file trees
- Debounced refresh operations
- Efficient file system access
- Parent-child relationship tracking for reveal functionality

#### Data Persistence
- Workspace-specific storage
- Global state for cross-workspace data
- File system-based collection storage
- Automatic state restoration
- Migration support from legacy formats

#### Error Handling
- Comprehensive error messages
- Graceful degradation
- User-friendly notifications
- Detailed logging for debugging
- Error type classification

#### Security
- Input validation for collection names
- File URI validation
- Path traversal prevention
- Reserved name checking
- File count limits

### Browser Extension Communication Protocol

```typescript
// Message Types
{
  type: "browserExtensionConnected" | "focusedTabsUpdate" | "promptResponse" | "sendPrompt"
  // ... message-specific fields
}

// Example: Send Prompt
{
  type: "sendPrompt",
  requestId: string,
  tabId: number,
  prompt: string,
  collectionId: string | null,
  systemPrompt?: string
}

// Example: Prompt Response
{
  type: "promptResponse",
  requestId: string,
  tabId: number,
  success: boolean,
  response?: string,
  error?: string,
  errorType?: string
}
```

### Known Limitations
- Maximum 10,000 files per collection
- WebSocket server limited to ports 3031-3040
- Collections are workspace-specific (global view is read-only)
- File management mode doesn't support multi-workspace scenarios
- Search is case-insensitive and matches filename only

### Dependencies
- VS Code Engine: ^1.50.0
- WebSocket: ^8.18.3
- Node.js: 20.x
- TypeScript: ^5.8.2

## [Unreleased]

### Planned Features
- Collection export/import
- Advanced search with regex support
- File diff view before applying changes
- Code snippet library
- Custom prompt templates
- Multi-language support
- AI model selection
- Conversation branching
- Code review mode
- Integration with Git

---

## Version History

### [1.0.0] - Initial Release
First stable release of OrbitAI with core AI assistance, collection management, and WebSocket integration features.