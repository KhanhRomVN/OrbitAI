// src/commands/collection-commands.ts
import * as vscode from "vscode";
import { ServiceContainer } from "../infrastructure/di/ServiceContainer";
import { CollectionApplicationService } from "../application/collection/service/CollectionApplicationService";
import { CollectionProvider } from "../providers/CollectionProvider";
import { INotificationService } from "../application/collection/service/CollectionApplicationService";
import { IWorkspaceService } from "../infrastructure/collection/workspace/WorkspaceService";
import { CollectionService } from "../domain/collection/services/CollectionService";

export function registerCollectionCommands(
  context: vscode.ExtensionContext
): void {
  const container = ServiceContainer.getInstance();
  const commandHandler = container.resolve<CollectionApplicationService>(
    "CollectionApplicationService"
  );
  const treeDataProvider =
    container.resolve<CollectionProvider>("CollectionProvider");
  const notificationService = container.resolve<INotificationService>(
    "INotificationService"
  );
  const workspaceService =
    container.resolve<IWorkspaceService>("IWorkspaceService");
  const collectionService =
    container.resolve<CollectionService>("CollectionService");

  // Create Collection
  context.subscriptions.push(
    vscode.commands.registerCommand("orbit-ai.createCollection", () =>
      handleCreateCollection(
        commandHandler,
        treeDataProvider,
        workspaceService,
        notificationService
      )
    )
  );

  // Delete Collection
  context.subscriptions.push(
    vscode.commands.registerCommand("orbit-ai.deleteCollection", (item) =>
      handleDeleteCollection(
        commandHandler,
        item,
        notificationService,
        collectionService
      )
    )
  );

  // Rename Collection
  context.subscriptions.push(
    vscode.commands.registerCommand("orbit-ai.renameCollection", (item) =>
      handleRenameCollection(
        commandHandler,
        item,
        notificationService,
        collectionService
      )
    )
  );

  // Show Collection Menu
  context.subscriptions.push(
    vscode.commands.registerCommand("orbit-ai.showCollectionMenu", (item) =>
      handleShowCollectionMenu(
        commandHandler,
        item,
        notificationService,
        collectionService
      )
    )
  );

  // Expand Collection
  context.subscriptions.push(
    vscode.commands.registerCommand("orbit-ai.expandCollection", (item) =>
      handleExpandCollection(item, treeDataProvider, notificationService)
    )
  );

  // Collapse Collection
  context.subscriptions.push(
    vscode.commands.registerCommand("orbit-ai.collapseCollection", (item) =>
      handleCollapseCollection(item, treeDataProvider, notificationService)
    )
  );

  // Copy Collection Content
  context.subscriptions.push(
    vscode.commands.registerCommand("orbit-ai.copyCollectionContent", (item) =>
      handleCopyCollectionContent(item, notificationService, collectionService)
    )
  );
}

// =============================================
// COLLECTION CRUD HANDLERS
// =============================================

