import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 扩展的终端链接，包含额外数据
 */
class LuaTerminalLink extends vscode.TerminalLink {
    constructor(
        startIndex: number,
        length: number,
        tooltip: string | undefined,
        public readonly filePath: string,
        public readonly lineNumber?: number,
        public readonly originalMatch?: string
    ) {
        super(startIndex, length, tooltip);
    }
}

/**
 * Lua 终端链接提供器
 */
class LuaTerminalLinkProvider implements vscode.TerminalLinkProvider {
    /**
     * 匹配 Lua 文件路径的正则表达式
     * 匹配内容:
     * - 可选的任意前缀和 '→ ' (用于 busted 测试框架输出)
     * - 可选的 '...' 前缀. `error` 函数会截断路径为`...`
     * - 带反斜杠或正斜杠的路径段
     * - .lua 文件扩展名
     * - 可选的 :行号 后缀
     */
    // 支持: "Error → .../a.lua:3", ".../a.lua:3", "C:\path with space\a.lua:3", "src/a.lua:3"
    private readonly linkPattern =
        /(?:.*?→\s*)?(?:\.\.\.)?((?:[A-Za-z]:)?[^:\r\n]*?\.lua)(?::(\d+))?/g;

    /**
     * 为 Lua 错误信息提供终端链接
     */
    provideTerminalLinks(
        context: vscode.TerminalLinkContext,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<LuaTerminalLink[]> {
        const line = context.line;
        const links: LuaTerminalLink[] = [];

        // 重置正则表达式状态
        this.linkPattern.lastIndex = 0;

        let match: RegExpExecArray | null;
        while ((match = this.linkPattern.exec(line)) !== null) {
            const fullMatch = match[0];
            const filePath = match[1];
            const lineNumber = match[2] ? parseInt(match[2], 10) : undefined;

            // 创建带工具提示的链接
            const link = new LuaTerminalLink(
                match.index,
                fullMatch.length,
                undefined,
                filePath,
                lineNumber,
                fullMatch
            );

            links.push(link);
        }

        return links;
    }

    /**
     * 处理终端链接激活  
     */
    async handleTerminalLink(link: LuaTerminalLink): Promise<void> {
        const { filePath, lineNumber, originalMatch } = link;

        // 尝试解析文件路径
        const resolvedPath = await this.resolveFilePath(filePath, originalMatch || filePath);

        if (!resolvedPath) {
            vscode.window.showWarningMessage(
                `not found: ${filePath}`
            );
            return;
        }

        // 打开文件
        try {
            const uri = vscode.Uri.file(resolvedPath);
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document);

            // 如果指定了行号则跳转
            if (lineNumber !== undefined && lineNumber > 0) {
                const position = new vscode.Position(lineNumber - 1, 0);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(
                    new vscode.Range(position, position),
                    vscode.TextEditorRevealType.InCenter
                );
            }
        } catch (error) {
            vscode.window.showErrorMessage(
                `open file error: ${resolvedPath}`
            );
        }
    }

    /**
     * 将截断的文件路径解析为完整路径
     */
    private async resolveFilePath(
        filePath: string,
        originalMatch: string
    ): Promise<string | null> {
        const normalizedFilePath = path.normalize(filePath);
        const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
        const exists = async (p: string) => {
            try {
                await fs.promises.access(p, fs.constants.F_OK);
                return true;
            } catch {
                return false;
            }
        };

        // 1) 绝对路径直接返回
        if (path.isAbsolute(normalizedFilePath) && (await exists(normalizedFilePath))) {
            return normalizedFilePath;
        }

        // 2) 尝试工作区相对路径
        for (const folder of workspaceFolders) {
            const candidate = path.join(folder.uri.fsPath, normalizedFilePath);
            if (await exists(candidate)) {
                return candidate;
            }
        }

        // 3) 处理被 "..." 截断的路径，提取后缀再搜索
        const suffixMatch = originalMatch.match(/^\.\.\.(.+\.lua)/);
        const suffix = suffixMatch ? suffixMatch[1] : normalizedFilePath;

        // 基于文件名的快速搜索，再按后缀评分
        const fileName = path.basename(suffix);
        const files = await vscode.workspace.findFiles(`**/${fileName}`, '**/.git/**', 200);
        const normalizedSuffix = path.normalize(suffix);

        let best: { path: string; score: number; len: number } | null = null;

        const suffixScore = (candidate: string): number => {
            const a = candidate.split(path.sep).reverse();
            const b = normalizedSuffix.split(path.sep).reverse();
            let matched = 0;
            for (let i = 0; i < Math.min(a.length, b.length); i++) {
                if (a[i] === b[i]) {
                    matched += a[i].length + 1;
                } else {
                    break;
                }
            }
            return matched;
        };

        for (const file of files) {
            const candidate = path.normalize(file.fsPath);
            if (!candidate.endsWith(normalizedSuffix)) {
                continue;
            }
            const score = suffixScore(candidate);
            const len = candidate.length;

            if (!best || score > best.score || (score === best.score && len < best.len)) {
                best = { path: candidate, score, len };
            }
        }

        return best?.path ?? null;
    }
}


export function registerTerminalLinkProvider(context: vscode.ExtensionContext): void {
    const terminalLinkProvider = vscode.window.registerTerminalLinkProvider(
        new LuaTerminalLinkProvider()
    );

    context.subscriptions.push(terminalLinkProvider);
}
