import * as vscode from 'vscode';


/**
 * 获取配置值, 且支持重命名的键名.
 * 
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
    return config.get<T>(key, defaultValue as T);
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
