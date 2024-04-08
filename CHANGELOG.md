# Change Log

[English Change Log](CHANGELOG_EN.md)

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
