import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { LuaContext } from '../luaContext';

/**
 * Manages webview panels
 */
class PsiViewer {
    /**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
    public static currentPanel: PsiViewer | undefined;

    private static readonly viewType = 'EmmyLuaPsiView';
    private static readonly title = "LuaPsiView";
    private static readonly distDirectory = "web/dist";

    private readonly panel: vscode.WebviewPanel;
    private readonly extensionPath: string;
    private readonly builtAppFolder: string;
    private disposables: vscode.Disposable[] = [];
    private timeoutToReqAnn?: NodeJS.Timer;

    public static createOrShow(luaContext: LuaContext) {
        const context = luaContext.extensionContext;
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        // If we already have a panel, show it.
        // Otherwise, create angular panel.
        if (PsiViewer.currentPanel) {
            PsiViewer.currentPanel.panel.reveal(column);
        } else {
            PsiViewer.currentPanel = new PsiViewer(luaContext, column || vscode.ViewColumn.One);
            PsiViewer.currentPanel.active(context);
        }
        return PsiViewer.currentPanel;
    }

    private constructor(private luaContext: LuaContext, column: vscode.ViewColumn) {
        this.extensionPath = luaContext.extensionContext.extensionPath;
        this.builtAppFolder = PsiViewer.distDirectory;

        // Create and show a new webview panel
        this.panel = vscode.window.createWebviewPanel(PsiViewer.viewType, PsiViewer.title, column, {
            // Enable javascript in the webview
            enableScripts: true,

            // And restrict the webview to only loading content from our extension's `media` directory.
            localResourceRoots: [vscode.Uri.file(path.join(this.extensionPath, this.builtAppFolder))]
        });

        // Set the webview's initial html content
        this.panel.webview.html = this._getHtmlForWebview();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programatically
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // Handle messages from the webview
        // this.panel.webview.onDidReceiveMessage(
        //     (message: any) => {
        //         switch (message.command) {
        //             case 'alert':
        //                 vscode.window.showErrorMessage(message.text);
        //                 return;
        //         }
        //     },
        //     null,
        //     this.disposables
        // );
    }

    public dispose() {
        PsiViewer.currentPanel = undefined;

        // Clean up our resources
        this.panel.dispose();

        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    public post(message: any) {
        this.panel.webview.postMessage(message);
    }

    /**
     * Returns html of the start page (index.html)
     */
    private _getHtmlForWebview() {
        // path to dist folder
        const appDistPath = path.join(this.extensionPath, PsiViewer.distDirectory);
        const appDistPathUri = vscode.Uri.file(appDistPath);

        // path as uri
        const baseUri = this.panel.webview.asWebviewUri(appDistPathUri);

        // get path to index.html file from dist folder
        const indexPath = path.join(appDistPath, 'index.html');

        // read index file from file system
        let indexHtml = fs.readFileSync(indexPath, { encoding: 'utf8' });

        // update the base URI tag
        indexHtml = indexHtml.replace('<base href="/">', `<base href="${String(baseUri)}/">`);

        return indexHtml;
    }

    private active(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(PsiViewer.onDidChangeTextDocument, null, context.subscriptions));
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(PsiViewer.onDidChangeActiveTextEditor, null, context.subscriptions));
        context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(PsiViewer.onDidChangeSelection, null, context.subscriptions));
    }

    private requestPsi(editor: vscode.TextEditor) {
        if (this.timeoutToReqAnn) {
            clearTimeout(this.timeoutToReqAnn);
        }
        this.timeoutToReqAnn = setTimeout(() => {
            this.requestPsiImpl(editor);
        }, 150);
    }

    private requestPsiImpl(editor: vscode.TextEditor) {
        const client = this.luaContext.client;
        let params: any = { uri: editor.document.uri.toString() };
        client?.sendRequest<{ data: any }>("emmy/view_syntax_tree", params).then(result => {
            if (result) {
                this.post({
                    type: "psi",
                    value: [result.data]
                });
            }
        });
    }

    private requestPsiSelect(position: vscode.Position, uri: vscode.Uri) {
        const client = this.luaContext.client;
        let params: any = { uri: uri.toString(), position };
        client?.sendRequest<{ data: any }>("emmy/view_psi_select", params).then(result => {
            if (result) {
                this.post({
                    type: "psi_select",
                    value: result.data
                });
            }
        });
    }

    private static onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent) {
        const activeEditor = vscode.window.activeTextEditor;
        const viewer = PsiViewer.currentPanel;
        if (activeEditor
            && activeEditor.document === event.document
            && activeEditor.document.languageId === viewer?.luaContext.LANGUAGE_ID) {
            viewer.requestPsi(activeEditor);
        }
    }

    private static onDidChangeActiveTextEditor(editor: vscode.TextEditor | undefined) {
        const viewer = PsiViewer.currentPanel;
        if (editor
            && editor.document.languageId === viewer?.luaContext.LANGUAGE_ID) {
            viewer.requestPsi(editor);
        }
    }

    private static onDidChangeSelection(e: vscode.TextEditorSelectionChangeEvent) {
        if (e.kind == vscode.TextEditorSelectionChangeKind.Mouse) {
            const viewer = PsiViewer.currentPanel;
            if (viewer) {
                viewer.requestPsiSelect(e.selections[0].start, e.textEditor.document.uri)
            }
        }
    }
}

export function registerCommand(luaContext: LuaContext) {
    const context = luaContext.extensionContext;
    context.subscriptions.push(
        vscode.commands.registerCommand('lua.psi.view', () => {
            PsiViewer.createOrShow(luaContext);
        })
    );
}
