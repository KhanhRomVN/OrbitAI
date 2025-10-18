import * as vscode from "vscode";

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  totalTokens: number;
}

export class PromptBuilder {
  constructor() {}

  async buildPrompt(
    userMessage: string,
    currentFileContent?: string
  ): Promise<BuiltPrompt> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = await this.buildUserPrompt(
      userMessage,
      currentFileContent
    );

    return {
      systemPrompt,
      userPrompt,
      totalTokens: this.estimateTokens(systemPrompt + userPrompt),
    };
  }

  private buildSystemPrompt(): string {
    const basePrompt = `You are DeepSeek, an expert AI coding assistant integrated into VS Code through ZenChat extension.

CORE IDENTITY & CAPABILITIES:
- Expert in multiple programming languages, frameworks, and best practices
- Can understand context from code files, analyze requirements, and provide solutions
- Specialized in code review, debugging, refactoring, testing, and documentation
- Always prioritize code quality, security, and maintainability

CODING STANDARDS & RULES:
1. Provide complete, working code - NEVER use placeholders like "...", "// rest of code", or incomplete implementations
2. Preserve existing code structure, style, indentation, and formatting exactly as provided
3. Include all necessary imports, dependencies, and type definitions
4. When making changes, use <SEARCH></SEARCH> and <REPLACE></REPLACE> blocks to show exact modifications:
   - <SEARCH> must contain the EXACT code to be replaced (including whitespace)
   - <REPLACE> contains the new code
   - Each block must be complete and unambiguous
5. Explain your reasoning and approach before providing code
6. For complex changes, break down the solution into clear steps
7. Always consider edge cases, error handling, and potential issues
8. Follow the language-specific conventions and best practices
9. When reviewing code from collections, analyze ALL provided files for context

RESPONSE FORMAT:
1. Brief analysis of the request and current code (if applicable)
2. Proposed solution approach
3. Code implementation with <SEARCH>/<REPLACE> blocks or complete new code
4. Explanation of key changes and why they were made
5. Any warnings, caveats, or additional recommendations

IMPORTANT CONSTRAINTS:
- Focus ONLY on the code and files provided in the context
- Do not make assumptions about code not shown
- Ask for clarification if requirements are ambiguous
- If you need to see other files for better context, explicitly request them
- Always verify your code syntax before responding
- Be concise but thorough - quality over quantity

Remember: You have access to the full context of selected collections, so use that information to provide contextually aware solutions.`;

    // Kiểm tra user locale để thêm language instruction
    const userLocale = vscode.env.language;
    let languageInstruction = "";

    if (userLocale.startsWith("vi")) {
      languageInstruction = `\n\nLANGUAGE: Respond in Vietnamese for explanations, but keep code comments and variable names in English.`;
    }

    return basePrompt + languageInstruction;
  }

  private async buildUserPrompt(
    userMessage: string,
    currentFileContent?: string
  ): Promise<string> {
    let contextContent = "";

    // Add current file content if available
    if (currentFileContent) {
      contextContent += `CURRENT FILE CONTENT:\n\`\`\`\n${currentFileContent}\n\`\`\`\n\n`;
    }

    return `${contextContent}USER REQUEST: ${userMessage}`;
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
