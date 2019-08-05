'use strict';

import { WorkspaceFolder, DebugConfiguration, CancellationToken, ProviderResult } from 'vscode';
import { EmmyDebugConfiguration } from './types';
import { savedContext } from '../extension';
import { DebuggerProvider } from './DebuggerProvider';

export class EmmyDebuggerProvider extends DebuggerProvider {
    
    resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: EmmyDebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
        debugConfiguration.extensionPath = savedContext.extensionPath;
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

    dispose() {
    }
}