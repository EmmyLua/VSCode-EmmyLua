import * as vscode from 'vscode';

/**
 * Configuration key rename mappings
 * Maps new keys to old keys for backward compatibility
 */
const CONFIG_RENAMES: ReadonlyMap<string, string> = new Map([
    ['emmylua.ls.executablePath', 'emmylua.misc.executablePath'],
    ['emmylua.ls.globalConfigPath', 'emmylua.misc.globalConfigPath'],
    ['emmylua.language.completeAnnotation', 'emmylua.misc.autoInsertTripleDash'],
]);

/**
 * Track which deprecated configs have been warned about
 */
const warnedDeprecations = new Set<string>();

/**
 * Get configuration value with support for renamed keys
 * Automatically falls back to old configuration keys for backward compatibility
 * 
 * @param config - Workspace configuration
 * @param key - Configuration key to retrieve
 * @param defaultValue - Optional default value if config doesn't exist
 * @returns Configuration value or default
 */
export function get<T>(
    config: vscode.WorkspaceConfiguration,
    key: string,
    defaultValue?: T
): T | undefined {
    const oldKey = CONFIG_RENAMES.get(key);

    // Check if old config exists and has a non-null value
    if (oldKey && config.has(oldKey)) {
        const oldValue = config.get<T>(oldKey);
        if (oldValue !== undefined && oldValue !== null) {
            // Warn about deprecated config (only once per session)
            if (!warnedDeprecations.has(oldKey)) {
                warnedDeprecations.add(oldKey);
                showDeprecationWarning(oldKey, key);
            }
            return oldValue;
        }
    }

    // Get from new config key
    return config.get<T>(key, defaultValue as T);
}

/**
 * Show a deprecation warning for old configuration keys
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
 * Get configuration with proper typing and defaults
 */
export class ConfigurationManager {
    private readonly config: vscode.WorkspaceConfiguration;

    constructor(scope?: vscode.ConfigurationScope) {
        this.config = vscode.workspace.getConfiguration('emmylua', scope);
    }

    /**
     * Get a configuration value with type safety
     */
    get<T>(section: string, defaultValue?: T): T | undefined {
        return get<T>(this.config, `${section}`, defaultValue) || get<T>(this.config, `emmylua.${section}`, defaultValue);
    }

    /**
     * Get language server executable path
     */
    getExecutablePath(): string | undefined {
        return this.get<string>('misc.executablePath');
    }

    /**
     * Get language server global config path
     */
    getGlobalConfigPath(): string | undefined {
        return this.get<string>('misc.globalConfigPath');
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
