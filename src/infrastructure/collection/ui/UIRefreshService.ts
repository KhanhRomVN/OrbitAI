// src/infrastructure/collection/ui/UIRefreshService.ts
import * as vscode from "vscode";
import { IUIRefreshService } from "../../../application/collection/service/CollectionApplicationService";

export class VSCodeUIRefreshService implements IUIRefreshService {
  constructor(private readonly treeDataProvider: any) {}

  refreshCollectionTree(): void {
    this.treeDataProvider.refresh();
  }

  exitFileManagementMode(): void {
    if (this.treeDataProvider.isInFileManagementMode()) {
      this.treeDataProvider.exitFileManagementMode();
    }
  }
}
