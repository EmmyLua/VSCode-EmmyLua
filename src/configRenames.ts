import { WorkspaceConfiguration } from "vscode";

const RENAMES: Record<string, string> = {
    "emmylua.colors.mutableUnderline": "emmylua.colors.mutable_underline",
    "emmylua.ls.executablePath": "emmylua.misc.executablePath",
    "emmylua.ls.globalConfigPath": "emmylua.misc.globalConfigPath",
};

export function get<T>(
    config: WorkspaceConfiguration,
    name: string
): T | undefined {
    const oldName = RENAMES[name];
    if (
        oldName &&
        config.get(oldName) !== null
    ) {
        return config.get<T>(oldName);
    } else {
        return config.get<T>(name);
    }
}
