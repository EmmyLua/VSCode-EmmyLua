import { LoggingDebugSession, Event, OutputEvent } from "vscode-debugadapter";

export abstract class EmmyDebugSession extends LoggingDebugSession {
    constructor() {
        super("emmy.debug.txt");
    }

	log(obj: any) {
		this.sendEvent(new Event("log", obj));
    }
    
    printConsole(msg: string, newLine: boolean = true) {
        if (newLine) {
            msg += "\n";
        }
        this.sendEvent(new OutputEvent(msg));
    }
}