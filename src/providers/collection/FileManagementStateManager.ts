// src/providers/collection/FileManagementStateManager.ts
import * as vscode from "vscode";
import * as path from "path";
import { FileManagementState } from "../../domain/collection/types/CollectionTypes";
import { FileNode } from "../../domain/collection/entities/FileNode";
import { ICollectionTreeService } from "../../infrastructure/di/ServiceContainer";
import { TreeItemFactory } from "./TreeItemFactory";

export class FileManagementStateManager {
  private fileManagementState: FileManagementState = {
    mode: "normal",
    collectionId: null,
    selectedFiles: new Set(),
    selectedFolders: new Set(),
  };

  private currentFileTree: FileNode[] = [];
  private searchTerm: string = "";
  private searchResults: Set<string> = new Set();
  private selectionChangeEmitter:
    | vscode.EventEmitter<vscode.TreeItem | undefined | null | void>
    | undefined;

  constructor(private readonly collectionTreeService: ICollectionTreeService) {}

  setSelectionChangeEmitter(
    emitter: vscode.EventEmitter<vscode.TreeItem | undefined | null | void>
  ): void {
    this.selectionChangeEmitter = emitter;
  }

  getState(): FileManagementState {
    return this.fileManagementState;
  }

  isInFileManagementMode(): boolean {
    return this.fileManagementState.mode !== "normal";
  }

  enterFileManagementMode(collectionId: string, mode: "add" | "remove"): void {
    this.fileManagementState = {
      mode,
      collectionId,
      selectedFiles: new Set(),
      selectedFolders: new Set(),
    };

    this.preselectExistingFiles(collectionId);
  }

  exitFileManagementMode(): void {
    this.fileManagementState = {
      mode: "normal",
      collectionId: null,
      selectedFiles: new Set(),
      selectedFolders: new Set(),
    };
    this.currentFileTree = [];
    this.clearSearchTerm();
  }

  toggleFileSelection(filePath: string): void {
    const wasSelected = this.fileManagementState.selectedFiles.has(filePath);

    if (wasSelected) {
      this.fileManagementState.selectedFiles.delete(filePath);
    } else {
      this.fileManagementState.selectedFiles.add(filePath);
    }

    if (this.selectionChangeEmitter) {
      this.selectionChangeEmitter.fire(null);
    }

    this.showSelectionFeedback(filePath, !wasSelected);

    const selectedCount = this.getSelectedFiles().length;
    vscode.commands.executeCommand(
      "setContext",
      "orbitAI.hasSelectedFiles",
      selectedCount > 0
    );
  }

  private showSelectionFeedback(filePath: string, isSelected: boolean): void {
    const fileName = path.basename(filePath);
    const selectedCount = this.getSelectedFiles().length;

    vscode.window.setStatusBarMessage(
      `${
        isSelected ? "Selected" : "Deselected"
      } ${fileName} (${selectedCount} files selected)`,
      1500
    );
  }

  async selectAllFiles(): Promise<void> {
    if (!this.fileManagementState.collectionId) {
      console.error(
        "No collection ID in file management state for selectAllFiles"
      );
      return;
    }

    try {
      const collection = this.collectionTreeService.getCollectionById(
        this.fileManagementState.collectionId
      );

      let allFilePaths: string[] = [];
      const currentWorkspace =
        this.collectionTreeService.getCurrentWorkspaceFolder();

      if (!currentWorkspace) {
        console.warn("No workspace folder found");
        return;
      }

      if (this.fileManagementState.mode === "add") {
        const allUris = await vscode.workspace.findFiles(
          "**/*",
          "**/node_modules/**"
        );

        allFilePaths = allUris.map((uri) => {
          const relativePath = vscode.workspace.asRelativePath(uri, false);
          return relativePath.replace(/\\/g, "/");
        });
      } else if (this.fileManagementState.mode === "remove") {
        const fileTree = this.collectionTreeService.buildFileTreeForCollection(
          this.fileManagementState.collectionId
        );

        const extractFilePaths = (nodes: any[]): string[] => {
          const paths: string[] = [];
          for (const node of nodes) {
            if (node.isFile) {
              paths.push(node.path);
            } else if (node.children && node.children.size > 0) {
              paths.push(
                ...extractFilePaths(Array.from(node.children.values()))
              );
            }
          }
          return paths;
        };

        allFilePaths = extractFilePaths(fileTree);
      }

      if (allFilePaths.length === 0) {
        console.warn(
          `No files found for selectAllFiles in ${this.fileManagementState.mode} mode`
        );
        return;
      }

      let addedCount = 0;
      allFilePaths.forEach((filePath) => {
        if (filePath && !this.fileManagementState.selectedFiles.has(filePath)) {
          this.fileManagementState.selectedFiles.add(filePath);
          addedCount++;
        }
      });

      if (this.selectionChangeEmitter) {
        this.selectionChangeEmitter.fire(null);
      }

      vscode.commands.executeCommand(
        "setContext",
        "orbitAI.hasSelectedFiles",
        this.fileManagementState.selectedFiles.size > 0
      );
    } catch (error) {
      console.error("Error in selectAllFiles:", error);
    }
  }

