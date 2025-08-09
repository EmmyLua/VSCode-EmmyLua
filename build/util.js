import { join } from "path";
import { readFileSync, writeFileSync, createWriteStream } from "fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import download from "download";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function downloadTo(url, path) {
    return new Promise((r, e) => {
        const d = download(url);
        d.then(r).catch((err) => e(err));
        d.pipe(createWriteStream(path));
    });
}

export function ensureNl(s) {
    if (!s.endsWith("\n")) {
        s += "\n";
    }
    return s;
}

export function readJson(path) {
    return JSON.parse(readFileSync(path));
}

export function writeJson(path, data) {
    writeFileSync(path, ensureNl(JSON.stringify(data, null, 4)));
}

export const schemaPath = join(__dirname, "..", "syntaxes", "schema.json");
export const readSchema = () => readJson(schemaPath);
export const writeSchema = (data) => writeJson(schemaPath, data);

export const schemaPathZhCn = join(
    __dirname,
    "..",
    "syntaxes",
    "schema.zh-cn.json"
);
export const readSchemaZhCn = () => readJson(schemaPathZhCn);
export const writeSchemaZhCn = (data) => writeJson(schemaPathZhCn, data);

export const schemaPathI18n = join(
    __dirname,
    "..",
    "syntaxes",
    "schema.i18n.json"
);
export const readSchemaI18n = () => readJson(schemaPathI18n);
export const writeSchemaI18n = (data) => writeJson(schemaPathI18n, data);

export const localePathDefault = join(__dirname, "..", "package.nls.json");
export const readLocaleDefault = () => readJson(localePathDefault);
export const writeLocaleDefault = (data) => writeJson(localePathDefault, data);

export const localePathZhCn = join(__dirname, "..", "package.nls.zh-cn.json");
export const readLocaleZhCn = () => readJson(localePathZhCn);
export const writeLocaleZhCn = (data) => writeJson(localePathZhCn, data);

export const packagePath = join(__dirname, "..", "package.json");
export const readPackage = () => readJson(packagePath);
export const writePackage = (data) => writeJson(packagePath, data);

export const configPath = join(__dirname, "config.json");
export const readConfig = () => readJson(configPath);
export const writeConfig = (data) => writeJson(configPath, data);
