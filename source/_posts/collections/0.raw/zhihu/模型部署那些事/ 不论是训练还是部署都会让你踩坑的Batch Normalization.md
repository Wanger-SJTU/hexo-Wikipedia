---
title: (1 封私信) 不论是训练还是部署都会让你踩坑的Batch Normalization
date: "2021-07-11 00:00:00"
updated: "2021-07-11 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/模型部署那些事/不论是训练还是部署都会让你踩坑的Batch-Normalization/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/388730276
---


原文来自：

[![](/images/collections/0.raw/zhihu/%25E6%25A8%25A1%25E5%259E%258B%25E9%2583%25A8%25E7%25BD%25B2%25E9%2582%25A3%25E4%25BA%259B%25E4%25BA%258B/asset/img_6788c640f41d.jpg)不看必进坑~不论是训练还是部署都会让你踩坑的Batch Normalizationmp.weixin.qq.com/s?__biz=Mzg3ODU2MzY5MA==&mid=2247487388&idx=1&sn=915ef017a4de77dd545f788bfcd4d86d&chksm=cf109799f8671e8ff68dd5ac34929982d99a9d4a75638ac23ba77741f2f2d0d42c019de9b36e&token=1139683613&lang=zh_CN#rd](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzg3ODU2MzY5MA%3D%3D%26mid%3D2247487388%26idx%3D1%26sn%3D915ef017a4de77dd545f788bfcd4d86d%26chksm%3Dcf109799f8671e8ff68dd5ac34929982d99a9d4a75638ac23ba77741f2f2d0d42c019de9b36e%26token%3D1139683613%26lang%3Dzh_CN%23rd)

### **简单的Batch Normalization**

BN、Batch Normalization、批处理化层。

想必大家都不陌生。

BN是2015年论文**[Batch Normalization: Accelerating Deep Network Training by Reducing Internal Covariate Shift](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1502.03167)**提出的一种**数据归一化方法**。现在也是大多数神经网络结构的**标配**，我们可能已经**熟悉的不能再熟悉了**。

简单回归一下BN层的作用：

BN层往往用在深度神经网络的卷积层之后、激活层之前。其作用可以**加快模型训练时的收敛速度**，使得模型训练过程**更加稳定**，避免梯度爆炸或者梯度消失。并且起到一定的**正则化**作用，几乎代替了Dropout。

借一下Pytorch官方文档中的BN公式，我们来回顾一下：

![](/images/collections/0.raw/zhihu/%25E6%25A8%25A1%25E5%259E%258B%25E9%2583%25A8%25E7%25BD%25B2%25E9%2582%25A3%25E4%25BA%259B%25E4%25BA%258B/asset/img_7e2e202489d5.jpg)

上述的式子很简单，无非就是减均值除方差(其实是标准差)，然后乘以一个权重加上一个系数，其中权重和系数是**可以学习**的，在模型forward和backward的时候会进行更新。是不是很简单？

但BN层的作用和内部原理可能远远不止于此。可研究点还有很多，前一阵子facebook新出的论文**[Rethinking “Batch” in Batch Norm](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2105.07576)**对BN层进行了一次新的解释。

![](/images/collections/0.raw/zhihu/%25E6%25A8%25A1%25E5%259E%258B%25E9%2583%25A8%25E7%25BD%25B2%25E9%2582%25A3%25E4%25BA%259B%25E4%25BA%258B/asset/img_26beb6aafc88.jpg)

借用**[陀飞轮兄](https://www.zhihu.com/question/38102762/answer/1895873061)**的回答：

** BN效果好是因为BN的存在会引入mini-batch内其他样本的信息，就会导致预测一个独立样本时，其他样本信息相当于正则项，使得loss曲面变得更加平滑，更容易找到最优解。相当于一次独立样本预测可以看多个样本，学到的特征泛化性更强，更加general。
 BN层仍然有一些我们未知的特性待我们去发掘，不过BatchNormalization的简单介绍先到这里**，接下来我们讨论下BN的细节以及会遇到的坑，不论是训练还是部署，如果对BN不熟悉，说不定哪天就会踩到坑里~

![](/images/collections/0.raw/zhihu/%25E6%25A8%25A1%25E5%259E%258B%25E9%2583%25A8%25E7%25BD%25B2%25E9%2582%25A3%25E4%25BA%259B%25E4%25BA%258B/asset/img_823631a7e83b.jpg)

### **BN层都在哪里**

因为BN层太**常见**了，以至于我们以为每个神经网络中可能都有BN层，但事实肯定不是这样。

除了BN层，还有GN(Group Normalization)、LN(Layer Normalization、IN(Instance Normalization)这些个标准化方法，每个标注化方法都适用于不同的任务。

![](/images/collections/0.raw/zhihu/%25E6%25A8%25A1%25E5%259E%258B%25E9%2583%25A8%25E7%25BD%25B2%25E9%2582%25A3%25E4%25BA%259B%25E4%25BA%258B/asset/img_c7ac86924079.jpg)

举几个简单的应用场景：

- ResNet、Resnext、Mobilenet等常见的backbone，使用的就是**BN**
- Swin Transformer，使用了**Layer Normalization**
- **Group Normalization**有时候会代替BN用在我们常见的网络中
- **Instance Normalization**在Gan、风格迁移类模型中经常用到
上述是老潘见到过的一些例子，也算是抛砖引玉。这些不同的标准化方法，说白了就是**不同维度**的标准化，有的时候稍微改变一下代码就可以互相混用，不过本文的重点不在这里。

### **BN层都在这里**

我们翻一翻常见的backbone的结构。可以看到在官方Pytorch的`resnet.py`的`class BasicBlock`中，forward时的基本结构是`Conv+BN+Relu`:

`# 省略了一些地方
class BasicBlock(nn.Module):
    def __init__(self,...) -> None:
        ...
        self.conv1 = conv3x3(inplanes, planes, stride)
        self.bn1 = norm_layer(planes)
        self.relu = nn.ReLU(inplace=True)
        self.conv2 = conv3x3(planes, planes)
        self.bn2 = norm_layer(planes)
        self.downsample = downsample
        self.stride = stride

    def forward(self, x: Tensor) -> Tensor:
        identity = x
        # 常见的Conv+BN+Relu
        out = self.conv1(x)
        out = self.bn1(out)
        out = self.relu(out)
        # 又是Conv+BN+relu
        out = self.conv2(out)
        out = self.bn2(out)
        if self.downsample is not None:
            identity = self.downsample(x)
        out += identity
        out = self.relu(out)

        return out
`

resnet作为我们常见的**万年青backbone**不是没有理由的，**效果好速度快方便部署**。当然还有很多其他优秀的backbone，这些backbone的内部结构也多为`Conv+BN+Relu`或者`Conv+BN`的结构。

这种结构是很常见的。

### **常见的Conv+BN+Relu融合**

既然这个融合已经很常见了，现在也基本是标配。一般网络中往往也有很多这样的结构，如果可以优化的话，岂不是可以实现加速？当然是可以的。

我们在训练模型的时候，网络结构都是按照`Conv+BN+Relu`这样的顺序搭建的，我们的数据也会一层一层从卷积到批处理化、从批处理化到激活层。嗯，这种很显而易见嘛。

但我们都知道BN层在**推理的时候**也只需要之前训练好**固定的参数**：均值{\hat{\sigma}}、方差\sigma_{2}、权重\gamma以及偏置\beta:

![](/images/collections/0.raw/zhihu/%25E6%25A8%25A1%25E5%259E%258B%25E9%2583%25A8%25E7%25BD%25B2%25E9%2582%25A3%25E4%25BA%259B%25E4%25BA%258B/asset/img_14df9cfb07ec.jpg)

那么，有没有办法将BN层的参数和前一层的卷积合并，这样BN层就可以功成名就了，之后的模型推理也就不再需要它了。

当然是可以的，假设上一层卷积的输出:w*x+b。

而BN层的输出公式可以转化为以下形式：

![](/images/collections/0.raw/zhihu/%25E6%25A8%25A1%25E5%259E%258B%25E9%2583%25A8%25E7%25BD%25B2%25E9%2582%25A3%25E4%25BA%259B%25E4%25BA%258B/asset/img_914d8bf48aac.jpg)

我们对于最后的w、x和偏置b，发现只需要将**卷积权重缩放一定倍数，并对偏置进行一定变化**，就可以将BN层的参数融合进Conv中了。这就相当于**两次线性变化**，两个线性变化是可以叠加融合的。

融合后的Conv+BN就相当于一个Conv了，因为大部分网络结构中Conv+BN这样的组合很多，所以一般来说仅仅是这个融合操作就可以使模型加速10%左右。

### **TensorRT中的融合**

这种基本的优化方式TensorRT肯定是不会放过的，我们来看看TensorRT对BN层的处理：

![](/images/collections/0.raw/zhihu/%25E6%25A8%25A1%25E5%259E%258B%25E9%2583%25A8%25E7%25BD%25B2%25E9%2582%25A3%25E4%25BA%259B%25E4%25BA%258B/asset/img_af4fadccea23.jpg)

这张图是官方介绍TensorRT优化的例子，很显然上述的`3x3 conv + bias + relu`被合并成了一个`3x3 CBR`，其中bias可以相当于bn(之后会介绍)，我们简单看下Pytorch中inception的结构：

`def _forward(self, x: Tensor) -> List[Tensor]:
    branch1x1 = self.branch1x1(x)

    branch5x5 = self.branch5x5_1(x)
    branch5x5 = self.branch5x5_2(branch5x5)

    branch3x3dbl = self.branch3x3dbl_1(x)
    branch3x3dbl = self.branch3x3dbl_2(branch3x3dbl)
    branch3x3dbl = self.branch3x3dbl_3(branch3x3dbl)

    branch_pool = F.avg_pool2d(x, kernel_size=3, stride=1, padding=1)
    branch_pool = self.branch_pool(branch_pool)
    # 就是这里需要cat的四个分支
    outputs = [branch1x1, branch5x5, branch3x3dbl, branch_pool]
    return outputs
`

其中每个最基本的CONV模块就是，显然还是一个CONV+BN的结构:

`class BasicConv2d(nn.Module):

  def __init__(
      self,
      in_channels: int,
      out_channels: int,
      **kwargs: Any
  ) -> None:
      super(BasicConv2d, self).__init__()
      self.conv = nn.Conv2d(in_channels, out_channels, bias=False, **kwargs)
      self.bn = nn.BatchNorm2d(out_channels, eps=0.001)

  def forward(self, x: Tensor) -> Tensor:
      x = self.conv(x)
      x = self.bn(x)
      return F.relu(x, inplace=True)
`

在TensorRT中BN层相当于Scale级别的变化，为什么，回顾一下老潘介绍过的公式：

![](/images/collections/0.raw/zhihu/%25E6%25A8%25A1%25E5%259E%258B%25E9%2583%25A8%25E7%25BD%25B2%25E9%2582%25A3%25E4%25BA%259B%25E4%25BA%258B/asset/img_914d8bf48aac.jpg)

我们在利用TensorRT进行模型解析时，比如从ONNX中解析成TensorRT的网络结构，我们会提前对BN层的一些操作进行合并和融合。来看看**[ONNX-TensorRT](https://link.zhihu.com/?target=https%3A//github.com/onnx/onnx-tensorrt)**是怎么做的吧:

`DEFINE_BUILTIN_OP_IMPORTER(BatchNormalization)
{
    // ...省略部分代码
    // 从ONNX中BN层中会取到四个参数，分别是权重、偏置、mean和var
    const auto scale = inputs.at(1).weights();
    const auto bias = inputs.at(2).weights();
    const auto mean = inputs.at(3).weights();
    const auto variance = inputs.at(4).weights();
    // ...

    OnnxAttrs attrs(node, ctx);
    float eps = attrs.getfloat>("epsilon", 1e-5f);

    // 在这里将以上四个参数合并为 最终的权重和偏置
    const int32_t nbChannels = scale.shape.d[0];
    auto combinedScale = ctx->createTempWeights(scale.type, scale.shape);
    auto combinedBias = ctx->createTempWeights(bias.type, bias.shape);
    for (int32_t i = 0; i  nbChannels; ++i)
    {
        combinedScale.atfloat>(i) = scale.atfloat>(i) / sqrtf(variance.atfloat>(i) + eps);
        combinedBias.atfloat>(i) = bias.atfloat>(i) - mean.atfloat>(i) * combinedScale.atfloat>(i);
    }
    // 这里将合并后的权重和偏置 组合为一个scale层
    return scaleHelper(ctx, node, *tensorPtr, nvinfer1::ScaleMode::kCHANNEL, combinedBias, combinedScale,
        ShapedWeights::empty(scale.type), bias.getName(), scale.getName());
}
`

通过TensorRT的前端解释器解释后，TensorRT会将BN层视为一个简单的Scale层(通过`addScaleNd`构建)，之后的优化中会根据情况与该层前面的CONV层合并：

** Convolution and Scale A Convolution layer followed by a Scale layer that is kUNIFORM or kCHANNEL can be fused into a single convolution by adjusting the convolution weights. This fusion is disabled if the scale has a non-constant power parameter.
 
### RepVGG中融合方式**

当然很多其他地方也可以实现相应的操作，最简单的我们可以直接在Pytorch模型中通过修改`.py`文件实现这样的操作，这样我们在推理的时候就会比在训练中快一些，在**[repvgg](https://link.zhihu.com/?target=https%3A//github.com/DingXiaoH/RepVGG)**中也有类似的融合思想，这里就不详细描述了：

`# https://github.com/DingXiaoH/RepVGG/blob/main/repvgg.py
# repvgg中bn层的融合方式
def _fuse_bn_tensor(self, branch):
    if branch is None:
        return 0, 0
    if isinstance(branch, nn.Sequential):
        kernel = branch.conv.weight
        running_mean = branch.bn.running_mean
        running_var = branch.bn.running_var
        gamma = branch.bn.weight
        beta = branch.bn.bias
        eps = branch.bn.eps
    else:
        assert isinstance(branch, nn.BatchNorm2d)
        if not hasattr(self, 'id_tensor'):
            input_dim = self.in_channels // self.groups
            kernel_value = np.zeros((self.in_channels, input_dim, 3, 3), dtype=np.float32)
            for i in range(self.in_channels):
                kernel_value[i, i % input_dim, 1, 1] = 1
            self.id_tensor = torch.from_numpy(kernel_value).to(branch.weight.device)
        kernel = self.id_tensor
        running_mean = branch.running_mean
        running_var = branch.running_var
        gamma = branch.weight
        beta = branch.bias
        eps = branch.eps
    std = (running_var + eps).sqrt()
    t = (gamma / std).reshape(-1, 1, 1, 1)
    return kernel * t, beta - running_mean * gamma / std
`

### **有坑的优化**

上述我们聊了BN层的基本优化策略，那么这种优化我们在任何时候都可以使用吗？当然不是！

大多数的`CONV+BN`优化都是无害的，既可以提升模型的速度也不会影响模型的**正常推理**。但有时候这个优化是有害的！在某些场景下**这样优化会严重影响模型的结果**。比如**Pix2Pix-GAN**这类模型，也就是风格迁移或者GAN等图像生成任务场景下，如果无脑使用了这种优化，可能会使模型产出错误的结果。

当然其他场景下也可能有问题，这种问题更容易出现在像素级别预测的模型(分割、GAN、风格迁移之类)，相信也有很多的同学遇到过这样的问题，在Pytorch中，会发现`model.eval()`和`model.train()`的结果差异很大，这是为什么呢？

有一种原因可能是因为我们在训练时候和推理时候，数据的均值和方差差异较大。或者说你训练的时候batchsize比较小，无法较好统计整体训练数据的整体mean和std，具体原因老潘也不确定，有相同遭遇的同学们不妨说下~

回到BN，刚才介绍的BN中的四个参数均值{\hat{\sigma}}、方差\sigma_{2}、权重\gamma以及偏置\beta，其中**均值和方差**在推理过程中可以是动态也可以是固定。

如果是动态的，也就是我们在推理的时候也会实时计算当前输入batch(推理的时候batch往往为1)数据的均值方差，然后执行BN操作；如果是固定的，则会使用训练过程中更新好的均值方差进行计算，此时均值方差是固定参数不会变。

而我们在优化BN的时候，通常就是将固定好的这四个参数与上一层卷积融合，这样就相当于将**BN层置于推理模式**。mean和std当前是固定死了，这时候就会出现上述的问题。

那么怎么解决呢？在解决之前，我想分析一下Pytorch关于BN的源码，如果不想看源码分析的**直接看最后的结论**就好。

### **探索一下Pytorch中BN层源码**

就这个问题来说，为什么train和eval会对模型性能产生差异，我们看Pytorch的BN层是怎么实现的。注意~这部分在面试中**要考**。

首先看一下Pytorch中的`_NormBase`实现，之后Pytorch的具体BN层是继承这个类的。

我们可以看到默认`affine`和`track_running_stats`都是开启的，也就是我们平时在使用BN层的时候，权重、偏置、`running_mean`、`running_var`都是随着模型训练时候随时更新的。其中权重偏置是随着训练反向梯度的时候会进行更新，而`running_mean`、`running_var`则是buffer类型数据，可以在模型推理的时候设置是否需要更新。

`class _NormBase(Module):
    def __init__(
        self,
        num_features: int,
        eps: float = 1e-5,
        momentum: float = 0.1,
        affine: bool = True,
        track_running_stats: bool = True
    ) -> None:
        ...
        if self.affine:
            self.weight = Parameter(torch.Tensor(num_features))
            self.bias = Parameter(torch.Tensor(num_features))
        else:
            self.register_parameter('weight', None)
            self.register_parameter('bias', None)
        # 如果关闭self.track_running_stats选项，就不会储存并更新running_mean和running_var这两个参数
        if self.track_running_stats:
            self.register_buffer('running_mean', torch.zeros(num_features))
            self.register_buffer('running_var', torch.ones(num_features))
            self.register_buffer('num_batches_tracked', torch.tensor(0, dtype=torch.long))
        else:
            self.register_parameter('running_mean', None)
            self.register_parameter('running_var', None)
            self.register_parameter('num_batches_tracked', None)
        self.reset_parameters()
`

再看`_BatchNorm`的实现，而我们在平常搭建网络时使用的`BatchNorm2d`就是继承了它。Pytorch的Python端BN层核心的实现都在`_BatchNorm`这里了，`BatchNorm2d`仅仅是做了一下接口检查。

`class _BatchNorm(_NormBase):

    def __init__(self, num_features, eps=1e-5, momentum=0.1, affine=True,
                 track_running_stats=True):
        super(_BatchNorm, self).__init__(
            num_features, eps, momentum, affine, track_running_stats)

    def forward(self, input: Tensor) -> Tensor:
        self._check_input_dim(input)
        ... 

        if self.training and self.track_running_stats:
            # TODO: if statement only here to tell the jit to skip emitting this when it is None
            if self.num_batches_tracked is not None:  # type: ignore
                self.num_batches_tracked = self.num_batches_tracked + 1  # type: ignore
                if self.momentum is None:  # use cumulative moving average
                    exponential_average_factor = 1.0 / float(self.num_batches_tracked)
                else:  # use exponential moving average
                    exponential_average_factor = self.momentum
        # 需要注意这里，bn_training这个参数会传递到底层的C++实现端，通过这个参数在C++端决定是否更新mean和std
        if self.training:
            bn_training = True
        else:
            bn_training = (self.running_mean is None) and (self.running_var is None)

        r"""
        Buffers are only updated if they are to be tracked and we are in training mode. Thus they only need to be
        passed when the update should occur (i.e. in training mode when they are tracked), or when buffer stats are
        used for normalization (i.e. in eval mode when buffers are not None).
        """
        assert self.running_mean is None or isinstance(self.running_mean, torch.Tensor)
        assert self.running_var is None or isinstance(self.running_var, torch.Tensor)
        return F.batch_norm(
            input,
            # If buffers are not to be tracked, ensure that they won't be updated
            self.running_mean if not self.training or self.track_running_stats else None,
            self.running_var if not self.training or self.track_running_stats else None,
            self.weight, self.bias, bn_training, exponential_average_factor, self.eps)
`

需要注意的，上述Pytorch前端BN代码中的`bn_training`会传递到C++的底层实现，而BN的C++底层实现会根据这个布尔变量决定是否实时计算mean和std。

而`bn_training`这个参数并不是一定由**模型在训练状态决定**的参数，如果BN层中没有初始化`self.running_mean`和`self.running_var`，也就是我们一开始初始化BN层的时候，关闭了`track_running_stats`这个参数，那么这个BN层是不会在训练过程中记录`self.running_mean`和`self.running_var`，而是实时计算。

### **再看Pytorch的C++源码**

Pytorch中底层C++BN层的具体实现代码在`/pytorch/aten/src/ATen/native/Normalization.cpp`中，这里不涉及到BN的反向传播，我们先看BN的前向处理过程。

为了方便理解，我们阅读的是**CPU版本**的实现(GPU版本与CPU的原理是相同的)。

`std::tupleTensor, Tensor, Tensor> batch_norm_cpu(const Tensor& self, const c10::optionalTensor>& weight_opt, const c10::optionalTensor>& bias_opt, const c10::optionalTensor>& running_mean_opt, const c10::optionalTensor>& running_var_opt,
                                                  bool train, double momentum, double eps) {
  // See [Note: hacky wrapper removal for optional tensor]
  const Tensor& weight = c10::value_or_else(weight_opt, [] {return Tensor();});
  const Tensor& bias = c10::value_or_else(bias_opt, [] {return Tensor();});
  const Tensor& running_mean = c10::value_or_else(running_mean_opt, [] {return Tensor();});
  const Tensor& running_var = c10::value_or_else(running_var_opt, [] {return Tensor();});

  checkBackend("batch_norm_cpu", {self, weight, bias, running_mean, running_var}, Backend::CPU);

  return AT_DISPATCH_FLOATING_TYPES(self.scalar_type(), "batch_norm", [&] {
      if (!train) {
        return batch_norm_cpu_transform_input_templatescalar_t>(self, weight, bias, {}, {}, running_mean, running_var, train, eps);
      } else {
        // 可以看到这里，如果是传递过来的train是true的话，首先会根据当前数据动态更新一波`running_mean`和`running_var`
        auto save_stats = batch_norm_cpu_update_stats_templatescalar_t, InvStd>(self, running_mean, running_var, momentum, eps);
        return batch_norm_cpu_transform_input_templatescalar_t>(self, weight, bias, std::get0>(save_stats), std::get1>(save_stats), running_mean, running_var, train, eps);
      }
    });
}
`

`batch_norm_cpu_update_stats_template`做了啥？就是更新一下当前输入batch数据的均值和方差。

`templatetypename scalar_t, templatetypename T> class VarTransform>
std::tupleTensor,Tensor> batch_norm_cpu_update_stats_template(
    const Tensor& input, const Tensor& running_mean, const Tensor& running_var,
    double momentum, double eps) {

  using accscalar_t = at::acc_typescalar_t, false>;
  // 计算channel维度
  int64_t n_input = input.size(1);
  int64_t n = input.numel() / n_input;

  Tensor save_mean = at::empty({n_input}, input.options());
  Tensor save_var_transform = at::empty({n_input}, input.options());
  auto save_mean_a = save_mean.accessorscalar_t, 1>();
  auto save_var_transform_a = save_var_transform.accessorscalar_t, 1>();
  // 得到running_mean_a 和 running_var_a
  auto running_mean_a = conditional_accessor_1dscalar_t>(running_mean);
  auto running_var_a = conditional_accessor_1dscalar_t>(running_var);

  parallel_for(0, n_input, 1, [&](int64_t b_begin, int64_t b_end) {
    for (int64_t f = b_begin; f  b_end; ++f) {
      Tensor in = input.select(1, f);

      // compute mean per input
      auto iter = TensorIteratorConfig()
        .add_input(in)
        .build();
      accscalar_t sum = 0;
      cpu_serial_kernel(iter, [&](const scalar_t i) -> void {
        sum += i;
      });
      scalar_t mean = sum / n;
      save_mean_a[f] = mean;

      // compute variance per input
      accscalar_t var_sum = 0;
      iter = TensorIteratorConfig()
        .add_input(in)
        .build();
      cpu_serial_kernel(iter, [&](const scalar_t i) -> void {
        var_sum += (i - mean) * (i - mean);
      });
      save_var_transform_a[f] = VarTransformaccscalar_t>{}(var_sum / n, eps);
      // 更新运行中的mean和var 状态
      if (running_mean.defined()) {
        running_mean_a[f] = momentum * mean + (1 - momentum) * running_mean_a[f];
      }
      if (running_var.defined()) {
        accscalar_t unbiased_var = var_sum / (n - 1);
        running_var_a[f] = momentum * unbiased_var + (1 - momentum) * running_var_a[f];
      }
    }
  });
  return std::make_tuple(save_mean, save_var_transform);
}
`

而`batch_norm_cpu_transform_input_template`就是具体的BN层实现：

`templatetypename scalar_t>
std::tupleTensor,Tensor,Tensor> batch_norm_cpu_transform_input_template(
    const Tensor& input, const Tensor& weight, const Tensor& bias,
    const Tensor& save_mean /* optional */, const Tensor& save_invstd /* optional */,
    const Tensor& running_mean /* optional */, const Tensor& running_var /* optional */,
    bool train, double eps) {
  ...
  Tensor output = at::empty_like(input, LEGACY_CONTIGUOUS_MEMORY_FORMAT);

  int64_t n_input = input.size(1);

  auto save_mean_a = conditional_accessor_1dscalar_t>(save_mean);
  auto save_invstd_a = conditional_accessor_1dscalar_t>(save_invstd);

  auto running_mean_a = conditional_accessor_1dscalar_t>(running_mean);
  auto running_var_a = conditional_accessor_1dscalar_t>(running_var);

  parallel_for(0, n_input, 1, [&](int64_t b_begin, int64_t b_end) {
    for (int64_t f = b_begin; f  b_end; ++f) {
      Tensor in = input.select(1, f);
      Tensor out = output.select(1, f);

      scalar_t mean, invstd;
      // 根据是否是训练模式，决定是否使用实时更新的mean和std
      if (train) {
        mean = save_mean_a[f];
        invstd = save_invstd_a[f];
      } else {
        mean = running_mean_a[f];
        invstd = 1 / std::sqrt(running_var_a[f] + eps);
      }

      // compute output
      scalar_t w = weight.defined() ? weight.data_ptrscalar_t>()[f * weight.stride(0)] : 1;
      scalar_t b = bias.defined() ? bias.data_ptrscalar_t>()[f * bias.stride(0)] : 0;

      auto iter = TensorIterator::unary_op(out, in);
      cpu_serial_kernel(iter, [=](const scalar_t i) -> scalar_t {
        return ((i - mean) * invstd) * w + b;
      });
    }
  });
  return std::make_tuple(output, save_mean, save_invstd);
}
`

### **总结下Pytorch中的BN行为**

总结一下，Pytorch中的BN有两种处理`running_mean`和`running_var`的方式:

- 默认情况下是开启的，这两个参数会注册存在，也可以被更新，当`train`设置为false则不会更新
- 可以初始化的时候关闭，此时不管是推理还是训练，都会重新计算一遍mean和std
而Pytorch中BN的train与eval的区别，则是`train`是否设置为True，传入C++中即`bn_training`是否为True，这个参数会决定BN层是否实时更新mean和std。

### **最终解决方案**

知道问题出在哪里了，那我们该怎么办呢？

如果模型只是需要运行在Pytorch端，那么只需要在模型推理时候加上`model.train()`即可，但如果该模型需要**转化为TensorRT**或者其他推理框架，我们该怎么办？这里有两种方法：

- 一种方法是重新训练模型，可以在训练的时候冻住BN层，防止其更新mean和std，强制模型使用固定的mean和std进行训练；
- 另一种当然是修改转换端了，我们这里修改下TensorRT的BN实现
既然通过**ONNX-TensorRT**的方式走不通，我们可以换另一种转换方式：

- **[Torch2trt](https://link.zhihu.com/?target=https%3A//github.com/NVIDIA-AI-IOT/torch2trt)**。
Torch2trt是通过映射**Pytorch的op到TensorRT**中，这样我们就可以实现一个推理版的`TrainBatchNorm2d`，然后让这个解释器按照相应的op来转换到TensorRT端：

`# 这里我们实现了一个纯python版的BN
class TrainBatchNorm2d(torch.nn.BatchNorm2d):
    def __init__(self, num_features, eps=1e-5, momentum=0.1,
                 affine=True, track_running_stats=True):
        super(TrainBatchNorm2d, self).__init__(
            num_features, eps, momentum, affine, track_running_stats)

    def forward(self, input):

        exponential_average_factor = self.momentum
        # 注意，这里的mean和var是实时计算的
        mean = input.mean([0, 2, 3])
        var = input.std([0, 2, 3], unbiased=False)
        var = torch.pow(var,2)
        n = input.numel() / input.size(1)
        input = (input - mean[None, :, None, None]) / (torch.sqrt(var[None, :, None, None] + self.eps))
        if self.affine:
            input = input * self.weight[None, :, None, None] + self.bias[None, :, None, None]

        return input
`

这样写好之后，模型顺利转换为TensorRT而且结果也正常了，但是速度缺很慢...dump了一下每层的耗时，发现耗时卡在`mean = input.mean([0, 2, 3])`这一步，网上简单搜了一下有没有和我们遇到相同问题的，还真有：https://forums.developer.nvidia.com/t/tensorrt-custom-roialign-plugin-is-very-slow/

这貌似是TensorRT的一个bug，在某种情况下，这种计算方式会导致GPU和CPU中的数据传输很慢很慢，具体原因这里先不展开(其实我也不知道为啥，但就是不行)。我们先尝试下有没有其他路子。

究极无敌替换大法，我们可以将`mean = input.mean([0, 2, 3])`等价替换为`mean = input.mean(3).mean(2).mean(0)`这样可以避免多维度的同时处理。至于std的话，我们不能直接`std = input.std(3).std(2).std(0)`，但是因为BN只是对H、W和N维度上进行均值方差，我们可以这样：

- 首先将其以channel打成二维`input_hw_flatten = input.view(input.size(1),-1)`
- 然后对二维`input_hw_flatten`的第二维进行方差计算
即可，整体来说就是个等价替换：

`class TrainedBatchNorm2d(torch.nn.BatchNorm2d):
    def __init__(self, num_features, eps=1e-5, momentum=0.1,
                 affine=True, track_running_stats=True):
        super(TrainBatchNorm2d, self).__init__(
            num_features, eps, momentum, affine, track_running_stats)

    def forward(self, input):

        mean = input.mean(3).mean(2).mean(0)
        input_hw_flatten = input.view(input.size(1),-1)
        var = input_hw_flatten.std(1, unbiased=False)

        input = input - mean[None, :, None, None]
        input = input / (var[None, :, None, None] + self.eps)
        
        if self.affine:
            input = input * self.weight[None, :, None, None] + self.bias[None, :, None, None]

        return input
`

咦，这样貌似就没问题了，模型转换成功，BN层不再依赖固定的`mean`和`std`，而且速度也正常了。

解决！

### **后记**

BN层很简单，但是其中的一些隐含的信息却不得不值得我们去重视。毕竟细节决定成败呀。

老潘来北京也快一年了，想想时间过得真是快，上半年也很快过去了，下半年也即将开始。回顾之前，自己不足的地方仍有很多，想做的事情也有很多，想再提升、充实下自己，也希望和各位共勉。

我是老潘，我们下期见~

### **参考资料**

https://blog.csdn.net/weixin_39580564/article/details/110518533 https://blog.csdn.net/Cxiazaiyu/article/details/81838306#commentBox https://discuss.pytorch.org/t/what-num-batches-tracked-in-the-new-bn-is-for/27097
