# Change Log

[中文Log](CHANGELOG_CN.md)

# 0.9.14

`CHG` Refactor `folding range`

`FIX` Fix super class completion issue

`NEW` Support `@field` function overload like:
```lua
---@class AAA
---@field event fun(s:string):string
---@field event fun(s:number):number
```

`FIX` Fix enum type check

`FIX` custom operator infer

`FIX` Fix select function and add std.Select type 

`CHG` Refactor Union type

`NEW` Add description to type

`NEW` Support description without '#' on multi union

`NEW` Add standard library translation

`NEW` Optimize inlay hint for parameter, if the parameter name is the same as the variable name, the parameter name will not be displayed


# 0.9.13

`FIX` Fix issue `emmylua_ls` might not exit in unix.

`NEW` Support TypeScript-like type gymnastics

`FIX` Fix infinite recursion issue in alias generics.

`NEW` Improve reference search

`NEW` Refactor type check

`NEW` Optimize hover

`NEW` Optimize completion

`NEW` Support `pcall` return type and check

# 0.9.12

`NEW` Support type-check when casting tuples to arrays.

`NEW` Now autocompletion suggests function overloads.

`NEW` Improved completion for integer member keys.

`NEW` Infer value by reassign

`NEW` Improved analyze base control flow

`NEW` Improved hover for class

`NEW` Optimized semantic token

`NEW` Infer Some table array as tuple

`NEW` Infer `{ ... }` as array

`NEW` Semantic Model now is immutable

`FIX` Fix inference issue by resolving iteration order problem.

`FIX` Improve type check

# 0.9.11

`FIX` Fix mac path issue

# 0.9.10

`FIX` Fix generic table infer issue

`FIX` Fix tuple infer issue

`NEW` Compact luals env variable start with `$`

`FIX` Refactor `humanize type` for stack overflow issue

`Fix` Fix a documentation cli tool render issue

# 0.9.9

`NEW` Support generic alias fold

`NEW` Support `code style check`, which powered by `emmyluacodestyle`

`NEW` Basic table declaration field names autocompletion.

`FIX` Fix possible panic due to integer overflow when calculating pows.

`NEW` Support compile by winodws mingw

`NEW` `emmylua_check` now supports `workspace.library`

`FIX` Fix std resource loaded for cli tools

`FIX` Fix `self` parameter regard as unuseful issue

`NEW` Add `emmylua_check` cli tool, you can use it to check lua code. you can install it by `cargo install emmylua_check`

`NEW` all the crates release to crates.io. now you can get `emmylua_parser`, `emmylua_code_analysis`, `emmylua_ls`, `emmylua_doc_cli` from crates.io.
```shell
cargo install emmylua_ls
cargo install emmylua_doc_cli
```

`CHG` refactor `template system`, optimize the generic infer

`FIX` now configurations are loaded properly in NeoVim in cases when no extra LSP configuration parameters are provided

`CHG` extended humanization of small constant table types

`NEW` Add configuration option `workspace.moduleMap` to map old module names to new ones. The `moduleMap` is a list of mappings, for example:

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

This feature ensures that `require` works correctly. If you need to translate module names starting with `lib` to use `script`, add the appropriate mapping here.

`CHG` Refactor project structure, move all resources into executable binary

`NEW` Add Develop Guide

`NEW` support `workspace/didChangeConfiguration` notification for neovim

`CHG` refactor `semantic token`

`NEW` support simple generic type instantiation based on the passed functions

`FIX` Fix find generic class template parameter issue

# 0.9.8

`FIX` Fixed some multiple return value inference errors

`FIX` Removed redundant `@return` in hover

`NEW` Language server supports locating resource files through the `$EMMYLUA_LS_RESOURCES` variable

# 0.9.7

`FIX` Fixed a potential issue where indexing could not be completed

`FIX` Fixed an issue where type checking failed when passing subclass parameters to a parent class

# 0.9.6

`NEW` Add progress notifications for non-VSCode platforms

`NEW` Add nix flake for installation by nix users, refer to PR#4

`NEW` Support displaying parameter and return descriptions in hover

`NEW` Support viewing consecutive require statements as import blocks, automatically folded by VSCode if the file only contains require statements

`FIX` Fix spelling error `interger` -> `integer`

`FIX` Fix URL parsing issue when the first directory under a drive letter is in Chinese

`FIX` Fix type checking issues related to tables

