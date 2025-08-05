import * as vscode from 'vscode';
import * as path from 'path';
import * as net from 'net';
import * as process from 'process';
import * as os from 'os';
import * as fs from 'fs';

import { integer, LanguageClient, LanguageClientOptions, ServerOptions, StreamInfo } from 'vscode-languageclient/node';
import { LuaLanguageConfiguration } from './languageConfiguration';
import { EmmyNewDebuggerProvider } from './debugger/new_debugger/EmmyNewDebuggerProvider';
import { EmmyAttachDebuggerProvider } from './debugger/attach/EmmyAttachDebuggerProvider';
import { EmmyLaunchDebuggerProvider } from './debugger/launch/EmmyLaunchDebuggerProvider';
import { EmmyContext } from './emmyContext';
import { InlineDebugAdapterFactory } from './debugger/DebugFactory';
import { IServerLocation, IServerPosition } from './lspExtension';
import { onDidChangeConfiguration } from './annotator';
import { get } from './configRenames';
import * as Annotator from './annotator';
interface DebuggerConfig {
    readonly type: string;
    readonly provider: vscode.DebugConfigurationProvider;
}

// Global state
export let extensionContext: EmmyContext;
let activeEditor: vscode.TextEditor | undefined;

export async function activate(context: vscode.ExtensionContext) {
    console.log('EmmyLua extension activated!');

    extensionContext = new EmmyContext(
        process.env['EMMY_DEV'] === 'true',
        context
    );

    // Register commands
    const commands = [
        vscode.commands.registerCommand('emmy.stopServer', stopServer),
        vscode.commands.registerCommand('emmy.restartServer', restartServer),
        vscode.commands.registerCommand('emmy.showReferences', showReferences),
        vscode.commands.registerCommand('emmy.insertEmmyDebugCode', insertEmmyDebugCode),
    ];

    // Register event listeners
    const eventListeners = [
        vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument),
        vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor),
        vscode.workspace.onDidChangeConfiguration(onConfigurationChanged),
    ];

    // Register language configuration
    const languageConfig = vscode.languages.setLanguageConfiguration('lua', new LuaLanguageConfiguration());

    // Add all subscriptions
    context.subscriptions.push(
        ...commands,
        ...eventListeners,
        languageConfig,
        extensionContext
    );

    // Initialize
    await startServer();
    registerDebuggers();
}

export function deactivate(): void {
    extensionContext?.dispose();
}

function onConfigurationChanged(e: vscode.ConfigurationChangeEvent): void {
    if (e.affectsConfiguration('emmylua')) {
        onDidChangeConfiguration();
    }
}

function registerDebuggers(): void {
    const context = extensionContext.vscodeContext;

    const debuggerConfigs: DebuggerConfig[] = [
        { type: 'emmylua_new', provider: new EmmyNewDebuggerProvider('emmylua_new', context) },
        { type: 'emmylua_attach', provider: new EmmyAttachDebuggerProvider('emmylua_attach', context) },
        { type: 'emmylua_launch', provider: new EmmyLaunchDebuggerProvider('emmylua_launch', context) },
    ];

    debuggerConfigs.forEach(({ type, provider }) => {
        context.subscriptions.push(
            vscode.debug.registerDebugConfigurationProvider(type, provider)
        );

        context.subscriptions.push(provider as vscode.Disposable);
    });

    if (extensionContext.debugMode) {
        const factory = new InlineDebugAdapterFactory();
        debuggerConfigs.forEach(({ type }) => {
            context.subscriptions.push(
                vscode.debug.registerDebugAdapterDescriptorFactory(type, factory)
            );
        });
    }
}

function onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent): void {
    if (activeEditor &&
        activeEditor.document === event.document &&
        activeEditor.document.languageId === extensionContext.LANGUAGE_ID &&
        extensionContext.client
    ) {
        Annotator.requestAnnotators(activeEditor, extensionContext.client);
    }
}

function onDidChangeActiveTextEditor(editor: vscode.TextEditor | undefined): void {
    if (editor &&
        editor.document.languageId === extensionContext.LANGUAGE_ID &&
        extensionContext.client
    ) {
        activeEditor = editor;
        Annotator.requestAnnotators(activeEditor, extensionContext.client);
    }
}


async function startServer(): Promise<void> {
    try {
        await doStartServer();
        onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
    } catch (reason) {
        extensionContext.setServerStatus({
            health: 'error',
            message: `Failed to start "EmmyLua" language server!\n${reason}`,
            command: 'emmy.restartServer'
        });
    }
}

async function doStartServer(): Promise<void> {
    const context = extensionContext.vscodeContext;
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: extensionContext.LANGUAGE_ID }],
        initializationOptions: {},
    };

    let serverOptions: ServerOptions;
    const config = vscode.workspace.getConfiguration(
        undefined,
        vscode.workspace.workspaceFolders?.[0]
    );
    const debugPort = config.get<integer | null>("emmylua.ls.debugPort");
    if (debugPort || extensionContext.debugMode) {
        // The server is a started as a separate app and listens on port 5007
        const connectionInfo = {
            port: debugPort || 5007,
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
        let configExecutablePath = get<string>(config, "emmylua.ls.executablePath")?.trim();
        if (!configExecutablePath || configExecutablePath.length == 0) {
            let platform = os.platform();
            let executableName = platform === 'win32' ? 'emmylua_ls.exe' : 'emmylua_ls';
            configExecutablePath = path.join(context.extensionPath, 'server', executableName);

            if (platform !== 'win32') {
                fs.chmodSync(configExecutablePath, '777');
            }
        }

        serverOptions = {
            command: configExecutablePath,
            args: [],
            options: { env: process.env }
        };

        let parameters = config.get<string[]>("emmylua.ls.startParameters");
        if (parameters && parameters.length > 0) {
            serverOptions.args = parameters;
        }

        let globalConfigPath = get<string>(config, "emmylua.ls.globalConfigPath")?.trim();
        if (globalConfigPath && globalConfigPath.length > 0) {
            if (!serverOptions.options || !serverOptions.options.env) {
                serverOptions.options = { env: {} }
            }
            serverOptions.options.env['EMMYLUALS_CONFIG'] = globalConfigPath;
        }
    }

    extensionContext.client = new LanguageClient(
        extensionContext.LANGUAGE_ID,
        'EmmyLua plugin for vscode.',
        serverOptions,
        clientOptions
    );

    await extensionContext.client.start();
    console.log('EmmyLua client ready');
}

function restartServer(): void {
    const client = extensionContext.client;
    if (!client) {
        startServer();
    } else {
        client.stop().then(() => startServer());
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
    extensionContext.stopServer();
}

async function insertEmmyDebugCode() {
    const context = extensionContext.vscodeContext;
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
