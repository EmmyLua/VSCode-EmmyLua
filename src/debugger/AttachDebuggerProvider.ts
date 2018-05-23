'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, CancellationToken, ProviderResult } from 'vscode';
import { savedContext } from '../extension';

export class AttachDebuggerProvider implements vscode.DebugConfigurationProvider {

    provideDebugConfigurations(folder: WorkspaceFolder | undefined, token?: CancellationToken): ProviderResult<DebugConfiguration[]> {
        var config: DebugConfiguration = {
            name: "Attach",
            type: "emmyLuaAttach",
            request: "attach",
            pid: "${workspaceFolder}/${command:emmy.debugger.ask_pid}"
        };
        return [config];
    }

    resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
        debugConfiguration.extensionPath = savedContext.extensionPath;
        return debugConfiguration;
    }

    dispose() {

    }
}