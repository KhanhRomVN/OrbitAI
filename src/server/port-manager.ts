// src/server/port-manager.ts
import * as vscode from "vscode";
import * as net from "net";
import WebSocket from "ws";

export class PortManager {
  static async getPortWorkspace(
    port: number,
    _context: vscode.ExtensionContext
  ): Promise<string | null> {
    try {
      // Thử connect để kiểm tra server có đang chạy không
      const ws = new WebSocket(`ws://localhost:${port}`);

      return new Promise((resolve) => {
        let isResolved = false;

        const cleanup = (result: string | null) => {
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
          // Yêu cầu workspace info từ server
          ws.send(
            JSON.stringify({
              type: "getWorkspaceInfo",
              source: "ZenChat-Extension",
            })
          );
        });

        ws.on("message", (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === "workspaceInfo" && message.workspacePath) {
              cleanup(message.workspacePath);
            } else {
              cleanup(null);
            }
          } catch (error) {
            cleanup(null);
          }
        });

        ws.on("error", () => {
          cleanup(null);
        });

        setTimeout(() => {
          if (!isResolved) {
            cleanup(null);
          }
        }, this.PORT_CHECK_TIMEOUT);
      });
    } catch (error) {
      return null;
    }
  }

  private static readonly BASE_PORT = 3031;
  private static readonly MAX_PORT = 3040; // Giới hạn range 3031-3040
  private static readonly PORT_CHECK_TIMEOUT = 1000;
  private static readonly ORBITAI_HANDSHAKE = "ZenChat-Handshake";

  /**
   * Tìm port available hoặc port đang chạy ZenChat server
   * Returns: { port: number, isExisting: boolean }
   */
  static async findOrReusePort(
    context: vscode.ExtensionContext
  ): Promise<{ port: number; isExisting: boolean }> {
    // Kiểm tra port đã lưu trong workspace
    const storedPort = context.workspaceState.get<number>("orbitai.serverPort");
    if (storedPort) {
      const existingCheck = await this.checkZenChatServer(storedPort);
      if (existingCheck.isZenChat) {
        return { port: storedPort, isExisting: true };
      }
    }

    // Quét từ BASE_PORT đến MAX_PORT
    for (
      let currentPort = this.BASE_PORT;
      currentPort <= this.MAX_PORT;
      currentPort++
    ) {
      const existingCheck = await this.checkZenChatServer(currentPort);

      if (existingCheck.isZenChat) {
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
   * Kiểm tra port có phải ZenChat server hay không
   */
  private static async checkZenChatServer(
    port: number
  ): Promise<{ isZenChat: boolean; isAvailable: boolean }> {
    // Bước 1: Kiểm tra port có đang được sử dụng không
    const isPortOpen = !(await this.isPortAvailable(port));

    if (!isPortOpen) {
      return { isZenChat: false, isAvailable: true };
    }

    // Bước 2: Thử kết nối WebSocket và kiểm tra handshake
    return new Promise((resolve) => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      let isResolved = false;

      const cleanup = (result: {
        isZenChat: boolean;
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
        ws.send(JSON.stringify({ type: "ping", source: "ZenChat-Extension" }));
      });

      ws.on("message", (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          // Kiểm tra response có phải từ ZenChat server không
          if (message.type === "connected" || message.type === "pong") {
            cleanup({ isZenChat: true, isAvailable: false });
          }
        } catch (error) {
          cleanup({ isZenChat: false, isAvailable: false });
        }
      });

      ws.on("error", () => {
        cleanup({ isZenChat: false, isAvailable: false });
      });

      // Timeout sau 1 giây
      setTimeout(() => {
        if (!isResolved) {
          cleanup({ isZenChat: false, isAvailable: false });
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

      server.once("error", (_err: NodeJS.ErrnoException) => {
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
   * Lấy tất cả các port đang chạy ZenChat (để debug)
   */
  static async getAllActiveZenChatPorts(): Promise<number[]> {
    const activePorts: number[] = [];

    for (let port = this.BASE_PORT; port <= this.MAX_PORT; port++) {
      const check = await this.checkZenChatServer(port);
      if (check.isZenChat) {
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
  ): Promise<{ isZenChat: boolean; isAvailable: boolean }> {
    return this.checkZenChatServer(port);
  }
}
