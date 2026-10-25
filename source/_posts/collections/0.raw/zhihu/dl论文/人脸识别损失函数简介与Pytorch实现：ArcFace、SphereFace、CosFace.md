---
title: 人脸识别损失函数简介与Pytorch实现：ArcFace、SphereFace、CosFace
date: "2019-05-10 00:00:00"
updated: "2019-05-10 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/人脸识别损失函数简介与Pytorch实现-ArcFace、SphereFace、CosFace/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/60747096
---


一般来说，人脸识别分三步走：

- 找人脸：图片中找出含人脸的区域框出来
- 对齐人脸：将人脸的眼镜鼻子嘴巴等标出来，以此作为依据对齐人脸
- 识别：将对齐的人脸进行识别，判定这张脸究竟是谁
**

本篇要介绍的损失函数，用于第三步骤，聚焦于更准确地识别这张脸究竟属于谁，本质上属于一个分类问题。

一言以蔽之ArcFace、SphereFace、CosFace三个损失函数相对于前辈们而言，改进的一个核心思路就是：

只有平常（train）更刻苦的训练，才有可能在比赛中（test）中得到更好的结果。**

它们都对卷积神经网络提出了更高的目标，在训练阶段更为艰难，也因此让其成为了一个更好的分类器。

**

一、从前辈说起

首先谈谈他们的前辈： SoftMax" role="presentation">SoftMaxSoftMax 

维基百科介绍：

