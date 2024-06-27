const fs = require('fs');
const download = require('download');
const decompress = require('decompress')
const fc = require('filecopy');
const config = require('./config').default;
const args = process.argv;

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
        downloadTo(`${config.newLanguageServerUrl}/${config.newLanguageServerVersion}/${args[2]}.zip`, 'temp/server.zip')
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

    // new ls
    await decompress('temp/server.zip', 'server/');
}

build().catch(console.error);
