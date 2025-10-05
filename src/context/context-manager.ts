// src/context/context-manager.ts
import * as vscode from "vscode";
import * as path from "path";

export interface ContextItem {
  type: "file" | "selection" | "diagnostic" | "symbol" | "workspace";
  path?: string;
  content: string;
  range?: vscode.Range;
  language?: string;
  metadata?: Record<string, any>;
}

export interface ContextResolutionResult {
  items: ContextItem[];
  totalTokens: number;
  strategy: "full" | "smart" | "minimal";
}

export class ContextManager {
  private readonly MAX_CONTEXT_TOKENS = 100000; // ~75k tokens for context

  /**
   * Collect context based on current editor state
   */
  async collectContext(options?: {
    includeOpenFiles?: boolean;
    includeSelection?: boolean;
    includeDiagnostics?: boolean;
    includeWorkspace?: boolean;
    maxFiles?: number;
  }): Promise<ContextResolutionResult> {
    const items: ContextItem[] = [];
    const opts = {
      includeOpenFiles: true,
      includeSelection: true,
      includeDiagnostics: true,
      includeWorkspace: false,
      maxFiles: 10,
      ...options,
    };

    // 1. Current file and selection (highest priority)
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      items.push(...(await this.collectFromEditor(editor, opts)));
    }

    // 2. Open tabs in visible editors
    if (opts.includeOpenFiles) {
      items.push(...(await this.collectOpenFiles(opts.maxFiles)));
    }

    // 3. Diagnostics (errors/warnings)
    if (opts.includeDiagnostics) {
      items.push(...(await this.collectDiagnostics()));
    }

    // 4. Workspace structure (if needed)
    if (opts.includeWorkspace) {
      items.push(...(await this.collectWorkspaceStructure()));
    }

    const totalTokens = this.estimateTokens(items);
    const strategy = this.determineStrategy(totalTokens);

