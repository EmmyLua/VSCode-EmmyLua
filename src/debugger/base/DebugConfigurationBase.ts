import { DebugConfiguration } from 'vscode';
import { DebugProtocol } from 'vscode-debugprotocol';

export interface DebugConfigurationBase extends DebugConfiguration {
    extensionPath: string;
    sourcePaths: string[];
    ext: string[];
}
