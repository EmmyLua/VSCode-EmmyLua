import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const exec = promisify(cp.exec);
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

export interface LuaPackage {
    name: string;
    version: string;
    description?: string;
    dependencies?: string[];
    homepage?: string;
    license?: string;
    author?: string;
    installed?: boolean;
    location?: string;
    summary?: string;
}

export interface LuaRocksWorkspace {
    hasRockspec: boolean;
    rockspecFiles: string[];
    hasLuarocksConfig: boolean;
    dependencies: LuaPackage[];
}

export class LuaRocksManager {
    private readonly workspaceFolder: vscode.WorkspaceFolder;
    private readonly outputChannel: vscode.OutputChannel;
    private isInstalling = false;
    private installedPackagesCache: LuaPackage[] = [];

    constructor(workspaceFolder: vscode.WorkspaceFolder) {
        this.workspaceFolder = workspaceFolder;
        this.outputChannel = vscode.window.createOutputChannel('LuaRocks');
    }

    /**
     * 检查 LuaRocks 是否已安装
     */
    async checkLuaRocksInstallation(): Promise<boolean> {
        try {
            const { stdout } = await exec('luarocks --version', { windowsHide: true });
            return stdout.includes('LuaRocks');
        } catch {
            return false;
        }
    }

    /**
     * 检测当前工作区是否为 LuaRocks 项目
     */
    async detectLuaRocksWorkspace(): Promise<LuaRocksWorkspace> {
        const workspace: LuaRocksWorkspace = {
            hasRockspec: false,
            rockspecFiles: [],
            hasLuarocksConfig: false,
            dependencies: []
        };

        try {
            // 查找 .rockspec 文件
            const rockspecFiles = await vscode.workspace.findFiles(
                new vscode.RelativePattern(this.workspaceFolder, '*.rockspec'),
                null,
                10
            );

            workspace.hasRockspec = rockspecFiles.length > 0;
            workspace.rockspecFiles = rockspecFiles.map(uri => uri.fsPath);

            // 检查 .luarocks 配置文件
            const luarocksConfigPath = path.join(this.workspaceFolder.uri.fsPath, '.luarocks');
            try {
                await access(luarocksConfigPath);
                workspace.hasLuarocksConfig = true;
            } catch {
                workspace.hasLuarocksConfig = false;
            }

            // 如果有 rockspec 文件，解析依赖
            if (workspace.hasRockspec && workspace.rockspecFiles.length > 0) {
                workspace.dependencies = await this.parseRockspecDependencies(workspace.rockspecFiles[0]);
            }

        } catch (error) {
            console.error('Error detecting LuaRocks workspace:', error);
        }

        return workspace;
    }

