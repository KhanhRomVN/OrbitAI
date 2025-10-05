// src/commands/collection/CollectionMenuCommands.ts
import * as vscode from "vscode";
import { ServiceContainer } from "../../infrastructure/di/ServiceContainer";
import { CollectionApplicationService } from "../../application/collection/service/CollectionApplicationService";
import { CollectionService } from "../../domain/collection/services/CollectionService";

export function registerCollectionMenuCommands(
  context: vscode.ExtensionContext
): void {
  const container = ServiceContainer.getInstance();
  const commandHandler = container.resolve<CollectionApplicationService>(
    "CollectionApplicationService"
  );
  const collectionService =
    container.resolve<CollectionService>("CollectionService");

  // Show Collection Menu
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "orbit-ai.showCollectionMenu",
      async (collectionItem) => {
        await handleShowCollectionMenu(collectionItem, collectionService);
      }
    )
  );

  // Expand Collection
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "orbit-ai.expandCollection",
      async (collectionItem) => {
        await handleExpandCollection(collectionItem);
      }
    )
  );

  // Collapse Collection
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "orbit-ai.collapseCollection",
      async (collectionItem) => {
        await handleCollapseCollection(collectionItem);
      }
    )
  );

  // Copy Collection Content
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "orbit-ai.copyCollectionContent",
      async (collectionItem) => {
        await handleCopyCollectionContent(collectionItem, collectionService);
      }
    )
  );
}

// =============================================
// COMMAND HANDLERS
// =============================================

async function handleShowCollectionMenu(
  collectionItem: any,
  collectionService: CollectionService
): Promise<void> {
  const collectionId = collectionItem?.id || collectionItem?.collectionId;
  if (!collectionId) {
    vscode.window.showErrorMessage("Invalid collection selection");
    return;
  }

  try {
    const collection = collectionService.getCollectionById(collectionId);

    const menuOptions = [
      {
        label: `$(folder-opened) Open Collection Files`,
        description: `Open all ${collection.fileCount} files in editor`,
        action: "openFiles",
      },
      {
        label: `$(copy) Copy Collection Content`,
        description: "Copy all file paths and contents to clipboard",
        action: "copyContent",
      },
      {
        label: `$(add) Add Files to Collection`,
        description: "Select files to add to this collection",
        action: "addFiles",
      },
      {
        label: `$(remove) Remove Files from Collection`,
        description: "Select files to remove from this collection",
        action: "removeFiles",
      },
      {
        label: `$(edit) Rename Collection`,
        description: "Change the collection name",
        action: "rename",
      },
      {
        label: `$(trash) Delete Collection`,
        description: "Permanently delete this collection",
        action: "delete",
      },
    ];

    const choice = await vscode.window.showQuickPick(menuOptions, {
      placeHolder: `Actions for "${collection.name}"`,
      title: "Collection Menu",
      matchOnDescription: true,
    });

    if (!choice) return;

    // Execute the selected action
    const commandMap: { [key: string]: string } = {
      openFiles: "orbit-ai.openCollectionFiles",
      copyContent: "orbit-ai.copyCollectionContent",
      addFiles: "orbit-ai.addFilesToCollection",
      removeFiles: "orbit-ai.removeFilesFromCollection",
      rename: "orbit-ai.renameCollection",
      delete: "orbit-ai.deleteCollection",
    };

    const command = commandMap[choice.action];
    if (command) {
      await vscode.commands.executeCommand(command, collectionItem);
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to show collection menu: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function handleExpandCollection(collectionItem: any): Promise<void> {
  // TODO: Implement expand logic
  // This would reveal all files in the collection in the tree view
  vscode.window.showInformationMessage("Expand collection - To be implemented");
}

async function handleCollapseCollection(collectionItem: any): Promise<void> {
  // TODO: Implement collapse logic
  vscode.window.showInformationMessage(
    "Collapse collection - To be implemented"
  );
}

async function handleCopyCollectionContent(
  collectionItem: any,
  collectionService: CollectionService
): Promise<void> {
  const collectionId = collectionItem?.id || collectionItem?.collectionId;
  if (!collectionId) {
    vscode.window.showErrorMessage("Invalid collection selection");
    return;
  }

  try {
    const collection = collectionService.getCollectionById(collectionId);

    if (collection.fileCount === 0) {
      vscode.window.showWarningMessage(
        `Collection "${collection.name}" contains no files`
      );
      return;
    }

    // Show loading notification
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Copying contents of "${collection.name}"`,
        cancellable: true,
      },
      async (progress, token) => {
        try {
          const totalFiles = collection.fileCount;
          let processedFiles = 0;
          let clipboardContent = `Collection: ${collection.name}\n`;
          clipboardContent += `Files: ${totalFiles}\n`;
          clipboardContent += `${"=".repeat(50)}\n\n`;

          for (const fileUri of collection.files) {
            if (token.isCancellationRequested) {
              break;
            }

            try {
              const uri = vscode.Uri.parse(fileUri);
              const fileName = uri.fsPath.split(/[/\\]/).pop() || "unknown";

              // Update progress
              processedFiles++;
              progress.report({
                increment: (1 / totalFiles) * 100,
                message: `Processing ${fileName} (${processedFiles}/${totalFiles})`,
              });

              // Read file content
              try {
                const document = await vscode.workspace.openTextDocument(uri);
                const content = document.getText();

                clipboardContent += `File: ${fileName}\n`;
                clipboardContent += `Path: ${uri.fsPath}\n`;
                clipboardContent += `${"─".repeat(30)}\n`;
                clipboardContent += content;
                clipboardContent += `\n\n${"=".repeat(50)}\n\n`;
              } catch (fileError) {
                clipboardContent += `File: ${fileName}\n`;
                clipboardContent += `Path: ${uri.fsPath}\n`;
                clipboardContent += `Error: Could not read file content\n`;
                clipboardContent += `\n${"=".repeat(50)}\n\n`;
              }
            } catch (error) {
              // Skip invalid URIs
              continue;
            }
          }

          if (!token.isCancellationRequested) {
            // Copy to clipboard
            await vscode.env.clipboard.writeText(clipboardContent);

            vscode.window.showInformationMessage(
              `Copied contents of "${collection.name}" (${processedFiles} files) to clipboard`
            );
          } else {
            vscode.window.showWarningMessage("Copy operation was cancelled");
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to copy collection contents: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to copy collection contents: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
