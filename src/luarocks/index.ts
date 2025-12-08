import * as vscode from 'vscode';
import { LuaRocksManager } from "./LuaRocksManager";
import { LuaRocksTreeProvider, PackageTreeItem } from './LuaRocksTreeProvider';
import { extensionContext } from '../extension';


let luaRocksManager: LuaRocksManager | undefined;
let luaRocksTreeProvider: LuaRocksTreeProvider | undefined;

export async function initializeLuaRocks(): Promise<void> {
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

    const isInstalled = await luaRocksManager.checkLuaRocksInstallation();
    if (isInstalled) {
        let workspace = await luaRocksManager.detectLuaRocksWorkspace();
        if (workspace) {
            // 只有在第一次打开工作区时才显示提示
            const hasShownMessage = extensionContext.vscodeContext.workspaceState.get('luarocks.rockspecMessageShown', false);
            if (!hasShownMessage) {
                vscode.window.showInformationMessage(`Found ${workspace.rockspecFiles.length} rockspec file(s) in workspace`);
                await extensionContext.vscodeContext.workspaceState.update('luarocks.rockspecMessageShown', true);
            }
        }
    }
}

export async function searchPackages(): Promise<void> {
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

export async function installPackage(item?: PackageTreeItem): Promise<void> {
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

export async function uninstallPackage(item: PackageTreeItem): Promise<void> {
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

export async function showPackageInfo(item: PackageTreeItem): Promise<void> {
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

export async function refreshPackages(): Promise<void> {
    if (!luaRocksTreeProvider) {
        vscode.window.showErrorMessage('LuaRocks not initialized');
        return;
    }

    await luaRocksTreeProvider.refreshInstalled();
    vscode.window.showInformationMessage('Package list refreshed');
}

export async function showPackagesView(): Promise<void> {
    await vscode.commands.executeCommand('emmylua.luarocks.focus');
}

export function clearSearch(): void {
    if (!luaRocksTreeProvider) {
        vscode.window.showErrorMessage('LuaRocks not initialized');
        return;
    }

    luaRocksTreeProvider.clearSearch();
}

export async function checkLuaRocksInstallation(): Promise<void> {
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