const fs = require("fs");
const path = require("path");

function re(input) {
    // See https://keleshev.com/verbose-regular-expressions-in-javascript
    if (input.raw.length !== 1) {
        throw Error("verboseRegExp: interpolation is not supported");
    }

    let source = input.raw[0];
    let regexp = /(?<!\\)\s|[/][/].*|[/][*][\s\S]*[*][/]/g;
    let result = source.replace(regexp, "");

    return new RegExp(result, "g");
}

const TO_TITLE_CASE_RE = re`
    // We will add a space (bear with me here):
    _                                 // 1. instead of underscore,
    | (                               // 2. OR in the following case:
      (?<!^)                          //   - not at the beginning of the string,
      (                               //   - AND EITHER:
          (?<=[A-Z])(?=[A-Z][a-z])    //     - before case gets lower (XMLTag -> XML-Tag),
        | (?<=[a-zA-Z])(?![a-zA-Z_])  //     - between a letter and a non-letter (HTTP20 -> HTTP-20),
        | (?<![A-Z_])(?=[A-Z])        //     - between non-uppercase and uppercase letter (TagXML -> Tag-XML),
      )                               //   - AND ALSO:
      (?!$)                           //     - not at the end of the string.
    )
`;

function toTitleCase(s) {
    const t = s.replace(TO_TITLE_CASE_RE, " ");
    return t.charAt(0).toUpperCase() + t.substr(1);
}

function main() {
    const schemaPath = path.join(__dirname, "..", "syntaxes", "schema.json");
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    const schema = JSON.parse(schemaContent);
    const definitions = schema.$defs || {};
    const properties = schema.properties;
    const settings = extractSettings(definitions, properties);

    const descriptions = {};
    const rendered = {};
    for (const [key, [path, value]] of Object.entries(settings)) {
        renderSetting(key, path, value, rendered, descriptions);
    }

    dumpPackageJson(rendered);
    dumpLocalesEn(descriptions);
    dumpLocalesZhCn(descriptions);
}

function extractSettings(
    definitions,
    obj,
    currentPath = ["emmylua"],
    result = {}
) {
    if (typeof obj !== "object") {
        return result;
    }

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value !== "object") {
            continue;
        }

        const nextPath = [...currentPath, key];

        if (value["x-vscode-setting"]) {
            result[nextPath.join(".")] = [nextPath, value];
        } else if (value.$ref) {
            const ref = /^#\/\$defs\/([a-zA-Z0-9_]+)$/.exec(value.$ref);
            if (!ref) {
                continue;
            }

            const definition = definitions[ref[1]];
            if (!definition || definition.type !== "object") {
                continue;
            }

            extractSettings(
                definitions,
                definition.properties,
                nextPath,
                result
            );
        }
    }

    return result;
}

function renderSetting(key, path, setting, result, descriptions) {
    let rendered = { ...(setting["x-vscode-setting"] ?? {}) };
    if (typeof setting["x-vscode-setting"] === "boolean") {
        let type = setting.type;
        if (typeof type === "object" && type.length <= 2) {
            for (let i = 0; i < type.length; i++) {
                if (type[i] === "null") {
                    continue;
                } else {
                    type = type[i];
                    break;
                }
            }
        }
        if (type === "number") {
            rendered.type = ["number", "null"];
            rendered.editPresentation = "singlelineText";
        } else if (type === "integer") {
            rendered.type = ["integer", "null"];
            rendered.editPresentation = "singlelineText";
        } else if (type === "string") {
            rendered.type = ["string", "null"];
            rendered.editPresentation = "singlelineText";
        } else if (type === "boolean") {
            rendered.type = ["boolean", "null"];
            rendered.enum = [null, true, false];
            rendered.enumItemLabels = ["Default", "On", "Off"];
            rendered.markdownEnumDescriptions = [
                "%config.common.enum.default.description%",
                "%config.common.enum.on.description%",
                "%config.common.enum.off.description%",
            ];
        } else {
            console.error(
                `Failed to process option ${key}: unknown option type ${setting.type}`
            );
            return null;
        }
        rendered.default = null;
    } else if (typeof setting["x-vscode-setting"] === "object") {
        rendered = setting["x-vscode-setting"];
    } else {
        console.error(`Invalid x-vscode-setting value in option ${key}`);
        return null;
    }

    if (!setting.description) {
        console.warn(`Found undocumented option: ${key}`);
    }

    const translationKey = `config.${key}.description`;
    rendered.markdownDescription = `%${translationKey}%`;
    descriptions[translationKey] = setting.description ?? key;

    const title = toTitleCase(path[1]);
    result[title] = result[title] ?? {};
    result[title][key] = rendered;
}

