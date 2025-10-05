// src/application/collection/usecases/RemoveFileFromCollectionUseCase.ts
import { Collection } from "../../../domain/collection/entities/Collection";
import { CollectionService } from "../../../domain/collection/services/CollectionService";

export interface RemoveFileFromCollectionRequest {
  collectionId: string;
  fileUris: string[];
}

export interface RemoveFileFromCollectionResponse {
  collection: Collection;
  removedCount: number;
  notFoundCount: number;
}

export class RemoveFileFromCollectionUseCase {
  constructor(private readonly collectionService: CollectionService) {}

  async execute(
    request: RemoveFileFromCollectionRequest
  ): Promise<RemoveFileFromCollectionResponse> {
    const collection = this.collectionService.getCollectionById(
      request.collectionId
    );

    const removedCount = this.collectionService.removeFilesFromCollection(
      request.collectionId,
      request.fileUris
    );
    const notFoundCount = request.fileUris.length - removedCount;

    return {
      collection: this.collectionService.getCollectionById(
        request.collectionId
      ),
      removedCount,
      notFoundCount,
    };
  }
}
