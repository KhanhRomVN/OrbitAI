import * as vscode from "vscode";
import { CollectionService } from "../domain/collection/services/CollectionService";

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  totalTokens: number;
}

export class PromptBuilder {
  constructor(private readonly collectionService: CollectionService) {}

  async buildPrompt(
    collectionId: string | null,
    userMessage: string,
    currentFileContent?: string
  ): Promise<BuiltPrompt> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = await this.buildUserPrompt(
      collectionId,
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
    return `You are an expert coding assistant. Follow these rules:

1. Provide complete, working code - no placeholders or "..." omissions
2. Preserve existing code structure and style
3. Include necessary imports and dependencies
4. Explain your reasoning briefly
5. For edits, use <SEARCH> and <REPLACE> blocks to show exact changes
6. Be concise but thorough
7. Focus on the code provided in the context`;
  }

  private async buildUserPrompt(
    collectionId: string | null,
    userMessage: string,
    currentFileContent?: string
  ): Promise<string> {
    let contextContent = "";

    // Add current file content if available
    if (currentFileContent) {
      contextContent += `CURRENT FILE CONTENT:\n\`\`\`\n${currentFileContent}\n\`\`\`\n\n`;
    }

    // Add collection content if specified
    if (collectionId) {
      try {
        const collection =
          this.collectionService.getCollectionById(collectionId);
        contextContent += await this.buildCollectionContent(collection);
      } catch (error) {
        console.warn("Failed to load collection:", error);
      }
    }

    return `${contextContent}USER REQUEST: ${userMessage}`;
  }

  private async buildCollectionContent(collection: any): Promise<string> {
    let content = `COLLECTION: ${collection.name}\n`;
    content += `Files: ${collection.fileCount}\n\n`;

    for (const fileUri of collection.files) {
      try {
        const uri = vscode.Uri.parse(fileUri);
        const document = await vscode.workspace.openTextDocument(uri);
        const fileName = uri.fsPath.split(/[/\\]/).pop() || "unknown";

        content += `FILE: ${fileName}\n`;
        content += `PATH: ${uri.fsPath}\n`;
        content += `CONTENT:\n\`\`\`\n${document.getText()}\n\`\`\`\n\n`;
      } catch (error) {
        content += `FILE: ${fileUri} (Unable to read)\n\n`;
      }
    }

    return content;
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
