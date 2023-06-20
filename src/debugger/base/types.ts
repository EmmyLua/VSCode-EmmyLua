import { DebugConfiguration } from 'vscode';
import { DebugProtocol } from 'vscode-debugprotocol';

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

export interface EmmyDebugArguments extends DebugProtocol.AttachRequestArguments {
    extensionPath: string;
    sourcePaths: string[];
    host: string;
    port: number;
    ext: string[];
    ideConnectDebugger: boolean;

    // for launch
    program?: string;
    arguments?: string[];
    workingDir?: string;
}