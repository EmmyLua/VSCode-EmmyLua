# Change Log

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
