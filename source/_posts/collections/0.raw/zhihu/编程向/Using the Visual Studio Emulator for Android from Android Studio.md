---
title: Using the Visual Studio Emulator for Android from Android Studio
date: "2016-09-24 00:00:00"
updated: "2016-09-24 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/Using-the-Visual-Studio-Emulator-for-Android-from-Android-Studio/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/22593417
---


Visual Studio Emulator for Android 是<strong>微软公司</strong>推出的安卓模拟器，由于其流畅程度可以和实体真机相媲美，所以受广大安卓开发者的喜爱。

根据@叛逆者

 的回答：“<strong>1. 里面运行的是x86的，利用hyper-v的硬件虚拟化执行，效率远高于QEMU的arm转x86。2. 部分用了我的图形驱动</strong>（臭不要脸一下）”

最近看见学习安卓开发的同班同学使用的模拟器太慢，还记得微软发布过这个，所以就查了查试了一下，结果大惊！写了这篇文章。

Visual Studio Emulator for Android 可以随同Visual Studio 2015 一同安装也可以[<strong>单独下载</strong>](/)进行安装。（我在 Windows 10 Build 10586上试过，但是由于一个bug导致不能运行，但是已在 Windows 10 Build 14393上 修复）

注：Visual Studio Emulator for Android 是运行在Hyper-V上，所以系统就需要专业版 Windows 版本。我的是 Windows 10 Pro ,电脑为 Surface Pro 4 i5 8G 256GB，微软天猫旗舰店购买，学生买打9折（逃  突然想到了轮子哥 @vczh

**<strong>，买时预装 Windows 10 10586 中文家庭版，后来用MSDN上的Key升级到 Pro .</strong>

<strong>必须打一下广告 ：) ，Surface Pro 4 性能有多强悍，装有 Visual Studio Enterprise 2015，SQL Server 2016，Office 365 订阅的 Office 2016 , Adobe Dreamweaver CC 2015 ，Adobe Photoshop CC 2015，Eclipse ，安装了商店里的多数优秀的应用。还有就是 Android Studio ,发现这个吃内存~  现在硬盘还有120GB。</strong>

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_6629f56b873a.png)

<strong>Hyper-V</strong>

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_8847b315ddae.png)

既然是安卓模拟器，安卓开发者肯定会选择 Android Studio 与其组合使用（Visual Studio 2015 才是宇宙间最好的开发工具 ：)）。下面是如何在 Android Studio 里调用 Visual Studio  Emulator for Android 进行开发部署应用并进行调试。

首先，安装完 Visual Studio Emulator for Android 是这个样子滴！（刚安装完只有两个可以直接使用的模拟器，默认为
API 19（Andorid 4.4）的x86镜像

，需要根据需求下载合适的模拟器，下载速度还是很快滴！）

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_13fd089b438d.png)

Android Studio 是使用 adb** 作为桥梁来连接Visual Studio Emulator for Android

 。

接下来是有图有真相  :)      Android Studio 为<strong>2.2</strong>

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_344bef6213c4.png)

该如何设置？

<strong>1.</strong><strong>设置 Android Studio 可以使用这些模拟器</strong>

打开 <strong>Android Studio > Run > Defaults > Android App > General > Deployment Target Options</strong> , 在 Target 选项卡里选择 <strong>Open Select Deployment Target Dialog</strong> , 并勾选下方的 <strong>Use same device for future launches</strong> , 点击下方的 <strong>Apply</strong> 按钮，最后点击<strong>OK</strong>。

注：不同的 Android Studio 版本 Defaults 下方可能不是 <strong>Android App</strong> ,而是<strong>Android Application</strong>,但基本选项都是一样滴！ 还有<strong>General</strong>里的 <strong>Deployment Target Options</strong> 可能名<strong>Target Device</strong> ,需选择里面的 <strong>Show chooser dialog</strong>,并勾选下方的 <strong>Use same device for future launches</strong>。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_25d50019c613.png)

