'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, CancellationToken, ProviderResult } from 'vscode';
import { savedContext } from '../extension';
import * as cp from "child_process";
import { basename, normalize } from 'path';
import { AttachDebugConfiguration } from './types';

interface ProcessInfoItem extends vscode.QuickPickItem {
    pid: number;
}

export class AttachDebuggerProvider implements vscode.DebugConfigurationProvider {
    protected isNullOrEmpty(s?: string): boolean {
        return !s || s.trim().length === 0;
    }

    protected getSourceRoots(): string[] {
        var list = vscode.workspace.workspaceFolders!.map(f => { return f.uri.fsPath; });
        var config = <Array<string>> vscode.workspace.getConfiguration("emmylua").get("source.roots") || [];
        return list.concat(config.map(item => { return normalize(item); }));
    }

    resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: AttachDebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
        debugConfiguration.extensionPath = savedContext.extensionPath;
        debugConfiguration.sourcePaths = this.getSourceRoots();
        debugConfiguration.request = "attach";
        debugConfiguration.type = "emmylua_attach";
        if (debugConfiguration.pid > 0) {
            return debugConfiguration;
        }
        // list processes
        return new Promise((resolve, reject) => {
            const args = [`${savedContext.extensionPath}/debugger/windows/x86/emmy.arch.exe`, " ", "list_processes"];
            const options: cp.ExecOptionsWithStringEncoding = { encoding: 'utf8' };
            cp.exec(args.join(" "), options, (_err, stdout, _stderr) => {
                const arr = stdout.split('\r\n');
                const size = Math.floor(arr.length / 4);
                const items: ProcessInfoItem[] = [];
                for (let i = 0; i < size; i++) {
                    const pid = parseInt(arr[i * 4]);
                    const title = arr[i * 4 + 1];
                    const path = arr[i * 4 + 2];
                    const name = basename(path);
                    const item: ProcessInfoItem = {
                        pid: pid,
                        label: `${pid} : ${name}`,
                        description: title,
                        detail: path
                    };
                    items.push(item);
                }
                
                vscode.window.showQuickPick(items, { placeHolder: "Select the process to attach" }).then((item: ProcessInfoItem | undefined) => {
                    if (item) {
                        debugConfiguration.pid = item.pid;
                        resolve(debugConfiguration);
                    } else {
                        reject();
                    }
                });
            }).on("error", error => reject);
        });
    }

    dispose() {

    }
}

export class AttachLaunchDebuggerProvider extends AttachDebuggerProvider {
    resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: AttachDebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
        debugConfiguration.extensionPath = savedContext.extensionPath;
        debugConfiguration.sourcePaths = this.getSourceRoots();
        debugConfiguration.type = "emmylua_launch";
        debugConfiguration.request = "launch";
        if (this.isNullOrEmpty(debugConfiguration.workingDir)) {
            var list = vscode.workspace.workspaceFolders!.map(f => { return f.uri.fsPath; });
            if (list.length > 0) {
                debugConfiguration.workingDir = list[0];
            }
        }
        if (this.isNullOrEmpty(debugConfiguration.program)) {
            let program = vscode.workspace.getConfiguration("emmylua").get<string>("debugger.defaultProgram");
            debugConfiguration.program = program;
        }
        if (!debugConfiguration.arguments) {
            let cur = vscode.window.activeTextEditor;
            let args: string[] = [];
            if (cur) {
                args.push(cur.document.uri.fsPath);
            }
            debugConfiguration.arguments = args;
        }
        return debugConfiguration;
    }

    provideDebugConfigurations(folder: WorkspaceFolder | undefined, token?: CancellationToken): ProviderResult<DebugConfiguration[]> {
        return [];
    }
}