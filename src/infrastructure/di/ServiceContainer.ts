// src/infrastructure/di/ServiceContainer.ts
import * as vscode from "vscode";

// Domain Services
import {
  CollectionService,
  ICollectionRepository,
} from "../../domain/collection/services/CollectionService";
import {
  FileService,
  IFileSystemService,
} from "../../domain/collection/services/FileService";
import {
  TreeService,
  IPathService,
} from "../../domain/collection/services/TreeService";
import { CollectionValidator } from "../../domain/collection/validators/CollectionValidator";

// Infrastructure Services
import { FileSystemCollectionStorage } from "../collection/storage/FileSystemCollectionStorage";
import { VSCodeFileSystemService } from "../collection/filesystem/FileSystemService";
import {
  VSCodeWorkspaceService,
  IWorkspaceService,
} from "../collection/workspace/WorkspaceService";
import { VSCodeNotificationService } from "../collection/ui/NotificationService";
import { VSCodeUIRefreshService } from "../collection/ui/UIRefreshService";
import { NodePathService } from "../shared/PathService";

// Application Services
import { CreateCollectionUseCase } from "../../application/collection/usecases/CreateCollectionUseCase";
import { DeleteCollectionUseCase } from "../../application/collection/usecases/DeleteCollectionUseCase";
import { RenameCollectionUseCase } from "../../application/collection/usecases/RenameCollectionUseCase";
import { AddFileToCollectionUseCase } from "../../application/collection/usecases/AddFileToCollectionUseCase";
import { RemoveFileFromCollectionUseCase } from "../../application/collection/usecases/RemoveFileFromCollectionUseCase";
import {
  CollectionApplicationService,
  INotificationService,
  IUIRefreshService,
} from "../../application/collection/service/CollectionApplicationService";

// Types
import { Collection } from "../../domain/collection/entities/Collection";
import { FileNode } from "../../domain/collection/entities/FileNode";

export interface ICollectionTreeService {
  getAllCollections(): Collection[];
  getCollectionsForWorkspace(workspacePath?: string): Collection[];
  getCollectionById(id: string): Collection;
  buildFileTreeForCollection(collectionId: string): FileNode[];
  getCurrentWorkspaceFolder(): string | undefined;
}

export class ServiceContainer {
  private static instance: ServiceContainer;
  private services = new Map<string, any>();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  initialize(context: vscode.ExtensionContext): void {
    if (this.isInitialized) {
      return;
    }

    this.registerInfrastructureServices(context);
    this.registerDomainServices();
    this.registerApplicationServices();
    this.registerTreeService();

    this.isInitialized = true;
  }

  private registerInfrastructureServices(
    context: vscode.ExtensionContext
  ): void {
    // Storage
    const collectionStorage = new FileSystemCollectionStorage(context);
    this.register<ICollectionRepository>(
      "ICollectionRepository",
      collectionStorage
    );

    // File System
    const fileSystemService = new VSCodeFileSystemService();
    this.register<IFileSystemService>("IFileSystemService", fileSystemService);

    // Path Service
    const pathService = new NodePathService();
    this.register<IPathService>("IPathService", pathService);

    // Workspace Service
    const workspaceService = new VSCodeWorkspaceService();
    this.register<IWorkspaceService>("IWorkspaceService", workspaceService);

    // UI Services
    const notificationService = new VSCodeNotificationService();
    this.register<INotificationService>(
      "INotificationService",
      notificationService
    );
  }

  private registerDomainServices(): void {
    const collectionRepository = this.resolve<ICollectionRepository>(
      "ICollectionRepository"
    );
    const fileSystemService =
      this.resolve<IFileSystemService>("IFileSystemService");
    const pathService = this.resolve<IPathService>("IPathService");

    const collectionValidator = new CollectionValidator();
    this.register("CollectionValidator", collectionValidator);

    const collectionService = new CollectionService(
      collectionRepository,
      collectionValidator
    );
    this.register("CollectionService", collectionService);

    const fileService = new FileService(fileSystemService);
    this.register("FileService", fileService);

    const treeService = new TreeService(pathService);
    this.register("TreeService", treeService);
  }

