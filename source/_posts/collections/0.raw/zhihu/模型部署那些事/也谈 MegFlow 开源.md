---
title: "也谈 MegFlow 开源"
date: "2021-09-22 00:00:00"
updated: "2021-09-22 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/模型部署那些事/也谈-MegFlow-开源/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/412862645"
---


#### -1. 搬砖

数年前的机缘巧合，从一个 HW RD 开始接触到了深度学习，也经历了连 Linux 啥也不会到混上 Caffe 交流群的管理员；又因机缘巧合被推荐到前公司搬砖，到带队搬砖，然后又因为 CEO 要被干掉环境恶化跑路换到现公司，成长为一个重量型(物理意义上的)搬砖工。回顾摸爬滚打这几年，充分说明了机遇(两个妹子)和努力(一晚 30 软妹币，一年可以攒 6 大瓶神仙水)的重要。

在前公司时，第一个任务就是搞定 ARM V7-A 的速度问题，感谢 @nihui

 up 赏饭吃，添加 -mfpu=neon-vfpv4 后(我 PR 了，PR NCNN 能混进 NCNN 里番群)混过了试用期，然后就面临如何部署的问题了。从一个略显简陋的无依赖 Caffe 版本 SDK Framework 开始，改写为支持多种后端的 Framework，可以支撑海思 SoC 到 CPU/GPU 云服务器，并且在模型训练配合下，将线上业务从只有十几 QPS 的 V100 双卡云服务器优化到可以使用只有几百一个月的 CPU 服务器，QPS 却达到了 100+(骨干网满带宽，CPU 没满负荷)。

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_172c98ff8742.jpg)

分析实际部署工程师的需求，主要还是适配不同的硬件平台，不同的模型处理模式。首先得承认，大多数公司不会有很多人力投入到工程中，团队总是希望投入更多的 HC 给训模师，苦逼的工程师只有苦逼的钱。怎么用较少的人力完成更多的活或支撑更多的场景落地，就是苦逼部署工程师的价值。

#### +0. 搬砖的问题

一般地，训练工程师总能提供一个模型，并信誓旦旦地说我的模型强无敌，丢给了部署工程师。部署工程师看了说你的模型 MMP，一测速度都不如 MobileNet。或者某商汤/旷视/这组/那组的检测/分割/识别论文又更新，训模师又说亲爱的我又行了，一上 SoC 却大几百 ms，距离能上线还有 10 里地。在创造性和自主性不强的训模师手中，这样的场景非常常见，从来照搬论文，消融实验都做不明白，论文为什么可以，贡献点是啥都讲不清楚。坦率地说，我自己面试过的训模师里，只有两个人比较满意，并且梯队间 Gap 极大(连我的水平都没有，那我不认为训练水平足够)。

在论文和算法迭代期间，加之不同训练框架的交织，能力差的训模师调整能力不足，对于一类任务不能给出一类模型的设计抽象。举例来说，前公司小老板和上海的萌妹子在 Anchor Free 大行其道之前就坚持 Anchor Free 方法(赞美黄埔军校百度)，所有的迭代和 Backbone 的变化都不修改后处理的流程，那么所有这些部署的场景中，后处理都是唯一一种，无需修改。扩展开来，生成 Anchor 方法是不是一致的，预测是不是 Permute 过、为什么不合并指数项、得分 Softmax 或 Sigmoid 为什么不去掉、是多分支还是单分支，是一阶段还是两阶段等等，所有这些皮扯起来，孩子都可以打酱油了(甚至可以假设从单身开始)。

另一个问题在于，面对不同的 SoC 时，当需要考虑特有的后端时，往往设计不佳的框架需要修改对应的处理代码，进而产生不同分支的版本。一些场景中，尤其要求 SDK 的包大小，比如 taskflow 的 stream
- workflow 的 builder(C++ 没反射很蛋疼)
- 不同后端推理框架的 executer 和 context
每一点都专注于解决以上描述的问题，最后做到的效果是，提供一个模型和模型的描述，就可以无编译地 build 一个 model taskflow，结合 SDK 中的业务描述，搭配上必要的 jni 或者 nginx 等，通过配置 build workflow 后就可以完成基础业务的任务。嵌入对应的微服务/SAAS/PAAS 中后，就是一个完成的业务。