function dumpLocalesEn(descriptions) {
    const localePath = path.join(__dirname, "..", "package.nls.json");
    const localeContent = fs.readFileSync(localePath, "utf-8");
    const locale = JSON.parse(localeContent);

    for (const [key, value] of Object.entries(descriptions)) {
        if (locale[key] && locale[key] !== value) {
            console.warn(
                `Description for ${key} changed, translation update is required`
            );
        }
        locale[key] = value;
    }

    const newLocaleSorted = {};
    Object.keys(locale)
        .sort()
        .forEach((key) => {
            newLocaleSorted[key] = locale[key];
        });

    fs.writeFileSync(localePath, ensureNl(JSON.stringify(newLocaleSorted, null, 4)));
}

function dumpLocalesZhCn(descriptions) {
    const localePath = path.join(__dirname, "..", "package.nls.zh-cn.json");
    const localeContent = fs.readFileSync(localePath, "utf-8");
    const locale = JSON.parse(localeContent);

    for (const [key, value] of Object.entries(descriptions)) {
        if (!locale[key]) {
            console.warn(`Missing translation for ${key}`);
            locale[key] = value;
        }
    }

    const newLocaleSorted = {};
    Object.keys(locale)
        .sort()
        .forEach((key) => {
            newLocaleSorted[key] = locale[key];
        });

    fs.writeFileSync(localePath, ensureNl(JSON.stringify(newLocaleSorted, null, 4)));
}

function dumpPackageJson(rendered) {
    const packagePath = path.join(__dirname, "..", "package.json");
    const packageContent = fs.readFileSync(packagePath, "utf-8");
    const package = JSON.parse(packageContent);

    const configuration = package.contributes.configuration;

    const configurationByTitle = {};
    const configurationByTitleAlwaysLast = {};

    for (let i = 0; i < configuration.length; i++) {
        const title = configuration[i].title;
        // Ensure Misc, Language Server and Colors stay at the end of config.
        if (["Misc", "Language Server", "Colors"].includes(title)) {
            configurationByTitleAlwaysLast[title] = configuration[i].properties;
        } else {
            configurationByTitle[configuration[i].title] =
                configuration[i].properties;
        }
    }

    for (const [title, items] of Object.entries(rendered)) {
        // Ensure Misc, Language Server and Colors stay at the end of config.
        if (["Misc", "Language Server", "Colors"].includes(title)) {
            configurationByTitleAlwaysLast[title] = {
                ...(configurationByTitleAlwaysLast[title] ?? {}),
                ...items,
            };
        } else {
            configurationByTitle[title] = {
                ...(configurationByTitle[title] ?? {}),
                ...items,
            };
        }
    }

    const newConfiguration = [];
    let i = 0;
    for (const [title, items] of Object.entries({
        ...configurationByTitle,
        ...configurationByTitleAlwaysLast,
    })) {
        newConfiguration.push({
            title,
            order: i++,
            properties: items,
        });
    }

    package.contributes.configuration = newConfiguration;

    fs.writeFileSync(packagePath, ensureNl(JSON.stringify(package, null, 4)));
}

function ensureNl(s) {
    if (!s.endsWith("\n")) {
        s += "\n";
    }
    return s;
}

main();