    /**
     * 解析 rockspec 文件中的依赖
     */
    private async parseRockspecDependencies(rockspecPath: string): Promise<LuaPackage[]> {
        try {
            const content = await readFile(rockspecPath, 'utf8');
            const dependencies: LuaPackage[] = [];

            // 简单的正则解析依赖（实际应该使用 Lua 解析器）
            const depMatch = content.match(/dependencies\s*=\s*\{([^}]*)\}/);
            if (depMatch) {
                const depContent = depMatch[1];
                const depLines = depContent.split(',').map(line => line.trim());

                for (const line of depLines) {
                    const match = line.match(/["']([^"']+)["']/);
                    if (match) {
                        const depString = match[1];
                        const [name, ...versionParts] = depString.split(/\s+/);
                        const version = versionParts.join(' ').trim();
                        if (name && name !== 'lua') {
                            dependencies.push({
                                name: name.trim(),
                                version: version || 'latest',
                                installed: false
                            });
                        }
                    }
                }
            }

            return dependencies;
        } catch (error) {
            console.error('Error parsing rockspec dependencies:', error);
            return [];
        }
    }

    /**
     * 搜索包
     */
    async searchPackages(query: string): Promise<LuaPackage[]> {
        // 使用临时状态栏消息显示进度（不再使用常驻的状态栏图标）
        const status = vscode.window.setStatusBarMessage('$(sync~spin) LuaRocks: Searching packages...');
        try {
            const command = this.buildLuaRocksCommand([
                'search',
                this.quoteArg(query),
                '--porcelain'
            ]);
            const { stdout } = await exec(command, {
                cwd: this.workspaceFolder.uri.fsPath,
                windowsHide: true
            });
            const packages = this.parseSearchResults(stdout);

            return packages;
        } catch (error) {
            this.showError('Failed to search packages', error);
            return [];
        } finally {
            status.dispose();
        }
    }

    /**
     * 获取已安装的包列表
     */
    async getInstalledPackages(forceRefresh = false): Promise<LuaPackage[]> {
        if (!forceRefresh && this.installedPackagesCache.length > 0) {
            return this.installedPackagesCache;
        }

        try {
            const command = this.buildLuaRocksCommand([
                'list',
                '--porcelain'
            ]);
            const { stdout } = await exec(command, {
                cwd: this.workspaceFolder.uri.fsPath,
                windowsHide: true
            });
            this.installedPackagesCache = this.parseInstalledPackages(stdout);
            return this.installedPackagesCache;
        } catch (error) {
            this.showError('Failed to get installed packages', error);
            return [];
        }
    }

    /**
     * 安装包
     */
    async installPackage(packageName: string, version?: string): Promise<boolean> {
        if (this.isInstalling) {
            vscode.window.showWarningMessage('Installation already in progress');
            return false;
        }

        // 使用临时状态栏消息显示进度
        const status = vscode.window.setStatusBarMessage('$(sync~spin) LuaRocks: Installing...');
        try {
            this.isInstalling = true;

            const installArgs = [
                'install',
                this.quoteArg(packageName),
                ...(version && version !== 'latest' ? [this.quoteArg(version)] : [])
            ];
            const command = this.buildLuaRocksCommand(installArgs);

            this.outputChannel.show();
            this.outputChannel.appendLine(`Installing: ${command}`);

            const { stdout, stderr } = await exec(command, {
                cwd: this.workspaceFolder.uri.fsPath,
                windowsHide: true
            });

            this.outputChannel.appendLine(stdout);
            if (stderr) this.outputChannel.appendLine(stderr);

            // 清除缓存
            this.installedPackagesCache = [];

            vscode.window.showInformationMessage(`Successfully installed ${packageName}`);
            return true;
        } catch (error) {
            this.showError(`Failed to install ${packageName}`, error);
            return false;
        } finally {
            this.isInstalling = false;
            status.dispose();
        }
    }

    /**
     * 卸载包
     */
    async uninstallPackage(packageName: string): Promise<boolean> {
        // 使用临时状态栏消息显示进度
        const status = vscode.window.setStatusBarMessage('$(sync~spin) LuaRocks: Uninstalling...');
        try {
            const command = this.buildLuaRocksCommand([
                'remove',
                this.quoteArg(packageName)
            ]);

            this.outputChannel.show();
            this.outputChannel.appendLine(`Uninstalling: ${command}`);

            const { stdout, stderr } = await exec(command, {
                cwd: this.workspaceFolder.uri.fsPath,
                windowsHide: true
            });

            this.outputChannel.appendLine(stdout);
            if (stderr) this.outputChannel.appendLine(stderr);

            // 清除缓存
            this.installedPackagesCache = [];

            vscode.window.showInformationMessage(`Successfully uninstalled ${packageName}`);
            return true;
        } catch (error) {
            this.showError(`Failed to uninstall ${packageName}`, error);
            return false;
        } finally {
            status.dispose();
        }
    }

    /**
     * 获取包详细信息
     */
    async getPackageInfo(packageName: string): Promise<LuaPackage | null> {
        try {
            const command = this.buildLuaRocksCommand([
                'show',
                this.quoteArg(packageName)
            ]);
            const { stdout } = await exec(command, {
                cwd: this.workspaceFolder.uri.fsPath,
                windowsHide: true
            });
            return this.parsePackageInfo(stdout, packageName);
        } catch (error) {
            // 尝试从搜索结果获取信息
            try {
                const searchResults = await this.searchPackages(packageName);
                return searchResults.find(pkg => pkg.name === packageName) || null;
            } catch {
                this.showError(`Failed to get package info for ${packageName}`, error);
                return null;
            }
        }
    }

    /**
     * 检查包是否已安装
     */
    async isPackageInstalled(packageName: string): Promise<boolean> {
        const installed = await this.getInstalledPackages();
        return installed.some(pkg => pkg.name === packageName);
    }

    // Private helper methods

    private parseSearchResults(output: string): LuaPackage[] {
        const packages: LuaPackage[] = [];
        const lines = output.trim().split('\n').filter(line => line.trim());

        for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length >= 2) {
                packages.push({
                    name: parts[0].trim(),
                    version: parts[1].trim(),
                    summary: parts[2]?.trim() || '',
                    description: parts[2]?.trim() || '',
                    installed: false
                });
            }
        }

        return packages;
    }

    private parseInstalledPackages(output: string): LuaPackage[] {
        const packages: LuaPackage[] = [];
        const lines = output.trim().split('\n').filter(line => line.trim());

        for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length >= 2) {
                packages.push({
                    name: parts[0].trim(),
                    version: parts[1].trim(),
                    location: (parts[3] ?? parts[2] ?? '').trim(),
                    installed: true
                });
            }
        }

        return packages;
    }

    private parsePackageInfo(output: string, packageName: string): LuaPackage {
        const lines = output.split('\n');
        const info: Partial<LuaPackage> = {
            name: packageName,
            installed: true
        };

        for (const line of lines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) continue;

            const key = line.substring(0, colonIndex).trim().toLowerCase();
            const value = line.substring(colonIndex + 1).trim();

            switch (key) {
                case 'version':
                    info.version = value;
                    break;
                case 'description':
                case 'summary':
                    info.description = value;
                    break;
                case 'homepage':
                    info.homepage = value;
                    break;
                case 'license':
                    info.license = value;
                    break;
                case 'maintainer':
                case 'author':
                    info.author = value;
                    break;
            }
        }

        return info as LuaPackage;
    }

    private quoteArg(value: string): string {
        // 简单的引号封装，避免空格路径/参数导致命令解析错误
        const trimmed = value.trim().replace(/[\\/]+$/, '');
        const escapedQuotes = trimmed.replace(/"/g, '\\"');
        return `"${escapedQuotes}"`;
    }

    private buildLuaRocksCommand(args: string[]): string {
        return ['luarocks', ...args.filter(Boolean)].join(' ').trim();
    }

    private showError(message: string, error: any): void {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.outputChannel.appendLine(`Error: ${message}`);
        this.outputChannel.appendLine(errorMessage);
        vscode.window.showErrorMessage(message);
    }

    dispose(): void {
        this.outputChannel.dispose();
    }
}