  deselectAllFiles(): void {
    this.fileManagementState.selectedFiles.clear();

    if (this.selectionChangeEmitter) {
      this.selectionChangeEmitter.fire(null);
    }

    vscode.commands.executeCommand(
      "setContext",
      "orbitAI.hasSelectedFiles",
      false
    );
  }

  getSelectedFiles(): string[] {
    return Array.from(this.fileManagementState.selectedFiles);
  }

  selectAllFilesInFolder(collectionId: string, directoryPath?: string): number {
    try {
      const collection =
        this.collectionTreeService.getCollectionById(collectionId);
      const currentWorkspace =
        this.collectionTreeService.getCurrentWorkspaceFolder();

      if (!currentWorkspace) {
        console.warn("No workspace folder found");
        return 0;
      }

      let allFilePaths: string[] = [];

      if (this.fileManagementState.mode === "add") {
        try {
          const allWorkspaceFiles = this.getAllWorkspaceFilesFromTree();

          if (directoryPath) {
            allFilePaths = allWorkspaceFiles.filter((filePath) => {
              const isInDirectory =
                filePath.startsWith(directoryPath + "/") ||
                filePath === directoryPath;
              return isInDirectory;
            });
          } else {
            allFilePaths = allWorkspaceFiles;
          }
        } catch (error) {
          console.error("Failed to get workspace files", error);
          return 0;
        }
      } else {
        const collectionFiles = collection.files;

        collectionFiles.forEach((fileUri) => {
          try {
            const relativePath = this.getRelativePathFromUri(fileUri);
            if (relativePath) {
              if (
                !directoryPath ||
                relativePath.startsWith(directoryPath + "/") ||
                relativePath === directoryPath
              ) {
                allFilePaths.push(relativePath);
              }
            }
          } catch (error) {
            console.warn(
              `Failed to convert URI to relative path: ${fileUri}`,
              error
            );
          }
        });
      }

      if (allFilePaths.length === 0) {
        console.warn(
          `No files found for selection in collection ${collectionId}${
            directoryPath ? ` and directory ${directoryPath}` : ""
          }`
        );
        return 0;
      }

      let addedCount = 0;
      allFilePaths.forEach((filePath) => {
        if (filePath) {
          const normalizedPath = this.normalizePath(filePath);
          const normalizedSelectedFiles = new Set<string>();
          this.fileManagementState.selectedFiles.forEach((path) => {
            normalizedSelectedFiles.add(this.normalizePath(path));
          });

          if (!normalizedSelectedFiles.has(normalizedPath)) {
            this.fileManagementState.selectedFiles.add(filePath);
            addedCount++;
          }
        }
      });

      if (this.selectionChangeEmitter) {
        this.selectionChangeEmitter.fire(null);
      }

      vscode.commands.executeCommand(
        "setContext",
        "orbitAI.hasSelectedFiles",
        this.fileManagementState.selectedFiles.size > 0
      );

      return addedCount;
    } catch (error) {
      console.error("Error selecting all files in folder:", error);
      return 0;
    }
  }

