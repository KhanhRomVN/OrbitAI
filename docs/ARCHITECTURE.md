graph TB
 subgraph "VS CODE EXTENSION LAYER"
 subgraph "UI COMPONENTS"
 ChatPanel[RAG Chat Panel<br/>Webview]
 StatusBar[Status Bar<br/>Indexing Status]
 TreeView[Project Tree View<br/>Code Navigation]
 QuickAsk[Quick Ask<br/>Context Menu]
 Notifications[Notifications]
 end
 
 subgraph "EXTENSION CORE"
 CommandRegistry[Command Registry<br/>VS Code Commands]
 EventManager[Event Manager<br/>File/Selection Events]
 ConfigManager[Configuration Manager<br/>Settings]
 LanguageClient[Language Client<br/>LSP Integration]
 WorkspaceIndexer[Workspace Indexer<br/>Auto-scan Project Files]
 end
 
 subgraph "COMMUNICATION"
 WebSocketClient[WebSocket Client<br/>Real-time]
 HTTPClient[HTTP Client<br/>API Calls]
 MessageHandler[Message Handler<br/>Event Routing]
 end
 end
 
 subgraph "LOCAL RAG BACKEND"
 subgraph "API GATEWAY"
 RequestLogger[Request Logger]
 end
 
 subgraph "CORE RAG ENGINE"
 subgraph "QUERY PROCESSING"
 QueryAnalyzer[Query Analyzer<br/>Intent Classification]
 QueryExpander[Query Expander<br/>Synonyms/Code Terms]
 ContextBuilder[Context Builder<br/>Relevance Scoring]
 end
 
 subgraph "CODE INDEXING PIPELINE"
 RepoManager[Repository Manager<br/>Git Operations]
 ASTParser[AST Parser<br/>Multi-language]
 CodeChunker[Smart Code Chunker<br/>Function/Class level]
 EmbeddingGenerator[Embedding Generator<br/>Local/Remote]
 IndexManager[Index Manager<br/>Vector Operations]
 end
 
 subgraph "RETRIEVAL PIPELINE"
 HybridRetriever[Hybrid Retriever<br/>Vector + Keyword]
 CodeSearcher[Code Searcher<br/>AST-based]
 CrossEncoder[Reranker<br/>Cross-encoder]
 ContextOptimizer[Context Optimizer<br/>Token Budget]
 end
 
 subgraph "GENERATION PIPELINE"
 PromptEngine[Prompt Engine<br/>Code-specific Templates]
 ChatOrchestrator[Chat Orchestrator<br/>Multi-LLM via WebSocket]
 StreamManager[Stream Manager<br/>Real-time Streaming]
 ResponseValidator[Response Validator<br/>Code Syntax]
 end
 end
 
 subgraph "DATA MANAGEMENT"
 ProjectManager[Project Manager<br/>Workspace State]
 CacheManager[Cache Manager<br/>Embedding Cache]
 SessionManager[Session Manager<br/>Conversation State]
 end
 end
 
 subgraph "CLOUD SERVICES"
 subgraph "VECTOR STORAGE"
 Pinecone[Pinecone<br/>High-performance Vector DB]
 Qdrant[Qdrant Cloud<br/>Alternative Vector DB]
 BackupVector[Backup Vector Store]
 end
 
 subgraph "METADATA & CACHE"
 NeonPostgres[(Neon PostgreSQL<br/>Projects/Metadata)]
 RedisCloud[(Redis Cloud<br/>Cache/Sessions)]
 end
 end
 
 subgraph "BROWSER CLAUDE INTEGRATION"
 subgraph "WEBSOCKET BRIDGE"
 BrowserExtension[Browser Extension<br/>Claude.ai Interface]
 WebSocketBridge[WebSocket Bridge<br/>Local ↔ Browser]
 ClaudeAPI[Claude API<br/>via Browser Session]
 end
 end
 
 %% Connections
 %% Extension Layer
 ChatPanel --> CommandRegistry
 TreeView --> CommandRegistry
 QuickAsk --> CommandRegistry
 CommandRegistry --> EventManager
 EventManager --> LanguageClient
 EventManager --> WorkspaceIndexer
 ConfigManager --> MessageHandler
 MessageHandler --> WebSocketClient
 MessageHandler --> HTTPClient
 
 %% Workspace Auto-Indexing
 WorkspaceIndexer --> RepoManager
 
 %% Backend Communication (No Auth, No Rate Limit)
 WebSocketClient --> RequestLogger
 HTTPClient --> RequestLogger
 
 %% RAG Pipeline
 RequestLogger --> QueryAnalyzer
 QueryAnalyzer --> QueryExpander
 QueryExpander --> HybridRetriever
 
 HybridRetriever --> Pinecone
 HybridRetriever --> Qdrant
 HybridRetriever --> CodeSearcher
 CodeSearcher --> ASTParser
 HybridRetriever --> CrossEncoder
 CrossEncoder --> ContextOptimizer
 ContextOptimizer --> ContextBuilder
 
 ContextBuilder --> PromptEngine
 PromptEngine --> ChatOrchestrator
 
 %% WebSocket to Browser Claude
 ChatOrchestrator --> WebSocketBridge
 WebSocketBridge --> BrowserExtension
 BrowserExtension --> ClaudeAPI
 ClaudeAPI --> BrowserExtension
 BrowserExtension --> WebSocketBridge
 WebSocketBridge --> StreamManager
 
 StreamManager --> ResponseValidator
 ResponseValidator --> WebSocketClient
 
 %% Indexing Pipeline
 RepoManager --> ASTParser
 ASTParser --> CodeChunker
 CodeChunker --> EmbeddingGenerator
 EmbeddingGenerator --> IndexManager
 IndexManager --> Pinecone
 IndexManager --> Qdrant
 
 %% Data Management
 ProjectManager --> NeonPostgres
 CacheManager --> RedisCloud
 SessionManager --> RedisCloud
 
 %% Logging
 RequestLogger --> NeonPostgres
 
 style ChatPanel fill:#e1f5ff
 style CommandRegistry fill:#e1f5ff
 style WebSocketClient fill:#e1f5ff
 style WorkspaceIndexer fill:#e1f5ff
 style RequestLogger fill:#fff4e1
 style QueryAnalyzer fill:#fff4e1
 style HybridRetriever fill:#fff4e1
 style ChatOrchestrator fill:#fff4e1
 style ASTParser fill:#fff4e1
 style Pinecone fill:#e1ffe1
 style Qdrant fill:#e1ffe1
 style NeonPostgres fill:#e1ffe1
 style RedisCloud fill:#e1ffe1
 style BrowserExtension fill:#ffe1f0
 style WebSocketBridge fill:#ffe1f0
 style ClaudeAPI fill:#ffe1f0