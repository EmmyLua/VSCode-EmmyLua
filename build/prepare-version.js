const fs = require("fs")

if (process.env['CI']) {
    var version;
    if (process.env['TRAVIS']) {
        const tag = process.env['TRAVIS_TAG']
        version = tag
    }
    else if (process.env['APPVEYOR']) {
        const tag = process.env['APPVEYOR_REPO_TAG_NAME']
        version = tag || process.env['APPVEYOR_BUILD_VERSION']
    }

    if (version) {
        var text = fs.readFileSync('package.json').toString();
        const reg = /\"version\":\s*\"(.+?)\",/;
        text = text.replace(reg, `"version": "${version}",`);
        fs.writeFileSync('package.json', text);
    
        console.log(`set version to: ${version}`)
    }
}