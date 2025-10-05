// src/domain/collection/services/FileService.ts
export interface IFileSystemService {
  readFile(uri: string): Promise<string>;
  writeFile(uri: string, content: string): Promise<void>;
  deleteFile(uri: string): Promise<void>;
  moveFile(sourceUri: string, targetUri: string): Promise<void>;
  copyFile(sourceUri: string, targetUri: string): Promise<void>;
  exists(uri: string): Promise<boolean>;
  isFile(uri: string): Promise<boolean>;
  isDirectory(uri: string): Promise<boolean>;
  getFileStats(uri: string): Promise<{ size: number; lastModified: Date }>;
}

export class FileService {
  constructor(private readonly fileSystem: IFileSystemService) {}

  async readFileContent(fileUri: string): Promise<string> {
    if (!(await this.fileSystem.exists(fileUri))) {
      throw new Error(`File not found: ${fileUri}`);
    }

    if (!(await this.fileSystem.isFile(fileUri))) {
      throw new Error(`Path is not a file: ${fileUri}`);
    }

    return this.fileSystem.readFile(fileUri);
  }

  async validateFileUri(fileUri: string): Promise<boolean> {
    try {
      return (
        (await this.fileSystem.exists(fileUri)) &&
        (await this.fileSystem.isFile(fileUri))
      );
    } catch {
      return false;
    }
  }

  async validateFileUris(fileUris: string[]): Promise<string[]> {
    const validUris: string[] = [];

    for (const uri of fileUris) {
      if (await this.validateFileUri(uri)) {
        validUris.push(uri);
      }
    }

    return validUris;
  }
}
