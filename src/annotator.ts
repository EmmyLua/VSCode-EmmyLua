
import * as vscode from 'vscode';
import { AnnotatorType } from './notifications';
import { LanguageClient } from 'vscode-languageclient/node';
import * as notifications from "./notifications";


let D_PARAM: vscode.TextEditorDecorationType;
let D_GLOBAL: vscode.TextEditorDecorationType;
let D_DOC_TYPE: vscode.TextEditorDecorationType;
let D_UPVALUE: vscode.TextEditorDecorationType;
let D_NOTUSE: vscode.TextEditorDecorationType;
let D_PARAMHINT: vscode.TextEditorDecorationType;
let D_LOCALHINT: vscode.TextEditorDecorationType;
let D_OVERRIDEHINT: vscode.TextEditorDecorationType;

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

function updateDecorations() {
    // 各种方式更新时之前的decoration没有dispose导致重复渲染
    if (D_PARAM) {
        D_PARAM.dispose();
        D_GLOBAL.dispose();
        D_DOC_TYPE.dispose();
        D_UPVALUE.dispose();
        D_NOTUSE.dispose();
        D_PARAMHINT.dispose();
        D_LOCALHINT.dispose();
    }

    D_PARAM = createDecoration("colors.parameter");
    D_GLOBAL = createDecoration("colors.global");
    D_DOC_TYPE = createDecoration("colors.doc_type");

    let upvalueColor = vscode.workspace.getConfiguration("emmylua").get("colors.upvalue");
    if (upvalueColor && upvalueColor != "") {
        D_UPVALUE = createDecoration(undefined, {
            textDecoration: `underline;text-decoration-color:${upvalueColor};`
        });
    }
    else {
        D_UPVALUE = createDecoration(undefined);
    }

    D_NOTUSE = createDecoration("colors.not_use", {});
    D_PARAMHINT = vscode.window.createTextEditorDecorationType({});
    D_LOCALHINT = vscode.window.createTextEditorDecorationType({});
    D_OVERRIDEHINT = vscode.window.createTextEditorDecorationType({});
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
        let map: Map<AnnotatorType, notifications.RenderRange[]> = new Map();
        map.set(AnnotatorType.DocType, []);
        map.set(AnnotatorType.Param, []);
        map.set(AnnotatorType.Global, []);
        map.set(AnnotatorType.Upvalue, []);
        map.set(AnnotatorType.NotUse, []);
        map.set(AnnotatorType.ParamHint, []);
        map.set(AnnotatorType.LocalHint, []);

        list.forEach(data => {
            let uri = vscode.Uri.parse(data.uri);
            let uriSet = new Set<string>();
            // 而vscode 在diff，分屏以及其他一些情况下可以获得多个相同的uri
            vscode.window.visibleTextEditors.forEach((editor) => {
                let docUri = editor.document.uri;
                if (uriSet.has(docUri.path)) {
                    return;
                }
                uriSet.add(docUri.path)

                if (uri.path.toLowerCase() === docUri.path.toLowerCase()) {
                    let list = map.get(data.type);
                    if (list === undefined) {
                        list = data.ranges;
                    } else {
                        list = list.concat(data.ranges);
                    }
                    map.set(data.type, list);
                }
            });
        });
        map.forEach((v, k) => {
            updateAnnotators(editor, k, v);
        });
    });
}

function updateAnnotators(editor: vscode.TextEditor, type: AnnotatorType, renderRanges: notifications.RenderRange[]) {
    switch (type) {
        case AnnotatorType.Param:
            editor.setDecorations(D_PARAM, renderRanges.map(e => e.range));
            break;
        case AnnotatorType.Global:
            editor.setDecorations(D_GLOBAL, renderRanges.map(e => e.range));
            break;
        case AnnotatorType.DocType:
            editor.setDecorations(D_DOC_TYPE, renderRanges.map(e => e.range));
            break;
        case AnnotatorType.Upvalue:
            editor.setDecorations(D_UPVALUE, renderRanges.map(e => e.range));
            break;
        case AnnotatorType.NotUse:
            editor.setDecorations(D_NOTUSE, renderRanges.map(e => e.range));
            break;
        case AnnotatorType.ParamHint: {
            let vscodeRenderRanges: vscode.DecorationOptions[] = []
            renderRanges.forEach(renderRange => {
                if (renderRange.hint && renderRange.hint !== "") {
                    vscodeRenderRanges.push({
                        range: renderRange.range,
                        renderOptions: {
                            light: {
                                before: {
                                    contentText: ` ${renderRange.hint}: `,
                                    color: "#888888",
                                    backgroundColor: '#EEEEEE;border-radius: 2px;',
                                    fontWeight: '400; font-size: 12px; line-height: 1;',
                                    margin: "1px",
                                }
                            },
                            dark: {
                                before: {
                                    contentText: ` ${renderRange.hint}: `,
                                    color: "#888888",
                                    backgroundColor: '#333333;border-radius: 2px;',
                                    fontWeight: '400; font-size: 12px; line-height: 1;',
                                    margin: "1px",

                                }
                            }
                        }
                    });

                }
            });

            editor.setDecorations(D_PARAMHINT, vscodeRenderRanges);
            break;
        }
        case AnnotatorType.LocalHint: {
            let vscodeRenderRanges: vscode.DecorationOptions[] = []
            renderRanges.forEach(renderRange => {
                if (renderRange.hint && renderRange.hint !== "") {
                    vscodeRenderRanges.push({
                        range: renderRange.range,
                        renderOptions: {
                            light: {
                                after: {
                                    contentText: `:${renderRange.hint}`,
                                    color: "#888888",
                                    backgroundColor: '#EEEEEE;border-radius: 2px;',
                                    fontWeight: '400; font-size: 12px; line-height: 1;',
                                    margin: "3px",
                                }
                            },
                            dark: {
                                after: {
                                    contentText: `:${renderRange.hint}`,
                                    color: "#888888",
                                    backgroundColor: '#333333;border-radius: 2px;',
                                    fontWeight: '400; font-size: 12px; line-height: 1;',
                                    margin: "3px",
                                }
                            }
                        }
                    });

                }
            });

            editor.setDecorations(D_LOCALHINT, vscodeRenderRanges);
            break;
        }
        case AnnotatorType.OverrideHint: {
            let vscodeRenderRanges: vscode.DecorationOptions[] = []
            renderRanges.forEach(renderRange => {

                vscodeRenderRanges.push({
                    range: renderRange.range,
                    renderOptions: {
                        light: {
                            after: {
                                contentText: "override",
                                color: "#888888",
                                backgroundColor: '#EEEEEE;border-radius: 2px;',
                                fontWeight: '400; font-size: 12px; line-height: 1;',
                                margin: "3px",
                            }
                        },
                        dark: {
                            after: {
                                contentText: "override",
                                color: "#888888",
                                backgroundColor: '#333333;border-radius: 2px;',
                                fontWeight: '400; font-size: 12px; line-height: 1;',
                                margin: "3px",
                            }
                        }
                    }
                });


            });

            editor.setDecorations(D_OVERRIDEHINT, vscodeRenderRanges);
            break;
        }
    }
}
