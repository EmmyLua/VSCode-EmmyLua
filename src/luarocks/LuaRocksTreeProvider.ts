import * as vscode from 'vscode';
import { LuaRocksManager, LuaPackage } from './LuaRocksManager';

export class LuaRocksTreeProvider implements vscode.TreeDataProvider<PackageTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PackageTreeItem | undefined | null | void> = new vscode.EventEmitter<PackageTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PackageTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private installedPackages: LuaPackage[] = [];
    private installedLoaded = false;
    private installedLoading: Promise<void> | undefined;
    private searchResults: LuaPackage[] = [];
    private isSearchMode = false;

    constructor(private readonly manager: LuaRocksManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    async refreshInstalled(): Promise<void> {
        await this.ensureInstalledLoaded(true);
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
                    new PackageTreeItem('Search Results', vscode.TreeItemCollapsibleState.Expanded, 'category', undefined, this.searchResults.length)
                ];
            } else {
                await this.ensureInstalledLoaded(false);
                return [
                    new PackageTreeItem('Installed Packages', vscode.TreeItemCollapsibleState.Expanded, 'category', undefined, this.installedPackages.length),
                    new PackageTreeItem('Search Packages', vscode.TreeItemCollapsibleState.None, 'search')
                ];
            }
        }

        if (element.type === 'category') {
            if (element.label === 'Installed Packages') {
                await this.ensureInstalledLoaded(false);
                return this.installedPackages.map(pkg => 
                    new PackageTreeItem(pkg.name, vscode.TreeItemCollapsibleState.None, 'installed', pkg)
                );
            } else if (element.label === 'Search Results') {
                return this.searchResults.map(pkg => 
                    new PackageTreeItem(pkg.name, vscode.TreeItemCollapsibleState.None, 'available', pkg)
                );
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
            this.installedPackages = await this.manager.getInstalledPackages(forceRefresh);
            this.installedLoaded = true;
        })();

        try {
            await this.installedLoading;
        } finally {
            this.installedLoading = undefined;
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
        public readonly type: 'category' | 'installed' | 'available' | 'search',
        public readonly packageInfo?: LuaPackage,
        public readonly count?: number
    ) {
        super(label, collapsibleState);

        this.setupItem();
    }

    private setupItem(): void {
        switch (this.type) {
            case 'category':
                this.iconPath = new vscode.ThemeIcon('folder');
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

        const lines = [
            `**${this.packageInfo.name}** ${this.packageInfo.version || ''}`,
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
