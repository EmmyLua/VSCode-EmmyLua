import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

export class LuaContext {
    public LANGUAGE_ID: string = "lua"; //EmmyLua
    public client?: LanguageClient;
    constructor(
        public debugMode: boolean,
        public extensionContext: vscode.ExtensionContext
    ) { }
}