// src/commands/collection/FileManagementCommands.ts
import * as vscode from "vscode";
import * as path from "path";
import { ServiceContainer } from "../../infrastructure/di/ServiceContainer";
import { CollectionApplicationService } from "../../application/collection/service/CollectionApplicationService";
import { CollectionProvider } from "../../providers/CollectionProvider";
import { IWorkspaceService } from "../../infrastructure/collection/workspace/WorkspaceService";
import { INotificationService } from "../../application/collection/service/CollectionApplicationService";
import { CollectionService } from "../../domain/collection/services/CollectionService";

export function registerFileManagementCommands(
  context: vscode.ExtensionContext
): void {
  const container = ServiceContainer.getInstance();
  const commandHandler = container.resolve<CollectionApplicationService>(
    "CollectionApplicationService"
  );
  const treeDataProvider =
    container.resolve<CollectionProvider>("CollectionProvider");
  const workspaceService =
    container.resolve<IWorkspaceService>("IWorkspaceService");
  const notificationService = container.resolve<INotificationService>(
    "INotificationService"
  );
  const collectionService =
    container.resolve<CollectionService>("CollectionService");

  const commands = [
    // File Management
    {
      command: "orbit-ai.addFilesToCollection",
      handler: (item: any) =>
        handleAddFilesToCollection(
          commandHandler,
          treeDataProvider,
          item,
          workspaceService,
          notificationService
        ),
    },
    {
      command: "orbit-ai.removeFilesFromCollection",
      handler: (item: any) =>
        handleRemoveFilesFromCollection(
          commandHandler,
          treeDataProvider,
          item,
          notificationService,
          collectionService
        ),
    },

    // File Selection
    {
      command: "orbit-ai.collection.toggleFileSelection",
      handler: (filePath: string) =>
        handleToggleFileSelection(treeDataProvider, filePath),
    },
    {
      command: "orbit-ai.collection.selectAllFiles",
      handler: () =>
        handleSelectAllFiles(treeDataProvider, notificationService),
    },
    {
      command: "orbit-ai.collection.deselectAllFiles",
      handler: () =>
        handleDeselectAllFiles(treeDataProvider, notificationService),
    },
    {
      command: "orbit-ai.collection.selectAllFilesInFolder",
      handler: (folderItem: any) =>
        handleSelectAllFilesInFolder(
          treeDataProvider,
          folderItem,
          notificationService,
          collectionService
        ),
    },
    {
      command: "orbit-ai.collection.unselectAllFilesInFolder",
      handler: (folderItem: any) =>
        handleUnselectAllFilesInFolder(
          treeDataProvider,
          folderItem,
          notificationService,
          collectionService
        ),
    },

    // File Management Mode
    {
      command: "orbit-ai.collection.confirmFileManagement",
      handler: () =>
        handleConfirmFileManagement(
          commandHandler,
          treeDataProvider,
          workspaceService,
          notificationService
        ),
    },
    {
      command: "orbit-ai.collection.cancelFileManagement",
      handler: () =>
        handleCancelFileManagement(treeDataProvider, notificationService),
    },

    // Search
    {
      command: "orbit-ai.collection.searchFiles",
      handler: () =>
        handleShowFileManagementSearch(treeDataProvider, notificationService),
    },
    {
      command: "orbit-ai.collection.clearSearch",
      handler: () =>
        handleClearFileManagementSearch(treeDataProvider, notificationService),
    },
  ];

  commands.forEach(({ command, handler }) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, handler)
    );
  });
}

// File Management Handlers
async function handleAddFilesToCollection(
  commandHandler: CollectionApplicationService,
  treeDataProvider: CollectionProvider,
  item: any,
  workspaceService: IWorkspaceService,
  notificationService: INotificationService
): Promise<void> {
  if (treeDataProvider.getViewMode() === "global") {
    notificationService.showWarning(
      "Cannot add files in global view. Switch to workspace view."
    );
    return;
  }

  const collectionId = item?.id || item?.collectionId;
  if (!collectionId) {
    notificationService.showError("Invalid collection selection");
    return;
  }

  if (!workspaceService.hasActiveWorkspace()) {
    notificationService.showWarning(
      "No active workspace found. Please open a folder or workspace first."
    );
    return;
  }

  treeDataProvider.enterFileManagementMode(collectionId, "add");

  const container = ServiceContainer.getInstance();
  const collectionService =
    container.resolve<CollectionService>("CollectionService");

  try {
    const collection = collectionService.getCollectionById(collectionId);

    if (collection.fileCount > 0) {
      notificationService.showInfo(
        `Managing files in "${collection.name}". ` +
          `${collection.fileCount} existing files are pre-selected. ` +
          `Uncheck files to remove them, check new files to add them, then click "Confirm".`
      );
    } else {
      notificationService.showInfo(
        'Adding files to collection. Click files to select them, then click "Confirm Add Selected".'
      );
    }
  } catch (error) {
    notificationService.showInfo(
      'Adding files to collection. Click files to select/deselect them, then click "Confirm Add Selected".'
    );
  }
}

