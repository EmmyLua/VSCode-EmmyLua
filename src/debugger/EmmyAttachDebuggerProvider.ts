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
            var pidChoose = configuration.pid;
            //��ʾ��ǰѡ�еĽ����Ϣ
            vscode.window.showInformationMessage(`connect process ${pidChoose}`);
            return configuration;
        }

        const pid = await this.pickPIDByName(configuration.pName);
        configuration.pid = pid;
        return configuration;
    }

    public static isEmpty = (str: any): boolean => {
        if (
            str === null ||
            str === '' ||
            str === undefined ||
            str.length === 0
        ) {
            return true
        } else {
            return false
        }
    }

    private async pickPIDByName(pName: string) {
        return new Promise<number>((resolve, reject) => {
            const args = [`${this.context.extensionPath}/debugger/emmy/windows/x86/emmy_tool.exe`, "list_processes"];
            const options: cp.ExecOptionsWithBufferEncoding = {
                encoding: 'buffer'
            };
            cp.exec(args.join(" "), options, (_err, stdout, _stderr) => {
                const str = iconv.decode(stdout, 'gbk');
                const arr = str.split('\r\n');
                const size = Math.floor(arr.length / 4);
                var items: ProcessInfoItem[] = [];
                const itemMatchNames: number[] = [];
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
                    if (EmmyAttachDebuggerProvider.isEmpty(pName) == false &&
                        (title.toLowerCase().indexOf(pName.toLowerCase()) != -1 || path.toLowerCase().indexOf(pName.toLowerCase()) != -1)) {
                        itemMatchNames.push(pid);
                    }
                }

                if (itemMatchNames.length == 1) {
                    var pidChoose = itemMatchNames[0];
                    var pChoose:ProcessInfoItem|undefined = items.find(tt => tt.pid == pidChoose);
                    var pNameChoose = "";
                    if(pChoose != undefined)
                    {
                        pNameChoose = `${pChoose.label} ${pChoose.description}`;
                    }
                    resolve(pidChoose);
                    //show choose process info
                    vscode.window.showInformationMessage(`connect process ${pNameChoose}`);
                }
                else {
                    var note = "Select the process to attach";
                    if (EmmyAttachDebuggerProvider.isEmpty(pName) == false) {
                        if (itemMatchNames.length == 0) {
                            note = `${note}=== cannot find process match [${pName}]`;
                        }
                        else{
                            //exist more process match pName, only show it
                            items = items.filter(item => itemMatchNames.find(itemMatch => itemMatch == item.pid));
                            note = `${note}=== process match [${pName}]`;
                        }
                    }

                    vscode.window.showQuickPick(items, {
                        matchOnDescription: true,
                        matchOnDetail: true,
                        placeHolder: note
                    }).then((item: ProcessInfoItem | undefined) => {
                        if (item) {
                            resolve(item.pid);
                            
                            var pNameChoose = "";
                            if(item != undefined)
                            {
                                pNameChoose = `${item.label} ${item.description}`;
                            }
                            //show choose process info
                            vscode.window.showInformationMessage(`connect process ${pNameChoose}`);
                        } else {
                            reject();
                        }
                    });
                }
            }).on("error", error => reject);
        });
    }
}