  private getAllWorkspaceFilesFromTree(): string[] {
    try {
      const fileManagementState = this.fileManagementState;
      if (!fileManagementState.collectionId) {
        return [];
      }

      const allWorkspaceFiles: string[] = [];
      const fileTree = this.currentFileTree;

      if (fileTree && fileTree.length > 0) {
        const extractPaths = (nodes: any[]): string[] => {
          const paths: string[] = [];
          for (const node of nodes) {
            if (node.isFile && node.path) {
              paths.push(node.path);
            }
            if (node.children && node.children.size > 0) {
              paths.push(...extractPaths(Array.from(node.children.values())));
            }
          }
          return paths;
        };

        allWorkspaceFiles.push(...extractPaths(fileTree));
      }

      return allWorkspaceFiles;
    } catch (error) {
      console.error("Error getting workspace files from tree", error);
      return [];
    }
  }

  setSearchTerm(term: string): void {
    this.searchTerm = term.toLowerCase().trim();
    this.applySearchFilter();

    if (this.selectionChangeEmitter) {
      this.selectionChangeEmitter.fire(null);
    }
  }

  clearSearchTerm(): void {
    this.searchTerm = "";
    this.searchResults.clear();

    if (this.selectionChangeEmitter) {
      this.selectionChangeEmitter.fire(null);
    }
  }

  getSearchTerm(): string {
    return this.searchTerm;
  }

  hasActiveSearch(): boolean {
    return this.searchTerm.length > 0;
  }

  private applySearchFilter(): void {
    this.searchResults.clear();

    if (!this.searchTerm) {
      return;
    }

    const searchInNodes = (nodes: FileNode[]): void => {
      for (const node of nodes) {
        if (node.name.toLowerCase().includes(this.searchTerm)) {
          this.searchResults.add(node.path);
          this.includeParentPaths(node.path);
        }

        if (node.isDirectory && node.children.size > 0) {
          searchInNodes(node.getChildrenArray());
        }
      }
    };

    if (this.currentFileTree.length > 0) {
      searchInNodes(this.currentFileTree);
    }
  }

  private includeParentPaths(filePath: string): void {
    let currentPath = filePath;
    while (currentPath.includes("/")) {
      currentPath = currentPath.substring(0, currentPath.lastIndexOf("/"));
      if (currentPath) {
        this.searchResults.add(currentPath);
      }
    }
  }

  filterFileTreeForSearch(nodes: FileNode[]): FileNode[] {
    if (!this.searchTerm) {
      return nodes;
    }

    const filterNodes = (nodeList: FileNode[]): FileNode[] => {
      const filtered: FileNode[] = [];

      for (const node of nodeList) {
        if (this.searchResults.has(node.path)) {
          if (node.isFile) {
            filtered.push(node);
          } else {
            const filteredChildren = filterNodes(node.getChildrenArray());
            if (filteredChildren.length > 0) {
              const filteredDir = FileNode.createDirectory(
                node.name,
                node.path,
                node.uri
              );
              filteredChildren.forEach((child) => filteredDir.addChild(child));
              filtered.push(filteredDir);
            }
          }
        } else if (node.isDirectory) {
          const filteredChildren = filterNodes(node.getChildrenArray());
          if (filteredChildren.length > 0) {
            const filteredDir = FileNode.createDirectory(
              node.name,
              node.path,
              node.uri
            );
            filteredChildren.forEach((child) => filteredDir.addChild(child));
            filtered.push(filteredDir);
          }
        }
      }

      return FileNode.sortNodes(filtered);
    };

    return filterNodes(nodes);
  }

  private normalizePath(path: string): string {
    if (!path) return path;
    return path.toLowerCase().replace(/\\/g, "/").trim();
  }

  // src/providers/collection/FileManagementStateManager.ts (tiếp tục)

  unselectAllFilesInFolder(collectionId: string): number {
    try {
      const collection =
        this.collectionTreeService.getCollectionById(collectionId);
      const fileTree =
        this.collectionTreeService.buildFileTreeForCollection(collectionId);

      const allFilePaths = this.getAllFilePathsFromTree(fileTree);
      let removedCount = 0;

      allFilePaths.forEach((filePath: string) => {
        if (this.fileManagementState.selectedFiles.has(filePath)) {
          this.fileManagementState.selectedFiles.delete(filePath);
          removedCount++;
        }
      });

      if (this.selectionChangeEmitter) {
        this.selectionChangeEmitter.fire(null);
      }

      return removedCount;
    } catch (error) {
      console.error("Error unselecting all files in folder:", error);
      return 0;
    }
  }