$> Softmax函数<strong>，或称</strong>归一化指数函数**<span class="wikilink wikilink--missing" title="未导入的页面">1</span>(https://link.zhihu.com/?target=https%3A//zh.wikipedia.org/wiki/Softmax%25E5%2587%25BD%25E6%2595%25B0%23cite_note-bishop-1)，是逻辑函数的一种推广。它能将一个含任意实数的K维向量 z" role="presentation">z{\displaystyle \mathbf {z} }  “压缩”到另一个K维实向量 &#x03C3;(z)" role="presentation">σ(z){\displaystyle \sigma (\mathbf {z} )} 中，使得每一个元素的范围都在 &#x03C3;(z)" role="presentation">σ(z){\displaystyle \sigma (\mathbf {z} )} $
之间，并且所有元素的和为1。该函数的形式通常按下面的式子给出：
 $$&#x03C3;(z)j=ezj&#x2211;k=1Kezk&#xA0;for&#xA0;j=1,&#x2026;,K." role="presentation">σ(z)j=ezj∑k=1Kezk for j=1,…,K.{\displaystyle \sigma (\mathbf {z} )_{j}={\frac {e^{z_{j}}}{\sum _{k=1}^{K}e^{z_{k}}}}}  \  for\ j= 1, …,K. $$

简单来说 softmax 将一组向量进行压缩，使得到的向量各元素之和为 1，而压缩后的值便可以作为置信率，所以常用于分类问题。另外，在实际运算的时候，为了避免上溢和下溢，在将向量丢进softmax之前往往先对每个元素减去其中最大值，即：

$${\displaystyle \sigma (\mathbf {z} )_{j}={\frac {e^{z_{j}-z_{max}}}{\sum _{k=1}^{K}e^{z_{k}-z_{max}}}}}  \  for\ j= 1, …,K.$$

> 想了解更多，可以参考：[忆臻：softmax函数计算时候为什么要减去一个最大值？](https://zhuanlan.zhihu.com/p/29376573)

再谈谈一个容易搞混的东西： Softmax\ Loss 

上面我们丢入一个长度为 K 的 z 向量，得到 \sigma ，而softmax loss呢，则是：

$SL=\sum_{k=1}^{K}-y_klog(\sigma_k) $

其中 y_k 是一个长度为 K 的one-hot向量，即 y_k\in\{0,1\} ，只有ground truth对应的 y_k=1 。所以也可以简写为：

$SL=-y_{gt}log(\sigma_{gt})=-log(\sigma_{gt})$

到这里我们不妨在看看交叉熵 Cross Entropy ：

$$CE=\sum_{k=1}^{K}-P_{k}log(p_k)$$

其中 P 是真实分布，在分类任务中， P 实际上等价于上面的 y 。而 p 则是预测分布，在分类任务中 p 实际上等价于上面的 \sigma 。这样一来进行化简就得到：

$CE=\sum_{k=1}^{K}-y_klog(\sigma_k)\to\ CE=-log(\sigma_{gt}) $

我咋觉得这么眼熟呢...

CE=SL 

所以，我们可以得到：

SoftMax\ Loss = CrossEntropy(SoftMax) 

> 参考链接：https://blog.csdn.net/u014380165/article/details/77284921

二、SphereFace

> 论文地址：[https://arxiv.org/pdf/1704.08063.pdf](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1704.08063.pdf)

要想增强 SoftMax 的分类能力，其实就是要在分布上做到两点：

- 让同类之间距离更近
- 让不同类之间距离更远
不妨继续看看SoftMax\ Loss：

$$L=-log(\sigma_{gt})=-log({\frac {e^{z_{gt}}}{\sum _{k=1}^{K}e^{z_{k}}}}) \\=-log({\frac {e^{W_{gt}^{T}x+b_{gt}}}{\sum_{k=1}^{K}e^{w_{k}^{T}x+b_{k}}}}) \\=-log({\frac {e^{||W_{gt}||\ ||x||cos(\theta_{W_{gt},x})+b_{gt}}}{\sum_{k=1}^{K}e^{||W_{k}||\ ||x||cos(\theta_{W_k,x})+b_{k}}}}) $$

$其中 \theta_{i,j}\in (0,\pi) 代表两个向量 i,j 之间的夹角，如果对 W_k 归一化，将偏置 b 置为0，即 ||W_k||=1 \ and \ b_k=0 ，则有：$

$$L_{m}=-log({\frac {e^{||x||cos(\theta_{W_{gt},x})}}{\sum_{k=1}^{K}e^{||x||cos(\theta_{_{Wk},x})}}}) $$

下标 m 表示 modified 。

对于 \theta 我们乘上一个大于等于1的整数 m ：

$$L_{ang}=-log({\frac {e^{||x||cos(m\theta_{W_{gt},x})}}{\sum_{k=1}^{K}e^{||x||cos(m\theta_{W_{k},x})}}})  \ m\in\{1,2,...\}$$

这样不仅放大了类之间的距离，也因放大了同类 W_{gt}^T  与 x 之间的间隔而使类内更聚拢。

$不过上述公式仍有问题：原来的 \theta_{i,j}\in (0,\pi) ，如今 m\theta_{i,j}\in (0,m\pi) 超出了向量之间的夹角函数 cos 定义域范围 (0,\pi) 咋办？$

那就变个函数呗，把n个cos怼起来变成一个递减的连续的函数：

$$\psi(\theta_{i,j})=(-1)^ncos(m\theta_{i,j})-2n,\ \theta_{i,j}\in[\frac{n\pi}{m},\frac{(n+1)\pi}{m}],\ n\in[0,m-1] $$

这样一来：

$$L_{ang}=-log({\frac {e^{||x||\psi(\theta_{W_{gt},x})}}{e^{||x||\psi(\theta_{W_{gt},x})}+ \sum_{k\neq gt}e^{||x||cos(\theta_{W_k,x})}}})   $$

如此我们就得到了SphereFace的损失函数 A-SoftMax 

原论文则是：

$$L_{ang}=\frac{1}{N}\sum_i-log({\frac {e^{||x||\psi(\theta_{y_i,i})}}{e^{||x||\psi(\theta_{y_i,i})}+\sum_{j\neq y_i}e^{||x||cos(\theta_{j,i})}  }}) $$

其中 i 表示第 i个样本， y_i 表示第 i 个样本的 ground\ truth 标签，\theta_{j,i} 表示第 W_j和样本 x_i  之间的夹角。

论文中的可视化图片：

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_6cc62d12a930.jpg)

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_69cd0d10f539.jpg)

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_44989219c663.jpg)

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_81f2fa8d48c7.jpg)

Pytorch代码实现：

