
import * as vscode from 'vscode';
import { IAnnotator } from './notifications';

let D_PARAM = vscode.window.createTextEditorDecorationType({
    light: {
        color: "rgba(255, 0, 0, 1)"
    },
    dark: {
        color: "rgba(255, 0, 0, 1)"
    }
});

export function updateAnnotators(editor: vscode.TextEditor, annotators: IAnnotator[]) {
    annotators.forEach(annotator => {
        editor.setDecorations(D_PARAM, annotator.ranges);
    });
}