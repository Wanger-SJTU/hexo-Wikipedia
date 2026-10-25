---
title: "大型C++工程的构建技术：Modern CMake vs Bazel"
date: 2020-03-18
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/112712537
---

感谢评论区提醒，补充下：CMake也支持外部依赖的管理功能：也可以做到打平依赖树，上层模块依赖下层模块的任意版本。

参考ExternalProject_Add和CMake by Example

组织C/C++项目的编译，可能的方案有：

### 手写Makefile：

适合于小型项目编译。当项目中模块众多并且之间依赖关系复杂时，维护Makefile非常困难。

### Modern CMake

开源社区非常流行的build system generator，通过执行CMakeLists生成makefile/ninja等，构建C++项目。尤其是2013年以来Modern CMake的发展，理念是：一切皆为target or target property。Modern CMake通过target之间的依赖关系，实现target属性(头文件查找路径、编译选项、链接依赖)内部隐藏或者自动传递，可以非常方便地处理大型C++项目的复杂依赖关系。

相比于makefile，Modern CMake大大解放了C/C++研发人员的生产力。

### Bazel(and blade)

Bazel是Google开源的编译构建工具，以Monolithic Repository为理念。与makefile & CMake不同，Bazel另起炉灶，采用client/server运行模式，为云编译而生。Bazel工具将编译过程分三个阶段：Load Phase/Analysis Phase/Execution phase。研发人员实现workspace/build/.bzl三种文件，Bazel执行这些文件生成action graph，执行action来构建项目。

### Modern CMake vs  Bazel

共同点：给用户暴露的编译对象都是target，以及对应的各种编译属性。在处理大型C++项目的依赖关系时，都很方便。

Modern CMake优点：

- 开源社区非常成熟，遇到问题时，可获取的线上资源(stackoverflow等)很丰富。
- 更加简单，易于修改和维护。
- 用户使用的灵活性更高，用户可在CMakeLists中调用其他command(shell, built-in commands等)实现自定义功能。
Modern CMake缺点：

- 仅支持本地编译，不支持云编译
- 缺少处理依赖的功能：比如下载依赖模块、指定依赖的版本信息以及获取依赖的版本信息等。需要开发者使用其他工具(git submodule、自己实现小工具等)来实现这些功能。
Bazel优点

- 多语言支持
- client/server模式，云编译
- 非常方便的处理依赖：用户可声明依赖的地址、版本、构建规则，Bazel自动下载对应版本的依赖，并根据规则构建对应依赖的target。
- 优秀的缓存：增量编译非常快速
Bazel缺点：

- 开源社区资源匮乏（目前搜索bazel编译c++相关问题，大多跟tensorflow相关）
- 工具庞大，用户上手难度高
- 工具灵活性较低，对用户约束较多。比如：

- target使用的所有头文件都需要显式地声明（尽管支持glob）；
- gen_rule(调用自定义功能：shell等)所有输入和输出文件都需要显式声明；
- 对其他模块的依赖，只能以其整个库为形式，不能直接将其源码作为本模块target的源码使用。
- 对IDE很不友好，其下载的依赖模块以及编译的中间产出，会存放到./bazel-module/和~/.cache，而且目录层次很深。
- 依赖git仓库时，其git信息会被bazel删除。用户难以实现保存依赖的git信息。

### 个人建议

- 项目从0开始搭建，且团队无Bazel基础，推荐Modern CMake。
- 项目已经开发完成，处于维护阶段，建议Modern CMake。（迁移Bazel成本较高，没有足够的目标不建议转Bazel）
- 项目从0开始搭建，预期未来很复杂，团队有bazel基础和氛围，推荐Bazel。
