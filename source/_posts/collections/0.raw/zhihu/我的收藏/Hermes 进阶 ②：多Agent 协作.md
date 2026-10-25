---
title: Hermes 进阶 ②：多Agent 协作
date: "2026-07-07 00:00:00"
updated: "2026-07-07 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Hermes-进阶-2-多Agent-协作/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2056075324220248780
---


Hermes 里多个Agent 要如何协作？无论是通过共享文档传递，还是在Kanban看板上分配任务，Hermes的多Agent协作本质都是定好接力规则，剩下的让Profile自己跑。上一篇 [Hermes 进阶 ①：自进化的 Skills 和多 Agent 配置](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzY4MjA1MzA3Mw%3D%3D%26mid%3D2247484304%26idx%3D1%26sn%3D08190e3f1369c1bd620179fbcf2b1c84%26scene%3D21%23wechat_redirect) 后，有友友说里面只说了多个 Agent 怎么配置，那 Hermes 里多个 Agent 要怎么协作呢？

本来②打算写 Memory Provider，就先插一篇回答它。

据我所知，Hermes 还没有类似 Codex 里 `send_message`、`followup_task` 这类工具，可以让一个 Agent 直接给其他 Agent 发消息、安排任务。

它也不像 OpenCode，可以通过 OMO、OMOS 这类插件，直接获得一组预设的 Agent，再由主 Agent 来负责调度。

所以，Hermes 当前的多 Agent 协作，并不是让几个 Profile 在不同 Session 里直接互相聊天。

你可以直接问自己的 Hermes Bot，应该会得到类似的回答：

