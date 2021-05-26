import { DebugConfiguration } from 'vscode';

interface DebugConfigurationBase extends DebugConfiguration {
    extensionPath: string;
    sourcePaths: string[];
    ext: string[];
}

export interface EmmyAttachDebugConfiguration extends DebugConfigurationBase {
    pid: number;
    processName: string;
}

export interface EmmyDebugConfiguration extends DebugConfigurationBase {
    host: string;
    port: number;
    ideConnectDebugger: boolean;
}

export interface EmmyLaunchDebugConfiguration extends DebugConfigurationBase {
    program: string;
    arguments: string[];
    workingDir: string;
    blockOnExit: boolean;
    useWindowsTerminal: boolean;
}