`FIX` Modify the implementation of document color, requiring continuous words, and provide an option to disable the document color feature

`FIX` Fix type inference issue when `self` is used as an explicit function parameter

# 0.9.5

`FIX` Fixed the error in checking asymmetric function definition calls

`NEW` Added need-nil-check diagnostics to verify if variables that may be nil are being checked

`NEW` Refactored control flow analysis to better support nil checks

# 0.9.4

`FIX` Fixed the issue where fields/functions marked with `@source` could not be navigated to

`FIX` Fixed the issue where `@class` and `@enum` annotations did not apply to table fields

`FIX` Fixed the issue where type checking could not correctly compute union types

# 0.9.3

`FIX` Fixed the method for locating variable declarations, skipping the assignment statements themselves

`FIX` Allowed setting the diagnostic interval via `diagnostics.diagnosticInterval`, default is 500

`FIX` Fixed the issue where chained calls were not inferred or prompted

# 0.9.2

`FIX` Fixed the issue with `globalsRegex` being ineffective in the configuration options

`FIX` Now re-supports defining and accessing global variables using `_G`

`FIX` Now re-supports non-strict require mode, where require paths do not need to start from the root directory. This mode requires setting `strict.requirePath` to `false`

`FIX` Fixed an issue that caused errors in document/symbol

`FIX` Fixed the issue with type inference failure for types like `{ [number]: T }`

`CHG` Optimized code by using `smol_str` more extensively

# 0.9.1

`FIX` Fixed a crash issue

`CHG` Refactored the logic related to excluding files

# 0.9.0

`CHG` use `emmylua-analyzer-rust` as the language server

# 0.8.20

`FIX` Fixed the issue with incorrect function signature judgment during consecutive calls.

`FIX` Fixed the inference problem when using alias types as keys.

`FIX` Fixed the issue where completion for constant integer fields was not working:
```lua
---@class A
---@field [1] string
local a
a[1] -- now can completion
```

`NEW` Optimized semantic tokens, which now only apply to documentation.

`NOTE` 0.8.20 is the last release version in the 0.8.x series. The version number will be upgraded to 0.9.0 in the future.

# 0.8.18

`FIX` Fixed the issue where the code completion list for parameters with enum and alias included too many quotes.

`FIX` Fixed the issue where inlineValues did not work during debugging.

`NEW` '_' is not considered an unused variable.

`NEW` Enum types can be used as keys and participate in inference.

`NEW` Added new doc snippet completion. When selecting `param;@return` on a function statement, it will automatically complete the doc for parameters and return.

`NEW` Fixed the error with multiple root directories on the IntelliJ platform.

`NEW` Added support for code formatting, which is implemented through the pinvoke reference `EmmyLuaCodeStyle`.

`NEW` VScode-EmmyLua-Unity plugin has been released. Users of Xlua can try installing and using it.

`NEW` Intellij-EmmyLua2 plugin has been released. Users on the Jetbrains platform can try using this plugin, which internally integrates `EmmyLuaAnalyzer`, `EmmyLuaCodeStyle`, and `EmmyLuaDebugger` used in vscode. In the future, `intellij-emmylua2-unity` and `intellij-emmylua2-attachdebugger` will also be available.

`NEW` Added configuration documentation: https://github.com/CppCXY/EmmyLuaAnalyzer/blob/master/docs/.emmyrc.json_EN.md

# 0.8.17

`FIX` Fixed the issue with incorrect Linux directories.

`FIX` Fixed inference issues related to the `table<TKey, TValue>` annotation.

`FIX` Fixed a bug where global variables marked as classes could not be referenced elsewhere.

`NEW` Added support for the `@source "<uri>#<line>:<col>"` annotation. When a field has this annotation, jumping will go to the specified location in the source.

`NEW` VSCode-EmmyLua-Unity will be released soon (August 8, 2024). The API exported using this plugin will follow the rules of xlua and support jumping to the corresponding C# implementation for fields.

`NEW` Enum annotation `@enum` supports `key` attribute, for example:
```lua
---@enum (key) AAA
---| CS.A.B.C AAA
```
This way, during code completion, it will automatically complete as `CS.A.B.C` instead of `AAA.CS.A.B.C`.

# 0.8.16

`CHG` All function return values are treated as new instances, and modifications to their return values are independent between different instances.

`FIX` Fixed the bug where `_G` cannot be prompted and global variables cannot be added.

`FIX` Fixed the bug where table generics cannot participate in inference.

