const fs = require("fs")

const version = process.env['APPVEYOR_BUILD_VERSION']

if (version) {
    var text = fs.readFileSync('package.json').toString();
    const reg = /\"version\":\s*\"(.+?)\",/;
    text = text.replace(reg, `"version": "${version}",`);
    fs.writeFileSync('package.json', text);

    console.log(`set version to: ${version}`)
}