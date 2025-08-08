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
import { LuaRocksManager } from './luarocks/LuaRocksManager';
import { LuaRocksTreeProvider, PackageTreeItem } from './luarocks/LuaRocksTreeProvider';
interface DebuggerConfig {
    readonly type: string;
    readonly provider: vscode.DebugConfigurationProvider;
}

// Global state
export let extensionContext: EmmyContext;
let activeEditor: vscode.TextEditor | undefined;
let luaRocksManager: LuaRocksManager | undefined;
let luaRocksTreeProvider: LuaRocksTreeProvider | undefined;

export async function activate(context: vscode.ExtensionContext) {
    console.log('EmmyLua extension activated!');

    // 提供`.emmyrc.json`的 i18n
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider('emmyrc-schema', new EmmyrcSchemaContentProvider(context))
    );

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
        // LuaRocks commands
        vscode.commands.registerCommand('emmylua.luarocks.searchPackages', searchPackages),
        vscode.commands.registerCommand('emmylua.luarocks.installPackage', installPackage),
        vscode.commands.registerCommand('emmylua.luarocks.uninstallPackage', uninstallPackage),
        vscode.commands.registerCommand('emmylua.luarocks.showPackageInfo', showPackageInfo),
        vscode.commands.registerCommand('emmylua.luarocks.refreshPackages', refreshPackages),
        vscode.commands.registerCommand('emmylua.luarocks.showPackages', showPackagesView),
        vscode.commands.registerCommand('emmylua.luarocks.clearSearch', clearSearch),
        vscode.commands.registerCommand('emmylua.luarocks.checkInstallation', checkLuaRocksInstallation),
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
    await initializeLuaRocks();
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

// LuaRocks Integration Functions

async function initializeLuaRocks(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return;
    }

    // Initialize LuaRocks manager
    luaRocksManager = new LuaRocksManager(workspaceFolder);
    luaRocksTreeProvider = new LuaRocksTreeProvider(luaRocksManager);

    // Register tree view
    const treeView = vscode.window.createTreeView('emmylua.luarocks', {
        treeDataProvider: luaRocksTreeProvider,
        showCollapseAll: true
    });

    extensionContext.vscodeContext.subscriptions.push(
        treeView,
        luaRocksManager,
        luaRocksTreeProvider
    );

    // Check if LuaRocks is installed
    const isInstalled = await luaRocksManager.checkLuaRocksInstallation();
    if (isInstalled) {
        // Auto-detect workspace type
        const workspace = await luaRocksManager.detectLuaRocksWorkspace();
        if (workspace.hasRockspec) {
            vscode.window.showInformationMessage(`Found ${workspace.rockspecFiles.length} rockspec file(s) in workspace`);
        }
    }
}

