![logo](/res/logo.png)
# EmmyLua for VSCode

VSCode version of [EmmyLua](https://github.com/EmmyLua/IntelliJ-EmmyLua)

[![Build status](https://ci.appveyor.com/api/projects/status/5psq8f7jjix23mwg?svg=true)](https://ci.appveyor.com/project/EmmyLua/vscode-emmylua)

QQ交流群：`29850775` (最新版本以及部分视频演示在群文件中下载)

[![Online EmmyLua Doc](https://img.shields.io/badge/emmy-doc-46BC99.svg?style=flat-square)](https://emmylua.github.io)
[![donate](https://img.shields.io/badge/donate-emmy-FF69B4.svg?style=flat-square)](https://emmylua.github.io/donate.html)
[![加入QQ群](https://img.shields.io/badge/chat-QQ群-46BC99.svg?style=flat-square)](//shang.qq.com/wpa/qunwpa?idkey=f1acce081c45fbb5670ed5f880f7578df7a8b84caa5d2acec230ac957f0c1716)

![snapshot](/snapshot/overview.gif)

[更新日志](CHANGELOG.md)

[CHANGELOG](CHANGELOG_EN.md)

FAQ:

Q: 为什么报找不到格式化程序？

A: 原先emmylua采用的luafmt格式化库，但是该算法基本上已经无人维护无法支持lua5.4，而且就issue来看问题也比较多，基于这样的考虑我移除了luafmt库，格式化交给EmmyLuaCodeStyle实现。

Q: 为什么附加调试没有作用？

A: 附加调试会试图获取进程内的lua符号，判断当前的lua版本，用于调试计算等。所以要求进程本身导出lua符号

Q: Emmy New Debug为什么连不上目标

A: 通常是由于插入代码require失败，或者`require("emmy_core")`返回true

Q: 项目中有很多大文件并不想参与解析如何排除？

A: 在项目根目录创建`emmy.config.json`然后如下填写:
```json
{
    "source": [
        {
            "dir": "./",
            "exclude": [
                "csv/**.lua"
            ]
        }
    ]
}
```

## 画饼(next-version)

1. 试图实现泛型类

2. 修改enum语法

3. 完善部分类型检查

4. 修改调试器的json库
