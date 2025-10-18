// src/webview/status-bar-provider.ts
import * as vscode from "vscode";
import { ConnectionStatus } from "../types/rag-types";

export class StatusBarProvider {
  private statusBarItem: vscode.StatusBarItem;
  private connectionStatus: ConnectionStatus = {
    postgres: false,
    vectorDb: false,
    redis: false,
    lastChecked: 0,
  };

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "zenchat.showConnectionStatus";
    this.updateStatusBar();
    this.statusBarItem.show();
  }

  updateStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.updateStatusBar();
  }

  private updateStatusBar(): void {
    const allConnected =
      this.connectionStatus.postgres &&
      this.connectionStatus.vectorDb &&
      this.connectionStatus.redis;

    if (allConnected) {
      this.statusBarItem.text = "$(check) ZenChat RAG";
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = "All services connected";
    } else {
      const disconnected = [];
      if (!this.connectionStatus.postgres) disconnected.push("PostgreSQL");
      if (!this.connectionStatus.vectorDb) disconnected.push("VectorDB");
      if (!this.connectionStatus.redis) disconnected.push("Redis");

      this.statusBarItem.text = "$(warning) ZenChat RAG";
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground"
      );
      this.statusBarItem.tooltip = `Disconnected: ${disconnected.join(", ")}`;
    }
  }

  async showDetailedStatus(): Promise<void> {
    const items: vscode.QuickPickItem[] = [
      {
        label: this.connectionStatus.postgres
          ? "$(check) PostgreSQL"
          : "$(x) PostgreSQL",
        detail: this.connectionStatus.postgres ? "Connected" : "Not connected",
        description: "Metadata storage",
      },
      {
        label: this.connectionStatus.vectorDb
          ? "$(check) Vector Database"
          : "$(x) Vector Database",
        detail: this.connectionStatus.vectorDb ? "Connected" : "Not connected",
        description: "Code embeddings",
      },
      {
        label: this.connectionStatus.redis ? "$(check) Redis" : "$(x) Redis",
        detail: this.connectionStatus.redis ? "Connected" : "Not connected",
        description: "Cache & sessions",
      },
      {
        label: "$(gear) Configure Connections",
        detail: "Update database credentials",
      },
      {
        label: "$(refresh) Retry Connections",
        detail: "Test connections again",
      },
    ];

    const selected = await vscode.window.showQuickPick(items, {
      title: "ZenChat RAG - Connection Status",
      placeHolder: "Select an action",
    });

    if (selected?.label.includes("Configure")) {
      await vscode.commands.executeCommand("zenchat.configureConnections");
    } else if (selected?.label.includes("Retry")) {
      await vscode.commands.executeCommand("zenchat.retryConnections");
    }
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
