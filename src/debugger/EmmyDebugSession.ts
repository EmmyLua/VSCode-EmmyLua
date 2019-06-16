import * as net from "net";
import * as readline from 'readline';
import * as proto from "./EmmyDebugProto";
import { DebugSession } from "./DebugSession";
import { DebugProtocol } from "vscode-debugprotocol";
import { StoppedEvent, StackFrame, Thread, Source, Handles, TerminatedEvent } from "vscode-debugadapter";
import { EmmyStack, IEmmyStackNode, EmmyVariable, IEmmyStackContext } from "./EmmyDebugData";
import { readFileSync } from "fs";

export class EmmyDebugSession extends DebugSession implements IEmmyStackContext {
    private socket: net.Server | null = null;
    private client: net.Socket | null = null;
    private readHeader = true;
    private currentCmd: proto.MessageCMD = proto.MessageCMD.Unknown;
    private breakNotify: proto.IBreakNotify | null = null;
    private currentFrameId = 0;
    private evalIdCount = 0;
    handles = new Handles<IEmmyStackNode>();

    protected launchRequest(response: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments): void {
        /*const socket = net.createServer(client => {
            this.client = client;
            readline.createInterface({
                input: <NodeJS.ReadableStream> client,
                output: client
            })
            .on("line", line => this.onReceiveLine(line));
        }).listen(9966);
        //.listen('\\\\.\\pipe\\emmylua-emmy');
        this.socket = socket;*/
        // send resp
        this.sendResponse(response);
        const client = net.connect(9966, "localhost", )
        .on('connect', () => {
            this.onConnect(client);
        });
    }

    private onConnect(client: net.Socket) {
        this.client = client;
        this.readClient(client);

        // send init event
        const emmyHelper = readFileSync('D:/Git/OpenSource/EmmyLua/VSCode-EmmyLua/debugger/emmy/emmyHelper.lua');
        const initReq: proto.IInitReq = { cmd: proto.MessageCMD.InitReq, emmyHelper: emmyHelper.toString() };
        this.sendMessage(initReq);

        // add breakpoints

        // send ready
        this.sendMessage({ cmd: proto.MessageCMD.ReadyReq });
    }

    private readClient(client: net.Socket) {
        readline.createInterface({
            input: <NodeJS.ReadableStream> client,
            output: client
        })
        .on("line", line => this.onReceiveLine(line));
        client.on('close', hadErr => this.onSocketClose())
        .on('error', err => this.onSocketClose());
    }

    private onSocketClose() {
        this.sendEvent(new TerminatedEvent());
    }
    
    protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
        this.sendDebugAction(response, proto.DebugAction.Stop);
        setTimeout(() => {
            if (this.socket) {
                this.socket.close();
                this.socket = null;
            }
            if (this.client) {
                this.client.end();
                this.client = null;
            }
        }, 1000);
    }

    private onReceiveLine(line: string) {
        if (this.readHeader) {
            this.currentCmd = parseInt(line);
        }
        else {
            const data = JSON.parse(line);
            this.handleMessage(this.currentCmd, data);
        }
        this.readHeader = !this.readHeader;
    }

    private handleMessage(cmd: proto.MessageCMD, msg: any) {
        switch (cmd) {
            case proto.MessageCMD.BreakNotify:
                this.breakNotify = msg;
                this.sendEvent(new StoppedEvent("breakpoint", 1));
                break;
            case proto.MessageCMD.EvalRsp:
                this.emit('onEvalRsp', msg);
                break;
        }
    }

    protected sendMessage(msg: { cmd: proto.MessageCMD }) {
        if (this.client) {
            this.client.write(`${msg.cmd}\n`);
            this.client.write(`${JSON.stringify(msg)}\n`);
        }
    }

    protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		response.body = {
			threads: [
				new Thread(1, "thread 1")
			]
		};
		this.sendResponse(response);
	}

    protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {
        if (this.breakNotify) {
            response.body = {
                stackFrames: this.breakNotify.stacks.map(stack => {
                    var source = new Source(stack.file);
                    return new StackFrame(stack.level, stack.functionName, source, this.convertDebuggerLineToClient(stack.line));
                }),
                totalFrames: this.breakNotify.stacks.length
            };
        }
        this.sendResponse(response);
    }

    protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
        this.currentFrameId = args.frameId;
        if (this.breakNotify) {
            const stackData = this.breakNotify.stacks[args.frameId];
            const stack = new EmmyStack(stackData);
            response.body = {
                scopes: [
                    {
                        name: "Variables",
                        variablesReference: this.handles.create(stack),
                        expensive: false
                    }
                ]
            };
        }
		this.sendResponse(response);
	}

	protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): Promise<void> {
		if (this.breakNotify) {
            const node = this.handles.get(args.variablesReference);
            const children = await node.computeChildren(this);
            response.body = {
                variables: children.map(v => v.toVariable(this))
            };
		}
        this.sendResponse(response);
    }
    
    protected async evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): Promise<void> {
        const data = await this.eval(args.expression);
        if (data) {
            const emmyVar = new EmmyVariable(data);
            const variable = emmyVar.toVariable(this);
            response.body = {
                result: variable.value,
                type: variable.type,
                variablesReference: variable.variablesReference
            };
        }
        this.sendResponse(response);
    }

    async eval(expr: string, depth: number = 1): Promise<proto.IVariable | null> {
        const req: proto.IEvalReq = {
            cmd: proto.MessageCMD.EvalReq,
            seq: this.evalIdCount++,
            stackLevel: this.currentFrameId,
            expr: expr,
            depth: depth
        };
        this.sendMessage(req);
        return new Promise((resolve, reject) => {
            const listener = (msg: proto.IEvalRsp) => {
                if (msg.seq === req.seq) {
                    this.removeListener('onEvalRsp', listener);
                    if (msg.success) {
                        resolve(msg.value);
                    } else {
                        reject();
                    }
                }
            };
            this.on('onEvalRsp', listener);
        });
    }

    private sendDebugAction(response: DebugProtocol.Response, action: proto.DebugAction) {
        const req: proto.IActionReq = { cmd: proto.MessageCMD.ActionReq, action: action };
        this.sendMessage(req);
        this.sendResponse(response);
    }

    protected pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments): void {
        this.sendDebugAction(response, proto.DebugAction.Break);
    }

    protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
        this.sendDebugAction(response, proto.DebugAction.Continue);
    }

    protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
        this.sendDebugAction(response, proto.DebugAction.StepOver);
    }

    protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments): void {
        this.sendDebugAction(response, proto.DebugAction.StepIn);
    }

    protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments): void {
        this.sendDebugAction(response, proto.DebugAction.StepOut);
    }
}

EmmyDebugSession.run(EmmyDebugSession);