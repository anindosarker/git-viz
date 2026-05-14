import * as vscode from "vscode";

export const GIT_VIZ_CONFIG_SECTION = "git-viz";

export const CONFIG_KEYS = [
  "graphStyle",
  "refDisplay",
  "rowHeight",
  "pageSize",
  "topoOrder",
  "dateFormat",
  "showWorkingTree",
  "columns",
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];

export type ConfigMap = Record<string, unknown>;

export interface ConfigBridgeMessage {
  command: "config:update";
  values: ConfigMap;
}

export class ConfigBridge implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly webviews = new Set<vscode.Webview>();

  constructor() {
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (!e.affectsConfiguration(GIT_VIZ_CONFIG_SECTION)) return;
        this.broadcast();
      })
    );
  }

  public readAll(): ConfigMap {
    const cfg = vscode.workspace.getConfiguration(GIT_VIZ_CONFIG_SECTION);
    const out: ConfigMap = {};
    for (const k of CONFIG_KEYS) {
      out[k] = cfg.get(k);
    }
    return out;
  }

  public async set(key: string, value: unknown): Promise<void> {
    if (!(CONFIG_KEYS as readonly string[]).includes(key)) {
      throw new Error(`Unknown git-viz config key: ${key}`);
    }
    const cfg = vscode.workspace.getConfiguration(GIT_VIZ_CONFIG_SECTION);
    const target =
      cfg.inspect(key)?.workspaceValue !== undefined
        ? vscode.ConfigurationTarget.Workspace
        : vscode.ConfigurationTarget.Global;
    await cfg.update(key, value, target);
  }

  public attach(webview: vscode.Webview): vscode.Disposable {
    this.webviews.add(webview);
    void this.pushTo(webview);
    return new vscode.Disposable(() => {
      this.webviews.delete(webview);
    });
  }

  public broadcast(): void {
    for (const w of this.webviews) {
      void this.pushTo(w);
    }
  }

  private async pushTo(webview: vscode.Webview): Promise<void> {
    const message: ConfigBridgeMessage = {
      command: "config:update",
      values: this.readAll(),
    };
    try {
      await webview.postMessage(message);
    } catch {
      // webview may be disposed
    }
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.webviews.clear();
  }
}
