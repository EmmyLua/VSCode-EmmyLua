# 🚀 Change Log

## [0.9.29] - 2025-9-19

### 🔧 变更

- **重构 LSP 处理器**：重构了 LSP 处理器以提升性能和可维护性。
- **重构折叠区间**：折叠区间功能已重构，现支持 `Intellij`。
- **新增语义标记**：增加了更多语义标记以提升语法高亮效果。
- **解析器优化**：解析器现在能更准确地报告语法错误，并提升了错误恢复能力。
- **支持返回语句上的 @type**：现在可以在 return 语句上方使用 `@type` 指定返回值类型，例如：
```lua
---@return vim.lsp.Config
return {}
```
- **类型检查优化**：优化了类型检查算法，提升了性能。

### 🐛 问题修复
- **修复进度创建协议**：修复了 `window/workDoneProgress/create` 协议，必须以请求方式发送而非通知。
- **修复函数重载算法**：重写了函数重载算法，更好地处理可变参数函数。
- **LSP 处理顺序修复**：修复了初始化期间 LSP 请求未处理的问题，现会在初始化完成后处理。

### ✨ 新增功能
- **支持注释中的 @link**：现在可以在注释中使用 `@link` 创建可点击链接，例如：
```lua
--- 这是一个指向 {@link string.format} 的链接
```
- **支持 `--editor` 指令**：现在可以使用 `--editor` 指定编辑器类型，例如：
```shell
emmylua_ls --editor intellij
```
- **支持外部工具区间格式化**：现在可以通过 `rangeFormat` 请求，使用外部工具格式化指定代码区间。可通过如下配置启用：
```json
{
  "format": {
    "externalToolRangeFormat": {
        "program": "stylua",
        "args": [
            "-",
            "--stdin-filepath",
            "${file}",
            "--indent-width=${indent_size}",
            "--indent-type",
            "${use_tabs?Tabs:Spaces}",
            "--range-start=${start_offset}",
            "--range-end=${end_offset}"
        ],
        "timeout": 5000
    }
  }
}
```
更多信息请参考 [外部格式化工具选项](https://github.com/EmmyLuaLs/emmylua-analyzer-rust/blob/main/docs/external_format/external_formatter_options_CN.md)。
- **新增 EmmyLua 注解文档**：补充了 EmmyLua 注解相关文档，详见 [EmmyLua 注解文档](https://github.com/EmmyLuaLs/emmylua-analyzer-rust/blob/main/docs/emmylua_doc/annotations_CN/README.md)。

- **emmyLua_check 支持 SARIF 格式**：`emmyLua_check` 现支持 SARIF 格式输出，可通过命令行参数 `--format sarif` 启用。
- **泛型列表支持 T... 语法**：泛型列表现已支持 `T...` 语法，例如：
```lua
---@alias MyTuple<T...> [T...]
```


## [0.9.28] - 2025-8-22

### 🐛 问题修复
- **崩溃问题修复**：修复了解析注释中的 Unicode 字符导致的崩溃问题。
- **大型表性能问题修复**：修复了解析项目中大型数组表时导致严重性能下降的问题。
- **泛型类型匹配修复**：修复了 `constTpl<T>` 类型匹配错误影响泛型类型提示的问题。

### ✨ 新增功能
- **Markdown 语法高亮默认启用**：注释中的 Markdown 语法高亮现已默认启用，包括对注释内代码块的部分语法高亮。
- **支持 `@language`**：新增对注释中使用 `@language` 指定代码块语言的支持，例如：
  ```lua
  ---@language lua
  local d = [[
    print("Hello, world!")
  ]]
  ```
  可为 Lua 代码块启用语法高亮。

- **支持 `Language<T>` 泛型类型**：现在可在参数注释中使用 `Language<T: string>` 指定参数语言，例如：
  ```lua
  ---@param lang Language<"vim">
  function vim_run(lang)
  end

  vim_run [[set ft=lua]]
  ```
  支持注入的语言包括：lua、vim、sql、json、shell、protobuf。

- **支持 `keyof type`**：当函数参数为 `keyof type` 时，提供对应的代码补全。

## [0.9.27] - 2025-8-8

### 🐛 问题修复
- **修复递归导致的崩溃**：解决了因递归过深导致语言服务器崩溃的问题。
- **修复死锁问题**：解决了在 Neovim 下语言服务器可能无限挂起的问题。
- **修复工作区库加载**：修复了子目录下的库被错误地加入主工作区的问题。
- **修复错误报告**：修复了表字段错误报告未正确生成的问题。

### ✨ 新增功能
- **支持 Markdown/MarkdownRst**：新增对文档注释中 Markdown 和 reStructuredText (RST) 格式高亮的支持。该功能默认关闭，可通过如下配置开启：
```json
{
  "semanticTokens": {
    "renderDocumentationMarkup": true
  },
  "doc": {
    "syntax": "md"
  }
}
```

- **支持外部格式化工具**：新增对外部格式化工具的支持。现在可以配置外部格式化器来格式化 Lua 代码。可通过如下配置启用：
```json
{
  "format": {
    "externalTool": {
      "program": "stylua",
      "args": [
        "-",
        "--stdin-filepath",
        "${file}",
        "--indent-width=${indent_size}",
        "--indent-type",
        "${use_tabs:Tabs:Spaces}"
      ]
    }
  }
}
```
注意：内置格式化器并非 stylua，而是 emmyluacodestyle。此功能仅作为扩展点，允许用户使用自己喜欢的格式化工具。性能上，使用此扩展点可能比其他插件更快。

- **支持非标准符号**：新增对 Lua 中非标准符号的支持。

```json
{
  "runtime": {
    "nonstandardSymbol": [
      "//",
      "/**/",
      "`",
      "+=",
      "-=",
      "*=",
      "/=",
      "%=",
      "^=",
      "//=",
      "|=",
      "&=",
      "<<=",
      ">>=",
      "||",
      "&&",
      "!",
      "!=",
      "continue"
    ]
  }
}
```

- **支持集成LuaRocks**: 现在支持集成LuaRocks，插件启动时会检查当前是否包含luarocks相关配置文件, 如果是luarocks工程会在资源管理器左下角生成luarocks包的树状视图。支持提供搜索, 安装, 卸载等功能。
该功能完全由AI生成, 我对此没有任何喜好, 欢迎提交PR改进.

- **配置文件支持本地语言翻译**: 现在支持在配置文件中为不同语言(中文/英文)提供本地化翻译。

- **配置下放到插件端**: 部分.emmyrc的配置现在也可以通过vscode插件的配置机制进行配置和管理.

## [0.9.26] - 2025-7-27
### 🐛 问题修复
- **修复创建空目录问题**：修复了语言服务器会创建空目录的问题。
### 🔧 变更
- **Rust 2024 版本**：语言服务器现已使用 Rust Edition 2024 构建，带来多项性能和稳定性提升。

## [0.9.25] - 2025-7-25
### 🔧 变更
- **重构泛型函数推断**：Lambda 函数参数现在采用延迟匹配，允许泛型类型优先从其他参数推断。例如：
```lua
---@generic T
---@param f1 fun(...: T...): any
---@param ... T...
function invoke(f1, ...)
  
end

