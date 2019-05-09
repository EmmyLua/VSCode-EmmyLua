'use strict';

import * as vscode from 'vscode';
import * as path from "path";
import * as net from "net";
import * as process from "process";
import * as Annotator from "./annotator";
import * as notifications from "./notifications";
import * as cp from "child_process";
import findJava from "./findJava";
import { LanguageClient, LanguageClientOptions, ServerOptions, StreamInfo } from "vscode-languageclient";
import { AttachDebuggerProvider, AttachLaunchDebuggerProvider } from './debugger/AttachDebuggerProvider';
import { MobDebuggerProvider } from './debugger/MobDebuggerProvider';
import { formatText } from 'lua-fmt';
import { LuaLanguageConfiguration } from './languageConfiguration';

const LANGUAGE_ID = 'lua'; //EmmyLua
var DEBUG_MODE = false;

export let savedContext: vscode.ExtensionContext;
let client: LanguageClient;
let activeEditor: vscode.TextEditor;
let progressBar: vscode.StatusBarItem;
let javaExecutablePath: string|null;

export function activate(context: vscode.ExtensionContext) {
    console.log("emmy lua actived!");
    DEBUG_MODE = process.env['EMMY_DEV'] === "true";
    savedContext = context;
    progressBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    javaExecutablePath = findJava();
    startServer();

    savedContext.subscriptions.push(vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration, null, savedContext.subscriptions));
    savedContext.subscriptions.push(vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument, null, savedContext.subscriptions));
    savedContext.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor, null, savedContext.subscriptions));
    savedContext.subscriptions.push(vscode.commands.registerCommand("emmy.restartServer", restartServer));
    savedContext.subscriptions.push(vscode.commands.registerCommand("emmy.showReferences", showReferences));

    savedContext.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider({ scheme: "file", language: LANGUAGE_ID }, {
            provideDocumentFormattingEdits(document, position, token): vscode.ProviderResult<vscode.TextEdit[]> {
                return [new vscode.TextEdit(new vscode.Range(0, 0, document.lineCount, 0), formatText(document.getText()))];
            }
        }
    ));
    savedContext.subscriptions.push(vscode.languages.setLanguageConfiguration("lua", new LuaLanguageConfiguration()));

    registerDebuggers();
}

function registerDebuggers() {
    const attProvider = new AttachDebuggerProvider();
    savedContext.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("emmylua_attach", attProvider));
    savedContext.subscriptions.push(attProvider);
    const attLaunchProvider = new AttachLaunchDebuggerProvider();
    savedContext.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("emmylua_launch", attLaunchProvider));
    savedContext.subscriptions.push(attLaunchProvider);
    const mobProvider = new MobDebuggerProvider();
    savedContext.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("emmylua_remote", mobProvider));
    savedContext.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("emmylua_remote_launch", mobProvider));
    savedContext.subscriptions.push(mobProvider);
    savedContext.subscriptions.push(vscode.debug.onDidReceiveDebugSessionCustomEvent(e => {
        console.log(e.body);
    }));
}

function onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent) {
    if (activeEditor && activeEditor.document === event.document) {
        Annotator.requestAnnotators(activeEditor, client);
    }
}

function onDidChangeActiveTextEditor(editor: vscode.TextEditor|undefined) {
    if (editor === undefined) {
        return;
    }
    activeEditor = editor as vscode.TextEditor;
    Annotator.requestAnnotators(activeEditor, client);
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

    Annotator.onDidChangeConfiguration(client);

    if (shouldRestart) {
        restartServer();
    }
}

async function validateJava() {
    const exePath = javaExecutablePath || "java";
    console.log('exe path : ' + exePath);
    
    return new Promise((resolve, reject) => {
        cp.exec(`"${exePath}" -version`, (e, stdout, stderr) => {
            let regexp:RegExp = /java version "((\d+)(\.(\d+).+?)?)"/g;
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
        if (!DEBUG_MODE) {
            await validateJava();
        }
    } catch (error) {
        vscode.window.showErrorMessage(error, "Try again")
        .then(startServer);
        return;
    }
    doStartServer().then(() => {
        onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
    })
    .catch(reson => {
        vscode.window.showErrorMessage(`Failed to start "EmmyLua" language server!\n${reson}`, "Try again")
        .then(startServer);
    });
}

async function doStartServer() {
    const clientOptions: LanguageClientOptions = {
        documentSelector: [ { scheme: 'file', language: LANGUAGE_ID } ],
        synchronize: {
            configurationSection: ["emmylua", "files.associations"],
            fileEvents: [
                vscode.workspace.createFileSystemWatcher("**/*.lua")
            ]
        },
        initializationOptions: {
            stdFolder: vscode.Uri.file(path.resolve(savedContext.extensionPath, "res/std")).toString(),
            apiFolders : [],
            workspaceFolders: vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.map(f => f.uri.toString()) : null,
            client: 'vsc'
        }
    };

    let serverOptions: ServerOptions;
    if (DEBUG_MODE) {
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
        const cp = path.resolve(savedContext.extensionPath, "server", "*");
        const exePath = javaExecutablePath || "java";
        serverOptions = {
            command: exePath,
            args: ["-cp", cp, "com.tang.vscode.MainKt", "-XX:+UseConcMarkSweepGC"]
        };
    }
    
    client = new LanguageClient(LANGUAGE_ID, "EmmyLua plugin for vscode.", serverOptions, clientOptions);
    savedContext.subscriptions.push(client.start());
    await client.onReady();
    console.log("client ready");
    client.onNotification("emmy/progressReport", (d: notifications.IProgressReport) => {
        progressBar.show();
        progressBar.text = d.text;
        if (d.percent >= 1) {
            setTimeout(() => {
                progressBar.hide();
            }, 3000);
        }
    });
}

function restartServer() {
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
    if (client) {
        client.stop();
    }
}