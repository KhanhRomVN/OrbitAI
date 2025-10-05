// src/providers/CollectionProvider.ts
import * as vscode from "vscode";
import { ICollectionTreeService } from "../infrastructure/di/ServiceContainer";
import { TreeItemFactory } from "./collection/TreeItemFactory";
import { SearchManager } from "./collection/SearchManager";
import { FileManagementStateManager } from "./collection/FileManagementStateManager";
import { CacheManager } from "./collection/CacheManager";
import { ViewModeManager } from "./collection/ViewModeManager";

export class CollectionProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChange = new vscode.EventEmitter<
    vscode.TreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChange.event;

  // Managers
  private readonly treeItemFactory: TreeItemFactory;
  private readonly searchManager: SearchManager;
  private readonly fileManagementStateManager: FileManagementStateManager;
  private readonly cacheManager: CacheManager;
  private readonly viewModeManager: ViewModeManager;

  // Prevent refresh loops
  private isRefreshing = false;

  // Store tree structure for getParent implementation
  private treeItemParentMap = new Map<string, vscode.TreeItem>();

  constructor(private readonly collectionTreeService: ICollectionTreeService) {
    // Initialize managers
    this.treeItemFactory = new TreeItemFactory(collectionTreeService);
    this.searchManager = new SearchManager();
    this.fileManagementStateManager = new FileManagementStateManager(
      collectionTreeService
    );
    this.cacheManager = new CacheManager();
    this.viewModeManager = new ViewModeManager();

    // Connect FileManagementStateManager to use null refresh
    this.fileManagementStateManager.setSelectionChangeEmitter(
      this._onDidChange
    );
  }

  // Implement getParent method for reveal functionality
  getParent(element: vscode.TreeItem): vscode.TreeItem | undefined {
    if (!element.id) {
      return undefined;
    }

    const parent = this.treeItemParentMap.get(element.id);
    return parent;
  }

  // Helper method to track parent-child relationships
  private trackParentChild(
    parent: vscode.TreeItem | undefined,
    child: vscode.TreeItem
  ): void {
    if (child.id && parent?.id) {
      this.treeItemParentMap.set(child.id, parent);
    }
  }

  // Set tree view reference (optional - for expansion management)
  setTreeView(treeView: vscode.TreeView<vscode.TreeItem>): void {
    // Can be used for expansion state management if needed
  }

  // Public API methods
  switchViewMode(mode: "workspace" | "global"): void {
    this.viewModeManager.setViewMode(mode);
    this.clearParentMap();
    this.refresh();
    vscode.commands.executeCommand("setContext", "orbitAI.viewMode", mode);
  }

  getViewMode(): "workspace" | "global" {
    return this.viewModeManager.getViewMode();
  }

  refresh(): void {
    if (this.isRefreshing) return;

    this.isRefreshing = true;
    this.cacheManager.clearCache();
    this.clearParentMap();
    this._onDidChange.fire(undefined);

    setTimeout(() => {
      this.isRefreshing = false;
    }, 150);
  }

  private clearParentMap(): void {
    this.treeItemParentMap.clear();
  }

  // File Management Mode methods
  enterFileManagementMode(collectionId: string, mode: "add" | "remove"): void {
    this.fileManagementStateManager.enterFileManagementMode(collectionId, mode);
    this.refresh();
  }

  exitFileManagementMode(): void {
    this.fileManagementStateManager.exitFileManagementMode();
    this.refresh();
  }

  isInFileManagementMode(): boolean {
    return this.fileManagementStateManager.isInFileManagementMode();
  }

  getFileManagementState() {
    return this.fileManagementStateManager.getState();
  }

  // File Selection methods
  toggleFileSelection(filePath: string): void {
    this.fileManagementStateManager.toggleFileSelection(filePath);
  }

  async selectAllFiles(): Promise<void> {
    await this.fileManagementStateManager.selectAllFiles();
  }

  deselectAllFiles(): void {
    this.fileManagementStateManager.deselectAllFiles();
  }

  getSelectedFiles(): string[] {
    return this.fileManagementStateManager.getSelectedFiles();
  }

  selectAllFilesInFolder(collectionId: string, directoryPath?: string): number {
    return this.fileManagementStateManager.selectAllFilesInFolder(
      collectionId,
      directoryPath
    );
  }

  unselectAllFilesInFolder(collectionId: string): number {
    return this.fileManagementStateManager.unselectAllFilesInFolder(
      collectionId
    );
  }

  // Search methods
  getCurrentSearchTerm(): string | null {
    return this.searchManager.getCurrentSearchTerm();
  }

  setSearchFilter(searchTerm: string): {
    totalMatches: number;
    fileMatches: number;
    collectionMatches: number;
  } {
    const results = this.searchManager.setSearchFilter(
      searchTerm,
      this.collectionTreeService,
      this.viewModeManager.getViewMode()
    );
    this.refresh();
    return results;
  }

  hasActiveSearch(): boolean {
    return this.searchManager.hasActiveSearch();
  }

  clearSearch(): void {
    this.searchManager.clearSearch();
    this.refresh();
  }

  // File Management Search methods
  setFileManagementSearchTerm(term: string): void {
    this.fileManagementStateManager.setSearchTerm(term);
    this.refresh();
  }

  clearFileManagementSearch(): void {
    this.fileManagementStateManager.clearSearchTerm();
    this.refresh();
  }

  getFileManagementSearchTerm(): string {
    return this.fileManagementStateManager.getSearchTerm();
  }

  hasFileManagementSearch(): boolean {
    return this.fileManagementStateManager.hasActiveSearch();
  }

  // Cache methods
  clearCache(): void {
    this.cacheManager.clearCache();
  }

  // Statistics
  getCollectionCount(): number {
    try {
      const collections =
        this.viewModeManager.getViewMode() === "workspace"
          ? this.collectionTreeService.getCollectionsForWorkspace(
              this.collectionTreeService.getCurrentWorkspaceFolder()
            )
          : this.collectionTreeService.getAllCollections();
      return collections.length;
    } catch (error) {
      console.error("Error getting collection count:", error);
      return 0;
    }
  }

  // TreeDataProvider implementation
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (this.viewModeManager.getViewMode() === "global") {
      return this.getGlobalChildren(element);
    }
    return this.getWorkspaceChildren(element);
  }

  // Private methods
  private async getWorkspaceChildren(
    element?: vscode.TreeItem
  ): Promise<vscode.TreeItem[]> {
    if (!element) {
      const items = this.isInFileManagementMode()
        ? await this.fileManagementStateManager.getFileManagementRootItems(
            this.treeItemFactory
          )
        : this.treeItemFactory.getCollectionItems(
            this.viewModeManager.getViewMode(),
            this.searchManager.getCurrentSearchTerm() || undefined
          );

      return items;
    }

    return this.handleElementExpansion(element);
  }

  private async getGlobalChildren(
    element?: vscode.TreeItem
  ): Promise<vscode.TreeItem[]> {
    if (!element) {
      const items = this.isInFileManagementMode()
        ? await this.fileManagementStateManager.getFileManagementRootItems(
            this.treeItemFactory
          )
        : this.treeItemFactory.getGlobalCollectionItems(
            this.searchManager.getCurrentSearchTerm() || undefined
          );

      return items;
    }

    return this.handleElementExpansion(element);
  }

  private async handleElementExpansion(
    element: vscode.TreeItem
  ): Promise<vscode.TreeItem[]> {
    const elementAny = element as any;

    // File management mode navigation
    if (this.isInFileManagementMode()) {
      if (elementAny.isFileManagementHeader) {
        const items =
          await this.fileManagementStateManager.getFileManagementFiles(
            this.treeItemFactory
          );
        items.forEach((item) => this.trackParentChild(element, item));
        return items;
      }
      if (elementAny.treeNode) {
        const items = this.treeItemFactory.convertFileNodeToItems(
          elementAny.treeNode.getChildrenArray(),
          this.fileManagementStateManager.getState(),
          this.searchManager.getCurrentSearchTerm() || undefined
        );
        items.forEach((item) => this.trackParentChild(element, item));
        return items;
      }
      return [];
    }

    // Directory expansion
    if (elementAny.treeNode && elementAny.collectionId) {
      const items = await this.expandDirectory(elementAny);
      items.forEach((item) => this.trackParentChild(element, item));
      return items;
    }

    // Collection root expansion
    const collectionId = elementAny.collectionId || elementAny.id;
    if (collectionId) {
      const items = await this.expandCollection(collectionId);
      items.forEach((item) => this.trackParentChild(element, item));
      return items;
    }

    return [];
  }

  private async expandDirectory(elementAny: any): Promise<vscode.TreeItem[]> {
    const cacheKey = `${this.viewModeManager.getViewMode()}-${
      elementAny.collectionId
    }-${elementAny.treeNode.path}`;

    // Don't use cache during file management
    if (this.isInFileManagementMode()) {
      try {
        const collection = this.collectionTreeService.getCollectionById(
          elementAny.collectionId
        );
        return this.treeItemFactory.convertFileNodeToTreeItems(
          elementAny.treeNode.getChildrenArray(),
          collection,
          this.fileManagementStateManager.getState(),
          this.searchManager.getCurrentSearchTerm() || undefined
        );
      } catch (error) {
        console.error(
          `Failed to expand directory: ${elementAny.treeNode.path}`,
          error
        );
        return [];
      }
    }

    // Use cache in normal mode
    if (this.cacheManager.has(cacheKey)) {
      return this.cacheManager.get(cacheKey)!;
    }

    try {
      const collection = this.collectionTreeService.getCollectionById(
        elementAny.collectionId
      );
      const items = this.treeItemFactory.convertFileNodeToTreeItems(
        elementAny.treeNode.getChildrenArray(),
        collection,
        null,
        this.searchManager.getCurrentSearchTerm() || undefined
      );
      this.cacheManager.set(cacheKey, items);
      return items;
    } catch (error) {
      console.error(
        `Failed to expand directory: ${elementAny.treeNode.path}`,
        error
      );
      return [];
    }
  }

  private async expandCollection(
    collectionId: string
  ): Promise<vscode.TreeItem[]> {
    const cacheKey = `${this.viewModeManager.getViewMode()}-${collectionId}-root`;

    // Don't use cache during file management
    if (this.isInFileManagementMode()) {
      try {
        const collection =
          this.collectionTreeService.getCollectionById(collectionId);
        const fileTree =
          this.collectionTreeService.buildFileTreeForCollection(collectionId);
        return this.treeItemFactory.convertFileNodeToTreeItems(
          fileTree,
          collection,
          this.fileManagementStateManager.getState(),
          this.searchManager.getCurrentSearchTerm() || undefined
        );
      } catch (error) {
        console.error(`Failed to expand collection: ${collectionId}`, error);
        return [];
      }
    }

    // Use cache in normal mode
    if (this.cacheManager.has(cacheKey)) {
      return this.cacheManager.get(cacheKey)!;
    }

    try {
      const collection =
        this.collectionTreeService.getCollectionById(collectionId);
      const fileTree =
        this.collectionTreeService.buildFileTreeForCollection(collectionId);
      const items = this.treeItemFactory.convertFileNodeToTreeItems(
        fileTree,
        collection,
        null,
        this.searchManager.getCurrentSearchTerm() || undefined
      );

      this.cacheManager.set(cacheKey, items);
      return items;
    } catch (error) {
      console.error(`Failed to expand collection: ${collectionId}`, error);
      return [];
    }
  }

  // Cleanup
  dispose(): void {
    this.fileManagementStateManager.dispose();
    this.cacheManager.clearCache();
    this.clearParentMap();
  }
}
