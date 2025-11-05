import * as vscode from 'vscode';
import * as path from 'path';
import * as net from 'net';
import * as process from 'process';
import * as os from 'os';
import * as fs from 'fs';

import { LanguageClient, LanguageClientOptions, ServerOptions, StreamInfo } from 'vscode-languageclient/node';
import { LuaLanguageConfiguration } from './languageConfiguration';
import { EmmyNewDebuggerProvider } from './debugger/new_debugger/EmmyNewDebuggerProvider';
import { EmmyAttachDebuggerProvider } from './debugger/attach/EmmyAttachDebuggerProvider';
import { EmmyLaunchDebuggerProvider } from './debugger/launch/EmmyLaunchDebuggerProvider';
import { EmmyContext } from './emmyContext';
import { InlineDebugAdapterFactory } from './debugger/DebugFactory';
import { IServerLocation, IServerPosition } from './lspExtension';
import { onDidChangeConfiguration } from './annotator';
import { ConfigurationManager } from './configRenames';
import * as Annotator from './annotator';
import { LuaRocksManager } from './luarocks/LuaRocksManager';
import { LuaRocksTreeProvider, PackageTreeItem } from './luarocks/LuaRocksTreeProvider';
import { EmmyrcSchemaContentProvider } from './emmyrcSchemaContentProvider';

/**
 * Debugger configuration interface
 */
interface DebuggerConfig {
    readonly type: string;
    readonly provider: vscode.DebugConfigurationProvider;
}

/**
 * Command registration entry
 */
interface CommandEntry {
    readonly id: string;
    readonly handler: (...args: any[]) => any;
}

// Global state
export let extensionContext: EmmyContext;
let activeEditor: vscode.TextEditor | undefined;
let luaRocksManager: LuaRocksManager | undefined;
let luaRocksTreeProvider: LuaRocksTreeProvider | undefined;

/**
 * Extension activation entry point
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('EmmyLua extension activated!');

    // Provide `.emmyrc.json` schema with i18n support
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider(
            'emmyrc-schema',
            new EmmyrcSchemaContentProvider(context)
        )
    );

    // Initialize extension context
    extensionContext = new EmmyContext(
        process.env['EMMY_DEV'] === 'true',
        context
    );

    // Register all components
    registerCommands(context);
    registerEventListeners(context);
    registerLanguageConfiguration(context);

    // Initialize features
    await initializeExtension();
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
    extensionContext?.dispose();
    Annotator.dispose();
}

/**
 * Register all commands
 */
function registerCommands(context: vscode.ExtensionContext): void {
    const commandEntries: CommandEntry[] = [
        // Server commands
        { id: 'emmy.stopServer', handler: stopServer },
        { id: 'emmy.restartServer', handler: restartServer },
        { id: 'emmy.showServerMenu', handler: showServerMenu },
        { id: 'emmy.showReferences', handler: showReferences },
        { id: 'emmy.insertEmmyDebugCode', handler: insertEmmyDebugCode },
        // LuaRocks commands
        { id: 'emmylua.luarocks.searchPackages', handler: searchPackages },
        { id: 'emmylua.luarocks.installPackage', handler: installPackage },
        { id: 'emmylua.luarocks.uninstallPackage', handler: uninstallPackage },
        { id: 'emmylua.luarocks.showPackageInfo', handler: showPackageInfo },
        { id: 'emmylua.luarocks.refreshPackages', handler: refreshPackages },
        { id: 'emmylua.luarocks.showPackages', handler: showPackagesView },
        { id: 'emmylua.luarocks.clearSearch', handler: clearSearch },
        { id: 'emmylua.luarocks.checkInstallation', handler: checkLuaRocksInstallation },
    ];

    // Register all commands
    const commands = commandEntries.map(({ id, handler }) =>
        vscode.commands.registerCommand(id, handler)
    );

    context.subscriptions.push(...commands);
}

/**
 * Register event listeners
 */
function registerEventListeners(context: vscode.ExtensionContext): void {
    const eventListeners = [
        vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument),
        vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor),
        vscode.workspace.onDidChangeConfiguration(onConfigurationChanged),
    ];

    context.subscriptions.push(...eventListeners);
}

/**
 * Register language configuration
 */
function registerLanguageConfiguration(context: vscode.ExtensionContext): void {
    const languageConfig = vscode.languages.setLanguageConfiguration(
        'lua',
        new LuaLanguageConfiguration()
    );

    context.subscriptions.push(languageConfig);
}

/**
 * Initialize all extension features
 */
