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
    private readonly statusBarItem: vscode.StatusBarItem;
    private isInstalling = false;
    private installedPackagesCache: LuaPackage[] = [];

    constructor(workspaceFolder: vscode.WorkspaceFolder) {
        this.workspaceFolder = workspaceFolder;
        this.outputChannel = vscode.window.createOutputChannel('LuaRocks');
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.updateStatusBar();
    }

    /**
     * 检查 LuaRocks 是否已安装
     */
    async checkLuaRocksInstallation(): Promise<boolean> {
        try {
            const { stdout } = await exec('luarocks --version');
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
                        const [name, version] = depString.split(/\s+/);
                        if (name && name !== 'lua') {
                            dependencies.push({
                                name: name.trim(),
                                version: version?.trim() || 'latest',
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
        try {
            this.showProgress('Searching packages...');
            
            const { stdout } = await exec(`luarocks search ${query} --porcelain`);
            const packages = this.parseSearchResults(stdout);
            
            this.hideProgress();
            return packages;
        } catch (error) {
            this.hideProgress();
            this.showError('Failed to search packages', error);
            return [];
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
            const localFlag = await this.shouldUseLocal() ? '--local' : '';
            const { stdout } = await exec(`luarocks list --porcelain ${localFlag}`.trim());
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

        try {
            this.isInstalling = true;
            this.updateStatusBar('Installing...');
            
            const versionSpec = version && version !== 'latest' ? `${packageName} ${version}` : packageName;
            const localFlag = await this.shouldUseLocal() ? '--local' : '';
            
            const command = `luarocks install ${versionSpec} ${localFlag}`.trim();
            
            this.outputChannel.show();
            this.outputChannel.appendLine(`Installing: ${command}`);
            
            const { stdout, stderr } = await exec(command, {
                cwd: this.workspaceFolder.uri.fsPath
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
            this.updateStatusBar();
        }
    }

    /**
     * 卸载包
     */
    async uninstallPackage(packageName: string): Promise<boolean> {
        try {
            this.updateStatusBar('Uninstalling...');
            
            const localFlag = await this.shouldUseLocal() ? '--local' : '';
            const command = `luarocks remove ${packageName} ${localFlag}`.trim();
            
            this.outputChannel.show();
            this.outputChannel.appendLine(`Uninstalling: ${command}`);
            
            const { stdout, stderr } = await exec(command);
            
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
            this.updateStatusBar();
        }
    }

    /**
     * 获取包详细信息
     */
    async getPackageInfo(packageName: string): Promise<LuaPackage | null> {
        try {
            const { stdout } = await exec(`luarocks show ${packageName}`);
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
                    location: parts[2]?.trim() || '',
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

    private async shouldUseLocal(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('emmylua.luarocks');
        return config.get<boolean>('preferLocalInstall', true);
    }

    private showError(message: string, error: any): void {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.outputChannel.appendLine(`Error: ${message}`);
        this.outputChannel.appendLine(errorMessage);
        vscode.window.showErrorMessage(message);
    }

    private showProgress(message: string): void {
        this.updateStatusBar(message);
    }

    private hideProgress(): void {
        this.updateStatusBar();
    }

    private updateStatusBar(text?: string): void {
        if (text) {
            this.statusBarItem.text = `$(sync~spin) ${text}`;
            this.statusBarItem.show();
        } else {
            this.statusBarItem.text = '$(package) LuaRocks';
            this.statusBarItem.command = 'emmylua.luarocks.showPackages';
            this.statusBarItem.show();
        }
    }

    dispose(): void {
        this.outputChannel.dispose();
        this.statusBarItem.dispose();
    }
}
