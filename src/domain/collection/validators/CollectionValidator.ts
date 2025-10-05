// src/domain/collection/validators/CollectionValidator.ts
export class CollectionValidator {
  private static readonly MIN_NAME_LENGTH = 1;
  private static readonly MAX_NAME_LENGTH = 100;
  private static readonly FORBIDDEN_CHARS = /[<>:"/\\|?*]/;
  private static readonly MAX_FILES_PER_COLLECTION = 10000;

  validateCollectionName(name: string): void {
    if (!name || typeof name !== "string") {
      throw new Error("Collection name is required");
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      throw new Error("Collection name cannot be empty");
    }

    if (trimmedName.length < CollectionValidator.MIN_NAME_LENGTH) {
      throw new Error(
        `Collection name must be at least ${CollectionValidator.MIN_NAME_LENGTH} character(s)`
      );
    }

    if (trimmedName.length > CollectionValidator.MAX_NAME_LENGTH) {
      throw new Error(
        `Collection name cannot exceed ${CollectionValidator.MAX_NAME_LENGTH} characters`
      );
    }

    if (CollectionValidator.FORBIDDEN_CHARS.test(trimmedName)) {
      throw new Error(
        'Collection name contains forbidden characters: < > : " / \\ | ? *'
      );
    }

    const reservedNames = [
      "CON",
      "PRN",
      "AUX",
      "NUL",
      "COM1",
      "COM2",
      "COM3",
      "COM4",
      "COM5",
      "COM6",
      "COM7",
      "COM8",
      "COM9",
      "LPT1",
      "LPT2",
      "LPT3",
      "LPT4",
      "LPT5",
      "LPT6",
      "LPT7",
      "LPT8",
      "LPT9",
    ];

    if (reservedNames.includes(trimmedName.toUpperCase())) {
      throw new Error("Collection name is reserved by the system");
    }
  }

  validateFileUri(fileUri: string): void {
    if (!fileUri || typeof fileUri !== "string") {
      throw new Error("Invalid file URI");
    }

    try {
      const uri = new URL(fileUri);
      if (uri.protocol !== "file:") {
        throw new Error("Invalid file URI protocol");
      }
    } catch {
      throw new Error("Invalid file URI format");
    }
  }

  validateFileUris(fileUris: string[]): void {
    if (!Array.isArray(fileUris)) {
      throw new Error("File URIs must be an array");
    }

    fileUris.forEach((uri) => this.validateFileUri(uri));
  }

  validateCollectionFileCount(currentCount: number, addingCount: number): void {
    const newCount = currentCount + addingCount;

    if (newCount > CollectionValidator.MAX_FILES_PER_COLLECTION) {
      throw new Error(
        `Collection would exceed maximum file limit of ${CollectionValidator.MAX_FILES_PER_COLLECTION} files`
      );
    }
  }
}