invoke(function(a, b, c) -- 推断为：integer, integer, integer
  print(a, b, c)
end, 1, 2, 3)
```

- **泛型类型衰减**：现在，泛型类型如果匹配到 integer、string、float 或 boolean 常量，将直接转换为对应的基础类型。

### ✨ 新增
- **默认使用 Mimalloc**：Mimalloc 现为默认内存分配器，提升了性能和内存管理，启动性能提升约 50%。
- **Lua 5.5 语法支持**：更完整地支持 Lua 5.5 语法，包括 `global` 声明、`table.create` 以及新的属性语法。例如：
```lua
local <const> a, b, c = 1, 2, 3
global <const> d, e, f
```
同时支持 for 循环语句中迭代变量的不可变性检查。

- **文档 CLI 优化**：改进了文档 CLI，更好地处理各种边界情况并提供更准确的建议。

### 🐛 问题修复

- **修复加载顺序问题**：修复了文件加载顺序可能导致类型推断错误的问题。
- **修复 Unpack 推断**：修复了解包表时的推断问题。
- **修复 @param 重命名**：修复了函数参数重命名时 @param 注释未同步的问题。


## [0.9.24] - 2025-7-11
### 🔧 改进优化

- **流程分析重构**：重构了流程分析算法，采用类似 TypeScript 的流程分析方式，更好地处理复杂场景。
- **文档 CLI**：导出格式调整，现支持多个 `@see` 及其他标签标记。

### ✨ 新增功能

- **TypeGuard 泛型支持**：TypeGuard 现已支持泛型参数，例如 `TypeGuard<T>`。
- **常量字段类型窄化**：支持通过常量字段进行类型窄化。
- **基础范围检查**：数组类型索引现在更少出现可空类型。

### 🐛 问题修复

- **问题修复**：修复了若干 BUG。


## [0.9.23] - 2025-06-27

### ✨ 新功能

#### 📝 标签描述增强
- **支持标签上方和后方的描述**: 现在可以在标签上方（作为前置注释）和标签后方（内联）添加描述。描述将与相应的标签关联。
  ```lua
  ---@class A
  --- 下方描述（适用于 @field a）
  ---@field a integer 内联描述
  ---@field b integer # 井号后的描述
  --- 上方描述（适用于 @field b）
  ---@field c integer 内联描述
  local a = {}
  ```

#### ⚡ 元调用提示
- **添加调用 `__call` 提示**: 添加调用 `__call` 提示，通过 `hint.metaCallHint` 启用
  ```lua
  ---@class A
  ---@overload fun(a: integer): integer
  local A
  A(1) -- 在 `A` 和 `(` 之间会有闪电提示或在 `A` 前会有 `new` 提示
  ```

#### 🔄 类型转换语法
- **支持语法 `--[[@cast -?]]`**: 当 `@cast` 后跟操作符而不是名称时，它将转换前一个表达式的类型，但目前仅对函数调用有效！

#### 🛠️ 快速修复
- **移除 Nil 的快速修复**: 为 `NeedCheckNil` 诊断添加快速修复操作，建议使用 `@cast` 移除 nil 类型
  ```lua
  ---@class Cast1
  ---@field get fun(self: self, a: number): Cast1?
  local A

  local _a = A:get(1) --[[@cast -?]]:get(2):get(3) -- 快速修复会提示是否自动添加 `--[[@cast -?]]`
  ```

#### 📝 函数名补全
- **基础函数名补全**: 添加 `completion.baseFunctionIncludesName` 配置来控制基础函数补全是否包含函数名
  ```json
  {
    "completion": {
      "baseFunctionIncludesName": true
    }
  }
  ```
  启用时，函数补全将包含函数名：`function name() end` 而不是 `function () end`

#### 🔍 类型检查增强
- **转换类型不匹配诊断**: 添加新的诊断 `CastTypeMismatch` 来检测转换操作中的类型不匹配
  ```lua
  ---@type string
  local a = "hello"
  --[[@cast a int]] -- 警告
  ```

#### 📦 自动导入配置
- **自动 Require 命名约定配置**: 添加 `completion.autoRequireNamingConvention.keep-class` 配置选项。导入模块时，如果返回值是类定义，将使用类名；否则使用文件名
  ```json
  {
    "completion": {
      "autoRequireNamingConvention": "keep-class"
    }
  }
  ```

#### 📁 文件重构提示
- **文件重命名提示是否更新 `require` 路径**: 重命名文件时添加提示，询问是否更新对应的导入语句

### 🔧 改进优化

#### 🎯 函数跳转优化
- **类方法补全**: 函数调用跳转时，如果有多个声明，将尝试返回最匹配的定义以及所有实际代码声明，而不是返回所有定义。

#### 🔍 定义跳转增强
- **定义跳转增强**: 从函数调用跳转到定义时，如果目标位于返回语句中，语言服务器现在会尝试找到原始定义。例如：
  ```lua
  -- test.lua
  local function test()
  end
  return {
      test = test,
  }
  ```
  ```lua
  local t = require("test")
  local test = t.test -- 之前跳转到：test = test,
  test() -- 现在跳转到：local function test()
  ```

### 🐛 问题修复
- **枚举变量参数问题**: 修复检查枚举变量作为参数时的崩溃问题
- **循环文档类问题**: 修复导致语言服务器挂起的错误
- **修复调试器崩溃**: 修复调试器中的崩溃问题

---

## [0.9.22] - 2025-06-14

### ⚠️ 重要变更
**泛型约束修改** - 泛型约束（StrTplRef）移除了对字符串的保护：
```lua
---@generic T: string -- 需要移除 `: string`
---@param a `T`
---@return T
local function class(a)
end

---@class A

