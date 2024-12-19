
import * as vscode from 'vscode';
import { AnnotatorType } from './lspExt';
import { LanguageClient } from 'vscode-languageclient/node';
import * as notifications from "./lspExt";


let D_PARAM: vscode.TextEditorDecorationType;
let D_GLOBAL: vscode.TextEditorDecorationType;
let D_LOCALS: vscode.TextEditorDecorationType[];
let D_UPVALUE: vscode.TextEditorDecorationType;

function createDecoration(key: string | undefined, config: vscode.DecorationRenderOptions = {}): vscode.TextEditorDecorationType {
    if (key == undefined) {
        return vscode.window.createTextEditorDecorationType(config);
    }
    let color = vscode.workspace.getConfiguration("emmylua").get(key);
    if (typeof (color) === 'string') {
        config.light = { color: color };
        config.dark = { color: color };
    }
    return vscode.window.createTextEditorDecorationType(config);
}

function createDecorations(key: string, config: vscode.DecorationRenderOptions = {}): vscode.TextEditorDecorationType[] {
    let colors = vscode.workspace.getConfiguration("emmylua").get(key);
    if (colors instanceof Array) {
        return colors.map(color => vscode.window.createTextEditorDecorationType({
            light: { color: color },
            dark: { color: color }
        }));
    }
    return [];
}

function updateDecorations() {
    // 各种方式更新时之前的decoration没有dispose导致重复渲染
    if (D_PARAM) {
        D_PARAM.dispose();
        D_GLOBAL.dispose();
        D_LOCALS.forEach(d => d.dispose());
        D_UPVALUE.dispose();
    }

    D_PARAM = createDecoration("colors.parameter");
    D_GLOBAL = createDecoration("colors.global");
    D_LOCALS = createDecorations("colors.local");

    let upvalueColor = vscode.workspace.getConfiguration("emmylua").get("colors.upvalue");
    if (upvalueColor && upvalueColor != "") {
        D_UPVALUE = createDecoration(undefined, {
            textDecoration: `underline;text-decoration-color:${upvalueColor};`
        });
    }
    else {
        D_UPVALUE = createDecoration(undefined);
    }
}

export function onDidChangeConfiguration(client: LanguageClient) {
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
        map.set(AnnotatorType.Param, []);
        map.set(AnnotatorType.Global, []);
        map.set(AnnotatorType.Upvalue, []);

        let local_maps = new Map<number, vscode.Range[]>();
        for (let i = 0; i < D_LOCALS.length; i++) {
            local_maps.set(i, []);
        }

        if (!list) {
            return;
        }

        let local_index = 0;

        list.forEach(annotation => {
            if (annotation.type !== AnnotatorType.Local) {
                let ranges = map.get(annotation.type);
                if (ranges) {
                    ranges.push(...annotation.ranges);
                }
            } else if (D_LOCALS.length > 0) {
                let ranges = local_maps.get(local_index);
                if (!ranges) {
                    ranges = [];
                    local_maps.set(local_index, ranges);
                }
                ranges.push(...annotation.ranges);
                local_index++;
                if (local_index >= D_LOCALS.length) {
                    local_index = 0;
                }
            }
        });
        map.forEach((v, k) => {
            updateAnnotators(editor, k, v);
        });

        local_maps.forEach((v, i) => {
            if (i < D_LOCALS.length) {
                editor.setDecorations(D_LOCALS[i], v);
            }
        });
    });
}

function updateAnnotators(editor: vscode.TextEditor, type: AnnotatorType, ranges: vscode.Range[]) {
    switch (type) {
        case AnnotatorType.Param:
            editor.setDecorations(D_PARAM, ranges);
            break;
        case AnnotatorType.Global:
            editor.setDecorations(D_GLOBAL, ranges);
            break;
        case AnnotatorType.Upvalue:
            editor.setDecorations(D_UPVALUE, ranges);
            break;
    }
}
