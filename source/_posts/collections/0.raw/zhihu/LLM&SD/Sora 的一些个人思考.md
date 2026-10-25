---
title: Sora 的一些个人思考
date: "2024-02-16 00:00:00"
updated: "2024-02-16 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/Sora-的一些个人思考/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/682430755
---


Sora发布了新的视频生成技术，一时之间引起轰动， 很多技术谣言也开始漫天飞舞。


我听到过的就有什么Sora学会了物理世界啦，Sora操作了UE引擎啦等等等的

早上11点醒来后， 我看了下SORA发布的技术论文， 当然论文写的是十分抽象啊，看完了以后， 对于SORA的细节脑补了很多细节。 怎么说呢，谣言说的都不是那么回事。

### 首先我们来说Sora是什么

Sora是一个基于语言模型范式的视频模型

但是要理解为什么语言模型范式为什么在视频生成任务上也能这么有效，我们先打个比方来说一下语言模型为什么能成功生成语言：

语言模型基于一种叫做“token”的概念来抽象多模态的语言（语言，数学，代码。。。）并通过“预测” token 来生成段落。

#### 打个比方：

“你吃”  是一个 Token

那么你猜下一个Token更应该是以下哪个？

“了吗”  “足浴店”  “变形金刚”  。。。

很显然， 答案是 “了吗”

所以其实就仿佛是你手机打字的那个“自动补全” 功能， 只不过 token不是具体的词汇， 是一种隐空间表达的语言段落, 训练的数据量和方式也更高级。

### 这就是*语言模型范式*

语言模型范式就是一种<strong>根据上一个“token”， 推测下一个“token”，然后不断往下去“扯犊子”</strong>并最终形成一个篇章的行为模式。

### 回到视频

回到我们前面说的 Sora是一个<strong>基于语言模型范式的视频模型</strong>这件事。

那么这里Sora做了<strong>第一件什么核心</strong>的事情，真正能把视频生成任务，装进“语言模型”这碟醋里呢？

已知当前像素：推测下一个像素？

已知当前帧：推测下一帧？

都不是。 

### 已知当前片段：推测下一片段

这就是在技术文档中提到的概念：SpaceTime latent patch（时轮碎块, 我这个翻译是不是有点信达雅）

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_c8a542a4fe1e.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_f2a5a9f9fcdd.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_aff331dda19b.jpg)

### 那么, 套用 语言模型 这个盒子:

这视频生成中最重要的<strong>一个拼图</strong>就是: <strong>已知当前“时轮碎块” ：推测下一个“时轮碎块”</strong> 

<strong>token = spaceTime latent patch</strong> “时轮碎块” 

更重要的是, 这个推测的结果还是隐空间, “latent Space”,   最终的当前帧画面, 是通过decoder对于推测出的latent Space解码来得到的.

而这种 “时轮碎块” 最大的好处, 是可以兼容所有的数据素材:  一个静态图像不过是时间=0的一个时轮碎块, 不同的像素尺寸, 不同的时间长短, 都是不同大小的 “时轮碎块” 而已. 

于是乎这就构成了整个生成任务中第二个核心: 通过 时轮碎块 和大语言模型的 “扯淡” 能力构成在 <strong>时间轴上连续的</strong> 隐空间 (latent space), 然后通过单帧画面的 Decoder 来构造出<strong>空间上连续</strong> 的画面. 

### Diffusion model起到了什么重要作用

好, 所以看完了之前的段落, 之前所做的一切, 推理出来的不过是一个

隐空间: latent Space

每一帧画面, 都是由很多 space time latent patch 构成的.

那么接下来, 就需要通过一个diffusion的过程, 还原成画面. 

文中特别强调了, Sora是一个 Diffusion Transformer.

### 至此, 我大概还原了Sora视频生成的一些技术拼图

但是细节的话, 就没法写轮眼了. 除非自己亲自去尝试. 

比如他是不是用diffusion去直接还原一整个spacetime latent patch的？还是通过tokenize的patch推理后再逐帧还原的？

不过看完这些拼图, 就不难想象到Sora还是会有很多问题的, 他这个通过 当前的 时轮碎块 去 推理下一个 时轮碎块 的技术路线, 会容易进入 “时空错乱”  那么一定会在有重叠交错物体的画面上出现问题. 

比如下面这个画面:

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_a4ed8d5b4d44.jpg)00:07
