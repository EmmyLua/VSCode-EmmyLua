import * as net from "net";
import * as cp from "child_process";
import * as proto from "./EmmyDebugProto";
import { EmmyDebugSession } from "./EmmyDebugSession";
import { OutputEvent } from "vscode-debugadapter";
import { DebugProtocol } from "vscode-debugprotocol";

interface EmmyLaunchDebugArguments extends DebugProtocol.LaunchRequestArguments {
    extensionPath: string;
    sourcePaths: string[];
    program?: string;
    arguments?: string[];
    workingDir?: string;
    ext: string[];
}

enum WinArch {
    X86, X64
}

export class EmmyLaunchDebugSession extends EmmyDebugSession {

    private program: string = "";
    private workingDir: string = "";
    private arguments: string[] = [];
    private childProcess?: cp.ChildProcess;
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

        this.pid = await this.runAndAttach();
        const client = net.connect(this.getPort(this.pid), 'localhost')
            .on('connect', () => {

                this.sendResponse(response);
                this.onConnect(client);
                this.readClient(client);
                this.sendMessage({ cmd: proto.MessageCMD.StartHookReq });
                //TODO 延时的原因是等待hook api完成,后续改成消息通知
                setTimeout(() => {
                    this.childProcess?.stdin?.write("connected\n");
                }, 300);
            })
            .on('error', err => {
                response.success = false;
                response.message = `${err}`;
                this.sendResponse(response);
            });
        this.client = client;
    }

    private async detectArch(): Promise<WinArch> {
        const cwd = `${this.extensionPath}/debugger/emmy/windows/x86`;
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

    private async runAndAttach(): Promise<number> {
        const arch = await this.detectArch();
        const archName = arch === WinArch.X64 ? 'x64' : 'x86';
        const cwd = `${this.extensionPath}/debugger/emmy/windows/${archName}`;
        const args = [

            "run_and_attach",
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
            let exe = cp.spawn(`emmy_tool.exe`, args, {
                cwd: cwd
            });
            exe.stdout.on("data", (buffer) => {
                let message = buffer.toString();
                if (message.startsWith("[PID]")) {
                    return r(Number(message.substring(5)))
                }
                this.sendEvent(new OutputEvent(message));
            });
            exe.stderr.on("data", buffer => {
                this.sendEvent(new OutputEvent("[ERROR]:"+buffer.toString()));
            })

            this.childProcess = exe;
        });
    }

    protected handleMessage(cmd: proto.MessageCMD, msg: any) {
        switch (cmd) {
            case proto.MessageCMD.AttachedNotify:
                const n: number = msg.state;
                this.sendEvent(new OutputEvent(`Attached to lua state 0x${n.toString(16)}\n`));
                break;
            case proto.MessageCMD.LogNotify:
                this.sendEvent(new OutputEvent(`${msg.message}\n`));
                break;
        }
        super.handleMessage(cmd, msg);
    }
}