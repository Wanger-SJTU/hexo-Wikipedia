---
title: "有做过嵌入式ota升级的大佬嘛？"
date: "2024-05-12 00:00:00"
updated: "2024-05-12 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/有做过嵌入式ota升级的大佬嘛/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/571903144/answer/3495840731"
---


google 有个二进制增量ota升级的例子，挺有借鉴意义的。

之前做ota的时候检索到了，但开发时间很紧凑，只是简单做了文件级别的diff patch，没有做二进制级别的diff patch，还是很遗憾。

OTA 在技术层面，就是下载一个文件包替换掉本地的程序。

最基本的，就是下载新版，删掉旧版。

为了减少更新文件下载数据量和更新时间，可以做增量更新。就是根据新旧两版固件的差异生成diff，再把diff patch到旧固件上。

增量更新，又可以做到不同的粗细级别。

粗级别的，就是文件级别。如果文件不同了，就更新文件。文件相同的，不用动。

细级别的，文本类型的文件，可以按照行来处理。一行内容不同的，更新这一行。一行内容相同的，不用动。

最细的，针对可执行程序而言，就是二进制机器编码级别的，根据汇编代码，比较差异。代码不同的，更新。代码相同的，不用动。