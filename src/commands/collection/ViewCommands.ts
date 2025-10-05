// src/commands/collection/ViewCommands.ts
import * as vscode from "vscode";
import { ServiceContainer } from "../../infrastructure/di/ServiceContainer";
import { CollectionProvider } from "../../providers/CollectionProvider";
import { INotificationService } from "../../application/collection/service/CollectionApplicationService";
import { IWorkspaceService } from "../../infrastructure/collection/workspace/WorkspaceService";

export function registerViewCommands(context: vscode.ExtensionContext): void {
  const container = ServiceContainer.getInstance();
  const treeDataProvider =
    container.resolve<CollectionProvider>("CollectionProvider");
  const notificationService = container.resolve<INotificationService>(
    "INotificationService"
  );
  const workspaceService =
    container.resolve<IWorkspaceService>("IWorkspaceService");

  const commands = [
    // Refresh
    {
      command: "orbit-ai.refreshCollectionView",
      handler: () =>
        handleRefreshCollectionView(treeDataProvider, notificationService),
    },

    // Search
    {
      command: "orbit-ai.showSearchInput",
      handler: () =>
        handleShowSearchInput(treeDataProvider, notificationService),
    },
    {
      command: "orbit-ai.clearSearch",
      handler: () => handleClearSearch(treeDataProvider, notificationService),
    },

    // View Mode
    {
      command: "orbit-ai.toggleViewMode",
      handler: () =>
        handleToggleViewMode(
          treeDataProvider,
          workspaceService,
          notificationService
        ),
    },
  ];

  commands.forEach(({ command, handler }) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, handler)
    );
  });
}

function handleRefreshCollectionView(
  treeDataProvider: CollectionProvider,
  notificationService: INotificationService
): void {
  try {
    treeDataProvider.clearCache();
    treeDataProvider.refresh();

    const currentMode = treeDataProvider.getViewMode();
    const collectionCount = treeDataProvider.getCollectionCount();

    const modeDisplay = currentMode === "workspace" ? "workspace" : "global";
    notificationService.showInfo(
      `Collection view refreshed (${collectionCount} collections in ${modeDisplay} view)`
    );
  } catch (error) {
    notificationService.showError(
      `Failed to refresh view: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function handleShowSearchInput(
  treeDataProvider: CollectionProvider,
  notificationService: INotificationService
): Promise<void> {
  const searchTerm = await vscode.window.showInputBox({
    prompt: "Enter search term to filter files and collections",
    placeHolder: "Search files and collections...",
    title: "Search Files & Collections",
    value: treeDataProvider.getCurrentSearchTerm() || "",
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
    handleClearSearch(treeDataProvider, notificationService);
    return;
  }

  try {
    const searchResults = treeDataProvider.setSearchFilter(searchTerm.trim());

    if (searchResults.totalMatches === 0) {
      notificationService.showInfo(`No results found for "${searchTerm}"`);
    } else {
      const fileText = searchResults.fileMatches === 1 ? "file" : "files";
      const collectionText =
        searchResults.collectionMatches === 1 ? "collection" : "collections";

      notificationService.showInfo(
        `Found ${searchResults.fileMatches} ${fileText} and ${searchResults.collectionMatches} ${collectionText} matching "${searchTerm}"`
      );
    }
  } catch (error) {
    notificationService.showError(
      `Search failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

function handleClearSearch(
  treeDataProvider: CollectionProvider,
  notificationService: INotificationService
): void {
  try {
    const hadSearch = treeDataProvider.hasActiveSearch();

    treeDataProvider.clearSearch();

    if (hadSearch) {
      notificationService.showInfo("Search filter cleared");
    } else {
      notificationService.showInfo("No active search to clear");
    }
  } catch (error) {
    notificationService.showError(
      `Failed to clear search: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

function handleToggleViewMode(
  treeDataProvider: CollectionProvider,
  workspaceService: IWorkspaceService,
  notificationService: INotificationService
): void {
  try {
    const currentMode = treeDataProvider.getViewMode();
    const newMode = currentMode === "workspace" ? "global" : "workspace";

    if (newMode === "workspace" && !workspaceService.hasActiveWorkspace()) {
      vscode.window
        .showWarningMessage(
          "Cannot switch to workspace view: no active workspace found. Please open a folder or workspace first.",
          "Open Folder"
        )
        .then((choice) => {
          if (choice === "Open Folder") {
            vscode.commands.executeCommand("workbench.action.files.openFolder");
          }
        });
      return;
    }

    if (treeDataProvider.isInFileManagementMode()) {
      treeDataProvider.exitFileManagementMode();
    }

    treeDataProvider.clearSearch();
    treeDataProvider.switchViewMode(newMode);

    vscode.commands.executeCommand("setContext", "orbitAI.viewMode", newMode);

    const modeDisplay = newMode === "workspace" ? "Workspace" : "Global";
    notificationService.showInfo(`View mode: ${modeDisplay}`);
  } catch (error) {
    notificationService.showError("Failed to toggle view mode");
  }
}
