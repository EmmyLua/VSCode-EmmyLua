import * as vscode from "vscode";
import * as path from "path";
import { extensionContext } from "../extension";
import { EmmyNewDebuggerProvider } from "./new_debugger/EmmyNewDebuggerProvider";
import { EmmyAttachDebuggerProvider } from "./attach/EmmyAttachDebuggerProvider";
import { EmmyLaunchDebuggerProvider } from "./launch/EmmyLaunchDebuggerProvider";
import { InlineDebugAdapterFactory } from "./DebugFactory";


/**
 * Debugger configuration interface
 */
interface DebuggerConfig {
    readonly type: string;
    readonly provider: vscode.DebugConfigurationProvider;
}


export async function insertEmmyDebugCode() {
    const context = extensionContext.vscodeContext;
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    const document = activeEditor.document;
    if (document.languageId !== "lua") {
        return;
    }

    let dllPath = "";
    const isWindows = process.platform === "win32";
    const isMac = process.platform === "darwin";
    const isLinux = process.platform === "linux";
    if (isWindows) {
        const arch = await vscode.window.showQuickPick(["x64", "x86"]);
        if (!arch) {
            return;
        }
        dllPath = path.join(
            context.extensionPath,
            `debugger/emmy/windows/${arch}/?.dll`
        );
    } else if (isMac) {
        const arch = await vscode.window.showQuickPick(["x64", "arm64"]);
        if (!arch) {
            return;
        }
        dllPath = path.join(
            context.extensionPath,
            `debugger/emmy/mac/${arch}/emmy_core.dylib`
        );
    } else if (isLinux) {
        dllPath = path.join(
            context.extensionPath,
            `debugger/emmy/linux/emmy_core.so`
        );
    }

    const host = "localhost";
    const port = 9966;
    const ins = new vscode.SnippetString();
    ins.appendText(
        `package.cpath = package.cpath .. ";${dllPath.replace(/\\/g, "/")}"\n`
    );
    ins.appendText(`local dbg = require("emmy_core")\n`);
    ins.appendText(`dbg.tcpListen("${host}", ${port})`);
    activeEditor.insertSnippet(ins);
}

export function registerDebuggers(): void {
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