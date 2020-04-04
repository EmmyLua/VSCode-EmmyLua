import * as net from "net";
import * as readline from 'readline';
import * as proto from "./EmmyDebugProto";
import { DebugSession } from "./DebugSession";
import { DebugProtocol } from "vscode-debugprotocol";
import { StoppedEvent, StackFrame, Thread, Source, Handles, TerminatedEvent, InitializedEvent, Breakpoint, OutputEvent, Event } from "vscode-debugadapter";
import { EmmyStack, IEmmyStackNode, EmmyVariable, IEmmyStackContext } from "./EmmyDebugData";
import { readFileSync } from "fs";
import { join, normalize } from "path";

interface EmmyDebugArguments extends DebugProtocol.AttachRequestArguments {
	extensionPath: string;
    sourcePaths: string[];
    host: string;
    port: number;
    ext: string[];
    ideConnectDebugger: boolean;
}

export class EmmyDebugSession extends DebugSession implements IEmmyStackContext {
    private socket: net.Server | undefined;
    protected client: net.Socket | undefined;
    private readHeader = true;
    private currentCmd: proto.MessageCMD = proto.MessageCMD.Unknown;
    private breakNotify: proto.IBreakNotify | undefined;
    private currentFrameId = 0;
    private breakPointId = 0;
    private evalIdCount = 0;
    private listenMode = false;
    private breakpoints: proto.IBreakPoint[] = [];
    protected extensionPath: string = '';
    
    handles = new Handles<IEmmyStackNode>();

    protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
        response.body = {
            
        };
        this.sendResponse(response);
    }

    protected launchRequest(response: DebugProtocol.LaunchResponse, args: EmmyDebugArguments): void {
        this.ext = args.ext;
        this.extensionPath = args.extensionPath;
        if (!args.ideConnectDebugger) {
            this.listenMode = true;
            const socket = net.createServer(client => {
                this.client = client;
                this.sendResponse(response);
                this.onConnect(this.client);
                this.readClient(client);
                this.sendEvent(new Event('onNewConnection'));
            })
            .listen(args.port, args.host)
            .on('listening', () => {
                this.sendEvent(new OutputEvent(`Server(${args.host}:${args.port}) open successfully, wait for connection...\n`));
            })
            .on('error', err => {
                this.sendEvent(new OutputEvent(`${err}`, 'stderr'));
                response.success = false;
                response.message = `${err}`;
                this.sendResponse(response);
            });
            this.socket = socket;
            this.sendEvent(new Event('showWaitConnection'));
        }
        else {
            // send resp
            const client = net.connect(args.port, args.host)
            .on('connect', () => {
                this.sendResponse(response);
                this.onConnect(client);
                this.readClient(client);
            })
            .on('error', err => {
                response.success = false;
                response.message = `${err}`;
                this.sendResponse(response);
            });
        }
    }

    protected customRequest(command: string, response: DebugProtocol.Response, args: any): void {
        if (command === 'stopWaitConnection') {
            this.sendEvent(new OutputEvent('---> stop'));
            this.sendEvent(new TerminatedEvent());
        }
        else {
            super.customRequest(command, response, args);
        }
    }

    protected onConnect(client: net.Socket) {
        this.sendEvent(new OutputEvent(`Connected.\n`));
        this.client = client;

        const extPath = this.extensionPath;
        const emmyHelperPath = join(extPath, 'debugger/emmy/emmyHelper.lua');
        // send init event
        const emmyHelper = readFileSync(emmyHelperPath);
        const initReq: proto.IInitReq = {
            cmd: proto.MessageCMD.InitReq,
            emmyHelper: emmyHelper.toString(),
            ext: this.ext
        };
        this.sendMessage(initReq);

        // add breakpoints
        this.sendBreakpoints();

        // send ready
        this.sendMessage({ cmd: proto.MessageCMD.ReadyReq });
        this.sendEvent(new InitializedEvent());
    }

    protected readClient(client: net.Socket) {
        readline.createInterface({
            input: <NodeJS.ReadableStream> client,
            output: client
        })
        .on("line", line => this.onReceiveLine(line));
        client.on('close', hadErr => this.onSocketClose())
        .on('error', err => this.onSocketClose());
    }

    private onSocketClose() {
        if (this.client) {
            this.client.removeAllListeners();
        }
        this.sendEvent(new OutputEvent('Disconnected.\n'));
        if (this.listenMode) {
            this.client = undefined;
        } else {
            this.sendEvent(new TerminatedEvent());
        }
    }
    
    protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
        this.sendDebugAction(response, proto.DebugAction.Stop);
        setTimeout(() => {
            if (this.socket) {
                this.socket.close();
                this.socket = undefined;
            }
            if (this.client) {
                this.client.end();
                this.client = undefined;
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

    protected handleMessage(cmd: proto.MessageCMD, msg: any) {
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

    protected async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): Promise<void> {
        if (this.breakNotify) {
            const stackFrames: StackFrame[] = [];
            const stacks = this.breakNotify.stacks;
            for (let i = 0; i < stacks.length; i++) {
                const stack = stacks[i];
                let file = stack.file;
                if (stack.line >= 0) {
                    file = await this.findFile(stack.file);
                }
                else if (i < stacks.length - 1) {
                    continue;
                }
                let source = new Source(stack.file, file);
                stackFrames.push(new StackFrame(stack.level, stack.functionName, source, stack.line));
            }
            response.body = {
                stackFrames: stackFrames,
                totalFrames: stackFrames.length
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
        const evalResp = await this.eval(args.expression, 0);
        if (evalResp.success) {
            const emmyVar = new EmmyVariable(evalResp.value);
            const variable = emmyVar.toVariable(this);
            response.body = {
                result: variable.value,
                type: variable.type,
                variablesReference: variable.variablesReference
            };
        }
        else {
            response.body = {
                result: evalResp.error,
                type: 'string',
                variablesReference: 0
            };
        }
        this.sendResponse(response);
    }

    async eval(expr: string, cacheId: number, depth: number = 1): Promise<proto.IEvalRsp> {
        const req: proto.IEvalReq = {
            cmd: proto.MessageCMD.EvalReq,
            seq: this.evalIdCount++,
            stackLevel: this.currentFrameId,
            expr: expr,
            depth: depth,
            cacheId: cacheId
        };
        this.sendMessage(req);
        return new Promise<proto.IEvalRsp>((resolve, reject) => {
            const listener = (msg: proto.IEvalRsp) => {
                if (msg.seq === req.seq) {
                    this.removeListener('onEvalRsp', listener);
                    resolve(msg);
                }
            };
            this.on('onEvalRsp', listener);
        });
    }

    protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
        const source = args.source;
        const bpsProto: proto.IBreakPoint[] = [];
        if (source && source.path) {
            const path = normalize(source.path);
            const bps = args.breakpoints || [];
            const bpsResp: DebugProtocol.Breakpoint[] = [];
            for (let i = 0; i < bps.length; i++) {
                const bp = bps[i];
                bpsProto.push({
                    file: path,
                    line: bp.line
                });

                const bpResp = <DebugProtocol.Breakpoint> new Breakpoint(true, bp.line);
                bpResp.id = this.breakPointId++;
                bpsResp.push(bpResp);
            }
            response.body = { breakpoints: bpsResp };

            for(let idx = this.breakpoints.length - 1; idx >= 0; idx--) {
                if(this.breakpoints[idx].file === path) {
                    this.breakpoints.splice(idx, 1);
                }
            }
            this.breakpoints = this.breakpoints.concat(bpsProto);
        }
        this.sendBreakpoints();
        this.sendResponse(response);
    }


    private sendBreakpoints() {
        const req: proto.IAddBreakPointReq = {
            breakPoints: this.breakpoints,
            clear: true,
            cmd: proto.MessageCMD.AddBreakPointReq
        };
        this.sendMessage(req);
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