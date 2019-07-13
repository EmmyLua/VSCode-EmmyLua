import {
	OutputEvent, TerminatedEvent, InitializedEvent,
	Breakpoint, StoppedEvent, StackFrame, Source, Thread, Handles
} from 'vscode-debugadapter';
import { DebugProtocol } from "vscode-debugprotocol";
import * as cp from "child_process";
import * as net from "net";
import * as sb from "smart-buffer";
import {
	LuaAttachMessage, DMReqInitialize, DebugMessageId, DMMessage, DMLoadScript,
	DMAddBreakpoint, DMBreak, StackNodeContainer, StackRootNode, IStackNode,
	DMReqEvaluate, DMRespEvaluate, ExprEvaluator, LoadedScript, LoadedScriptManager,
	DMDelBreakpoint,
	LuaXObjectValue
} from './AttachProtol';
import { ByteArray } from './ByteArray';
import * as path from 'path';
import { DebugSession } from './DebugSession';

var emmyArchExe:string, emmyLua: string;
var breakpointId:number = 0;

interface EmmyDebugArguments {
	extensionPath: string;
	sourcePaths: string[];
	captureStd: boolean;
	captureOutputDebugString: boolean;
    ext: string[];
}

interface EmmyAttachRequestArguments extends DebugProtocol.AttachRequestArguments, EmmyDebugArguments {
	pid: number;
}

interface EmmyLaunchRequesetArguments extends DebugProtocol.LaunchRequestArguments, EmmyDebugArguments {
	program: string;
	arguments: string[];
	workingDir: string;
    ext: string[];
}

interface EmmyBreakpoint {
	id: number;
	scriptIndex: number;
	line: number;
}

export class AttachDebugSession extends DebugSession implements ExprEvaluator, LoadedScriptManager {

	private socket?: net.Socket;
	private receiveBuf = new sb.SmartBuffer();
	private expectedLen = 0;
	private breakpoints = new Map<string, EmmyBreakpoint[]>();
	private loadedScripts = new Map<string, LoadedScript>();
	private break?: DMBreak;
	private curFrameId = 0;
	private handles: Handles<IStackNode> = new Handles<IStackNode>();
	private evalIdCounter = 0;
	private evalMap = new Map<number, (v:DMRespEvaluate) => void>();
	
	public constructor() {
		super();
		this.setDebuggerColumnsStartAt1(false);
		this.setDebuggerLinesStartAt1(false);
	}

	private initEnv(args: EmmyDebugArguments) {
		emmyArchExe = `${args.extensionPath}/debugger/windows/x86/emmy.arch.exe`;
		emmyLua = `${args.extensionPath}/debugger/Emmy.lua`;
	}

	protected launchRequest(response: DebugProtocol.LaunchResponse, args: EmmyLaunchRequesetArguments): void {
		this.initEnv(args);
		this.ext = args.ext;
		cp.exec(`${emmyArchExe} arch -file ${args.program}`).on("exit", code => {
			if (code === 0xffffffff) {
				this.sendEvent(new OutputEvent(`Program: ${args.program} not found!`));
				this.sendEvent(new TerminatedEvent());
			} else {
				const isX86 = code === 1;
				const arch = isX86 ? "x86" : "x64";
				this.sendEvent(new OutputEvent(`Launch program with ${arch} debugger.\n`));
				const toolExe = `${args.extensionPath}/debugger/windows/${arch}/emmy.tool.exe`;
				const argList = [toolExe, "-m", "run", "-c", args.program, "-e", emmyLua, '-w', args.workingDir, "--console", "true"];
				if (args.arguments.length > 0) {
					argList.push("-a", args.arguments.join(" "));
				}
				const ls = this.runDebugger(argList.join(" "), args, response);
				this.once("initialized", () => {
					ls.stdin.write("resume\n");
				});
			}
		});
	}

	protected attachRequest(response: DebugProtocol.AttachResponse, args: EmmyAttachRequestArguments): void {
		this.initEnv(args);
		this.ext = args.ext;
		cp.exec(`${emmyArchExe} arch -pid ${args.pid}`, (err, stdout) => {
			const isX86 = stdout === "1";
			const arch = isX86 ? "x86" : "x64";
			const toolExe = `${args.extensionPath}/debugger/windows/${arch}/emmy.tool.exe`;
			let argList = [toolExe, "-m", "attach", "-p", args.pid, "-e", emmyLua];
			this.runDebugger(argList.join(" "), args, response);
		});
	}

	private runDebugger(cmd: string, args: EmmyDebugArguments, response: DebugProtocol.AttachResponse): cp.ChildProcess {
		const ls = cp.exec(cmd).on("error", e => {
			this.sendEvent(new OutputEvent(e.message));
			this.sendEvent(new TerminatedEvent());
		}).on("exit", code => {
			if (code !== 0) {
				this.sendEvent(new TerminatedEvent());
			}
		});
		ls.stdout.on("data", (stdout:string) => {
			this.sendEvent(new OutputEvent(stdout));
			var lines = stdout.split("\n");
			lines.forEach(line => {
				if (line.startsWith("port:")) {
					var port = parseInt(line.substr(5));
					this.connect(port, args, response);
				}
			});
		});
		return ls;
	}

