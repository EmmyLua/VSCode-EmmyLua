import { LoggingDebugSession } from "vscode-debugadapter";

export abstract class EmmyDebugSession extends LoggingDebugSession {
    constructor() {
        super("emmy.debug.txt");
    }
}