<strong>2.</strong>**在
Android Studio 里添加启动模拟器的快捷按钮

点击 Android Studio 左上方的 <strong>File > Settings > Tools > External Tools</strong> ,在右上方选择 Add 按钮（对，就是那个绿色的 <strong>+</strong> 符号）

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_ae170421e55f.png)

在弹出的 <strong>Edit Tool</strong> 窗口中的 Name: 里输入一个名字，名字尽可能要标注一下 安卓的版本号和 API xx。便于以后使用的识别。 

在 <strong>Tools settings</strong> 的 <strong>Program</strong> 输入 Visual Studio Emulator for Android 的安装路径，默认为<strong>C:\Program Files (x86)\Microsoft Emulator Manager\1.0\emulatorcmd.exe</strong>，如果安装到其他的位置可定位到其路径。<strong>Parameters</strong> 里为 模拟器的参数，这时需要在 <strong>cmd</strong> 里定位到 emulatoremd.exe 的路径，并输入 “
<strong>emulatorcmd.exe /sku:Android list /type:device</strong> ”获取虚拟器的序列号。在 <strong>Parmeters</strong> 输入<strong>/sku:Android launch /id:</strong> 序列号

我选择的是 

<strong>363F7AED-462C-46BD-9FEC-F1DD3B79916C | 5" KitKat (4.4) XXHDPI Phone | 1.0.60404.1</strong>

<strong>所以应该输入 /sku:Android launch /id:363F7AED-462C-46BD-9FEC-F1DD3B79916C</strong>

<strong>意思是要启动以安装的哪一个模拟器</strong>

最后在 Working directory 里输入 <strong>$ProjectFileDir$ (官方是这么给出的)</strong>

<strong>最后点击 Ok!</strong>

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_a2a5284b23bd.png)

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_42ef9f388fe4.png)

<strong>3. 在 Android Studio 上方的任务栏里添加 已经添加模拟器的图标</strong>

<strong>右键点击上方任务栏里空白的区域，点击 Customize Menus and Toolbars... 即自定义菜单</strong>

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_008b23b11333.png)

<strong>在弹出的窗口中选择 Main menu > Main Toolbar > Android.MainToolBarActionGroup</strong>,点击右上方的 <strong>Add After</strong>

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_729e2fa95c1c.png)


<strong>在弹出的新窗口中点击 External Tools > External Tools ,这时可以看见我们在设置已添加模拟器的名字，我的是 VS Emulator (4.4 API 19) ，所以选择这个，最后点击OK !</strong>

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_28ea475e5a84.png)

<strong>点击OK之后 就会发现新的自定义小图标已经出现了 ！</strong>

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_655423a827f0.png)


<strong>点击这个小图标之后就可以启动模拟器了。</strong>

****

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_35d88ab05d8d.png)

****不是说只有在这个才可以启动模拟器，在刚安装完 Visual Studio Emulator for Android 之后就可以启动模拟器了。![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_8502909fbbfc.png)


<strong>但这时只是启动了模拟器还不可以进行应用的部署，和调试。</strong>

<strong>当然第一次启用不同的模拟器还需要下载相关的 Android SDK。点击上方的启动按钮。</strong>

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_4614f519b612.png)

<strong>之后弹出 Select Deployment Target 窗口，这时我们会看见我们已经设置的模拟器出现在这里了。</strong>

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_6b9d239e00d4.png)


<strong>点击OK，就可以把应用部署到这个模拟器里了。</strong>

<strong>注：如果点击发射按钮之后在</strong><strong>Select Deployment Target 没有出现我们已经设置的模拟器就需要在注册表里设置一下。</strong>

<strong>Windows + R</strong>打开<strong>Run,</strong>并在里面输入<strong>regedit</strong>,然后依次选择<strong>HKEY_LOCAL_MACHINE > SOFTWARE > WOW6432Node ，</strong>新建一个 <strong>Key ，</strong>命名为<strong>Android SDK Tools</strong>，在这个上新建一个 <strong>String Value</strong>,命名为 <strong>Path</strong> ,里面的值为 <strong>Android SDK 的安装路径。</strong>

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_35256b9ba8bf.png)

