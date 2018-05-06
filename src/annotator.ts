
import * as vscode from 'vscode';
import { IAnnotator, AnnotatorType } from './notifications';
import { LanguageClient } from 'vscode-languageclient';
import * as notifications from "./notifications";

let D_PARAM = vscode.window.createTextEditorDecorationType({
    light: {
        color: "rgba(255, 0, 0, 1)"
    },
    dark: {
        color: "rgba(255, 0, 0, 1)"
    }
});

let D_GLOBAL = vscode.window.createTextEditorDecorationType({
    light: {
        color: "rgba(102, 0, 153, 1)"
    },
    dark: {
        color: "rgba(102, 0, 153, 1)"
    }
});

export function requestAnnotators(editor: vscode.TextEditor, client: LanguageClient) {
    let params:notifications.AnnotatorParams = { uri: editor.document.uri.toString() };
    client.sendRequest<notifications.IAnnotator>("emmy/annotator", params).then(data => {
        let uri = vscode.Uri.parse(data.uri);
        vscode.window.visibleTextEditors.forEach((editor) => {
            let docUri = editor.document.uri;
            if (uri.path === docUri.path) {
                updateAnnotators(editor, data);
            }
        });
    });
}

function updateAnnotators(editor: vscode.TextEditor, annotator: IAnnotator) {
    switch (annotator.type) {
        case AnnotatorType.Param:
        editor.setDecorations(D_PARAM, annotator.ranges);
        break;
        case AnnotatorType.Global:
        editor.setDecorations(D_GLOBAL, annotator.ranges);
        break;
    }
}