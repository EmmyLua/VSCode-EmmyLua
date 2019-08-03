mkdir -p temp

DOWNLOAD_URL="https://github.com/EmmyLua/EmmyLuaDebugger/releases/download"
EMMY_CORE_VERSION="1.0.1"

function download() {
    echo "download emmy_core.so"
    wget "${DOWNLOAD_URL}/${EMMY_CORE_VERSION}/emmy_core.so" -O temp/emmy_core.so
    echo "download emmy_core@x86.zip"
    wget "${DOWNLOAD_URL}/${EMMY_CORE_VERSION}/emmy_core@x86.zip" -O temp/emmy_core@x86.zip
    echo "download emmy_core@x64.zip"
    wget "${DOWNLOAD_URL}/${EMMY_CORE_VERSION}/emmy_core@x64.zip" -O temp/emmy_core@x64.zip
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
}

download
extract
vsce package