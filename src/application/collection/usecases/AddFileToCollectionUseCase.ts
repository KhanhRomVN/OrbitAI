// src/application/collection/usecases/AddFileToCollectionUseCase.ts
import { Collection } from "../../../domain/collection/entities/Collection";
import { CollectionService } from "../../../domain/collection/services/CollectionService";
import { FileService } from "../../../domain/collection/services/FileService";

export interface AddFileToCollectionRequest {
  collectionId: string;
  fileUris: string[];
  validateFiles?: boolean;
  mode?: "add" | "sync";
}

export interface AddFileToCollectionResponse {
  collection: Collection;
  addedCount: number;
  removedCount: number;
  skippedCount: number;
  invalidFiles: string[];
}

export class AddFileToCollectionUseCase {
  constructor(
    private readonly collectionService: CollectionService,
    private readonly fileService: FileService
  ) {}

  async execute(
    request: AddFileToCollectionRequest
  ): Promise<AddFileToCollectionResponse> {
    const collection = this.collectionService.getCollectionById(
      request.collectionId
    );
    let fileUrisToProcess = request.fileUris;
    const invalidFiles: string[] = [];

    if (request.validateFiles) {
      const validUris = await this.fileService.validateFileUris(
        request.fileUris
      );
      invalidFiles.push(
        ...request.fileUris.filter((uri) => !validUris.includes(uri))
      );
      fileUrisToProcess = validUris;
    }

    let addedCount = 0;
    let removedCount = 0;
    let skippedCount = 0;

    if (request.mode === "sync") {
      const currentFiles = new Set(collection.files);
      const selectedFiles = new Set(fileUrisToProcess);

      const filesToAdd = fileUrisToProcess.filter(
        (uri) => !currentFiles.has(uri)
      );
      const filesToRemove = Array.from(currentFiles).filter(
        (uri) => !selectedFiles.has(uri)
      );

      addedCount = this.collectionService.addFilesToCollection(
        request.collectionId,
        filesToAdd
      );
      removedCount = this.collectionService.removeFilesFromCollection(
        request.collectionId,
        filesToRemove
      );
      skippedCount = fileUrisToProcess.length - filesToAdd.length;
    } else {
      const initialCount = collection.fileCount;
      addedCount = this.collectionService.addFilesToCollection(
        request.collectionId,
        fileUrisToProcess
      );
      skippedCount = fileUrisToProcess.length - addedCount;
    }

    return {
      collection: this.collectionService.getCollectionById(
        request.collectionId
      ),
      addedCount,
      removedCount,
      skippedCount,
      invalidFiles,
    };
  }
}