  async getFileManagementRootItems(
    treeItemFactory: TreeItemFactory
  ): Promise<vscode.TreeItem[]> {
    try {
      const collection = this.collectionTreeService.getCollectionById(
        this.fileManagementState.collectionId!
      );
      const items: vscode.TreeItem[] = [];

      const headerItem = treeItemFactory.createFileManagementHeader(
        collection,
        this.fileManagementState.mode as "add" | "remove"
      );
      items.push(headerItem);

      if (this.hasActiveSearch()) {
        const fileTree = await this.getCurrentFileTree();
        const resultCount = this.countSearchResults(fileTree);

        items.push(
          treeItemFactory.createSearchHeaderItem(this.searchTerm, resultCount),
          treeItemFactory.createClearSearchButton()
        );
      }

      const selectedCount = this.getSelectedFiles().length;

      items.push(
        treeItemFactory.createActionButton(
          "Search Files",
          "search",
          "searchFiles",
          "orbit-ai.collection.searchFiles"
        )
      );

      if (this.fileManagementState.mode === "add") {
        items.push(
          treeItemFactory.createActionButton(
            "Select All Files",
            "check-all",
            "selectAllFiles",
            "orbit-ai.collection.selectAllFiles"
          ),
          treeItemFactory.createActionButton(
            "Deselect All Files",
            "close-all",
            "deselectAllFiles",
            "orbit-ai.collection.deselectAllFiles"
          ),
          treeItemFactory.createActionButton(
            `Confirm Add/Remove (${selectedCount} selected)`,
            "check",
            "confirmFileManagement",
            "orbit-ai.collection.confirmFileManagement"
          ),
          treeItemFactory.createActionButton(
            "Cancel",
            "close",
            "cancelFileManagement",
            "orbit-ai.collection.cancelFileManagement"
          )
        );
      } else {
        items.push(
          treeItemFactory.createActionButton(
            "Select All Files",
            "check-all",
            "selectAllFiles",
            "orbit-ai.collection.selectAllFiles"
          ),
          treeItemFactory.createActionButton(
            "Deselect All Files",
            "close-all",
            "deselectAllFiles",
            "orbit-ai.collection.deselectAllFiles"
          ),
          treeItemFactory.createActionButton(
            `Remove Selected (${selectedCount} to remove)`,
            "trash",
            "confirmFileManagement",
            "orbit-ai.collection.confirmFileManagement"
          ),
          treeItemFactory.createActionButton(
            "Cancel",
            "close",
            "cancelFileManagement",
            "orbit-ai.collection.cancelFileManagement"
          )
        );
      }

      return items;
    } catch (error) {
      console.error("Failed to create file management root items", error);
      return [];
    }
  }

  private countSearchResults(nodes: FileNode[]): number {
    if (!this.searchTerm) return 0;

    let count = 0;
    const countNodes = (nodeList: FileNode[]) => {
      for (const node of nodeList) {
        if (node.name.toLowerCase().includes(this.searchTerm)) {
          count++;
        }
        if (node.isDirectory && node.children.size > 0) {
          countNodes(node.getChildrenArray());
        }
      }
    };

    countNodes(nodes);
    return count;
  }

  private async getCurrentFileTree(): Promise<FileNode[]> {
    if (this.currentFileTree.length > 0) {
      return this.currentFileTree;
    }

    let files: string[] = [];
    if (this.fileManagementState.mode === "add") {
      const allUris = await vscode.workspace.findFiles(
        "**/*",
        "**/node_modules/**"
      );
      files = allUris.map((uri) => this.getRelativePathFromUri(uri.toString()));
    } else {
      const collection = this.collectionTreeService.getCollectionById(
        this.fileManagementState.collectionId!
      );
      files = collection.files.map((fileUri) =>
        this.getRelativePathFromUri(fileUri)
      );
    }

    return this.buildFileTreeFromPaths(files);
  }