  private registerApplicationServices(): void {
    const collectionService =
      this.resolve<CollectionService>("CollectionService");
    const fileService = this.resolve<FileService>("FileService");

    const createCollectionUseCase = new CreateCollectionUseCase(
      collectionService
    );
    this.register("CreateCollectionUseCase", createCollectionUseCase);

    const deleteCollectionUseCase = new DeleteCollectionUseCase(
      collectionService
    );
    this.register("DeleteCollectionUseCase", deleteCollectionUseCase);

    const renameCollectionUseCase = new RenameCollectionUseCase(
      collectionService
    );
    this.register("RenameCollectionUseCase", renameCollectionUseCase);

    const addFileToCollectionUseCase = new AddFileToCollectionUseCase(
      collectionService,
      fileService
    );
    this.register("AddFileToCollectionUseCase", addFileToCollectionUseCase);

    const removeFileFromCollectionUseCase = new RemoveFileFromCollectionUseCase(
      collectionService
    );
    this.register(
      "RemoveFileFromCollectionUseCase",
      removeFileFromCollectionUseCase
    );
  }

  private registerTreeService(): void {
    const collectionTreeService = this.createCollectionTreeService();
    this.register<ICollectionTreeService>(
      "ICollectionTreeService",
      collectionTreeService
    );
  }

  registerUIServices(treeDataProvider: any): void {
    const uiRefreshService = new VSCodeUIRefreshService(treeDataProvider);
    this.register<IUIRefreshService>("IUIRefreshService", uiRefreshService);

    const collectionApplicationService = new CollectionApplicationService(
      this.resolve("CreateCollectionUseCase"),
      this.resolve("DeleteCollectionUseCase"),
      this.resolve("RenameCollectionUseCase"),
      this.resolve("AddFileToCollectionUseCase"),
      this.resolve("RemoveFileFromCollectionUseCase"),
      this.resolve<INotificationService>("INotificationService"),
      uiRefreshService
    );
    this.register("CollectionApplicationService", collectionApplicationService);

    this.register("CollectionProvider", treeDataProvider);
  }

  private createCollectionTreeService(): ICollectionTreeService {
    const collectionService =
      this.resolve<CollectionService>("CollectionService");
    const treeService = this.resolve<TreeService>("TreeService");
    const workspaceService =
      this.resolve<IWorkspaceService>("IWorkspaceService");

    return {
      getAllCollections(): Collection[] {
        return collectionService.getAllCollections();
      },

      getCollectionsForWorkspace(workspacePath?: string): Collection[] {
        return collectionService.getCollectionsForWorkspace(workspacePath);
      },

      getCollectionById(id: string): Collection {
        return collectionService.getCollectionById(id);
      },

      buildFileTreeForCollection(collectionId: string): FileNode[] {
        const collection = collectionService.getCollectionById(collectionId);
        const validFiles = collection.files.filter((fileUri) => {
          try {
            const uri = new URL(fileUri);
            return uri.protocol === "file:";
          } catch {
            return false;
          }
        });
        return treeService.buildFileTree(validFiles);
      },

      getCurrentWorkspaceFolder(): string | undefined {
        return workspaceService.getCurrentWorkspaceFolder();
      },
    };
  }

  register<T>(key: string, service: T): void {
    if (this.services.has(key)) {
      console.warn(`Service already registered: ${key}`);
      return;
    }
    this.services.set(key, service);
  }

  resolve<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service not registered: ${key}`);
    }
    return service;
  }

  dispose(): void {
    const collectionStorage = this.services.get("ICollectionRepository");
    if (collectionStorage && typeof collectionStorage.dispose === "function") {
      collectionStorage.dispose();
    }

    this.services.clear();
    this.isInitialized = false;
  }
}
