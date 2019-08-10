EMMY_DEBUGGER_DOWNLOAD_URL="https://github.com/EmmyLua/EmmyLuaDebugger/releases/download"
EMMY_DEBUGGER_VERSION="1.0.5"
LS_DOWNLOAD_URL="https://github.com/EmmyLua/EmmyLua-LanguageServer/releases/download"
LS_VERSION="0.3.0"
LEGACY_DEBUGGER_DOWNLOAD_URL="https://github.com/EmmyLua/EmmyLuaLegacyDebugger/releases/download"
LEGACY_DEBUGGER_VERSION="1.0.0"

function download() {
    echo "download emmy_core.dylib"
    wget "${EMMY_DEBUGGER_DOWNLOAD_URL}/${EMMY_DEBUGGER_VERSION}/emmy_core.dylib" -O temp/emmy_core.dylib
    echo "download emmy_core.so"
    wget "${EMMY_DEBUGGER_DOWNLOAD_URL}/${EMMY_DEBUGGER_VERSION}/emmy_core.so" -O temp/emmy_core.so
    echo "download emmy_core@x86.zip"
    wget "${EMMY_DEBUGGER_DOWNLOAD_URL}/${EMMY_DEBUGGER_VERSION}/emmy_core@x86.zip" -O temp/emmy_core@x86.zip
    echo "download emmy_core@x64.zip"
    wget "${EMMY_DEBUGGER_DOWNLOAD_URL}/${EMMY_DEBUGGER_VERSION}/emmy_core@x64.zip" -O temp/emmy_core@x64.zip
    echo "download EmmyLua-LS-all.jar"
    wget "${LS_DOWNLOAD_URL}/${LS_VERSION}/EmmyLua-LS-all.jar" -O temp/EmmyLua-LS-all.jar
    echo "download legacy debugger"
    wget "${LEGACY_DEBUGGER_DOWNLOAD_URL}/${LEGACY_DEBUGGER_VERSION}/debugger.zip" -O temp/legacyDebugger.zip
}

function extract() {
    # new debugger mac
    mkdir -p debugger/emmy/mac
    cp temp/emmy_core.dylib debugger/emmy/mac/emmy_core.dylib

    # new debugger linux
    mkdir -p debugger/emmy/linux
    cp temp/emmy_core.so debugger/emmy/linux/emmy_core.so

    # new debugger win x86
    unzip -o "temp/emmy_core@x86.zip" emmy_core.dll -d temp/x86
    mkdir -p debugger/emmy/windows/x86
    cp temp/x86/emmy_core.dll debugger/emmy/windows/x86/emmy_core.dll

    # new debugger win x64
    unzip -o "temp/emmy_core@x64.zip" emmy_core.dll -d temp/x64
    mkdir -p debugger/emmy/windows/x64
    cp temp/x64/emmy_core.dll debugger/emmy/windows/x64/emmy_core.dll

    # language server
    mkdir server
    cp temp/EmmyLua-LS-all.jar server/EmmyLua-LS-all.jar

    # legacy debugger
    unzip -o "temp/legacyDebugger.zip" -d debugger/windows
}

mkdir -p temp
download
extract
vsce package