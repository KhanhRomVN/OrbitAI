// src/server/websocket-server.ts
import * as vscode from "vscode";
import * as WebSocket from "ws";
import { ServerStatus } from "../types/interfaces";

export class WebSocketServer {
  private wss: WebSocket.Server | null = null;
  private isRunning = false;
  private port: number;
  private messageHandler?: (data: any, ws: WebSocket) => void;

  constructor(port: number = 3031) {
    this.port = port;
  }

  /**
   * Update server port (for workspace-specific port)
   */
  setPort(port: number): void {
    if (this.isRunning) {
      throw new Error(
        "Cannot change port while server is running. Stop server first."
      );
    }
    this.port = port;
  }

  getPort(): number {
    return this.port;
  }

  setMessageHandler(handler: (data: any, ws: WebSocket) => void): void {
    this.messageHandler = handler;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        vscode.window.showWarningMessage("OrbitAI: Server is already running");
        resolve();
        return;
      }

      try {
        this.wss = new WebSocket.Server({
          port: this.port,
          perMessageDeflate: false,
        });

        this.wss.on("listening", () => {
          vscode.window.showInformationMessage(
            `OrbitAI: Server started on port ${this.port}`
          );
          this.isRunning = true;

          // Gửi status update sau khi server đã listening
          const provider = (global as any).webviewProvider;
          if (provider) {
            setTimeout(() => {
              provider.updateServerStatus(true, this.port);
            }, 100);
          }

          resolve();
        });

        this.wss.on("connection", (ws: WebSocket) => {
          ws.on("message", (message: WebSocket.Data) => {
            try {
              const data = JSON.parse(message.toString());
              if (this.messageHandler) {
                this.messageHandler(data, ws);
              }
            } catch (error) {
              console.error("[OrbitAI] ❌ Failed to parse message:", error);
            }
          });

          ws.on("close", () => console.log("[OrbitAI] 🔌 Client disconnected"));
          ws.on("error", (error) =>
            console.error("[OrbitAI] ❌ WebSocket error:", error)
          );

          ws.send(
            JSON.stringify({
              type: "connected",
              message: "Welcome to OrbitAI",
            })
          );
        });

        this.wss.on("error", (error) => {
          console.error("[OrbitAI] ❌ Server error:", error);
          vscode.window.showErrorMessage(
            `OrbitAI: Server error - ${error.message}`
          );
          this.isRunning = false;
          reject(error);
        });
      } catch (error) {
        console.error("[OrbitAI] ❌ Failed to start server:", error);
        vscode.window.showErrorMessage("OrbitAI: Failed to start server");
        this.isRunning = false;
        reject(error);
      }
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isRunning || !this.wss) {
        vscode.window.showWarningMessage("OrbitAI: Server is not running");
        resolve();
        return;
      }

      this.wss.close(() => {
        console.log("[OrbitAI] 🛑 Server stopped");
        vscode.window.showInformationMessage("OrbitAI: Server stopped");
        this.isRunning = false;
        this.wss = null;
        resolve();
      });
    });
  }

  async restart(): Promise<void> {
    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.start();
  }

  sendToAllClients(message: any): void {
    if (!this.wss) {
      vscode.window.showErrorMessage("WebSocket server is not running");
      return;
    }

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  getStatus(): ServerStatus {
    return {
      isRunning: this.isRunning,
      port: this.port,
    };
  }

  dispose(): void {
    if (this.wss) {
      this.wss.close();
    }
  }
}
