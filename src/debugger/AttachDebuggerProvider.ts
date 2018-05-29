'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, CancellationToken, ProviderResult } from 'vscode';
import { savedContext } from '../extension';
import * as cp from "child_process";
import { basename } from 'path';

var parseString = require('xml2js').parseString;

interface ProcessInfoItem extends vscode.QuickPickItem {
    pid: number;
}

interface AttachDebugConfiguration extends DebugConfiguration {
    pid: number;
    extensionPath: string;
    sourcePaths: string[];
}

export class AttachDebuggerProvider implements vscode.DebugConfigurationProvider {

    provideDebugConfigurations(folder: WorkspaceFolder | undefined, token?: CancellationToken): ProviderResult<DebugConfiguration[]> {
        var config: DebugConfiguration = {
            name: "Attach",
            type: "emmyLuaAttach",
            request: "attach",
            pid: "${workspaceFolder}/${command:emmy.debugger.ask_pid}"
        };
        return [config];
    }

    resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: AttachDebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
        debugConfiguration.extensionPath = savedContext.extensionPath;
        debugConfiguration.sourcePaths = vscode.workspace.workspaceFolders!.map(f => { return f.uri.fsPath; });
        if (debugConfiguration.type === "emmylua_launch") {
            return debugConfiguration;
        }
        if (debugConfiguration.pid > 0) {
            return debugConfiguration;
        }
        // list processes
        return new Promise((resolve, reject) => {
            const args = [`${savedContext.extensionPath}/server/windows/x86/emmy.arch.exe`, " ", "list_processes"];
            cp.exec(args.join(" "), (err, stdout, stderr) => {
                parseString(stdout, function (err:any, result:any) {
                    const items = <ProcessInfoItem[]> result.list.process.map((data:any) => {
                        const pid = data["$"].pid;
                        const title = data.title[0];
                        const path = data.path[0];
                        const name = basename(path);
                        return <ProcessInfoItem> {
                            pid: pid,
                            label: `${pid} : ${name}`,
                            description: title,
                            detail: path
                        };
                    });
                    vscode.window.showQuickPick(items, { placeHolder: "Select the process to attach" }).then((item: ProcessInfoItem | undefined) => {
                        if (item) {
                            debugConfiguration.pid = item.pid;
                            resolve(debugConfiguration);
                        } else {
                            reject();
                        }
                    });
                });
            }).on("error", error => reject);
        });
    }

    dispose() {

    }
}