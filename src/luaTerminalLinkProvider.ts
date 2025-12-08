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
        public readonly columnNumber?: number,
        public readonly originalMatch?: string
    ) {
        super(startIndex, length, tooltip);
    }
}

/**
 * Lua 终端链接提供器
 * 支持多种常见的 Lua 错误输出格式，避免误匹配命令中的文件名
 */
class LuaTerminalLinkProvider implements vscode.TerminalLinkProvider {
    /**
     * 匹配模式定义
     * 每个模式包含：正则表达式、优先级、描述
     */
    private readonly patterns: Array<{
        regex: RegExp;
        priority: number;
        description: string;
    }> = [
        // 1. Lua 标准错误格式: lua: path/to/file.lua:123: error message
        {
            regex: /\blua:\s+([^\s:]+\.lua):(\d+):/g,
            priority: 100,
            description: 'Lua standard error'
        },
        
        // 2. 堆栈跟踪格式: \t at path/to/file.lua:123
        {
            regex: /\s+at\s+([^\s:]+\.lua):(\d+)/g,
            priority: 95,
            description: 'Stack trace with at'
        },
        
        // 3. 堆栈跟踪格式（带制表符）: \tpath/to/file.lua:123: in function 'name'
        {
            regex: /^\s+([^\s:]+\.lua):(\d+):\s+in\s+/gm,
            priority: 90,
            description: 'Stack trace in function'
        },
        
        // 4. 文件和行号（通用）: path/to/file.lua:123
        // 需要前面有空白、冒号、箭头或行首，避免误匹配命令参数
        {
            regex: /(?:^|[\s:→])((?:[A-Za-z]:)?(?:[\/\\][\w\s\-\.]+)+\.lua):(\d+)(?::(\d+))?/g,
            priority: 80,
            description: 'File path with line number'
        },
        
        // 5. 截断路径格式: .../file.lua:123
        {
            regex: /(?:^|[\s:→])(\.\.\.[\/\\][\w\s\-\.\/\\]+\.lua):(\d+)(?::(\d+))?/g,
            priority: 85,
            description: 'Truncated path'
        },
        
        // 6. 错误箭头格式: Error → path/to/file.lua:123
        {
            regex: /→\s+((?:[A-Za-z]:)?[\w\s\-\.\/\\]+\.lua):(\d+)(?::(\d+))?/g,
            priority: 90,
            description: 'Error with arrow'
        },
        
        // 7. 括号内的文件路径: (path/to/file.lua:123)
        {
            regex: /\(((?:[A-Za-z]:)?[\w\s\-\.\/\\]+\.lua):(\d+)(?::(\d+))?\)/g,
            priority: 75,
            description: 'File in parentheses'
        },
        
        // 8. 方括号内的文件路径: [path/to/file.lua:123]
        {
            regex: /\[((?:[A-Za-z]:)?[\w\s\-\.\/\\]+\.lua):(\d+)(?::(\d+))?\]/g,
            priority: 75,
            description: 'File in brackets'
        }
    ];

