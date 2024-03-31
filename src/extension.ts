'use strict';

import * as vscode from 'vscode';
import * as path from "path";
import * as net from "net";
import * as process from "process";
import * as Annotator from "./annotator";
import * as cp from "child_process";
import findJava from "./findJava";
import { LanguageClient, LanguageClientOptions, ServerOptions, StreamInfo } from "vscode-languageclient/node";
import { LuaLanguageConfiguration } from './languageConfiguration';
import { EmmyConfigWatcher, IEmmyConfigUpdate } from './emmyConfigWatcher';
import { EmmyNewDebuggerProvider } from './debugger/new_debugger/EmmyNewDebuggerProvider';
import { EmmyAttachDebuggerProvider } from './debugger/attach/EmmyAttachDebuggerProvider';
import { EmmyLaunchDebuggerProvider } from './debugger/launch/EmmyLaunchDebuggerProvider';
import { EmmyContext } from './emmyContext';
import { InlineDebugAdapterFactory } from './debugger/DebugFactory'
import * as os from 'os';
import * as fs from 'fs';

export let ctx: EmmyContext;
let activeEditor: vscode.TextEditor;
let javaExecutablePath: string | null;
let configWatcher: EmmyConfigWatcher;

export function activate(context: vscode.ExtensionContext) {
    console.log("emmy lua actived!");
    ctx = new EmmyContext(
        process.env['EMMY_DEV'] === "true",
        context,
        vscode.workspace.getConfiguration("emmylua").get("new.languageServer") as boolean
    );
    if (!ctx.newLanguageServer) {
        javaExecutablePath = findJava();
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration, null, context.subscriptions));
        context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument, null, context.subscriptions));
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor, null, context.subscriptions));
        context.subscriptions.push(vscode.commands.registerCommand("emmy.restartServer", restartServer));
        context.subscriptions.push(vscode.commands.registerCommand("emmy.showReferences", showReferences));
        context.subscriptions.push(vscode.commands.registerCommand("emmy.insertEmmyDebugCode", insertEmmyDebugCode));
        context.subscriptions.push(vscode.commands.registerCommand("emmy.stopServer", stopServer));
    }

    context.subscriptions.push(vscode.languages.setLanguageConfiguration("lua", new LuaLanguageConfiguration()));

    configWatcher = new EmmyConfigWatcher();
    configWatcher.onConfigUpdate(onConfigUpdate);
    context.subscriptions.push(configWatcher);
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
    context.subscriptions.push(vscode.languages.registerInlineValuesProvider('lua', {
        // 不知道是否应该发到ls上再做处理
        // 先简单处理一下吧
        provideInlineValues(document: vscode.TextDocument, viewport: vscode.Range, context: vscode.InlineValueContext): vscode.ProviderResult<vscode.InlineValue[]> {

            const allValues: vscode.InlineValue[] = [];
            const regExps = [
                /(?<=local\s+)[^\s,\<]+/,
                /(?<=---@param\s+)\S+/
            ]

            for (let l = viewport.start.line; l <= context.stoppedLocation.end.line; l++) {
                const line = document.lineAt(l);

                for (const regExp of regExps) {
                    const match = regExp.exec(line.text);
                    if (match) {
                        const varName = match[0];
                        const varRange = new vscode.Range(l, match.index, l, match.index + varName.length);
                        // value found via variable lookup
                        allValues.push(new vscode.InlineValueVariableLookup(varRange, varName, false));
                        break;
                    }
                }

            }

            return allValues;
        }
    }));
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

function onDidChangeConfiguration(event: vscode.ConfigurationChangeEvent) {
    let shouldRestart = false;
    let newJavaExecutablePath = findJava();
    if (newJavaExecutablePath !== javaExecutablePath) {
        javaExecutablePath = newJavaExecutablePath;
        shouldRestart = true;
    }

    if (ctx.client !== undefined) {
        Annotator.onDidChangeConfiguration(ctx.client);
    }

    if (shouldRestart) {
        restartServer();
    }
}

async function validateJava(): Promise<void> {
    const exePath = javaExecutablePath || "java";
    console.log('exe path : ' + exePath);
    return new Promise<void>((resolve, reject) => {
        cp.exec(`"${exePath}" -version`, (e, stdout, stderr) => {
            let regexp: RegExp = /(?:java|openjdk) version "((\d+)(\.(\d+).+?)?)"/g;
            if (stderr) {
                let match = regexp.exec(stderr);
                if (match) {
                    let major = parseInt(match[2]) || 0;
                    let minor = parseInt(match[4]) || 0;
                    // java 1.8+
                    if (major > 1 || (major === 1 && minor >= 8)) {
                        resolve();
                        return;
                    }
                    reject(`Unsupported Java version: ${match[1]}, please install Java 1.8 or above.`);
                    return;
                }
            }
            reject("Can't find Java! Please install Java 1.8 or above and set JAVA_HOME environment variable.");
        });
    });
}

async function startServer() {
    try {
        if (!ctx.debugMode && !ctx.newLanguageServer) {
            await validateJava();
        }
    } catch (error) {
        ctx.setServerStatus({
            health: "error",
            message: error as string,
            command: "emmy.restartServer"
        })
        return;
    }
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
    const configFiles = await configWatcher.watch();
    const context = ctx.extensionContext;
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: ctx.LANGUAGE_ID }],
        synchronize: {
            configurationSection: ["emmylua", "files.associations"],
            fileEvents: [
                vscode.workspace.createFileSystemWatcher("**/*.lua")
            ]
        },
        initializationOptions: {
            stdFolder: vscode.Uri.file(path.resolve(context.extensionPath, "res/std")).toString(),
            apiFolders: [],
            client: 'vsc',
            configFiles: configFiles
        }
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
    } else if (!ctx.newLanguageServer) {
        const cp = path.resolve(context.extensionPath, "server", "*");
        const exePath = javaExecutablePath || "java";
        serverOptions = {
            command: exePath,
            args: ["-cp", cp, "com.tang.vscode.MainKt", "-XX:+UseG1GC", "-XX:+UseStringDeduplication"]
        };
    } else {
        let platform: string = os.platform();

        let command: string = "";
        switch (platform) {
            case "win32":
                command = path.join(
                    context.extensionPath,
                    'server',
                    // TODO: 减少层级
                    'win32-x64',
                    'win32-x64',
                    'LanguageServer.exe'
                )
                break;
            case "linux":
                command = path.join(
                    context.extensionPath,
                    'server',
                    // TODO
                    'linux-x64',
                    'linux-x64',
                    'LanguageServer'
                )
                fs.chmodSync(command, '777');
                break;
            case "darwin":
                if (os.arch() === "arm64") {
                    command = path.join(
                        context.extensionPath,
                        'server',
                        'darwin-arm64',
                        'darwin-arm64',
                        'LanguageServer'
                    );
                } else {
                    command = path.join(
                        context.extensionPath,
                        'server',
                        'darwin-x64',
                        'darwin-x64',
                        'LanguageServer'
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

function showReferences(uri: string, pos: vscode.Position) {
    const u = vscode.Uri.parse(uri);
    const p = new vscode.Position(pos.line, pos.character);
    vscode.commands.executeCommand("vscode.executeReferenceProvider", u, p).then(locations => {
        vscode.commands.executeCommand("editor.action.showReferences", u, p, locations);
    });
}

function onConfigUpdate(e: IEmmyConfigUpdate) {
    const client = ctx.client;
    if (client) {
        client.sendRequest('emmy/updateConfig', e);
    }
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
