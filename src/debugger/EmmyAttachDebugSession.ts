import * as net from "net";
import * as cp from "child_process";
import * as proto from "./EmmyDebugProto";
import { EmmyDebugSession } from "./EmmyDebugSession";
import { OutputEvent } from "vscode-debugadapter";
import { DebugProtocol } from "vscode-debugprotocol";
import { close } from "fs";

interface EmmyAttachDebugArguments extends DebugProtocol.AttachRequestArguments {
    extensionPath: string;
    sourcePaths: string[];
    ext: string[];
    pid: number;

    program?: string;
    arguments?: string[];
    workingDir?: string;
}

enum WinArch {
    X86, X64
}

export class EmmyAttachDebugSession extends EmmyDebugSession {

    private pid = 0;
    private program?: string;
    private workingDir?: string;
    private arguments?: string[];
    private childProcess?: cp.ChildProcess;

    private getPort(pid: number): number {
        var port = pid;
        while (port > 0xffff) { port -= 0xffff; }
        while (port < 0x400) { port += 0x400; }
        return port;
    }

    async attachRequest(response: DebugProtocol.AttachResponse, args: EmmyAttachDebugArguments) {
        this.extensionPath = args.extensionPath;
        this.ext = args.ext;
        this.pid = args.pid;

        if (!args.program) {
            this.sendEvent(new OutputEvent(String("attach")))
            await this.attach();
            // send resp
            const client = net.connect(this.getPort(args.pid), 'localhost')
                .on('connect', () => {
                    this.sendResponse(response);
                    this.onConnect(client);
                    this.readClient(client);
                    this.sendMessage({ cmd: proto.MessageCMD.StartHookReq });
                })
                .on('error', err => {
                    response.success = false;
                    response.message = `${err}`;
                    this.sendResponse(response);
                });
            this.client = client;
        } else {
            this.sendEvent(new OutputEvent(String("run attach")))
            this.program = args.program;
            this.workingDir = args.workingDir
            this.arguments = args.arguments

            this.pid = await this.runAndAttach();
            const client = net.connect(this.getPort(this.pid), 'localhost')
                .on('connect', () => {
                    
                    this.sendResponse(response);
                    this.onConnect(client);
                    this.readClient(client);
                    this.sendMessage({ cmd: proto.MessageCMD.StartHookReq });
                    setTimeout(() => {
                        this.childProcess?.stdin?.write("connected\n");
                    }, 150);
                    // this.childProcess?.stdin?.write("connected\n");
                })
                .on('error', err => {
                    response.success = false;
                    response.message = `${err}`;
                    this.sendResponse(response);
                });
            this.client = client;

        }

    }

    private async detectArch(): Promise<WinArch> {
        const cwd = `${this.extensionPath}/debugger/emmy/windows/x86`;
        const args = [
            'emmy_tool.exe',
        ];

        if (this.program) {
            args.push('arch_file', `${this.program}`);
        } else {
            args.push('arch_pid', `${this.pid}`);
        }

        return new Promise<WinArch>((r, c) => {
            cp.exec(args.join(" "), { cwd: cwd })
                .on('close', (code) => {
                    r(code === 0 ? WinArch.X64 : WinArch.X86);
                })
                .on('error', c);
        });
    }

    private async attach() {
        const arch = await this.detectArch();
        const archName = arch === WinArch.X64 ? 'x64' : 'x86';
        const cwd = `${this.extensionPath}/debugger/emmy/windows/${archName}`;
        const args = [
            'emmy_tool.exe',
            'attach',
            '-p',
            `${this.pid}`,
            '-dir',
            `"${cwd}"`,
            '-dll',
            'emmy_hook.dll'
        ];
        return new Promise((r, c) => {
            cp.exec(args.join(" "), { cwd: cwd }, (err, stdout, stderr) => {
                this.sendEvent(new OutputEvent(stdout));
                })
                .on('close', (code) => {
                    if (code === 0) {
                        r(true);
                    }
                    else {
                        c(`Exit code = ${code}`);
                    }
                });

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
                this.sendEvent(new OutputEvent(buffer.toString()));
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