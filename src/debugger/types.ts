
import {  DebugConfiguration } from 'vscode';

interface EmmyDebugConfiguration extends DebugConfiguration {
    extensionPath: string;
    sourcePaths: string[];
}

export interface AttachDebugConfiguration extends EmmyDebugConfiguration {
    pid: number;
    
	program?: string;
	arguments?: string[];
	workingDir?: string;
}

export interface MobDebugConfiguration extends EmmyDebugConfiguration {
	program?: string;
	arguments?: string[];
	workingDir?: string;
	port?: number;
}