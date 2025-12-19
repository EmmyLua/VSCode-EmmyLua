import * as vscode from 'vscode';
import { LuaRocksManager, LuaPackage } from './LuaRocksManager';

export class LuaRocksTreeProvider implements vscode.TreeDataProvider<PackageTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PackageTreeItem | undefined | null | void> = new vscode.EventEmitter<PackageTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PackageTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private installedPackages: LuaPackage[] = [];
    private installedLoaded = false;
    private installedLoading: Promise<void> | undefined;

    // 当前工作区 rockspec 声明的依赖
    private rockspecDependencies: { packageInfo: LuaPackage; requirement: string }[] = [];
    private rockspecLoaded = false;
    private rockspecLoading: Promise<void> | undefined;
    private searchResults: LuaPackage[] = [];
    private isSearchMode = false;

    constructor(private readonly manager: LuaRocksManager) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    async refreshInstalled(): Promise<void> {
        await this.ensureInstalledLoaded(true);
        await this.ensureRockspecLoaded(true);
        this.refresh();
    }

    setSearchResults(packages: LuaPackage[]): void {
        this.searchResults = packages;
        this.isSearchMode = true;
        this.refresh();
    }

    clearSearch(): void {
        this.isSearchMode = false;
        this.searchResults = [];
        this.refresh();
    }

    getTreeItem(element: PackageTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: PackageTreeItem): Promise<PackageTreeItem[]> {
        if (!element) {
            // Root level
            if (this.isSearchMode) {
                return [
                    new PackageTreeItem('Search Results', vscode.TreeItemCollapsibleState.Expanded, 'category', undefined, this.searchResults.length, 'searchResults')
                ];
            } else {
                await this.ensureRockspecLoaded(false);
                return [
                    new PackageTreeItem('Dependencies', vscode.TreeItemCollapsibleState.Expanded, 'category', undefined, this.rockspecDependencies.length, 'rockspecDependencies'),
                    new PackageTreeItem('Installed', vscode.TreeItemCollapsibleState.Collapsed, 'category', undefined, this.installedPackages.length, 'installed'),
                    new PackageTreeItem('Search Packages', vscode.TreeItemCollapsibleState.None, 'search')
                ];
            }
        }

        if (element.type === 'category') {
            switch (element.categoryId) {
                case 'installed': {
                    // 展开时再加载，避免扩展启动就执行外部命令
                    await this.ensureInstalledLoaded(false);
                    return this.installedPackages.map(pkg =>
                        new PackageTreeItem(pkg.name, vscode.TreeItemCollapsibleState.None, 'installed', pkg)
                    );
                }
                case 'rockspecDependencies': {
                    // 依赖列表用于“缺什么装什么”，保持数据最新
                    await this.ensureRockspecLoaded(false);
                    return this.rockspecDependencies.map(dep =>
                        new PackageTreeItem(dep.packageInfo.name, vscode.TreeItemCollapsibleState.None, 'dependency', dep.packageInfo, undefined, undefined, dep.requirement)
                    );
                }
                case 'searchResults': {
                    return this.searchResults.map(pkg =>
                        new PackageTreeItem(pkg.name, vscode.TreeItemCollapsibleState.None, 'available', pkg)
                    );
                }
            }
        }

        return [];
    }

    private async ensureInstalledLoaded(forceRefresh: boolean): Promise<void> {
        if (!forceRefresh && this.installedLoaded) {
            return;
        }

        if (this.installedLoading) {
            return this.installedLoading;
        }

        this.installedLoading = (async () => {
            // 获取已安装包列表（内部有缓存，这里通过 forceRefresh 控制刷新）
            this.installedPackages = await this.manager.getInstalledPackages(forceRefresh);
            this.installedLoaded = true;
        })();

        try {
            await this.installedLoading;
        } finally {
            this.installedLoading = undefined;
        }
    }

    private async ensureRockspecLoaded(forceRefresh: boolean): Promise<void> {
        if (!forceRefresh && this.rockspecLoaded) {
            return;
        }

        if (this.rockspecLoading) {
            return this.rockspecLoading;
        }

        this.rockspecLoading = (async () => {
            const workspace = await this.manager.detectLuaRocksWorkspace();
            const dependencies = workspace.dependencies ?? [];

            await this.ensureInstalledLoaded(false);
            const installedByName = new Map(this.installedPackages.map(pkg => [pkg.name, pkg]));

            this.rockspecDependencies = dependencies.map(dep => {
                const installed = installedByName.get(dep.name);
                const requirement = dep.version || 'latest';

                // 这里构造用于树视图的 packageInfo：
                // - installed: 用于菜单/hover 行为（安装/卸载按钮）
                // - summary: 用于 tooltip 展示依赖要求（Required: ...）
                const packageInfo: LuaPackage = {
                    name: dep.name,
                    version: installed?.version || 'latest',
                    installed: Boolean(installed),
                    location: installed?.location,
                    summary: `Required: ${requirement}`
                };

                return { packageInfo, requirement };
            });

            // 将未安装的依赖置顶
            this.rockspecDependencies.sort((a, b) => {
                const aMissing = !a.packageInfo.installed;
                const bMissing = !b.packageInfo.installed;
                if (aMissing !== bMissing) {
                    return aMissing ? -1 : 1;
                }
                return a.packageInfo.name.localeCompare(b.packageInfo.name);
            });

            this.rockspecLoaded = true;
        })();

        try {
            await this.rockspecLoading;
        } finally {
            this.rockspecLoading = undefined;
        }
    }

    dispose(): void {
        // Clean up any resources if needed
    }
}

