import { LanguageConfiguration, IndentAction, IndentationRule, OnEnterRule } from 'vscode';
import { ConfigurationManager } from './configRenames';

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

        // Add annotation completion rules if enabled
        if (enableAnnotationCompletion) {
            const annotationRules: OnEnterRule[] = [
                // Continue annotation with space (---)
                {
                    beforeText: /^---\s+/,
                    action: { 
                        indentAction: IndentAction.None,
                        appendText: '--- '
                    }
                },
                // Continue annotation without space (---)
                {
                    beforeText: /^---$/,
                    action: { 
                        indentAction: IndentAction.None,
                        appendText: '---'
                    }
                }
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
        return /((?<=')[^']+(?='))|((?<=")[^"]+(?="))|(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g;
    }
}
