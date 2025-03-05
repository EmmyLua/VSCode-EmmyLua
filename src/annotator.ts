import * as vscode from 'vscode';
import { AnnotatorType } from './lspExt';
import { LanguageClient } from 'vscode-languageclient/node';
import * as notifications from "./lspExt";


let D_PARAM: vscode.TextEditorDecorationType;
let D_GLOBAL: vscode.TextEditorDecorationType;
let D_LOCAL: vscode.TextEditorDecorationType;
let D_MUT_LOCAL: vscode.TextEditorDecorationType;
let D_MUT_PARAM: vscode.TextEditorDecorationType;

function createDecoration(key: string): vscode.TextEditorDecorationType {
    let config: vscode.DecorationRenderOptions = {}
    let color = vscode.workspace.getConfiguration("emmylua").get(key);
    if (typeof (color) === 'string') {
        config.light = { color };
        config.dark = { color };
    }
    return vscode.window.createTextEditorDecorationType(config);
}

function createDecorationUnderline(key: string): vscode.TextEditorDecorationType {
    let config: vscode.DecorationRenderOptions = {}
    let color = vscode.workspace.getConfiguration("emmylua").get(key);
    if (typeof (color) === 'string') {
        config.light = {
            color,
            textDecoration: `underline;text-decoration-color:${color};text-underline-offset: 4px;`
        };
        config.dark = {
            color,
            textDecoration: `underline;text-decoration-color:${color};text-underline-offset: 4px;`
        };
    } else {
        config.light = {
            textDecoration: `underline;text-underline-offset: 4px;`
        };
        config.dark = {
            textDecoration: `underline;text-underline-offset: 4px;`
        };
    }
    return vscode.window.createTextEditorDecorationType(config);
}

function disposeDecorations(...decorations: (vscode.TextEditorDecorationType | undefined)[]) {
    decorations.forEach(d => d && d.dispose());
}

function updateDecorations() {
    if (D_PARAM) {
        disposeDecorations(D_PARAM, D_GLOBAL, D_LOCAL, D_MUT_LOCAL, D_MUT_PARAM);
    }

    D_PARAM = createDecoration("colors.parameter");
    D_GLOBAL = createDecoration("colors.global");
    D_LOCAL = createDecoration("colors.local");
    let mutable_underline = vscode.workspace.getConfiguration("emmylua").get("colors.mutable_underline");
    if (mutable_underline) {
        D_MUT_LOCAL = createDecorationUnderline("colors.local");
        D_MUT_PARAM = createDecorationUnderline("colors.parameter");
    }
    else {
        D_MUT_LOCAL = createDecoration("colors.local");
        D_MUT_PARAM = createDecoration("colors.parameter");
    }
}

export function onDidChangeConfiguration() {
    updateDecorations();
}

let timeoutToReqAnn: NodeJS.Timer;

export function requestAnnotators(editor: vscode.TextEditor, client: LanguageClient) {
    clearTimeout(timeoutToReqAnn);
    timeoutToReqAnn = setTimeout(() => {
        requestAnnotatorsImpl(editor, client);
    }, 150);
}

function requestAnnotatorsImpl(editor: vscode.TextEditor, client: LanguageClient) {
    if (!D_PARAM) {
        updateDecorations();
    }

    let params: notifications.AnnotatorParams = { uri: editor.document.uri.toString() };
    client.sendRequest<notifications.IAnnotator[]>("emmy/annotator", params).then(list => {
        let map: Map<AnnotatorType, vscode.Range[]> = new Map();
        map.set(AnnotatorType.ReadOnlyParam, []);
        map.set(AnnotatorType.Global, []);
        map.set(AnnotatorType.ReadOnlyLocal, []);
        map.set(AnnotatorType.MutLocal, []);
        map.set(AnnotatorType.MutParam, []);

        if (!list) {
            return;
        }

        list.forEach(annotation => {
            let ranges = map.get(annotation.type);
            if (ranges) {
                ranges.push(...annotation.ranges);
            }
        });
        map.forEach((v, k) => {
            updateAnnotators(editor, k, v);
        });
    });
}

function updateAnnotators(editor: vscode.TextEditor, type: AnnotatorType, ranges: vscode.Range[]) {
    switch (type) {
        case AnnotatorType.ReadOnlyParam:
            editor.setDecorations(D_PARAM, ranges);
            break;
        case AnnotatorType.Global:
            editor.setDecorations(D_GLOBAL, ranges);
            break;
        case AnnotatorType.ReadOnlyLocal:
            editor.setDecorations(D_LOCAL, ranges);
            break;
        case AnnotatorType.MutLocal:
            editor.setDecorations(D_MUT_LOCAL, ranges);
            break;
        case AnnotatorType.MutParam:
            editor.setDecorations(D_MUT_PARAM, ranges);
            break;
    }
}