`NEW` Introduced a special generic type, `namespace<T : string>`, which attempts to reference namespaces. For example:
```lua
CS = {
  ---@type namespace<"UnityEngine">
  UnityEngine = {},
  ---@type namespace<"System">
  System = {},
}

```


# 0.8.15

`CHG` Refactored the underlying type system and index system.

`FIX` Fixed inline values calculation error.

`FIX` Fixed a bug where the return annotation was overridden by the function return type.

`FIX` Fixed a bug where the param annotation couldn't be applied to the parameters of a for-in statement.

`FIX` Fixed diagnostics issues with private and protected visibility.

`CHG` Changed the logic of type members. Now, type members cannot be extended arbitrarily. The specific behaviors are as follows:
* If a local variable is marked as `---@class`, other files cannot inject members into that class.
* If a global variable is marked as `---@class`, members can be injected into that class from other files.
* After a local variable is returned as a module, other files cannot inject members into that module.
* A global variable can have members injected from any file.

`NEW` Added support for attribute syntax for classes, e.g., `---@class (partial) A`, `---@enum (partial) B`.

`NEW` Added support for partial class annotation. If a class is marked as a partial class, it needs to be declared as a partial class in other files to extend its members. For example, extending the string type:
```lua
---@class (partial) string
local string = string

function string:split(sep)
end
```

`NEW` Added support for exact class annotation. If a class is marked as an exact class, only the members specified by `---@field` annotations can be used and defined. For example:

```lua
---@class (exact) AA
---@field a number
local AA = {}

AA.b = 123 -- error
AA.a = 456 -- ok

```

`NEW` Added diagnostics support for `inject-field-fail`, which is disabled by default.

`NEW` Added diagnostics support for `duplicate-type`, which is enabled by default.

`NEW` Code completion will hide members that are not visible based on visibility rules.

`NEW` Introduced namespace annotation `---@namespace` to mark the namespace of the current file. For example:
```lua
---@namespace System
```
After specifying the namespace in the current file, all types defined in that file will be under the specified namespace. Classes within the same namespace can be accessed without writing the namespace prefix.

`NEW` Introduced using annotation `---@using` to easily reference types from other namespaces. For example:
```lua
---@using System
```
After specifying the using annotation in the current file, types from the System namespace can be used directly. For example:
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

`NEW` When defining a type, if the name contains a dot (.), a namespace will be automatically created. For example:
```lua
---@class System.FFC
```

`NEW` Improved reference lookup rules. When searching for references using the members of the current class, references in the current class will be prioritized, followed by references in all subclasses. References in parent classes will not be searched.

`NEW` Improved code completion. When defining function statements with code snippet completion, the function definition will mimic the previous statement.


# 0.8.12

`FIX` Fixed code completion issues.

`FIX` Fixed a bug where function return types couldn't be inferred.

`NEW` Support for using `/` as a separator in require path suggestions, navigation, code analysis, and document links.

# 0.8.10

`NEW` Upgraded the version to 0.8.10, due to significant underlying changes, the version number was incremented by several versions, but from a binary perspective, version 10 is also version 2.

`NEW` Upgraded the dotnet version to 9.0 preview.