local A = class("A") -- 错误
```

### ✨ 新功能
- **🔒 元组不可变性**: 显式声明的 `Tuple` 是不可变的
  ```lua
  ---@type [1, 2]
  local a = {1, 2}

  a[1] = 3 -- 错误
  ```

- **📋 类默认调用配置**: 添加了配置项 `classDefaultCall`，用于声明指定名称的方法作为类的默认 `__call`
  ```json
  {
    "runtime": {
      "classDefaultCall": {
        "functionName": "__init",
        "forceNonColon": true,
        "forceReturnSelf": true
      }
    }
  }
  ```
  ```lua
  ---@class MyClass
  local M = {}

  -- `functionName` 是 `__init`，所以调用将被视为 `__init`
  function M:__init(a)
      -- `forceReturnSelf` 为 `true`，所以调用将返回 `self`
  end

  -- `forceNonColon` 为 `true`，所以调用可以不使用 `:` 且不传递 `self`
  A = M() -- `A` 是 `MyClass`
  ```

- **🎯 文档常量匹配**: 添加了 `docBaseConstMatchBaseType` 配置项，默认为 `false`。doc 中定义的基础常量类型可以匹配基础类型
  ```json
  {
    "strict": {
      "docBaseConstMatchBaseType": true
    }
  }
  ```

### 🐛 问题修复
- **📚 函数文档显示**: 悬停在 `function` 上现在可以显示相应的文档注释
- **🔍 定义跳转修复**: 修复在成员的 `转到定义` 时可能出现的崩溃问题
- **🔢 枚举参数处理**: 当 `enum` 被用作函数参数时，它被视为值而不是 `enum` 本身
- **🔧 函数补全优化**: 当表字段的预期类型是函数时，可以使用函数补全

### 🔧 功能改进
- **💡 参数提示跳转**: `inlay_hint` 参数提示现在可以跳转到实际类型定义
- **📁 文件管理优化**: 关闭不在工作区或库中的文件时，将移除它们的影响
- **🚫 忽略功能增强**: 增强了忽略相关功能。配置为忽略的文件即使被打开也不会被解析

---

## [0.9.21]

### ✨ 新功能

#### 🔧 标准库类型支持
- **`std.Unpack` 类型**: 实现 `std.Unpack` 类型以提升 `unpack` 函数的类型推断
- **`std.Rawget` 类型**: 实现 `std.Rawget` 类型以提升 `rawget` 函数的类型推断

#### 🌟 生成器支持
- **支持类似 `luals` 的 `generator` 实现**: 增强代码生成能力

#### 🧠 智能类型推断
- **改进 lambda 函数泛型推断**: 现在能更好地推断 lambda 函数的参数类型
- **优化可变泛型返回值推断**: 现在可用于异步库返回值推断
  ```lua
  --- @generic T, R
  --- @param argc integer
  --- @param func fun(...:T..., cb: fun(...:R...))
  --- @return async fun(...:T...):R...
  local function wrap(argc, func) end

  --- @param a string
  --- @param b string
  --- @param callback fun(out: string)
  local function system(a, b, callback) end

  local wrapped = wrap(3, system)
  ```

#### 📝 文档支持
- **模块和类型文档提示**: 在代码补全中添加了模块和类型的文档提示
- **交集类型检查**: 添加了交集类型的类型检查

#### 🎯 泛型约束
- **泛型约束检查**: 支持泛型约束检查、字符串模板参数类型检查和代码补全

### 🔧 改进优化
- **`math.huge` 类型修正**: 将 `math.huge` 改为数字类型
- **类型提示渲染**: 优化了某些类型提示的渲染

### 🐛 问题修复
- **嵌套闭包类型窄化**: 修复在嵌套闭包中丢失类型窄化的问题
- **性能优化**: 修复当项目中存在大型 Lua 表时类型检查严重降低性能的问题

---


## [0.9.20]

### ✨ 新功能

#### 🔄 返回值类型转换
- **函数 `@return_cast` 注解**: 支持函数的 `@return_cast` 注解。当函数的返回值是布尔值时，可以添加额外的注解来转换参数类型
  ```lua
  ---@return boolean
  ---@return_cast n integer
  local function isInteger(n)
    return n == math.floor(n)
  end

  local a ---@type integer | string

  if isInteger(a) then
    print(a) -- a: integer
  else
    print(a) -- a: string
  end
  ```

#### 🎯 Self 参数转换
- **`@return_cast` 支持 self**: `@return_cast` 支持 self 参数
  ```lua
  ---@class My2
  ---@class My1
  ---@class My3:My2,My1
  local m = {}

  ---@return boolean
  ---@return_cast self My1
  function m:isMy1()
  end

  ---@return boolean
  ---@return_cast self My2
  function m:isMy2()
  end

  if m:isMy1() then
    print(m) -- m: My1
  elseif m:isMy2() then
    print(m) -- m: My2
  end
  ```

#### 🔒 TypeGuard 支持
- **支持 `TypeGuard<T>` 返回类型**: 
  ```lua
  ---@return TypeGuard<string>
  local function is_string(value)
    return type(value) == "string"
  end

  local a

  if is_string(a) then
    print(a:sub(1, 1))
  else
    print("a is not a string")
  end
  ```

#### 🌍 Lua 5.5 支持
- **支持 `Lua 5.5` 全局声明语法**: 添加对最新 Lua 版本语法的支持

### 🔧 改进优化
- **诊断整合**: 移除诊断 `lua-syntax-error`，合并到 `syntax-error` 中，并添加 `doc-syntax-error` 用于文档语法错误
- **require 类型限制**: 当 require 函数返回的对象是类/枚举时，禁止在其上定义新成员，而表则不受限制

### 🐛 问题修复
- **格式化修复**: 修复格式化问题，现在当存在 `syntax-error` 时，格式化将不返回值
- **性能优化**: 修复性能问题：防止函数返回表时产生大量联合类型

---

## [0.9.19]

### ✨ 新功能

#### 📞 调用层次结构
- **支持调用层次结构功能**: 实现调用层次结构功能，但目前仅支持传入调用

#### 🔒 内部成员标记
- **`@internal` 标签支持**: 支持新标签 `@internal` 用于成员或声明。当成员或声明被标记为 `@internal` 时，它仅在当前库内可见

#### 🎯 转到实现
- **支持转到实现功能**: 实现转到实现功能，可以跳转到接口的具体实现

#### ⚠️ 不丢弃标记
- **`@nodiscard` 支持**: 支持 `@nodiscard` 并可提供原因

### 🔧 改进优化
- **配置文件编码支持**: 修复读取 UTF-8 BOM 编码的配置文件的问题
- **调试器构建优化**: 调试器使用 zig 构建，现在可以在 glibc-2.17 系统上使用

### 🐛 问题修复
- **性能问题修复**: 修复一些性能问题

---

## [0.9.18]

### ✨ 新功能

#### ⚙️ 全局配置支持
- **全局配置文件**: 现在可以通过以下方式在全局提供语言服务器的配置：
  - `<os-specific home dir>/.emmyrc.json`
  - `<os-specific config dir>/emmylua_ls/.emmyrc.json`
  - 环境变量 `EMMYLUALS_CONFIG`（指向 JSON 配置文件的路径）
  
  全局配置优先级低于本地配置。

#### 🧠 泛型类推断
- **泛型类型补全**: 现在类也可以从泛型类型中推断，并提供相应的补全

#### 🔍 数组索引安全
- **数组返回值可空**: 数组返回值现在被视为可空类型。如果不想要这种行为，可以在配置文件中将 `strict.arrayIndex` 设置为 `false`

### 🔧 重构优化
- **流程分析重构**: 重构了流程分析算法

### 🐛 问题修复
- **Self 推断**: 修复了一些 self 推断的问题
- **诊断动作**: 修复了一些诊断动作的问题
- **类型检查优化**: 优化了一些类型检查
- **补全功能优化**: 优化了一些补全功能

---

## [0.9.17]

### 🔧 重构优化

#### 🧠 核心系统重构
- **类型推断重构**: 重构类型推断系统
- **成员推断重构**: 重构成员推断系统

#### 📝 元组类型支持
- **元组类型检查**: 优化并修复元组类型检查
- **可变元组**: 支持在元组中使用可变类型，例如: `[string, integer...]`

### ✨ 新功能

#### 🔧 标准库优化
- **pcall 推断优化**: 优化 pcall 推断，现在可以匹配 self 和别名
- **range 迭代优化**: 对于 range 迭代变量，现在会去除 nil 类型
- **标准库类型检查**: 优化部分标准库的类型检查

#### 🎯 类型推断增强
- **setmetatable 推断**: 支持从 setmetatable 中推断类型
- **子类类型检查**: 优化子类与父类之间的类型检查规则

### 🔧 工具改进
- **文档导出**: emmylua_doc_cli 将导出更多信息
- **描述支持**: 允许 '-' 作为描述

---

## [0.9.16]

### 🔧 配置优化

#### 🔄 重新索引
- **默认禁用重新索引**: 重新索引现在默认禁用，需要通过 `workspace.enableReindex` 启用

#### 🚨 诊断功能增强
- **新增诊断类型**: 添加多种新的诊断：
  - `inject_field` - 注入字段检查
  - `missing_fields` - 缺失字段检查
  - `redefined_local` - 重定义本地变量检查
  - `undefined_field` - 未定义字段检查
  - `inject-field` - 注入字段检查
  - `missing-global-doc` - 缺失全局文档检查
  - `incomplete-signature-doc` - 不完整签名文档检查
  - `circle-doc-class` - 循环文档类检查
  - `assign-type-mismatch` - 赋值类型不匹配检查
  - `unbalanced_assignments` - 不平衡赋值检查
  - `check_return_count` - 返回值数量检查
  - `duplicate_require` - 重复 require 检查
  - `circle_doc_class` - 循环文档类检查
  - `incomplete_signature_doc` - 不完整签名文档检查
  - `unnecessary_assert` - 不必要的断言检查

### ✨ 新功能

#### 🔢 布尔类型支持
- **布尔字面量类型**: 支持将 `true` 和 `false` 作为类型

#### 🎨 语法兼容性
- **LuaLS 函数返回语法**: 兼容格式化 luals 函数返回语法，如：`(name: string, age: number)`

#### 🔄 迭代器增强
- **迭代器类型推断**: 迭代器函数的别名和重载（例如 `fun(v: any): (K, V)`，其中 `K` 为键类型，`V` 为值类型）现用于推断 `for` 循环中的类型

#### 📝 字符串模板
- **LuaLS 字符串模板语法**: 兼容格式化 luals 字符串模板语法，如：xxx`T`、`T`、`T`XXX
  ```lua
  ---@generic T
  ---@class aaa.`T`.bbb
  ---@return T
  function get_type(a)
  end

  local d = get_type('xxx') --- aaa.xxx.bbb
  ```

#### 📚 文档功能
- **`@see` 支持**: 支持 `@see` 任意内容
- **模块文档导出**: 加强模块文档导出
- **`@module` 用法**: 支持 `@module` 用法：`---@module "module path"`

### 🐛 问题修复
- **调试器更新**: 调试器更新, 修复一个可能的崩溃问题 (由 `@mxyf` 修复)

---

## [0.9.15]

### ✨ 新功能

#### 🔧 变量配置
- **下划线变量配置**: 允许禁用可变变量的下划线显示

#### 🔢 类型支持
- **负整数类型**: 支持负整数类型

#### 🎯 参数检查
- **参数数量检查**: 函数参数检查将会检查参数数量是否过少，如果参数过少而后续参数没有显示标记可空则会报错
- **可空参数描述**: 新增函数参数上的可空描述，比如 `---@param a? number`

#### 🔍 代码补全
- **过滤补全项**: 支持过滤补全项

#### 📁 项目管理
- **文件保存重新索引**: 在保存文件时支持重新索引项目
- **模块导入增强**: 更好地支持在其他编辑器中 require 模块

#### 📝 字段继承
- **字段函数定义继承**: 支持从 `@field` 注解继承函数定义的参数类型

### 🔧 改进优化
- **别名类型检查**: 修复别名类型检查问题
- **流程分析重构**: 重构流程分析算法
- **属性解包**: 修复属性解包问题

### 🚨 诊断增强
- **新增诊断**: 支持检查 `redundant_parameter`、`redundant_return_value`、`missing_return_value`、`return_type_mismatch`

---

## [0.9.14]

### 🔧 重构优化

#### 📁 代码折叠
- **重构 `folding range`**: 重构代码折叠功能

### ✨ 新功能

#### 🔧 字段函数重载
- **`@field` 函数重载**: 支持 `@field` 函数重载
  ```lua
  ---@class AAA
  ---@field event fun(s:string):string
  ---@field event fun(s:number):number
  ```

#### 🎯 类型系统增强
- **联合类型重构**: 重构联合类型系统
- **类型描述**: 为类型添加描述
- **多联合类型描述**: 支持多联合类型中不带 `#` 的描述

