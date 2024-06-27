import * as vscode from 'vscode';

export interface AnnotatorParams {
    uri: string;
}

export enum AnnotatorType {
    Param,
    Global,
    DocType,
    Upvalue,
    NotUse
}

export interface RenderRange{
    range: vscode.Range;
    hint: string;
}

export interface IAnnotator {
    uri: string;
    ranges: RenderRange[];
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