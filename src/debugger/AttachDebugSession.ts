import {
	LoggingDebugSession, Event
} from 'vscode-debugadapter';
import { DebugProtocol } from "vscode-debugprotocol";
import * as cp from "child_process";
import * as net from "net";
import * as sb from "smart-buffer";
import { LuaAttachMessage, DMReqInitialize, DebugMessageId, DMMessage } from './AttachProtol';
import { ByteArray } from './ByteArray';

let exe = "D:/Git/OpenSource/EmmyLua/IntelliJ-EmmyLua/debugger/attach/windows/Build/Debug/x86/emmy.tool.exe";
let emmyLua = "D:/Git/OpenSource/EmmyLua/IntelliJ-EmmyLua/src/main/resources/debugger/Emmy.lua";

interface AttachRequestArguments extends DebugProtocol.AttachRequestArguments {
	pid: number;
}

export class AttachDebugSession extends LoggingDebugSession {

	socket?: net.Socket;
	receiveBuf: sb.SmartBuffer = new sb.SmartBuffer();
	expectedLen: number = 0;
	
	public constructor() {
		super("emmy_attach.txt");
		this.setDebuggerColumnsStartAt1(false);
		this.setDebuggerLinesStartAt1(false);
	}

	protected attachRequest(response: DebugProtocol.AttachResponse, args: AttachRequestArguments): void {
		let argList = [exe, " ", "-m", "attach", "-p", args.pid, "-e", emmyLua];
		
		cp.exec(argList.join(" "), (err, stdout) => {
			var lines = stdout.split("\n");
			lines.forEach(line => {
				if (line.startsWith("port:")) {
					var port = parseInt(line.substr(5));
					this.connect(port, response);
				}
			});
		});
	}

	connect(port: number, response: DebugProtocol.AttachResponse) {
		var socket = new net.Socket();
		socket.connect(port);
		socket.on("connect", () => {
			this.sendResponse(response);
			this.send(new DMReqInitialize("", emmyLua, true, true));
		});
		socket.on("data", buf => {
			this.receive(buf);
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
			case DebugMessageId.Message:
			msg = new DMMessage();
			break;
		}
		if (msg) {
			msg.read(ba);
			this.log(msg);
		} else {
			this.log(idValue);
		}
	}

	protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
		if (this.socket) {
			this.socket.destroy();
			this.socket = undefined;
		}
		this.sendResponse(response);
	}

	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		let lines = args.breakpoints;
		if (lines) {
			lines.forEach(bp => {
				
			});
		}
		this.sendResponse(response);
	}

	private log(obj: any) {
		this.sendEvent(new Event("log", obj));
	}
}