#### 🌐 国际化
- **标准库翻译**: 添加标准库翻译

#### 💡 智能提示
- **参数内嵌提示优化**: 优化参数内嵌提示：如果参数名与变量名相同，则不显示参数名称

### 🐛 问题修复
- **超类补全**: 修复超类补全问题
- **枚举类型检查**: 修复枚举类型检查
- **自定义运算符**: 修复自定义运算符推断
- **select 函数**: 修复 select 函数并添加 std.Select 类型

---

# 0.9.13
`FIX` 修复 Unix 系统下 `emmylua_ls` 可能无法退出的问题。

`NEW` 新增支持类似 TypeScript 风格的类型体操。

`FIX` 修复别名泛型中的无限递归问题。

`NEW` 改进引用搜索。

`NEW` 重构类型检查。

`NEW` 优化悬停提示。

`NEW` 优化自动补全。

`NEW` 支持 `pcall` 的返回类型及其检查。

# 0.9.12

`NEW` 支持在将元组转换为数组时进行类型检查。

`NEW` 现在自动补全会建议函数重载。

`NEW` 改进了整数成员键的补全。

`NEW` 通过重新赋值推断值。

`NEW` 改进基础控制流分析。

`NEW` 改进类的悬停提示。

`NEW` 优化了语义标记。

`NEW` 将部分表数组推断为元组。

`NEW` 将 `{ ... }` 推断为数组。

`NEW` 语义模型现已不可变。

`FIX` 修复了解析迭代顺序问题导致的推断错误。

`FIX` 改进了类型检查。

# 0.9.11

`FIX` 修复mac路径问题

# 0.9.10

`FIX` 修复泛型表推断问题

`FIX` 修复元组推断问题

`NEW` 兼容以`$` 开头的环境变量

`FIX` 重构 `humanize type` 以解决堆栈溢出问题

`Fix` 修复文档 CLI 工具渲染问题

# 0.9.9

`NEW` 支持alias generic展开

`NEW` 支持由 `emmyluacodestyle` 提供支持的 `code style check`

`NEW` 基本表声明字段名自动补全

`FIX` 修正计算幂时可能因整数溢出而引发崩溃的问题

`NEW` 支持在 Windows 上使用 mingw 编译

`NEW` `emmylua_check` 现支持 `workspace.library`

`FIX` 修正 CLI 工具加载标准资源的问题

`FIX` 修正将 `self` 参数识别为未使用的问题

`NEW` 添加 `emmylua_check` CLI 工具，你可以使用该工具检查 Lua 代码，可通过 `cargo install emmylua_check` 进行安装

`NEW` 所有 crates 均已发布到 crates.io，现你可从 crates.io 获取 `emmylua_parser`、`emmylua_code_analysis`、`emmylua_ls`、`emmylua_doc_cli`：
```shell
cargo install emmylua_ls
cargo install emmylua_doc_cli
```

`CHG` 重构 `template system`，优化泛型推断

`FIX` 现已在未提供额外 LSP 配置参数时正确加载 NeoVim 中的配置

`CHG` 扩展对小型常量表类型更友好的处理

`NEW` 添加配置选项 `workspace.moduleMap` 用于将旧模块名映射为新模块名。`moduleMap` 是一个映射列表，例如：

```json
{
  "workspace": {
    "moduleMap": [
      {
        "pattern": "^lib(.*)$",
        "replace": "script$1"
      }
    ]
  }
}
```

此功能确保 `require` 能正确工作。如果你需要将以 `lib` 开头的模块名转换为 `script`，请在此处添加适当的映射。

`CHG` 重构项目结构，将所有资源移动到可执行二进制文件中

`NEW` 添加开发指南

`NEW` 支持 Neovim 的 `workspace/didChangeConfiguration` 通知

`CHG` 重构语义标记 `semantic token`

`NEW` 支持基于传入函数的简单泛型类型实例化

`FIX` 修复查找泛型类模板参数的问题

# 0.9.8

`FIX` 修复一些多返回值推断错误的问题

`FIX` 去掉hover时多余的`@return`

`NEW` 语言服务器支持通过变量`$EMMYLUA_LS_RESOURCES`定位资源文件

# 0.9.7

`FIX` 修复一个可能的无法完成索引的问题

`FIX` 修复类型检查时, 对子类传入父类参数检查失败的问题

# 0.9.6

`NEW` 对非vscode平台添加progress notifications

`NEW` 添加nix flake, 用于nix的用户的安装, 参考 PR#4

`NEW` 支持在hover中显示参数和返回的描述

`NEW` 支持连续的require语句被视为import块, 并被vscode自动折叠, 如果该文件只有require语句则不生效

`FIX` 修复拼写错误 `interger` -> `integer`

`FIX` 修复盘符下首个目录为中文时url解析的问题

`FIX` 修复关于table方面的类型检查的问题

`FIX` 修改document color的实现, 要求必须是连续的单词, 并提供选项关闭document color功能

`FIX` 修复self作为函数显式参数时的类型推断问题

# 0.9.5

`FIX` 修复不对称函数定义调用的检查错误

`NEW` 新增need-nil-check诊断, 用于检查可能为nil的变量是否被检查

`NEW` 重构控制流分析, 以更好的支持nil检查

# 0.9.4

`FIX` 修复`@source`标记的字段/函数无法跳转的问题

`FIX` 修复`@class`和`@enum`对table field的作用

`FIX` 修复类型检查时无法对联合类型给出正确的计算的问题

# 0.9.3

`FIX` 修复上个变量查找声明的方式, 将跳过赋值语句本身

`FIX` 允许设置诊断间隔, 通过`diagnostics.diagnosticInterval`, 默认值是500

`FIX` 修复链式调用没有推断和提示的问题

# 0.9.2

`FIX` 修复了配置项里面得globalsRegex无效的问题

`FIX` 现在重新支持使用_G定义和访问全局变量的问题

`FIX` 现在重新支持非严格require模式, 也就是require路径不需要从根目录开始, 该模式需要配置 strict.requirePath 为 false

