import { existsSync, mkdirSync } from "fs";
import decompress from "decompress";
import decompressTarGz from "decompress-targz";
import config from "./config.json" with { type: "json" };
import { downloadTo } from "./util.js";

const args = process.argv;

async function downloadDepends() {
    await Promise.all([
        downloadTo(
            `${config.emmyDebuggerUrl}/${config.emmyDebuggerVersion}/linux-x64.zip`,
            "temp/linux-x64.zip"
        ),
        downloadTo(
            `${config.emmyDebuggerUrl}/${config.emmyDebuggerVersion}/darwin-arm64.zip`,
            "temp/darwin-arm64.zip"
        ),
        downloadTo(
            `${config.emmyDebuggerUrl}/${config.emmyDebuggerVersion}/darwin-x64.zip`,
            "temp/darwin-x64.zip"
        ),
        downloadTo(
            `${config.emmyDebuggerUrl}/${config.emmyDebuggerVersion}/win32-x86.zip`,
            "temp/win32-x86.zip"
        ),
        downloadTo(
            `${config.emmyDebuggerUrl}/${config.emmyDebuggerVersion}/win32-x64.zip`,
            "temp/win32-x64.zip"
        ),
        downloadTo(
            `${config.newLanguageServerUrl}/${config.newLanguageServerVersion}/${args[2]}`,
            `temp/${args[2]}`
        ),
        downloadTo(`${newLanguageServerSchemaUrl}`, schemaPath),
    ]);
}

async function build() {
    if (!existsSync("temp")) {
        mkdirSync("temp");
    }

    await downloadDepends();

    // linux
    await decompress("temp/linux-x64.zip", "debugger/emmy/linux/");
    // mac
    await decompress("temp/darwin-x64.zip", "debugger/emmy/mac/x64/");
    await decompress("temp/darwin-arm64.zip", "debugger/emmy/mac/arm64/");
    // win
    await decompress("temp/win32-x86.zip", "debugger/emmy/windows/x86/");
    await decompress("temp/win32-x64.zip", "debugger/emmy/windows/x64/");

    // new ls
    if (args[2].endsWith(".tar.gz")) {
        await decompress(`temp/${args[2]}`, `server/`, {
            plugins: [decompressTarGz()],
        });
    } else if (args[2].endsWith(".zip")) {
        await decompress(`temp/${args[2]}`, `server/`);
    }
}

build().catch(console.error);
