---
title: Python并发编程
date: "2017-04-17 00:00:00"
updated: "2017-04-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/Python并发编程/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/25377631
---


本来不想再更新这个专栏了。但是知乎把这个专栏加入了精选，每天都有几十人新增关注。现在已经有11k+的关注，让我突然有些愧疚，也感受到了责任。

开这个专栏的时候，在知乎上写Python文章的人屈指可数，好的文章更是凤毛麟角。而现在已经有多得多的童鞋来知乎写技术文章，甚至有人收到了出版社写书的邀约，我非常欣慰。

在我的公众号的[求职招聘贴](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzA3NDk1NjI0OQ%3D%3D%26mid%3D2247483973%26idx%3D2%26sn%3D5daec0210a6e52036b1230db54a5d5cb%26chksm%3D9f76aef3a80127e515a8dedcd9f22fd1f67472733d997cbff43e6bdcfa2ecbf85ef8e4dbb862%23rd)里面，我说过这样一段话：

我非常认同玉伯在知乎回答《如何评价真阿当的文章：《2016年前端技术观察》？》说过的一句话。 我稍微加了一小句：

前端风起云涌的类库、框架、工具，各种前端技术交流会议。都是为了两件事：

一是为了更好地写代码， 二是为了写出更好的代码。

这方面Python的「圈子」做的就非常不好。每个人进的每个圈子都是为了这个圈子的资源，但也要为了这个圈子进行大量的贡献，这样才能让它良性的发展：

- 选择Python作为公司开发语言的公司更容易招聘合适的工程师

- 学习Python的工程师更容易找到工作，也就有更多人愿意选择它，毕竟这个年代机会成本是很大，一个看不到明确未来的方向会让大家犹豫放弃转而选择那些更明确的。

感谢每一个出来分享的同学，是大家让Python这个圈子更好。

我决定定期把我在「Python之美」公众号的文章索引进来。我一般都会写系列性的文章，今天是第一个专题『Python并发编程』

理解Python并发编程一篇就够了 - 线程篇
理解Python并发编程一篇就够了 - 进程篇
使用Python进行并发编程-PoolExecutor篇
使用Python进行并发编程-我为什么不喜欢Gevent
使用Python进行并发编程-asyncio篇(一)
使用Python进行并发编程-asyncio篇(二)
使用Python进行并发编程-asyncio篇(三)

附带对500lines项目中的爬虫翻译的2篇文章：

[一个使用asyncio协程的Web爬虫(一)](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzA3NDk1NjI0OQ%3D%3D%26mid%3D2247483875%26idx%3D1%26sn%3D66b10f67c8f2cb2002fa16d9022540be%26chksm%3D9f76ad55a8012443cd1c58c82a5f8a40178b29e04179ae7122f122116531bf1d8a96e736a275%23rd)
[asyncio协程的Web爬虫(二)](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzA3NDk1NjI0OQ%3D%3D%26mid%3D2247483875%26idx%3D2%26sn%3D753243326c3486228881c9810eb43f0e%26chksm%3D9f76ad55a80124439cdcd5a37e6d4ce8ec6bc95a4848474f4e089f56039b82d8c8d9516fbc42%23rd)最后说一点，同步到知乎的内容只会是我公众号的一部分，如果你希望及时的看到我写的以及一些我并不会发到这里的内容，强烈建议关注微信公众号（也可以直接搜索「Python之美」）：

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_07e718074deb.jpg)
