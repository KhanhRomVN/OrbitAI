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
 end
 
 subgraph "COMMUNICATION"
 WebSocketClient[WebSocket Client<br/>Real-time]
 HTTPClient[HTTP Client<br/>API Calls]
 MessageHandler[Message Handler<br/>Event Routing]
 end
 end
 
 subgraph "LOCAL RAG BACKEND"
 subgraph "API GATEWAY"
 AuthMiddleware[Auth Middleware<br/>API Key Validation]
 RateLimiter[Rate Limiter<br/>Request Throttling]
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
 ChatOrchestrator[Chat Orchestrator<br/>Multi-LLM]
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
 
 subgraph "METADATA & ANALYTICS"
 PostgresQL[(PostgreSQL<br/>Projects/Metadata)]
 ClickHouse[(ClickHouse<br/>Analytics/Logs)]
 Redis[(Redis Cloud<br/>Cache/Sessions)]
 end
 
 subgraph "LLM PROVIDERS"
 OpenAI[OpenAI GPT-4]
 Anthropic[Claude 3]
 LocalLLM[Local LLMs<br/>Ollama]
 CodeLLM[Specialized Code LLMs]
 end
 
 subgraph "OBSERVABILITY"
 Sentry[Sentry<br/>Error Tracking]
 Prometheus[Prometheus<br/>Metrics]
 Grafana[Grafana<br/>Dashboards]
 Loki[Loki<br/>Log Aggregation]
 end
 end
 
 subgraph "DEVELOPER TOOLS"
 subgraph "TESTING & QA"
 UnitTests[Unit Tests<br/>Jest/Pytest]
 IntegrationTests[Integration Tests]
 E2ETests[E2E Tests<br/>VS Code Test Runner]
 end
 
 subgraph "DEVOPS"
 CI_CD[CI/CD Pipeline<br/>GitHub Actions]
 Docker[Docker Containerization]
 Monitoring[Health Monitoring]
 end
 end
 
 %% Connections
 %% Extension Layer
 ChatPanel --> CommandRegistry
 TreeView --> CommandRegistry
 QuickAsk --> CommandRegistry
 CommandRegistry --> EventManager
 EventManager --> LanguageClient
 ConfigManager --> MessageHandler
 MessageHandler --> WebSocketClient
 MessageHandler --> HTTPClient
 
 %% Backend Communication
 WebSocketClient --> AuthMiddleware
 HTTPClient --> AuthMiddleware
 
 %% RAG Pipeline
 AuthMiddleware --> QueryAnalyzer
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
 ChatOrchestrator --> OpenAI
 ChatOrchestrator --> Anthropic
 ChatOrchestrator --> LocalLLM
 ChatOrchestrator --> CodeLLM
 ChatOrchestrator --> StreamManager
 StreamManager --> ResponseValidator
 ResponseValidator --> WebSocketClient
 
 %% Indexing Pipeline
 EventManager --> RepoManager
 RepoManager --> ASTParser
 ASTParser --> CodeChunker
 CodeChunker --> EmbeddingGenerator
 EmbeddingGenerator --> IndexManager
 IndexManager --> Pinecone
 IndexManager --> Qdrant
 
 %% Data Management
 ProjectManager --> PostgresQL
 CacheManager --> Redis
 SessionManager --> Redis
 
 %% Observability
 RequestLogger --> Loki
 AuthMiddleware --> Prometheus
 ChatOrchestrator --> Sentry
 
 style ChatPanel fill:#e1f5ff
 style CommandRegistry fill:#e1f5ff
 style WebSocketClient fill:#e1f5ff
 style AuthMiddleware fill:#fff4e1
 style QueryAnalyzer fill:#fff4e1
 style HybridRetriever fill:#fff4e1
 style ChatOrchestrator fill:#fff4e1
 style ASTParser fill:#fff4e1
 style Pinecone fill:#e1ffe1
 style PostgresQL fill:#e1ffe1
 style Redis fill:#e1ffe1
 style OpenAI fill:#ffe1f0
 style Anthropic fill:#ffe1f0
 style LocalLLM fill:#ffe1f0
 style CodeLLM fill:#ffe1f0
 style Sentry fill:#ffebee
 style Prometheus fill:#ffebee