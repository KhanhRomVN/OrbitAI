// src/webview/settings-provider.ts
import * as vscode from "vscode";

export class SettingsProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "zenchat.settingsView";
  private _view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly context: vscode.ExtensionContext
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Gửi trạng thái hiện tại khi webview load
    this.sendCurrentSettings();

    // Handle messages từ webview
    webviewView.webview.onDidReceiveMessage((data) => {
      this.handleMessage(data);
    });
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case "updateSetting":
        this.updateSetting(data.key, data.value);
        break;

      case "requestSettings":
        this.sendCurrentSettings();
        break;
    }
  }

  private async updateSetting(key: string, value: any): Promise<void> {
    await this.context.globalState.update(key, value);

    // Broadcast setting change đến các components khác nếu cần
    if (key === "zenchat.enableContext") {
      console.log(
        `[ZenChat Settings] Context ${value ? "enabled" : "disabled"}`
      );

      // Notify webview provider
      const provider = (global as any).webviewProvider;
      if (provider) {
        provider.updateContextEnabled(value);
      }
    }

    this.sendCurrentSettings();
  }

  private sendCurrentSettings(): void {
    if (!this._view) return;

    const enableContext = this.context.globalState.get<boolean>(
      "zenchat.enableContext",
      false
    );

    this._view.webview.postMessage({
      type: "settingsUpdate",
      settings: {
        enableContext: enableContext,
      },
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZenChat Settings</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            padding: 12px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            font-size: 13px;
        }

        .setting-group {
            margin-bottom: 20px;
        }

        .setting-group-title {
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--vscode-foreground);
            font-size: 11px;
            text-transform: uppercase;
            opacity: 0.8;
        }

        .setting-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .setting-item:last-child {
            border-bottom: none;
        }

        .setting-label {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .setting-name {
            font-weight: 500;
            font-size: 13px;
        }

        .setting-description {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.4;
        }

        /* Toggle Switch */
        .toggle-switch {
            position: relative;
            width: 40px;
            height: 20px;
            flex-shrink: 0;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            transition: 0.3s;
            border-radius: 20px;
        }

        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 2px;
            bottom: 2px;
            background-color: var(--vscode-foreground);
            transition: 0.3s;
            border-radius: 50%;
        }

        input:checked + .toggle-slider {
            background-color: var(--vscode-button-background);
            border-color: var(--vscode-button-background);
        }

        input:checked + .toggle-slider:before {
            transform: translateX(20px);
        }

        .status-text {
            font-size: 11px;
            margin-top: 8px;
            padding: 8px;
            background: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textBlockQuote-border);
            border-radius: 3px;
        }

        .status-enabled {
            border-left-color: var(--vscode-charts-green);
        }

        .status-disabled {
            border-left-color: var(--vscode-charts-red);
        }
    </style>
</head>
<body>
    <div class="setting-group">
        <div class="setting-group-title">Context Management</div>
        
        <div class="setting-item">
            <div class="setting-label">
                <div class="setting-name">Enable Context</div>
                <div class="setting-description">
                    Tự động thêm ngữ cảnh (collection) vào prompt khi chat
                </div>
            </div>
            
            <label class="toggle-switch">
                <input type="checkbox" id="enable-context" onchange="toggleContext(this.checked)">
                <span class="toggle-slider"></span>
            </label>
        </div>

        <div id="status-message" class="status-text" style="display: none;"></div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        const previousState = vscode.getState() || {
            enableContext: false
        };

        let settings = previousState;

        // Update UI from state
        document.getElementById('enable-context').checked = settings.enableContext;
        updateStatusMessage();

        function toggleContext(enabled) {
            settings.enableContext = enabled;
            vscode.setState(settings);
            
            vscode.postMessage({
                type: 'updateSetting',
                key: 'zenchat.enableContext',
                value: enabled
            });

            updateStatusMessage();
        }

        function updateStatusMessage() {
            const statusEl = document.getElementById('status-message');
            
            if (settings.enableContext) {
                statusEl.textContent = '✓ Context được tự động thêm vào prompt';
                statusEl.className = 'status-text status-enabled';
            } else {
                statusEl.textContent = '○ Context không được thêm tự động (cần chọn collection thủ công)';
                statusEl.className = 'status-text status-disabled';
            }
            
            statusEl.style.display = 'block';
        }

        // Listen for settings updates from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.type === 'settingsUpdate') {
                settings = message.settings;
                document.getElementById('enable-context').checked = settings.enableContext;
                updateStatusMessage();
                vscode.setState(settings);
            }
        });

        // Request current settings when loaded
        vscode.postMessage({ type: 'requestSettings' });
    </script>
</body>
</html>`;
  }
}
