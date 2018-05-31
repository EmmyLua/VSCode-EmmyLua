import { EmmyDebugSession } from "./EmmyDebugSession";
import { DebugProtocol } from "vscode-debugprotocol";
import { InitializedEvent } from "vscode-debugadapter";
import * as cp from "child_process";
import * as net from "net";

interface MobLaunchArguments extends DebugProtocol.LaunchRequestArguments {
    extensionPath: string;
    sourcePaths: string[];
	program: string;
	arguments: string[];
    workingDir: string;
    port: number;
}

export class MobDebugSession extends EmmyDebugSession {
    private server?: net.Server;
    private client?: MobClient;

    protected launchRequest(response: DebugProtocol.LaunchResponse, args: MobLaunchArguments): void {
        this.launchServer(args.port).then(() => {
            const argList = [args.program].concat(args.arguments);
            cp.exec(argList.join(" "), { cwd: args.workingDir });
            this.sendResponse(response);
        });
    }

    private launchServer(port: number): Thenable<net.Server> {
        return new Promise(resolve => {
            const socket = net.createServer(skt => {
                this.printConsole("Connected.");
                this.client = new MobClient(this, skt);
                this.sendEvent(new InitializedEvent());
            }).on("listening", () => {
                this.printConsole(`Start mobdebug server at port:${port}`);
                this.printConsole("Waiting for process connection...");
                resolve(socket);
            }).listen(port);
            this.server = socket;
        });
    }

    shutdown(): void {

    }
}

class MobClient {
    socket: net.Socket;
    session: MobDebugSession;

    constructor(session:MobDebugSession, socket: net.Socket) {
        this.socket = socket;
        this.session = session;
        this.init();
    }

    private init() {
        this.socket.on("data", data => {
            this.session.printConsole(data.toString());
        });
    }

    close() {

    }
}