async function initializeExtension(): Promise<void> {
    await startServer();
    registerDebuggers();
    await initializeLuaRocks();
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
        extensionContext.setServerStarting();
        await doStartServer();
        extensionContext.setServerRunning();
        onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
    } catch (reason) {
        const errorMessage = reason instanceof Error ? reason.message : String(reason);
        extensionContext.setServerError(
            'Failed to start EmmyLua language server',
            errorMessage
        );
        vscode.window.showErrorMessage(
            `Failed to start EmmyLua language server: ${errorMessage}`,
            'Retry',
            'Show Logs'
        ).then(action => {
            if (action === 'Retry') {
                restartServer();
            } else if (action === 'Show Logs') {
                extensionContext.client?.outputChannel?.show();
            }
        });
    }
}

/**
 * Start the language server
 */
async function doStartServer(): Promise<void> {
    const context = extensionContext.vscodeContext;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const configManager = new ConfigurationManager(workspaceFolder);
    
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: extensionContext.LANGUAGE_ID }],
        initializationOptions: {},
    };

    let serverOptions: ServerOptions;
    const debugPort = configManager.getDebugPort();
    
    if (debugPort || extensionContext.debugMode) {
        // Connect to language server via socket (debug mode)
        serverOptions = createDebugServerOptions(debugPort || 5007);
    } else {
        // Start language server as external process
        serverOptions = createProcessServerOptions(context, configManager);
    }

    extensionContext.client = new LanguageClient(
        extensionContext.LANGUAGE_ID,
        'EmmyLua Language Server',
        serverOptions,
        clientOptions
    );

    await extensionContext.client.start();
    console.log('EmmyLua language server started successfully');
}

/**
 * Create server options for debug mode (socket connection)
 */
function createDebugServerOptions(port: number): ServerOptions {
    return () => {
        const socket = net.connect({ port });
        const result: StreamInfo = {
            writer: socket,
            reader: socket as NodeJS.ReadableStream
        };
        
        socket.on('close', () => {
            console.error(`Language server connection closed (port ${port})`);
        });
        
        socket.on('error', (error) => {
            console.error(`Language server connection error:`, error);
        });
        
        return Promise.resolve(result);
    };
}

/**
 * Create server options for process mode
 */
function createProcessServerOptions(
    context: vscode.ExtensionContext,
    configManager: ConfigurationManager
): ServerOptions {
    const executablePath = resolveExecutablePath(context, configManager);
    const startParameters = configManager.getStartParameters();
    const globalConfigPath = configManager.getGlobalConfigPath();
    
    const serverOptions: ServerOptions = {
        command: executablePath,
        args: startParameters,
        options: { env: { ...process.env } }
    };

    // Set global config path if specified
    if (globalConfigPath?.trim()) {
        if (!serverOptions.options) {
            serverOptions.options = { env: {} };
        }
        if (!serverOptions.options.env) {
            serverOptions.options.env = {};
        }
        serverOptions.options.env['EMMYLUALS_CONFIG'] = globalConfigPath;
    }

    return serverOptions;
}

/**
 * Resolve the language server executable path
 */
function resolveExecutablePath(
    context: vscode.ExtensionContext,
    configManager: ConfigurationManager
): string {
    let executablePath = configManager.getExecutablePath()?.trim();
    
    if (!executablePath) {
        // Use bundled language server
        const platform = os.platform();
        const executableName = platform === 'win32' ? 'emmylua_ls.exe' : 'emmylua_ls';
        executablePath = path.join(context.extensionPath, 'server', executableName);
        // Make executable on Unix-like systems
        if (platform !== 'win32') {
            try {
                fs.chmodSync(executablePath, '777');
            } catch (error) {
                console.warn(`Failed to chmod language server:`, error);
            }
        }
    }

    return executablePath;
}

async function restartServer(): Promise<void> {
    const client = extensionContext.client;
    if (!client) {
        await startServer();
    } else {
        extensionContext.setServerStopping('Restarting server...');
        try {
            await client.stop();
            await startServer();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            extensionContext.setServerError('Failed to restart server', errorMessage);
            vscode.window.showErrorMessage(`Failed to restart server: ${errorMessage}`);
        }
    }
}

function showServerMenu(): void {
    extensionContext.showServerMenu();
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

async function stopServer(): Promise<void> {
    try {
        await extensionContext.stopServer();
        vscode.window.showInformationMessage('EmmyLua language server stopped');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to stop server: ${errorMessage}`);
    }
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

    const rockspecFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceFolder, '*.rockspec'),
        null,
        10
    );

    if (rockspecFiles.length === 0) {
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
        let workspace = await luaRocksManager.detectLuaRocksWorkspace();
        if (workspace) {
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