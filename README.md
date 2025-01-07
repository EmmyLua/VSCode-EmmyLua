![logo](/res/logo.png)
# EmmyLua for VSCode

VSCode version of [EmmyLua](https://github.com/EmmyLua/IntelliJ-EmmyLua)


QQ交流群：`29850775` (最新版本以及部分视频演示在群文件中下载)

[![Online EmmyLua Doc](https://img.shields.io/badge/emmy-doc-46BC99.svg?style=flat-square)](https://emmylua.github.io)
[![donate](https://img.shields.io/badge/donate-emmy-FF69B4.svg?style=flat-square)](https://emmylua.github.io/donate.html)
[![加入QQ群](https://img.shields.io/badge/chat-QQ群-46BC99.svg?style=flat-square)](//shang.qq.com/wpa/qunwpa?idkey=f1acce081c45fbb5670ed5f880f7578df7a8b84caa5d2acec230ac957f0c1716)

[更新日志](CHANGELOG_CN.md)

[CHANGELOG](CHANGELOG.md)

[EmmyLua Langauge Server](https://github.com/CppCXY/emmylua-analyzer-rust)

## FAQ (中文 & English)

**Q (中文)**: vscode-emmylua 全家桶还有哪些？  
**Q (English)**: Which other extensions are included in the vscode-emmylua suite?  
**A (中文)**: [EmmyLuaCodeStyle](https://marketplace.visualstudio.com/items?itemName=CppCXY.emmylua-codestyle), [EmmyLuaUnity](https://marketplace.visualstudio.com/items?itemName=CppCXY.emmylua-unity)  
**A (English)**: Install [EmmyLuaCodeStyle](https://marketplace.visualstudio.com/items?itemName=CppCXY.emmylua-codestyle) and [EmmyLuaUnity](https://marketplace.visualstudio.com/items?itemName=CppCXY.emmylua-unity)  

**Q (中文)**: 为什么附加调试没有作用？  
**Q (English)**: Why doesn't attach debugging work?  
**A (中文)**: 调试会尝试获取进程中的 Lua 符号，因此需要进程导出 Lua 符号  
**A (English)**: The debugger needs Lua symbols from the process, so the process must export them  

**Q (中文)**: Emmy New Debug 为什么连不上目标？  
**Q (English)**: Why does Emmy New Debug fail to connect?  
**A (中文)**: 可能是插入代码 require 失败或返回 true，表明可执行文件未导出 Lua 符号  
**A (English)**: Usually the injected require code fails or returns true, indicating missing Lua symbols  

**Q (中文)**: 为什么打开项目后会有大量未定义变量警告？  
**Q (English)**: Why do many undefined variable warnings appear after opening the project?  
**A (中文)**: 未定义的全局变量会触发提示，可在项目根目录创建 .emmyrc.json 并禁用 undefined-global  
**A (English)**: Undefined globals trigger warnings; create .emmyrc.json in your project root and disable undefined-global  

**Q (中文)**: 我能否在其他平台使用 vscode-emmylua 的代码分析？  
**Q (English)**: Can I use vscode-emmylua’s code analysis on other platforms?  
**A (中文)**: 可以，它基于 [emmylua-analyzer-rust](https://github.com/CppCXY/emmylua-analyzer-rust)，兼容支持 LSP 的客户端  
**A (English)**: Yes, it uses [emmylua-analyzer-rust](https://github.com/CppCXY/emmylua-analyzer-rust), which is a standard LSP  

**Q (中文)**: 为什么不用 VSCode 配置，而是用 .emmyrc.json？  
**Q (English)**: Why use .emmyrc.json instead of VSCode settings?  
**A (中文)**: 方便在其他平台上使用，无需在每个 IDE 中重复配置  
**A (English)**: It works across platforms without extra IDE configuration  

**Q (中文)**: 为什么用 .NET 重写语言服务器？  
**Q (English)**: Why rewrite the language server in .NET?  
**A (中文)**: Java 版内存占用较大且有递归崩溃问题，.NET 性能更优  
**A (English)**: The Java version used too much memory and had recursion issues; .NET is more optimized  

**Q (中文)**: 为什么没有文档？  
**Q (English)**: Why is there no documentation?  
**A (中文)**: 配置文件文档见 https://github.com/CppCXY/emmylua-analyzer-rust/blob/main/docs/config/emmyrc_json_CN.md  
**A (English)**: See configuration docs at https://github.com/CppCXY/emmylua-analyzer-rust/blob/main/docs/config/emmyrc_json_EN.md  

## FAQ – Debugging (中文 & English)

**Remote Debug Setup (中文)**  
1) 在 VSCode 中打开 Lua 文件  
2) 插入调试库路径并 require  
3) 在需要断点处添加 dbg.waitIDE(); dbg.breakHere()  
4) 运行外部程序等待连接  
5) 启动 “EmmyLua New Debug” 与目标调试  

**Remote Debug Setup (English)**  
1) Load your Lua file in VSCode  
2) Inject the debugger path and require it  
3) Add dbg.waitIDE(); dbg.breakHere() where you want to break  
4) Run your external program, which waits for a debugger  
5) Launch “EmmyLua New Debug” to connect and debug  
