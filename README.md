# `Emmy Lua` - Lua Language Server, IntelliSense, and Debugger for VS Code

![logo](/res/logo.png)

`Emmy Lua` is a fast and modern Lua extension for VS Code.  
Provides support for Lua programming language.  

`Emmy Lua` provides a powerful Lua IDE experience.  
It is built on the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/specification) and offers a wide range of server features such as intelligent code completion, types declaration and hinting for Lua, code navigation (go to definition, fund usages, references,..), diagnostics, linting, real-time analysis, and also debugging.  
 
`Emmy Lua` written in Rust and built for speed, reliability, and deep Lua support.

## 📋 Quick Links

- 📖 [Documentation](https://github.com/EmmyLuaLs/emmylua-analyzer-rust/blob/main/docs/config/emmyrc_json_EN.md)
- 📝 [Changelog (English)](CHANGELOG.md)
- 📝 [更新日志 (中文)](CHANGELOG_CN.md)
- 🔧 [Language Server (Rust)](https://github.com/EmmyLuaLs/emmylua-analyzer-rust)
- 💬 QQ Group: `29850775`

[![Online EmmyLua Doc](https://img.shields.io/badge/emmy-doc-46BC99.svg?style=flat-square)](https://emmylua.github.io)
[![donate](https://img.shields.io/badge/donate-emmy-FF69B4.svg?style=flat-square)](https://emmylua.github.io/donate.html)
[![加入QQ群](https://img.shields.io/badge/chat-QQ群-46BC99.svg?style=flat-square)](//shang.qq.com/wpa/qunwpa?idkey=f1acce081c45fbb5670ed5f880f7578df7a8b84caa5d2acec230ac957f0c1716)

## 🚀 Features

- **Lua IntelliSense**: Smart auto-completion with type inference for Lua
- **Lua Diagnostics**: Error detection and warnings as you type
- **Lua Debugging**: Support for attach, launch, and remote debugging
- **Lua LSP**: Built on Language Server Protocol for reliability
- **Cross-platform**: Works on Windows, macOS, and Linux

## 📦 Related Extensions

Enhance your Lua development experience with these complementary extensions:

- [EmmyLuaCodeStyle](https://marketplace.visualstudio.com/items?itemName=CppCXY.emmylua-codestyle) - Code formatting and style enforcement
- [EmmyLuaUnity](https://marketplace.visualstudio.com/items?itemName=CppCXY.emmylua-unity) - Unity3D integration

## 🔧 Configuration

### Project Configuration

Create a `.emmyrc.json` file in your project root to customize behavior:

```json
{
  "diagnostics": {
    "undefined-global": false
  }
}
```

For detailed configuration options, see:
- [English Documentation](https://github.com/CppCXY/emmylua-analyzer-rust/blob/main/docs/config/emmyrc_json_EN.md)
- [中文文档](https://github.com/CppCXY/emmylua-analyzer-rust/blob/main/docs/config/emmyrc_json_CN.md)

## 🐛 Debugging

### Remote Debug Setup

1. **Insert Debugger Code**
   - Use command: `EmmyLua: Insert Emmy Debugger Code`
   - Or manually add:
   ```lua
   package.cpath = package.cpath .. ";path/to/emmy/debugger/?.dll"
   local dbg = require('emmy_core')
   dbg.tcpListen('localhost', 9966)
   dbg.waitIDE()
   ```

2. **Set Breakpoints**
   - Add `dbg.breakHere()` where you want to pause execution
   - Or use VSCode's built-in breakpoint system

3. **Start Debugging**
   - Run your Lua application
   - Launch "EmmyLua New Debug" configuration in VSCode
   - The debugger will connect automatically

### Debug Types

- **EmmyLua New Debug**: Modern debugging with better performance
- **EmmyLua Attach**: Attach to running processes (requires exported Lua symbols)
- **EmmyLua Launch**: Direct launch debugging

## ❓ Frequently Asked Questions

<details>
<summary><strong>Why doesn't attach debugging work?</strong></summary>

**English**: The debugger needs access to Lua symbols from the target process. Ensure your executable exports Lua symbols.

**中文**: 调试器需要获取进程中的 Lua 符号，因此需要进程导出 Lua 符号。
</details>

<details>
<summary><strong>Why do I see many "undefined variable" warnings?</strong></summary>

**English**: Create `.emmyrc.json` in your project root and disable the `undefined-global` diagnostic:
```json
{
  "diagnostics": {
    "disable" : [
      "undefined-global"
    ]
  }
}
```

**中文**: 在项目根目录创建 `.emmyrc.json` 文件并禁用 `undefined-global` 诊断。
</details>

<details>
<summary><strong>Can I use EmmyLua analysis in other editors?</strong></summary>

**English**: Yes! EmmyLua uses a standard Language Server Protocol implementation. Any LSP-compatible editor can use it.

**中文**: 可以！EmmyLua 基于标准的语言服务器协议，任何支持 LSP 的编辑器都可以使用。
</details>

<details>
<summary><strong>Why use .emmyrc.json instead of VSCode settings?</strong></summary>

**English**: Project-specific configuration files work across different editors and platforms without requiring IDE-specific setup.

**中文**: 项目配置文件可以跨平台和编辑器使用，无需在每个 IDE 中重复配置。
</details>

<details>
<summary><strong>Why was the language server rewritten in Rust?</strong></summary>

**English**: The Rust implementation provides better performance, memory safety, and cross-platform compatibility compared to the previous .NET and Java versions.

**中文**: Rust 实现提供了更好的性能、内存安全性和跨平台兼容性。（因为我想试试 rust 😄）
</details>

## 🤝 Contributing

We welcome contributions! Please feel free to:
- Report bugs and issues
- Suggest new features
- Submit pull requests
- Join our QQ group for discussions

## 📄 License

This project is licensed under the MIT License.
