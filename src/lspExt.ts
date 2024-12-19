import * as vscode from 'vscode';

export interface AnnotatorParams {
    uri: string;
}

export enum AnnotatorType {
    Param,
    Global,
    Local,
    Upvalue,
}

export interface IAnnotator {
    ranges: vscode.Range[];
    type: AnnotatorType;
}

export interface IProgressReport {
    text: string;
    percent: number;
}

export interface ServerStatusParams {
    health: string;
    message?: string;
    loading?: boolean;
    command?: string;
}

export interface IServerPosition {
    line: number;
    character: number;
}

export interface IServerRange {
    start: IServerPosition;
    end: IServerPosition;
}

export interface IServerLocation {
    uri: string;
    range: IServerRange;
}