const fs = require('fs');
const path = require('path');
const download = require('download');

async function downloadFile(url, dist, opt) {
    console.log(`download > ${url}`);
    return new Promise((r, c) => {
        download(url, dist, opt).then(r).catch(c);
    });
}

async function copy(src, dst) {
    console.log(`copy [${src}] to [${dst}]`);
    const p = path.parse(dst);
    fs.mkdirSync(p.dir);
    return new Promise((r, c) => {
        fs.createReadStream(src)
        .pipe(fs.createWriteStream(dst))
        .on('close', r)
        .on('error', c);
    });
}

async function build() {
    const dist64 = 'temp/x64'
    await downloadFile('https://ci.appveyor.com/api/buildjobs/nnroorfk855tx8f3/artifacts/x64/emmy_core@x64.zip', dist64, { extract: true });
    await copy(`${dist64}/lib/emmy_core.dll`, 'debugger/emmy/windows/x64/emmy_core.dll')

    const dist86 = 'temp/x86'
    await downloadFile('https://ci.appveyor.com/api/buildjobs/nnroorfk855tx8f3/artifacts/x86/emmy_core@x86.zip', dist86, { extract: true });
    await copy(`${dist86}/lib/emmy_core.dll`, 'debugger/emmy/windows/x86/emmy_core.dll')
}

build();