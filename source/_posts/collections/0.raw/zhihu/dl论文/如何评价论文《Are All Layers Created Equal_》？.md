---
title: "如何评价论文《Are All Layers Created Equal?》？"
date: "2020-01-11 00:00:00"
updated: "2020-01-11 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/dl论文/如何评价论文《Are-All-Layers-Created-Equal_》/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/311869117/answer/2250693074"
---


雪化知松

互联网电商推荐算法

​ 关注

这篇文章是g厂2019年发布的一篇分析性论文，主要分析神经网络各层的作用/影响是否一样。答案肯定是不一样的，要是一样就不发表了。作者在文中引用了两个很重要的关键词，分别是"ambient"和"critical"。那这两个词到底表达什么意思呢？其实是将已经训练完的神经网络各个层分为两种类型，也就是这两个词。文中对这两个词语有个充分的解释，即：

 When a network exhibits negligible decrease in performance after re-initializing or re-randomizing of a layer, we say that the layer is ambient, and otherwise the layer is called critical

翻译过来是：当一个网络在重新初始化或重新随机化（re-initializing与re-randomizing的区别后面再介绍）一个层后表现出可以忽略不计的性能下降时，我们就说这个层是"ambient"，否则这个层就称为"critical"。说的通俗一点就是：对于已经训练完的神经网络模型，让其中的一层的权重重新初始化，当然，这有两种初始化方式，即：re-initializing与re-randomizing，其他层的权重不变，如果这样的模型对评估指标影响比较小或者是没有影响，我们就把这层叫做"ambient"，否则叫做“critical”。就和我们玩英雄联盟一样，别人来gank我，我一打二，你在旁边OB，结果我一打二赢了，这个时候我就是“critical”，而你就是"ambient"。至此，这篇文章的大致意思就讲的差不多了，如果只想了解“critical”和"ambient"具体的含义，那就不用往下面看了。

下面我们就来介绍作者是如何分析已经训完的神经网络模型，哪些层是critical，哪些层又是ambient？在正式介绍之前，先介绍下上面提到的两种初始化方法，即：re-initializing与re-randomizing。

re-initializing：我们知道当模型已经训练完以后，会存在很多的checkpoint。假设模型训练完以后有200个checkpoint，我们将第200个checkpoint导出的模型作为最后的模型，用它来评估模型的好坏。这个时候我们想对已经训练完模型的第d个layer参数重新初始化，其他层参数还是第200个checkpoint的参数，我们可以选择第0个、第1个或者其他的checkpoint中的第d个layer参数来初始化已经训练完模型的第d个layer的参数，这种用其他checkpoint中的参数来初始化最终模型第d个layer的参数，把这种初始化方式叫做re-initializing。 

re-randomizing：对于这种初始化方法，已经训练完的模型第d个layer参数不用其他checkpoint来初始化，而是重新随机初始化。

在这两种初始化方式介绍完以后，下面来介绍下作者是如何判断一个神经网络模型哪些层是critical，哪些层又是ambient？首先是让一个模型训练结束，这也是为什么前面多次提到“已经训练完”这几个字。其次作者用这两种初始化方式来代替已经训练完模型的某一层参数，当然其他层的参数不变。通过这样的方式导出的模型，来比较与之前已经训练完的模型的指标性能，并且把指标性能的对比结果叫做鲁棒性(robustness)。下面是作者对全连接神经网络的分析结果图：

上图(a)中每一行代表神经网络某一层参数被替换后的误差，但是最后一行代表整个模型的参数全部被替换的误差；每一列代表re-initializing或者re-randomizing方式，其中第一列是re-randomizing方式，其他列是re-initializing方式；对于颜色而言，颜色越深代表误差越大。从图(a)中我们可以看出，不管是模型的某一层参数被替换还是整个模型参数被替换，用re-randomizing方式后，误差都比较大；用re-initializing方式，除了用checkpoint-0以外，其他的checkpoint误差都比较小；然而，用checkpoint-0替换参数后，fullmodel和layer1误差较大，layer2、layer3和layer4没什么影响，说明layer1是critical，layer2、layer3和layer4是ambient。为什么layer1与layer2/layer3/layer4有这么大的差距呢？作者用下面这句话来解释：

the bottom layers are being updated more aggressively than the top ones  

翻译过来是：底层(layer1)比顶层(layer2/layer3/layer4)更新得更强烈(aggressive)。也就是说：底层是更敏感的(sensitive)，顶层是更健壮的(robust)。

这个时候有人可能会注意到图(a)中，re-initializing方式的第0个checkpoint与re-randomizing方式同样是随机初始化，为什么误差会有这么大的区别？我个人认为这两种初始化方式是不一样的。虽然这两个都是随机初始化，但是re-initializing方式的第0个checkpoint是参与到已经训练完模型的训练与迭代；而re-randomizing方式是不参与到已经训练完好模型的训练与迭代，所以区别会比较大。

对于图(b)和图(c)，主要描述re-initializing与re-randomizing方式相对于checkpoint-0的参数的范数，再结合图(a)，可以发现对重新初始化的鲁棒性与任何一个距离都不明显相关。

作者不仅仅从全连接神经网络来分析网络的鲁棒性，还从卷积神经网络分析网络的鲁棒性。对于卷积神经网络，文中主要介绍了VGG与ResNet。由于VGG与全连接网络比较相似，这里面以ResNet为例子介绍，下图是ResNet分析结果图：

通过上面的图片，对于ResNet的鲁棒性分析，可以将ResNet的每个stage解释为一个子网络，并且隔一些子网络后误差才会变得较大。

同时，作者还从联合鲁棒性(joint robustness)角度分析神经网络的鲁棒性。这里面不做具体的分析，简单说下作者的结论，即：如果将所有的ambient layers分到一组并重新初始化，并不能产生良好的鲁棒性；但是有一半的layers被重新初始化，鲁棒性可以显著提高。

最后简单总结下，文中将神经网络的layers分为critical与ambient两种类型，介绍了区分它们的方法。同时，文中也引入了re-initializing与re-randomizing的鲁棒性概念以及分析的结果。

阅读全文​
​赞同 150​​6 条评论​233 ​8 ​分享