export class PackageTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'category' | 'installed' | 'available' | 'dependency' | 'search',
        public readonly packageInfo?: LuaPackage,
        public readonly count?: number,
        public readonly categoryId?: 'installed' | 'rockspecDependencies' | 'searchResults',
        public readonly requirement?: string
    ) {
        super(label, collapsibleState);

        this.setupItem();
    }

    private setupItem(): void {
        switch (this.type) {
            case 'category':
                this.iconPath = new vscode.ThemeIcon('folder');
                // 右侧描述区域用来显示数量
                this.description = this.count !== undefined ? `(${this.count})` : '';
                this.contextValue = 'category';
                break;

            case 'installed':
                this.iconPath = new vscode.ThemeIcon('package');
                this.description = this.packageInfo?.version || '';
                this.tooltip = this.createTooltip();
                this.contextValue = 'installedPackage';
                // 右键菜单中提供详细信息
                break;

            case 'available':
                this.iconPath = new vscode.ThemeIcon('cloud-download');
                this.description = this.packageInfo?.version || '';
                this.tooltip = this.createTooltip();
                this.contextValue = 'availablePackage';
                // 右键菜单中提供详细信息
                break;

            case 'dependency': {
                const installed = Boolean(this.packageInfo?.installed);
                this.iconPath = new vscode.ThemeIcon(installed ? 'package' : 'cloud-download');
                // 安装状态状态指示
                this.description = installed ? '✓' : '✗';
                this.tooltip = this.createTooltip();
                this.contextValue = installed ? 'installedPackage' : 'availablePackage';
                break;
            }

            case 'search':
                this.iconPath = new vscode.ThemeIcon('search');
                this.command = {
                    command: 'emmylua.luarocks.searchPackages',
                    title: 'Search Packages'
                };
                this.contextValue = 'search';
                break;
        }
    }

    private createTooltip(): string {
        if (!this.packageInfo) return this.label;

        const displayVersion = this.packageInfo.version && this.packageInfo.version !== 'latest' ? this.packageInfo.version : '';
        const lines = [
            `**${this.packageInfo.name}** ${displayVersion}`,
            ''
        ];

        if (this.packageInfo.description || this.packageInfo.summary) {
            lines.push(this.packageInfo.description || this.packageInfo.summary || '');
            lines.push('');
        }

        if (this.packageInfo.author) {
            lines.push(`**Author:** ${this.packageInfo.author}`);
        }

        if (this.packageInfo.license) {
            lines.push(`**License:** ${this.packageInfo.license}`);
        }

        if (this.packageInfo.homepage) {
            lines.push(`**Homepage:** ${this.packageInfo.homepage}`);
        }

        if (this.packageInfo.location && this.packageInfo.installed) {
            lines.push(`**Location:** ${this.packageInfo.location}`);
        }

        return lines.join('\n');
    }
}
