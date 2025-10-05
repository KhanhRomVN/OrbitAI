// src/providers/collection/SearchManager.ts
import { ICollectionTreeService } from "../../infrastructure/di/ServiceContainer";
import { FileNode } from "../../domain/collection/entities/FileNode";

export class SearchManager {
  private searchTerm: string = "";

  getCurrentSearchTerm(): string | null {
    return this.searchTerm || null;
  }

  setSearchFilter(
    searchTerm: string,
    collectionTreeService: ICollectionTreeService,
    viewMode: "workspace" | "global"
  ): { totalMatches: number; fileMatches: number; collectionMatches: number } {
    this.searchTerm = searchTerm;
    return this.countSearchMatches(searchTerm, collectionTreeService, viewMode);
  }

  hasActiveSearch(): boolean {
    return this.searchTerm.length > 0;
  }

  clearSearch(): void {
    this.searchTerm = "";
  }

  private countSearchMatches(
    searchTerm: string,
    collectionTreeService: ICollectionTreeService,
    viewMode: "workspace" | "global"
  ): { totalMatches: number; fileMatches: number; collectionMatches: number } {
    let fileMatches = 0;
    let collectionMatches = 0;

    try {
      const collections =
        viewMode === "workspace"
          ? collectionTreeService.getCollectionsForWorkspace(
              collectionTreeService.getCurrentWorkspaceFolder()
            )
          : collectionTreeService.getAllCollections();

      collections.forEach((collection) => {
        if (collection.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          collectionMatches++;
        }

        const fileTree = collectionTreeService.buildFileTreeForCollection(
          collection.id
        );
        const matchingFiles = this.searchInFileTree(fileTree, searchTerm);
        fileMatches += matchingFiles;
      });
    } catch (error) {
      console.error("Error counting search matches:", error);
    }

    return {
      totalMatches: fileMatches + collectionMatches,
      fileMatches,
      collectionMatches,
    };
  }

  private searchInFileTree(fileNodes: FileNode[], searchTerm: string): number {
    let matches = 0;
    const lowerSearchTerm = searchTerm.toLowerCase();

    const traverse = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.name.toLowerCase().includes(lowerSearchTerm)) {
          if (node.isFile) {
            matches++;
          }
        }

        if (node.isDirectory) {
          traverse(node.getChildrenArray());
        }
      }
    };

    traverse(fileNodes);
    return matches;
  }
}
