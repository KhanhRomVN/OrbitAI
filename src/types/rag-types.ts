// src/types/rag-types.ts

export interface DatabaseConfig {
  postgres?: PostgresConfig;
  vectorDb?: VectorDbConfig;
  redis?: RedisConfig;
}

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export interface VectorDbConfig {
  provider: "pinecone" | "qdrant";
  apiKey?: string;
  environment?: string;
  indexName?: string;
  url?: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export interface ConnectionStatus {
  postgres: boolean;
  vectorDb: boolean;
  redis: boolean;
  lastChecked: number;
}

export interface RAGContext {
  query: string;
  retrievedDocs: RetrievedDocument[];
  totalTokens: number;
}

export interface RetrievedDocument {
  content: string;
  metadata: {
    filePath: string;
    language: string;
    score: number;
  };
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}
