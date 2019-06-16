import { LoggingDebugSession, Event, OutputEvent } from "vscode-debugadapter";
import * as path from 'path';
import { DebugProtocol } from "vscode-debugprotocol";
import { Uri } from "vscode";

export abstract class DebugSession extends LoggingDebugSession {
    constructor() {
        super("emmy.debug.txt");
    }

    private _findFileSeq = 0;

	log(obj: any) {
		this.sendEvent(new Event("log", obj));
    }
    
    printConsole(msg: string, newLine: boolean = true) {
        if (newLine) {
            msg += "\n";
        }
        this.sendEvent(new OutputEvent(msg));
    }

    protected customRequest(command: string, response: DebugProtocol.Response, args: any): void {
        if (command === 'findFileRsp') {
            this.emit('findFileRsp', args);
        }
    }

    async findFile(file: string): Promise<string> {
        const base = path.parse(file).base;
        const seq = this._findFileSeq++;
        this.sendEvent(new Event('findFileReq', { include: base, seq: seq }));
        return new Promise<string>((resolve, c) => {
            const listener = (body: any) => {
                if (seq === body.seq) {
                    this.removeListener('findFileRsp', listener);
                    const files: string[] = body.files;
                    if (files.length > 0) {
                        resolve(files[0]);
                    } else {
                        resolve(file);
                    }
                }
            };
            this.addListener('findFileRsp', listener);
        });
    }
}