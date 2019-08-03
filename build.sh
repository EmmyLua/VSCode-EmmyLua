mkdir -p temp

DOWNLOAD_URL="https://github.com/EmmyLua/EmmyLuaDebugger/releases/download"
EMMY_CORE_VERSION="1.0.1"
LS_DOWNLOAD_URL="https://github.com/EmmyLua/EmmyLua-LanguageServer/releases/download"
LS_VERSION="0.3.0"

function download() {
    echo "download emmy_core.so"
    wget "${DOWNLOAD_URL}/${EMMY_CORE_VERSION}/emmy_core.so" -O temp/emmy_core.so
    echo "download emmy_core@x86.zip"
    wget "${DOWNLOAD_URL}/${EMMY_CORE_VERSION}/emmy_core@x86.zip" -O temp/emmy_core@x86.zip
    echo "download emmy_core@x64.zip"
    wget "${DOWNLOAD_URL}/${EMMY_CORE_VERSION}/emmy_core@x64.zip" -O temp/emmy_core@x64.zip
    echo "download EmmyLua-LS-all.jar"
    wget "${LS_DOWNLOAD_URL}/${LS_VERSION}/EmmyLua-LS-all.jar" -O temp/EmmyLua-LS-all.jar
}

function extract() {
    mkdir -p debugger/emmy/unix
    cp temp/emmy_core.so debugger/emmy/unix/emmy_core.so

    unzip -o "temp/emmy_core@x86.zip" lib/emmy_core.dll -d temp/x86
    mkdir -p debugger/emmy/windows/x86
    cp temp/x86/lib/emmy_core.dll debugger/emmy/windows/x86/emmy_core.dll

    unzip -o "temp/emmy_core@x64.zip" lib/emmy_core.dll -d temp/x64
    mkdir -p debugger/emmy/windows/x64
    cp temp/x64/lib/emmy_core.dll debugger/emmy/windows/x64/emmy_core.dll

    mkdir server
    cp temp/EmmyLua-LS-all.jar server/EmmyLua-LS-all.jar
}

download
extract
vsce package