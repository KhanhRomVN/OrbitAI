// src/commands/server-commands.ts
import { WebSocketServer } from "../server/websocket-server";

export class ServerCommands {
  constructor(private server: WebSocketServer) {}

  async startServer(): Promise<void> {
    await this.server.start();
  }

  async stopServer(): Promise<void> {
    await this.server.stop();
  }

  async restartServer(): Promise<void> {
    await this.server.restart();
  }
}
