---
title: (2 条消息) 关于vs code无法远程连接至centos7服务器的解决方案
date: "2025-05-29 00:00:00"
updated: "2025-05-29 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/关于vs-code无法远程连接至centos7服务器的解决方案/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1909663308669260068
---


问题来源：由于vs code在1.85的版本之后，对远程服务器端的glibc要求版本大于等于2.28，导致glibc=2.17的centos7无法连接使用。（我这里的centos版本是7.9.2009，内核版本为3.10.0-1160.119.1.el7.x86_64）

解决方案：考虑到给系统升级glibc的风险过大，我决定在我的用户目录下编译出glibc 2.28，然后用pathelf把vs code的服务器端的调用挪到我自己编译的glibc上。

实现过程：

$#### &#x7B2C;&#x4E00;&#x6B65;&#xFF1A;&#x4E0B;&#x8F7D;&#x5E76;&#x7F16;&#x8BD1; glibc 2.28 &#x5230;&#x7528;&#x6237;&#x76EE;&#x5F55;" role="presentation">第一步：下载并编译 glibc 2.28 到用户目录\enclose{horizontalstrike}{\text{第一步：下载并编译 glibc 2.28 到用户目录}} $

#### 第一步：使用crosstool来编译工具链（glibc）

不想自己编译的也可以去下载现成的编译好的glibc库，但是不确保能用：[https://github.com/liuliping0315/glibc2.28_for_CentOS7/tree/main](https://link.zhihu.com/?target=https%3A//github.com/liuliping0315/glibc2.28_for_CentOS7/tree/main)先下载crosstool

`wget http://crosstool-ng.org/download/crosstool-ng/crosstool-ng-1.25.0.tar.bz2`

这里我用的是1.25的版本，安装过程参考：[Installing crosstool-NG](https://link.zhihu.com/?target=https%3A//crosstool-ng.github.io/docs/install/)

安装完成后，建立一个编译工作目录，进入目录后，下载vscode官方给的[config](https://link.zhihu.com/?target=https%3A//github.com/microsoft/vscode-linux-build-agent/blob/main/x86_64-gcc-8.5.0-glibc-2.28.config)并重命名为.config。

> 这里有第一个坑**，如果你就用这个config的话，会提示kernel too old，所以我们还要设置一下。

运行：

`ct-ng menuconfig`

在Operating System--Version of linux中选择3.10.108，C-library--Minimum kernel version to support中填入你的内核版本，我这里填的是3.10.0。然后保存退出。

然后可以通过crosstool来编译了：

unset LD_LIBRARY_PATH   #这个环境变量会导致build报错，所以要先删除掉
ct-ng build`

编译后 glibc 会安装在：当前目录`x86_64-linux-gnu/x86_64-linux-gnu/sysroot/`下的lib中。

#### \enclose{horizontalstrike}{\text{第二步：确定你的 VS Code Server 路径}}

#### 第二步：安装patchelf

这里之所以不用确定vs code server的路径是因为确定了也没用。用新版本的vs code连接远程服务器时，它会自动下载server端，但是一旦运行失败，vscode会“优雅”退出，把server端删个精光。

<strong>这里有第二个坑</strong>，vscode官方推荐的pathelf版本是0.18，但是！这个版本会导致出错，可能是因为centos7太老了，新版本反而支持的不好，我用的是0.15版本。根据[安装说明](https://link.zhihu.com/?target=https%3A//github.com/NixOS/patchelf)，安装好patchelf即可。

#### \enclose{horizontalstrike}{\text{ 第三步：使用 patchelf 修改 node} } 

#### 第三步：使用环境变量来patch`node` 

感谢用户张如意分享的信息：

安装好patchelf后，可以通过设置环境变量来自动patch，这样当有新版本的vscode客户端连接时，它会自动patch：

- 准备好patchelf和glibc
- 创建三个环境变量（可以放在~/.bashrc中）:

- VSCODE_SERVER_CUSTOM_GLIBC_LINKER** path to the dynamic linker in the sysroot (used for `--set-interpreter` option with [patchelf](https://link.zhihu.com/?target=https%3A//github.com/NixOS/patchelf))
- <strong>VSCODE_SERVER_CUSTOM_GLIBC_PATH</strong> path to the library locations in the sysroot (used as `--set-rpath` option with [patchelf](https://link.zhihu.com/?target=https%3A//github.com/NixOS/patchelf))
- <strong>VSCODE_SERVER_PATCHELF_PATH</strong> path to the [patchelf](https://link.zhihu.com/?target=https%3A//github.com/NixOS/patchelf) binary on the remote host
<strong>这里有第三个坑</strong>，就是patchelf --set-rpath是不会优先去指定的目录找链接库的，所以还是会调用系统的glibc，导致出错。解决方案是加上--force-rpath参数，但是我们是通过环境变量让vscode自己patch的，它patch的时候不会加这个参数，所以我们只能自己写一个脚本来骗过它。创建fake-patchelf文件

#!/bin/bash
# 这个脚本替代 VS Code 的 patchelf，自动加上 --force-rpath

# 检查是否包含 --set-rpath 参数
has_rpath=0
for arg in "$@"; do
  if <span class="wikilink wikilink--missing" title="未导入的页面">&quot;$arg&quot; == &quot;--set-rpath&quot;</span>; then

```text
    has_rpath=1
    break
  fi
```

done

if <span class="wikilink wikilink--missing" title="未导入的页面">$has_rpath -eq 1</span>; then
  exec /usr/local/bin/patchelf --force-rpath "$@"     #这里的路径是你安装的patchelf的路径

```text
else
  exec /usr/local/bin/patchelf "$@"
```

fi `

然后在环境变量中指向这个fake-patchelf即可，我这里贴出我的环境变量以供参考：

export VSCODE_SERVER_PATCHELF_PATH="$HOME/local/fake-patchelf"
export VSCODE_SERVER_CUSTOM_GLIBC_PATH="$HOME/local/x86_64-linux-gnu/x86_64-linux-gnu/sysroot/lib"
export VSCODE_SERVER_CUSTOM_GLIBC_LINKER="$HOME/local/x86_64-linux-gnu/x86_64-linux-gnu/sysroot/lib/ld-linux-x86-64.so.2"`

此时用新版本的vscode连接，应该就能成功了。

<strong>过程中的坑：</strong>

- Centos7中自带的make版本是3.8，不满足glibc2.28的最低编译要求，所以要升级到4.0以上，但是很坑的是如果你升的太新（make 4.4），编译过程会卡死，我降级到4.1版本顺利通过。（用crosstool编译工具链的话不用管这个）