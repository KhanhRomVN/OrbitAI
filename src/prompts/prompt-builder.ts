// src/prompts/prompt-builder.ts
import * as vscode from "vscode";
import {
  ContextItem,
  ContextResolutionResult,
} from "../context/context-manager";

export type PromptIntent =
  | "explain"
  | "fix"
  | "refactor"
  | "test"
  | "document"
  | "implement"
  | "chat"
  | "edit";

export interface PromptRequest {
  intent: PromptIntent;
  userMessage: string;
  context: ContextResolutionResult;
  additionalInstructions?: string;
}

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  totalTokens: number;
}

export class PromptBuilder {
  /**
   * Build a complete prompt with context and intent
   */
  async buildPrompt(request: PromptRequest): Promise<BuiltPrompt> {
    const systemPrompt = this.buildSystemPrompt(request.intent);
    const contextSection = this.buildContextSection(request.context);
    const userSection = this.buildUserSection(request);

    const userPrompt = `${contextSection}\n\n${userSection}`;

    return {
      systemPrompt,
      userPrompt,
      totalTokens: this.estimateTokens(systemPrompt + userPrompt),
    };
  }

  /**
   * Build system prompt based on intent
   */
  private buildSystemPrompt(intent: PromptIntent): string {
    const basePrompt = `You are an expert coding assistant integrated into VS Code. You help developers write, understand, and improve their code.

Key capabilities:
- Understand and explain complex code
- Fix bugs and issues
- Refactor code for better quality
- Write tests and documentation
- Implement new features
- Provide architectural guidance`;

    const intentSpecific = this.getIntentInstructions(intent);

    return `${basePrompt}

${intentSpecific}

IMPORTANT RULES:
1. Always provide complete, working code - no placeholders or "..." omissions
2. Preserve existing code structure and style
3. Include necessary imports and dependencies
4. Explain your reasoning briefly
5. For edits, use <SEARCH> and <REPLACE> blocks to show exact changes
6. Be concise but thorough`;
  }

  /**
   * Get intent-specific instructions
   */
  private getIntentInstructions(intent: PromptIntent): string {
    const instructions: Record<PromptIntent, string> = {
      explain: `Your task is to EXPLAIN code clearly and thoroughly.
- Break down complex logic into simple terms
- Explain the purpose and behavior
- Highlight potential issues or improvements
- Use examples when helpful`,

      fix: `Your task is to FIX bugs and issues in the code.
- Identify the root cause of the problem
- Provide a complete fix, not just a patch
- Explain why the bug occurred
- Suggest how to prevent similar issues
- Use <SEARCH> and <REPLACE> blocks for precise edits`,

      refactor: `Your task is to REFACTOR code for better quality.
- Improve readability and maintainability
- Apply design patterns appropriately
- Optimize performance where needed
- Maintain the same functionality
- Explain each improvement
- Use <SEARCH> and <REPLACE> blocks for changes`,

      test: `Your task is to WRITE TESTS for the code.
- Write comprehensive test cases
- Cover edge cases and error scenarios
- Use the project's testing framework
- Include setup and teardown if needed
- Aim for high coverage
- Make tests readable and maintainable`,

      document: `Your task is to WRITE DOCUMENTATION for the code.
- Add clear JSDoc/docstring comments
- Document parameters, returns, and exceptions
- Include usage examples
- Explain complex logic
- Follow the project's documentation style`,

      implement: `Your task is to IMPLEMENT new functionality.
- Write clean, production-ready code
- Follow the project's patterns and style
- Include error handling
- Add comments for complex parts
- Consider edge cases
- Make code testable`,

      edit: `Your task is to EDIT the code according to instructions.
- Make precise, surgical changes
- Preserve surrounding code exactly
- Use <SEARCH> and <REPLACE> blocks to show changes
- Format: 
  <SEARCH>
  exact code to find (must match exactly)
  </SEARCH>
  <REPLACE>
  new code to replace with
  </REPLACE>
- Include enough context to uniquely identify the location
- Make multiple SEARCH/REPLACE blocks if needed`,

      chat: `Your task is to CHAT and assist with general questions.
- Be helpful and informative
- Reference the provided code context
- Suggest best practices
- Ask clarifying questions if needed`,
    };

    return instructions[intent];
  }

  /**
   * Build context section from collected context
   */
  private buildContextSection(context: ContextResolutionResult): string {
    if (context.items.length === 0) {
      return "# Code Context\n\nNo specific context available.";
    }

    let section = `# Code Context\n\nI'm working in VS Code with the following context:\n\n`;

    // Group items by type
    const byType = context.items.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {} as Record<string, ContextItem[]>);

