'use strict';

import * as vscode from 'vscode';
import * as path from "path";
import * as net from "net";
import * as process from "process";
import * as Annotator from "./annotator";
import * as notifications from "./notifications";
import * as cp from "child_process";
import findJava from "./findJava";
import { LanguageClient, LanguageClientOptions, ServerOptions, StreamInfo } from "vscode-languageclient/node";
import { LuaLanguageConfiguration } from './languageConfiguration';
import { EmmyDebuggerProvider } from './debugger/EmmyDebuggerProvider';
import { EmmyConfigWatcher, IEmmyConfigUpdate } from './emmyConfigWatcher';
import { EmmyAttachDebuggerProvider } from './debugger/EmmyAttachDebuggerProvider';
import { EmmyLaunchDebuggerProvider } from './debugger/EmmyLaunchDebuggerProvider';
import { LuaContext } from './luaContext';

export let luaContext: LuaContext;
let activeEditor: vscode.TextEditor;
let progressBar: vscode.StatusBarItem;
let javaExecutablePath: string | null;
let configWatcher: EmmyConfigWatcher;

export function activate(context: vscode.ExtensionContext) {
    console.log("emmy lua actived!");
    luaContext = new LuaContext(process.env['EMMY_DEV'] === "true", context);
    progressBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    javaExecutablePath = findJava();

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration, null, context.subscriptions));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument, null, context.subscriptions));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor, null, context.subscriptions));
    context.subscriptions.push(vscode.commands.registerCommand("emmy.restartServer", restartServer));
    context.subscriptions.push(vscode.commands.registerCommand("emmy.showReferences", showReferences));
    context.subscriptions.push(vscode.commands.registerCommand("emmy.insertEmmyDebugCode", insertEmmyDebugCode));

    context.subscriptions.push(vscode.languages.setLanguageConfiguration("lua", new LuaLanguageConfiguration()));

    configWatcher = new EmmyConfigWatcher();
    configWatcher.onConfigUpdate(onConfigUpdate);
    context.subscriptions.push(configWatcher);
    startServer();
    registerDebuggers();
    return {
        reportAPIDoc: (classDoc: any) => {
            luaContext?.client?.sendRequest("emmy/reportAPI", classDoc);
        }
    }
}

function registerDebuggers() {
    const context = luaContext.extensionContext;
    const emmyProvider = new EmmyDebuggerProvider('emmylua_new', context);
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("emmylua_new", emmyProvider));
    context.subscriptions.push(emmyProvider);
    const emmyAttachProvider = new EmmyAttachDebuggerProvider('emmylua_attach', context);
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('emmylua_attach', emmyAttachProvider));
    context.subscriptions.push(emmyAttachProvider);
    const emmyLaunchProvider = new EmmyLaunchDebuggerProvider('emmylua_launch', context);
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('emmylua_launch', emmyLaunchProvider));
    context.subscriptions.push(emmyLaunchProvider);

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
        && activeEditor.document.languageId === luaContext.LANGUAGE_ID
        && luaContext.client != undefined
        ) {
        Annotator.requestAnnotators(activeEditor, luaContext.client);
    }
}

function onDidChangeActiveTextEditor(editor: vscode.TextEditor | undefined) {
    if (editor
        && editor.document.languageId === luaContext.LANGUAGE_ID
        && luaContext.client != undefined) {
        activeEditor = editor as vscode.TextEditor;
        Annotator.requestAnnotators(activeEditor, luaContext.client);
    }
}

export function deactivate() {
    stopServer();
}

function onDidChangeConfiguration(event: vscode.ConfigurationChangeEvent) {
    let shouldRestart = false;
    let newJavaExecutablePath = findJava();
    if (newJavaExecutablePath !== javaExecutablePath) {
        javaExecutablePath = newJavaExecutablePath;
        shouldRestart = true;
    }

    if (luaContext.client !== undefined) {
        Annotator.onDidChangeConfiguration(luaContext.client);
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
        if (!luaContext.debugMode) {
            await validateJava();
        }
    } catch (error) {
        vscode.window.showErrorMessage(error as string, "Try again")
            .then(startServer);
        return;
    }
    doStartServer().then(() => {
        onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
    }).catch(reson => {
            vscode.window.showErrorMessage(`Failed to start "EmmyLua" language server!\n${reson}`, "Try again")
                .then(startServer);
        });
}

async function doStartServer() {
    const configFiles = await configWatcher.watch();
    const context = luaContext.extensionContext;
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: luaContext.LANGUAGE_ID }],
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
    if (luaContext.debugMode) {
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
        const cp = path.resolve(context.extensionPath, "server", "*");
        const exePath = javaExecutablePath || "java";
        serverOptions = {
            command: exePath,
            args: ["-cp", cp, "com.tang.vscode.MainKt", "-XX:+UseG1GC", "-XX:+UseStringDeduplication"]
        };
    }

    luaContext.client = new LanguageClient(luaContext.LANGUAGE_ID, "EmmyLua plugin for vscode.", serverOptions, clientOptions);
    luaContext.client.start().then(() => {
        console.log("client ready");
        luaContext.client?.onNotification("emmy/progressReport", (d: notifications.IProgressReport) => {
            progressBar.show();
            progressBar.text = d.text;
            if (d.percent >= 1) {
                setTimeout(() => {
                    progressBar.hide();
                }, 3000);
            }
        });
    })
}

function restartServer() {
    const client = luaContext.client;
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

function stopServer() {
    const client = luaContext.client;
    if (client) {
        client.stop();
    }
}

function onConfigUpdate(e: IEmmyConfigUpdate) {
    const client = luaContext.client;
    if (client) {
        client.sendRequest('emmy/updateConfig', e);
    }
}

async function insertEmmyDebugCode() {
    const context = luaContext.extensionContext;
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