![](https://pic1.zhimg.com/v2-3ef02905ae39ec64f3d157a49f23630c_1440w.jpg)个人理解，这和 Hermes 的定位有关。Codex、Claude Code、OpenCode 是围绕项目代码展开工作的 Coding 类 Agent，而 Hermes 和 OpenClaw 是个人助手类的 Agent。

我平时用 Hermes，多是手机上聊聊灵感、分析需求，或者做些轻量、快速的验证。需要大量编码的时候，还是习惯坐在 PC 前，开着专门的 Coding 类 Agent 来干。

上面截图里，`Kai`（我的 Hermes Bot）列了一堆方式，但除了 `delegate_task`，剩下几个本质就是一回事：

让不同 Agent 按约定，把需要共享的信息正确地写到某个地方，再由另外的 Agent 按约定读取出来并继续处理。这个“某个地方”可以是：

- • 一个文档 / 文件；
- • 一个 cron job 的输出；
- • 一个 SQLite 里的任务记录；
- • Kanban 封装过的 task / comment / status。
自动拆任务的 `delegate_task`
`delegate_task` 这种方式，Hermes 的 Profile 自己会调度，无需你干预。

而且这个过程你是看得见的。

比如 [Hermes 进阶 ①：自进化的 Skills 和多 Agent 配置](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzY4MjA1MzA3Mw%3D%3D%26mid%3D2247484304%26idx%3D1%26sn%3D08190e3f1369c1bd620179fbcf2b1c84%26scene%3D21%23wechat_redirect) 中，我配置的 `scribe`，遇到比较长的视频时，跑起来类似这样：

![](https://pic4.zhimg.com/v2-d6cd934e89ffed571cbcc363832bf2cb_1440w.jpg)这就是 Profile 自己在拆任务、派活，然后跑起来。

简单的上下游接力
还是 `scribe`，就有一个经常协作的下游 Agent：`video-learner`。

`scribe` 是跑在我海外云主机上的。前文提到过，只要丢一个 YouTube 视频地址，`scribe` 就会返回我一个飞书文档链接，里面有视频英文的完整原文。

而 `video-learner` 是跑在我本地 Mac mini 上的。`video-learner` 会读取 `scribe` 生成的飞书文档，再按要求翻译、润色、整理成固定格式 Markdown，保存到我本机 Obsidian 的知识库里。

![](https://pica.zhimg.com/v2-ab2df84d292bb988bce2146a96a82456_1440w.jpg)`scribe` 我配置的是 MiniMax-M3，`video-learner` 配置的是 DeepSeek-V4-Pro。（这里吐槽下 M3，中文表达真的是短板，就像一个很轴的同事）

所以，Agent 是否在一起、使用什么模型都无所谓。只要上游输出满足下游输入的要求，就可以组成一条协作链路。

Kanban 看板
Hermes 自带的 Kanban 是所有 Hermes Profiles 共享的任务板。我的 `captain` 和 `firstmate`，就是一对使用 Kanban 协作的 Profile。

我对 `Superpowers` 这类比较重的插件不太感冒，当时直接丢了 `mattpocock/skills` 的 GitHub 地址给 `Kai`，要求两个 profile 主要采用里面的 Skills：

![](https://pic3.zhimg.com/v2-c312a794de05d7f178adabcaae195bbe_1440w.jpg)`captain` 负责聊需求、做规划和拆任务，不直接写代码。

![](https://pic1.zhimg.com/v2-c901a6a183b68b6cef74a15bc7774b0e_1440w.jpg)`firstmate` 是实现者。只管接卡片、写测试、做实现。

![](https://pic1.zhimg.com/v2-226f7f57fe76da9c9943c7163972a03c_1440w.jpg)`captain` 主要调用的 Skills 如下：

![](https://pic4.zhimg.com/v2-33fcea7cfda5277bca376b80f6807689_1440w.jpg)`firstmate` 主要调用的 Skills 如下：

![](https://pic4.zhimg.com/v2-dee1235703aef4130670dbb588fabe67_1440w.jpg)创建过程类似上一篇 `scribe` 的创建，关键是跟 `Kai` 把 Profile 的人设、职责、用到哪些 Skills 这些谈清楚。

平时我会找 `captain` 聊聊灵感和需求。如果需要实现，`captain` 就会拆任务，往 Kanban 里丢卡片，交给 `firstmate`，比如这样：

![](https://pic1.zhimg.com/v2-11162f393dffaf2dc1164fa15a37b75c_1440w.jpg)任务建好后，`firstmate` 从 Kanban 里拾取任务。做完后，等待 Review：

![](https://pic2.zhimg.com/v2-dcfbfc157308a1a85253ce99767a2f0d_1440w.jpg)PS：为了更快地看到任务状态的变化，我给 `captain` 和 `firstmate` 都设置了定时监控：

![](https://pic4.zhimg.com/v2-bb1904e421e1d1ba2102a960862cce19_1440w.jpg)
小结
所以，Hermes 里的多 Agent 协作，关键是要**把接力点想清楚**。

不管是 `scribe` 和 `video-learner` 通过飞书文档传递，还是 `captain` 往 Kanban 丢卡片、分配任务，`firstmate` 拾取实现，本质都是一回事：

定好谁写、谁读、在哪接住，剩下的，让 Profile 自己跑。

这篇就先到这儿。关于 Hermes 进阶①里提到的内置记忆文件之外的 Memory Provider，下次再说吧。

关联文章

- • [Hermes 进阶 ①：自进化的 Skills 和多 Agent 配置](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzY4MjA1MzA3Mw%3D%3D%26mid%3D2247484304%26idx%3D1%26sn%3D08190e3f1369c1bd620179fbcf2b1c84%26scene%3D21%23wechat_redirect)
- • [从 OpenClaw 迁移到 Hermes](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzY4MjA1MzA3Mw%3D%3D%26mid%3D2247484056%26idx%3D1%26sn%3Dc2c4e7b87f9d436c1944e4a03a053d84%26scene%3D21%23wechat_redirect)
- • [Lighthouse 上养 AI：OpenClaw 云端进阶体验](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzY4MjA1MzA3Mw%3D%3D%26mid%3D2247483725%26idx%3D1%26sn%3Ddfad7d30a6313b77886a4716cce37f08%26scene%3D21%23wechat_redirect)