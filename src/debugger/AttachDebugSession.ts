import {
	LoggingDebugSession
} from 'vscode-debugadapter';
import { DebugProtocol } from "vscode-debugprotocol";
import * as cp from "child_process";
import * as net from "net";
import * as fs from "fs";
import { LuaAttachMessage, DMReqInitialize } from './AttachProtol';

interface AttachRequestArguments extends DebugProtocol.AttachRequestArguments {
	pid: number;
}

export class AttachDebugSession extends LoggingDebugSession {

	socket?: net.Socket;
	
	public constructor() {
		super("emmy_attach.txt");
		this.setDebuggerColumnsStartAt1(false);
		this.setDebuggerLinesStartAt1(false);
	}

	protected attachRequest(response: DebugProtocol.AttachResponse, args: AttachRequestArguments): void {
		let exe = "D:/vscode-EmmyLua/VSCode-EmmyLua/server/windows/x86/emmy.tool.exe";
		let argList = [" ", "-m", "attach", "-p", args.pid, "-e", exe];
		
		cp.exec(exe + argList.join(" "), (err, stdout) => {
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
		let ws = fs.createWriteStream("D:/vscode-EmmyLua/VSCode-EmmyLua/log.txt");
		var socket = new net.Socket();
		socket.connect(port);
		socket.on("connect", () => {
			this.sendResponse(response);
			this.send(new DMReqInitialize("", "", true, true));
		});
		socket.on("data", buf => {
			ws.write(buf);
		});
		this.socket = socket;
	}

	private send(msg: LuaAttachMessage) {
		if (this.socket) {
			this.socket.write(1);
		}
	}
}