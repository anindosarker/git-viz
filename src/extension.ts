import * as vscode from "vscode";
import { MainPanel } from "./panels/MainPanel";
import { StatusBarItem } from "./StatusBarItem";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  MainPanel.register(context);
  new StatusBarItem(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
