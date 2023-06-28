import * as vscode from 'vscode';
import { DebugConfigurationBase } from "../base/DebugConfigurationBase";
import { DebuggerProvider } from "../base/DebuggerProvider";

export interface EmmyLaunchDebugConfiguration extends DebugConfigurationBase {
    program: string;
    arguments: string[];
    workingDir: string;
    blockOnExit: boolean;
    useWindowsTerminal: boolean;
}


export class EmmyLaunchDebuggerProvider extends DebuggerProvider {
    async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, configuration: EmmyLaunchDebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
        configuration.extensionPath = this.context.extensionPath;
        configuration.sourcePaths = this.getSourceRoots();
        configuration.ext = this.getExt();
        return configuration;
    }
}
