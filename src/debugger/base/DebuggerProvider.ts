import * as vscode from 'vscode';
import * as path from 'path';

const isWin = process.platform === "win32";

function isAbsolutePath(strPath: string): boolean {
    if (isWin) {
        if ((strPath.startsWith("\\") && !strPath.startsWith("\\\\")) || (strPath.startsWith("/") && !strPath.startsWith("//")))
            strPath = strPath.substring(1);
    }
    return path.isAbsolute(strPath);
}

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
        return list.concat(config.map(item => { return path.normalize(item); }));
    }

    protected getExt(): string[] {
        const ext = ['.lua'];
        const associations: any = vscode.workspace.getConfiguration("files").get("associations");
        for (const key in associations) {
            if (associations.hasOwnProperty(key)) {
                const element = associations[key];
                if (element === 'lua' && key.startsWith('*.')) {
                    ext.push(key.substring(1));
                }
            }
        }
        return ext;
    }

    abstract resolveDebugConfiguration?(folder: vscode.WorkspaceFolder | undefined, debugConfiguration: vscode.DebugConfiguration, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration>;

    protected async onDebugCustomEvent(e: vscode.DebugSessionCustomEvent) {
        if (e.event === 'findFileReq') {
            const file: string = e.body.file;
            const exts: string[] = e.body.ext;
            const seq = e.body.seq;
            let fileNames = [];
            for (const ext of exts) {
                if (file.endsWith(ext)) {
                    fileNames.push(file);
                    break;
                }
            }
            if (fileNames.length === 0) {
                fileNames = exts.map(it => `${file}${it}`);
            }

            let results: string[] = [];

            for (const fileName of fileNames) {
                if (isAbsolutePath(fileName)) {
                    results = [fileName];
                    break;
                }

                // 在当前工作区下？
                let uris = await vscode.workspace.findFiles(fileName);

                // 在当前工作区的子目录下？
                if (uris.length === 0) {
                    uris = await vscode.workspace.findFiles(path.join("**/*", fileName));
                }

                // chunkname长度超过当前工作区
                if (uris.length === 0) {
                    let parts = fileName.split(/\\|\//);
                    while (parts.length >= 2) {
                        parts = parts.slice(1);
                        const matchFile = path.join("**", ...parts)
                        uris = await vscode.workspace.findFiles(matchFile, null, 10);
                        if (uris.length !== 0) {
                            break;
                        }
                    }
                }

                if (uris.length !== 0) {
                    results = uris.map(it => it.fsPath);
                    break;
                }
            }
            
            if (results.length !== 0) {
                results = results.sort((a, b) => a.length - b.length)
            }

            e.session.customRequest('findFileRsp', { files: results, seq: seq });
        }
    }

    protected onTerminateDebugSession(session: vscode.DebugSession) {
    }

    dispose() { }
}
