// src/domain/collection/services/CollectionService.ts
import { Collection } from "../entities/Collection";
import { CollectionValidator } from "../validators/CollectionValidator";

export interface ICollectionRepository {
  findAll(): Collection[];
  findById(id: string): Collection | undefined;
  findByName(name: string): Collection | undefined;
  findByWorkspace(workspacePath: string): Collection[];
  save(collection: Collection): void;
  delete(id: string): boolean;
  exists(id: string): boolean;
}

export class CollectionService {
  constructor(
    private readonly collectionRepository: ICollectionRepository,
    private readonly validator: CollectionValidator
  ) {}

  createCollection(name: string, workspaceFolder?: string): Collection {
    this.validator.validateCollectionName(name);

    const existingCollection = this.findCollectionByNameInWorkspace(
      name,
      workspaceFolder
    );
    if (existingCollection) {
      throw new Error(`Collection "${name}" already exists in this workspace`);
    }

    const collection = Collection.create(name, workspaceFolder);
    this.collectionRepository.save(collection);

    return collection;
  }

  renameCollection(collectionId: string, newName: string): Collection {
    this.validator.validateCollectionName(newName);

    const collection = this.collectionRepository.findById(collectionId);
    if (!collection) {
      throw new Error(`Collection not found: ${collectionId}`);
    }

    const conflictingCollection = this.findCollectionByNameInWorkspace(
      newName,
      collection.workspaceFolder
    );
    if (conflictingCollection && conflictingCollection.id !== collectionId) {
      throw new Error(
        `Collection "${newName}" already exists in this workspace`
      );
    }

    collection.rename(newName);
    this.collectionRepository.save(collection);

    return collection;
  }

  deleteCollection(collectionId: string): boolean {
    if (!this.collectionRepository.exists(collectionId)) {
      throw new Error(`Collection not found: ${collectionId}`);
    }

    return this.collectionRepository.delete(collectionId);
  }

  getAllCollections(): Collection[] {
    return this.collectionRepository.findAll();
  }

  getCollectionById(collectionId: string): Collection {
    const collection = this.collectionRepository.findById(collectionId);
    if (!collection) {
      throw new Error(`Collection not found: ${collectionId}`);
    }
    return collection;
  }

  getCollectionsForWorkspace(workspacePath?: string): Collection[] {
    if (!workspacePath) {
      return this.collectionRepository
        .findAll()
        .filter((c) => !c.workspaceFolder);
    }

    return this.collectionRepository.findByWorkspace(workspacePath);
  }

  addFileToCollection(collectionId: string, fileUri: string): void {
    const collection = this.getCollectionById(collectionId);

    this.validator.validateFileUri(fileUri);

    const added = collection.addFile(fileUri);
    if (added) {
      this.collectionRepository.save(collection);
    }
  }

  addFilesToCollection(collectionId: string, fileUris: string[]): number {
    const collection = this.getCollectionById(collectionId);

    fileUris.forEach((uri) => this.validator.validateFileUri(uri));

    const addedCount = collection.addFiles(fileUris);
    if (addedCount > 0) {
      this.collectionRepository.save(collection);
    }

    return addedCount;
  }

  removeFileFromCollection(collectionId: string, fileUri: string): boolean {
    const collection = this.getCollectionById(collectionId);

    const removed = collection.removeFile(fileUri);
    if (removed) {
      this.collectionRepository.save(collection);
    }

    return removed;
  }

  removeFilesFromCollection(collectionId: string, fileUris: string[]): number {
    const collection = this.getCollectionById(collectionId);

    const removedCount = collection.removeFiles(fileUris);
    if (removedCount > 0) {
      this.collectionRepository.save(collection);
    }

    return removedCount;
  }

  private findCollectionByNameInWorkspace(
    name: string,
    workspacePath?: string
  ): Collection | undefined {
    const workspaceCollections = this.getCollectionsForWorkspace(workspacePath);
    return workspaceCollections.find((c) => c.name === name);
  }
}
