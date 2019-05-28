'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, CancellationToken, ProviderResult } from 'vscode';
import { EmmyDebugConfiguration } from './types';

export class EmmyDebuggerProvider implements vscode.DebugConfigurationProvider {
    resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: EmmyDebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
        return debugConfiguration;
    }

    dispose() {
    }
}