`FIX` 修复一个导致document/symbol报错的问题

`FIX` 修复`{ [number]: T }`这样的类型推断失效的问题

`CHG` 优化代码, 更多的使用smol_str

# 0.9.1

`FIX` 修复一个崩溃问题

`CHG` 重构了排除文件相关的逻辑

# 0.9.0

`CHG` 使用rust重写

# 0.8.20

`FIX` 修复了连续调用时函数签名判断错误

`FIX` 修复alias类型作为key时的推断问题

`FIX` 修复了常整数field补全失效的问题:
```lua
---@class A
---@field [1] string
local a
a[1] -- now can completion
```

`NEW` 优化了语义token, 他仅仅作用于doc

`NOTE` 0.8.20 作为 0.8.x 系列最后一个发布版本, 后续版本号将升级到0.9.0

# 0.8.18

`FIX` 修复参数为enum和alias时的代码补全列表包含了过多的引号

`FIX` 修复调试时inlineValues没有生效的问题

`NEW` '_' 不被视为未使用变量

`NEW` 枚举类型可以作为key, 参与推断

`NEW` 添加新的doc片段补全`param;@return`在函数语句上选择时会自动补全参数和return的doc

`NEW` 修复在intellij平台上多根目录的错误

`NEW` 支持代码格式化, 该功能通过pinvoke引用`EmmyLuaCodeStyle`实现

`NEW` VScode-EmmyLua-Unity插件已经发布, 使用Xlua的用户可以试着安装使用

`NEW` Intellij-EmmyLua2插件已经发布, jetbrain平台的用户可以试着使用该插件, 该插件内部集成vscode中所用的`EmmyLuaAnalyzer`, `EmmyLuaCodeStyle` 和`EmmyLuaDebugger`, 未来还会上架`intellij-emmylua2-unity`和`intellij-emmylua2-attachdebugger`

`NEW` 新增配置文档: https://github.com/CppCXY/EmmyLuaAnalyzer/blob/master/docs/.emmyrc.json_CN.md

# 0.8.17

`FIX` 修复linux目录错误的问题

`FIX` 修复table<TKey, TValue>注解的相关推断问题

`FIX` 修复全局变量如果标记了class, 则在其他地方找不到引用的BUG

`NEW` 支持注解`@source "<uri>#<line>:<col>"`当字段拥有该注解时, 跳转会跳转到该source指定的位置

`NEW` VSCode-EmmyLua-Unity不久(2024年8月8日)会发布, 使用该插件导出的API, 会依据xlua的规则导出对应的API, 并且字段支持跳转到对应的C#实现

`NEW` 枚举注解`@enum` 支持`key` attribute, 例如:
```lua
---@enum (key) AAA
---| CS.A.B.C
```
这样在代码补全时, 会自动补全为`CS.A.B.C`而不是`AAA.CS.A.B.C`

# 0.8.16

`CHG` 所有函数的函数返回值被视为新的实例, 对其返回值的修改在不同实例之间互相独立

`FIX` 修复_G无法提示和添加全局变量的BUG

`FIX` 修复table泛型无法参与推断的BUG

`NEW` 引入特殊泛型类型, `namespace<T : string>`, 该类型会试图引用命名空间例如:
```lua
CS = {
    ---@type namespace<"UnityEngine">
    UnityEngine = {},
    ---@type namespace<"System">
    System = {},
}

```


# 0.8.15

`CHG` 重构底层类型系统, 重构索引系统

`FIX` 修复inline values计算错误

`FIX` 修复return注解被函数返回类型覆盖的BUG

`FIX` 修复param注解无法作用于for in 语句参数的bug

`FIX` 修复private和protected可见性的诊断问题

`CHG` 改变类型的成员逻辑, 现在不允许类型成员被随意扩展, 具体表现为:
* 如果一个local变量被标记为`---@class`则其他文件无法为该类注入成员
* 如果一个全局变量被标记为`---@class`则可以在其他文件为该类注入成员
* 一个local变量作为模块被return出去后, 其他文件不能为该模块注入成员
* 一个全局变量可以在任意文件注入成员

`NEW` 支持class的attribute语法, 例如: `---@class (partial) A`, `---@enum (partial) B`

`MEW` 支持部分类注解`partial`, 如果一个类被标记为部分类, 则在其他文件中需要再声明为部分类才能扩展其成员, 例如字符串类型的扩展:
```lua
---@class (partial) string
local string = string

function string:split(sep)
end
```

`NEW` 支持精确类注解`exact`, 如果一个类被标记为精确类, 则只允许使用和定义通过`---@field`注解指定的成员例如:

```lua
---@class (exact) AA
---@field a number
local AA = {}

AA.b = 123 -- error
AA.a = 456 -- ok

```

`NEW` 诊断支持`inject-field-fail`, 该诊断默认关闭

`NEW` 诊断支持`duplicate-type`, 该诊断默认开启

`NEW` 代码补全会根据可见性, 屏蔽不能看见的成员

`NEW` 引入命名空间注解`---@namespace`, 用于标记当前文件的命名空间, 例如:
```lua
---@namespace System
```
在当前文件指定命名空间后, 该文件定义的所有类型会处于当前命名空间下, 同一命名空间下的类不需要写命名空间前缀即可访问

`NEW` 引入using注解`---@using`, 用于方便引用其他命名空间的类型, 例如:
```lua
---@using System
```
在当前文件指定using后, 该文件可以直接使用System命名空间下的类型, 例如:
```lua
-- A.lua

---@namespace System
---@class FFI


-- B.lua
---@using System

---@type FFI

--- C.lua
---@type System.FFI
```

`NEW` 类型定义时, 若存在`.`分割的名称, 则会自动创建命名空间, 例如:
```lua
---@class System.FFC
```

`NEW` 引用查找规则优化, 通过当前类的成员查找引用时, 优先查找当前类的引用, 然后会查找所有子类的引用, 不会查找父类的引用

`NEW` 代码补全优化, 代码片段补全定义函数语句时, 会模仿上一个语句的函数定义

# 0.8.12

`FIX` 修复代码补全的问题

`FIX` 修复函数返回类型无法推断的BUG

`NEW` require的路径提示支持使用`/`作为分隔符, 跳转/代码分析/文档链接均支持使用`/`作为分隔符

# 0.8.11

由于windows推送失败, 更新到0.8.11

# 0.8.10

`NEW` 将版本升级到0.8.10, 由于底层改动巨大, 所以提升数个版本号, 然而从二进制来看10版本也是2

`NEW` 将dotnet版本升级到9.0预览版

