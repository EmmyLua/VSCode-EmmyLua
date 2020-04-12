import * as path from "path";
import {workspace} from "vscode";

function getWorkspaceFolderByName(workspaceName?: string): string | null {
    const ws = workspace.workspaceFolders;
    if(ws)
    {
        let workspace = ws.find(w => w.name === workspaceName);
        if(workspace) {
            return workspace.uri.fsPath;
        } else {
            return ws[0].uri.fsPath;
        }
    }
    return null;
}

export function substituteFolder(oriPath: string): string {
    let ret = oriPath;
    let pattern = /(?:\$\{workspaceFolder(?:\:([^\.]+))?\})/;
    let innerMatch = pattern.exec(oriPath);
    if(innerMatch !== null) {
        let path = getWorkspaceFolderByName(innerMatch[1]);
        if(path) {
            ret = oriPath.replace(pattern, path);
        }
    }
    ret = path.resolve(ret);
    return ret;
}