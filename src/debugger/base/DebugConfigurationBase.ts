import { DebugConfiguration } from 'vscode';

export interface DebugConfigurationBase extends DebugConfiguration {
    extensionPath: string;
    sourcePaths: string[];
    ext: string[];
}