而在 MegFlow 里，问题又有所不同。对内，MegFlow 需要考虑的是如何结合 MegEngine 完成训推一体化的内部业务部署落地，对外需要完成 MegEngine/Brain++ 的生态闭环，而 MegEngine/Brain++ 的业务和生态决定了不必面临这么复杂的 SoC 和端侧场景。所以问题简化为，如何给 MegEngine/Brain++ 导流，如何诱导用户选择使用 MegEngine 和 Brain++ 平台生态的问题。

AI 本身不是门生意，四小龙也要靠业务赚钱，单纯的算法性感是没用的，AI 必须依赖场景才能赚钱，也就是 MegFLow 的诞生外部背景。从旷视的业务看，人脸/人身/物流是主场景，倒回 5 年前，CV 如日中天，初创企业分食顶会投资人买单的场景已经不在了。主赛道不变情况下，如何挖掘长尾市场，产生新的利润点就是投资人问老板，老板问高管，高管说我在哪的问题。

生态做不大，场景来钱困难，研究员嗷嗷待补，最后还不是部署落地换钱才能活下来(然而相当一部分模型训练师鄙视下游的部署工程师)？可以预见的五年到十年里，靠资本变幻大王旗赚取利润的纯 AI 机会不再有了。资本现在在 AI 的二级市场遨游，云鲸、石头、科沃斯，IRobot，Fiture 等公司估值膨胀的速度堪比解放的速度；然而回头看这些场景，并不需要多么顶尖的算法，和百万薪资的 AI 研究员。但这些市场，却意味着数以百万计的用户，和潜在的其他周边。回到 MegFLow 和 MegEngine，开放发展更多的用户，适应更多的场景，哪怕最后确要转型，有锚点也好掉头，钩住新的蓝海机会。

#### +2. MegFlow 的实践

从[猫猫围栏的 CPU 配置](https://link.zhihu.com/?target=https%3A//github.com/MegEngine/MegFlow/blob/master/flow-python/examples/cat_finder/image_cpu.toml)可以看出，[MegFlow](https://link.zhihu.com/?target=https%3A//github.com/MegEngine/MegFlow) 可以很容易的配置模型的输入输出，业务的 Pipeline 情况；当实际需要时，在弹性容器里也可以很容易的通过业务模板进行扩张，基本上把 SAAS 或微服务的相对部分的工作完成了，而这部分业务开发又是和 AI 部署不直接相关的，传统开发工程师也可以参与进来进行编排。

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_4f6d001761d5.jpg)

打开了注册猫头的本地 IP，注册猫后就可以尝试猫猫围栏了，测试视频不适合分享，请自行实验(注意 Docker 的 IP 映射问题)。

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_0457a856d103.jpg)

#### +3. 

总的来说，除了因为妥协选择了 Rust 导致学习成本的额外增加外，MegFlow 确实是落地的部署工程师面对现实落地场景的思考和框架化，不想折腾的团队拿来抄就完事了。

感谢 @白会长

 的邀请，赞美类似 MegFlow 这样的开源工作，时间倒回去的话，我想我也会狠狠地 PR 一下的。

又，对于部署工程师来说，还是妹子训模师好配合工作，赞美训练模型的妹子们！

MegFlow 的其他几位同学的分享：

[](https://zhuanlan.zhihu.com/p/405745695)

[](https://zhuanlan.zhihu.com/p/411114955)

[](https://zhuanlan.zhihu.com/p/411509985)

[](https://zhuanlan.zhihu.com/p/409279000)

[](https://zhuanlan.zhihu.com/p/408791160)

[](https://zhuanlan.zhihu.com/p/411333992)

[](https://zhuanlan.zhihu.com/p/412889860)

[](https://zhuanlan.zhihu.com/p/410363403)

[](https://zhuanlan.zhihu.com/p/411022099)

[](https://zhuanlan.zhihu.com/p/410947988)
