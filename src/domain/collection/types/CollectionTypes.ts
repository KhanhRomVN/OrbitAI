// src/domain/collection/types/CollectionTypes.ts
export interface CollectionViewMode {
  mode: "workspace" | "global";
}

export interface FileManagementState {
  mode: "normal" | "add" | "remove";
  collectionId: string | null;
  selectedFiles: Set<string>;
  selectedFolders: Set<string>;
}

export interface TreeItemData {
  id: string;
  label: string;
  collectionId?: string;
  treeNode?: any;
  contextValue: string;
  isFileManagementHeader?: boolean;
}

export interface CollectionStatistics {
  totalCollections: number;
  totalFiles: number;
  averageFilesPerCollection: number;
  emptyCollections: number;
  collectionsPerWorkspace: Map<string, number>;
}
