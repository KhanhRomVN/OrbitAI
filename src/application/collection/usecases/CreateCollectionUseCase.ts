// src/application/collection/usecases/CreateCollectionUseCase.ts
import { Collection } from "../../../domain/collection/entities/Collection";
import { CollectionService } from "../../../domain/collection/services/CollectionService";

export interface CreateCollectionRequest {
  name: string;
  workspaceFolder?: string;
  includeOpenFiles?: boolean;
  openFileUris?: string[];
}

export interface CreateCollectionResponse {
  collection: Collection;
  addedFilesCount: number;
}

export class CreateCollectionUseCase {
  constructor(private readonly collectionService: CollectionService) {}

  async execute(
    request: CreateCollectionRequest
  ): Promise<CreateCollectionResponse> {
    const collection = this.collectionService.createCollection(
      request.name,
      request.workspaceFolder
    );

    let addedFilesCount = 0;

    if (
      request.includeOpenFiles &&
      request.openFileUris &&
      request.openFileUris.length > 0
    ) {
      addedFilesCount = this.collectionService.addFilesToCollection(
        collection.id,
        request.openFileUris
      );
    }

    return {
      collection,
      addedFilesCount,
    };
  }
}
