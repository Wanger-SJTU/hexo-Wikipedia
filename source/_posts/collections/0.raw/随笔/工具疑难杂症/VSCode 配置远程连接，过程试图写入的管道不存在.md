---
title: 解决
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/随笔/工具疑难杂症/VSCode-配置远程连接,过程试图写入的管道不存在/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

#vscode

# 解决 
<strong>原因</strong>
> 本地记录的服务器信息和现有的产生了冲突

解决方法
- 方法一
> 将known_hosts文件的内容全部删除。
`C:\Users\user name\.ssh\known_hosts`

- 方法二
搜遍全网几乎都是上述方法，应该绝大部分人通过上述方法都能解决。如果你也跟我一样不走运，不管是重新生成公私钥，还是删除hnow_hosts都不行，那么可以尝试修改 VSCode 使用的ssh.exe。

Windows 下默认使用的是环境变量里配置的OpenSSH提供的ssh.exe。你可以将环境变量里的OpenSSH删除。然后在VSCode设置里搜索remote，也就是设置插件remote ssh。

