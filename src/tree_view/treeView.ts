import * as vscode from 'vscode';
import { LuaContext } from '../luaContext';
import { LanguageClient } from 'vscode-languageclient/node';

let LANGUAGE_ID = "lua"

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

interface PsiRange {
    start: number,
    end: number
}

interface PsiViewAttr {
    simple_view?: string,
    range: PsiRange
}

interface PsiViewNode {
    name: string;
    attr: PsiViewAttr;
    parent?: PsiViewNode;
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
                this.luaContext.client?.sendRequest<{ data: PsiViewNode }>("$/syntaxTree/nodes", params).then(result => {
                    this._psiRoot = result.data;
                    const walkList = [result.data]
                    while (walkList.length !== 0) {
                        const node = walkList.pop();
                        if (node?.children) {
                            for (const child of node.children) {
                                child.parent = node;
                                walkList.push(child);
                            }
                        }
                    }

                    resolve([this._psiRoot])
                })
            }
            else {
                resolve(element.children ?? [])
            }
        })
    }

    getParent(element: PsiViewNode): vscode.ProviderResult<PsiViewNode> | undefined {
        return element.parent;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    find_node(offset: number): PsiViewNode | undefined {
        const walkList = [this._psiRoot!]
        while (walkList.length !== 0) {
            const node = walkList.pop();
            if (!node) {
                break;
            }
            if (node.attr.range.start <= offset && node.attr.range.end >= offset) {
                if (node.children) {
                    for (const child of node.children) {
                        walkList.push(child);
                    }
                }
                else {
                    return node;
                }
            }
        }
        return undefined;
    }

    private _psiRoot: PsiViewNode | undefined;
    private _onDidChangeTreeData: vscode.EventEmitter<PsiViewNode | undefined | null | void> = new vscode.EventEmitter<PsiViewNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PsiViewNode | undefined | null | void> = this._onDidChangeTreeData.event;
}

function onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent, provider: EmmyLuaSyntaxTreeProvider) {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor
        && activeEditor.document === event.document
        && activeEditor.document.languageId === LANGUAGE_ID) {
        provider.refresh()
    }
}

function onDidChangeActiveTextEditor(editor: vscode.TextEditor | undefined, provider: EmmyLuaSyntaxTreeProvider) {
    if (editor
        && editor.document.languageId === LANGUAGE_ID) {
        provider.refresh()
    }
}

function onDidChangeSelection(e: vscode.TextEditorSelectionChangeEvent, client: LanguageClient, tree: vscode.TreeView<PsiViewNode>, provider: EmmyLuaSyntaxTreeProvider) {
    if (e.kind == vscode.TextEditorSelectionChangeKind.Mouse
        || e.kind == vscode.TextEditorSelectionChangeKind.Keyboard) {
        e.selections[0].start

        const params = { uri: e.textEditor.document.uri.toString(), pos: e.selections[0].start }
        client.sendRequest<{ data: number }>("$/syntaxTree/select", params).then(result => {
            const node = provider.find_node(result.data)
            if (node) {
                tree?.reveal(node, { expand: true, select: true });
            }
        })
    }
}

export function active(luaContext: LuaContext) {
    const provider = new EmmyLuaSyntaxTreeProvider(luaContext)
    const context = luaContext.extensionContext;
    context.subscriptions.push(
        vscode.commands.registerCommand('emmlua.syntax.view', () => {
            const tree = vscode.window.createTreeView('emmylua.syntax.tree', {
                treeDataProvider: provider
            });

            context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(editor => {
                onDidChangeTextDocument(editor, provider);
            }, null, context.subscriptions));
            context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
                onDidChangeActiveTextEditor(editor, provider);
            }, null, context.subscriptions));
            context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(e => {
                onDidChangeSelection(e, luaContext.client!, tree, provider);
            }, null, context.subscriptions));
        })
    );
} 