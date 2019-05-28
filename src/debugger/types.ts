
import {  DebugConfiguration } from 'vscode';

interface DebugConfigurationBase extends DebugConfiguration {
    extensionPath: string;
    sourcePaths: string[];
}

export interface AttachDebugConfiguration extends DebugConfigurationBase {
    pid: number;
    
	program?: string;
	arguments?: string[];
	workingDir?: string;
}

export interface EmmyDebugConfiguration extends DebugConfigurationBase {
}