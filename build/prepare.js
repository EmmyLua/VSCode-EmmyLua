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
        downloadTo(`${config.emmyDebuggerUrl}/${config.emmyDebuggerVersion}/emmy_core.so`, 'temp/emmy_core.so'),
        downloadTo(`${config.emmyDebuggerUrl}/${config.emmyDebuggerVersion}/emmy_core.dylib`, 'temp/emmy_core.dylib'),
        downloadTo(`${config.emmyDebuggerUrl}/${config.emmyDebuggerVersion}/emmy_core@x86.zip`, 'temp/emmy_core@x86.zip'),
        downloadTo(`${config.emmyDebuggerUrl}/${config.emmyDebuggerVersion}/emmy_core@x64.zip`, 'temp/emmy_core@x64.zip'),
        downloadTo(`${config.lanServerUrl}/${config.lanServerVersion}/EmmyLua-LS-all.jar`, 'temp/EmmyLua-LS-all.jar'),
    ]);
}

async function build() {
    if (!fs.existsSync('temp')) {
        fs.mkdirSync('temp')
    }
    
    await downloadDepends();

    // mac
    await fc('temp/emmy_core.dylib', 'debugger/emmy/mac/emmy_core.dylib', { mkdirp: true });

    // linux
    await fc('temp/emmy_core.so', 'debugger/emmy/linux/emmy_core.so', { mkdirp: true });

    // win
    await decompress('temp/emmy_core@x86.zip', 'debugger/emmy/windows/x86/');
    await decompress('temp/emmy_core@x64.zip', 'debugger/emmy/windows/x64/');

    // ls
    await fc('temp/EmmyLua-LS-all.jar', 'server/EmmyLua-LS-all.jar', { mkdirp: true });
}

build().catch(console.error);