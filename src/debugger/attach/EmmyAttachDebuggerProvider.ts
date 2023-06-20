import { basename } from 'path';
import * as vscode from 'vscode';
import * as cp from "child_process";
import * as iconv from 'iconv-lite';
import { EmmyAttachDebugConfiguration } from "../base/types";
import { DebuggerProvider } from "../base/DebuggerProvider";

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
        configuration.processName = configuration.processName ?? ""
        if (configuration.pid > 0) {
            return configuration;
        }

        const pid = await this.pickPID(configuration.processName);
        configuration.pid = pid;
        return configuration;
    }

    private async pickPID(processName: string) {
        return new Promise<number>((resolve, reject) => {
            const args = [`"${this.context.extensionPath}/debugger/emmy/windows/x86/emmy_tool.exe"`, "list_processes"];
            cp.exec(args.join(" "), { encoding: 'buffer' }, (_err, stdout, _stderr) => {
                const str = iconv.decode(stdout, "cp936");
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
                    if (processName.length === 0
                        || title.indexOf(processName) !== -1
                        || name.indexOf(processName) !== -1) {
                        items.push(item);
                    }
                }
                if (items.length > 1) {
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
                }else if(items.length == 1){
                    resolve(items[0].pid);
                }else{
                    vscode.window.showErrorMessage("No process for attach")
                    reject();
                }
                
            }).on("error", error => reject);
        });
    }
}
