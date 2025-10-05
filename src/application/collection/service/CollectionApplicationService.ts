// src/application/collection/service/CollectionApplicationService.ts
import {
  CreateCollectionUseCase,
  CreateCollectionRequest,
} from "../usecases/CreateCollectionUseCase";
import {
  DeleteCollectionUseCase,
  DeleteCollectionRequest,
} from "../usecases/DeleteCollectionUseCase";
import {
  RenameCollectionUseCase,
  RenameCollectionRequest,
} from "../usecases/RenameCollectionUseCase";
import {
  AddFileToCollectionUseCase,
  AddFileToCollectionRequest,
} from "../usecases/AddFileToCollectionUseCase";
import {
  RemoveFileFromCollectionUseCase,
  RemoveFileFromCollectionRequest,
} from "../usecases/RemoveFileFromCollectionUseCase";

export interface INotificationService {
  showInfo(message: string): void;
  showWarning(message: string): void;
  showError(message: string): void;
  showSuccess(message: string): void;
  showConfirmDialog(
    message: string,
    ...items: string[]
  ): Promise<string | undefined>;
}

export interface IUIRefreshService {
  refreshCollectionTree(): void;
  exitFileManagementMode(): void;
}

export class CollectionApplicationService {
  constructor(
    private readonly createCollectionUseCase: CreateCollectionUseCase,
    private readonly deleteCollectionUseCase: DeleteCollectionUseCase,
    private readonly renameCollectionUseCase: RenameCollectionUseCase,
    private readonly addFileToCollectionUseCase: AddFileToCollectionUseCase,
    private readonly removeFileFromCollectionUseCase: RemoveFileFromCollectionUseCase,
    private readonly notificationService: INotificationService,
    private readonly uiRefreshService: IUIRefreshService
  ) {}

  async handleCreateCollection(
    request: CreateCollectionRequest
  ): Promise<void> {
    try {
      const response = await this.createCollectionUseCase.execute(request);

      this.uiRefreshService.refreshCollectionTree();

      const fileInfo =
        response.addedFilesCount > 0
          ? ` with ${response.addedFilesCount} files`
          : "";

      this.notificationService.showSuccess(
        `Collection "${response.collection.name}" created${fileInfo}`
      );

      // 🆕 THÊM: Cập nhật webview collections list
      const provider = (global as any).webviewProvider;
      const collectionService = (global as any).collectionService;
      if (provider && provider.updateCollectionsList && collectionService) {
        setTimeout(() => {
          provider.updateCollectionsList(collectionService.getAllCollections());
        }, 200);
      }
    } catch (error) {
      this.notificationService.showError(
        `Failed to create collection: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async handleDeleteCollection(
    request: DeleteCollectionRequest
  ): Promise<void> {
    try {
      const response = await this.deleteCollectionUseCase.execute(request);

      if (response.success) {
        this.uiRefreshService.refreshCollectionTree();
        this.uiRefreshService.exitFileManagementMode();

        this.notificationService.showSuccess(
          `Collection "${response.deletedCollectionName}" deleted`
        );
      } else {
        this.notificationService.showWarning("Failed to delete collection");
      }
    } catch (error) {
      this.notificationService.showError(
        `Failed to delete collection: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async handleRenameCollection(
    request: RenameCollectionRequest
  ): Promise<void> {
    try {
      const response = await this.renameCollectionUseCase.execute(request);

      this.uiRefreshService.refreshCollectionTree();

      this.notificationService.showSuccess(
        `Collection renamed from "${response.oldName}" to "${response.collection.name}"`
      );
    } catch (error) {
      this.notificationService.showError(
        `Failed to rename collection: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async handleAddFilesToCollection(
    request: AddFileToCollectionRequest
  ): Promise<void> {
    try {
      const response = await this.addFileToCollectionUseCase.execute(request);

      this.uiRefreshService.refreshCollectionTree();

      if (request.mode === "sync") {
        let message = `Updated collection "${response.collection.name}":`;

        const changes = [];
        if (response.addedCount > 0) {
          changes.push(`${response.addedCount} added`);
        }
        if (response.removedCount > 0) {
          changes.push(`${response.removedCount} removed`);
        }
        if (response.skippedCount > 0) {
          changes.push(`${response.skippedCount} kept`);
        }

        if (changes.length > 0) {
          message += ` ${changes.join(", ")}`;
        } else {
          message = `No changes made to collection "${response.collection.name}"`;
        }

        if (response.invalidFiles.length > 0) {
          message += ` (${response.invalidFiles.length} invalid files skipped)`;
        }

        this.notificationService.showSuccess(message);
      } else {
        let message = `Added ${response.addedCount} file(s) to "${response.collection.name}"`;

        if (response.skippedCount > 0) {
          message += ` (${response.skippedCount} already existed)`;
        }

        if (response.invalidFiles.length > 0) {
          message += ` (${response.invalidFiles.length} invalid files skipped)`;
        }

        this.notificationService.showSuccess(message);
      }
    } catch (error) {
      this.notificationService.showError(
        `Failed to add files: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async handleRemoveFilesFromCollection(
    request: RemoveFileFromCollectionRequest
  ): Promise<void> {
    try {
      const response = await this.removeFileFromCollectionUseCase.execute(
        request
      );

      this.uiRefreshService.refreshCollectionTree();

      let message = `Removed ${response.removedCount} file(s) from "${response.collection.name}"`;

      if (response.notFoundCount > 0) {
        message += ` (${response.notFoundCount} files not found in collection)`;
      }

      this.notificationService.showSuccess(message);
    } catch (error) {
      this.notificationService.showError(
        `Failed to remove files: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
