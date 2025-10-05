// src/commands/command-registry.ts
import * as vscode from "vscode";
import { AICommands } from "./ai-commands";
import { ServerCommands } from "./server-commands";

export class CommandRegistry {
  constructor(
    private aiCommands: AICommands,
    private serverCommands: ServerCommands
  ) {}

  registerAll(context: vscode.ExtensionContext): void {
    // Server control commands
    context.subscriptions.push(
      vscode.commands.registerCommand("orbit-ai.startServer", () =>
        this.serverCommands.startServer()
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("orbit-ai.stopServer", () =>
        this.serverCommands.stopServer()
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("orbit-ai.restartServer", () =>
        this.serverCommands.restartServer()
      )
    );

    // AI commands
    context.subscriptions.push(
      vscode.commands.registerCommand("orbit-ai.explainCode", () =>
        this.aiCommands.handleCommand("explain", "Explain this code")
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("orbit-ai.fixCode", () =>
        this.aiCommands.handleCommand("fix", "Fix the bugs in this code")
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("orbit-ai.refactorCode", () =>
        this.aiCommands.handleCommand(
          "refactor",
          "Refactor this code for better quality"
        )
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("orbit-ai.generateTests", () =>
        this.aiCommands.handleCommand(
          "test",
          "Generate comprehensive tests for this code"
        )
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("orbit-ai.addDocumentation", () =>
        this.aiCommands.handleCommand(
          "document",
          "Add comprehensive documentation to this code"
        )
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("orbit-ai.editCode", () =>
        this.aiCommands.handleEditCommand()
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("orbit-ai.chat", () =>
        this.aiCommands.handleChatCommand()
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("orbit-ai.showServerPort", () =>
        this.serverCommands.showServerPort()
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("orbit-ai.connectToPort", () =>
        this.serverCommands.connectToPort()
      )
    );
  }
}
