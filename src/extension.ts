import * as vscode from "vscode";
import { MainPanel, type OpenGraphArgs } from "./panels/MainPanel";
import { ConfigBridge } from "./settings/ConfigBridge";
import { StatusBarItem } from "./statusBar/StatusBarItem";
import { RepoTreeProvider } from "./views/RepoTreeProvider";

export function activate(context: vscode.ExtensionContext) {
  const configBridge = new ConfigBridge();
  context.subscriptions.push(configBridge);

  const treeProvider = new RepoTreeProvider();
  const treeView = vscode.window.createTreeView("git-viz.repoTree", {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);

  const statusBar = new StatusBarItem();
  statusBar.start();
  context.subscriptions.push(statusBar);

  const showGraphCommand = vscode.commands.registerCommand(
    "git-viz.showCommitGraph",
    (arg?: OpenGraphArgs) => {
      MainPanel.render(context.extensionUri, configBridge, arg);
    }
  );

  const switchBranchCommand = vscode.commands.registerCommand("git-viz.switchBranch", async () => {
    await vscode.commands.executeCommand("git.checkout");
  });

  const openSettingsCommand = vscode.commands.registerCommand("git-viz.openSettings", async () => {
    await vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "@ext:anindosarker.git-viz"
    );
  });

  const refreshCommand = vscode.commands.registerCommand("git-viz.refresh", () => {
    treeProvider.refresh();
    void statusBar.refresh();
    if (MainPanel.currentPanel) MainPanel.currentPanel.postRefresh();
  });

  context.subscriptions.push(
    showGraphCommand,
    switchBranchCommand,
    openSettingsCommand,
    refreshCommand
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      treeProvider.refresh();
      void statusBar.refresh();
    })
  );
}

export function deactivate() {}