`CHG` 移除Newtonsoft.Json使用Text.Json, 移除omnisharp/csharp-language-server-protocol使用[`EmmyLua.LanguageServer.Framework`](https://github.com/CppCXY/LanguageServer.Framework)

`NEW` 使用dotnet9 aot发布, 提高不少运行时性能, 但是内存使用差异不大

`NOTE` `EmmyLua.LanguageServer.Framework`是由我重新开发的支持最新的LSP标准和兼容AOT编译的LSP框架, 有兴趣可以看看

`NEW` 支持配置`workspace.ignoreGlobs`, 可以通过正则表达式排除目录, 具体格式参考Microsoft.Extensions.FileSystemGlobbing的文档:
```json
{
  "workspace": {
    "ignoreGlobs": [
      "**/data/*"
    ]
  }
}
```

# 0.8.1

`FIX` 修复读取配置表时的性能问题

`FIX` 修改了对其他编码的支持方式, 不再要求创建.emmyrc.json文件

`FIX` 修复document color渲染时没有判断单词边界的问题

`FIX` 修复泛型推断上的一些BUG

`CHG` 移除了new函数默认返回自身类型的推断

`NEW` 重构了声明分析系统

`NEW` 支持string.format的格式参数展开

`NEW` 支持通过注解`---@module no-require`表示一个文件不可以被require, 之后得代码补全不会出现他的require提示

`NEW` 支持注解`---@mapping <new name>`表示一个字段/变量/函数可以映射到`<new name>`使用, 例如:
```lua
local t = {}
---@mapping new
t:ctor(a, b)

t:new(1, 2)
```

# 0.8.0

从这个版本开始, emmylua移除了java版本语言服务, 仅支持dotnet版本语言服务, 同时删除了所有以前为java版语言服务提供的配置. 

`NEW` 调试器更新到1.8.2, 修复了tcpListen localhost时报错

`FIX` 修复一个无限递归崩溃问题

`CHG` 修改了hover的显示方式, 取消了对类的展开, 所有函数的签名参数会换行展示

`CHG` 修改了codelens的实现方式

`FIX` 处理了部分引用找不到的问题

`FIX` 修复了hover上的Goto links的实现错误

`FIX` 修复了参数Missing-parameter计算没有考虑不对成的定义和调用问题

`NEW` 强化了document color的实现, 现在在字符串中的连续的6个或者8个16进制数字的组合被视为color

`NEW` 重构了泛型系统, 泛型参数匹配支持前缀:
```lua
---@generic T
---@param a UnityEngine.`T`
---@return T
local function f(a)
    
end

local GameObject = f("GameObject") -- UnityEngine.GameObject
```

泛型现在可以展开函数参数, 请参考pcall和xpcall的声明, pcall和xpall现在会随着首个参数的类型改变签名

# 0.7.7

`FIX` 修复\u{xxx}为UTF8编码无效区的时候语言服务报错的BUG

`FIX` 全局变量现在保持唯一, 如果某处全局变量的定义使用了emmylua doc, 则为优先定义, 否则为随机定义

`FIX` alias递归定义时, 避免无限递归推断

`FIX` 修复一些推断上的BUG

`FIX` 优化悬浮和补全项的文档提示

`CHG` 现在变量不会直接等同右侧表达式类型, 每个变量拥有一个匿名的独立类型, 防止从表达式返回的类型被修改

`FIX` 修复class类似的函数返回类型推断问题, 避免无数类型发生联合

# 0.7.6

`FIX` 修复父类补全失效

`NEW` 支持unpack对数组的展开 

# 0.7.5

`FIX` 优化子类推断, 避免出现无限递归

`FIX` 清理代码, 优化内存占用, 提高数据结构的有效占用, 降低内存碎片.

`FIX` 修复一个内存泄漏问题

`NEW` 新增诊断算法: `no-discard`, `missing-parameter`, `disable-global-define`, `undefined-field`, `local-const-reassign`, 其中`disable-global-define`, `undefined-field` 默认关闭.

`NEW` 新增诊断启用配置:
```json
{
  "diagnostics": {
    "enables": [
      "disable-global-define",
      "undefined-field",
    ]
  }
}

```

`FIX` 优化了代码片段补全

# 0.7.4

0.7.3更新失败, 版本号挺高到0.7.4

# 0.7.3

`CHG` 取消了文档延迟更新

`NEW` 将存储的语法节点由class优化为struct, 减少内存占用, 大概减少了30%的内存占用

`NEW` 优化了pairs和ipairs的片段补全`@whitecostume`实现

`NEW` 允许`---@type` 作用于tableField上, 例如:
```lua
local t = {
    ---@type string
    aa = 1
}
```

`CHG` 重构了声明和索引体系, 为其他插件做准备

`FIX` 修复一些推断上的BUG

`FIX` 尽可能正确的实现可见性检查, 可见性检查支持`@private`, `@public`, `@protected`, `@package` 注解, 他分别代表`私有`, `公有`, `保护`, `包`四种可见性, 所谓的包可见性, 指的是在相同文件内可见

`NEW` 语言服务现在会从vscode插件端读取文件关联配置, 确保`.lua.txt`等后缀的正确分析

# 0.7.2

`NEW` 默认启用codelens功能

`NEW` 支持`.1`形式的小数

`NEW` 工作区代码诊断并行化会充分利用多核CPU的优势

`NEW` 文档诊断异步化, 并内置延迟1秒的防抖机制, 减少诊断对性能的影响

`NEW` 文档更新延迟0.1秒, 在快速键入时不会马上文档的内容

`NEW` 优化工作区内的文件监听更新机制, 支持批量更新(主要是git等版本管理工具的更新)

`NEW` 支持类的可调用推断, 例如:
```lua
---@class A
---@overload fun(a, b, c): A
A = {}

local a = A(1, 2, 3) -- A
```

`NEW` 支持严格模式配置, 当前存在的严格模式配置是:
```json
{
  "strict": {
    "requirePath": true,
    "typeCall": true
  }
}
```
在如果设置`requirePath: false`则允许require路径不从根目录开始, 如果设置`typeCall: false`则允许对任意类型的直接调用返回类型本身.

`FIX` 修复一些推断问题

`FIX` 修复工作区重叠时, 因为重复添加文件导致的崩溃

`FIX` 修复内联注释判断逻辑

`FIX` 优化泛型函数推断

# 0.7.1

`FIX` 调试器回滚到1.7.1, 下个版本再更新调试器

# 0.7.0

`NEW` dotnet实现的语言服务开始正式替代java版本的语言服务, java版本的语言服务将来会在1.0版本移除, 现在可以以legacy的形式启用

`NEW` 调试器更新到1.8.0

`NEW` 支持字符串泛型, 例如:
```lua
---@generic T
---@param a `T`
---@return T
function TypeOf(a)
end

local a = TypeOf("string") -- string type
```

`FIX` 修复一些类型推断上的问题

`NOTE` 如果项目中的报错过多, 可以按ctrl . 然后选择禁用这个诊断, 如果你的项目中是.lua.txt为后缀, 请在配置中的extensions里面添加.lua.txt, 然后重启vscode

`NOTE` 所有的vscode配置对于dotnet版本的语言服务都是无效的, 他的配置需要在根目录创建.emmyrc.json文件, 一个模板配置是:

```json
{
    "completion": {
        "autoRequire": true,
        "autoRequireFunction": "require",
        "autoRequireNamingConvention": "snakeCase",
        "callSnippet": false,
        "postfix": "@"
    },
    "diagnostics": {
        "disable": [
        ],
        "globals": [
        ],
        "globalRegex": [
        ],
        "severity": {
        }
    },
    "hint": {
        "paramHint": true,
        "indexHint": true,
        "localHint": false,
        "overrideHint": true
    },
    "runtime": {
        "version": "Lua5.4",
        "requireLikeFunction": [],
        "frameworkVersions": [],
        "extensions": []
    },
    "workspace": {
        "ignoreDir": [],
        "library": [],
        "workspaceRoots": [
        ],
        "preloadFileSize": 12048000
    },
    "resource": {
        "paths": [
        ]
    },
    "codeLens":{
        "enable": false
    }
}
```

# 0.6.18

`NEW` 支持`---@verson`注解, 格式为: `---@version [>|<|>=|<=] [<framework>] <version>, ...`

`NEW` 支持配置`runtime.frameworkVersions`, 配置格式为:
```json
{
  "runtime": {
    "frameworkVersions": [
      "openresty 1.2.0"
    ]
  }
}
```

`NEW` 支持 diagnostic.globalsRegex, 用于配置全局变量的正则表达式, 例如:
```json
{
  "diagnostics": {
    "globalsRegex": [
      "^ngx\\."
    ]
  }
}
```

`NEW` 优化代码补全, 支持tablefield补全, 支持元字段补全

`NEW` 支持CodeLens功能, 通过配置codeLens.enable开启, 例如:
```json
{
  "codeLens": {
    "enable": true
  }
}
```

`NEW` EmmyLuaAnalyzer项目新增EmmyLua.Cli工程, 用于生成文档, 代码检查等功能.

`NEW` 命令行工具支持生成文档目前实现非常简陋需要优化.

`FIX` 修复不少细节上的BUG

# 0.6.17

`NEW` 重构声明算法, 优化Hover时的提示, 现在hover时, 会展开alias的选项, 并且增加Go to 类型的跳转 

`NEW` 兼容LuaLs的一些跨行联合语法

`NEW` 生成了schema.json文件, 用于支持json文件的补全

`NEW` 新增deprecated的渲染, 和一些私有字段的访问检查

`NEW` 新增配置用于设置autoRequire时的补全函数名以及文件命名法的转换

# 0.6.16

`NEW` 重构算法, 优化内存占用, 减少30%的内存占用

`NEW` 支持工作区符号搜索

# 0.6.15

`FIX` 修复配置类的初始化问题导致的documentLink报错

`NEW` 现在所有能够填写路径的地方, 都支持相对路径, 绝对路径, 以及$`${workspaceFolder}`指代工作区 `~`指代用户目录

# 0.6.14

`NEW` 增加inlayHint配置, 实现localHint和overrideHint

`NEW` 实现DocumentLink功能, 可以跳转到相关文件

`NEW` 实现字符串中的资源文件补全, 需要添加配置:
```json
{
  "resource": {
    "paths": [
      "absolute path to resource folder"
    ],
  }
}
```


# 0.6.13

`FIX` 修复右侧表达式为unknown时, 左侧类型会被强制转换为匿名类型的问题

# 0.6.12

`NEW` 实现后缀补全功能, 输入标识符后输入 '@' 即可获得后缀补全

`FIX` 修复双倍全局变量的问题

`NEW` 兼容luals一些语法:
* 返回类型可以是 ... 或者 ...string, 
* 兼容 doc attribute, 例如---@enum (partial) A, 但并未实现相关功能
* 兼容返回类型可空简化描述, 例如---@return string?, 但并未实现相关功能

`NEW` 支持可变模板参数声明, 主要用于实现unpack逻辑, 例如:
```lua
---@generic T...
---@param a [T...]
---@return T...
```

`FIX` 修复hover和inlayhint时, 表结构类型的字段提示问题

`FIX` 修复多返回值函数, 后续返回延续的前一个的问题

`NEW` 对无法推断类型的变量, 会默认给予一个匿名类型

# 0.6.10

`NEW` 现在支持从配置文件配置语言服务, 你可以在工作区创建.emmyrc.json, 具体格式目前是:
```json
{
  "completion": {
    "autoRequire": true,
    "callSnippet": false,
    "postfix": "@"
  },
  "diagnostics": {
    "disable": [],
    "globals": []
  },
  "hint": {},
  "runtime": {
    "version": "Lua5.4"
  },
  "workspace": {
    "ignoreDir": [
      "test"
    ],
    "library": [],
    "workspaceRoots": [],
    "preloadFileSize": 2048000
  }
}
```

`NEW` 现在提供工作区诊断和工作区禁用诊断

`NEW` 支持在工作区内配置root路径, 这样require路径将会从root开始, root可以配置多个

`NEW` 支持配置第三方库目录

`NEW` 支持通过_G定义全局变量, 例如_G.aa = 123, 但是找不到引用目前

# 0.6.9

`FIX` 修复全局变量判断问题

`FIX` 修复双倍打开文件的BUG

`NEW` 增加大量代码片段

`NEW` 推断回调函数的参数类型

`NEW` 强化inlayHint, 函数调用参数上的inlayHint可以点击跳转

`NEW` 提供continue补全(转化为goto continue)

`NEW` 完善诊断管理, 可以通过---@diagnostic 系列注解关闭当前行和当前文件的诊断

`NEW` 提供未定义全局变量的诊断

# 0.6.8

`FIX` 临时把add改为TryAdd, 修复启动错误

`FIX` 修复注释中的缩进显示

`NEW` 隐式继承, 例如:
```lua
---@class A
local a = enum {
    aaa = 123
}
```
此时A类将隐式继承右侧表达式的类型

# 0.6.7

`FIX` 修复多线程问题

`FIX` 修复debug inline values过多的问题

# 0.6.6

`FIX` 修复一些补全问题

`NEW` 增加一个显示解析进度的条

`NEW` 替换插件端的debug inline values特性, 改为语言服务实现

`NEW` 实现函数环境下self字段的直接补全而不用写self


# 0.6.5

`FIX` 修复部分全局变量没有标记为红色的BUG

`FIX` 重新启用goto和break的相关检查

`FIX` 修改项目排除逻辑

`FIX` 优化内存占用

`FIX` 修复重命名时光标在标识符右侧导致无法重命名的问题

`FIX` 插件会在启动时试图读取`.luarc.json`文件, 功能未实现

# 0.6.4

`FIX` 修复双倍服务器的问题

# 0.6.3

`NEW` 支持emmylua经典代码渲染

`FIX` 优化一点内存占用

`FIX` 暂时屏蔽控制流分析给出的错误诊断

`NEW` 修复索引表达式找不到引用的问题

`NEW` 支持读取配置, 但是目前没有作用


## 0.6.2

`FIX` 不索引大文件(超过200kb)

## 0.6.1

`FIX` 修复形如 { x:number} 的类型解析错误

`FIX` 修复对标准库的读取

`NOTE` 全新语言服务基于dotnet sdk 8, 需要自行下载

## 0.6.0

`NEW` 可选的使用新的语言分析后端，新的分析后端支持更多的特性，包括但不限于：
- 真泛型类
- 复杂泛型函数的类型推断
- 运算符重载
- 多重继承
- 接口和接口继承
- enum和alias的常量补全
- 支持元组类型 [int, int, int]
- 支持---@async标注
- Emmylua doc可以在任意处换行, 并且支持多行注释
- 支持 #123456 格式的文本的color显示
- 支持基于代码补全的auto require (如果模块存在返回值)
- 调整require的路径显示
- 兼容LuaLs的大部分doc标注, 但功能并未完全实现

`NOTE` java版本的语言服务会和C#写的语言服务共存, 去settings下搜索emmylua.new开启后重启vscode即可, 版本号暂时升级到0.6, 经过1到2个月的BUG修复期之后, 版本会升级到0.7, 此时会移除java版本的语言服务.
再经过一段时间的稳定, vscode-emmylua版本号将升级到1.0

新语言服务的地址: https://github.com/CppCXY/EmmyLuaAnalyzer


## 0.5.19

`NEW` 调试器支持IPV6地址, 所有dns会优先解析为IPV6, 例如localhost将会被解析为IPV6地址

## 0.5.18

`FIX` 因为vscode的更新使得nodejs的net模块对localhost解析出现问题, 导致调试器无法连接到目标进程

## 0.5.17

`FIX` 修复一个调试崩溃问题

## 0.5.16

`REFACTOR` 重构launch调试, 支持使用vscode的debug窗口展示打印, 也可以选择开启新的console窗口显示打印

`FIX` 修复语言服务0.5.15引入的不加载工作区的问题

`NOTE` 最低VSCODE版本要求`1.79`


## 0.5.15

`REFACTOR` 重新组织调试器适配器代码结构, 在开发模式下会和插件同进程便于调试.

`REFACTOR` 重构调试器协议部分代码

`NEW` 调试器支持运行时设置表达式的功能(对本地变量无效, 需要后续修改)

`REFACTOR` 语言服务重构多线程方面的内容

`NOTE` 修修补补又一年

## 0.5.14

`FIX` 修复调试问题, 调试器升级到1.5.1

`FIX` 修复代码补全时因为alias导致的递归爆栈

`NEW` 加个显示emmylua运行状态的item bar

`CHANGE` 移除找不到java时右下角的显示

`CHANGE` 允许停用emmylua语言服务

## 0.5.13

`FIX` 修复使用emmylua-unity时, 继承unity类之后无法提示的问题

## 0.5.12

`NEW` 好久没更了更一下

`NEW` 调试器升级到1.5.0

`NEW` 修复emmylua-unity相关跳转问题

`NEW` 这里报告一下语言服务开发进度, 没有进度 over.

## 0.5.11

`FIX` 现在支持打开单文件, 修复打开单文件语言服务的报错

`FIX` 找不到函数签名时返回空

`CHANGE` 取消工作区诊断

`CHANGE` 代码诊断分成两部分, 一部分是语法实时检查, 一部分是语义检查, 语义检查仅仅在打开文件或者保存文件时触发

## 0.5.10

`FIX` 下载语言服务和调试器失败

## 0.5.9

`UPDATE` 调试器升级到1.4.0版本，主要变更是弃用rapidjson改为nlohmann/json

`CHANGE` 重新启用工作区诊断

`UPDATE` 语言服务客户端升级到8.0.2 

`UPDATE` 最低vscode依赖版本改为1.70.0

## 0.5.8

`CHANGE` 停用工作区诊断，一般诊断改为在主线程运行

## 0.5.7

`FIX` 修复调试时，chunkname远长于打开的工作区的时候路径搜索的问题


## 0.5.6

`FIX` 试图修复卡加载问题

## 0.5.5

`FIX` 修复跳转定位错误

## 0.5.4

`CHANGE` 修改各种提示细节

`NEW` 插件支持被外部插件扩展api。

`NEW` 新的emmylua-unity插件已经上架插件商店

## 0.5.3

`FIX` 修复调试找不到路径的bug

`FIX` 修复重命名无效的bug 

`FIX` 修复override hint不可跳转的BUG

## 0.5.2

`FIX` 修复inlayhint的错乱

## 0.5.1

`CHANGE` 修改调试时命中文件的方式。

`FIX` 修复使用工作区诊断可能带来的性能问题

## 0.5.0

`CHANGE` 代码诊断，inlayHint，代码补全更新到语言服务3.17规定的方式

`CHANGE` 优化亿点细节

## 0.4.19

`FIX` 修复在某些框架下, 因为计算元表导致的栈混乱进而导致的进程崩溃。thanks `@浪迹天涯` 提供的复现工程

`NEW` emitter风格重载扩展支持到主签名的第一个参数是number时可以这样写：
```lua

---@overload fun(level: "ngx.INFO", info)
---@overload fun(level: "ngx.WARN", msg)
---@param level number
function ngx.log(level, ...) end
```

## 0.4.18

`NEW` `@field`注解现在支持数字field描述:
```lua
---@field [1] number
---@field [2] string
```
也支持数字或者字符串的索引描述:
```lua
---@field [number] string
---@field [string] string
```
几种方式可以共存于类定义。

`NEW` 支持emitter风格重载：
```lua

---@overload fun(a: "data", data)
---@overload fun(a: "listen", aa, bb, cc)
---@param a string
local function f(a, bbb)
end
```

`NEW` 枚举可以标记继承类:
```lua
---@enum aaaa: number
```
枚举继承自某类之后参数类型检查会检查参数是否符合父类。

`NEW` 支持基于枚举的重载：
```lua
---@enum IO: number
IO = {
    Input = 1,
    Output = 2
}

---@overload fun(type: "IO.Input", in)
---@overload fun(type: "IO.Output", writeHandle)
---@param type IO
local function f(type, ...)
end
```

`NOTE` 上面新增的重载风格必须是`枚举/字符串`处于函数第一个参数


## 0.4.17

`FIX` 修复参数诊断时提示的文本错误

## 0.4.16

`NEW` 实验性的支持特性`interface`该特性有如下特点:

`特点1` 接口有如下书写形式:
```lua
---@interface A
---@field a number
---@field b number
```

`特点2` 接口可以被继承：
```lua
---A是上文的interface A
---@class C : A
```
继承接口时，诊断会检查类是否实现了接口的成员

`特点3` 当接口被用作参数类型时，在函数参数验证的特性开启后，会检查传入的参数是否符合接口，如果传入的参数并非继承自该接口，或者是表表达式，则会检查是否符合接口定义的每一个成员

`限制` 接口不能继承其他类或者其他接口


`NEW` 多重接口继承，类型声明现在可以以如下形式多重继承接口
```lua
---@interface b
---@interface c

---@class a: b, c
```
`限制`: 多重继承时，仅允许继承一个class，其余的只能是interface，且class只允许出现在第一个继承位


## 0.4.15

`NEW` 当变量本身仅有一处定义，则变量被视为常量。如果变量被视作常量而且是字符串或者数值类型，则代码补全和悬浮提示变量时，显示常量。

`NEW` 重启deprecated渲染，但是仅当对应配置勾选时有效

## 0.4.14

`FIX` 修复上一个PR带来的调试假死的问题（回滚）

`NEW` emmylua调试器编译标准提高到`C++11`之前是`C++0X`

## 0.4.12

`FIX` 修复多线程问题

`FIX` 正确支持macos arm64架构下的调试

`NEW` 新增函数参数上的可空描述比如 `---@param a? number`

`NEW` 函数参数检查将会检查参数数量是否过少，如果参数过少而后续参数没有显示标记可空则会报错

`NEW` 调试时，如果不能根据chunkname找到文件会试图以以当前打开的工作区为根目录再找一次 `contribute by @whitecostume`

`NEW` 其他细节更新

## 0.4.11

`FIX` 将其他扩展后缀关联到lua时没有解析的BUG

## 0.4.10

`FIX` 修复因为诊断带来的性能问题，诊断被移到守护线程执行。代码解析完后，代码提示和相关渲染会立即可用

## 0.4.9

`FIX` 修复默认选项下解析过慢的问题, 暂时移除deprecated相关诊断 

## 0.4.8

`NEW` 不识别的Tag不再警告

`NEW` 实验性的支持一系列检查配置包括`赋值安全检查`， `子域存在性检查`, `未定义变量使用检查`, `函数参数类型安全`

`NEW` 支持类方法override父类同名函数时的hint

`NEW` 其他小细节更新

## 0.4.7

`FIX` jdk改回8

## 0.4.6

`FIX` 由于编译环境变更有许多崩溃现象，现在临时改回来

## 0.4.4

`NEW` upvalue的下划线颜色可配置，当配置内容为空的时候不显示下划线

`NEW` deprecated注解对全局函数有效

`NEW` 实验性的支持子域存在性检查

`NEW` 在定义处使用ctrl跳转会跳转到用法
## 0.4.3

`FIX` CodeLens error

## 0.4.2
`FIX` 修复@private注解不能正确作用的bug

`NEW` 支持@deprecated注解和相关的诊断

`NEW` 实验性的支持字符串内联表达式注解`string<T>`, 当函数参数使用该注解时，对应的函数调用上，字符串内会提示`T`类的field，可使用string<_G>表示字符串内提示全局变量

## 0.4.1

`FIX` 修复一个因为使用fixPath导致的崩溃

## 0.4.0

恢复更新

代码提示：
* 支持lua5.4语法
* 支持通过标注参数类型为函数，补全匿名回调函数
* 修改函数签名显示
* 支持参数类型诊断(实验性)
* 支持枚举类型标注enum(实验性)

代码渲染：
* 支持param hint
* 支持local hint
* 支持vararg hint
* 支持未使用变量渲染为灰色
* upvalue修改为黄色下划线


代码折叠：
* 支持通过--region和--endregion实现区块折叠
* 支持连续require语句折叠，连续require语句被识别为import区块，可以通过相关vscode设置直接折叠打开文件的require语句

lua语言:
* 移除lua语言定义配置文件直接采用vscode新的内建的lua语言定义

格式化:
* 移除现行的格式化算法，EmmyLua插件不再提供格式化算法
* 格式化交由插件EmmyLuaCodeStyle实现

调试:
* 支持条件断点，命中次数断点，日志记录点
* 支持lua5.4调试
* 支持苹果m1下的调试
* 附加调试支持指定匹配进程名
* 调试提供debug inline variable 
* 在windows上提供launch调试，launch调试支持使用windows terminal

JVM:
* kotlin修改为1.6版本，gradle修改为6.1.1版本
* jdk推荐使用jdk11
* JVM参数移除CMS采用G1GC

BUG:
* 修复键入代码的过程中染色错误的问题
* 修复因为外部更新没有即时刷新索引的问题
* 修复函数签名错误
* 重写调试器修复常见崩溃问题
