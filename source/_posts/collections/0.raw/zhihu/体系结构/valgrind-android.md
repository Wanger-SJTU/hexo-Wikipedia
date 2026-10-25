---
title: "valgrind-android"
date: 2021-02-21
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/351827480
---

### 一点点介绍

- 新整的活
- android arm64-v8a 的 valgrind 二进制包
- 直接在 android adb shell 中用 valgrind 调试
[![](asset/img_6b698ec6d395.jpg)nihui/valgrind-androidgithub.com/nihui/valgrind-android](https://link.zhihu.com/?target=https%3A//github.com/nihui/valgrind-android)

### 一点点吐嘈

- 其实 termux 上也有 valgrind 包，应该也能用
- 这个更加清真点，直接 ndk 编译出来，拷到手机上就能跑
android 正统理应用 asan simpleperf 这些小清新工具，可是成熟的 valgrind 输出信息过于友好啊。。。

### 一点点用法

- 解压上传到手机
`unzip -q valgrind-3.16.1-android.zip
adb push valgrind /data/local/tmp/
adb shell`

- adb shell 中用 valgrind 跑程序
`cd /data/local/tmp/
valgrind/bin/valgrind --tool=callgrind ./benchncnn 4 1 0 -1 0`

- 把输出的结果下载到电脑上，用工具看
`adb pull /data/local/tmp/callgrind.out.9519
kcachegrind callgrind.out.9519`

![](asset/img_14b415b9dc44.jpg)

### 于是，就这样吧
