// src/providers/collection/TreeItemFactory.ts
import * as vscode from "vscode";
import * as path from "path";
import { Collection } from "../../domain/collection/entities/Collection";
import { FileNode } from "../../domain/collection/entities/FileNode";
import { FileManagementState } from "../../domain/collection/types/CollectionTypes";
import { ICollectionTreeService } from "../../infrastructure/di/ServiceContainer";
import * as crypto from "crypto";

export class TreeItemFactory {
  constructor(private readonly collectionTreeService: ICollectionTreeService) {}

  getCollectionItems(
    viewMode: "workspace" | "global",
    searchTerm?: string
  ): vscode.TreeItem[] {
    const currentWorkspace =
      this.collectionTreeService.getCurrentWorkspaceFolder();
    let collections =
      this.collectionTreeService.getCollectionsForWorkspace(currentWorkspace);

    if (searchTerm) {
      collections = collections.filter((collection) =>
        collection.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return collections.map((collection) =>
      this.createCollectionTreeItem(collection, true)
    );
  }

  getGlobalCollectionItems(searchTerm?: string): vscode.TreeItem[] {
    let allCollections = this.collectionTreeService.getAllCollections();

    if (searchTerm) {
      allCollections = allCollections.filter((collection) =>
        collection.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return allCollections.map((collection) => {
      const isCurrentWorkspace =
        this.isCollectionInCurrentWorkspace(collection);
      return this.createCollectionTreeItem(collection, isCurrentWorkspace);
    });
  }

  createCollectionTreeItem(
    collection: Collection,
    isCurrentWorkspace: boolean
  ): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(
      collection.name,
      vscode.TreeItemCollapsibleState.Collapsed
    );

    treeItem.id = collection.id;
    (treeItem as any).collectionId = collection.id;
    treeItem.contextValue = "collection";

    if (collection.workspaceFolder) {
      try {
        const collectionUri = vscode.Uri.file(
          path.join(collection.workspaceFolder, collection.name)
        );
        treeItem.resourceUri = collectionUri;
      } catch (error) {
        console.warn(
          `Failed to create resourceUri for collection: ${collection.name}`,
          error
        );
      }
    }

    treeItem.iconPath = new vscode.ThemeIcon(
      isCurrentWorkspace ? "folder-opened" : "folder-library"
    );

    const workspaceInfo = this.getWorkspaceDisplayInfo(
      collection,
      isCurrentWorkspace
    );

    treeItem.tooltip = new vscode.MarkdownString(
      `**${collection.name}**\n\n` +
        `Files: ${collection.fileCount}\n` +
        `${workspaceInfo}\n` +
        `${
          isCurrentWorkspace ? "✓ Current workspace" : "⚠ Different workspace"
        }`
    );

    if (!isCurrentWorkspace && collection.workspaceFolder) {
      treeItem.description = `(${path.basename(collection.workspaceFolder)})`;
    }

    return treeItem;
  }

  createFileManagementHeader(
    collection: Collection,
    mode: "add" | "remove"
  ): vscode.TreeItem {
    const headerItem = new vscode.TreeItem(
      mode === "add"
        ? `Add Files to "${collection.name}"`
        : `Remove Files from "${collection.name}"`,
      vscode.TreeItemCollapsibleState.Expanded
    );

    headerItem.id = `filemgmt-header-${collection.id}-${mode}`;

    headerItem.iconPath = new vscode.ThemeIcon(
      mode === "add" ? "folder-opened" : "folder"
    );
    headerItem.contextValue = "fileManagementHeader";
    (headerItem as any).isFileManagementHeader = true;

    return headerItem;
  }

  createActionButton(
    label: string,
    icon: string,
    contextValue: string,
    command: string
  ): vscode.TreeItem {
    const item = new vscode.TreeItem(
      label,
      vscode.TreeItemCollapsibleState.None
    );

    item.id = `action-${contextValue}-${this.createHashFromString(label)}`;

    item.iconPath = new vscode.ThemeIcon(icon);
    item.contextValue = contextValue;
    item.command = {
      command,
      title: label,
      arguments: [],
    };
    return item;
  }

  convertFileNodeToItems(
    nodes: FileNode[],
    fileManagementState?: FileManagementState | null,
    searchTerm?: string
  ): vscode.TreeItem[] {
    const items: vscode.TreeItem[] = [];
    let sortedNodes = FileNode.sortNodes(nodes);

    if (searchTerm) {
      sortedNodes = this.filterNodesWithSearch(sortedNodes, searchTerm);
    }

    for (const node of sortedNodes) {
      const item = this.createFileNodeTreeItem(node, fileManagementState);
      items.push(item);
    }

    return items;
  }

  convertFileNodeToTreeItems(
    nodes: FileNode[],
    collection: Collection,
    fileManagementState?: FileManagementState | null,
    searchTerm?: string
  ): vscode.TreeItem[] {
    const items: vscode.TreeItem[] = [];
    let sortedNodes = FileNode.sortNodes(nodes);

    if (searchTerm) {
      sortedNodes = this.filterNodesWithSearch(sortedNodes, searchTerm);
    }

    for (const node of sortedNodes) {
      const item = this.createFileNodeTreeItem(
        node,
        fileManagementState,
        collection.id,
        collection
      );
      (item as any).collectionId = collection.id;
      items.push(item);
    }

    return items;
  }

  createFileNodeTreeItem(
    node: FileNode,
    fileManagementState?: FileManagementState | null,
    collectionId?: string,
    collection?: Collection
  ): vscode.TreeItem {
    const item = new vscode.TreeItem(
      node.name,
      node.isFile
        ? vscode.TreeItemCollapsibleState.None
        : vscode.TreeItemCollapsibleState.Collapsed
    );

    const idContext = collectionId ? `${collectionId}-` : "";
    const mgmtContext =
      fileManagementState?.mode !== "normal"
        ? `-${fileManagementState?.mode}`
        : "";
    item.id = `${idContext}${this.createHashFromString(
      node.path
    )}${mgmtContext}`;

    (item as any).treeNode = node;

    if (node.isFile) {
      this.configureFileTreeItem(item, node, fileManagementState, collection);
    } else {
      this.configureDirectoryTreeItem(item, node, fileManagementState);
    }

    return item;
  }

  private configureFileTreeItem(
    item: vscode.TreeItem,
    node: FileNode,
    fileManagementState?: FileManagementState | null,
    collection?: Collection
  ): void {
    const isInFileManagement =
      fileManagementState?.mode !== "normal" && fileManagementState?.mode;

    if (isInFileManagement && fileManagementState) {
      const isSelected = fileManagementState.selectedFiles.has(node.path);
      const mode = fileManagementState.mode;

      if (isSelected) {
        item.iconPath = new vscode.ThemeIcon(
          "check",
          new vscode.ThemeColor("testing.iconPassed")
        );

        if (mode === "add") {
          const isExistingFile =
            collection && collection.hasFile(node.uri || "");
          if (isExistingFile) {
            item.description = "✓ Will remain in collection";
          } else {
            item.description = "✓ Will be added";
          }
        } else {
          item.description = "✓ Will be REMOVED from collection";
        }
      } else {
        if (node.uri) {
          item.resourceUri = vscode.Uri.parse(node.uri);
        } else {
          item.iconPath = new vscode.ThemeIcon("file");
        }

        if (mode === "add") {
          const isExistingFile =
            collection && collection.hasFile(node.uri || "");
          if (isExistingFile) {
            item.description = "Will be removed (uncheck to remove)";
          } else {
            item.description = "Click to add to collection";
          }
        } else {
          item.description = "Will stay in collection (click to remove)";
        }
      }

      item.contextValue = "fileManagementFile";
      item.command = {
        command: "orbit-ai.collection.toggleFileSelection",
        title: "Toggle Selection",
        arguments: [node.path],
      };

      const relativePath = this.getRelativePathForDisplay(node, collection);
      let tooltipContent = `**${node.name}**\n\nPath: ${relativePath}\n\n`;

      if (mode === "add") {
        const isExistingFile = collection && collection.hasFile(node.uri || "");

        if (isSelected) {
          if (isExistingFile) {
            tooltipContent += `**Status:** Will remain in collection ✓\n\n*This file is currently in the collection and will stay*\n\n*Click to remove from collection*`;
          } else {
            tooltipContent += `**Status:** Will be added to collection ✓\n\n*This file will be added*\n\n*Click to exclude*`;
          }
        } else {
          if (isExistingFile) {
            tooltipContent += `**Status:** Will be REMOVED from collection ⚠️\n\n*This file is in the collection but not selected*\n\n*Click to keep in collection*`;
          } else {
            tooltipContent += `**Status:** Not selected\n\n*Click to add to collection*`;
          }
        }
      } else {
        if (isSelected) {
          tooltipContent += `**Status:** SELECTED FOR REMOVAL ⚠️\n\n*This file will be removed from the collection*\n\n*Click to cancel removal*`;
        } else {
          tooltipContent += `**Status:** Will stay in collection ✓\n\n*This file will remain in the collection*\n\n*Click to mark for removal*`;
        }
      }

      item.tooltip = new vscode.MarkdownString(tooltipContent);
    } else {
      item.label = node.name;

      if (node.uri) {
        const uri = vscode.Uri.parse(node.uri);
        item.resourceUri = uri;
        item.command = {
          command: "vscode.open",
          title: "Open File",
          arguments: [uri],
        };
      }
      item.contextValue = "file";

      const relativePath = this.getRelativePathForDisplay(node, collection);
      item.tooltip = new vscode.MarkdownString(
        `**${node.name}**\n\nPath: ${relativePath}`
      );
    }
  }

  private configureDirectoryTreeItem(
    item: vscode.TreeItem,
    node: FileNode,
    fileManagementState?: FileManagementState | null
  ): void {
    const fileCount = node.getFileCount();
    const isInFileManagement =
      fileManagementState?.mode !== "normal" && fileManagementState?.mode;

    if (node.uri) {
      try {
        const uri = vscode.Uri.parse(node.uri);
        item.resourceUri = uri;
      } catch (error) {
        console.warn(`Failed to parse directory URI: ${node.uri}`, error);
        item.iconPath = new vscode.ThemeIcon("folder");
      }
    } else {
      const currentWorkspace = vscode.workspace.workspaceFolders?.[0];
      if (currentWorkspace && node.path) {
        try {
          const fullPath = path.join(currentWorkspace.uri.fsPath, node.path);
          const uri = vscode.Uri.file(fullPath);
          item.resourceUri = uri;
        } catch (error) {
          console.warn(
            `Failed to generate URI for directory: ${node.path}`,
            error
          );
          item.iconPath = new vscode.ThemeIcon("folder");
        }
      } else {
        item.iconPath = new vscode.ThemeIcon(
          fileCount > 0 ? "folder-opened" : "folder"
        );
      }
    }

    item.contextValue = isInFileManagement
      ? "fileManagementDirectory"
      : "directory";

    if (fileCount > 0) {
      item.description = `${fileCount} file${fileCount > 1 ? "s" : ""}`;
    }

    item.tooltip = new vscode.MarkdownString(
      `**${node.name}/**\n\nContains: ${fileCount} file(s)`
    );
  }

  private getRelativePathForDisplay(
    node: FileNode,
    collection?: Collection
  ): string {
    if (node.uri) {
      try {
        const uri = vscode.Uri.parse(node.uri);

        const currentWorkspaceFolders = vscode.workspace.workspaceFolders;
        if (currentWorkspaceFolders && currentWorkspaceFolders.length > 0) {
          const relativePath = vscode.workspace.asRelativePath(uri, false);

          if (
            !relativePath.startsWith("..") &&
            !path.isAbsolute(relativePath)
          ) {
            return relativePath.replace(/\\/g, "/");
          }
        }

        if (collection?.workspaceFolder) {
          try {
            const collectionWorkspaceUri = vscode.Uri.file(
              collection.workspaceFolder
            );
            const relativePath = path.relative(
              collectionWorkspaceUri.fsPath,
              uri.fsPath
            );

            if (!relativePath.startsWith("..")) {
              return relativePath.replace(/\\/g, "/");
            }
          } catch {
            // Fall through
          }
        }

        return path.basename(uri.fsPath);
      } catch (error) {
        console.warn(`Failed to get relative path for ${node.uri}`, error);
      }
    }

    return node.path;
  }

  private getWorkspaceDisplayInfo(
    collection: Collection,
    isCurrentWorkspace: boolean
  ): string {
    if (!collection.workspaceFolder) {
      return "Workspace: None (Legacy collection)";
    }

    const workspaceName = path.basename(collection.workspaceFolder);

    if (isCurrentWorkspace) {
      return `Workspace: ${workspaceName} (Current)`;
    } else {
      return `Workspace: ${workspaceName} (Different)`;
    }
  }

  private isCollectionInCurrentWorkspace(collection: Collection): boolean {
    const currentWorkspace =
      this.collectionTreeService.getCurrentWorkspaceFolder();

    if (!currentWorkspace) {
      return !collection.workspaceFolder;
    }

    if (!collection.workspaceFolder) {
      return true;
    }

    return collection.workspaceFolder === currentWorkspace;
  }

  private filterNodesWithSearch(
    nodes: FileNode[],
    searchTerm: string
  ): FileNode[] {
    const filtered: FileNode[] = [];
    const lowerSearchTerm = searchTerm.toLowerCase();

    for (const node of nodes) {
      if (node.isFile) {
        if (node.name.toLowerCase().includes(lowerSearchTerm)) {
          filtered.push(node);
        }
      } else {
        const hasMatchingName = node.name
          .toLowerCase()
          .includes(lowerSearchTerm);
        const filteredChildren = this.filterNodesWithSearch(
          node.getChildrenArray(),
          searchTerm
        );

        if (hasMatchingName || filteredChildren.length > 0) {
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
  }

  private createHashFromString(input: string): string {
    return crypto.createHash("md5").update(input).digest("hex").substring(0, 8);
  }

  createSearchHeaderItem(
    searchTerm: string,
    resultCount: number
  ): vscode.TreeItem {
    const searchItem = new vscode.TreeItem(
      `Search: "${searchTerm}" (${resultCount} results)`,
      vscode.TreeItemCollapsibleState.None
    );

    searchItem.id = `search-header-${Date.now()}`;
    searchItem.iconPath = new vscode.ThemeIcon("search");
    searchItem.contextValue = "searchHeader";
    searchItem.tooltip = new vscode.MarkdownString(
      `**Search Results**\n\nSearch term: "${searchTerm}"\nFound: ${resultCount} files/directories`
    );

    return searchItem;
  }

  createClearSearchButton(): vscode.TreeItem {
    const item = new vscode.TreeItem(
      "Clear Search",
      vscode.TreeItemCollapsibleState.None
    );

    item.id = `action-clear-search-${Date.now()}`;
    item.iconPath = new vscode.ThemeIcon("clear-all");
    item.contextValue = "clearSearch";
    item.command = {
      command: "orbit-ai.collection.clearSearch",
      title: "Clear Search",
      arguments: [],
    };

    return item;
  }
}
