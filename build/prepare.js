const fs = require('fs');
const download = require('download');
const decompress = require('decompress')
const fc = require('filecopy');
const config = require('./config').default;

async function downloadTo(url, path) {
    return new Promise((r, e) => {
        const d = download(url);
        d.then(r).catch(err => e(err));
        d.pipe(fs.createWriteStream(path));
    });
}

async function downloadDepends() {
    await Promise.all([        
        downloadTo(`${config.emmyDebuggerUrl}/${config.emmyDebuggerVersion}/linux-x64.zip`, 'temp/linux-x64.zip'),
        downloadTo(`${config.emmyDebuggerUrl}/${config.emmyDebuggerVersion}/darwin-arm64.zip`, 'temp/darwin-arm64.zip'),
        downloadTo(`${config.emmyDebuggerUrl}/${config.emmyDebuggerVersion}/darwin-x64.zip`, 'temp/darwin-x64.zip'),
        downloadTo(`${config.emmyDebuggerUrl}/${config.emmyDebuggerVersion}/win32-x86.zip`, 'temp/win32-x86.zip'),
        downloadTo(`${config.emmyDebuggerUrl}/${config.emmyDebuggerVersion}/win32-x64.zip`, 'temp/win32-x64.zip'),
        downloadTo(`${config.lanServerUrl}/${config.lanServerVersion}/EmmyLua-LS-all.jar`, 'temp/EmmyLua-LS-all.jar'),
        downloadTo(`${config.newLanguageServerUrl}/${config.newLanguageServerVersion}/linux-x64.zip`, 'temp/server-linux-x64.zip'),
        downloadTo(`${config.newLanguageServerUrl}/${config.newLanguageServerVersion}/darwin-arm64.zip`, 'temp/server-darwin-arm64.zip'),
        downloadTo(`${config.newLanguageServerUrl}/${config.newLanguageServerVersion}/darwin-x64.zip`, 'temp/server-darwin-x64.zip'),
        downloadTo(`${config.newLanguageServerUrl}/${config.newLanguageServerVersion}/win32-x86.zip`, 'temp/server-win32-x86.zip'),
    ]);
}

async function build() {
    if (!fs.existsSync('temp')) {
        fs.mkdirSync('temp')
    }
    
    await downloadDepends();

    // linux
    await decompress('temp/linux-x64.zip', 'debugger/emmy/linux/');
    // mac
    await decompress('temp/darwin-x64.zip', 'debugger/emmy/mac/x64/');
    await decompress('temp/darwin-arm64.zip', 'debugger/emmy/mac/arm64/');
    // win
    await decompress('temp/win32-x86.zip', 'debugger/emmy/windows/x86/');
    await decompress('temp/win32-x64.zip', 'debugger/emmy/windows/x64/');

    // ls
    await fc('temp/EmmyLua-LS-all.jar', 'server/EmmyLua-LS-all.jar', { mkdirp: true });
    // new ls
    await decompress('temp/server-linux-x64.zip', 'server/');
    await decompress('temp/server-darwin-x64.zip', 'server/');
    await decompress('temp/server-darwin-arm64.zip', 'server/');
    await decompress('temp/server-win32-x86.zip', 'server/');
}

build().catch(console.error);
