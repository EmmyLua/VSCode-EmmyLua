import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { IProgressReport, ServerStatusParams } from './lspExt';

export class EmmyCtx {
    public LANGUAGE_ID: string = "lua"; //EmmyLua
    public client?: LanguageClient;
    private readonly statusBar: vscode.StatusBarItem;
    private loadBar: vscode.StatusBarItem;

    constructor(
        public debugMode: boolean,
        public extensionContext: vscode.ExtensionContext,

    ) {
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.loadBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.setServerStatus({
            health: "ok"
        })
    }

    setServerStatus(status: ServerStatusParams) {
        let icon = "";
        const statusBar = this.statusBar;
        statusBar.show();
        statusBar.tooltip = new vscode.MarkdownString("", true);
        statusBar.tooltip.isTrusted = true;
        switch (status.health) {
            case "ok":
                statusBar.tooltip.appendText(status.message ?? "");
                statusBar.tooltip.appendMarkdown("\n\n[Stop EmmyLua](command:emmy.stopServer)");
                statusBar.color = undefined;
                statusBar.backgroundColor = undefined;
                status.command = "emmy.stopServer"
                break;
            case "warning":
                if (status.message) {
                    statusBar.tooltip.appendText(status.message);
                }
                statusBar.color = new vscode.ThemeColor("statusBarItem.warningForeground");
                statusBar.backgroundColor = new vscode.ThemeColor(
                    "statusBarItem.warningBackground"
                )
                icon = "$(warning) ";
                break;
            case "error":
                if (status.message) {
                    statusBar.tooltip.appendText(status.message);
                }
                statusBar.color = new vscode.ThemeColor("statusBarItem.errorForeground");
                statusBar.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
                icon = "$(error) ";
                break;
            case "stop":
                statusBar.tooltip.appendText("EmmyLua is stopped");
                statusBar.tooltip.appendMarkdown("\n\n[Restart EmmyLua](command:emmy.restartServer)");
                statusBar.color = undefined;
                statusBar.backgroundColor = undefined;
                status.command = "emmy.restartServer"
                icon = "$(stop-circle) "
                break;
        }
        if (statusBar.tooltip.value) {
            statusBar.tooltip.appendText("\n\n");
        }
        statusBar.command = status.command;
        if (status.loading) icon = "$(sync~spin) ";
        statusBar.text = `${icon}EmmyLua`;
    }

    registerProtocol() {
        this.client?.onNotification("emmy/progressReport", (d: IProgressReport) => {
            this.loadBar.show();
            this.loadBar.text = `${d.text}`;
            if (d.percent >= 1) {
                setTimeout(() => {
                    this.loadBar.hide();
                }, 1000);
            }
        });

        this.client?.onNotification("emmy/setServerStatus", (param: ServerStatusParams) => {
            this.setServerStatus(param);
        });
    }

    stopServer() {
        this.client?.stop();
        this.setServerStatus({
            health: "stop"
        });
    }

    dispose() {
        this.client?.stop();
        this.statusBar.dispose();
        this.loadBar.dispose();
    }
}