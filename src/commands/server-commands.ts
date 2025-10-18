// src/commands/server-commands.ts
import * as vscode from "vscode";
import { WebSocketServer } from "../server/websocket-server";
import { PortManager } from "../server/port-manager";

export class ServerCommands {
  constructor(private server: WebSocketServer) {}

  async startServer(): Promise<void> {
    const context = (global as any).extensionContext;

    // Yêu cầu người dùng nhập port
    const portInput = await vscode.window.showInputBox({
      prompt: "Enter WebSocket server port",
      placeHolder: "3031",
      value: "3031",
      title: "Start ZenChat Server",
      validateInput: (value) => {
        const port = parseInt(value);
        if (isNaN(port) || port < 1024 || port > 65535) {
          return "Port must be a number between 1024 and 65535";
        }
        return null;
      },
    });

    if (!portInput) {
      return; // User cancelled
    }

    const targetPort = parseInt(portInput);

    // Kiểm tra port có available không
    const portInfo = await PortManager.checkSpecificPort(targetPort);

    // Trường hợp 1: Port đang được dùng bởi service khác (không phải ZenChat)
    if (!portInfo.isAvailable && !portInfo.isZenChat) {
      vscode.window.showErrorMessage(
        `Port ${targetPort} is already in use by another service (not ZenChat)`
      );
      return;
    }

    // Trường hợp 2: Port đang chạy ZenChat server
    if (portInfo.isZenChat) {
      // Kiểm tra xem có workspace khác đang dùng port này không
      const currentWorkspacePath =
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const storedWorkspacePath = await PortManager.getPortWorkspace(
        targetPort,
        context
      );

      // Nếu có workspace khác đang dùng → Tạm dừng
      if (storedWorkspacePath && storedWorkspacePath !== currentWorkspacePath) {
        vscode.window.showWarningMessage(
          `Port ${targetPort} is being used by another VSCode workspace.\n` +
            `Workspace: ${storedWorkspacePath}`
        );
        return;
      }

      // Nếu không có workspace khác → Gia nhập port
      this.server.setPort(targetPort);
      await context.workspaceState.update("orbitai.serverPort", targetPort);

      // Cập nhật UI
      const provider = (global as any).webviewProvider;
      if (provider) {
        setTimeout(() => {
          provider.updateServerStatus(true, targetPort);
        }, 200);
      }

      vscode.window.showInformationMessage(
        `✓ Connected to existing ZenChat server on port ${targetPort}`
      );
      return;
    }

    // Trường hợp 3: Port available → Start server mới
    try {
      this.server.setPort(targetPort);
      await this.server.start();

      await context.workspaceState.update("orbitai.serverPort", targetPort);

      // Cập nhật UI
      const provider = (global as any).webviewProvider;
      if (provider) {
        provider.updateServerStatus(true, targetPort);
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to start server: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async stopServer(): Promise<void> {
    await this.server.stop();

    // 🆕 Cập nhật UI sau khi stop
    const provider = (global as any).webviewProvider;
    if (provider) {
      setTimeout(() => {
        provider.updateServerStatus(false, this.server.getPort());
      }, 100);
    }
  }

  async showServerPort(): Promise<void> {
    const port = this.server.getPort();
    const isRunning = this.server.getStatus().isRunning;
    const activeZenChatPorts = await PortManager.getAllActiveZenChatPorts();

    const status = isRunning ? "Running" : "Stopped";
    const portsInfo =
      activeZenChatPorts.length > 0 ? activeZenChatPorts.join(", ") : "None";

    vscode.window.showInformationMessage(
      `ZenChat Server Info:\n` +
        `Current Port: ${port} (${status})\n` +
        `All Active ZenChat Ports: ${portsInfo}`
    );
  }

  async connectToPort(): Promise<void> {
    const context = (global as any).extensionContext;

    // Yêu cầu người dùng nhập port
    const portInput = await vscode.window.showInputBox({
      prompt: "Enter WebSocket server port to connect",
      placeHolder: "3031",
      title: "Connect to ZenChat Server",
      validateInput: (value) => {
        const port = parseInt(value);
        if (isNaN(port) || port < 1024 || port > 65535) {
          return "Port must be a number between 1024 and 65535";
        }
        return null;
      },
    });

    if (!portInput) {
      return; // User cancelled
    }

    const targetPort = parseInt(portInput);

    // Kiểm tra port có đang chạy ZenChat server không
    const portInfo = await PortManager.checkSpecificPort(targetPort);

    if (portInfo.isZenChat) {
      // Có ZenChat server đang chạy → kết nối vào
      this.server.setPort(targetPort);

      // Cập nhật workspace state
      await context.workspaceState.update("orbitai.serverPort", targetPort);

      // Cập nhật UI
      const provider = (global as any).webviewProvider;
      if (provider) {
        provider.updateServerStatus(true, targetPort);
      }

      vscode.window.showInformationMessage(
        `✓ Connected to existing ZenChat server on port ${targetPort}`
      );
    } else if (portInfo.isAvailable) {
      // Port available → hỏi có muốn start server mới không
      const choice = await vscode.window.showQuickPick(
        [
          {
            label: "Start new server on this port",
            description: `Port ${targetPort} is available`,
          },
          {
            label: "Cancel",
            description: "Do nothing",
          },
        ],
        {
          placeHolder: `Port ${targetPort} is available. What do you want to do?`,
          title: "Port Available",
        }
      );

      if (choice?.label === "Start new server on this port") {
        this.server.setPort(targetPort);
        await this.server.start();
        await context.workspaceState.update("orbitai.serverPort", targetPort);
      }
    } else {
      // Port đang được dùng bởi service khác (không phải ZenChat)
      vscode.window.showErrorMessage(
        `Port ${targetPort} is already in use by another service (not ZenChat)`
      );
    }
  }
}
