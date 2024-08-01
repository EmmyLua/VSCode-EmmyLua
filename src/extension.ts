'use strict';

import * as vscode from 'vscode';
import * as path from "path";
import * as net from "net";
import * as process from "process";
import * as Annotator from "./annotator";

import { LanguageClient, LanguageClientOptions, ServerOptions, StreamInfo } from "vscode-languageclient/node";
import { LuaLanguageConfiguration } from './languageConfiguration';
import { EmmyNewDebuggerProvider } from './debugger/new_debugger/EmmyNewDebuggerProvider';
import { EmmyAttachDebuggerProvider } from './debugger/attach/EmmyAttachDebuggerProvider';
import { EmmyLaunchDebuggerProvider } from './debugger/launch/EmmyLaunchDebuggerProvider';
import { EmmyContext } from './emmyContext';
import { InlineDebugAdapterFactory } from './debugger/DebugFactory'
import * as os from 'os';
import * as fs from 'fs';
import { IServerLocation, IServerPosition } from './lspExt';

export let ctx: EmmyContext;
let activeEditor: vscode.TextEditor;

export function activate(context: vscode.ExtensionContext) {
    console.log("emmy lua actived!");
    ctx = new EmmyContext(
        process.env['EMMY_DEV'] === "true",
        context
    );

    context.subscriptions.push(vscode.commands.registerCommand("emmy.stopServer", stopServer));
    context.subscriptions.push(vscode.commands.registerCommand("emmy.restartServer", restartServer));
    // context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration, null, context.subscriptions));

    context.subscriptions.push(vscode.commands.registerCommand("emmy.showReferences", showReferences));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument, null, context.subscriptions));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor, null, context.subscriptions));
    context.subscriptions.push(vscode.commands.registerCommand("emmy.insertEmmyDebugCode", insertEmmyDebugCode));
    context.subscriptions.push(vscode.languages.setLanguageConfiguration("lua", new LuaLanguageConfiguration()));
    startServer();
    registerDebuggers();
    return {
        reportAPIDoc: (classDoc: any) => {
            ctx?.client?.sendRequest("emmy/reportAPI", classDoc);
        }
    }
}

export function deactivate() {
    ctx.dispose();
}

function registerDebuggers() {
    const context = ctx.extensionContext;
    const emmyProvider = new EmmyNewDebuggerProvider('emmylua_new', context);
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("emmylua_new", emmyProvider));
    context.subscriptions.push(emmyProvider);
    const emmyAttachProvider = new EmmyAttachDebuggerProvider('emmylua_attach', context);
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('emmylua_attach', emmyAttachProvider));
    context.subscriptions.push(emmyAttachProvider);
    const emmyLaunchProvider = new EmmyLaunchDebuggerProvider('emmylua_launch', context);
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('emmylua_launch', emmyLaunchProvider));
    context.subscriptions.push(emmyLaunchProvider);
    if (ctx.debugMode) {
        const factory = new InlineDebugAdapterFactory();
        context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('emmylua_new', factory));
        context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('emmylua_attach', factory));
        context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('emmylua_launch', factory));
    }
}

function onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent) {
    if (activeEditor && activeEditor.document === event.document
        && activeEditor.document.languageId === ctx.LANGUAGE_ID
        && ctx.client != undefined
    ) {
        Annotator.requestAnnotators(activeEditor, ctx.client);
    }
}

function onDidChangeActiveTextEditor(editor: vscode.TextEditor | undefined) {
    if (editor
        && editor.document.languageId === ctx.LANGUAGE_ID
        && ctx.client != undefined) {
        activeEditor = editor as vscode.TextEditor;
        Annotator.requestAnnotators(activeEditor, ctx.client);
    }
}


async function startServer() {
    doStartServer().then(() => {
        onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
    }).catch(reason => {
        ctx.setServerStatus({
            health: "error",
            message: `Failed to start "EmmyLua" language server!\n${reason}`,
            command: "emmy.restartServer"
        })
    });
}

