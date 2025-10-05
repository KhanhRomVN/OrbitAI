// src/application/collection/usecases/RenameCollectionUseCase.ts
import { Collection } from "../../../domain/collection/entities/Collection";
import { CollectionService } from "../../../domain/collection/services/CollectionService";

export interface RenameCollectionRequest {
  collectionId: string;
  newName: string;
}

export interface RenameCollectionResponse {
  collection: Collection;
  oldName: string;
}

export class RenameCollectionUseCase {
  constructor(private readonly collectionService: CollectionService) {}

  async execute(
    request: RenameCollectionRequest
  ): Promise<RenameCollectionResponse> {
    const collection = this.collectionService.getCollectionById(
      request.collectionId
    );
    const oldName = collection.name;

    const updatedCollection = this.collectionService.renameCollection(
      request.collectionId,
      request.newName
    );

    return {
      collection: updatedCollection,
      oldName,
    };
  }
}
