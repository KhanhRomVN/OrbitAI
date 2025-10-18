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
      vscode.commands.registerCommand("zenchat.startServer", () =>
        this.serverCommands.startServer()
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("zenchat.stopServer", () =>
        this.serverCommands.stopServer()
      )
    );

    // AI commands
    context.subscriptions.push(
      vscode.commands.registerCommand("zenchat.explainCode", () =>
        this.aiCommands.handleCommand("explain", "Explain this code")
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("zenchat.fixCode", () =>
        this.aiCommands.handleCommand("fix", "Fix the bugs in this code")
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("zenchat.refactorCode", () =>
        this.aiCommands.handleCommand(
          "refactor",
          "Refactor this code for better quality"
        )
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("zenchat.generateTests", () =>
        this.aiCommands.handleCommand(
          "test",
          "Generate comprehensive tests for this code"
        )
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("zenchat.addDocumentation", () =>
        this.aiCommands.handleCommand(
          "document",
          "Add comprehensive documentation to this code"
        )
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("zenchat.editCode", () =>
        this.aiCommands.handleEditCommand()
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("zenchat.chat", () =>
        this.aiCommands.handleChatCommand()
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("zenchat.showServerPort", () =>
        this.serverCommands.showServerPort()
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("zenchat.connectToPort", () =>
        this.serverCommands.connectToPort()
      )
    );
  }
}
