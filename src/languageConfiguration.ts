import { LanguageConfiguration, IndentAction } from "vscode";

export class LuaLanguageConfiguration implements LanguageConfiguration {
    public onEnterRules = [
        {
			action: { indentAction: IndentAction.None, appendText: "---" },
			beforeText: /^---/,
        }
    ];

    public wordPattern = /((?<=')[^']+(?='))|((?<=")[^"]+(?="))|(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g;
}