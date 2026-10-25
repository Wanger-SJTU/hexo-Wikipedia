---
title: 如何解决离线和线上auc和线上点击率不一致的问题？
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/机器学习/如何解决离线和线上auc和线上点击率不一致的问题/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/305823078/answer/552640544
---


离线指标和线上指标不一致是个常见的问题，但首先要排除不是低级错误引起的。

第一，你们的业务场景是怎么样的，训练样本和测试样本的分割标准是什么。比如你用了用户的特征，就一定要注意样本切分时候的时间因素。不要有样本泄漏了。

第二，你提到了auc提升很大，具体在什么量级，线上线下不一致一般在大幅提升auc的指标时不会出现。

第三，试过做些切片分析吗，以前写过一篇更加复杂情况下的分析，参考：[https://zhuanlan.zhihu.com/p/42521586](https://zhuanlan.zhihu.com/p/42521586)

第四，既然是广告场景，不能只看ctr ，其他指标如何，ppc等，然后校正做的怎么样？

还有可能是样本偏置带来的，新模型学的旧模型给答案，有偏置，要做点无偏样本，手机答题，先这么多吧

[编辑于 2018-12-15 19:06](//www.zhihu.com/question/305823078/answer/552640544)

​​56 ​3 ​分享

​​
