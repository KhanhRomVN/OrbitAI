// src/editor/code-editor.ts
import * as vscode from "vscode";

export interface SearchReplaceBlock {
  search: string;
  replace: string;
  filePath?: string;
}

export interface ApplyResult {
  success: boolean;
  appliedChanges: number;
  failedChanges: number;
  errors: string[];
}

export class CodeEditor {
  /**
   * Parse SEARCH/REPLACE blocks from AI response
   */
  parseSearchReplaceBlocks(aiResponse: string): SearchReplaceBlock[] {
    const blocks: SearchReplaceBlock[] = [];

    // Match <SEARCH>...</SEARCH> <REPLACE>...</REPLACE> patterns
    const pattern =
      /<SEARCH>\s*([\s\S]*?)\s*<\/SEARCH>\s*<REPLACE>\s*([\s\S]*?)\s*<\/REPLACE>/gi;

    let match;
    while ((match = pattern.exec(aiResponse)) !== null) {
      blocks.push({
        search: match[1].trim(),
        replace: match[2].trim(),
      });
    }

    return blocks;
  }

  /**
   * Apply search/replace blocks to current file
   */
  async applySearchReplace(blocks: SearchReplaceBlock[]): Promise<ApplyResult> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return {
        success: false,
        appliedChanges: 0,
        failedChanges: blocks.length,
        errors: ["No active editor"],
      };
    }

    const document = editor.document;
    const errors: string[] = [];
    let appliedChanges = 0;
    let failedChanges = 0;

    // Create edit builder
    const edit = new vscode.WorkspaceEdit();

    for (const block of blocks) {
      try {
        const applied = this.applyBlock(document, edit, block);
        if (applied) {
          appliedChanges++;
        } else {
          failedChanges++;
          errors.push(
            `Could not find exact match for:\n${block.search.substring(
              0,
              100
            )}...`
          );
        }
      } catch (error) {
        failedChanges++;
        errors.push(`Error applying change: ${error}`);
      }
    }

    // Apply all edits
    if (appliedChanges > 0) {
      const success = await vscode.workspace.applyEdit(edit);
      if (!success) {
        return {
          success: false,
          appliedChanges: 0,
          failedChanges: blocks.length,
          errors: ["Failed to apply edits"],
        };
      }
    }

    return {
      success: appliedChanges > 0,
      appliedChanges,
      failedChanges,
      errors,
    };
  }

  /**
   * Apply a single search/replace block
   */
  private applyBlock(
    document: vscode.TextDocument,
    edit: vscode.WorkspaceEdit,
    block: SearchReplaceBlock
  ): boolean {
    const content = document.getText();
    const searchText = this.normalizeWhitespace(block.search);

    // Try to find exact match
    let index = this.findExactMatch(content, searchText);

    if (index === -1) {
      // Try fuzzy match (ignoring extra whitespace)
      index = this.findFuzzyMatch(content, searchText);
    }

    if (index === -1) {
      return false;
    }

    // Calculate range
    const startPos = document.positionAt(index);
    const endPos = document.positionAt(index + block.search.length);
    const range = new vscode.Range(startPos, endPos);

    // Add replacement
    edit.replace(document.uri, range, block.replace);
    return true;
  }

  /**
   * Find exact match in content
   */
  private findExactMatch(content: string, search: string): number {
    return content.indexOf(search);
  }

  /**
   * Find fuzzy match (ignoring whitespace differences)
   */
  private findFuzzyMatch(content: string, search: string): number {
    const normalizedContent = this.normalizeWhitespace(content);
    const normalizedSearch = this.normalizeWhitespace(search);

    const index = normalizedContent.indexOf(normalizedSearch);

    if (index === -1) return -1;

    // Map back to original content index
    let originalIndex = 0;
    let normalizedIndex = 0;

    while (normalizedIndex < index) {
      if (normalizedContent[normalizedIndex] === content[originalIndex]) {
        normalizedIndex++;
        originalIndex++;
      } else {
        // Skip whitespace in original
        originalIndex++;
      }
    }

    return originalIndex;
  }

  /**
   * Normalize whitespace for comparison
   */
  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, "  ")
      .replace(/[ ]+/g, " ");
  }

  /**
   * Insert code at cursor position
   */
  async insertAtCursor(code: string): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return false;

    const position = editor.selection.active;
    return editor.edit((editBuilder) => {
      editBuilder.insert(position, code);
    });
  }

  /**
   * Replace current selection with code
   */
  async replaceSelection(code: string): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return false;

    return editor.edit((editBuilder) => {
      editBuilder.replace(editor.selection, code);
    });
  }

  /**
   * Replace entire file content
   */
  async replaceFile(code: string): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return false;

    const document = editor.document;
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length)
    );

    return editor.edit((editBuilder) => {
      editBuilder.replace(fullRange, code);
    });
  }

  /**
   * Create new file with content
   */
  async createFile(filePath: string, content: string): Promise<boolean> {
    try {
      const uri = vscode.Uri.file(filePath);
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(uri, encoder.encode(content));

      // Open the new file
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);

      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create file: ${error}`);
      return false;
    }
  }

  /**
   * Show diff preview before applying changes
   */
  async previewChanges(
    original: string,
    modified: string,
    filePath: string
  ): Promise<boolean> {
    try {
      // Create temp file for modified content
      const uri = vscode.Uri.parse(`untitled:${filePath}.modified`);
      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc, {
        preview: true,
        viewColumn: vscode.ViewColumn.Beside,
      });

      // Apply modified content
      await editor.edit((editBuilder) => {
        const fullRange = new vscode.Range(
          doc.positionAt(0),
          doc.positionAt(doc.getText().length)
        );
        editBuilder.replace(fullRange, modified);
      });

      // Show diff
      const originalUri = vscode.Uri.file(filePath);
      await vscode.commands.executeCommand(
        "vscode.diff",
        originalUri,
        uri,
        `${filePath} (Original ↔ Modified)`
      );

      // Ask user to accept or reject
      const action = await vscode.window.showInformationMessage(
        "Review the changes. Apply them?",
        "Apply",
        "Reject"
      );

      return action === "Apply";
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to preview changes: ${error}`);
      return false;
    }
  }

  /**
   * Extract code blocks from markdown
   */
  extractCodeBlocks(text: string): Array<{ language: string; code: string }> {
    const blocks: Array<{ language: string; code: string }> = [];
    const pattern = /```(\w+)?\n([\s\S]*?)```/g;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      blocks.push({
        language: match[1] || "text",
        code: match[2].trim(),
      });
    }

    return blocks;
  }

  /**
   * Format code using VSCode formatter
   */
  async formatCode(): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return false;

    try {
      await vscode.commands.executeCommand("editor.action.formatDocument");
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Apply streaming edits (for real-time updates)
   */
  async applyStreamingEdit(
    partialCode: string,
    append: boolean = false
  ): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return false;

    if (append) {
      const lastLine = editor.document.lineCount - 1;
      const lastChar = editor.document.lineAt(lastLine).text.length;
      const position = new vscode.Position(lastLine, lastChar);

      return editor.edit((editBuilder) => {
        editBuilder.insert(position, partialCode);
      });
    } else {
      return this.replaceSelection(partialCode);
    }
  }
}
