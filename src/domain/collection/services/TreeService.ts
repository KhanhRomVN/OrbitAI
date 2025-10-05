// src/domain/collection/services/TreeService.ts
import { FileNode } from "../entities/FileNode";
import * as vscode from "vscode";
import * as path from "path";

export interface IPathService {
  normalize(path: string): string;
  join(...paths: string[]): string;
  dirname(path: string): string;
  basename(path: string): string;
  extname(path: string): string;
  relative(from: string, to: string): string;
  isAbsolute(path: string): boolean;
}

export class TreeService {
  constructor(private readonly pathService: IPathService) {}

  buildFileTree(fileUris: string[]): FileNode[] {
    const root = new Map<string, FileNode>();

    for (const uri of fileUris) {
      try {
        this.insertFileIntoTree(root, uri);
      } catch (error) {
        console.warn(`Failed to process file: ${uri}`, error);
      }
    }

    return FileNode.sortNodes(Array.from(root.values()));
  }

  private insertFileIntoTree(
    tree: Map<string, FileNode>,
    fileUri: string
  ): void {
    const relativePath = this.getRelativePathFromUri(fileUri);
    const normalizedPath = this.pathService.normalize(relativePath);
    const parts = normalizedPath.split("/").filter((part) => part.length > 0);

    if (parts.length === 0) return;

    let currentLevel = tree;
    let currentPath = "";
    const currentWorkspace = vscode.workspace.workspaceFolders?.[0];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!currentLevel.has(part)) {
        let node: FileNode;

        if (isFile) {
          node = FileNode.createFile(part, currentPath, fileUri);
        } else {
          let directoryUri: string | undefined;
          if (currentWorkspace) {
            const fullPath = path.join(
              currentWorkspace.uri.fsPath,
              currentPath
            );
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
      const workspaceFolders = vscode.workspace.workspaceFolders;

      if (workspaceFolders && workspaceFolders.length > 0) {
        for (const workspaceFolder of workspaceFolders) {
          try {
            const relativePath = path.relative(
              workspaceFolder.uri.fsPath,
              vscodeUri.fsPath
            );

            if (
              !relativePath.startsWith("..") &&
              !path.isAbsolute(relativePath)
            ) {
              return relativePath.replace(/\\/g, "/");
            }
          } catch {
            continue;
          }
        }

        const relativePath = vscode.workspace.asRelativePath(vscodeUri, false);
        if (!path.isAbsolute(relativePath)) {
          return relativePath.replace(/\\/g, "/");
        }
      }

      return vscodeUri.fsPath.replace(/\\/g, "/");
    } catch (error) {
      console.warn(`Failed to parse URI: ${uri}`, error);
      return uri.replace(/^file:\/\//, "").replace(/\\/g, "/");
    }
  }

  filterTree(
    nodes: FileNode[],
    predicate: (node: FileNode) => boolean
  ): FileNode[] {
    const filtered: FileNode[] = [];

    for (const node of nodes) {
      if (predicate(node)) {
        if (node.isFile) {
          filtered.push(node);
        } else {
          const filteredChildren = this.filterTree(
            node.getChildrenArray(),
            predicate
          );
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
    }

    return FileNode.sortNodes(filtered);
  }
}
