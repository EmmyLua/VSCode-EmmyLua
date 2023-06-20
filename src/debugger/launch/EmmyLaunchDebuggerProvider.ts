import * as vscode from 'vscode';
import { EmmyLaunchDebugConfiguration } from "../base/types";
import { DebuggerProvider } from "../base/DebuggerProvider";

export class EmmyLaunchDebuggerProvider extends DebuggerProvider {
    async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, configuration: EmmyLaunchDebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
        configuration.extensionPath = this.context.extensionPath;
        configuration.sourcePaths = this.getSourceRoots();
        configuration.ext = this.getExt();
        return configuration;
    }
}
