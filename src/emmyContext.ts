import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { ServerStatusParams } from './lspExtension';

type ServerHealth = 'ok' | 'warning' | 'error' | 'stop';

interface StatusBarConfig {
    readonly icon: string;
    readonly color?: vscode.ThemeColor;
    readonly backgroundColor?: vscode.ThemeColor;
    readonly command?: string;
}

export class EmmyContext implements vscode.Disposable {
    public readonly LANGUAGE_ID = 'lua' as const;
    
    private _client?: LanguageClient;
    private readonly _statusBar: vscode.StatusBarItem;
    private readonly _disposables: vscode.Disposable[] = [];

    constructor(
        public readonly debugMode: boolean,
        public readonly vscodeContext: vscode.ExtensionContext,
    ) {
        this._statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        
        this._disposables.push(this._statusBar);
        this.setServerStatus({ health: "ok" });
    }

    get client(): LanguageClient | undefined {
        return this._client;
    }

    set client(value: LanguageClient | undefined) {
        this._client = value;
    }

    setServerStatus(status: ServerStatusParams): void {
        const statusBarConfig = this.getStatusBarConfig(status);
        
        this._statusBar.show();
        this._statusBar.text = `${statusBarConfig.icon}EmmyLua`;
        this._statusBar.color = statusBarConfig.color;
        this._statusBar.backgroundColor = statusBarConfig.backgroundColor;
        this._statusBar.command = statusBarConfig.command;
        this._statusBar.tooltip = this.createTooltip(status);
    }

    private getStatusBarConfig(status: ServerStatusParams): StatusBarConfig {
        const configs: Record<ServerHealth, StatusBarConfig> = {
            ok: {
                icon: status.loading ? '$(sync~spin) ' : '',
                command: 'emmy.stopServer'
            },
            warning: {
                icon: status.loading ? '$(sync~spin) ' : '$(warning) ',
                color: new vscode.ThemeColor('statusBarItem.warningForeground'),
                backgroundColor: new vscode.ThemeColor('statusBarItem.warningBackground')
            },
            error: {
                icon: status.loading ? '$(sync~spin) ' : '$(error) ',
                color: new vscode.ThemeColor('statusBarItem.errorForeground'),
                backgroundColor: new vscode.ThemeColor('statusBarItem.errorBackground')
            },
            stop: {
                icon: '$(stop-circle) ',
                command: 'emmy.restartServer'
            }
        };

        return configs[status.health as ServerHealth];
    }

    private createTooltip(status: ServerStatusParams): vscode.MarkdownString {
        const tooltip = new vscode.MarkdownString('', true);
        tooltip.isTrusted = true;

        if (status.message) {
            tooltip.appendText(status.message);
            tooltip.appendText('\n\n');
        }

        const commandLinks: Record<ServerHealth, string> = {
            ok: '[Stop EmmyLua](command:emmy.stopServer)',
            stop: '[Restart EmmyLua](command:emmy.restartServer)',
            warning: '',
            error: ''
        };

        const link = commandLinks[status.health as ServerHealth];
        if (link) {
            tooltip.appendMarkdown(link);
        }

        return tooltip;
    }

    stopServer(): void {
        this._client?.stop();
        this.setServerStatus({ health: "stop" });
    }

    dispose(): void {
        this._client?.stop();
        this._disposables.forEach(disposable => disposable.dispose());
    }
}
