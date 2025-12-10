import * as vscode from "vscode";
import { MainPanel } from "./panels/MainPanel";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const showGraphCommand = vscode.commands.registerCommand(
    "git-viz.showCommitGraph",
    () => {
      MainPanel.render(context.extensionUri);
    }
  );

  const switchBranchCommand = vscode.commands.registerCommand(
    "git-viz.switchBranch",
    async () => {
      await vscode.commands.executeCommand("git.checkout");
    }
  );

  context.subscriptions.push(showGraphCommand, switchBranchCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
