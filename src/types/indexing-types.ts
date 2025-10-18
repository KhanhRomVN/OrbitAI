// src/types/indexing-types.ts

export interface IndexingJob {
  id: string;
  workspacePath: string;
  status: IndexingStatus;
  progress: number;
  totalFiles: number;
  processedFiles: number;
  errors: string[];
  startTime: number;
  endTime?: number;
}

export enum IndexingStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export interface FileIndexInfo {
  filePath: string;
  language: string;
  size: number;
  lastModified: number;
  indexed: boolean;
  chunks: number;
  error?: string;
}

export interface CodeChunk {
  id: string;
  content: string;
  filePath: string;
  language: string;
  startLine: number;
  endLine: number;
  chunkIndex: number;
  totalChunks: number;
  type: ChunkType;
  metadata?: ChunkMetadata;
}

export enum ChunkType {
  FUNCTION = "function",
  CLASS = "class",
  MODULE = "module",
  IMPORT = "import",
  COMMENT = "comment",
  OTHER = "other",
}

export interface ChunkMetadata {
  functionName?: string;
  className?: string;
  imports?: string[];
  dependencies?: string[];
  complexity?: number;
}
