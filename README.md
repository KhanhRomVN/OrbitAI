# ZenChat - AI Coding Assistant

<div align="center">

![ZenChat Logo](images/icon.png)

**Context-aware AI coding assistant powered by Claude, seamlessly integrated into VS Code**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/KhanhRomVN/ZenChat)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.50.0+-007ACC.svg)](https://code.visualstudio.com/)

[Features](#features) • [Installation](#installation) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---

## 🌟 Overview

ZenChat transforms your VS Code into an intelligent coding workspace by connecting with Claude AI through a seamless WebSocket bridge. Organize your codebase into collections, get context-aware assistance, and maintain conversations across multiple Claude tabs - all without leaving your editor.

### Why ZenChat?

- 🎯 **Context-Aware**: Feed entire collections of files to Claude for better understanding
- 💬 **Persistent Conversations**: Maintain conversation history across sessions
- 🗂️ **Smart Collections**: Organize and manage code files for AI analysis
- 🔄 **Real-time Sync**: Direct WebSocket connection with Claude browser extension
- ⚡ **Intelligent Code Editing**: Apply AI suggestions with SEARCH/REPLACE blocks
- 🌍 **Workspace-Aware**: Collections are workspace-specific for better organization

---

## ✨ Features

### 🤖 AI-Powered Code Assistance

- **Explain Code**: Get detailed explanations of selected code
- **Fix Bugs**: Automatically identify and fix issues
- **Refactor**: Improve code quality and maintainability
- **Generate Tests**: Create comprehensive test suites
- **Add Documentation**: Generate clear, helpful comments
- **Custom Edits**: Describe what you want, AI does the rest

### 📁 Collection Management

- **Create Collections**: Group related files for context
- **Workspace Isolation**: Collections are workspace-specific
- **File Management**: Easy add/remove files with visual interface
- **Search & Filter**: Quickly find files and collections
- **Tree View**: Hierarchical file structure visualization
- **Bulk Operations**: Select/deselect files efficiently

### 🔗 WebSocket Integration

- **Direct Connection**: Connect to Claude browser extension
- **Port Management**: Automatic port detection and assignment
- **Multi-Workspace**: Each workspace can have its own server port
- **Connection Status**: Real-time server status monitoring
- **Auto-Reconnect**: Resilient connection handling

### 💬 Conversation Management

- **Persistent History**: Conversations saved across sessions
- **Multi-Tab Support**: Switch between different Claude tabs
- **Context Injection**: Automatically include file context
- **Request Tracking**: Monitor request/response flow
- **Error Handling**: Clear error messages and recovery

---

## 🚀 Installation

### Prerequisites

1. **VS Code** version 1.50.0 or higher
2. **Claude Browser Extension** (Chrome/Edge/Firefox)
3. **Node.js** (for extension development)

### Install from VSIX

1. Download the latest `.vsix` file from [Releases](https://github.com/KhanhRomVN/ZenChat/releases)
2. In VS Code: `Extensions` → `...` → `Install from VSIX`
3. Select the downloaded file
4. Reload VS Code

### Install from Marketplace

```
Coming soon to VS Code Marketplace
```

### Build from Source

```bash
# Clone repository
git clone https://github.com/KhanhRomVN/ZenChat.git
cd ZenChat

# Install dependencies
npm install

# Compile
npm run compile

# Package (optional)
npm run package
```

---

## 🎯 Quick Start

### 1. Setup Connection

```
1. Install Claude browser extension
2. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
3. Run: "ZenChat: Start Server"
4. Enter port number (default: 3031)
5. Connection status appears in sidebar
```

### 2. Create Your First Collection

```
1. Open ZenChat sidebar
2. Click "Collections" tab
3. Click "+" to create collection
4. Add files from your workspace
5. Your collection is ready for AI assistance!
```

### 3. Start Coding with AI

```
1. Select code in editor
2. Right-click → ZenChat → Choose action
   OR
   Use keyboard shortcuts:
   - Ctrl+Shift+E: Explain Code
   - Ctrl+Shift+F: Fix Code
   - Ctrl+Shift+K: Edit Code
3. AI response appears in chat panel
4. Review and apply suggested changes
```

---

## 📖 Documentation

### Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `ZenChat: Start Server` | - | Start WebSocket server |
| `ZenChat: Stop Server` | - | Stop WebSocket server |
| `ZenChat: Explain Code` | `Ctrl+Shift+E` | Explain selected code |
| `ZenChat: Fix Code` | `Ctrl+Shift+F` | Fix bugs in code |
| `ZenChat: Refactor Code` | - | Improve code quality |
| `ZenChat: Generate Tests` | - | Create test cases |
| `ZenChat: Add Documentation` | - | Generate comments |
| `ZenChat: Edit Code` | `Ctrl+Shift+K` | Custom code edits |
| `ZenChat: Chat` | `Ctrl+Shift+L` | Open chat panel |

### Collection Management

**Creating Collections:**
- Collections are workspace-specific
- Use descriptive names
- Include related files for better context

**Adding Files:**
- Multiple selection supported
- Search to filter files
- Pre-selects existing files in "Add" mode

**Removing Files:**
- Visual selection interface
- Confirmation before removal
- Preserves file on disk

### WebSocket Connection

**Port Selection:**
- Default: 3031
- Range: 3031-3040
- Auto-detection of existing servers
- Workspace-specific port storage

**Connection States:**
- 🔴 Not Connected: Server not started
- 🟢 Connected: Active WebSocket connection
- 🟡 Connecting: Establishing connection

### Code Editing with AI

**SEARCH/REPLACE Blocks:**

AI responses can include code changes in this format:

```xml
<SEARCH>
function oldCode() {
  // old implementation
}
</SEARCH>
<REPLACE>
function newCode() {
  // improved implementation
}
</REPLACE>
```

ZenChat automatically:
1. Detects SEARCH/REPLACE blocks
2. Finds exact matches in your code
3. Applies changes with confirmation
4. Shows diff preview (optional)

---

## ⚙️ Configuration

### Settings

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

### Keyboard Shortcuts

Customize in `Preferences: Open Keyboard Shortcuts (JSON)`:

```json
{
  "key": "ctrl+shift+l",
  "command": "zenchat.chat"
},
{
  "key": "ctrl+shift+e",
  "command": "zenchat.explainCode",
  "when": "editorHasSelection"
}
```

---

## 🏗️ Architecture

```
ZenChat Extension
├── WebSocket Server (Port 3031-3040)
│   └── Communicates with Claude Browser Extension
├── Collection Management
│   ├── File System Storage
│   ├── Tree Service (Hierarchical view)
│   └── Workspace Isolation
├── Chat Interface
│   ├── Conversation Store
│   ├── Message Handler
│   └── Code Editor Integration
└── Prompt Builder
    ├── System Prompt
    ├── User Prompt
    └── Collection Context
```

### Technology Stack

- **Language**: TypeScript
- **Framework**: VS Code Extension API
- **Storage**: File System (workspace-specific)
- **Communication**: WebSocket (ws library)
- **Build**: Webpack
- **Testing**: Mocha (planned)

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone and install
git clone https://github.com/KhanhRomVN/ZenChat.git
cd ZenChat
npm install

# Run in development mode
npm run watch

# Open in VS Code
code .

# Press F5 to start debugging
```

### Areas for Contribution

- 🐛 Bug fixes and improvements
- ✨ New AI-powered features
- 📚 Documentation and examples
- 🧪 Tests and quality assurance
- 🌍 Internationalization
- 🎨 UI/UX enhancements

---

## 🐛 Troubleshooting

### Connection Issues

**Problem**: Cannot connect to Claude
```
Solution:
1. Ensure Claude browser extension is installed
2. Check WebSocket server is running
3. Verify port is not blocked by firewall
4. Try restarting VS Code
```

**Problem**: Port already in use
```
Solution:
1. Use "ZenChat: Connect to Port" command
2. Enter a different port (3031-3040)
3. Or stop other services using the port
```

### Collection Issues

**Problem**: Files not appearing in collection
```
Solution:
1. Refresh collection view
2. Check file paths are correct
3. Ensure files are in workspace
4. Restart VS Code if needed
```

### Chat Issues

**Problem**: No response from AI
```
Solution:
1. Check WebSocket connection status
2. Verify Claude browser extension is active
3. Check for errors in Output panel (ZenChat)
4. Restart WebSocket server
```

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**KhanhRomVN**

- GitHub: [@KhanhRomVN](https://github.com/KhanhRomVN)
- Email: khanhromvn@gmail.com

---

## 🙏 Acknowledgments

- **Anthropic** - For creating Claude AI
- **VS Code Team** - For the excellent extension API
- **Open Source Community** - For inspiration and support

---

## 📊 Project Status

- ✅ Core Features: Complete
- ✅ Collection Management: Complete
- ✅ WebSocket Integration: Complete
- 🚧 Testing Suite: In Progress
- 🚧 Marketplace Publishing: Planned
- 📋 Advanced Features: Roadmap

---

## 🗺️ Roadmap

### Version 1.1 (Planned)

- [ ] Comprehensive test suite
- [ ] Performance optimizations
- [ ] Enhanced error handling
- [ ] Improved UI/UX

### Version 1.2 (Future)

- [ ] Multi-language support
- [ ] Advanced code analysis
- [ ] Custom prompt templates
- [ ] Integration with other AI models

### Version 2.0 (Vision)

- [ ] Collaborative features
- [ ] Cloud sync for collections
- [ ] Advanced analytics
- [ ] Enterprise features

---

## 💬 Support

- 📖 [Documentation](https://github.com/KhanhRomVN/ZenChat/wiki)
- 🐛 [Issue Tracker](https://github.com/KhanhRomVN/ZenChat/issues)
- 💬 [Discussions](https://github.com/KhanhRomVN/ZenChat/discussions)
- 📧 [Email Support](mailto:khanhromvn@gmail.com)

---

<div align="center">

**If you find ZenChat useful, please consider giving it a ⭐ on GitHub!**

Made with ❤️ by KhanhRomVN

</div>