async function doStartServer() {
    const context = ctx.extensionContext;
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: ctx.LANGUAGE_ID }],
        synchronize: {
            configurationSection: ["emmylua", "files.associations"],
            fileEvents: [
                vscode.workspace.createFileSystemWatcher("**/*.lua")
            ]
        },
        initializationOptions: {}
    };

    let serverOptions: ServerOptions;
    if (ctx.debugMode) {
        // The server is a started as a separate app and listens on port 5007
        const connectionInfo = {
            port: 5007
        };
        serverOptions = () => {
            // Connect to language server via socket
            let socket = net.connect(connectionInfo);
            let result: StreamInfo = {
                writer: socket,
                reader: socket as NodeJS.ReadableStream
            };
            socket.on("close", () => {
                console.log("client connect error!");
            });
            return Promise.resolve(result);
        };
    } else {
        let platform: string = os.platform();

        let command: string = "";
        switch (platform) {
            case "win32":
                command = path.join(
                    context.extensionPath,
                    'server',
                    'EmmyLua.LanguageServer-win32-x64',
                    'EmmyLua.LanguageServer-win32-x64',
                    'EmmyLua.LanguageServer.exe'
                )
                break;
            case "linux":
                command = path.join(
                    context.extensionPath,
                    'server',
                    'EmmyLua.LanguageServer-linux-x64',
                    'EmmyLua.LanguageServer-linux-x64',
                    'EmmyLua.LanguageServer'
                )
                fs.chmodSync(command, '777');
                break;
            case "darwin":
                if (os.arch() === "arm64") {
                    command = path.join(
                        context.extensionPath,
                        'server',
                        'EmmyLua.LanguageServer-darwin-arm64',
                        'EmmyLua.LanguageServer-darwin-arm64',
                        'EmmyLua.LanguageServer'
                    );
                } else {
                    command = path.join(
                        context.extensionPath,
                        'server',
                        'EmmyLua.LanguageServer-darwin-x64',
                        'EmmyLua.LanguageServer-darwin-x64',
                        'EmmyLua.LanguageServer'
                    );
                }
                fs.chmodSync(command, '777');
                break;
        }
        serverOptions = {
            command: command,
            args: []
        };
    }

    ctx.client = new LanguageClient(ctx.LANGUAGE_ID, "EmmyLua plugin for vscode.", serverOptions, clientOptions);
    ctx.registerProtocol();
    ctx.client.start().then(() => {
        console.log("client ready");
    })
}

function restartServer() {
    const client = ctx.client;
    if (!client) {
        startServer();
    } else {
        client.stop().then(startServer);
    }
}

function showReferences(uri: string, pos: IServerPosition, locations: IServerLocation[]) {
    const u = vscode.Uri.parse(uri);
    const p = new vscode.Position(pos.line, pos.character);
    const vscodeLocations = locations.map(loc =>
        new vscode.Location(
            vscode.Uri.parse(loc.uri),
            new vscode.Range(
                new vscode.Position(loc.range.start.line, loc.range.start.character),
                new vscode.Position(loc.range.end.line, loc.range.end.character)
            )));
    vscode.commands.executeCommand("editor.action.showReferences", u, p, vscodeLocations);
}

function stopServer() {
    ctx.stopServer();
}

async function insertEmmyDebugCode() {
    const context = ctx.extensionContext;
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    const document = activeEditor.document;
    if (document.languageId !== 'lua') {
        return;
    }

    let dllPath = '';
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const isLinux = process.platform === 'linux';
    if (isWindows) {
        const arch = await vscode.window.showQuickPick(['x64', 'x86']);
        if (!arch) {
            return;
        }
        dllPath = path.join(context.extensionPath, `debugger/emmy/windows/${arch}/?.dll`);
    }
    else if (isMac) {
        const arch = await vscode.window.showQuickPick(['x64', 'arm64']);
        if (!arch) {
            return;
        }
        dllPath = path.join(context.extensionPath, `debugger/emmy/mac/${arch}/emmy_core.dylib`);
    }
    else if (isLinux) {
        dllPath = path.join(context.extensionPath, `debugger/emmy/linux/emmy_core.so`);
    }

    const host = 'localhost';
    const port = 9966;
    const ins = new vscode.SnippetString();
    ins.appendText(`package.cpath = package.cpath .. ";${dllPath.replace(/\\/g, '/')}"\n`);
    ins.appendText(`local dbg = require("emmy_core")\n`);
    ins.appendText(`dbg.tcpListen("${host}", ${port})`);
    activeEditor.insertSnippet(ins);
}
