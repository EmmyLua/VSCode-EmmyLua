'use strict';

import * as vscode from 'vscode';
import { DebugConfigurationBase } from '../base/DebugConfigurationBase';
import { extensionContext } from '../../extension';
import { DebuggerProvider } from '../base/DebuggerProvider';

export interface EmmyDebugConfiguration extends DebugConfigurationBase {
    host: string;
    port: number;
    ideConnectDebugger: boolean;
}

export class EmmyNewDebuggerProvider extends DebuggerProvider {
    private showWaitConnectionToken = new vscode.CancellationTokenSource();
    
    resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, debugConfiguration: EmmyDebugConfiguration, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration> {
        debugConfiguration.extensionPath = extensionContext.vscodeContext.extensionPath;
        debugConfiguration.sourcePaths = this.getSourceRoots();
        if (!debugConfiguration.request) {
            debugConfiguration.request = "launch";
            debugConfiguration.type = "emmylua_new";
            debugConfiguration.ideConnectDebugger = true;
            debugConfiguration.host = 'localhost';
            debugConfiguration.port = 9966;
        }
        debugConfiguration.ext = this.getExt();

        return debugConfiguration;
    }
    
    protected async onDebugCustomEvent(e: vscode.DebugSessionCustomEvent) {
        if (e.event === 'showWaitConnection') {
            this.showWaitConnectionToken.cancel();
            this.showWaitConnectionToken = new vscode.CancellationTokenSource();
            this.showWaitConnection(e.session, this.showWaitConnectionToken.token);
        }
        else if (e.event === 'onNewConnection') {
            this.showWaitConnectionToken.cancel();
        }
        else {
            return super.onDebugCustomEvent(e);
        }
    }

    private async showWaitConnection(session: vscode.DebugSession, token: vscode.CancellationToken) {
        return vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Wait for connection.',
                cancellable: true
            },
            async (progress, userCancelToken) => {
                userCancelToken.onCancellationRequested(e => {
                    session.customRequest('stopWaitConnection');
                });
                await new Promise((r, e) => token.onCancellationRequested(r));
            }
        );
    }

    protected onTerminateDebugSession(session: vscode.DebugSession) {
        this.showWaitConnectionToken.cancel();
    }
}