`CHG` Removed Newtonsoft.Json and replaced it with Text.Json. Removed omnisharp/csharp-language-server-protocol and replaced it with [EmmyLua.LanguageServer.Framework](https://github.com/CppCXY/LanguageServer.Framework).

`NEW` Used dotnet9 AOT publishing to improve runtime performance, but there is not much difference in memory usage.

`NOTE` EmmyLua.LanguageServer.Framework is a LSP framework that I have redeveloped to support the latest LSP standards and be compatible with AOT compilation. Feel free to check it out if you're interested.

`NEW` Added support for configuring `workspace.ignoreGlobs` to exclude directories using regular expressions. Refer to the documentation of Microsoft.Extensions.FileSystemGlobbing for the specific format.
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

`FIX` Fixed performance issues when reading configuration tables.

`FIX` Changed the support method for other encodings, no longer requiring the creation of a .emmyrc.json file.

`FIX` Fixed an issue where word boundaries were not considered during document color rendering.

`FIX` Fixed some bugs in generic inference.

`CHG` Removed the inference that the `new` function defaults to returning its own type.

`NEW` Refactored the declaration analysis system.

`NEW` Support for expanding format arguments in string.format.

`NEW` Added support for using the annotation `---@module no-require` to indicate a file cannot be required, subsequent code completion will not show its require suggestion.

`NEW` Added support for the annotation `---@mapping <new name>` to indicate a field/variable/function can be mapped to `<new name>` for use, for example:

```lua
local t = {}
---@mapping new
t:ctor(a, b)

t:new(1, 2)
```

# 0.8.0

Starting from this version, EmmyLua has removed the Java version of the language service and only supports the dotnet version of the language service, while also deleting all configurations previously provided for the Java version of the language service.

`NEW` Debugger updated to 1.8.2, fixed an error when tcpListen localhost

`FIX` Fixed an infinite recursion crash issue

`CHG` Changed the display method of hover, cancelled the expansion for classes, all function signatures will be displayed with line breaks for parameters

`CHG` Changed the implementation method of codelens

`FIX` Addressed some issues where references could not be found

`FIX` Fixed the implementation error of Goto links on hover

`FIX` Fixed the calculation of Missing-parameter not considering mismatched definitions and calls

`NEW` Enhanced the implementation of document color, now a sequence of 6 or 8 hexadecimal digits in a string is considered as color

`NEW` Refactored the generic system, generic parameter matching supports prefix:
```lua
---@generic T
---@param a UnityEngine.`T`
---@return T
local function f(a)
    
end

local GameObject = f("GameObject") -- UnityEngine.GameObject
```

Now generics can expand function parameters, please refer to the declarations of pcall and xpcall, pcall and xpcall will now change their signatures based on the type of the first parameter.
# 0.7.7

`FIX` Fixed the bug where the language service reports an error when \u{xxx} is in the invalid area of UTF8 encoding

`FIX` Global variables are now kept unique. If a global variable definition uses emmylua doc somewhere, it is the priority definition, otherwise it is a random definition

`FIX` Avoid infinite recursive inference when alias is recursively defined

`FIX` Fixed some inference bugs

`FIX` Optimized document prompts for hover and completion items

`CHG` Now variables will not directly equal the type of the right-hand expression. Each variable has an anonymous independent type to prevent the type returned from the expression from being modified

`FIX` Fixed the inference problem of the return type of class-like functions to avoid countless types of unions

# 0.7.6

`FIX` Fixed the issue of parent class completion not working

`NEW` Added support for unpacking arrays

# 0.7.5

`FIX` Optimized subclass inference to avoid infinite recursion

`FIX` Cleaned up code, optimized memory usage, improved effective use of data structures, and reduced memory fragmentation.

`FIX` Fixed a memory leak issue

`NEW` Added new diagnostic algorithms: `no-discard`, `missing-parameter`, `disable-global-define`, `undefined-field`, `local-const-reassign`. Among them, `disable-global-define`, `undefined-field` are turned off by default.

`NEW` Added diagnostic enable configuration:
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

`FIX` Optimized code snippet completion

# 0.7.4

NO CHANGE

# 0.7.3

`CHG` Cancelled the document delay update

`NEW` Optimized the stored syntax nodes from class to struct, reducing memory usage, approximately reducing memory usage by 30%

`NEW` Optimized the snippet completion of pairs and ipairs implemented by `@whitecostume`

`NEW` Allowed `---@type` to act on tableField, for example:
```lua
local t = {
    ---@type string
    aa = 1
}
```

`CHG` Refactored the declaration and index system, preparing for other plugins

`FIX` Fixed some inference bugs

`FIX` Implemented visibility check as correctly as possible. Visibility check supports @private, @public, @protected, @package annotations, which represent private, public, protected, package four kinds of visibility. The so-called package visibility refers to visibility within the same file

`NEW` The language service will now read file association configurations from the vscode plugin end to ensure correct analysis of suffixes like .lua.txt


# 0.7.2

`NEW` CodeLens feature is enabled by default

`NEW` Support for decimals in the form of `.1`

`NEW` Workspace code diagnostics are parallelized to take full advantage of multi-core CPUs

`NEW` Document diagnostics are asynchronous and include a built-in 1-second debounce mechanism to reduce the impact on performance

`NEW` Document updates are delayed by 0.1 seconds, so the document content is not immediately updated when typing quickly

`NEW` Optimized file monitoring update mechanism within the workspace, supporting batch updates (mainly updates from version control tools like git)

`NEW` Support for callable inference of classes, for example:
```lua
---@class A
---@overload fun(a, b, c): A
A = {}

local a = A(1, 2, 3) -- A
```

`NEW` Support for strict mode configuration, the current strict mode configuration is:
```json
{
  "strict": {
    "requirePath": true,
    "typeCall": true
  }
}
```
If `requirePath` is set to `false`, it allows require paths to not start from the root directory. If `typeCall` is set to `false`, it allows direct calls of any type to return the type itself.

`FIX` Fixed some inference issues

`FIX` Fixed crashes caused by duplicate file additions when workspaces overlap

`FIX` Fixed inline comment judgment logic

`FIX` Optimized generic function inference

# 0.7.1

`FIX` Debugger rolled back to 1.7.1, the debugger will be updated in the next version

# 0.7.0

`NEW` The language service implemented in dotnet officially begins to replace the Java version of the language service. The Java version of the language service will be removed in version 1.0 and is now enabled in a legacy form.

`NEW` Debugger updated to 1.8.0

`NEW` Supports string generics, for example:
```lua
---@generic T
---@param a `T`
---@return T
function TypeOf(a)
end

local a = TypeOf("string") -- string type
```

`FIX` Fixed some issues with type inference

`NOTE` All vscode configurations are invalid for the dotnet version of the language service. Its configuration requires creating a .emmyrc.json file in the root directory. A template configuration is:

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
        "frameworkVersions": []
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

`NEW` Support for `---@verson` annotation, format: `---@version [>|<|>=|<=] [<framework>] <version>, ...`

`NEW` Support for configuring `runtime.frameworkVersions`, configuration format is:
```json
{
  "runtime": {
    "frameworkVersions": [
      "openresty 1.2.0"
    ]
  }
}
```

`NEW` Support for diagnostic.globalsRegex, used to configure the regular expression for global variables, for example:
```json
{
  "diagnostics": {
    "globalsRegex": [
      "^ngx\\."
    ]
  }
}
```

`NEW` Optimized code completion, support for tablefield completion, support for metatable field completion

`NEW` Support for CodeLens feature, enabled by configuring codeLens.enable, for example:
```json
{
  "codeLens": {
    "enable": true
  }
}
```

`NEW` The EmmyLuaAnalyzer project adds the EmmyLua.Cli project, used for generating documentation, code checking and other functions.

`NEW` The command line tool supports generating documentation, the current implementation is very rudimentary and needs optimization.

`FIX` Fixed many details of BUG

# 0.6.17

`NEW` Refactored the declaration algorithm, optimized the hover prompt. Now when hovering, alias options will be expanded, and a Go to type jump is added.

`NEW` Compatible with some of LuaLs's multiline union syntax.

`NEW` Generated a schema.json file to support completion in json files.

`NEW` Added rendering for deprecated, and some private field access checks.

`NEW` Added configuration for setting function names and file naming conventions for autoRequire completion.

# 0.6.16

`NEW` Refactored algorithm, optimized memory usage, reduced memory usage by 30%

`NEW` Supports workspace symbol search

# 0.6.15

`FIX` Fixed the documentLink error caused by the initialization problem of the configuration class

`NEW` Now all places where paths can be filled support relative paths, absolute paths, and `$ {workspaceFolder}` to represent the workspace, `~` to represent the user directory

# 0.6.14

`NEW` Added inlayHint configuration, implemented localHint and overrideHint

`NEW` Implemented DocumentLink feature, can jump to related files

`NEW` Implemented resource file completion in strings, requires adding configuration:
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

`FIX` Fixed the issue where the left-hand type would be forcibly converted to an anonymous type when the right-hand expression is unknown.

# 0.6.12

`NEW` Implemented suffix completion feature, type '@' after an identifier to get suffix completion

`FIX` Fixed the issue of double global variables

`NEW` Compatible with some luals syntax:
* Return type can be ... or ...string,
* Compatible with doc attribute, for example---@enum (partial) A, but the related function is not implemented
* Compatible with simplified description of nullable return type, for example---@return string?, but the related function is not implemented

`NEW` Support for variable template parameter declaration, mainly used to implement unpack logic, for example:
```lua
---@generic T...
---@param a [T...]
---@return T...
```

# 0.6.10

`NEW` Now supports configuring the language service from the configuration file, you can create .emmyrc.json in the workspace, the specific format is currently:

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

`NEW` Now provides workspace diagnostics and workspace disable diagnostics

`NEW` Supports configuring the root path within the workspace, so the require path will start from the root, and multiple roots can be configured

`NEW` Supports configuring third-party library directories

`NEW` Supports defining global variables through _G, for example _G.aa = 123, but the reference cannot be found currently

# 0.6.9

`FIX` Fixed global variable detection issue

`FIX` Fixed double opening file bug

`NEW` Added a large number of code snippets

`NEW` Inferred parameter types for callback functions

`NEW` Enhanced inlayHint, inlayHint on function call parameters can be clicked to jump

`NEW` Provided continue completion (converted to goto continue)

`NEW` Improved diagnostic management, can disable diagnostics for current line and current file using ---@diagnostic annotations

`NEW` Provided diagnostics for undefined global variables

# 0.6.8

`FIX` Temporarily change add to TryAdd, fix startup error

`FIX` Fix indentation in comments.

`NEW` Implicit inheritance, e.g..
```lua
---@class A
local a = enum {
    aaa = 123
}
```
At this point, class A will implicitly inherit the type of the right-hand expression

# 0.6.7

`FIX` Fix multithreading problem.

`FIX` Fix debug inline values being too high

# 0.6.6

`FIX` Fixed some completion issues

`NEW` Added a progress bar for parsing

`NEW` Replaced the debug inline values feature on the plugin side with language service implementation

`NEW` Implemented direct completion of the `self` field in function context without having to write `self`

# 0.6.5

`FIX` Fixed the bug where some global variables were not marked in red

`FIX` Re-enabled checks for goto and break statements

`FIX` Modified project exclusion logic

`FIX` Optimized memory usage

`FIX` Fixed the issue where renaming failed when the cursor was on the right side of the identifier

`FIX` The plugin attempts to read the `.luarc.json` file at startup, but the functionality is not implemented

# 0.6.4

`FIX` Fixed the issue with duplicate servers

# 0.6.3

`NEW` Support classic code rendering for EmmyLua

`FIX` Optimize memory usage slightly

`FIX` Temporarily disable error diagnostics from control flow analysis

`NEW` Fix the issue of not finding references for index expressions

`NEW` Support reading configurations, but currently has no effect


## 0.6.2

`FIX` Do not index large files (over 200kb)

## 0.6.1

`FIX` Fixed type parsing error for types like { x:number }

`FIX` Fixed reading of standard library

`NOTE` The new language service is based on dotnet sdk 8, you need to download it yourself.

## 0.6.0

`NEW` Optional use of the new language analysis backend, the new analysis backend supports more features, including but not limited to:
- True generic classes
- Complex generic function type inference
- Operator overloading
- Multiple inheritance
- Interface inheritance
- Constant completion of enum and alias
- Support for tuple types [int, int, int]
- Support for ---@async annotation
- Emmylua doc can be line-wrapped anywhere, and supports multi-line comments
- Support for color display of #123456 format text
- Support for auto require based on code completion (module has return value)
- Adjust the display of require path
- Compatible with most of LuaLs's doc annotations, but the function is not fully implemented

`NOTE` The Java version of the language service can coexist with the language service written in C#. To enable it, search for "emmylua.new" in settings, restart vscode after enabling. The version number is currently upgraded to 0.6. After 1 to 2 months of bug fixing, the version will be upgraded to 0.7, at which point the Java version of the language service will be removed. After a period of stability, the vscode-emmylua version number will be upgraded to 1.0.

The address of the new language service: https://github.com/CppCXY/EmmyLuaAnalyzer

`NEW` The debugger provides stronger customization features

## 0.5.19

`NEW` Debugger now supports IPV6 addresses. All DNS resolutions will prioritize IPV6, for example, localhost will be resolved to an IPV6 address.

## 0.5.18

`FIX` Due to updates in vscode, the net module of nodejs has issues with resolving localhost, causing the debugger to be unable to connect to the target process.

## 0.5.17

`FIX` Fixed a debugging crash issue.

## 0.5.16

`REFACTOR` Refactored launch debugging to support displaying prints in the debug window of vscode, or choosing to open a new console window for prints.

`FIX` Fixed an issue introduced by language service 0.5.15 where the workspace was not loading.

`NOTE` Minimum required vscode version is `1.79`.


## 0.5.15

`REFACTOR` Reorganized debugger adapter code structure to allow debugging in the same process as the plugin when in development mode.

`REFACTOR` Refactored debugger protocol code.

`NEW` Added support for runtime setting expressions (not effective for local variables, requires future modifications).

`REFACTOR` Refactored multithreading aspects of the language service.

## 0.5.14

`FIX` fixes debugging issues and upgrades the debugger to 1.5.1

`FIX` fixes the recursive explosion stack caused by alias when code completion

`NEW` adds an item bar that shows the running status of emmylua

`CHANGE` removes the display in the lower right corner when Java is not found

`CHANGE` allows deactivation of the emmylua language service

## 0.5.13

`FIX` fixes an issue where when using emmylua-unity, the unity class cannot be hinted after inheriting

## 0.5.12

`NEW` hasn't changed it in a long time

`NEW` the debugger was upgraded to 1.5.0

`NEW` fixes emmylua-unity related jump issues

`NEW` here reports the progress of language service development, no progress over.

## 0.5.11

`FIX` now supports opening a single file, fix the error when opening a single file language service

`FIX` returns empty when function signature is not found

`CHANGE` cancels workspace diagnostics

`CHANGE` code diagnosis is divided into two parts, one is syntax real-time checking, and the other is semantic checking. The semantic checking is only triggered when the file is opened or saved.

## 0.5.9

`UPDATE` debugger is upgraded to version 1.4.0, the main change is to deprecate rapidjson and replace it with nlohmann/json

`CHANGE` re-enables workspace diagnostics

`UPDATE` language service client upgraded to 8.0.2

`UPDATE` The minimum vscode dependency version is changed to 1.70.0

## 0.5.8

`CHANGE` disables workspace diagnostics, general diagnostics run on the main thread instead

## 0.5.7

`FIX` Fix the problem of path search when the chunkname is much longer than the open workspace when debugging

## 0.5.6

`FIX` attempts to fix card loading issues

## 0.5.5

`FIX` fix jump positioning error

## 0.5.4

`CHANGE` Modify various prompt details

The `NEW` plugin supports APIs that are extended by external plugins.

`NEW` The new emmmylua-unity plugin has been added to the plugin store

## 0.5.3

`FIX` fix bug that debug can't find path

`FIX` fix rename invalid bug

`FIX` fix the bug that the override hint cannot be jumped

## 0.5.2

`FIX` fix inlayhint's confusion

## 0.5.1

`CHANGE` modifies how files are hit when debugging.

`FIX` fixes possible performance issues with workspace diagnostics

## 0.5.0

`CHANGE` Code Diagnostics, inlayHint, Code Completion updated to language server protocol 3.17

`CHANGE` optimizes for many points of detail

## 0.4.19

`FIX` Fixed process crash caused by stack confusion caused by computing metatables in some frameworks. Thanks for the reproduction project provided by `@浪迹天涯`

The `NEW` emitter-style overload extends support to the main signature when the first parameter is number can be written like this:
```lua

---@overload fun(level: "ngx.INFO", info)
---@overload fun(level: "ngx.WARN", msg)
---@param level number
function ngx.log(level, ...) end
```

## 0.4.18

`NEW` `@field` annotation now supports numeric field descriptions:
```lua
---@field[1]number
---@field[2] string
```
Index descriptions of numbers or strings are also supported:
```lua
---@field [number] string
---@field [string] string
```
Several ways can coexist in a class definition.

`NEW` supports emitter style overloading:
```lua

---@overload fun(a: "data", data)
---@overload fun(a: "listen", aa, bb, cc)
---@param a string
local function f(a, bbb)
end
```

`NEW` enumeration can mark inherited classes:
```lua
---@enum aaaa: number
```
After an enumeration inherits from a class, parameter type checking checks whether the parameter conforms to the parent class.

`NEW` supports enum based overloading:
```lua
---@enum IO: number
io = {
     Input = 1,
     Output = 2
}

---@overload fun(type: "IO.Input", in)
---@overload fun(type: "IO.Output", writeHandle)
---@param type IO
local function f(type, ...)
end
```

`NOTE` The new overloading style above must be `enum/string` in the first parameter of the function

## 0.4.16

`NEW` Experimental support feature `interface` This feature has the following characteristics:

`Feature 1` interface has the following written form:
```lua
---@interface A
---@field a number
---@field b number
```

`Feature 2` interfaces can be inherited:
```lua
---A is the interface A above
---@class C : A
```
When inheriting an interface, the diagnostic checks if the class implements the members of the interface

`Feature 3` When an interface is used as a parameter type, after the function parameter verification feature is enabled, it will check whether the incoming parameter conforms to the interface. If the incoming parameter is not inherited from the interface or is a table expression, then Will check each member of the interface definition for conformity

`Restriction` interface cannot inherit from other classes or other interfaces


`NEW` Multiple interface inheritance, type declarations can now multiple inherit interfaces in the following form
```lua
---@interface b
---@interface c

---@class a: b, c
```
`Restriction`: In the case of multiple inheritance, only one class is allowed to inherit, the rest can only be interfaces, and the class is only allowed to appear in the first inheritance bit

## 0.4.15

`NEW` When the variable itself has only one definition, the variable is treated as a constant. If the variable is treated as a constant and is a string or numeric type, the constant is displayed when the code completion and hover prompts the variable.

`NEW` restarts deprecated rendering, but only when the corresponding configuration is checked

## 0.4.14

`FIX` Fix the problem of suspended animation caused by the last PR

`NEW` emmylua debugger compilation standard raised to C++11

## 0.4.12

`FIX` fixes multithreading issues

`FIX` correctly supports debugging under macos arm64 architecture

`NEW` Added nullable descriptions on function parameters such as `---@param a? number`

`NEW` The function parameter check will check whether the number of parameters is too small. If there are too few parameters and the subsequent parameters do not display the mark and can be empty, an error will be reported

`NEW` When debugging, if the file cannot be found according to the chunkname, it will try to find it again with the currently open workspace as the root directory `contribute by @whitecostume`

`NEW` other details update

## 0.4.11

`FIX` A bug that is not resolved when other extension suffixes are associated with lua

## 0.4.10

`FIX` fixes performance issues due to diagnostics being moved to daemon thread execution. Code hints and associated rendering are available immediately after code parsing

## 0.4.9

`FIX` fix the problem that the parsing is too slow under the default option, temporarily remove the deprecated related diagnosis

## 0.4.8

`NEW` unrecognized tags no longer warn

`NEW` experimentally supports a series of check configurations including `assignment safety check`, `subdomain existence check`, `undefined variable usage check`, `function parameter type safety`

`NEW` supports hint when class method overrides the function of the same name of the parent class

`NEW` other small details update

## 0.4.7

`FIX` jdk changed back to 8

## 0.4.6

`FIX` has many crashes due to changes in the compilation environment, and is now temporarily changed back 
## 0.4.4

The underline color of `NEW` upvalue can be configured. When the configuration content is empty, the underline will not be displayed.

`NEW` deprecated annotation is valid for global functions

`NEW` experimental support for subdomain existence check

`NEW` Use ctrl jump at definition to jump to usage 

## 0.4.3

`FIX` CodeLens error

## 0.4.2
`FIX` fix the bug that @private annotation does not work correctly

`NEW` supports @deprecated annotations and related diagnostics

`NEW` experimentally supports the string inline expression annotation `string<T>`. When the function parameter uses this annotation, the corresponding function call will prompt the field of the `T` class in the string, you can use string <_G> indicates the prompt global variable in the string 

## 0.4.1

`FIX` fix a crash caused by using fixPath

## 0.4.0

Resume update

Code hints:
* Support lua5.4 syntax
* Support to complete anonymous callback functions by marking the parameter type as a function
* Modify function signature display
* Support parameter type diagnosis (experimental)
* Support enumeration type annotation enum (experimental)

Code rendering:
* Support param hint
* Support local hint
* Support vararg hint
* Supports rendering of unused variables as gray
* upvalue modified to yellow underline


Code folding:
* Support for block folding via --region and --endregion
* Support continuous require statement folding, continuous require statements are recognized as import blocks, and require statements that open files can be directly folded through the relevant vscode settings

lua language:
* Remove the lua language definition configuration file and directly use the new built-in lua language definition of vscode

format:
* Remove the current formatting algorithm, the EmmyLua plugin no longer provides formatting algorithms
* Formatting is implemented by the plug-in EmmyLuaCodeStyle

debugging:
* Support conditional breakpoints, hit count breakpoints, logging points
* Support lua5.4 debugging
* Support debugging under Apple m1
* Additional debugging support specifying matching process name
* Debug provides debug inline variable
* Provide launch debugging on windows, launch debugging supports the use of windows terminal

JVM:
* Kotlin is modified to version 1.6, and gradle is modified to version 6.1.1
* jdk recommends using jdk11
* JVM parameter removed CMS using G1GC

BUG:
* Fix the problem of coloring error when typing code
* Fix the problem that the index is not refreshed immediately due to external updates
* Fix function signature error
* Rewrite the debugger to fix common crash issues 
