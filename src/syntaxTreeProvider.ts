import * as vscode from 'vscode';
import * as path from 'path';
import { LanguageClient } from 'vscode-languageclient/node';
import { SyntaxTreeParams, SyntaxTreeResponse } from './lspExtension';

// Forward declaration - will be set by extension.ts
let getClient: (() => LanguageClient | undefined) | undefined;

/**
 * Set the function to get the language client
 * This is called by extension.ts during activation
 */
export function setClientGetter(getter: () => LanguageClient | undefined): void {
    getClient = getter;
}

/**
 * Provides syntax tree content as virtual documents
 * Similar to rust-analyzer's syntax tree viewer
 */
export class SyntaxTreeProvider implements vscode.TextDocumentContentProvider {
    static readonly SCHEME = 'emmylua-syntax-tree';
    
    private readonly _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private cache = new Map<string, string>();

    readonly onDidChange = this._onDidChange.event;

    /**
     * Create a URI for viewing syntax tree of a document
     */
    static createUri(sourceUri: vscode.Uri): vscode.Uri {
        const fileName = path.basename(sourceUri.fsPath);
        return vscode.Uri.parse(
            `${SyntaxTreeProvider.SCHEME}:Syntax Tree [${fileName}]?${encodeURIComponent(sourceUri.toString())}`
        );
    }

    /**
     * Parse source URI from syntax tree URI
     */
    private parseSourceUri(uri: vscode.Uri): vscode.Uri | undefined {
        const query = uri.query;
        if (!query) {
            return undefined;
        }
        try {
            return vscode.Uri.parse(decodeURIComponent(query));
        } catch {
            return undefined;
        }
    }

    /**
     * Provide syntax tree content for a virtual document
     */
    async provideTextDocumentContent(
        uri: vscode.Uri,
        token: vscode.CancellationToken
    ): Promise<string | undefined> {
        const sourceUri = this.parseSourceUri(uri);
        if (!sourceUri) {
            return 'Error: Invalid syntax tree URI';
        }

        // Check cache first
        const cacheKey = sourceUri.toString();
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        return this.generateSyntaxTree(sourceUri, token);
    }

    /**
     * Generate syntax tree from language server
     */
    private async generateSyntaxTree(
        sourceUri: vscode.Uri,
        token: vscode.CancellationToken
    ): Promise<string> {
        const client = await this.getLanguageClient();
        
        if (!client) {
            return '// Language server is not running\n// Please ensure EmmyLua language server is started';
        }

        try {
            const params: SyntaxTreeParams = {
                uri: sourceUri.toString()
            };

            const result = await client.sendRequest<SyntaxTreeResponse>(
                'emmy/syntaxTree',
                params,
                token
            );

            if (!result || !result.content) {
                return '// Failed to get syntax tree\n// The language server did not return any data';
            }

            // Cache the result
            this.cache.set(sourceUri.toString(), result.content);

            return result.content;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to generate syntax tree:', error);
            return `// Error generating syntax tree\n// ${errorMessage}`;
        }
    }

    /**
     * Get the language client from the extension context
     */
    private async getLanguageClient(): Promise<LanguageClient | undefined> {
        if (getClient) {
            return getClient();
        }
        return undefined;
    }

    /**
     * Refresh syntax tree for a source document
     */
    refresh(sourceUri: vscode.Uri): void {
        const cacheKey = sourceUri.toString();
        this.cache.delete(cacheKey);
        
        const syntaxTreeUri = SyntaxTreeProvider.createUri(sourceUri);
        this._onDidChange.fire(syntaxTreeUri);
    }

    /**
     * Clear all cached syntax trees
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this._onDidChange.dispose();
        this.cache.clear();
    }
}

/**
 * Manage syntax tree viewing and updates
 */
export class SyntaxTreeManager implements vscode.Disposable {
    private provider: SyntaxTreeProvider;
    private disposables: vscode.Disposable[] = [];
    private autoUpdateEnabled = true;

    constructor() {
        this.provider = new SyntaxTreeProvider();
        
        // Register content provider
        this.disposables.push(
            vscode.workspace.registerTextDocumentContentProvider(
                SyntaxTreeProvider.SCHEME,
                this.provider
            )
        );

        // Auto-refresh on document changes
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument(e => {
                if (this.autoUpdateEnabled && this.isWatchingDocument(e.document.uri)) {
                    // Debounce updates
                    this.scheduleRefresh(e.document.uri);
                }
            })
        );

        // Refresh when switching editors
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor && this.autoUpdateEnabled) {
                    this.provider.refresh(editor.document.uri);
                }
            })
        );
    }

    private updateTimeout?: NodeJS.Timeout;
    
    private scheduleRefresh(uri: vscode.Uri): void {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        
        this.updateTimeout = setTimeout(() => {
            this.provider.refresh(uri);
        }, 500); // 500ms debounce
    }

    /**
     * Check if we're currently watching a document for syntax tree updates
     */
    private isWatchingDocument(uri: vscode.Uri): boolean {
        // Check if there's an open syntax tree viewer for this document
        return vscode.window.visibleTextEditors.some(editor => {
            if (editor.document.uri.scheme !== SyntaxTreeProvider.SCHEME) {
                return false;
            }
            
            // Parse the source URI from the syntax tree document
            const query = editor.document.uri.query;
            if (!query) {
                return false;
            }
            
            try {
                const sourceUri = vscode.Uri.parse(decodeURIComponent(query));
                return sourceUri.toString() === uri.toString();
            } catch {
                return false;
            }
        });
    }

    /**
     * Show syntax tree for a document
     */
    async show(sourceUri: vscode.Uri, selection?: vscode.Selection): Promise<void> {
        const syntaxTreeUri = SyntaxTreeProvider.createUri(sourceUri);
        
        try {
            const doc = await vscode.workspace.openTextDocument(syntaxTreeUri);
            await vscode.window.showTextDocument(doc, {
                viewColumn: vscode.ViewColumn.Beside,
                preview: false,
                preserveFocus: false
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to show syntax tree: ${errorMessage}`);
        }
    }

    /**
     * Toggle auto-update for syntax trees
     */
    toggleAutoUpdate(): void {
        this.autoUpdateEnabled = !this.autoUpdateEnabled;
        const status = this.autoUpdateEnabled ? 'enabled' : 'disabled';
        vscode.window.showInformationMessage(`Syntax tree auto-update ${status}`);
    }

    /**
     * Manually refresh current syntax tree
     */
    refresh(): void {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            this.provider.refresh(editor.document.uri);
        }
    }

    /**
     * Dispose all resources
     */
    dispose(): void {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        this.provider.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
