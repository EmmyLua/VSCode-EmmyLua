import * as net from "net";
import * as readline from 'readline';
import * as proto from "./EmmyDebugProto";
import { DebugSession } from "./DebugSession";
import { DebugProtocol } from "vscode-debugprotocol";
import { StoppedEvent, StackFrame, Thread, Source, Handles, Variable } from "vscode-debugadapter";

export class EmmyDebugSession extends DebugSession {
    private socket: net.Server | null = null;
    private client: net.Socket | null = null;
    private readHeader = true;
    private breakNotify: proto.BreakNotify;
    private curFrameId = 0;
    private handles = new Handles();

    protected launchRequest(response: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments): void {
        const socket = net.createServer(client => {
            this.client = client;
            readline.createInterface({
                input: client,
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
        if (!this.readHeader) {
            const data = JSON.parse(line);
            this.handleMessage(data.cmd, data);
        }
        this.readHeader = !this.readHeader;
    }

    private handleMessage(cmd: proto.MessageCMD, msg: any) {
        switch (cmd) {
            case proto.MessageCMD.BreakNotify:
                this.breakNotify = msg;
                this.sendEvent(new StoppedEvent("breakpoint", 1));
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
		this.curFrameId = args.frameId;
		const stack = this.breakNotify.stacks[args.frameId];
		response.body = {
			scopes: [
				{
					name: "Variables",
					variablesReference: this.handles.create(stack),
					expensive: false
				}
			]
		};
		this.sendResponse(response);
	}

	protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): void {
		if (this.breakNotify) {
            const stack: proto.Stack = this.handles.get(args.variablesReference) as proto.Stack;
            const variables = stack.localVariables.concat(stack.upvalueVariables);
            response.body = {
                variables: variables.map(v => {
                    return new Variable(v.name, v.value);
                })
            };
            this.sendResponse(response);
		} else {
			this.sendResponse(response);
		}
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