	connect(port: number, args: EmmyDebugArguments, response: DebugProtocol.AttachResponse) {
		var socket = new net.Socket();
		socket.connect(port);
		socket.on("connect", () => {
			this.sendResponse(response);
			this.send(new DMReqInitialize("", emmyLua, args.captureStd, args.captureOutputDebugString));
		}).on("data", buf => {
			this.receive(buf);
		}).on("error", (e) => {
			this.sendEvent(new OutputEvent(e.message));
			this.sendEvent(new TerminatedEvent());
		});
		this.socket = socket;
	}

	private send(msg: LuaAttachMessage) {
		if (this.socket) {
			let ba = new ByteArray();
			msg.write(ba);
			let buf = ba.toBuffer();
			let b2 = new ByteArray();
			b2.writeUint32(buf.length);
			this.socket.write(b2.toBuffer());
			this.socket.write(buf);
		}
	}

	private receive(buf: Buffer) {
		var pos = 0;
		while (pos < buf.length) {
			if (this.expectedLen === 0) {
				this.expectedLen = buf.readUInt32BE(pos);
				pos += 4;
			}
			var remain = buf.length - pos;
			var sizeToRead = remain > this.expectedLen ? this.expectedLen : remain;
			this.receiveBuf.writeBuffer(buf.slice(pos, pos + sizeToRead));
			pos += sizeToRead;
			this.expectedLen -= sizeToRead;
			if (this.expectedLen === 0) {
				this.handleMsgBuf(this.receiveBuf);
				this.receiveBuf.clear();
			}
		}
	}

	private handleMsgBuf(buf: sb.SmartBuffer) {
		var ba = new ByteArray(buf);
		var idValue = ba.readUint32();
		var id = idValue as DebugMessageId;
		var msg:LuaAttachMessage | undefined;
		switch (id) {
			case DebugMessageId.Message: msg = new DMMessage(); break;
			case DebugMessageId.LoadScript: msg = new DMLoadScript(); break;
			case DebugMessageId.Break: msg = new DMBreak(); break;
			case DebugMessageId.RespEvaluate: msg = new DMRespEvaluate(); break;
			default: msg = new LuaAttachMessage(id); break;
		}
		if (msg) {
			msg.read(ba);
			this.handleMessage(msg);
		} else {
			this.log(idValue);
		}
	}

	private async handleMessage(msg: LuaAttachMessage) {
		switch (msg.id) {
			case DebugMessageId.RespInitialize: {
				this.sendEvent(new InitializedEvent());
				this.emit("initialized");
				break;
			}
			case DebugMessageId.Message: {	
				let mm = msg as DMMessage;
				let text = mm.text;
				if (text) {
					this.sendEvent(new OutputEvent(`${text}\n`, "Attach"));
				}
				break;
			}
			case DebugMessageId.LoadScript: {
				let mm = msg as DMLoadScript;
				if (mm.fileName) {
					var filePath = await this.findFile(mm.fileName);
					if (filePath) {
						filePath = this.normalize(filePath);
						this.sendEvent(new OutputEvent(`load:${mm.fileName}\n`));
						const script: LoadedScript = {
							path: filePath,
							index: mm.index
						};
						this.loadedScripts.set(filePath, script);

						// send breakpoints
						const bpList = this.breakpoints.get(filePath);
						if (bpList) {
							for (let index = 0; index < bpList.length; index++) {
								const ebp = bpList[index];
								ebp.scriptIndex = script.index;
								this.send(new DMAddBreakpoint(script.index, this.convertClientLineToDebugger(ebp.line)));
							}
						}
					} else {
						this.sendEvent(new OutputEvent(`file not found:${mm.fileName}\n`));
					}
					
					this.send(new LuaAttachMessage(DebugMessageId.LoadDone));
				}
				break;
			}
			case DebugMessageId.Break: {
				this.break = msg;
				this.sendEvent(new StoppedEvent("breakpoint", 1));
				break;
			}
			case DebugMessageId.RespEvaluate: {
				const evalResp = <DMRespEvaluate> msg;
				const response = this.evalMap.get(evalResp.evalId);
				if (response) {
					this.evalMap.delete(evalResp.evalId);
					response(evalResp);
				}
				break;
			}
			case DebugMessageId.SetBreakpoint: {
				break;
			}
			case DebugMessageId.CreateVM: {
				break;
			}
			default: this.log(msg);
		}
	}

	protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
		if (this.socket) {
			this.socket.destroy();
			this.socket = undefined;
		}
		this.sendResponse(response);
	}

	protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		response.body = {
			threads: [
				new Thread(1, "thread 1")
			]
		};
		this.sendResponse(response);
	}

	protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments) {
		let lines = args.breakpoints || [];
		const path = this.normalize(<string> args.source.path);

		let existBps = this.breakpoints.get(path);
		const existMap = new Map<number, EmmyBreakpoint>();
		if (existBps) {
			existBps.forEach(bp => existMap.set(bp.line, bp));
		}
		const bps = <EmmyBreakpoint[]>[];

		const breakpoints = new Array<DebugProtocol.Breakpoint>();
		for (let i = 0; i < lines.length; i++) {
			const bp = lines[i];
			const bpk = <DebugProtocol.Breakpoint> new Breakpoint(true, bp.line);
			bpk.id = ++breakpointId;
			breakpoints.push(bpk);

			const exist = existMap.get(bp.line);
			if (exist) {
				bps.push(exist);
				existMap.delete(bp.line);
			} else {
				const ebp: EmmyBreakpoint = { id: breakpointId, line: bp.line, scriptIndex: -1 };
	
				//send
				const script = await this.findScript(path);
				if (script) {
					this.send(new DMAddBreakpoint(script.index, this.convertClientLineToDebugger(bp.line)));
					ebp.scriptIndex = script.index;
				}
				bps.push(ebp);
			}
		}
		response.body = {
			breakpoints: breakpoints
		};

		this.breakpoints.set(path, bps);
		existMap.forEach((v) => {
			if (v.scriptIndex > 0) {
				this.send(new DMDelBreakpoint(v.scriptIndex, this.convertClientLineToDebugger(v.line)));
			}
		});
		this.sendResponse(response);
	}

	private normalize(filePath: string) {
		filePath = path.normalize(filePath);
		filePath = filePath.substr(0, 1).toLowerCase() + filePath.substr(1);
		return filePath;
	}

	public async findScript(path: string): Promise<LoadedScript | undefined> {
		const filePath = await this.findFile(path);
		return this.loadedScripts.get(this.normalize(filePath));
	}

	public findScriptByIndex(index: number): LoadedScript | undefined {
		for (const iterator of this.loadedScripts) {
			if (iterator["1"].index === index) {
				return iterator["1"];
			}
		}
	}

	protected async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments) {
		if (this.break) {
			const stacks = <StackNodeContainer> this.break.stacks;
			const stackFrames: StackFrame[] = [];
			for (let i = 0; i < stacks.children.length; i++) {
				const root = <StackRootNode> stacks.children[i];
				const script = this.findScriptByIndex(root.scriptIndex);
				var source: Source | undefined;
				if (script) {
					const file = await this.findFile(script.path);
					source = new Source(path.basename(script.path), file);
				}
				const stackFrame = new StackFrame(i, root.functionName, source, this.convertDebuggerLineToClient(root.line));
				stackFrames.push(stackFrame);
			}
			response.body = {
				stackFrames: stackFrames,
				totalFrames: stackFrames.length
			};
		}
		this.sendResponse(response);
	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
		this.curFrameId = args.frameId;
		const stack = this.break!.stacks!.children[args.frameId];
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
		if (this.break) {
			const node = this.handles.get(args.variablesReference);
			const ctx = { evaluator: this, handles: this.handles, scriptManager: this };
			node.computeChildren(ctx).then(vars => {
				response.body = { variables: vars.map(node => node.toVariable(ctx)) };
				this.sendResponse(response);
			});
		} else {
			this.sendResponse(response);
		}
	}

	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
		this.send(new LuaAttachMessage(DebugMessageId.Continue));
		this.sendResponse(response);
	}

	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		this.send(new LuaAttachMessage(DebugMessageId.StepOver));
		this.sendResponse(response);
	}

	protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments): void {
		this.send(new LuaAttachMessage(DebugMessageId.StepInto));
		this.sendResponse(response);
	}

	protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments): void {
		this.send(new LuaAttachMessage(DebugMessageId.StepOut));
		this.sendResponse(response);
	}

	protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
		const frameId = args.frameId || 0;
		this.curFrameId = frameId;
		this.eval(args.expression, frameId).then(v => {
			const ctx = { evaluator: this, handles: this.handles, scriptManager: this };
			const node = v.resultNode.children[0];
			if (node instanceof LuaXObjectValue) {
				node.name = args.expression;
			}
			const variable = node.toVariable(ctx);
			response.body = {
				result: variable.value,
				variablesReference: variable.variablesReference
			};
			this.sendResponse(response);
		});
	}

	eval(expr: string, frameId: number = -1): Promise<DMRespEvaluate> {
		if (frameId < 0) {
			frameId = this.curFrameId;
		}
		return new Promise((resolve) => {
			const id = this.evalIdCounter++;
			const stackId = frameId;
			const req = new DMReqEvaluate(this.break!.L, id, stackId, expr, 2);
			this.evalMap.set(id, resolve);
			this.send(req);
		});
	}
}