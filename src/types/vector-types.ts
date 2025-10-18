// src/types/vector-types.ts

export interface VectorDocument {
  id: string;
  vector: number[];
  metadata: VectorMetadata;
}

export interface VectorMetadata {
  filePath: string;
  language: string;
  content: string;
  chunkIndex: number;
  totalChunks: number;
  functionName?: string;
  className?: string;
  lineStart?: number;
  lineEnd?: number;
}

export interface VectorSearchQuery {
  vector: number[];
  topK: number;
  filter?: Record<string, any>;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

export interface VectorStoreStats {
  totalDocuments: number;
  totalVectors: number;
  indexSize: number;
  lastUpdated: number;
}
