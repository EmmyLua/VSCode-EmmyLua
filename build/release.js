import { exit } from "process";
import config from "./config.json" with { type: "json" };
import {
    downloadTo,
    writeConfig,
    readPackage,
    writePackage,
    schemaPath,
} from "./util.js";
import { main as syncSettings } from "./settings.js";
import { main as syncSchemaI18n } from "./schema-i18n.js";

const args = process.argv;

async function main() {
    const version = args[2];
    if (!version) {
        console.error(
            "Usage: npm run release -- <version> [<language-server-version>]"
        );
        exit(1);
    }
    if (!/\d+\.\d+\.\d+/.test(version)) {
        console.error(
            `Incorrect version: expected format '1.2.3', got ${version}`
        );
        exit(1);
    }

    let languageServerVersion = args[3];
    if (!languageServerVersion) {
        languageServerVersion = config.newLanguageServerVersion;
    }
    if (!/\d+\.\d+\.\d+/.test(languageServerVersion)) {
        console.error(
            "Incorrect language-server-version: expected format '1.2.3'"
        );
        exit(1);
    }

    {
        console.log("Updating 'build/config.json'...");
        config.newLanguageServerVersion = languageServerVersion;
        writeConfig(config);
    }

    {
        console.log("Updating 'package.json'...");
        const packageJson = readPackage();
        packageJson["version"] = version;
        writePackage(packageJson);
    }

    const newLanguageServerSchemaUrl =
        config.newLanguageServerSchemaUrl.replace(
            /\{\{\s*tag\s*\}\}/g,
            config.newLanguageServerVersion
        );
    console.log("Downloading new schema to 'syntaxes/schema.json'...");
    await downloadTo(newLanguageServerSchemaUrl, schemaPath);

    console.log("Processing new schema...");
    syncSettings();
    syncSchemaI18n();

    console.log(`✅ release ${version} successfully prepared`);
}

await main();
