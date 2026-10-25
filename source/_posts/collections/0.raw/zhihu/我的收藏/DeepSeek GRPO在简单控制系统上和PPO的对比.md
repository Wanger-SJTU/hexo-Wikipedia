---
title: "DeepSeek GRPO在简单控制系统上和PPO的对比"
date: "2025-02-03 00:00:00"
updated: "2025-02-03 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/DeepSeek-GRPO在简单控制系统上和PPO的对比/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/21131372654"
---


DeepSeek 的深度强化学算法 GRPO，在LLM领域提升数学推理上的效果非常好，所以我前几天就想着能不能把GRPO用到机器人控制系统上。

最近几天春节，我抽空简单编程对比了一下，GRPO和PPO，在简单控制系统上的效果。（业余玩玩，请勿较真）

<strong>实验环境：</strong>env = gym.make('CartPole-v1', render_mode="rgb_array")  # 越居中不动越稳定

<strong>实验结果：</strong>

1)由于GRPO没有Value网络，所以收敛速度非常快，但结果不稳定（只使用了最简单的Reward作为反向传播的计算依据，所以能感受到的实际情况信息太少）

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_14e35c218cf6.jpg)

GRPO @CartPole-v12）PPO ，由于有Value网络，包含使用了，详细的被控系统state信息（使用了更丰富的信息来实现反向传播），所以收敛过程虽然有点慢但很稳定，最终效果也比较好

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9d44d65fab42.jpg)

PPO @CartPole-v13）在上述GRPO的程序基础上，我简单改一下，把state中的水平位置信息，加到Reward里面，性能也有明显的提升

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_805af3ff59a5.jpg)

GRPO+RS @CartPole-v1

综上，简单结论：

对于整个系统中间过程和信息，比较清晰的问题（中间过程能被价值评价清晰），比如类似上面的控制系统（或者其他机器人系统），PPO还是最简单粗暴出效果很好的；

但对于像DeepSeek用来搞数学RL推理，由于中间过程没法很好的描述和计算中间过程的价值，确实还是GRPO更快更方便（只看最终结果）；

随便玩玩，仅供参考