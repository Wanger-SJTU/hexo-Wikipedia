---
title: 笔记本出厂预装win8.1装了别的系统后恢复能激活吗？
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/学习/笔记本出厂预装win8.1装了别的系统后恢复能激活吗/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/263819434/answer/276342581
---


更新一下。

首先，答案是可以的。

win8以后的预装系统的系列号**保存在主板中**，如果想恢复正版，需要重新安装**win8.1中文版**或者**win10家庭中文版**，安装后下载aida64，运行，找到主板，里面有个ACPI，点进去，找到msdm这一项，把里面的系列号输进去，联网就可以激活。

![](/images/collections/0.raw/zhihu/%25E5%25AD%25A6%25E4%25B9%25A0/asset/img_fcb6ffb65ecb.jpg)![](/images/collections/0.raw/zhihu/%25E5%25AD%25A6%25E4%25B9%25A0/asset/img_a8f5977edc33.webp)

右键单击此电脑（这台电脑），点属性，单击右下角的更改产品密钥。

![](/images/collections/0.raw/zhihu/%25E5%25AD%25A6%25E4%25B9%25A0/asset/img_39005a34a263.jpg)![](/images/collections/0.raw/zhihu/%25E5%25AD%25A6%25E4%25B9%25A0/asset/img_20a1b478b5a3.webp)

输入提取出来的产品密钥，单击下一步。

![](/images/collections/0.raw/zhihu/%25E5%25AD%25A6%25E4%25B9%25A0/asset/img_2450d7f02e24.jpg)

单击激活，（此步需要联网）。

![](/images/collections/0.raw/zhihu/%25E5%25AD%25A6%25E4%25B9%25A0/asset/img_2ebf86bb31e3.jpg)

![](/images/collections/0.raw/zhihu/%25E5%25AD%25A6%25E4%25B9%25A0/asset/img_ba413164366c.jpg)

值得注意的是，因为Win8.1和Win10均使用OA3激活，因此无论你的预装系统是Win8.1中文版还是Win10家庭中文版，在使用此方法激活之后均会获得数字权利。

![](/images/collections/0.raw/zhihu/%25E5%25AD%25A6%25E4%25B9%25A0/asset/img_d42c78e8ee75.jpg)

以后重新安装Win10家庭中文版，在联网之后会自动激活。

因为正版升级的原因，只要你有正版序列号（需要OEM或零售的），都可以获得正版Win10。换句话说如果是预装的正版系统，想升级win10的话，可以在安装完Win10之后直接输入win7,8,8.1的序列号，这样的win10也是正版，但是需要安装正确的系统版本。

windows/8.1的序列号可以激活的win10版本如下：

windows7家庭基础版，家庭高级版可以激活windows10家庭版

windows 8,8.1中文版可以激活windows10家庭中文版（不是家庭版）

windows /8.1 专业版可以激活windows 10专业版

windows 7旗舰版可以激活windows10专业版。

注：1、windows10的版本要在10586以上，最好是最新的1803（17134）。

2、windows 7,8,8.1的序列号为OEM密钥（就是主板里面的或者机身上贴的）或者是retail密钥（就是零售版），vol版的gvlk密钥无效，mak密钥有机率成功。

3、预装win7的序列号一般在背后的标签上。

如果实在不会操作，可以用下面的工具直接提取密钥。

[编辑于 2018-08-19 12:40](//www.zhihu.com/question/263819434/answer/276342581)

​​184 ​31 ​分享

​​

收起​
