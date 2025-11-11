import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

/**
 * Server health status
 */
export enum ServerState {
    /** Server is starting up */
    Starting = 'starting',
    /** Server is running normally */
    Running = 'running',
    /** Server is stopping */
    Stopping = 'stopping',
    /** Server is stopped */
    Stopped = 'stopped',
    /** Server encountered a warning */
    Warning = 'warning',
    /** Server encountered an error */
    Error = 'error',
}

/**
 * Server status information
 */
export interface ServerStatus {
    /** Current server state */
    state: ServerState;
    /** Optional status message */
    message?: string;
    /** Additional details for tooltip */
    details?: string;
}

/**
 * Status bar configuration
 */
interface StatusBarConfig {
    readonly icon: string;
    readonly color?: vscode.ThemeColor;
    readonly backgroundColor?: vscode.ThemeColor;
}

interface TooltipAction {
    readonly label: string;
    readonly command: string;
    readonly icon: string;
    readonly tooltip?: string;
}

/**
 * EmmyLua extension context manager
 * Manages language client, status bar, and extension state
 */
export class EmmyContext implements vscode.Disposable {
    public readonly LANGUAGE_ID = 'lua' as const;

    private _client?: LanguageClient;
    private _serverStatus: ServerStatus;
    private readonly _statusBar: vscode.StatusBarItem;
    private readonly _disposables: vscode.Disposable[] = [];

    constructor(
        public readonly debugMode: boolean,
        public readonly vscodeContext: vscode.ExtensionContext,
    ) {
        this._serverStatus = { state: ServerState.Stopped };
        this._statusBar = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );

        // Status bar click shows quick pick menu instead of direct action
        this._statusBar.command = 'emmy.showServerMenu';

