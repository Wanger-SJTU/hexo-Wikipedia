---
title: (1 条消息) Deep Networks with Stochastic Depth
date: "2017-11-28 00:00:00"
updated: "2017-11-28 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Deep-Networks-with-Stochastic-Depth/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/31200098
---


我就是管不住这张嘴啊，大半夜的喝什么monster，活该睡不着觉，就简单说说题目里的这个工作吧。


（我是不会给你们翻译论文的！！！自己去读论文！！！）

鉴于之前已经复现过ResNet，这次的复现相对比较容易，也没有参考别人的代码。

（官方代码用lua写的看不懂啊喂！！！）

这个工作是DenseNet的作者在DenseNet之前做的，大概是因为没有在ImageNet上的结果，只在CIFAR-10和CIFAR-100上简单测试了一下，所以没有得到广泛的关注。我个人觉得这个工作还是很有趣的，起码比DenseNet简单粗暴的把一个block里的所有层连接起来要有趣。

这个工作主要的思路是这样的：

总共有 L" role="presentation">LL 个block，作者给每个block都加上了一个概率 pl" role="presentation">plp_{l} 。

训练时：

根据 pl" role="presentation">plp_{l} 用一个bernoulli random variable生成每个block的激活状态 bl" role="presentation">blb_{l} ，最终把ResNet的bottleneck block，从

$Hl=ReLU(fl(Hl−1)+id(Hl−1))" role="presentation">Hl=ReLU(fl(Hl−1)+id(Hl−1))H_{l}=ReLU(f_{l}(H_{l-1})+id(H_{l-1})) $

重新定义为

$Hl=ReLU(blfl(Hl−1)+id(Hl−1))" role="presentation">Hl=ReLU(blfl(Hl−1)+id(Hl−1))H_{l}=ReLU(b_{l}f_{l}(H_{l-1})+id(H_{l-1})) $

当 bl=0" role="presentation">bl=0b_{l}=0 ，即block未被激活时，

$Hl=ReLU(id(Hl−1))" role="presentation">Hl=ReLU(id(Hl−1))H_{l}=ReLU(id(H_{l-1})) $

$（Note：原文是 Hl=id(Hl−1)" role="presentation">Hl=id(Hl−1)H_{l}=id(H_{l-1}) ，也做了解释，但是我觉得以上表述更加清晰）$

另外， pl" role="presentation">plp_{l} 是从 p0=1" role="presentation">p0=1p_{0}=1简单线性递减至 pL=0.5" role="presentation">pL=0.5p_{L}=0.5 ，被定义为

$$pl=1−lL(1−pL)" role="presentation">pl=1−lL(1−pL)p_{l}=1-\frac{l}{L}(1-p_{L}) $$

<strong>预测时：</strong>

ResNet的block被定义为

$HlTest=ReLU(plfl(Hl−1Test)+id(Hl−1Test))" role="presentation">HlTest=ReLU(plfl(Hl−1Test)+id(Hl−1Test))H^{Test}_{l}=ReLU(p_{l}f_{l}(H^{Test}_{l-1})+id(H^{Test}_{l-1})) $

即<strong>每个block的概率变成了这个block的残差的权重</strong>


作者声称以上调整之后的模型，期望深度为原来的 \frac{3}{4} ，并且提速40%，在我的测试过程中，大概是因为我的写代码的姿势有问题，运行速度要比对应的确定深度的模型慢15%左右。

另外一个让我印象深刻的点是，这种引入随机变量的设计有效的克服了过拟合使模型有了更好的泛化能力**。作者的解释是，不激活一部分block事实上实现了一种隐性的模型融合（Implicit model ensemble），由于训练时模型的深度随机，预测时模型的深度确定，事实上是在测试时把不同深度的模型融合了起来。我自己的想法是，在深度确定时，信息随着网络一层层被提取被过滤，当信息到达网络的高层时已经不是非常informative了，高层网络面对这样的信息难以得到有效的训练。不激活一部分block，使得高层的block能接收到更多来自底层的信息，能得到更加充分的训练，因而模型有了更好的表达能力。在预测时，深度确定并且给各个block加权，也事实上是一种模型融合。

另外一种解释，这种引入随机变量的设计是<strong>把Dropout应用到了整个网络</strong>。我觉得说的很有道理。


最后，废话少说，上代码

```python
class BottleNeck(nn.Module):
    def __init__(self, in_channels, out_channels, stride):
        super(BottleNeck, self).__init__()
        self.conv1 = nn.Sequential(
            nn.Conv2d(in_channels=in_channels, out_channels=out_channels, kernel_size=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )
        self.conv2 = nn.Sequential(
            nn.Conv2d(in_channels=out_channels, out_channels=out_channels, kernel_size=3, stride=stride, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )
        self.conv3 = nn.Sequential(
            nn.Conv2d(in_channels=out_channels, out_channels=(out_channels * 4), kernel_size=1),
            nn.BatchNorm2d((out_channels * 4)),
            nn.ReLU(inplace=True)
        )
        self.relu = nn.ReLU(inplace=True)
        self.downsample = nn.Sequential(
            nn.Conv2d(in_channels=in_channels, out_channels=(out_channels * 4), kernel_size=1, stride=stride),
            nn.BatchNorm2d((out_channels * 4))
        )
        self._initialize_weights()

    def forward(self, x, active):      
        if self.training:
            if active == 1:
                print("active")
                identity = x
                identity = self.downsample(identity)
                x = self.conv1(x)
                x = self.conv2(x)
                x = self.conv3(x)
                x = x + identity
                x = self.relu(x)
                return(x)
            else:
                print("inactive")
                x = self.downsample(x)
                x = self.relu(x)
                return(x)
        else:
            identity = x
            identity = self.downsample(identity)
            x = self.conv1(x)
            x = self.conv2(x)
            x = self.conv3(x)
            x = self.prob * x + identity
            x = self.relu(x)
            return(x)

    def _initialize_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                n = m.kernel_size[0] * m.kernel_size[1] * m.out_channels
                m.weight.data.normal_(0, math.sqrt(2. / n))
                if m.bias is not None:
                    m.bias.data.zero_()
            elif isinstance(m, nn.BatchNorm2d):
                m.weight.data.fill_(1)
                m.bias.data.zero_()
            elif isinstance(m, nn.Linear):
                m.weight.data.normal_(0, 0.01)
                m.bias.data.zero_()
```


代码里我偷了个懒，就是每个block都做了downsample，跟论文的要求是不一样的。

完整代码在[ResNet50 with Stochastic Depth](https://link.zhihu.com/?target=https%3A//github.com/minghao-wu/DeepLearningFromScratch/blob/master/ResNet50_with_Stochastic_Depth/ResNet50_with_Stochastic_Depth.py)，这是一个把ResNet50变为随机深度的例子。

=========2017年11月27日分割线=============

刚刚发现的新鲜热乎的问题。这个模型暂时只能在CPU上跑，我会尽快让模型支持GPU。

=========2017年11月28日分割线=============

现在模型已经支持GPU了。

其实在PyTorch里面，每个模型的forward()就是重写了Python的__call__()。官方的开发者似乎是不太支持让forward()一次接收两个参数，忘记在哪看到的了。

（其实两条分割线只差了半个小时。）
