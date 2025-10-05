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
      title: "Start OrbitAI Server",
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

    if (!portInfo.isAvailable && !portInfo.isOrbitAI) {
      vscode.window.showErrorMessage(
        `Port ${targetPort} is already in use by another service`
      );
      return;
    }

    if (portInfo.isOrbitAI) {
      vscode.window.showInformationMessage(
        `OrbitAI: Already connected to server on port ${targetPort}`
      );

      // Cập nhật UI - Delay để đảm bảo webview đã sẵn sàng
      const provider = (global as any).webviewProvider;
      if (provider) {
        setTimeout(() => {
          provider.updateServerStatus(true, targetPort);
        }, 200);
      }

      await context.workspaceState.update("orbitai.serverPort", targetPort);
      return;
    }

    // Start server mới
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
  }

  async restartServer(): Promise<void> {
    await this.server.restart();
  }

  async showServerPort(): Promise<void> {
    const port = this.server.getPort();
    const isRunning = this.server.getStatus().isRunning;
    const activeOrbitAIPorts = await PortManager.getAllActiveOrbitAIPorts();

    const status = isRunning ? "Running" : "Stopped";
    const portsInfo =
      activeOrbitAIPorts.length > 0 ? activeOrbitAIPorts.join(", ") : "None";

    vscode.window.showInformationMessage(
      `OrbitAI Server Info:\n` +
        `Current Port: ${port} (${status})\n` +
        `All Active OrbitAI Ports: ${portsInfo}`
    );
  }

  async connectToPort(): Promise<void> {
    const context = (global as any).extensionContext;

    // Yêu cầu người dùng nhập port
    const portInput = await vscode.window.showInputBox({
      prompt: "Enter WebSocket server port to connect",
      placeHolder: "3031",
      title: "Connect to OrbitAI Server",
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

    // Kiểm tra port có đang chạy OrbitAI server không
    const portInfo = await PortManager.checkSpecificPort(targetPort);

    if (portInfo.isOrbitAI) {
      // Có OrbitAI server đang chạy → kết nối vào
      this.server.setPort(targetPort);

      // Cập nhật workspace state
      await context.workspaceState.update("orbitai.serverPort", targetPort);

      // Cập nhật UI
      const provider = (global as any).webviewProvider;
      if (provider) {
        provider.updateServerStatus(true, targetPort);
      }

      vscode.window.showInformationMessage(
        `✓ Connected to existing OrbitAI server on port ${targetPort}`
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
      // Port đang được dùng bởi service khác (không phải OrbitAI)
      vscode.window.showErrorMessage(
        `Port ${targetPort} is already in use by another service (not OrbitAI)`
      );
    }
  }
}
