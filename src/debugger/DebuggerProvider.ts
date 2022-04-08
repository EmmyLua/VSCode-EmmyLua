import * as vscode from 'vscode';
import * as path from 'path';
import { normalize } from 'path';

export abstract class DebuggerProvider implements vscode.DebugConfigurationProvider, vscode.Disposable {
    constructor(
        protected type: string,
        protected context: vscode.ExtensionContext
    ) {
        context.subscriptions.push(vscode.debug.onDidReceiveDebugSessionCustomEvent(e => {
            if (e.session.type === this.type) {
                this.onDebugCustomEvent(e);
            }
        }));
        context.subscriptions.push(vscode.debug.onDidTerminateDebugSession(e => this.onTerminateDebugSession(e)));
    }

    protected isNullOrEmpty(s?: string): boolean {
        return !s || s.trim().length === 0;
    }

    protected getSourceRoots(): string[] {
        const workspaceFolders = vscode.workspace.workspaceFolders || [];
        const list = workspaceFolders.map(f => { return f.uri.fsPath; });
        const config = <Array<string>>vscode.workspace.getConfiguration("emmylua").get("source.roots") || [];
        return list.concat(config.map(item => { return normalize(item); }));
    }

    protected getExt(): string[] {
        const ext = ['.lua'];
        const associations: any = vscode.workspace.getConfiguration("files").get("associations");
        for (const key in associations) {
            if (associations.hasOwnProperty(key)) {
                const element = associations[key];
                if (element === 'lua' && key.substr(0, 2) === '*.') {
                    ext.push(key.substr(1));
                }
            }
        }
        return ext;
    }

    abstract resolveDebugConfiguration?(folder: vscode.WorkspaceFolder | undefined, debugConfiguration: vscode.DebugConfiguration, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration>;

    protected async onDebugCustomEvent(e: vscode.DebugSessionCustomEvent) {
        if (e.event === 'findFileReq') {
            const file: string = e.body.file;
            const ext: string[] = e.body.ext;
            const seq = e.body.seq;
            const parsedPath = path.parse(file);
            let fileNames = [parsedPath.base];
            for (let i = 0; i < ext.length; i++) {
                const e = ext[i];
                fileNames.push(`${parsedPath.base}${e}`);
            }
            let results: vscode.Uri[] = [];
            for (let i = 0; i < fileNames.length; i++) {
                const fileName = fileNames[i];
                let include = `**/${fileName}`;
                const uris = await vscode.workspace.findFiles(include);
                if (uris.length > 0) {
                    results = uris;
                    break;
                }
            }

            if (results.length <= 0) {
                if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length !== 0) {
                    let root = vscode.workspace.workspaceFolders[0].uri;
                    let filepath = root.with({ path: root.path + "/" + file });
                    const stat = await vscode.workspace.fs.stat(filepath);
                    if (stat?.type === vscode.FileType.File) {
                        results.push(filepath);
                    }
                }
            }

            e.session.customRequest('findFileRsp', { files: results.map(it => it.fsPath), seq: seq });
        }
    }

    protected onTerminateDebugSession(session: vscode.DebugSession) {
    }

    dispose() { }
}
