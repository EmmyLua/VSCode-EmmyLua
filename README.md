![logo](/res/logo.png)
# EmmyLua for VSCode

VSCode version of [EmmyLua](https://github.com/EmmyLua/IntelliJ-EmmyLua)


QQ交流群：`29850775` (最新版本以及部分视频演示在群文件中下载)

[![Online EmmyLua Doc](https://img.shields.io/badge/emmy-doc-46BC99.svg?style=flat-square)](https://emmylua.github.io)
[![donate](https://img.shields.io/badge/donate-emmy-FF69B4.svg?style=flat-square)](https://emmylua.github.io/donate.html)
[![加入QQ群](https://img.shields.io/badge/chat-QQ群-46BC99.svg?style=flat-square)](//shang.qq.com/wpa/qunwpa?idkey=f1acce081c45fbb5670ed5f880f7578df7a8b84caa5d2acec230ac957f0c1716)

[更新日志](CHANGELOG.md)

[CHANGELOG](CHANGELOG_EN.md)

FAQ:

Q: vscode-emmylua全家桶还有哪些?

A: [EmmyLuaCodeStyle](https://marketplace.visualstudio.com/items?itemName=CppCXY.emmylua-codestyle), 暂时废弃的[EmmyLuaUnity](https://marketplace.visualstudio.com/items?itemName=CppCXY.emmylua-unity)

Q: 为什么附加调试没有作用？

A: 附加调试会试图获取进程内的lua符号，判断当前的lua版本，用于调试计算等。所以要求进程本身导出lua符号

Q: Emmy New Debug为什么连不上目标

A: 通常是由于插入代码require执行失败，或者`require("emmy_core")`返回true，这表明可执行文件没有导出lua符号

Q: 为什么打开项目后大量爆红

A: 这就是惊喜! 大部分爆红是因为emmylua检查到项目中有未定义的全局变量, 而大部分人没有给自己项目写annotation所以就会爆红了, 如果想快速修复它, 需要在你打开的首个vscode工作区的顶层目录(不是在.vscode中)中创建.emmyrc.json之后填入
```json
{
    "diagnostics": {
        "disable": [
            "undefined-global"
        ]
    }
}
```

Q: 我能否在其他平台上用到vscode-emmylua的代码分析功能?

A: 可以, vscode-emmylua的代码分析功能来自[EmmyLuaAnalyzer](https://github.com/CppCXY/EmmyLuaAnalyzer), 它是标准的语言服务器, 可以被任何实现了LSP的客户端使用. 比如在Intellij平台你可以通过安装LSP4IJ然后通过简单的配置开启EmmyLuaAnalyzer的代码分析功能.

Q: 为什么不用Vscode配置而是用.emmyrc.json?

A: 为了方便在其他平台上使用EmmyLuaAnalyzer, 并且使用任何IDE也不用重新配置

Q: 为什么选择使用dotnet重写emmylua语言服务器?

A: 原本的基于java的语言服务内存占用比较大, 另外存在各种无法解决的递归崩溃, 而如今的dotnet性能被微软优化的非常高, 内存占用也比较低, 各方面工具链比较完整. 所以我选择了dotnet

Q: 为什么没有文档?

A: 说得好, 没有空写文档.