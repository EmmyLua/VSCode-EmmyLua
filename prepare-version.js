const fs = require("fs")

const version = process.env['APPVEYOR_BUILD_VERSION']

if (version) {
    var text = fs.readFileSync('package.json').toString();
    const reg = /\"version\":\s*\"(.+?)\",/;
    text = text.replace(reg, '"version": "3.3.3",');
    fs.writeFileSync('package.json', text);
}