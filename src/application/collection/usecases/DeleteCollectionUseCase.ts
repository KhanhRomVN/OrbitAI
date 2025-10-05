// src/application/collection/usecases/DeleteCollectionUseCase.ts
import { CollectionService } from "../../../domain/collection/services/CollectionService";

export interface DeleteCollectionRequest {
  collectionId: string;
  confirmDelete: boolean;
}

export interface DeleteCollectionResponse {
  success: boolean;
  deletedCollectionName: string;
}

export class DeleteCollectionUseCase {
  constructor(private readonly collectionService: CollectionService) {}

  async execute(
    request: DeleteCollectionRequest
  ): Promise<DeleteCollectionResponse> {
    if (!request.confirmDelete) {
      throw new Error("Delete operation must be confirmed");
    }

    const collection = this.collectionService.getCollectionById(
      request.collectionId
    );
    const collectionName = collection.name;

    const success = this.collectionService.deleteCollection(
      request.collectionId
    );

    return {
      success,
      deletedCollectionName: collectionName,
    };
  }
}
