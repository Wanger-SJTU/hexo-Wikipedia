---
title: "Linux内核代码大佬们如何观看的？"
date: "2023-08-21 00:00:00"
updated: "2023-08-21 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/Linux内核代码大佬们如何观看的/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/439569498/answer/3175425607"
---


具体从哪开始看就不说了，我这边说下如何在阅读代码时优雅地进行跳转:

- 下载 vscode 
- 安装核心插件: c/c++ remote-ssh clangd
- 找个 linux 机器，下载编译 linux 源码
- 使用 linux 源码中自带的脚本生成 compile_commands.json
- 使用 vscode 连接 linux，就可以愉快的阅读代码了大致流程如此，实际配置新手应该早爬坑。