    // Add selection first (highest priority)
    if (byType.selection) {
      section += this.formatSelection(byType.selection[0]);
    }

    // Add current file
    if (byType.file) {
      const currentFile = byType.file.find(
        (f) => f.path === vscode.window.activeTextEditor?.document.uri.fsPath
      );
      if (currentFile) {
        section += this.formatFile(currentFile, "Current File");
        byType.file = byType.file.filter((f) => f !== currentFile);
      }
    }

    // Add diagnostics
    if (byType.diagnostic) {
      section += this.formatDiagnostics(byType.diagnostic);
    }

    // Add other open files
    if (byType.file && byType.file.length > 0) {
      section += `\n## Other Open Files (${byType.file.length})\n\n`;
      byType.file.forEach((file) => {
        section += this.formatFile(file, "Open File");
      });
    }

    // Add workspace structure
    if (byType.workspace) {
      section += this.formatWorkspace(byType.workspace[0]);
    }

    return section;
  }

  /**
   * Format selection context
   */
  private formatSelection(item: ContextItem): string {
    const fileName = item.path ? this.getFileName(item.path) : "Unknown";
    const lineInfo =
      item.metadata?.startLine !== undefined
        ? ` (lines ${item.metadata.startLine + 1}-${item.metadata.endLine + 1})`
        : "";

    return `## Selected Code${lineInfo}
File: \`${fileName}\`

\`\`\`${item.language || "text"}
${item.content}
\`\`\`

`;
  }

  /**
   * Format file context
   */
  private formatFile(item: ContextItem, label: string): string {
    const fileName = item.path ? this.getFileName(item.path) : "Unknown";
    const lineCount = item.metadata?.lineCount || 0;
    const size = item.metadata?.size || 0;

    return `## ${label}: \`${fileName}\`
Lines: ${lineCount} | Size: ${this.formatSize(size)}

\`\`\`${item.language || "text"}
${item.content}
\`\`\`

`;
  }

  /**
   * Format diagnostics
   */
  private formatDiagnostics(items: ContextItem[]): string {
    const totalErrors = items.reduce(
      (sum, item) => sum + (item.metadata?.errorCount || 0),
      0
    );
    const totalWarnings = items.reduce(
      (sum, item) => sum + (item.metadata?.warningCount || 0),
      0
    );

    let section = `\n## Current Issues
Errors: ${totalErrors} | Warnings: ${totalWarnings}

`;

    items.forEach((item) => {
      section += `\`\`\`\n${item.content}\n\`\`\`\n\n`;
    });

    return section;
  }

  /**
   * Format workspace structure
   */
  private formatWorkspace(item: ContextItem): string {
    return `\n## Workspace Structure
${item.content}

`;
  }

  /**
   * Build user section
   */
  private buildUserSection(request: PromptRequest): string {
    let section = `# User Request\n\n${request.userMessage}`;

    if (request.additionalInstructions) {
      section += `\n\n## Additional Instructions\n${request.additionalInstructions}`;
    }

    return section;
  }

  /**
   * Estimate tokens (rough)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get file name from path
   */
  private getFileName(filePath: string): string {
    return filePath.split(/[/\\]/).pop() || "Unknown";
  }

  /**
   * Format file size
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  /**
   * Build a simple chat prompt without heavy context
   */
  buildChatPrompt(
    message: string,
    previousMessages?: Array<{ role: string; content: string }>
  ): BuiltPrompt {
    const systemPrompt = `You are a helpful coding assistant. You help developers understand code, fix bugs, and implement features.`;

    let userPrompt = message;

    if (previousMessages && previousMessages.length > 0) {
      const history = previousMessages
        .slice(-5) // Last 5 messages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n\n");

      userPrompt = `Previous conversation:\n${history}\n\nCurrent message:\n${message}`;
    }

    return {
      systemPrompt,
      userPrompt,
      totalTokens: this.estimateTokens(systemPrompt + userPrompt),
    };
  }

  /**
   * Build prompt for code editing with SEARCH/REPLACE format
   */
  buildEditPrompt(
    instruction: string,
    currentCode: string,
    filePath: string
  ): BuiltPrompt {
    const fileName = this.getFileName(filePath);
    const systemPrompt = this.buildSystemPrompt("edit");

    const userPrompt = `# File: ${fileName}

## Current Code:
\`\`\`
${currentCode}
\`\`\`

## Instruction:
${instruction}

Please provide your changes using SEARCH/REPLACE blocks. Make sure the SEARCH block matches the existing code exactly.`;

    return {
      systemPrompt,
      userPrompt,
      totalTokens: this.estimateTokens(systemPrompt + userPrompt),
    };
  }
}
