import * as net from "net";
import * as readline from 'readline';
import * as proto from "./EmmyDebugProto";
import { DebugSession } from "./DebugSession";
import { DebugProtocol } from "@vscode/debugprotocol";
import { StoppedEvent, StackFrame, Thread, Source, Handles, TerminatedEvent, InitializedEvent, Breakpoint, OutputEvent } from "@vscode/debugadapter";
import { EmmyStack, IEmmyStackNode, EmmyVariable, IEmmyStackContext, EmmyStackENV } from "./EmmyDebugData";
import { readFileSync } from "fs";
import { join, normalize } from "path";



export class EmmyDebugSession extends DebugSession implements IEmmyStackContext {
    protected client?: net.Socket;
    private readHeader = true;
    private currentCmd: proto.MessageCMD = proto.MessageCMD.Unknown;
    private breakNotify?: proto.IBreakNotify;
    private currentFrameId = 0;
    private breakPointId = 0;
    private evalIdCount = 0;
    private breakpoints: proto.IBreakPoint[] = [];
    protected extensionPath: string = '';

    handles = new Handles<IEmmyStackNode>();

    protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
        response.body = {
            supportsEvaluateForHovers: true,
            supportTerminateDebuggee: true,
            supportsLogPoints: true,
            supportsHitConditionalBreakpoints: true,
            supportsSetExpression: true,
            // supportsDelayedStackTraceLoading: true,
            // supportsCompletionsRequest: true
        };
        this.sendResponse(response);
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
            input: <NodeJS.ReadableStream>client,
            output: client
        }).on("line", line => this.onReceiveLine(line));

        client.on('close', hadErr => this.onSocketClose())
            .on('error', err => this.onSocketClose());
    }

    protected onSocketClose() {
        if (this.client) {
            this.client.removeAllListeners();
        }
        this.sendEvent(new OutputEvent('Disconnected.\n'));
        this.sendEvent(new TerminatedEvent());
    }

    protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
        this.sendDebugAction(response, proto.DebugAction.Stop);
    }

    private onReceiveLine(line: string) {
        if (this.readHeader) {
            this.currentCmd = parseInt(line);
        }
        else {
            const data = JSON.parse(line);
            this.handleDebugMessage(this.currentCmd, data);
        }
        this.readHeader = !this.readHeader;
    }

    protected handleDebugMessage(cmd: proto.MessageCMD, msg: any) {
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
            const env = new EmmyStackENV(stackData);
            response.body = {
                scopes: [
                    {
                        name: "Variables",
                        presentationHint: "locals",
                        variablesReference: this.handles.create(stack),
                        expensive: false
                    },
                    {
                        name: "ENV",
                        variablesReference: this.handles.create(env),
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
        const evalResp = await this.eval(args.expression, 0, 1, args.frameId);
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

    async eval(expr: string, cacheId: number, depth: number = 1, stackLevel = -1): Promise<proto.IEvalRsp> {
        const req: proto.IEvalReq = {
            cmd: proto.MessageCMD.EvalReq,
            seq: this.evalIdCount++,
            stackLevel: stackLevel >= 0 ? stackLevel: this.currentFrameId,
            expr,
            depth,
            cacheId
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

    async setEval(expr: string, value: string, cacheId: number, depth: number = 1, stackLevel = -1): Promise<proto.IEvalRsp> {
        const req: proto.IEvalReq = {
            cmd: proto.MessageCMD.EvalReq,
            seq: this.evalIdCount++,
            stackLevel: stackLevel >= 0 ? stackLevel : this.currentFrameId,
            expr,
            depth,
            cacheId,
            value,
            setValue: true,
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
                    line: bp.line,
                    condition: bp.condition,
                    hitCondition: bp.hitCondition,
                    logMessage: bp.logMessage
                });

                const bpResp = <DebugProtocol.Breakpoint>new Breakpoint(true, bp.line);
                bpResp.id = this.breakPointId++;
                bpsResp.push(bpResp);
            }
            response.body = { breakpoints: bpsResp };

            this.breakpoints = this.breakpoints.filter(v => v.file !== path);
            this.breakpoints = this.breakpoints.concat(bpsProto);
        }
        this.sendBreakpoints();
        this.sendResponse(response);
    }

    protected async setExpressionRequest(response: DebugProtocol.SetExpressionResponse, args: DebugProtocol.SetExpressionArguments, request?: DebugProtocol.Request): Promise<void> {
        const evalResp = await this.setEval(args.expression, args.value,0, 1, args.frameId);
        if (evalResp.success) {
            const emmyVar = new EmmyVariable(evalResp.value);
            const variable = emmyVar.toVariable(this);
            response.body = {
                value: variable.value,
                type: variable.type,
                variablesReference: variable.variablesReference
            };
        }
        else {
            response.body = {
                value: evalResp.error,
                type: 'string',
                variablesReference: 0
            };
        }
        this.sendResponse(response);
    }
    // protected completionsRequest(response: DebugProtocol.CompletionsResponse, args: DebugProtocol.CompletionsArguments, request?: DebugProtocol.Request): void {
        
    // }


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
