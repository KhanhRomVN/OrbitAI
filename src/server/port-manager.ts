// src/server/port-manager.ts
import * as vscode from "vscode";
import * as net from "net";
import WebSocket from "ws";

export class PortManager {
  private static readonly BASE_PORT = 3031;
  private static readonly MAX_PORT = 3040; // Giới hạn range 3031-3040
  private static readonly PORT_CHECK_TIMEOUT = 1000;
  private static readonly ORBITAI_HANDSHAKE = "OrbitAI-Handshake";

  /**
   * Tìm port available hoặc port đang chạy OrbitAI server
   * Returns: { port: number, isExisting: boolean }
   */
  static async findOrReusePort(
    context: vscode.ExtensionContext
  ): Promise<{ port: number; isExisting: boolean }> {
    // Kiểm tra port đã lưu trong workspace
    const storedPort = context.workspaceState.get<number>("orbitai.serverPort");
    if (storedPort) {
      const existingCheck = await this.checkOrbitAIServer(storedPort);
      if (existingCheck.isOrbitAI) {
        return { port: storedPort, isExisting: true };
      }
    }

    // Quét từ BASE_PORT đến MAX_PORT
    for (
      let currentPort = this.BASE_PORT;
      currentPort <= this.MAX_PORT;
      currentPort++
    ) {
      const existingCheck = await this.checkOrbitAIServer(currentPort);

      if (existingCheck.isOrbitAI) {
        await context.workspaceState.update("orbitai.serverPort", currentPort);
        return { port: currentPort, isExisting: true };
      }

      if (existingCheck.isAvailable) {
        await context.workspaceState.update("orbitai.serverPort", currentPort);
        return { port: currentPort, isExisting: false };
      }
    }

    throw new Error(
      `No available ports found between ${this.BASE_PORT} and ${this.MAX_PORT}`
    );
  }

  /**
   * Kiểm tra port có phải OrbitAI server hay không
   */
  private static async checkOrbitAIServer(
    port: number
  ): Promise<{ isOrbitAI: boolean; isAvailable: boolean }> {
    // Bước 1: Kiểm tra port có đang được sử dụng không
    const isPortOpen = !(await this.isPortAvailable(port));

    if (!isPortOpen) {
      return { isOrbitAI: false, isAvailable: true };
    }

    // Bước 2: Thử kết nối WebSocket và kiểm tra handshake
    return new Promise((resolve) => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      let isResolved = false;

      const cleanup = (result: {
        isOrbitAI: boolean;
        isAvailable: boolean;
      }) => {
        if (!isResolved) {
          isResolved = true;
          ws.removeAllListeners();
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
          resolve(result);
        }
      };

      ws.on("open", () => {
        // Gửi handshake message
        ws.send(JSON.stringify({ type: "ping", source: "OrbitAI-Extension" }));
      });

      ws.on("message", (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          // Kiểm tra response có phải từ OrbitAI server không
          if (message.type === "connected" || message.type === "pong") {
            cleanup({ isOrbitAI: true, isAvailable: false });
          }
        } catch (error) {
          cleanup({ isOrbitAI: false, isAvailable: false });
        }
      });

      ws.on("error", () => {
        cleanup({ isOrbitAI: false, isAvailable: false });
      });

      // Timeout sau 1 giây
      setTimeout(() => {
        if (!isResolved) {
          cleanup({ isOrbitAI: false, isAvailable: false });
        }
      }, this.PORT_CHECK_TIMEOUT);
    });
  }

  /**
   * Kiểm tra port có available không (không có service nào đang dùng)
   */
  private static isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      let isResolved = false;

      const cleanup = (result: boolean) => {
        if (!isResolved) {
          isResolved = true;
          server.removeAllListeners();
          server.close(() => {
            resolve(result);
          });
        }
      };

      server.once("error", (err: NodeJS.ErrnoException) => {
        cleanup(false); // Port đang được sử dụng
      });

      server.once("listening", () => {
        cleanup(true); // Port available
      });

      server.listen(port, "127.0.0.1");

      setTimeout(() => {
        if (!isResolved) {
          cleanup(false);
        }
      }, this.PORT_CHECK_TIMEOUT);
    });
  }

  /**
   * Lấy tất cả các port đang chạy OrbitAI (để debug)
   */
  static async getAllActiveOrbitAIPorts(): Promise<number[]> {
    const activePorts: number[] = [];

    for (let port = this.BASE_PORT; port <= this.MAX_PORT; port++) {
      const check = await this.checkOrbitAIServer(port);
      if (check.isOrbitAI) {
        activePorts.push(port);
      }
    }

    return activePorts;
  }

  /**
   * Kiểm tra một port cụ thể
   * Public method để sử dụng từ bên ngoài
   */
  static async checkSpecificPort(
    port: number
  ): Promise<{ isOrbitAI: boolean; isAvailable: boolean }> {
    return this.checkOrbitAIServer(port);
  }
}
