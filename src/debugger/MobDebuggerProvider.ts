'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, CancellationToken, ProviderResult } from 'vscode';
import { MobDebugConfiguration } from './types';

export class MobDebuggerProvider implements vscode.DebugConfigurationProvider {
    resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: MobDebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
        return debugConfiguration;
    }

    dispose() {

    }
}