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
        const config = workspace.getConfiguration('emmylua');
        const autoInsertTripleDash = config.get<boolean>('autoInsertTripleDash', true);
        // 第二个参数是默认值（当配置不存在时使用）
        if (autoInsertTripleDash) {
            this.onEnterRules = [
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
        // 匹配需要在下一行增加缩进的模式，例如函数定义、局部函数定义和 do 语句
        indentNextLinePattern: /^\s*(local\s+\w+\s*=\s*function\s*\(.*\)\s*|function\s+\w*\s*\(.*\)\s*|.*\s*do\s*|.*\s*=\s*function\s*\(.*\)\s*)$/,

        // 匹配需要减少缩进的模式，例如 else、elseif 和 end 关键字
        decreaseIndentPattern: /^\s*(else|elseif|end|until)\b/,

        // 匹配需要增加缩进的模式，例如 function、if、else、elseif、for、while、repeat、until、do 和 then 关键字
        increaseIndentPattern: /^\s*(function|local\s+\w+\s*=\s*function|local\s+function|if|else|elseif|for|while|repeat|do|then|.*\s*=\s*function)\b/,

        // 匹配不应改变缩进的模式，例如单行注释和多行注释的结束
        unIndentedLinePattern: /^\s*(--.*|.*\*\/)$/
    };

    public wordPattern = /((?<=')[^']+(?='))|((?<=")[^"]+(?="))|(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g;
}