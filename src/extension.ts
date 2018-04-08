'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from "path";
import * as net from "net";
import {LanguageClient, LanguageClientOptions, SettingMonitor,
	ServerOptions, StreamInfo, ErrorHandler, ErrorAction,
    CloseAction, Executable, ExecutableOptions, NotificationType} from "vscode-languageclient";
import * as Annotator from "./annotator";
import * as notifications from "./notifications";

var savedContext: vscode.ExtensionContext;
var client: LanguageClient;
var activeEditor: vscode.TextEditor;

export function activate(context: vscode.ExtensionContext) {
    console.log("emmy lua actived!");
    savedContext = context;
    startClient();

    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor as vscode.TextEditor;
    }, null, savedContext.subscriptions);
    
    // vscode.workspace.onDidChangeTextDocument(event => {
    //     if (activeEditor) {
    //         Annotator.updateDecorations(activeEditor);
    //     }
    // }, null, savedContext.subscriptions);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

function startClient() {
    let clientOptions: LanguageClientOptions = {
        documentSelector: [ { scheme: 'file', language: 'EmmyLua' } ]
    };

    // The server is a started as a separate app and listens on port 5007
    let connectionInfo = {
        port: 5007
    };
    let serverOptions: ServerOptions = () => {
        // Connect to language server via socket
        let socket = net.connect(connectionInfo);
        let result: StreamInfo = {
            writer: socket,
            reader: socket as NodeJS.ReadableStream
        };
        socket.on("close", ()=>{
            console.log("client connect error!");
        });
        return Promise.resolve(result);
    };

    // let cp = path.resolve(savedContext.extensionPath, "../language-server/build/libs", "language-server.jar");

    // let exec: Executable = {
    //     command: "java",
    //     args: ["-cp", cp, "org.emmylua.vscode.MainKt"]
    // };

    client = new LanguageClient("EmmyLua", "EmmyLua plugin for vscode.", serverOptions, clientOptions);
    client.onReady().then(() => {
        console.log("client ready");
        client.onNotification(new NotificationType<notifications.IAnnotator, void>("annotator"), (data) => {
            if (activeEditor) {
                Annotator.updateAnnotators(activeEditor, [data]);
            }
        });
    });
    let disposable = client.start();
    savedContext.subscriptions.push(disposable);
}