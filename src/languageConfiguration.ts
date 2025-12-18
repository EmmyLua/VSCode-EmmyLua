import { LanguageConfiguration, IndentAction, IndentationRule, OnEnterRule } from 'vscode';
import { ConfigurationManager } from './configManager';

/**
 * Lua language configuration for VS Code
 * Provides indentation rules, on-enter rules, and word patterns for Lua
 */
export class LuaLanguageConfiguration implements LanguageConfiguration {
    public readonly onEnterRules: OnEnterRule[];
    public readonly indentationRules: IndentationRule;
    public readonly wordPattern: RegExp;

    constructor() {
        // Configure annotation completion rules based on user settings
        const configManager = new ConfigurationManager();
        const completeAnnotation = configManager.isCompleteAnnotationEnabled();

        this.onEnterRules = this.buildOnEnterRules(completeAnnotation);
        this.indentationRules = this.buildIndentationRules();
        this.wordPattern = this.buildWordPattern();
    }

    /**
     * Build on-enter rules for auto-indentation and annotation completion
     */
    private buildOnEnterRules(enableAnnotationCompletion: boolean): OnEnterRule[] {
        const baseRules: OnEnterRule[] = [
            // Function with end block
            {
                beforeText: /^\s*function\s+\w*\s*\(.*\)\s*$/,
                afterText: /^\s*end\s*$/,
                action: {
                    indentAction: IndentAction.IndentOutdent,
                    appendText: '\t'
                }
            },
            // Local function assignment with end block
            {
                beforeText: /^\s*local\s+\w+\s*=\s*function\s*\(.*\)\s*$/,
                afterText: /^\s*end\s*$/,
                action: {
                    indentAction: IndentAction.IndentOutdent,
                    appendText: '\t'
                }
            },
            // Anonymous function assignment with end block
            {
                beforeText: /^\s*.*\s*=\s*function\s*\(.*\)\s*$/,
                afterText: /^\s*end\s*$/,
                action: {
                    indentAction: IndentAction.IndentOutdent,
                    appendText: '\t'
                }
            },
            // Local function declaration with end block
            {
                beforeText: /^\s*local\s+function\s+\w*\s*\(.*\)\s*$/,
                afterText: /^\s*end\s*$/,
                action: {
                    indentAction: IndentAction.IndentOutdent,
                    appendText: '\t'
                }
            }
        ];

        if (enableAnnotationCompletion) {
            const annotationRules: OnEnterRule[] = [
                // 当前行以`--- `开头时, 自动补全`--- `
                {
                    beforeText: /^---\s+/,
                    action: {
                        indentAction: IndentAction.None,
                        appendText: '--- '
                    }
                },
                // 当前行以`---`开头时且后面没有任何内容时, 自动补全`---`
                {
                    beforeText: /^---$/,
                    action: {
                        indentAction: IndentAction.None,
                        appendText: '---'
                    }
                },
                // 当前行以`-- `开头时, 自动补全`-- `
                {
                    beforeText: /^--\s+/,
                    action: {
                        indentAction: IndentAction.None,
                        appendText: '-- '
                    }
                },
                // 当前行以一些注解标识符开头时, 自动补全`---@`
                {
                    beforeText: /^---@(class|field|param|generic|overload)\b.*/,
                    action: {
                        indentAction: IndentAction.None,
                        appendText: '---@'
                    }
                },
                // 对`---@alias`多行格式的处理, 我们认为以`---|`开头的行都是`---@alias`的续行
                {
                    beforeText: /^---\|.*/,
                    action: {
                        indentAction: IndentAction.None,
                        appendText: '---| '
                    }
                },
            ];

            return [...annotationRules, ...baseRules];
        }

        return baseRules;
    }

    /**
     * Build indentation rules for Lua syntax
     */
    private buildIndentationRules(): IndentationRule {
        return {
            // Increase indent after these patterns (excluding single-line constructs)
            increaseIndentPattern: /^\s*((function\s+\w*\s*\(.*\)\s*$)|(local\s+function\s+\w*\s*\(.*\)\s*$)|(local\s+\w+\s*=\s*function\s*\(.*\)\s*$)|(.*\s*=\s*function\s*\(.*\)\s*$)|(if\s+.*\s+then\s*$)|(elseif\s+.*\s+then\s*$)|(else\s*$)|(for\s+.*\s+do\s*$)|(while\s+.*\s+do\s*$)|(repeat\s*$)|(do\s*$))/,

            // Decrease indent for these patterns
            decreaseIndentPattern: /^\s*(else|elseif|end|until)\b/,

            // Indent next line after these patterns
            indentNextLinePattern: /^\s*(local\s+\w+\s*=\s*function\s*\(.*\)\s*$|function\s+\w*\s*\(.*\)\s*$|.*\s*do\s*$|.*\s*=\s*function\s*\(.*\)\s*$)/,

            // Don't change indent for these lines (comments)
            unIndentedLinePattern: /^\s*(--.*|.*\*\/)$/
        };
    }

    /**
     * Build word pattern for Lua
     * Matches strings, numbers, and identifiers
     */
    private buildWordPattern(): RegExp {
        return /((?<=')[^']+(?='))|((?<=")[^"]+(?="))|(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\-\s]+)/g;
    }
}
