import { basename } from 'path';
import * as vscode from 'vscode';
import * as cp from "child_process";
import * as iconv from 'iconv-lite';
import { EmmyAttachDebugConfiguration } from "./types";
import { DebuggerProvider } from "./DebuggerProvider";

interface ProcessInfoItem extends vscode.QuickPickItem {
    pid: number;
}

export class EmmyAttachDebuggerProvider extends DebuggerProvider {
    async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, configuration: EmmyAttachDebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
        configuration.extensionPath = this.context.extensionPath;
        configuration.sourcePaths = this.getSourceRoots();
        configuration.request = "attach";
        configuration.type = "emmylua_attach";
        configuration.ext = this.getExt();
        if (configuration.pid > 0) {
            return configuration;
        }

        const pid = await this.pickPID();
        configuration.pid = pid;
        return configuration;
    }

    private async pickPID() {
        return new Promise<number>((resolve, reject) => {
            const args = [`${this.context.extensionPath}/debugger/emmy/windows/x86/emmy_tool.exe`, "list_processes"];
            const options: cp.ExecOptionsWithBufferEncoding = {
                encoding: 'buffer'
            };
            cp.exec(args.join(" "), options, (_err, stdout, _stderr) => {
                const str = iconv.decode(Buffer.from(stdout), 'gb2312');
                const arr = str.split('\r\n');
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
                
                vscode.window.showQuickPick(items, {
                    matchOnDescription: true,
                    matchOnDetail: true,
                    placeHolder: "Select the process to attach"
                }).then((item: ProcessInfoItem | undefined) => {
                    if (item) {
                        resolve(item.pid);
                    } else {
                        reject();
                    }
                });
            }).on("error", error => reject);
        });
    }
}
