// src/types/copy-path-with-code.d.ts
declare module "copy-path-with-code" {
  export interface CopyPathWithCodeAPI {
    readonly version: string;
    getCollections(): Promise<CollectionInfo[]>;
    copyCollectionContent(collectionId: string): Promise<CollectionContent>;
  }

  export interface CollectionInfo {
    id: string;
    name: string;
    fileCount: number;
    workspaceFolder?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CollectionContent {
    collectionId: string;
    collectionName: string;
    fileCount: number;
    content: string;
    files: CollectionFile[];
    failedFiles: FailedFile[];
  }

  export interface CollectionFile {
    name: string;
    path: string;
    uri: string;
    content: string;
    size: number;
  }

  export interface FailedFile {
    name: string;
    path: string;
    uri: string;
    error: string;
  }
}
