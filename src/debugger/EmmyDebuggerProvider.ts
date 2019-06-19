'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, CancellationToken, ProviderResult } from 'vscode';
import { EmmyDebugConfiguration } from './types';
import { normalize } from 'path';
import { savedContext } from '../extension';

export class EmmyDebuggerProvider implements vscode.DebugConfigurationProvider {
    
    protected getSourceRoots(): string[] {
        var list = vscode.workspace.workspaceFolders!.map(f => { return f.uri.fsPath; });
        var config = <Array<string>> vscode.workspace.getConfiguration("emmylua").get("source.roots") || [];
        return list.concat(config.map(item => { return normalize(item); }));
    }
    
    resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: EmmyDebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
        debugConfiguration.extensionPath = savedContext.extensionPath;
        debugConfiguration.sourcePaths = this.getSourceRoots();
        if (!debugConfiguration.request) {
            debugConfiguration.request = "launch";
            debugConfiguration.type = "emmylua_new";
            debugConfiguration.ideConnectDebugger = true;
            debugConfiguration.host = 'localhost';
            debugConfiguration.port = 9966;
            debugConfiguration.ext = [".lua", ".lua.txt", ".lua.bytes"];
        }
        return debugConfiguration;
    }

    dispose() {
    }
}