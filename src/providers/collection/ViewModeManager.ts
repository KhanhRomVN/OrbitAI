// src/providers/collection/ViewModeManager.ts
export class ViewModeManager {
  private viewMode: "workspace" | "global" = "workspace";

  getViewMode(): "workspace" | "global" {
    return this.viewMode;
  }

  setViewMode(mode: "workspace" | "global"): void {
    this.viewMode = mode;
  }

  isWorkspaceMode(): boolean {
    return this.viewMode === "workspace";
  }

  isGlobalMode(): boolean {
    return this.viewMode === "global";
  }

  toggleViewMode(): "workspace" | "global" {
    this.viewMode = this.viewMode === "workspace" ? "global" : "workspace";

    return this.viewMode;
  }
}