async function searchPackages(): Promise<void> {
    if (!luaRocksManager || !luaRocksTreeProvider) {
        vscode.window.showErrorMessage('LuaRocks not initialized');
        return;
    }

    const query = await vscode.window.showInputBox({
        prompt: 'Enter package name or search term',
        placeHolder: 'e.g., lpeg, luasocket, etc.'
    });

    if (!query) {
        return;
    }

    try {
        const packages = await luaRocksManager.searchPackages(query);
        if (packages.length === 0) {
            vscode.window.showInformationMessage(`No packages found for "${query}"`);
        } else {
            luaRocksTreeProvider.setSearchResults(packages);
            vscode.window.showInformationMessage(`Found ${packages.length} package(s) for "${query}"`);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Search failed: ${error}`);
    }
}

async function installPackage(item?: PackageTreeItem): Promise<void> {
    if (!luaRocksManager || !luaRocksTreeProvider) {
        vscode.window.showErrorMessage('LuaRocks not initialized');
        return;
    }

    let packageName: string;
    let packageVersion: string | undefined;

    if (item && item.packageInfo) {
        packageName = item.packageInfo.name;
        packageVersion = item.packageInfo.version;
    } else {
        const input = await vscode.window.showInputBox({
            prompt: 'Enter package name (optionally with version)',
            placeHolder: 'e.g., lpeg or lpeg 1.0.2'
        });

        if (!input) {
            return;
        }

        const parts = input.trim().split(/\s+/);
        packageName = parts[0];
        packageVersion = parts[1];
    }

    const success = await luaRocksManager.installPackage(packageName, packageVersion);
    if (success) {
        luaRocksTreeProvider.refreshInstalled();
    }
}

async function uninstallPackage(item: PackageTreeItem): Promise<void> {
    if (!luaRocksManager || !luaRocksTreeProvider) {
        vscode.window.showErrorMessage('LuaRocks not initialized');
        return;
    }

    if (!item.packageInfo) {
        vscode.window.showErrorMessage('No package selected');
        return;
    }

    const packageName = item.packageInfo.name;
    const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to uninstall "${packageName}"?`,
        'Yes',
        'No'
    );

    if (confirm === 'Yes') {
        const success = await luaRocksManager.uninstallPackage(packageName);
        if (success) {
            luaRocksTreeProvider.refreshInstalled();
        }
    }
}

async function showPackageInfo(item: PackageTreeItem): Promise<void> {
    if (!luaRocksManager) {
        vscode.window.showErrorMessage('LuaRocks not initialized');
        return;
    }

    if (!item.packageInfo) {
        vscode.window.showErrorMessage('No package selected');
        return;
    }

    const packageInfo = await luaRocksManager.getPackageInfo(item.packageInfo.name);
    if (!packageInfo) {
        vscode.window.showErrorMessage('Failed to get package information');
        return;
    }

    // 使用QuickPick显示包信息，这样不会影响树视图
    const quickPick = vscode.window.createQuickPick();
    quickPick.title = `Package: ${packageInfo.name}`;
    quickPick.placeholder = 'Package Information';

    const items: vscode.QuickPickItem[] = [
        {
            label: `$(package) ${packageInfo.name}`,
            description: `Version: ${packageInfo.version || 'Unknown'}`,
            detail: packageInfo.description || packageInfo.summary || 'No description available'
        }
    ];

    if (packageInfo.author) {
        items.push({
            label: `$(person) Author`,
            description: packageInfo.author
        });
    }

    if (packageInfo.license) {
        items.push({
            label: `$(law) License`,
            description: packageInfo.license
        });
    }

    if (packageInfo.homepage) {
        items.push({
            label: `$(link-external) Homepage`,
            description: packageInfo.homepage,
            detail: 'Click to open in browser'
        });
    }

    if (packageInfo.location && packageInfo.installed) {
        items.push({
            label: `$(folder) Location`,
            description: packageInfo.location
        });
    }

    items.push({
        label: `$(info) Status`,
        description: packageInfo.installed ? 'Installed' : 'Available for installation'
    });

    // 添加操作按钮
    if (packageInfo.installed) {
        items.push({
            label: `$(trash) Uninstall Package`,
            description: 'Remove this package',
            detail: 'Click to uninstall'
        });
    } else {
        items.push({
            label: `$(cloud-download) Install Package`,
            description: 'Install this package',
            detail: 'Click to install'
        });
    }

    quickPick.items = items;

    quickPick.onDidAccept(() => {
        const selected = quickPick.selectedItems[0];
        if (selected) {
            if (selected.label.includes('Homepage') && packageInfo.homepage) {
                vscode.env.openExternal(vscode.Uri.parse(packageInfo.homepage));
            } else if (selected.label.includes('Uninstall')) {
                quickPick.hide();
                uninstallPackage(item);
            } else if (selected.label.includes('Install')) {
                quickPick.hide();
                installPackage(item);
            }
        }
    });

    quickPick.show();
}

async function refreshPackages(): Promise<void> {
    if (!luaRocksTreeProvider) {
        vscode.window.showErrorMessage('LuaRocks not initialized');
        return;
    }

    await luaRocksTreeProvider.refreshInstalled();
    vscode.window.showInformationMessage('Package list refreshed');
}

async function showPackagesView(): Promise<void> {
    await vscode.commands.executeCommand('emmylua.luarocks.focus');
}

function clearSearch(): void {
    if (!luaRocksTreeProvider) {
        vscode.window.showErrorMessage('LuaRocks not initialized');
        return;
    }

    luaRocksTreeProvider.clearSearch();
}

async function checkLuaRocksInstallation(): Promise<void> {
    if (!luaRocksManager) {
        vscode.window.showErrorMessage('LuaRocks not initialized');
        return;
    }

    const isInstalled = await luaRocksManager.checkLuaRocksInstallation();
    if (isInstalled) {
        vscode.window.showInformationMessage('LuaRocks is installed and ready to use');
    } else {
        const action = await vscode.window.showWarningMessage(
            'LuaRocks is not installed or not in PATH',
            'Install Guide',
            'Dismiss'
        );
        if (action === 'Install Guide') {
            vscode.env.openExternal(vscode.Uri.parse('https://luarocks.org/#quick-start'));
        }
    }
}



/**
 * 提供`.emmyrc.json`的 i18n
 */
class EmmyrcSchemaContentProvider implements vscode.TextDocumentContentProvider {
    private readonly schemaBaseDir: string;

    constructor(context: vscode.ExtensionContext) {
        this.schemaBaseDir = path.join(context.extensionPath, 'syntaxes');
    }

    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        const schemaIdentifier = path.posix.basename(uri.path);
        const locale = vscode.env.language;
        let schemaFileName: string;

        if (schemaIdentifier === 'emmyrc') {
            switch (locale) {
                case 'zh-cn':
                case 'zh-CN':
                case 'zh':
                    schemaFileName = 'schema.zh-cn.json';
                    break;
                case 'en':
                case 'en-US':
                case 'en-GB':
                default:
                    schemaFileName = 'schema.json';
                    break;
            }
        } else {
            return '';
        }

        // 检查schema文件是否存在, 如果不存在则使用默认的
        let schemaFilePath = path.join(this.schemaBaseDir, schemaFileName);
        if (!fs.existsSync(schemaFilePath)) {
            schemaFilePath = path.join(this.schemaBaseDir, 'schema.json');
        }

        try {
            return await fs.promises.readFile(schemaFilePath, 'utf8');
        } catch (error: any) {
            return JSON.stringify({
                "$schema": "https://json-schema.org/draft/2020-12/schema#",
                "title": "Error Loading Schema",
                "description": `Could not load schema: ${schemaFileName}. Error: ${error.message}.`
            });
        }
    }
}