# Change Log

## 0.4.0

恢复更新

代码提示：
* 支持lua5.4语法
* 支持常见的hint
* 支持通过标注参数类型为函数，补全匿名回调函数
* 支持参数类型诊断(实验性)
* 修改函数签名显示
* 移除语言定义配置文件直接采用vscode新的lua语言定义

格式化:
* 移除现行的格式化算法EmmyLua插件不再提供格式化算法
* 格式化交由插件EmmyLuaCodeStyle实现

调试:
* 支持条件断点，命中次数断点，日志记录点
* 支持lua5.4调试
* 支持苹果m1下的调试
* 附加调试支持指定匹配进程名
* 调试提供debug inline variable 
* 在windows上提供launch调试，launch调试支持使用windows terminal
