import * as vscode from 'vscode';

export interface AnnotatorParams {
    uri: string;
}

export enum AnnotatorType {
    Param,
    Global,
    DocType,
    Upvalue,
}

export interface IAnnotator {
    uri: string;
    ranges: vscode.Range[];
    type: AnnotatorType;
}

export interface IProgressReport {
    text: string;
    percent: number;
}