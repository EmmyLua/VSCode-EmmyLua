import { LanguageConfiguration, IndentAction, IndentationRule } from "vscode";
import { workspace } from "vscode";
export class LuaLanguageConfiguration implements LanguageConfiguration {
    public onEnterRules: any[];

    constructor() {
        this.onEnterRules = [
            {
                // 匹配 function 语句的行
                beforeText: /^\s*function\s+\w*\s*\(.*\)\s*$/,
                afterText: /^\s*end\s*$/,
                action: { indentAction: IndentAction.IndentOutdent, appendText: "\t" }
            },
            {
                // 匹配局部函数定义的行
                beforeText: /^\s*local\s+\w+\s*=\s*function\s*\(.*\)\s*$/,
                afterText: /^\s*end\s*$/,
                action: { indentAction: IndentAction.IndentOutdent, appendText: "\t" }
            },
            {
                // 匹配 xxx = function 语句的行
                beforeText: /^\s*.*\s*=\s*function\s*\(.*\)\s*$/,
                afterText: /^\s*end\s*$/,
                action: { indentAction: IndentAction.IndentOutdent, appendText: "\t" }
            },
            {
                // 匹配 local function 语句的行
                beforeText: /^\s*local\s+function\s+\w*\s*\(.*\)\s*$/,
                afterText: /^\s*end\s*$/,
                action: { indentAction: IndentAction.IndentOutdent, appendText: "\t" }
            }
        ];

        // 读取配置决定是否添加三横线规则
        const config = workspace.getConfiguration(
            undefined,
            workspace.workspaceFolders?.[0]
        );
        const autoInsertTripleDash = config.get<boolean>('emmylua.misc.autoInsertTripleDash', true);
        // 第二个参数是默认值（当配置不存在时使用）
        if (autoInsertTripleDash) {
            this.onEnterRules = [
                {
                    action: { indentAction: IndentAction.None, appendText: "--- " },
                    beforeText: /^--- /,
                },
                {
                    action: { indentAction: IndentAction.None, appendText: "---" },
                    beforeText: /^---/,
                },
                ...this.onEnterRules
            ];
        } else {
            this.onEnterRules = [
                ...this.onEnterRules
            ];
        }
    }

    public indentationRules: IndentationRule = {
        // 匹配需要在下一行增加缩进的模式，排除单行结构（如 function() end）
        indentNextLinePattern: /^\s*(local\s+\w+\s*=\s*function\s*\(.*\)\s*$|function\s+\w*\s*\(.*\)\s*$|.*\s*do\s*$|.*\s*=\s*function\s*\(.*\)\s*$)/,

        // 匹配需要减少缩进的模式，例如 else、elseif 和 end 关键字
        decreaseIndentPattern: /^\s*(else|elseif|end|until)\b/,

        // 匹配需要增加缩进的模式，但排除单行结构（如 function() end, if then else end）
        increaseIndentPattern: /^\s*((function\s+\w*\s*\(.*\)\s*$)|(local\s+function\s+\w*\s*\(.*\)\s*$)|(local\s+\w+\s*=\s*function\s*\(.*\)\s*$)|(.*\s*=\s*function\s*\(.*\)\s*$)|(if\s+.*\s+then\s*$)|(elseif\s+.*\s+then\s*$)|(else\s*$)|(for\s+.*\s+do\s*$)|(while\s+.*\s+do\s*$)|(repeat\s*$)|(do\s*$))/,

        // 匹配不应改变缩进的模式，例如单行注释和多行注释的结束
        unIndentedLinePattern: /^\s*(--.*|.*\*\/)$/
    };

    public wordPattern = /((?<=')[^']+(?='))|((?<=")[^"]+(?="))|(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g;
}
