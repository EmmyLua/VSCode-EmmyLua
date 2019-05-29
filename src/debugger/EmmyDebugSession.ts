import * as net from "net";
import * as readline from 'readline';
import * as proto from "./EmmyDebugProto";
import { DebugSession } from "./DebugSession";
import { DebugProtocol } from "vscode-debugprotocol";
import { StoppedEvent, StackFrame, Thread, Source, Handles } from "vscode-debugadapter";
import { EmmyStack, IEmmyStackNode, EmmyVariable, IEmmyStackContext } from "./EmmyDebugData";

export class EmmyDebugSession extends DebugSession implements IEmmyStackContext {
    private socket: net.Server | null = null;
    private client: net.Socket | null = null;
    private readHeader = true;
    private currentCmd: proto.MessageCMD = proto.MessageCMD.Unknown;
    private breakNotify: proto.BreakNotify | null = null;
    private currentFrameId = 0;
    private evalIdCount = 0;
    handles = new Handles<IEmmyStackNode>();

    protected launchRequest(response: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments): void {
        const socket = net.createServer(client => {
            this.client = client;
            readline.createInterface({
                input: <NodeJS.ReadableStream> client,
                output: client
            })
            .on("line", line => this.onReceiveLine(line));
        }).listen(9966);
        //.listen('\\\\.\\pipe\\emmylua-emmy');
        this.socket = socket;
        // send resp
        this.sendResponse(response);
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
            const stack = this.handles.get(args.variablesReference);
            const children = await stack.computeChildren(this);
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

    async eval(expr: string, depth: number = 1): Promise<proto.Variable | null> {
        const req: proto.EvalReq = {
            cmd: proto.MessageCMD.EvalReq,
            seq: this.evalIdCount++,
            stackLevel: this.currentFrameId,
            expr: expr,
            depth: depth
        };
        this.sendMessage(req);
        return new Promise((resolve, reject) => {
            const listener = (msg: proto.EvalRsp) => {
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
        const req: proto.ActionReq = { cmd: proto.MessageCMD.ActionReq, action: action };
        this.sendMessage(req);
        this.sendResponse(response);
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