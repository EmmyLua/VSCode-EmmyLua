import * as vscode from 'vscode';
import { LuaContext } from '../luaContext';

let LANGUAGE_ID = "lua"
let provider: EmmyLuaSyntaxTreeProvider | undefined = undefined;

class SyntaxNodeOrToken extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly index: number,
        private range: string
    ) {
        super(label, collapsibleState);
        this.tooltip = this.index.toString();
        this.description = this.range;
    }

    // iconPath = {
    //     light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
    //     dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
    // };
}

export class EmmyLuaSyntaxTreeProvider implements vscode.TreeDataProvider<SyntaxNodeOrToken> {
    constructor(private luaContext: LuaContext) { }

    getTreeItem(element: SyntaxNodeOrToken): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SyntaxNodeOrToken): Thenable<SyntaxNodeOrToken[]> {
        return new Promise((resolve, reject) => {
            const activeEditor = vscode.window.activeTextEditor;
            const params = { uri: activeEditor?.document.uri.toString(), index: element ? element.index : 1 }
            this.luaContext.client?.sendRequest<any[]>("$/syntaxTree/nodes", params).then(data => {
                resolve(data.map(it => {
                    return new SyntaxNodeOrToken(
                        it.label,
                        it.isNode ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                        it.index,
                        it.range
                    );
                }))
            })
        })
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    private _onDidChangeTreeData: vscode.EventEmitter<SyntaxNodeOrToken | undefined | null | void> = new vscode.EventEmitter<SyntaxNodeOrToken | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SyntaxNodeOrToken | undefined | null | void> = this._onDidChangeTreeData.event;
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