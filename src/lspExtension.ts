import * as vscode from "vscode";

export interface AnnotatorParams {
    uri: string;
}

export enum AnnotatorType {
    ReadOnlyParam,
    Global,
    ReadOnlyLocal,
    MutLocal,
    MutParam,
    DocEm,
    DocStrong,
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

/**
 * Syntax tree request parameters
 */
export interface SyntaxTreeParams {
    /** Document URI to get syntax tree for */
    uri: string;
    /** Optional range to get syntax tree for (if not specified, entire document) */
    range?: IServerRange;
}

/**
 * Syntax tree response
 */
export interface SyntaxTreeResponse {
    /** The syntax tree as text */
    content: string;
}
