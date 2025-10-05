// src/infrastructure/collection/storage/FileSystemCollectionStorage.ts
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Collection } from "../../../domain/collection/entities/Collection";
import { ICollectionRepository } from "../../../domain/collection/services/CollectionService";

export class FileSystemCollectionStorage implements ICollectionRepository {
  private collections: Collection[] = [];
  private readonly storageFilePath: string;
  private fileWatcher: vscode.FileSystemWatcher | undefined;
  private lastSaveTimestamp: number = 0;
  private isInternalUpdate: boolean = false;

  constructor(private readonly context: vscode.ExtensionContext) {
    const globalStoragePath = context.globalStorageUri.fsPath;

    if (!fs.existsSync(globalStoragePath)) {
      fs.mkdirSync(globalStoragePath, { recursive: true });
    }

    this.storageFilePath = path.join(globalStoragePath, "collections.json");
    this.loadFromFileSystem();
    this.setupFileWatcher();
  }

  findAll(): Collection[] {
    this.loadFromFileSystemIfNeeded();
    return [...this.collections];
  }

  findById(id: string): Collection | undefined {
    this.loadFromFileSystemIfNeeded();
    return this.collections.find((c) => c.id === id);
  }

  findByName(name: string): Collection | undefined {
    this.loadFromFileSystemIfNeeded();
    return this.collections.find((c) => c.name === name);
  }

  findByWorkspace(workspacePath: string): Collection[] {
    this.loadFromFileSystemIfNeeded();
    return this.collections.filter((c) => c.workspaceFolder === workspacePath);
  }

  save(collection: Collection): void {
    this.loadFromFileSystemIfNeeded();
    const index = this.collections.findIndex((c) => c.id === collection.id);

    if (index >= 0) {
      this.collections[index] = collection;
    } else {
      this.collections.push(collection);
    }

    this.saveToFileSystem();
  }

  delete(id: string): boolean {
    this.loadFromFileSystemIfNeeded();
    const index = this.collections.findIndex((c) => c.id === id);

    if (index >= 0) {
      this.collections.splice(index, 1);
      this.saveToFileSystem();
      return true;
    }

    return false;
  }

  exists(id: string): boolean {
    this.loadFromFileSystemIfNeeded();
    return this.collections.some((c) => c.id === id);
  }

  private loadFromFileSystem(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const fileContent = fs.readFileSync(this.storageFilePath, "utf8");
        const storedData = JSON.parse(fileContent);

        if (Array.isArray(storedData)) {
          this.collections = storedData.map((data) =>
            Collection.fromData(data)
          );
        } else {
          this.collections = [];
        }
      } else {
        this.collections = [];
      }
    } catch (error) {
      console.error("Failed to load collections from file system", error);
      this.collections = [];
      this.migrateFromGlobalState();
    }
  }

  private loadFromFileSystemIfNeeded(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const stats = fs.statSync(this.storageFilePath);
        const fileTimestamp = stats.mtime.getTime();

        if (fileTimestamp > this.lastSaveTimestamp) {
          this.loadFromFileSystem();
        }
      }
    } catch (error) {
      console.warn("Failed to check file timestamp, forcing reload", error);
      this.loadFromFileSystem();
    }
  }

  private saveToFileSystem(): void {
    try {
      this.isInternalUpdate = true;
      const data = this.collections.map((c) => c.toData());
      fs.writeFileSync(
        this.storageFilePath,
        JSON.stringify(data, null, 2),
        "utf8"
      );
      this.lastSaveTimestamp = Date.now();
    } catch (error) {
      console.error("Failed to save collections to file system", error);
    } finally {
      setTimeout(() => {
        this.isInternalUpdate = false;
      }, 100);
    }
  }

  private setupFileWatcher(): void {
    try {
      this.fileWatcher = vscode.workspace.createFileSystemWatcher(
        this.storageFilePath
      );

      this.fileWatcher.onDidChange(() => {
        if (this.isInternalUpdate) return;
        this.loadFromFileSystem();
        vscode.commands.executeCommand("orbit-ai-collections.refresh");
      });

      this.fileWatcher.onDidCreate(() => {
        if (this.isInternalUpdate) return;
        this.loadFromFileSystem();
        vscode.commands.executeCommand("orbit-ai-collections.refresh");
      });

      this.fileWatcher.onDidDelete(() => {
        if (this.isInternalUpdate) return;
        this.collections = [];
        vscode.commands.executeCommand("orbit-ai-collections.refresh");
      });
    } catch (error) {
      console.error("Failed to setup file watcher", error);
    }
  }

  private migrateFromGlobalState(): void {
    try {
      const stored = this.context.globalState.get<any[]>("collections", []);

      if (stored.length > 0) {
        this.collections = stored.map((data) => Collection.fromData(data));
        this.saveToFileSystem();
        this.context.globalState.update("collections", undefined);
      }
    } catch (error) {
      console.error("Failed to migrate from globalState", error);
    }
  }

  dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }
  }
}