    /**
     * 为 Lua 错误信息提供终端链接
     */
    provideTerminalLinks(
        context: vscode.TerminalLinkContext,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<LuaTerminalLink[]> {
        const line = context.line;
        const allMatches: Array<{
            link: LuaTerminalLink;
            priority: number;
        }> = [];

        // 尝试所有模式
        for (const pattern of this.patterns) {
            pattern.regex.lastIndex = 0;
            
            let match: RegExpExecArray | null;
            while ((match = pattern.regex.exec(line)) !== null) {
                const fullMatch = match[0];
                const filePath = match[1];
                const lineNumber = match[2] ? parseInt(match[2], 10) : undefined;
                const columnNumber = match[3] ? parseInt(match[3], 10) : undefined;

                // 验证文件路径的合理性
                if (!this.isValidLuaPath(filePath, line, match.index)) {
                    continue;
                }

                // 创建链接
                const tooltip = this.createTooltip(filePath, lineNumber, columnNumber);
                const link = new LuaTerminalLink(
                    match.index,
                    fullMatch.length,
                    tooltip,
                    filePath,
                    lineNumber,
                    columnNumber,
                    fullMatch
                );

                allMatches.push({
                    link,
                    priority: pattern.priority
                });
            }
        }

        if (allMatches.length === 0) {
            return [];
        }

        // 去重和优先级排序
        return this.deduplicateAndPrioritize(allMatches);
    }

    /**
     * 验证文件路径是否合理
     * 避免误匹配命令参数（如 echo "test.lua"）
     */
    private isValidLuaPath(filePath: string, line: string, matchIndex: number): boolean {
        // 1. 检查前面是否是引号（避免匹配字符串字面量）
        if (matchIndex > 0) {
            const charBefore = line[matchIndex - 1];
            if (charBefore === '"' || charBefore === "'") {
                // 检查后面是否也有引号（完整的字符串字面量）
                const matchEnd = matchIndex + filePath.length;
                if (matchEnd < line.length) {
                    const charAfter = line[matchEnd];
                    if (charAfter === charBefore) {
                        return false; // 这是一个完整的字符串字面量
                    }
                }
            }
        }

        // 2. 检查是否在命令参数中（简单启发式）
        const beforeMatch = line.substring(0, matchIndex);
        const shellCommands = ['echo', 'cat', 'type', 'more', 'less', 'tail', 'head'];
        
        for (const cmd of shellCommands) {
            // 检查前面是否有这些命令
            const cmdPattern = new RegExp(`\\b${cmd}\\s+[^\\n]*$`, 'i');
            if (cmdPattern.test(beforeMatch)) {
                return false;
            }
        }

        // 3. 路径必须看起来合理
        // - 包含路径分隔符，或
        // - 以 ... 开头（截断路径），或
        // - 是绝对路径（Windows 盘符或 Unix 根路径）
        const hasPathSeparator = filePath.includes('/') || filePath.includes('\\');
        const isTruncated = filePath.startsWith('...');
        const isAbsolute = /^[A-Za-z]:/.test(filePath) || filePath.startsWith('/');
        
        if (!hasPathSeparator && !isTruncated && !isAbsolute) {
            // 单个文件名（如 "test.lua"）通常不是有效的错误路径
            // 除非它在特定的上下文中（如堆栈跟踪）
            return false;
        }

        return true;
    }

    /**
     * 创建工具提示文本
     */
    private createTooltip(
        filePath: string,
        lineNumber?: number,
        columnNumber?: number
    ): string {
        let tooltip = `Open: ${filePath}`;
        
        if (lineNumber !== undefined) {
            tooltip += `:${lineNumber}`;
            
            if (columnNumber !== undefined) {
                tooltip += `:${columnNumber}`;
            }
        }
        
        return tooltip;
    }

    /**
     * 去重并按优先级排序链接
     * 处理重叠的匹配
     */
    private deduplicateAndPrioritize(
        matches: Array<{ link: LuaTerminalLink; priority: number }>
    ): LuaTerminalLink[] {
        // 按起始位置和优先级排序
        matches.sort((a, b) => {
            const startDiff = a.link.startIndex - b.link.startIndex;
            if (startDiff !== 0) {
                return startDiff;
            }
            // 相同起始位置，优先级高的在前
            return b.priority - a.priority;
        });

        const result: LuaTerminalLink[] = [];
        let lastEnd = -1;

        for (const { link } of matches) {
            const start = link.startIndex;
            const end = start + link.length;

            // 如果与前一个链接不重叠，添加
            if (start >= lastEnd) {
                result.push(link);
                lastEnd = end;
            }
            // 如果重叠，跳过（因为已经按优先级排序，前面的更优）
        }

        return result;
    }

    /**
     * 处理终端链接激活  
     */
    async handleTerminalLink(link: LuaTerminalLink): Promise<void> {
        const { filePath, lineNumber, columnNumber, originalMatch } = link;

        // 尝试解析文件路径
        const resolvedPath = await this.resolveFilePath(filePath, originalMatch || filePath);

        if (!resolvedPath) {
            vscode.window.showWarningMessage(
                `File not found: ${filePath}`
            );
            return;
        }

        // 打开文件
        try {
            const uri = vscode.Uri.file(resolvedPath);
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document, {
                preview: false,
                preserveFocus: false
            });

            // 跳转到指定位置
            if (lineNumber !== undefined && lineNumber > 0) {
                const line = Math.min(lineNumber - 1, document.lineCount - 1);
                const column = columnNumber !== undefined && columnNumber > 0 
                    ? columnNumber - 1 
                    : 0;
                
                const position = new vscode.Position(line, column);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(
                    new vscode.Range(position, position),
                    vscode.TextEditorRevealType.InCenter
                );
            }
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to open file: ${resolvedPath}`
            );
        }
    }

    /**
     * 将文件路径解析为完整的绝对路径
     */
    private async resolveFilePath(
        filePath: string,
        originalMatch: string
    ): Promise<string | null> {
        const normalizedFilePath = path.normalize(filePath);
        const workspaceFolders = vscode.workspace.workspaceFolders ?? [];

        // 快速检查文件是否存在
        const exists = async (p: string): Promise<boolean> => {
            try {
                const stat = await fs.promises.stat(p);
                return stat.isFile();
            } catch {
                return false;
            }
        };

        // 1. 绝对路径 - 直接验证
        if (path.isAbsolute(normalizedFilePath)) {
            if (await exists(normalizedFilePath)) {
                return normalizedFilePath;
            }
            return null;
        }

        // 2. 相对于工作区根目录的路径
        for (const folder of workspaceFolders) {
            const candidate = path.join(folder.uri.fsPath, normalizedFilePath);
            if (await exists(candidate)) {
                return candidate;
            }
        }

        // 3. 处理截断路径（.../path/to/file.lua）
        if (originalMatch.startsWith('...')) {
            const truncatedPath = normalizedFilePath.replace(/^\.\.\.[\\/]?/, '');
            return await this.findTruncatedPath(truncatedPath);
        }

        // 4. 作为相对路径在工作区中搜索
        return await this.searchInWorkspace(normalizedFilePath);
    }

    /**
     * 查找被截断的路径
     */
    private async findTruncatedPath(truncatedPath: string): Promise<string | null> {
        const fileName = path.basename(truncatedPath);
        const normalizedTruncated = path.normalize(truncatedPath);
        
        // 搜索文件名匹配的文件
        const files = await vscode.workspace.findFiles(
            `**/${fileName}`,
            '**/node_modules/**',
            100
        );

        // 按路径后缀匹配度评分
        let bestMatch: { path: string; score: number } | null = null;

        for (const file of files) {
            const filePath = path.normalize(file.fsPath);
            
            // 检查是否以截断路径结尾
            if (filePath.endsWith(normalizedTruncated)) {
                const score = this.calculatePathMatchScore(filePath, normalizedTruncated);
                
                if (!bestMatch || score > bestMatch.score) {
                    bestMatch = { path: filePath, score };
                }
            }
        }

        return bestMatch?.path ?? null;
    }

    /**
     * 在工作区中搜索文件
     */
    private async searchInWorkspace(relativePath: string): Promise<string | null> {
        const fileName = path.basename(relativePath);
        const normalizedPath = path.normalize(relativePath);
        
        // 搜索所有匹配的文件
        const files = await vscode.workspace.findFiles(
            `**/${fileName}`,
            '**/node_modules/**',
            50
        );

        if (files.length === 0) {
            return null;
        }

        // 如果只有一个匹配，直接返回
        if (files.length === 1) {
            return files[0].fsPath;
        }

        // 多个匹配时，选择最佳匹配
        let bestMatch: { path: string; score: number } | null = null;

        for (const file of files) {
            const filePath = path.normalize(file.fsPath);
            
            // 计算路径相似度
            if (filePath.endsWith(normalizedPath)) {
                const score = this.calculatePathMatchScore(filePath, normalizedPath);
                
                if (!bestMatch || score > bestMatch.score) {
                    bestMatch = { path: filePath, score };
                }
            }
        }

        // 如果没有精确匹配，返回第一个
        return bestMatch?.path ?? files[0].fsPath;
    }

    /**
     * 计算路径匹配分数（从后往前匹配）
     */
    private calculatePathMatchScore(fullPath: string, targetPath: string): number {
        const fullParts = fullPath.split(path.sep).reverse();
        const targetParts = targetPath.split(path.sep).reverse();
        
        let score = 0;
        const minLen = Math.min(fullParts.length, targetParts.length);
        
        for (let i = 0; i < minLen; i++) {
            if (fullParts[i] === targetParts[i]) {
                // 匹配的部分，权重随深度递增
                score += (i + 1) * 10;
            } else {
                break;
            }
        }
        
        return score;
    }
}

export function registerTerminalLinkProvider(context: vscode.ExtensionContext): void {
    const terminalLinkProvider = vscode.window.registerTerminalLinkProvider(
        new LuaTerminalLinkProvider()
    );

    context.subscriptions.push(terminalLinkProvider);
}
