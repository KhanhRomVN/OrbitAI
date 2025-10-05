// src/infrastructure/collection/ui/NotificationService.ts
import * as vscode from "vscode";
import { INotificationService } from "../../../application/collection/service/CollectionApplicationService";

export class VSCodeNotificationService implements INotificationService {
  showInfo(message: string): void {
    vscode.window.showInformationMessage(message);
  }

  showWarning(message: string): void {
    vscode.window.showWarningMessage(message);
  }

  showError(message: string): void {
    vscode.window.showErrorMessage(message);
  }

  showSuccess(message: string): void {
    vscode.window.showInformationMessage(`✓ ${message}`);
  }

  async showConfirmDialog(
    message: string,
    ...items: string[]
  ): Promise<string | undefined> {
    return await vscode.window.showWarningMessage(
      message,
      { modal: true },
      ...items
    );
  }
}