  async getFileManagementFiles(
    treeItemFactory: TreeItemFactory
  ): Promise<vscode.TreeItem[]> {
    try {
      let files: string[];

      if (this.fileManagementState.mode === "add") {
        const allUris = await vscode.workspace.findFiles(
          "**/*",
          "**/node_modules/**"
        );
        files = allUris.map((uri) =>
          this.getRelativePathFromUri(uri.toString())
        );
      } else {
        const collection = this.collectionTreeService.getCollectionById(
          this.fileManagementState.collectionId!
        );
        files = collection.files.map((fileUri) =>
          this.getRelativePathFromUri(fileUri)
        );
      }

      const tree = this.buildFileTreeFromPaths(files);
      this.currentFileTree = tree;

      const filteredTree = this.hasActiveSearch()
        ? this.filterFileTreeForSearch(tree)
        : tree;

      return treeItemFactory.convertFileNodeToItems(
        filteredTree,
        this.fileManagementState
      );
    } catch (error) {
      console.error("Failed to get file management files", error);
      return [];
    }
  }

  dispose(): void {
    // Cleanup if needed
  }

  private preselectExistingFiles(collectionId: string): void {
    try {
      const collection =
        this.collectionTreeService.getCollectionById(collectionId);
      const currentWorkspace =
        this.collectionTreeService.getCurrentWorkspaceFolder();

      if (currentWorkspace) {
        if (this.fileManagementState.mode === "add") {
          collection.files.forEach((fileUri) => {
            try {
              const relativePath = this.getRelativePathFromUri(fileUri);
              this.fileManagementState.selectedFiles.add(relativePath);
            } catch (error) {
              console.warn(`Invalid URI in collection: ${fileUri}`, error);
            }
          });
        } else if (this.fileManagementState.mode === "remove") {
          this.fileManagementState.selectedFiles.clear();
        }
      }
    } catch (error) {
      console.error(
        `Failed to handle file preselection for collection ${collectionId}`,
        error
      );
    }
  }

  private getAllFilePathsFromTree(nodes: any[]): string[] {
    const paths: string[] = [];

    const traverse = (nodeList: any[]) => {
      for (const node of nodeList) {
        if (node.isFile && node.path) {
          paths.push(node.path);
        }

        if (node.children && node.children.size > 0) {
          traverse(Array.from(node.children.values()));
        } else if (node.getChildrenArray) {
          traverse(node.getChildrenArray());
        }
      }
    };

    traverse(nodes);
    return paths;
  }

  private buildFileTreeFromPaths(filePaths: string[]): FileNode[] {
    const fileNodes = new Map<string, FileNode>();

    for (const filePath of filePaths) {
      try {
        this.insertFileNodeIntoTree(fileNodes, filePath);
      } catch (error) {
        console.warn(`Failed to process file path: ${filePath}`, error);
      }
    }

    return FileNode.sortNodes(Array.from(fileNodes.values()));
  }

  private insertFileNodeIntoTree(
    tree: Map<string, FileNode>,
    filePath: string,
    originalUri?: string
  ): void {
    const parts = filePath.split("/").filter((part) => part.length > 0);
    let currentLevel = tree;
    let currentPath = "";

    const currentWorkspace =
      this.collectionTreeService.getCurrentWorkspaceFolder();

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!currentLevel.has(part)) {
        let node: FileNode;

        if (isFile) {
          let fileUri = originalUri;
          if (!fileUri && currentWorkspace) {
            const fullPath = path.join(currentWorkspace, currentPath);
            fileUri = vscode.Uri.file(fullPath).toString();
          }

          node = FileNode.createFile(part, currentPath, fileUri);
        } else {
          let directoryUri: string | undefined;
          if (currentWorkspace) {
            const fullPath = path.join(currentWorkspace, currentPath);
            directoryUri = vscode.Uri.file(fullPath).toString();
          }

          node = FileNode.createDirectory(part, currentPath, directoryUri);
        }

        currentLevel.set(part, node);
      }

      if (!isFile) {
        const node = currentLevel.get(part)!;
        currentLevel = node.children;
      }
    }
  }

  private getRelativePathFromUri(uri: string): string {
    try {
      const vscodeUri = vscode.Uri.parse(uri);

      if (
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0
      ) {
        const relativePath = vscode.workspace.asRelativePath(vscodeUri);
        const normalizedPath = relativePath.replace(/\\/g, "/");
        return normalizedPath;
      }

      const fallback = path.basename(vscodeUri.fsPath);
      return fallback;
    } catch (error) {
      console.warn(`Failed to get relative path from URI: ${uri}`, error);
      const fallback = path.basename(uri.replace(/^file:\/\//, ""));
      return fallback;
    }
  }
}
