---
title: GRPO为什么会使得模型的推理变长？
date: "2025-07-24 00:00:00"
updated: "2025-07-24 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/GRPO为什么会使得模型的推理变长/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/1912123003191433189/answer/1931657139484624539
---


直入主题，我们先把一个batch中的样本做一个分类，为了简化，我们只考虑0-1 reward，也就是说只有答对和打错两种可能，叠加回答的长度，我们可以分成以下四类：

答对的样本：

- 比较长的回复
- 比较短的回复答错的样本：

- 比较长的回复
- 比较短的回复 让我们从deepseek math中提供的grpo loss来分析：

![](https://pica.zhimg.com/v2-15a73d13b5a27e26e46e8d17f793b18f_r.jpg?source=2c26e567)在这公式中，内层是先对每条轨迹内的token计算平均值，然后再对外层每条轨迹计算平均值，这样的计算方式会导致一个问题：

- 针对长的回复，因为轨迹内的token数量多， 
![](https://www.zhihu.com/equation?tex=%7Co_i%7C) 比较大，除以轨迹长度得到平均之后，长回复内的token对loss的贡献相对较小

- 针对短的回复，因为轨迹内的token数量少， 
![](https://www.zhihu.com/equation?tex=%7Co_i%7C) 小，除以轨迹长度得到平均之后，短回复内每个token对loss的贡献则比较大

如果是答对的样本，因为模型鼓励正确的样本，短的回复token权重更高，这时候模型会倾向于回复更短

如果是答错的样本，因为模型要避免错误的样本，短的回复token权重更高，这时候模型会避免回复太短，也就是倾向于回复更长。

因此可以看出，在一个step中，样本回答的正确率，会对模型回复的长度倾向有一定的影响。

- 在step正确率高的情况下，模型的回复可能会倾向于越来越短
- 在step正确率低的情况下，模型的回复可能会倾向于越来越长比较好的解决办法就是参考DAPO中提到的token mean方法

token mean公式：

![](https://pic1.zhimg.com/v2-1225c227fd7263a41ddb8b758eee395b_r.jpg?source=2c26e567)所有token一视同仁，把所有token loss加起来，把所有轨迹的token长度加起来，用token loss总和除以轨迹 token lenght总和。这样每个token对于loss的贡献就被拉平均了，都是一样的。

目前这种loss的计算方法已经在很多工作中应用了，verl框架内默认的agg mode也是token mean。

当然还有另外一种解决方案，参考DrGRPO，每条轨迹拉平均，不对轨迹内的token 除 
![](https://www.zhihu.com/equation?tex=%7CO_i%7C) 

![](https://picx.zhimg.com/v2-2ae3b0d1a4f38dda9b3f5def666fb9c8_r.jpg?source=2c26e567)上面两种方法本质上都是为了避免GRPO中的长度偏好

参考： 

- Dr.GRPO
- DAPO
- DeepSeekMath