<strong>看见微软的实力了吧！ 别人家的产品都做得这么流畅~ 而自己的亲儿子 Windows Mobile  ~</strong>

<strong>参考文章：Using the Visual Studio Emulator for Android from Android Studio or Eclipse with ADT</strong>

<strong>----------------------------------------------------</strong>

<strong>已更新部分知友们遇到的问题：</strong>

<strong>1 . Hyper-V 与第三方的虚拟机不能共存问题</strong>

<strong>Visual Studio Emulator for Android 运行在 Windows 的 Hyper-V 之上，由于虚拟化原因，Hyper-V 和 其他的虚拟机只能开启一个。也就是说如果开启之后 Visual Studio Emulator for Android 之后，是无法使用其他安卓模拟器。 （微软发布的模拟器这么流畅好用，没有理由再选择其他的模拟器了啊~</strong>

<strong>不算是终极的解决办法：</strong>

<strong>可以打开 cmd （可能需要管理员权限），在里面输入 （之间有空格）：</strong>

<strong>bcdedit /set hypervisorlaunchtype off</strong>

<strong>之后 Hyper-V 的 launchtyper 应该是被关掉了。应该需要重新启动计算机，重新启动之后就可以使用第三方的虚拟机了。在微软还没有正式发布 Windows 10 Build 14393 之前，我是在VMware 上安装的 Ubuntu ，由于 Hyper-V 与VMware 无法共存，所以就用了这个办法解决的。</strong>

<strong>如果想再次使用Hyper-V，可以再次打开 cmd ，在里面输入（之间有空格）：</strong>

<strong>bcdedit /set hypervisorlaunchtype auto</strong>

<strong>这时 Hyper-V 的 launchtype 应该是被开启了。应该需要重新启动计算机，重新启动之后就可以使用 Hyper-V了，这时第三方的虚拟机是无法使用滴！ (Hyper-V这么强大，没有理由选择其他的虚拟机啊。 并且 在Windows 10 Build 14393上，微软也内置一个 Ubuntu 的子系统，也就没有必要再使用 VMware 了。 微软变得越来越深入民心~ 开森~</strong>

<strong>如果非得比较一下Hyper-V 和 VMware 谁更优秀或者改用哪一个，我只想说每一个人都有自己的信仰，喜欢哪个就用哪个。</strong>

<strong>还有 Windows 10 Build 14393上已经内置了 Ubuntu ，而且性能还很不错，肯定比安装在虚拟机上要强，不是特殊需求，目前Ubuntu还是可以满足需求的。</strong>

<strong>参考文章：BCDEdit /set</strong>

<strong>2 .</strong><strong>Visual Studio Emulator for Android  对硬件的操控</strong>

<strong>先放几张图就懂了~ 打开模拟器之后点击右方设置里的最后一项 之后会发现新大陆 ：)</strong>

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_3e71a4e62aa1.png)

****

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_0848207b6081.png)

****![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_d79450c47261.png)

****![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_50fccb7195d3.png)

****![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_11396ecf3f1b.png)

****![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_475a764f4929.png)

****![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_216ab0f2a46f.png)

****![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_791305a61d6e.png)

**<strong>依次有 Accelerometer Location Battery Screenshot Camera SD Card Network 可以对其设置 :)</strong>

<strong>3 .</strong><strong>Visual Studio Emulator for Android 开源了吗？</strong>

<strong>暂时了解到是没有滴! 但是按照微软目前的态度，我们应该持乐观态度。</strong>

<strong>根据GitHub公布的数据，微软贡献了16419个，超过Facebook的15682个，进一步拉开了与Docker、Angular、谷歌和Apache的距离。</strong>

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_31503dac2bbf.jpg)

<strong>Microsoft on GitHub</strong>
