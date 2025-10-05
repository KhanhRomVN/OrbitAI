export interface CollectionProps {
  id: string;
  name: string;
  files: string[]; // Array of file URIs
  folders: string[]; // Array of folder paths
  workspaceFolder?: string; // Workspace path (optional for legacy collections)
  createdAt: Date;
  updatedAt: Date;
}

export class Collection {
  private readonly _id: string;
  private _name: string;
  private _files: string[];
  private _folders: string[];
  private readonly _workspaceFolder?: string;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: CollectionProps) {
    this._id = props.id;
    this._name = props.name;
    this._files = [...props.files];
    this._folders = [...props.folders];
    this._workspaceFolder = props.workspaceFolder;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  // Getters
  get id(): string {
    return this._id;
  }
  get name(): string {
    return this._name;
  }
  get files(): readonly string[] {
    return this._files;
  }
  get folders(): readonly string[] {
    return this._folders;
  }
  get workspaceFolder(): string | undefined {
    return this._workspaceFolder;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get fileCount(): number {
    return this._files.length;
  }
  get folderCount(): number {
    return this._folders.length;
  }

  // Business methods
  rename(newName: string): void {
    if (!newName.trim()) {
      throw new Error("Collection name cannot be empty");
    }
    this._name = newName.trim();
    this._updatedAt = new Date();
  }

  addFile(fileUri: string): boolean {
    if (this._files.includes(fileUri)) {
      return false;
    }
    this._files.push(fileUri);
    this._updatedAt = new Date();
    return true;
  }

  removeFile(fileUri: string): boolean {
    const index = this._files.indexOf(fileUri);
    if (index === -1) {
      return false;
    }
    this._files.splice(index, 1);
    this._updatedAt = new Date();
    return true;
  }

  addFiles(fileUris: string[]): number {
    let addedCount = 0;
    for (const uri of fileUris) {
      if (this.addFile(uri)) {
        addedCount++;
      }
    }
    return addedCount;
  }

  removeFiles(fileUris: string[]): number {
    let removedCount = 0;
    for (const uri of fileUris) {
      if (this.removeFile(uri)) {
        removedCount++;
      }
    }
    return removedCount;
  }

  hasFile(fileUri: string): boolean {
    return this._files.includes(fileUri);
  }

  // Factory method
  static create(name: string, workspaceFolder?: string): Collection {
    const now = new Date();
    return new Collection({
      id: Date.now().toString(),
      name: name.trim(),
      files: [],
      folders: [],
      workspaceFolder,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromData(data: any): Collection {
    return new Collection({
      id: data.id,
      name: data.name,
      files: data.files || [],
      folders: data.folders || [],
      workspaceFolder: data.workspaceFolder,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    });
  }

  toData(): CollectionProps {
    return {
      id: this._id,
      name: this._name,
      files: [...this._files],
      folders: [...this._folders],
      workspaceFolder: this._workspaceFolder,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
