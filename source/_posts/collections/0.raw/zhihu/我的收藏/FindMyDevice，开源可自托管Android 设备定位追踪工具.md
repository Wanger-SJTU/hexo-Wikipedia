---
title: "FindMyDevice，开源可自托管Android 设备定位追踪工具"
date: "2024-10-20 00:00:00"
updated: "2024-10-20 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/FindMyDevice,开源可自托管Android-设备定位追踪工具/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/2101721601"
---


2024年3月份，Google针对Android用户推出了 [Google Find My Device](https://link.zhihu.com/?target=https%3A//blog.google/products/android/android-find-my-device/) 服务，但由于依赖于Google Play及Google Account，因此国内用户无法直接使用此服务，同时在隐私数据上会被Google获取。

```text
FindMyDevice (FMD) 是一个开源 Android 设备定位追踪工具，它的目标是成为 Google FindMyDevice 的安全开源替代品。

FindMyDevice (FMD) 可通过短信、即时通信工具或可自托管 Web 界面查找设备，并允许在设备丢失时跟踪、擦除数据和向设备发出其他命令。

FindMyDevice (FMD) 的主要功能如下：
```


- 定位设备（使用 GPS 或蜂窝定位）
- 锁定设备
- 让设备响铃
- 使用设备的相机拍照以查看周围环境
- 将设备恢复出厂设置
项目地址<strong>：</strong>[https://gitlab.com/Nulide/findmydevice](https://link.zhihu.com/?target=https%3A//gitlab.com/Nulide/findmydevice)

F-Droid：[https://f-droid.org/packages/de.nulide.findmydevice/](https://link.zhihu.com/?target=https%3A//f-droid.org/packages/de.nulide.findmydevice/)

需要说明一下，由于 FindMyDevice (FMD) 服务器使用了 [UnifiedPush ](https://link.zhihu.com/?target=https%3A//unifiedpush.org/) 来向设备推送消息，官方推荐使用 [ntfy](https://link.zhihu.com/?target=https%3A//ntfy.sh/) ，因此需要同时安装ntfy的APP。

具体使用请参考 [PushSupport](https://link.zhihu.com/?target=https%3A//gitlab.com/Nulide/findmydevice/-/wikis/PushSupport) 。

还有一些类似的开源项目，例如：

Locate My Device：[https://github.com/xfarrow/locatemydevice](https://link.zhihu.com/?target=https%3A//github.com/xfarrow/locatemydevice)

Find My Phone By Clapping ：[https://github.com/AndroidWithRossyn/Find-My-Phone-By-Clapping](https://link.zhihu.com/?target=https%3A//github.com/AndroidWithRossyn/Find-My-Phone-By-Clapping) 通过拍手查找我的手机