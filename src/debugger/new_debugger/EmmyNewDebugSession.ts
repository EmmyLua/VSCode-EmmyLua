import * as net from "net";
import { EmmyDebugSession } from "../base/EmmyDebugSession";
import { Event, OutputEvent, TerminatedEvent } from "@vscode/debugadapter";
import { DebugProtocol } from "@vscode/debugprotocol";

export interface EmmyNewDebugArguments extends DebugProtocol.AttachRequestArguments {
    extensionPath: string;
    sourcePaths: string[];
    host: string;
    port: number;
    ext: string[];
    ideConnectDebugger: boolean;
}

export class EmmyNewDebugSession extends EmmyDebugSession {
    private listenMode = false;
    private socket: net.Server | undefined;

    protected launchRequest(response: DebugProtocol.LaunchResponse, args: EmmyNewDebugArguments): void {
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

    protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments) {
        super.disconnectRequest(response, args);
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

    protected onSocketClose() {
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
}