        this._disposables.push(this._statusBar);
        this.updateStatusBar();
    }

    // ==================== Public API ====================

    /**
     * Get the language client instance
     */
    get client(): LanguageClient | undefined {
        return this._client;
    }

    /**
     * Set the language client instance
     */
    set client(value: LanguageClient | undefined) {
        this._client = value;
    }

    /**
     * Get current server status
     */
    get serverStatus(): Readonly<ServerStatus> {
        return this._serverStatus;
    }

    /**
     * Check if server is running
     */
    get isServerRunning(): boolean {
        return this._serverStatus.state === ServerState.Running;
    }

    /**
     * Check if server is starting
     */
    get isServerStarting(): boolean {
        return this._serverStatus.state === ServerState.Starting;
    }

    /**
     * Update server status to starting
     */
    setServerStarting(message?: string): void {
        this._serverStatus = {
            state: ServerState.Starting,
            message: message || 'Starting EmmyLua language server...',
        };
        this.updateStatusBar();
    }

    /**
     * Update server status to running
     */
    setServerRunning(message?: string): void {
        this._serverStatus = {
            state: ServerState.Running,
            message: message || 'EmmyLua language server is running',
        };
        this.updateStatusBar();
    }

    /**
     * Update server status to stopping
     */
    setServerStopping(message?: string): void {
        this._serverStatus = {
            state: ServerState.Stopping,
            message: message || 'Stopping EmmyLua language server...',
        };
        this.updateStatusBar();
    }

    /**
     * Update server status to stopped
     */
    setServerStopped(message?: string): void {
        this._serverStatus = {
            state: ServerState.Stopped,
            message: message || 'EmmyLua language server is stopped',
        };
        this.updateStatusBar();
    }

    /**
     * Update server status to warning
     */
    setServerWarning(message: string, details?: string): void {
        this._serverStatus = {
            state: ServerState.Warning,
            message,
            details,
        };
        this.updateStatusBar();
    }

    /**
     * Update server status to error
     */
    setServerError(message: string, details?: string): void {
        this._serverStatus = {
            state: ServerState.Error,
            message,
            details,
        };
        this.updateStatusBar();
    }

    /**
     * Stop the language server
     */
    async stopServer(): Promise<void> {
        if (!this._client) {
            return;
        }

        this.setServerStopping();
        try {
            await this._client.stop();
            this.setServerStopped();
        } catch (error) {
            this.setServerError('Failed to stop server', String(error));
        }
    }

    /**
     * Show server control menu
     */
    async showServerMenu(): Promise<void> {
        const items: vscode.QuickPickItem[] = [];

        // Build menu based on current state
        if (this.isServerRunning) {
            items.push(
                {
                    label: '$(debug-restart) Restart Server',
                    description: 'Restart the language server',
                    detail: 'Stop and restart the EmmyLua language server',
                },
                {
                    label: '$(stop-circle) Stop Server',
                    description: 'Stop the language server',
                    detail: 'Gracefully stop the EmmyLua language server',
                }
            );
        } else {
            items.push({
                label: '$(play) Start Server',
                description: 'Start the language server',
                detail: 'Start the EmmyLua language server',
            });
        }

        items.push(
            {
                label: '$(info) Show Server Info',
                description: 'Display server information',
                detail: 'Show detailed server status and configuration',
            },
            {
                label: '$(output) Show Output',
                description: 'Open output channel',
                detail: 'View server logs and output',
            },
            {
                label: '$(symbol-structure) Show Syntax Tree',
                description: 'View syntax tree for current file',
                detail: 'Display the syntax tree of the active Lua file',
            }
        );

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'EmmyLua Language Server',
            title: 'Server Control',
        });

        if (!selected) {
            return;
        }

        // Execute selected action
        if (selected.label.includes('Restart')) {
            await vscode.commands.executeCommand('emmy.restartServer');
        } else if (selected.label.includes('Stop')) {
            await vscode.commands.executeCommand('emmy.stopServer');
        } else if (selected.label.includes('Start')) {
            await vscode.commands.executeCommand('emmy.startServer');
        } else if (selected.label.includes('Server Info')) {
            this.showServerInfo();
        } else if (selected.label.includes('Output')) {
            this._client?.outputChannel?.show();
        } else if (selected.label.includes('Syntax Tree')) {
            await vscode.commands.executeCommand('emmy.showSyntaxTree');
        }
    }

    /**
     * Show detailed server information
     */
    private showServerInfo(): void {
        const info: string[] = [
            '# EmmyLua Language Server',
            '',
            `**Status:** ${this._serverStatus.state}`,
        ];

        if (this._serverStatus.message) {
            info.push(`**Message:** ${this._serverStatus.message}`);
        }

        if (this.debugMode) {
            info.push('', `**Debug Mode:** Enabled`);
        }

        if (this._serverStatus.details) {
            info.push('', '## Details', '', this._serverStatus.details);
        }

        const doc = vscode.workspace.openTextDocument({
            content: info.join('\n'),
            language: 'markdown',
        });

        doc.then((document) => {
            vscode.window.showTextDocument(document, {
                preview: true,
                viewColumn: vscode.ViewColumn.Beside,
            });
        });
    }

    // ==================== Private Methods ====================

    /**
     * Update status bar display
     */
    private updateStatusBar(): void {
        const config = this.getStatusBarConfig();

        this._statusBar.text = `${config.icon}EmmyLua`;
        this._statusBar.color = config.color;
        this._statusBar.backgroundColor = config.backgroundColor;
        this._statusBar.tooltip = this.createTooltip();
        this._statusBar.show();
    }

    /**
     * Get status bar configuration based on current state
     */
    private getStatusBarConfig(): StatusBarConfig {
        const configs: Record<ServerState, StatusBarConfig> = {
            [ServerState.Starting]: {
                icon: '$(sync~spin) ',
            },
            [ServerState.Running]: {
                icon: '$(check) ',
            },
            [ServerState.Stopping]: {
                icon: '$(sync~spin) ',
            },
            [ServerState.Stopped]: {
                icon: '$(circle-slash) ',
            },
            [ServerState.Warning]: {
                icon: '$(warning) ',
                color: new vscode.ThemeColor('statusBarItem.warningForeground'),
                backgroundColor: new vscode.ThemeColor('statusBarItem.warningBackground'),
            },
            [ServerState.Error]: {
                icon: '$(error) ',
                color: new vscode.ThemeColor('statusBarItem.errorForeground'),
                backgroundColor: new vscode.ThemeColor('statusBarItem.errorBackground'),
            },
        };

        return configs[this._serverStatus.state];
    }

    /**
     * Create tooltip content
     */
    private createTooltip(): vscode.MarkdownString {
        const tooltip = new vscode.MarkdownString('', true);
        tooltip.isTrusted = true;

        // Title
        tooltip.appendMarkdown('**EmmyLua Language Server**\n\n');
        tooltip.appendMarkdown('---\n\n');

        // Status
        tooltip.appendMarkdown(`Status: \`${this._serverStatus.state}\`\n\n`);

        const actions = this.getTooltipActions();
        if (actions.length) {
            const links = actions.map((action) => {
                const tooltipText = action.tooltip
                    ? ` "${action.tooltip.replace(/"/g, '\\"')}"`
                    : '';
                return `[${action.icon} ${action.label}](command:${action.command}${tooltipText})`;
            });
            tooltip.appendMarkdown(links.join('\n\n'));
            tooltip.appendMarkdown('\n\n');
        }

        return tooltip;
    }

    /**
     * Quick actions shown in the tooltip
     */
    private getTooltipActions(): TooltipAction[] {
        const actions: TooltipAction[] = [];
        const state = this._serverStatus.state;

        if (state !== ServerState.Stopped && state !== ServerState.Stopping) {
            actions.push({
                label: 'Stop server',
                command: 'emmy.stopServer',
                icon: '$(stop-circle)',
                tooltip: 'Stop the EmmyLua language server',
            });
        }

        actions.push({
            label: 'Restart server',
            command: 'emmy.restartServer',
            icon: '$(debug-restart)',
            tooltip: 'Restart the EmmyLua language server',
        });
        return actions;
    }

    /**
     * Dispose all resources
     */
    dispose(): void {
        this._client?.stop();
        this._disposables.forEach((disposable) => disposable.dispose());
    }
}