`# SphereFace
class SphereProduct(nn.Module):
    r"""Implement of large margin cosine distance: :
    Args:
        in_features: size of each input sample
        out_features: size of each output sample
        m: margin
        cos(m*theta)
    """

    def __init__(self, in_features, out_features, m=4):
        super(SphereProduct, self).__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.m = m
        self.base = 1000.0
        self.gamma = 0.12
        self.power = 1
        self.LambdaMin = 5.0
        self.iter = 0
        self.weight = Parameter(torch.FloatTensor(out_features, in_features))
        nn.init.xavier_uniform(self.weight)

        # duplication formula
        # 将x\in[-1,1]范围的重复index次映射到y\[-1,1]上
        self.mlambda = [
            lambda x: x ** 0,
            lambda x: x ** 1,
            lambda x: 2 * x ** 2 - 1,
            lambda x: 4 * x ** 3 - 3 * x,
            lambda x: 8 * x ** 4 - 8 * x ** 2 + 1,
            lambda x: 16 * x ** 5 - 20 * x ** 3 + 5 * x
        ]
        """
        执行以下代码直观了解mlambda
        import matplotlib.pyplot as  plt

        mlambda = [
            lambda x: x ** 0,
            lambda x: x ** 1,
            lambda x: 2 * x ** 2 - 1,
            lambda x: 4 * x ** 3 - 3 * x,
            lambda x: 8 * x ** 4 - 8 * x ** 2 + 1,
            lambda x: 16 * x ** 5 - 20 * x ** 3 + 5 * x
        ]
        x = [0.01 * i for i in range(-100, 101)]
        print(x)
        for f in mlambda:
            plt.plot(x,[f(i) for i in x])
            plt.show()
        """

    def forward(self, input, label):
        # lambda = max(lambda_min,base*(1+gamma*iteration)^(-power))
        self.iter += 1
        self.lamb = max(self.LambdaMin, self.base * (1 + self.gamma * self.iter) ** (-1 * self.power))

        # --------------------------- cos(theta) & phi(theta) ---------------------------
        cos_theta = F.linear(F.normalize(input), F.normalize(self.weight))
        cos_theta = cos_theta.clamp(-1, 1)
        cos_m_theta = self.mlambda[self.m](cos_theta)
        theta = cos_theta.data.acos()
        k = (self.m * theta / 3.14159265).floor()
        phi_theta = ((-1.0) ** k) * cos_m_theta - 2 * k
        NormOfFeature = torch.norm(input, 2, 1)

        # --------------------------- convert label to one-hot ---------------------------
        one_hot = torch.zeros(cos_theta.size())
        one_hot = one_hot.cuda() if cos_theta.is_cuda else one_hot
        one_hot.scatter_(1, label.view(-1, 1), 1)

        # --------------------------- Calculate output ---------------------------
        output = (one_hot * (phi_theta - cos_theta) / (1 + self.lamb)) + cos_theta
        output *= NormOfFeature.view(-1, 1)

        return output

    def __repr__(self):
        return self.__class__.__name__ + '(' \
               + 'in_features=' + str(self.in_features) \
               + ', out_features=' + str(self.out_features) \
               + ', m=' + str(self.m) + ')'`

三、CosFace

> 论文地址：[https://arxiv.org/pdf/1801.09414.pdf](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1801.09414.pdf)

和SphereFace类似，CosFace也是从 SoftMax 的余弦表达形式入手，令 ||W_k||=1 \ and \ b_k=0 。与此同时，作者发现 ||x|| 对于分类并没有啥帮助，所以干脆将其固定 ||x||=s ，所以有：

$$L_{ns}=\frac{1}{N}\sum_{i}-log\frac {e^{s\ cos(\theta_{y_i,i})}} {\sum_je^{s\ cos(\theta_{j,i})}} $$

ns 应该代表归一化的 SoftMax 。

接下来与上文 A-SoftMax 类似的是也引入了常数 m ，不同的是这里的 m 是加上去的：

$$L_{lmc}=\frac{1}{N}\sum_i-log\frac{e^{s(cos(\theta_{y_i,i})-m)}}{e^{s(cos(\theta_{y_i,i})-m)}+\sum_{j\neq y_i}e^{s\ cos(\theta_j,i)}}   $$

subject\ to: 

$$W=\frac{W^*}{||W^*||}  $$

$$x=\frac{x^*}{||x^*||} $$

cos(\theta_j,i)=W^T_jx_i 

以上我们就得到了CosFace中提出的 Large\ Margin\ Cosine\ Loss 

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_9a0c5f4f871e.jpg)

代码实现：

`# CosFace
class AddMarginProduct(nn.Module):
    r"""Implement of large margin cosine distance: :
    Args:
        in_features: size of each input sample
        out_features: size of each output sample
        s: norm of input feature
        m: margin
        cos(theta) - m
    """

    def __init__(self, in_features, out_features, s=30.0, m=0.40):
        super(AddMarginProduct, self).__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.s = s
        self.m = m
        self.weight = Parameter(torch.FloatTensor(out_features, in_features))
        nn.init.xavier_uniform_(self.weight)

    def forward(self, input, label):
        # --------------------------- cos(theta) & phi(theta) ---------------------------
        cosine = F.linear(F.normalize(input), F.normalize(self.weight))
        phi = cosine - self.m
        # --------------------------- convert label to one-hot ---------------------------
        one_hot = torch.zeros(cosine.size(), device='cuda')
        # one_hot = one_hot.cuda() if cosine.is_cuda else one_hot
        one_hot.scatter_(1, label.view(-1, 1).long(), 1)
        # -------------torch.where(out_i = {x_i if condition_i else y_i) -------------
        output = (one_hot * phi) + ((1.0 - one_hot) * cosine)
        # you can use torch.where if your torch.__version__ is 0.4
        output *= self.s
        # print(output)

        return output

    def __repr__(self):
        return self.__class__.__name__ + '(' \
               + 'in_features=' + str(self.in_features) \
               + ', out_features=' + str(self.out_features) \
               + ', s=' + str(self.s) \
               + ', m=' + str(self.m) + ')'
`