async function handleCreateCollection(
  commandHandler: CollectionApplicationService,
  treeDataProvider: CollectionProvider,
  workspaceService: IWorkspaceService,
  notificationService: INotificationService
): Promise<void> {
  // Check view mode
  if (treeDataProvider.getViewMode() === "global") {
    notificationService.showWarning(
      "Cannot create collections in global view. Switch to workspace view."
    );
    return;
  }

  // Check workspace
  if (!workspaceService.hasActiveWorkspace()) {
    const choice = await notificationService.showConfirmDialog(
      "Cannot create collections without an active workspace. Please open a folder or workspace first.",
      "Open Folder"
    );
    if (choice === "Open Folder") {
      vscode.commands.executeCommand("workbench.action.files.openFolder");
    }
    return;
  }

  // Exit file management mode if active
  if (treeDataProvider.isInFileManagementMode()) {
    treeDataProvider.exitFileManagementMode();
  }

  // Get collection name
  const name = await vscode.window.showInputBox({
    prompt: "Enter collection name",
    placeHolder: "My Code Collection",
    title: "Create New Collection",
    validateInput: (value) => {
      if (!value.trim()) {
        return "Collection name cannot be empty";
      }
      if (value.length > 100) {
        return "Collection name cannot exceed 100 characters";
      }
      if (/[<>:"/\\|?*]/.test(value)) {
        return 'Collection name contains forbidden characters: < > : " / \\ | ? *';
      }
      return null;
    },
  });

  if (!name) return;

  // Get open editors
  const openEditors = vscode.window.visibleTextEditors
    .filter((editor) => editor.document.uri.scheme === "file")
    .map((editor) => editor.document.uri.toString());

  // Ask about including open files
  const options = [
    {
      label: "Create empty collection",
      description: "Start with an empty collection",
    },
    {
      label: `Add ${openEditors.length} open file${
        openEditors.length !== 1 ? "s" : ""
      }`,
      description: "Include currently open files",
    },
  ];

  const choice = await vscode.window.showQuickPick(options, {
    placeHolder: "Include files in collection?",
    title: `Creating collection "${name}"`,
  });

  if (!choice) return;

  const includeOpenFiles = choice.label.includes("Add");
  const currentWorkspace = workspaceService.getCurrentWorkspaceFolder();

  await commandHandler.handleCreateCollection({
    name: name.trim(),
    workspaceFolder: currentWorkspace,
    includeOpenFiles,
    openFileUris: includeOpenFiles ? openEditors : [],
  });

  const provider = (global as any).webviewProvider;
  const container = ServiceContainer.getInstance();
  const collectionService =
    container.resolve<CollectionService>("CollectionService");

  if (provider && provider.updateCollectionsList) {
    provider.updateCollectionsList(collectionService.getAllCollections());
  }
}

async function handleDeleteCollection(
  commandHandler: CollectionApplicationService,
  item: any,
  notificationService: INotificationService,
  collectionService: CollectionService
): Promise<void> {
  const collectionId = item?.id || item?.collectionId;
  if (!collectionId) {
    notificationService.showError("Invalid collection selection");
    return;
  }

  try {
    const collection = collectionService.getCollectionById(collectionId);
    const confirmChoice = await notificationService.showConfirmDialog(
      `Are you sure you want to delete collection "${collection.name}"? This action cannot be undone.`,
      "Delete",
      "Cancel"
    );

    if (confirmChoice === "Delete") {
      await commandHandler.handleDeleteCollection({
        collectionId,
        confirmDelete: true,
      });
    }
  } catch (error) {
    notificationService.showError(
      `Failed to delete collection: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function handleRenameCollection(
  commandHandler: CollectionApplicationService,
  item: any,
  notificationService: INotificationService,
  collectionService: CollectionService
): Promise<void> {
  const collectionId = item?.id || item?.collectionId;
  if (!collectionId) {
    notificationService.showError("Invalid collection selection");
    return;
  }

  try {
    const collection = collectionService.getCollectionById(collectionId);
    const newName = await vscode.window.showInputBox({
      prompt: "Enter new collection name",
      value: collection.name,
      title: `Rename Collection "${collection.name}"`,
      validateInput: (value) => {
        if (!value.trim()) {
          return "Collection name cannot be empty";
        }
        if (value.length > 100) {
          return "Collection name cannot exceed 100 characters";
        }
        if (/[<>:"/\\|?*]/.test(value)) {
          return 'Collection name contains forbidden characters: < > : " / \\ | ? *';
        }
        if (value === collection.name) {
          return "Please enter a different name";
        }
        return null;
      },
    });

    if (newName) {
      await commandHandler.handleRenameCollection({
        collectionId,
        newName: newName.trim(),
      });
    }
  } catch (error) {
    notificationService.showError(
      `Failed to rename collection: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// =============================================
// COLLECTION MENU HANDLERS
// =============================================

async function handleShowCollectionMenu(
  commandHandler: CollectionApplicationService,
  item: any,
  notificationService: INotificationService,
  collectionService: CollectionService
): Promise<void> {
  const collectionId = item?.id || item?.collectionId;
  if (!collectionId) {
    notificationService.showError("Invalid collection selection");
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
      await vscode.commands.executeCommand(command, item);
    }
  } catch (error) {
    notificationService.showError(
      `Failed to show collection menu: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function handleExpandCollection(
  item: any,
  treeDataProvider: CollectionProvider,
  notificationService: INotificationService
): Promise<void> {
  const collectionId = item?.id || item?.collectionId;
  if (!collectionId) {
    notificationService.showError("Invalid collection selection");
    return;
  }

  // Trigger refresh to expand the collection
  treeDataProvider.refresh();

  notificationService.showInfo("Collection expanded");
}

async function handleCollapseCollection(
  item: any,
  treeDataProvider: CollectionProvider,
  notificationService: INotificationService
): Promise<void> {
  const collectionId = item?.id || item?.collectionId;
  if (!collectionId) {
    notificationService.showError("Invalid collection selection");
    return;
  }

  // Trigger refresh to collapse the collection
  treeDataProvider.refresh();

  notificationService.showInfo("Collection collapsed");
}

async function handleCopyCollectionContent(
  item: any,
  notificationService: INotificationService,
  collectionService: CollectionService
): Promise<void> {
  const collectionId = item?.id || item?.collectionId;
  if (!collectionId) {
    notificationService.showError("Invalid collection selection");
    return;
  }

  try {
    const collection = collectionService.getCollectionById(collectionId);

    if (collection.fileCount === 0) {
      notificationService.showWarning(
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

            notificationService.showSuccess(
              `Copied contents of "${collection.name}" (${processedFiles} files) to clipboard`
            );
          } else {
            notificationService.showWarning("Copy operation was cancelled");
          }
        } catch (error) {
          notificationService.showError(
            `Failed to copy collection contents: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    );
  } catch (error) {
    notificationService.showError(
      `Failed to copy collection contents: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
