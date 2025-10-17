// src/services/collection-service.ts
import * as vscode from "vscode";
import {
  CopyPathWithCodeAPI,
  CollectionInfo,
  CollectionContent,
} from "copy-path-with-code";

export class CollectionService {
  private api: CopyPathWithCodeAPI | null = null;

  constructor() {
    this.initializeAPI();
  }

  private async initializeAPI(): Promise<void> {
    try {
      const extension = vscode.extensions.getExtension(
        "khanhromvn.copy-path-with-code"
      );

      if (!extension) {
        console.log("[ZenChat] Copy Path with Code extension not found");
        return;
      }

      if (!extension.isActive) {
        await extension.activate();
      }

      this.api = extension.exports as CopyPathWithCodeAPI;
      console.log("[ZenChat] ✓ Connected to Copy Path with Code API");
    } catch (error) {
      console.error(
        "[ZenChat] Failed to initialize Copy Path with Code API:",
        error
      );
    }
  }

  /**
   * Lấy danh sách collections từ workspace hiện tại
   */
  async getCollections(): Promise<CollectionInfo[]> {
    if (!this.api) {
      await this.initializeAPI();
    }

    if (!this.api) {
      console.warn("[ZenChat] Copy Path with Code API not available");
      return [];
    }

    try {
      const collections = await this.api.getCollections();
      console.log(`[ZenChat] Retrieved ${collections.length} collections`);
      return collections;
    } catch (error) {
      console.error("[ZenChat] Failed to get collections:", error);
      return [];
    }
  }

  /**
   * Lấy toàn bộ nội dung của một collection
   */
  async getCollectionContent(
    collectionId: string
  ): Promise<CollectionContent | null> {
    if (!this.api) {
      await this.initializeAPI();
    }

    if (!this.api) {
      console.warn("[ZenChat] Copy Path with Code API not available");
      return null;
    }

    try {
      const content = await this.api.copyCollectionContent(collectionId);
      console.log(
        `[ZenChat] Retrieved content for collection "${content.collectionName}" (${content.fileCount} files)`
      );
      return content;
    } catch (error) {
      console.error("[ZenChat] Failed to get collection content:", error);
      return null;
    }
  }

  /**
   * Format collection content để đưa vào prompt
   */
  formatCollectionForPrompt(content: CollectionContent): string {
    let formatted = `\n\n=== COLLECTION CONTEXT: ${content.collectionName} ===\n`;
    formatted += `Total Files: ${content.fileCount}\n`;
    formatted += `\n`;

    // Thêm content của từng file
    for (const file of content.files) {
      formatted += `File: ${file.name}\n`;
      formatted += `Path: ${file.path}\n`;
      formatted += `${"─".repeat(50)}\n`;
      formatted += file.content;
      formatted += `\n\n${"=".repeat(50)}\n\n`;
    }

    // Thêm thông báo về failed files (nếu có)
    if (content.failedFiles.length > 0) {
      formatted += `\nFailed to read ${content.failedFiles.length} file(s):\n`;
      content.failedFiles.forEach((failed) => {
        formatted += `- ${failed.name}: ${failed.error}\n`;
      });
    }

    formatted += `\n=== END OF COLLECTION CONTEXT ===\n\n`;

    return formatted;
  }

  /**
   * Kiểm tra API có available không
   */
  isAvailable(): boolean {
    return this.api !== null;
  }
}
