---
title: "为什么很多paper计算perceptual loss 都用VGG网络网络？"
date: "2021-07-07 00:00:00"
updated: "2021-07-07 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/dl论文/为什么很多paper计算perceptual-loss-都用VGG网络网络/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/341843217/answer/1981537479"
---


命里缺木

上海西南某高校在读大学僧（划掉）-  Quant

​ 关注

碰巧我还真对这个问题熟悉一点。

事实上，我们先考虑一个问题，为什么像resnet在一般情况下会比vgg准确率高？

记得有一篇文章 Adversarial Examples Are Not Bugs, They Are Features 揭示了神经网络如果使用更多的，人肉眼不可见的，类似于噪声的，非常微小的纹理特征（大概是这意思），会得到更高的准确率。例如，我有一类样本，其feature包含了n+1个噪声，其中第一个噪声在样本label为1的情况下的有0.8的概率为+1，0.2的概率为-1，在样本label为0的情况下相反，剩下的所有feature在样本label为1的情况下有0.6的概率为+0.01，有0.4的概率为-0.01，在样本label为0的情况下相反，如果给定一个样本，人肉眼观察，去判断这件事情，很难察觉出0.01和-0.01的区别，但是很容易察觉出1和-1的差别，因此很容易的，去选择第一个feature作为自己的判断依据，而忽略掉其他feature。然而，这样的做法正确率并不是最高的，当n非常大的时候，进一步提高正确率的做法应该是综合考察所有的feature，随着n的增大，对第一个feature的关注会越来越小。这也解释了为何会出现攻击样本，因为改变这n个细小的feature对于人眼来说是几乎观察不到的，但是对于网络来说，其关注点更多的在这些细小的feature上，因此就会被蒙蔽。

绕了一大圈，回到题主的问题，在假设以上解释是对的情况下，我们可以得出resnet相比vgg其实将注意力放在了更多这种细小的feature上面，所以才会获得更高的正确率。而题主所提到的perceptual loss其实是来源于风格迁移，风格迁移领域中，使用resnet计算perceptual loss几乎无法获得比较好的效果，因为resnet相较于vgg关注的更多是人眼不可见的feature。

但是！重点来了，有人做过实验（可以查下robust resnet style transfer），使用对抗训练后的resnet进行风格迁移，会获得跟vgg一致的效果，这与前面的假设吻合，因为对抗训练就是使网络更多的关注“第一个feature”，即人眼更多关注的feature，忽略掉那些在人眼看来“脆弱的”、类似于噪声的feature。

以上内容是我根据提到的一些其他人的工作串联起来的解释，现在不做style transfer了，不知道有没有更合理的解释。

阅读全文​
​赞同 212​​4 条评论​141 ​10 ​分享