四、ArcFace

> 论文地址：[https://arxiv.org/pdf/1801.07698.pdf](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1801.07698.pdf)

话不多说，直接上公式：

$$L_{}=\frac{1}{N}\sum_i-log\frac{e^{s(cos(\theta_{y_i,i}+m))}}{e^{s(cos(\theta_{y_i,i}+m))}+\sum_{j\neq y_i}e^{s\ cos(\theta_j,i)}}   $$

subject\ to: 

$$W=\frac{W^*}{||W^*||}  $$

$$x=\frac{x^*}{||x^*||} $$

cos(\theta_j,i)=W^T_jx_i 

可以看到和CosFace非常类似，只是将 m 作为角度加上去了，这样就强行拉大了同类之间的角度，使得神经网络更努力地将同类收得更紧。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_eb7a0efa58bc.jpg)

伪代码实现步骤：

- 对 x 进行归一化
- 对 W 进行归一化
- 计算 Wx 得到预测向量 y 
- 从 y 中挑出与ground truth对应的值
- 计算其反余弦得到角度
- 角度加上m
- 得到挑出从 y 中挑出与ground truth对应的值所在位置的独热码
- 将 cos(\theta+m) 通过独热码放回原来的位置
- 对所有值乘上固定值 s 
代码实现：

`# ArcFace
class ArcMarginProduct(nn.Module):
    r"""Implement of large margin arc distance: :
        Args:
            in_features: size of each input sample
            out_features: size of each output sample
            s: norm of input feature
            m: margin

            cos(theta + m)
        """

    def __init__(self, in_features, out_features, s=30.0, m=0.50, easy_margin=False):
        super(ArcMarginProduct, self).__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.s = s
        self.m = m
        # Parameter 的用途：
        # 将一个不可训练的类型Tensor转换成可以训练的类型parameter
        # 并将这个parameter绑定到这个module里面
        # net.parameter()中就有这个绑定的parameter，所以在参数优化的时候可以进行优化的
        # https://www.jianshu.com/p/d8b77cc02410
        # 初始化权重
        self.weight = Parameter(torch.FloatTensor(out_features, in_features))
        nn.init.xavier_uniform_(self.weight)

        self.easy_margin = easy_margin
        self.cos_m = math.cos(m)
        self.sin_m = math.sin(m)
        self.th = math.cos(math.pi - m)
        self.mm = math.sin(math.pi - m) * m

    def forward(self, input, label):
        # --------------------------- cos(theta) & phi(theta) ---------------------------
        # torch.nn.functional.linear(input, weight, bias=None)
        # y=x*W^T+b
        cosine = F.linear(F.normalize(input), F.normalize(self.weight))
        sine = torch.sqrt(1.0 - torch.pow(cosine, 2))
        # cos(a+b)=cos(a)*cos(b)-size(a)*sin(b)
        phi = cosine * self.cos_m - sine * self.sin_m
        if self.easy_margin:
            # torch.where(condition, x, y) → Tensor
            # condition (ByteTensor) – When True (nonzero), yield x, otherwise yield y
            # x (Tensor) – values selected at indices where condition is True
            # y (Tensor) – values selected at indices where condition is False
            # return:
            # A tensor of shape equal to the broadcasted shape of condition, x, y
            # cosine>0 means two class is similar, thus use the phi which make it
            phi = torch.where(cosine > 0, phi, cosine)
        else:
            phi = torch.where(cosine > self.th, phi, cosine - self.mm)
        # --------------------------- convert label to one-hot ---------------------------
        # one_hot = torch.zeros(cosine.size(), requires_grad=True, device='cuda')
        # 将cos(\theta + m)更新到tensor相应的位置中
        one_hot = torch.zeros(cosine.size(), device='cuda')
        # scatter_(dim, index, src)
        one_hot.scatter_(1, label.view(-1, 1).long(), 1)
        # -------------torch.where(out_i = {x_i if condition_i else y_i) -------------
        output = (one_hot * phi) + ((1.0 - one_hot) * cosine)
        # you can use torch.where if your torch.__version__ is 0.4
        output *= self.s
        # print(output)

        return output

`

到此ArcFace、SphereFace、CosFace的损失函数就介绍完啦~

参考链接：https://blog.csdn.net/fuwenyan/article/details/79657738

欢迎关注个人微信公众号：

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_d3143c5fc425.jpg)

欢迎扫码关注~
