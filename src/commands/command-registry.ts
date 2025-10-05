// src/commands/command-registry.ts
import * as vscode from "vscode";
import { AICommands } from "./ai-commands";
import { ServerCommands } from "./server-commands";
import { ContextManager } from "../context/context-manager";

export class CommandRegistry {
  constructor(
    private aiCommands: AICommands,
    private serverCommands: ServerCommands,
    private contextManager: ContextManager
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

    // Debug command
    context.subscriptions.push(
      vscode.commands.registerCommand("orbit-ai.showContext", () =>
        this.showContextDebug()
      )
    );
  }

  private async showContextDebug(): Promise<void> {
    const context = await this.contextManager.collectContext({
      includeOpenFiles: true,
      includeSelection: true,
      includeDiagnostics: true,
      includeWorkspace: false,
    });

    const panel = vscode.window.createWebviewPanel(
      "contextPreview",
      "Context Preview",
      vscode.ViewColumn.Two,
      {}
    );

    panel.webview.html = `
      <html>
        <body>
          <h2>Collected Context</h2>
          <p>Total items: ${context.items.length}</p>
          <p>Estimated tokens: ${context.totalTokens}</p>
          <p>Strategy: ${context.strategy}</p>
          <hr>
          <pre>${JSON.stringify(context.items, null, 2)}</pre>
        </body>
      </html>
    `;
  }
}
