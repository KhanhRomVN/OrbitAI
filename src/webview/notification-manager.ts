// src/webview/notification-manager.ts
import * as vscode from "vscode";

export class NotificationManager {
  private static pendingNotifications = new Set<string>();

  static async showConnectionError(
    service: string,
    error: string
  ): Promise<void> {
    const key = `connection-error-${service}`;

    if (this.pendingNotifications.has(key)) {
      return;
    }

    this.pendingNotifications.add(key);

    const action = await vscode.window.showErrorMessage(
      `ZenChat RAG: Failed to connect to ${service}`,
      "Configure",
      "Retry",
      "Dismiss"
    );

    this.pendingNotifications.delete(key);

    if (action === "Configure") {
      await vscode.commands.executeCommand("zenchat.configureConnections");
    } else if (action === "Retry") {
      await vscode.commands.executeCommand("zenchat.retryConnections");
    }
  }

  static async showConnectionSuccess(service: string): Promise<void> {
    vscode.window.showInformationMessage(
      `ZenChat RAG: Successfully connected to ${service}`
    );
  }

  static async promptDatabaseConfiguration(): Promise<boolean> {
    const action = await vscode.window.showWarningMessage(
      "ZenChat RAG: Database connections not configured",
      "Configure Now",
      "Later"
    );

    if (action === "Configure Now") {
      await vscode.commands.executeCommand("zenchat.configureConnections");
      return true;
    }

    return false;
  }

  static showIndexingProgress(progress: number, message: string): void {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "ZenChat RAG: Indexing workspace",
        cancellable: true,
      },
      async (progressReporter, token) => {
        progressReporter.report({ increment: progress, message });
      }
    );
  }
}
