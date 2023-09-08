import * as net from "net";
import * as cp from "child_process";
import * as proto from "../base/EmmyDebugProto";
import { EmmyDebugSession } from "../base/EmmyDebugSession";
import { OutputEvent, TerminatedEvent } from "@vscode/debugadapter";
import { DebugProtocol } from "@vscode/debugprotocol";

interface EmmyLaunchDebugArguments extends DebugProtocol.LaunchRequestArguments {
    extensionPath: string;
    sourcePaths: string[];
    program: string;
    arguments: string[];
    workingDir: string;
    blockOnExit?: boolean;
    newWindow?: boolean;
    ext: string[];
}

enum WinArch {
    X86, X64
}

export class EmmyLaunchDebugSession extends EmmyDebugSession {

    private program: string = "";
    private workingDir: string = "";
    private arguments: string[] = [];
    private toolProcess?: cp.ChildProcess;
    private pid = 0;


    private getPort(pid: number): number {
        let port = pid;
        while (port > 0xffff) { port -= 0xffff; }
        while (port < 0x400) { port += 0x400; }
        return port;
    }

    protected async launchRequest(response: DebugProtocol.LaunchResponse, args: EmmyLaunchDebugArguments): Promise<void> {
        this.extensionPath = args.extensionPath;
        this.ext = args.ext;

        this.program = args.program ?? "";
        this.workingDir = args.workingDir ?? ""
        this.arguments = args.arguments ?? []
        if (args.newWindow) {
            this.pid = await this.launchWithWindow();
        }
        else {
            this.pid = await this.launchDebug();
        }
        const client = net.connect({
            port: this.getPort(this.pid),
            host: "localhost",
            family: 4
        })
            .on('connect', () => {

                this.sendResponse(response);
                this.onConnect(client);
                this.readClient(client);
                this.sendMessage({ cmd: proto.MessageCMD.StartHookReq });
                //TODO 延时的原因是等待hook api完成,后续改成消息通知
                setTimeout(() => {
                    this.toolProcess?.stdin?.write("connected\n");
                }, 500);
            })
            .on('error', err => {
                response.success = false;
                response.message = `${err}`;
                this.sendResponse(response);
            });
        this.client = client;
    }

    private async detectArch(): Promise<WinArch> {
        const cwd = `${this.extensionPath}/debugger/emmy/windows/x64`;
        const args = [
            'emmy_tool.exe',
            'arch_file',
            `${this.program}`
        ];
        return new Promise<WinArch>((r, c) => {
            cp.exec(args.join(" "), { cwd: cwd })
                .on('close', (code) => {
                    r(code === 0 ? WinArch.X64 : WinArch.X86);
                })
                .on('error', c);
        });
    }

    protected onDisconnect(): void {
        this.toolProcess?.stdin?.write("close");
    }

    private async launchWithWindow(): Promise<number> {
        const arch = await this.detectArch();
        const archName = arch === WinArch.X64 ? 'x64' : 'x86';
        const cwd = `${this.extensionPath}/debugger/emmy/windows/${archName}`;
        // const mc = this.program.match(/[^/\\]+$/);
        const args = [
            "launch",
            "-create-new-window",
            "-dll",
            "emmy_hook.dll",
            "-dir",
            `"${cwd}"`,
            "-work",
            `"${this.workingDir}"`,
            "-exe",
            `"${this.program}"`,
            "-args"
        ];

        args.push(...(<string[]>this.arguments));
        return new Promise((r, c) => {
            const childProcess = cp.spawn(`emmy_tool.exe`, args, {
                cwd: cwd,
                windowsHide: false
            });
            childProcess.stderr.on("data", (e) => {
                const s = e.toString();
                this.sendEvent(new OutputEvent(s));
            });
            let forOut = false;
            childProcess.stdout.on("data", (e) => {
                if (!forOut) {
                    forOut = true;
                    r(Number(e.toString()));
                }
                else {
                    this.sendEvent(new OutputEvent(e.toString()));
                }
            });

            childProcess.on("exit", code => {
                this.sendEvent(new TerminatedEvent());
                this.toolProcess = undefined;
            });
            this.toolProcess = childProcess;
        });
    }

    private async launchDebug(): Promise<number> {
        const arch = await this.detectArch();
        const archName = arch === WinArch.X64 ? 'x64' : 'x86';
        const cwd = `${this.extensionPath}/debugger/emmy/windows/${archName}`;
        const args = [
            "launch",
            "-dll",
            "emmy_hook.dll",
            "-dir",
            `"${cwd}"`,
            "-work",
            `"${this.workingDir}"`,
            "-exe",
            `"${this.program}"`,
            "-args",
        ];

        args.push(...(<string[]>this.arguments));
        return new Promise((r, c) => {
            const childProcess = cp.spawn(`emmy_tool.exe`, args, {
                cwd: cwd,
                windowsHide: false
            });
            childProcess.stderr.on("data", (e) => {
                const s = e.toString();
                this.sendEvent(new OutputEvent(s));
            });
            let forOut = false;
            childProcess.stdout.on("data", (e) => {
                if (!forOut) {
                    forOut = true;
                    r(Number(e.toString()));
                }
                else {
                    this.sendEvent(new OutputEvent(e.toString()));
                }
            });

            childProcess.on("exit", code => {
                this.sendEvent(new TerminatedEvent());
                this.toolProcess = undefined;
            });

            this.toolProcess = childProcess;
        });
    }

    protected handleDebugMessage(cmd: proto.MessageCMD, msg: any) {
        switch (cmd) {
            case proto.MessageCMD.AttachedNotify:
                const n: number = msg.state;
                this.sendEvent(new OutputEvent(`Attached to lua state 0x${n.toString(16)}\n`));
                break;
            case proto.MessageCMD.LogNotify:
                this.sendEvent(new OutputEvent(`${msg.message}\n`));
                break;
        }
        super.handleDebugMessage(cmd, msg);
    }

    protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments) {
        super.disconnectRequest(response, args);
        if (args.terminateDebuggee) {
            this.toolProcess?.stdin?.write("close");
        }
    }

    protected onSocketClose() {
        if (this.client) {
            this.client.removeAllListeners();
        }
        this.sendEvent(new OutputEvent('Disconnected.\n'));
    }

}
