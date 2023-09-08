# Change Log


## next

A completely new language service is under development, and the project is rewritten using C#.

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