async function handleRemoveFilesFromCollection(
  commandHandler: CollectionApplicationService,
  treeDataProvider: CollectionProvider,
  item: any,
  notificationService: INotificationService,
  collectionService: CollectionService
): Promise<void> {
  if (treeDataProvider.getViewMode() === "global") {
    notificationService.showWarning(
      "Cannot remove files in global view. Switch to workspace view."
    );
    return;
  }

  const collectionId = item?.id || item?.collectionId;
  if (!collectionId) {
    notificationService.showError("Invalid collection selection");
    return;
  }

  treeDataProvider.enterFileManagementMode(collectionId, "remove");

  notificationService.showInfo(
    'Removing files from collection. Select the files you want to REMOVE (they start unselected), then click "Confirm Remove Selected".'
  );
}

// File Selection Handlers
function handleToggleFileSelection(
  treeDataProvider: CollectionProvider,
  filePath: string
): void {
  if (!filePath) {
    return;
  }
  treeDataProvider.toggleFileSelection(filePath);
}

async function handleSelectAllFiles(
  treeDataProvider: CollectionProvider,
  notificationService: INotificationService
): Promise<void> {
  try {
    const previousCount = treeDataProvider.getSelectedFiles().length;
    await treeDataProvider.selectAllFiles();
    const newCount = treeDataProvider.getSelectedFiles().length;
    const addedCount = newCount - previousCount;

    if (addedCount > 0) {
      notificationService.showInfo(
        `Selected ${addedCount} additional files (${newCount} total)`
      );
    } else {
      notificationService.showInfo("All files are already selected");
    }
  } catch (error) {
    notificationService.showError(
      `Failed to select all files: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

function handleDeselectAllFiles(
  treeDataProvider: CollectionProvider,
  notificationService: INotificationService
): void {
  const previousCount = treeDataProvider.getSelectedFiles().length;
  treeDataProvider.deselectAllFiles();

  if (previousCount > 0) {
    notificationService.showInfo(`Deselected ${previousCount} files`);
  } else {
    notificationService.showInfo("No files were selected");
  }
}

function handleSelectAllFilesInFolder(
  treeDataProvider: CollectionProvider,
  folderItem: any,
  notificationService: INotificationService,
  collectionService: CollectionService
): void {
  try {
    const fileManagementState = treeDataProvider.getFileManagementState();

    let collectionId: string | null = null;
    let targetDirectoryPath: string | null = null;

    if (fileManagementState.collectionId) {
      collectionId = fileManagementState.collectionId;
    }

    if (folderItem?.treeNode) {
      if (folderItem.treeNode.isDirectory) {
        targetDirectoryPath = folderItem.treeNode.path;
      }
    }

    if (!collectionId) {
      notificationService.showError(
        "No active file management operation or invalid folder selection"
      );
      return;
    }

    try {
      const collection = collectionService.getCollectionById(collectionId);
    } catch (validationError) {
      notificationService.showError(
        `Collection not found. Please refresh and try again.`
      );
      return;
    }

    const selectedCount = treeDataProvider.selectAllFilesInFolder(
      collectionId,
      targetDirectoryPath || undefined
    );

    if (selectedCount > 0) {
      const locationInfo = targetDirectoryPath
        ? ` in directory "${targetDirectoryPath}"`
        : " in current folder";
      notificationService.showInfo(
        `Selected ${selectedCount} files${locationInfo}`
      );
    } else {
      const locationInfo = targetDirectoryPath
        ? ` in directory "${targetDirectoryPath}"`
        : " in this folder";
      notificationService.showInfo(`No files found to select${locationInfo}`);
    }
  } catch (error) {
    notificationService.showError(
      `Failed to select files: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

function handleUnselectAllFilesInFolder(
  treeDataProvider: CollectionProvider,
  folderItem: any,
  notificationService: INotificationService,
  collectionService: CollectionService
): void {
  try {
    const fileManagementState = treeDataProvider.getFileManagementState();

    let collectionId: string | null = null;

    if (fileManagementState.collectionId) {
      collectionId = fileManagementState.collectionId;
    }

    if (!collectionId && folderItem) {
      if (folderItem.collectionId) {
        collectionId = folderItem.collectionId;
      } else if (
        folderItem.id &&
        !folderItem.id.includes("-add") &&
        !folderItem.id.includes("-remove")
      ) {
        collectionId = folderItem.id;
      }
    }

    if (!collectionId) {
      notificationService.showError(
        "No active file management operation or invalid folder selection"
      );
      return;
    }

    try {
      const collection = collectionService.getCollectionById(collectionId);
    } catch (validationError) {
      notificationService.showError(
        `Collection not found. Please refresh and try again.`
      );
      return;
    }

    const unselectedCount =
      treeDataProvider.unselectAllFilesInFolder(collectionId);
    if (unselectedCount > 0) {
      notificationService.showInfo(
        `Unselected ${unselectedCount} files in current folder`
      );
    } else {
      notificationService.showInfo("No files were selected to unselect");
    }
  } catch (error) {
    notificationService.showError(
      `Failed to unselect files: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// File Management Mode Handlers
async function handleConfirmFileManagement(
  commandHandler: CollectionApplicationService,
  treeDataProvider: CollectionProvider,
  workspaceService: IWorkspaceService,
  notificationService: INotificationService
): Promise<void> {
  const selectedFiles = treeDataProvider.getSelectedFiles();
  const managementState = treeDataProvider.getFileManagementState();

  if (managementState.mode === "normal" || !managementState.collectionId) {
    notificationService.showWarning("No active file management operation");
    return;
  }

  if (selectedFiles.length === 0) {
    if (managementState.mode === "add") {
      const choice = await notificationService.showConfirmDialog(
        "No files selected. This will remove all files from the collection. Continue?",
        "Remove All",
        "Cancel"
      );

      if (choice !== "Remove All") {
        return;
      }
    } else {
      notificationService.showWarning(
        "No files selected to remove from collection"
      );
      return;
    }
  }

  const currentWorkspace = workspaceService.getCurrentWorkspaceFolder();
  if (!currentWorkspace) {
    notificationService.showError("No active workspace found");
    return;
  }

  const selectedUris = selectedFiles.map((relativePath) => {
    const absolutePath = path.resolve(currentWorkspace, relativePath);
    return vscode.Uri.file(absolutePath).toString();
  });

  try {
    if (managementState.mode === "add") {
      await commandHandler.handleAddFilesToCollection({
        collectionId: managementState.collectionId,
        fileUris: selectedUris,
        validateFiles: true,
        mode: "sync",
      });
    } else if (managementState.mode === "remove") {
      await commandHandler.handleRemoveFilesFromCollection({
        collectionId: managementState.collectionId,
        fileUris: selectedUris,
      });
    }

    treeDataProvider.exitFileManagementMode();
  } catch (error) {
    notificationService.showError(
      `Failed to ${managementState.mode} files: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

function handleCancelFileManagement(
  treeDataProvider: CollectionProvider,
  notificationService: INotificationService
): void {
  const managementState = treeDataProvider.getFileManagementState();

  if (managementState.mode === "normal") {
    notificationService.showInfo(
      "No active file management operation to cancel"
    );
    return;
  }

  treeDataProvider.exitFileManagementMode();
  notificationService.showInfo("File management operation cancelled");
}

// Search Handlers
async function handleShowFileManagementSearch(
  treeDataProvider: CollectionProvider,
  notificationService: INotificationService
): Promise<void> {
  const currentSearchTerm = treeDataProvider.getFileManagementSearchTerm();

  const searchTerm = await vscode.window.showInputBox({
    prompt: "Enter search term to filter files",
    placeHolder: "Search files by name...",
    title: "Search Files in Workspace",
    value: currentSearchTerm || "",
    validateInput: (value) => {
      if (value && value.length > 100) {
        return "Search term too long (max 100 characters)";
      }
      return null;
    },
  });

  if (searchTerm === undefined) {
    return;
  }

  if (!searchTerm.trim()) {
    treeDataProvider.clearFileManagementSearch();
    notificationService.showInfo("Search filter cleared");
  } else {
    treeDataProvider.setFileManagementSearchTerm(searchTerm.trim());
    notificationService.showInfo(
      `Searching for files containing: "${searchTerm}"`
    );
  }
}

function handleClearFileManagementSearch(
  treeDataProvider: CollectionProvider,
  notificationService: INotificationService
): void {
  if (treeDataProvider.hasFileManagementSearch()) {
    treeDataProvider.clearFileManagementSearch();
    notificationService.showInfo("Search cleared");
  } else {
    notificationService.showInfo("No active search to clear");
  }
}