    return {
      items: this.pruneContext(items, strategy),
      totalTokens,
      strategy,
    };
  }

  /**
   * Collect context from active editor
   */
  private async collectFromEditor(
    editor: vscode.TextEditor,
    opts: any
  ): Promise<ContextItem[]> {
    const items: ContextItem[] = [];
    const document = editor.document;

    // Full file content
    items.push({
      type: "file",
      path: document.uri.fsPath,
      content: document.getText(),
      language: document.languageId,
      metadata: {
        lineCount: document.lineCount,
        size: document.getText().length,
      },
    });

    // Current selection
    if (opts.includeSelection && !editor.selection.isEmpty) {
      const selection = editor.document.getText(editor.selection);
      items.push({
        type: "selection",
        path: document.uri.fsPath,
        content: selection,
        range: editor.selection,
        language: document.languageId,
        metadata: {
          startLine: editor.selection.start.line,
          endLine: editor.selection.end.line,
        },
      });
    }

    return items;
  }

  /**
   * Collect context from open files
   */
  private async collectOpenFiles(maxFiles: number): Promise<ContextItem[]> {
    const items: ContextItem[] = [];
    const visibleEditors = vscode.window.visibleTextEditors
      .filter((e) => e !== vscode.window.activeTextEditor)
      .slice(0, maxFiles);

    for (const editor of visibleEditors) {
      const doc = editor.document;
      items.push({
        type: "file",
        path: doc.uri.fsPath,
        content: doc.getText(),
        language: doc.languageId,
        metadata: {
          lineCount: doc.lineCount,
          size: doc.getText().length,
          isVisible: true,
        },
      });
    }

    return items;
  }

  /**
   * Collect diagnostics (errors, warnings)
   */
  private async collectDiagnostics(): Promise<ContextItem[]> {
    const items: ContextItem[] = [];
    const diagnostics = vscode.languages.getDiagnostics();

    for (const [uri, diags] of diagnostics) {
      if (diags.length === 0) continue;

      const doc = await vscode.workspace.openTextDocument(uri);
      const content = diags
        .map((d) => {
          const line = doc.lineAt(d.range.start.line);
          return `${
            d.severity === vscode.DiagnosticSeverity.Error ? "ERROR" : "WARNING"
          }: ${d.message}
  at ${path.basename(uri.fsPath)}:${d.range.start.line + 1}
  > ${line.text.trim()}`;
        })
        .join("\n\n");

      items.push({
        type: "diagnostic",
        path: uri.fsPath,
        content: content,
        metadata: {
          errorCount: diags.filter(
            (d) => d.severity === vscode.DiagnosticSeverity.Error
          ).length,
          warningCount: diags.filter(
            (d) => d.severity === vscode.DiagnosticSeverity.Warning
          ).length,
        },
      });
    }

    return items;
  }

  /**
   * Collect workspace structure (file tree)
   */
  private async collectWorkspaceStructure(): Promise<ContextItem[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return [];

    const items: ContextItem[] = [];

    for (const folder of workspaceFolders) {
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(
          folder,
          "**/*.{ts,js,tsx,jsx,py,java,go,rs}"
        ),
        "**/node_modules/**",
        100
      );

      const tree = files
        .map((f) => {
          const rel = path.relative(folder.uri.fsPath, f.fsPath);
          return `  ${rel}`;
        })
        .join("\n");

      items.push({
        type: "workspace",
        content: `Workspace: ${folder.name}\n${tree}`,
        metadata: {
          fileCount: files.length,
          rootPath: folder.uri.fsPath,
        },
      });
    }

    return items;
  }

  /**
   * Estimate total tokens (rough approximation)
   */
  private estimateTokens(items: ContextItem[]): number {
    return items.reduce((sum, item) => {
      // Rough estimate: 1 token ≈ 4 characters
      return sum + Math.ceil(item.content.length / 4);
    }, 0);
  }

  /**
   * Determine context inclusion strategy
   */
  private determineStrategy(totalTokens: number): "full" | "smart" | "minimal" {
    if (totalTokens < this.MAX_CONTEXT_TOKENS * 0.5) {
      return "full";
    } else if (totalTokens < this.MAX_CONTEXT_TOKENS) {
      return "smart";
    } else {
      return "minimal";
    }
  }

  /**
   * Prune context based on strategy
   */
  private pruneContext(
    items: ContextItem[],
    strategy: "full" | "smart" | "minimal"
  ): ContextItem[] {
    if (strategy === "full") {
      return items;
    }

    // Priority order: selection > current file > diagnostics > open files > workspace
    const priority = {
      selection: 5,
      file: 4,
      diagnostic: 3,
      symbol: 2,
      workspace: 1,
    };

    const sorted = [...items].sort((a, b) => {
      return (priority[b.type] || 0) - (priority[a.type] || 0);
    });

    if (strategy === "minimal") {
      // Only keep selection, current file, and diagnostics
      return sorted
        .filter(
          (item) =>
            item.type === "selection" ||
            item.type === "file" ||
            item.type === "diagnostic"
        )
        .slice(0, 3);
    }

    // Smart strategy: keep based on token budget
    const result: ContextItem[] = [];
    let currentTokens = 0;

    for (const item of sorted) {
      const itemTokens = Math.ceil(item.content.length / 4);
      if (currentTokens + itemTokens <= this.MAX_CONTEXT_TOKENS) {
        result.push(item);
        currentTokens += itemTokens;
      }
    }

    return result;
  }

  /**
   * Search workspace for relevant files (semantic search would go here)
   */
  async searchWorkspace(
    query: string,
    limit: number = 5
  ): Promise<ContextItem[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return [];

    // Simple text search (replace with vector search later)
    const results: ContextItem[] = [];

    for (const folder of workspaceFolders) {
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(
          folder,
          "**/*.{ts,js,tsx,jsx,py,java,go,rs}"
        ),
        "**/node_modules/**",
        limit * 2
      );

      for (const file of files) {
        const doc = await vscode.workspace.openTextDocument(file);
        const content = doc.getText();

        // Simple relevance check
        if (content.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            type: "file",
            path: file.fsPath,
            content: content,
            language: doc.languageId,
            metadata: {
              matchCount: (content.match(new RegExp(query, "gi")) || []).length,
            },
          });
        }
      }
    }

    return results
      .sort(
        (a, b) => (b.metadata?.matchCount || 0) - (a.metadata?.matchCount || 0)
      )
      .slice(0, limit);
  }
}
