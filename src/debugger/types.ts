
import {  DebugConfiguration } from 'vscode';

interface DebugConfigurationBase extends DebugConfiguration {
    extensionPath: string;
    sourcePaths: string[];
}

export interface AttachDebugConfiguration extends DebugConfigurationBase {
    pid: number;
    pName: string;
    program?: string;
    arguments?: string[];
    workingDir?: string;
    ext: string[];
}

export interface EmmyDebugConfiguration extends DebugConfigurationBase {
    host: string;
    port: number;
    ext: string[];
    ideConnectDebugger: boolean;
}

export interface EmmyAttachDebugConfiguration extends AttachDebugConfiguration {
}