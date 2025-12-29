import * as vscode from 'vscode';

/**
 * 配置项重命名映射, 新键名 -> 旧键名.
 * 
 * 用于将旧配置键名映射到新配置键名, 以确保向后兼容性
 */
const CONFIG_RENAMES: ReadonlyMap<string, string> = new Map([
    ['emmylua.ls.executablePath', 'emmylua.misc.executablePath'],
    ['emmylua.ls.globalConfigPath', 'emmylua.misc.globalConfigPath'],
    ['emmylua.language.completeAnnotation', 'emmylua.misc.autoInsertTripleDash'],
]);

/**
 * 已警告的废弃配置项
 */
const warnedDeprecations = new Set<string>();

/**
 * 获取配置值, 且支持重命名的键名.
 * 
 * 会自动回退至旧配置键名, 确保向后兼容性.
 * 
 * @param config - 配置
 * @param key - 必须传入最新的配置键名以正确获取配置值
 * @param defaultValue - 可选的默认值
 * @returns 配置值或默认值
 */
export function get<T>(
    config: vscode.WorkspaceConfiguration,
    key: string,
    defaultValue?: T
): T | undefined {
    const oldKey = CONFIG_RENAMES.get(key);

    // 如果旧键存在且有值, 那么我们需要使用旧键的值并警告用户该配置项已废弃
    if (oldKey && config.has(oldKey)) {
        const oldValue = config.get<T>(oldKey);
        if (oldValue !== undefined && oldValue !== null) {
            // 如果用户没有警告过该配置项, 那么我们需要警告用户
            if (!warnedDeprecations.has(oldKey)) {
                warnedDeprecations.add(oldKey);
                showDeprecationWarning(oldKey, key);
            }
            return oldValue;
        }
    }

    // 如果旧键不存在, 那么我们直接使用新键的值
    return config.get<T>(key, defaultValue as T);
}

/**
 * 显示配置项已废弃的警告
 */
function showDeprecationWarning(oldKey: string, newKey: string): void {
    const message = `Configuration "${oldKey}" is deprecated. Please use "${newKey}" instead.`;

    vscode.window.showWarningMessage(
        message,
        'Update Now',
        'Dismiss'
    ).then(action => {
        if (action === 'Update Now') {
            vscode.commands.executeCommand('workbench.action.openSettings', newKey);
        }
    });
}

/**
 * 配置管理器
 */
export class ConfigurationManager {
    private readonly config: vscode.WorkspaceConfiguration;

    constructor(scope?: vscode.ConfigurationScope) {
        this.config = vscode.workspace.getConfiguration('emmylua', scope);
    }

    /**
     * 获取配置项
     */
    get<T>(section: string, defaultValue?: T): T | undefined {
        // `this.config`此时的值是所有`emmylua`配置项的集合(不包含`emmylua`前缀)
        return get<T>(this.config, `${section}`, defaultValue);
    }

    /**
     * Get language server executable path
     */
    getExecutablePath(): string | undefined {
        return this.get<string>('ls.executablePath');
    }

    /**
     * Get language server global config path
     */
    getGlobalConfigPath(): string | undefined {
        return this.get<string>('ls.globalConfigPath');
    }

    /**
     * Get language server start parameters
     */
    getStartParameters(): string[] {
        return this.get<string[]>('ls.startParameters', []) || [];
    }

    /**
     * Get language server debug port
     */
    getDebugPort(): number | null {
        return this.get<number | null>('ls.debugPort', null) || null;
    }

    /**
     * Get color configuration
     */
    getColor(colorType: string): string | undefined {
        return this.get<string>(`colors.${colorType}`);
    }

    /**
     * Check if mutable variables should have underline
     */
    useMutableUnderline(): boolean {
        return this.get<boolean>('colors.mutableUnderline', false) || false;
    }

    /**
     * Check if auto-complete annotation is enabled
     */
    isCompleteAnnotationEnabled(): boolean {
        return this.get<boolean>('language.completeAnnotation', true) ?? true;
    }
}
