import * as vscode from 'vscode';
import { LuaContext } from '../luaContext';

let LANGUAGE_ID = "lua"
let provider: EmmyLuaSyntaxTreeProvider | undefined = undefined;

class SyntaxNodeOrToken extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        private range: string
    ) {
        super(label, collapsibleState);
        // this.tooltip = this.index.toString();
        this.description = this.range;
    }

    // iconPath = {
    //     light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
    //     dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
    // };
}

interface PsiViewAttr {
    simple_view: string
}

interface PsiViewNode {
    name: string;
    attr?: PsiViewAttr;
    children?: PsiViewNode[];
}

export class EmmyLuaSyntaxTreeProvider implements vscode.TreeDataProvider<PsiViewNode> {
    constructor(private luaContext: LuaContext) { }

    getTreeItem(element: PsiViewNode): vscode.TreeItem {
        return new SyntaxNodeOrToken(
            element.name,
            element.children ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            element.attr?.simple_view ?? ""
        );
    }

    getChildren(element?: PsiViewNode): Thenable<PsiViewNode[]> {
        return new Promise((resolve, reject) => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!element) {
                const params = { uri: activeEditor?.document.uri.toString() }
                this.luaContext.client?.sendRequest<{ data: PsiViewNode }>("$/syntaxTree/nodes", params).then(psi => {
                    resolve([psi.data])
                })
            }
            else {
                resolve(element.children ?? [])
            }
        })
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    private _onDidChangeTreeData: vscode.EventEmitter<PsiViewNode | undefined | null | void> = new vscode.EventEmitter<PsiViewNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PsiViewNode | undefined | null | void> = this._onDidChangeTreeData.event;
}

function onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent) {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor
        && activeEditor.document === event.document
        && activeEditor.document.languageId === LANGUAGE_ID) {
        provider?.refresh()
    }
}

function onDidChangeActiveTextEditor(editor: vscode.TextEditor | undefined) {
    if (editor
        && editor.document.languageId === LANGUAGE_ID) {
        provider?.refresh()
    }
}

export function active(luaContext: LuaContext) {
    provider = new EmmyLuaSyntaxTreeProvider(luaContext)
    const context = luaContext.extensionContext;
    context.subscriptions.push(
        vscode.commands.registerCommand('emmlua.syntax.view', () => {
            vscode.window.createTreeView('emmylua.syntax.tree', {
                treeDataProvider: provider!
            });

            context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument, null, context.subscriptions));
            context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor, null, context.subscriptions));
        })
    );

} 