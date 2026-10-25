---
title: (1 条消息) 一种将LLVM Pass集成到NDK中的通用方法
date: "2022-02-17 00:00:00"
updated: "2022-02-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/一种将LLVM-Pass集成到NDK中的通用方法/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/468774258
---


本文为看雪论坛优秀文章**看雪论坛作者ID：34r7hm4n

关于“如何将自己写的LLVM Pass集成到NDK中”这个问题，目前网上并没有很完美的方法，并且大多数已经过时。史上最优雅的NDK加载pass方案此贴中提出的方法也很麻烦，在我看来并不算太“优雅”。经过我的一番折腾，最终摸索出了一种比较简单实用的方法，可供参考。

简单来说，本文要介绍的方法是下载NDK中llvm-android部分的源码，在llvm-android中的llvm-project子项目中加入自己的Pass后与整个项目一起编译，用编译好的文件替换掉NDK中的工具链。

该方法有以下优点：

- Windows、macOS、Linux通用，各NDK版本也通用
- 理论上加入自己的Pass后不会出现不兼容的问题
- 操作过程简单易懂

当然也有缺点：

- 无法直接照搬OLLVM、Hikari、Armariris等现成项目的源码，需要手动做一些迁移
- 第一次编译比较耗时

### 一、操作流程


本文并不是直接将最终的操作方法摆在大家面前，还讲解了为什么要这么操作，因此过程会显得较冗长，需要有一点耐心看下去。

#### 1、环境准备

如果是Windows，首先需要准备Linux虚拟机进行交叉编译，因为NDK不支持在Windows上直接编译，我这里使用的是Ubuntu 20.04.3；macOS则不需要。NDK版本我选择的是23.1.7779620。

本文以Windows+Linux虚拟机为例讲解，macOS下的操作大同小异。

以下使用的指令全部以root权限执行。

#### 2、下载 llvm-android 源代码

NDK使用的是git-repo这一工具管理，而不是git，所以首先需要安装git-repo：

curl https://storage.googleapis.com/git-repo-downloads/repo > /usr/bin/repo
chmod a+x /usr/bin/repo`

上面这个地址需要科学上网才能访问，我们可以换成国内的清华源：

curl https://mirrors.tuna.tsinghua.edu.cn/git/git-repo > /usr/bin/repo
chmod a+x /usr/bin/repo`

在$NDK_PATH\toolchains\llvm\prebuilt\windows-x86_64\AndroidVersion.txt中查看NDK使用的LLVM版本，在我使用的NDK中，AndroidVersion.txt 的内容是：

12.0.8
based on r416183c1`

在https://android.googlesource.com/toolchain/llvm_android/中找到对应版本的 llvm-android 源码：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8cecb54c47ae.jpg)

Google的文档中给出了下载 llvm-android 源代码的方法，但这里默认下载的是最新版本：

mkdir llvm-toolchain && cd llvm-toolchain
repo init -u https://android.googlesource.com/platform/manifest -b llvm-toolchain
repo sync -c`

我们需要做一些操作来换成我们想要的版本，在$NDK_PATH\toolchains\llvm\prebuilt\windows-x86_64目录下找到一个 manifest_xxxx.xml 文件，我这里是 manifest_7714059.xml。执行完下列指令后：

mkdir llvm-toolchain && cd llvm-toolchain
repo init -u`

将 manifest_7714059.xml 复制到.repo/mainifests文件夹中（注意.repo是隐藏文件夹，并且从Windows复制到Linux会有格式转换的问题，这里建议使用VSCode的SSH-Remote插件避免上述问题）：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3b3d30203d95.jpg)

继续执行：

repo -m manifest_7714059.xml
repo sync -c`

这里也要把Google的地址换成清华源，替换规则见 Android 镜像使用帮助，替换后完整的指令如下：

mkdir llvm-toolchain && cd llvm-toolchain
repo init -u
https://mirrors.tuna.tsinghua.edu.cn/git/AOSP/platform/manifest -b llvm-toolchain
repo -m manifest_7714059.xml
repo sync -c`

并且 manifest_7714059.xml 中的包含地址也要替换，否则即使科学上网，在下载的时候也非常慢：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_39ee90770859.jpg)

repo sync -c指令会下载一大堆的源代码和预编译文件，需要耗费十来分钟的样子，喝杯茶慢慢等吧。

#### 3、编译 llvm-android 源代码

在编译之前需要提前安装一些环境，否则编译会出错：

`apt install cmake bison`

如果是在Ubuntu 20.04.3下还需要做一个软链接，否则会报错ImportError: libffi.so.6: cannot open shared object file: No such file or directory。具体操作如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_15ab2a4b615c.jpg)

然后就可以开始愉快且漫长的编译了（大概需要一两个小时，取决于机器性能）：

`python toolchain/llvm_android/build.py --no-build linux`

因为我是在Windows环境使用NDK，所以无需编译Linux下的toolchain，这里加上--no-build linux参数。

另外编译的时候最好把虚拟机内存开到8G以上，我开的是8G内存，编译的时候还会因为内存不足时不时中断，如果中断了重新运行编译指令就好。

编译结束后可以在out文件夹中找到编译好的内容：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3f1659a7eb2a.jpg)

#### 4、加入自己的 Pass 并重新编译

在这里我要推销一下我的项目Pluto-Obfuscator ，如果使用的是OLLVM, Armariris等，需要注意一下版本适配的问题。

此时我们需要向toolchain/llvm-project/llvm/lib/Transforms/Obfuscation/中加入自己的代码：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7048897aadec.jpg)

向toolchain/llvm-project/llvm/lib/Transforms/IPO/PassManagerBuilder.cpp中加入几段代码：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_47175375acfb.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_97493145d4ac.jpg)

修改toolchain/llvm-project/llvm/lib/Transforms/IPO/CMakeLists.txt：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a4fe468f6ad5.jpg)

改好之后重新编译，重新编译的速度会快很多，一分钟左右就能搞定：

`python toolchain/llvm_android/build.py --no-build linux`

编译好后out/install/windows-x86/clang-dev中对应的就是NDK中的toolchains\llvm\prebuilt\windows-x86_64部分：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5e74fa9cd1f2.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_91d96de8758a.jpg)

少了一些东西，但是无关紧要，我们直接替换就好。

### 二、效果测试

我复制了一份NDK，命名为pluto-r23，并将其中toolchains\llvm\prebuilt\windows-x86_64文件夹里的内容替换成我们刚刚编译的内容：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5897d59706ef.jpg)

随便写一个Native项目测试：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7297833c99be.jpg)

设置NDK地址：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3aa6a72177d2.jpg)

加上混淆参数：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_75de20195712.jpg)

编译然后查看混淆效果：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4a37788394d1.jpg)

X86架构和ARM架构均混淆成功：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ea05a4d1aa9d.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0c34f87ade49.jpg)

​

阅读原文：[一种将LLVM Pass集成到NDK中的通用方法](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/CFnCzy_VcRk-fr7pqRZ0FA)
