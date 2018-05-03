'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from "path";
import * as net from "net";
import { LanguageClient, LanguageClientOptions, ServerOptions, StreamInfo } from "vscode-languageclient";
import * as Annotator from "./annotator";
import * as notifications from "./notifications";
import findJava from "./findJava";

var savedContext: vscode.ExtensionContext;
var client: LanguageClient;
var activeEditor: vscode.TextEditor;
var progressBar: vscode.StatusBarItem;
var javaExecutablePath: string;

export function activate(context: vscode.ExtensionContext) {
    console.log("emmy lua actived!");
    savedContext = context;
    progressBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    startClient();

    vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration);

    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor as vscode.TextEditor;
    }, null, savedContext.subscriptions);
    
    // vscode.workspace.onDidChangeTextDocument(event => {
    //     if (activeEditor) {
    //         Annotator.updateDecorations(activeEditor);
    //     }
    // }, null, savedContext.subscriptions);

    vscode.commands.registerCommand("emmy.restartServer", restartServer);
    vscode.commands.registerCommand("emmy.showReferences", showReferences);
}

// this method is called when your extension is deactivated
export function deactivate() {
    stopServer();
}

function onDidChangeConfiguration(event: vscode.ConfigurationChangeEvent) {
    let newJavaExecutablePath = findJava();
    if (newJavaExecutablePath !== javaExecutablePath) {
        console.log(newJavaExecutablePath);
    }
}

function startClient() {
    let clientOptions: LanguageClientOptions = {
        documentSelector: [ { scheme: 'file', language: 'EmmyLua' } ],
        synchronize: {
            configurationSection: 'EmmyLua',
            fileEvents: [
                vscode.workspace.createFileSystemWatcher("**/*.lua")
            ]
        },
        initializationOptions: {
            stdFolder: vscode.Uri.file(path.resolve(savedContext.extensionPath, "res/std")).toString(),
            workspaceFolders: vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.map(f => f.uri.toString()) : null,
        }
    };

    let socketMode = false;
    var serverOptions: ServerOptions;
    if (socketMode) {
        // The server is a started as a separate app and listens on port 5007
        let connectionInfo = {
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
        let cp = path.resolve(savedContext.extensionPath, "server", "*");
        serverOptions = {
            command: "java",
            args: ["-cp", cp, "com.tang.vscode.MainKt"]
        };
    }
    
    client = new LanguageClient("EmmyLua", "EmmyLua plugin for vscode.", serverOptions, clientOptions);
    client.onReady().then(() => {
        console.log("client ready");
        client.onNotification("emmy/annotator", (data: notifications.IAnnotator) => {
            if (activeEditor) {
                Annotator.updateAnnotators(activeEditor, [data]);
            }
        });
        client.onNotification("emmy/progressReport", (d: notifications.IProgressReport) => {
            progressBar.show();
            progressBar.text = d.text;
            if (d.percent >= 1) {
                setTimeout(() => {
                    progressBar.hide();
                }, 3000);
            }
        });
    });
    let disposable = client.start();
    savedContext.subscriptions.push(disposable);
    
    vscode.languages.setLanguageConfiguration("EmmyLua", {
        indentationRules: {
            increaseIndentPattern: /do|else|then|repeat/,
            decreaseIndentPattern: /end|else|elseif|until/,
        }
    });
}

function restartServer() {
    if (!client) {
        startClient();
    } else {
        client.stop().then(() => {
            startClient();
        });
    }
}

function showReferences(uri: string, pos: vscode.Position) {
    let u = vscode.Uri.parse(uri);
    let p = new vscode.Position(pos.line, pos.character);
    vscode.commands.executeCommand("vscode.executeReferenceProvider", u, p).then(locations => {
        vscode.commands.executeCommand("editor.action.showReferences", u, p, locations);
    });
}

function stopServer() {
    if (client) {
        client.stop();
    }
}