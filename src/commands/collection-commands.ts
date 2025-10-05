// src/commands/collection/CollectionCommands.ts
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

  // Refresh Collections
  context.subscriptions.push(
    vscode.commands.registerCommand("orbit-ai-collections.refresh", () =>
      treeDataProvider.refresh()
    )
  );
}

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
