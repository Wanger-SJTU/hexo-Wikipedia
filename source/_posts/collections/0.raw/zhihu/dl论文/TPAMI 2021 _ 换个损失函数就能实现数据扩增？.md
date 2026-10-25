---
title: TPAMI 2021 | 换个损失函数就能实现数据扩增？
date: "2021-01-19 00:00:00"
updated: "2021-01-19 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/TPAMI-2021-_-换个损失函数就能实现数据扩增/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/344953635
---


本文主要介绍我们刚刚被IEEE Transactions on Pattern Analysis and Machine Intelligence （<strong>T-PAMI</strong>）录用的一篇文章：[Regularizing Deep Networks with Semantic Data Augmentation](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2007.10538)。其会议版本发表在NeurIPS 2019：[链接](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1909.12220)。代码和预训练模型已开源：[链接](https://link.zhihu.com/?target=https%3A//github.com/blackfeather-wang/ISDA-for-Deep-Networks)。

在计算机视觉任务中，数据扩增是一种基于较少数据、产生大量训练样本，进而提升模型性能的有效方法。传统数据扩增方法主要借助于图像域的<strong>翻转、平移、旋转</strong>等简单变换，如图1中第一行所示。我们的工作则提出了一种<strong>隐式语义数据扩增</strong>算法：<strong>ISDA</strong>，意在实现对样本进行更为「<strong>高级</strong>」的、「<strong>语义</strong>」层面的变换，例如改变物体的<strong>背景、颜色、视角</strong>等，如图1中第二行所示，注意这些变换并不改变任务标签。具体而言，ISDA具有几个重要的特点：

- 与传统数据扩增方法高度互补，有效地增进扩增多样性和进一步提升性能
- 巧妙地利用深度神经网络长于学习线性化表征的性质，在特征空间完成扩增过程，无需训练任何辅助生成模型（如GAN等），几乎不引入任何额外计算或时间开销
- 直接优化无穷扩增样本期望损失的一个上界，最终形式仅为一个全新的损失函数，简单易用，便于实现
- 可以广泛应用于全监督、半监督图像识别、语义分割等视觉任务，在ImageNet、Cityscapes等较大规模的数据集上效果比较明显
![](https://picx.zhimg.com/v2-3d1b8028840577ea194491295d63b5cd_r.jpg)图1：传统数据扩增与语义数据扩增的比较
1.  <strong>Introduction （研究动机及简介）</strong>
数据扩增是一种非常有效的提升深度学习模型泛化性能的方法，一般而言，我们会在输入空间进行一些特定的变换，以基于有限的数据产生大量的样本用于训练，如图2中对汽车图像进行<strong>旋转</strong>、<strong>左右翻转</strong>、<strong>放缩</strong>、<strong>裁剪</strong>等。其效果往往非常显著，例如，在图2右侧柱状图中，我们展示了在相同的实验设置（优化器、训练时长等）下，在 CIFAR 图像识别数据集上，是否进行数据扩增所导致的性能差异。在 CIFAR-10 数据集上，测试误差从 13.6% 降至 6.4%；在 CIFAR-100 数据集上，测试误差从 44% 降至 27%。

![](https://picx.zhimg.com/v2-5e48291f79aa92793a874ad153c1e695_r.jpg)图2：传统数据扩增简介本质上，数据扩增的效果来源于<strong>促进模型对于我们定义的这些变换的不变性</strong>。然而，从生物体的角度出发，视觉的不变性并不仅限于简单的几何变换，而是更多地体现在更为高级的语义层面。例如在图3中，当我们改变汽车的<strong>颜色、视角和背景</strong>时，我们仍然可以辨识出，这是一辆汽车。这就启发我们：能不能将这些<strong>不改变类别主体的语义变换</strong>引入到数据扩增中？

![](https://pic2.zhimg.com/v2-30105c1b19550991e63c20d1e2ba308d_r.jpg)图3：语义数据扩增简介那么，如何实现这样的语义数据扩增呢？显然，一个最简单的方法就是在数据集上训练一个或多个生成模型，如GAN，去捕捉不同类别的语义分布，再从中得到大量扩增后的样本，但这样做有几个明显的弊端：（1）这一方法比较<strong>复杂</strong>，训练GAN需要设计特定的模型和配套算法，实现起来比较困难；（2）<strong>时间和计算开销较大</strong>，一方面，训练GAN需要消耗大量额外的时间和计算资源，另一方面，将GAN应用于产生扩增样本将引入额外的推理开销，并可能减慢主要模型的训练；（3）根据我们的实验结果，这一方法<strong>效果比较有限</strong>（关于这一点的详情，请参见我们的paper，简而言之，GAN的训练同样依赖于比较多的数据，于是有一个悖论：数据少->GAN难以训练->扩增效果不好；数据多->虽然GAN可以训练好->但是与直接用这些数据训练模型相比，GAN难以提供超出数据集范畴的信息，效果有限）。

![](https://pic2.zhimg.com/v2-67302704f7ec8d63ab9c452196e06e47_r.jpg)图4：基于生成模型的语义数据扩增如何更简单高效的实现我们所希望的语义变换呢？事实上，我们可以借助卷积神经网络的一个非常有趣的性质：之前的研究工作证明，由于我们往往用线性分类器约束网络的输出，深度网络的特征空间往往是<strong>线性化</strong>的，输入空间中不同样本之间复杂的语义关系倾向于表现为其对应深度特征之间的<strong>简单空间线性关系</strong>。换言之，<strong>深度特征空间中的一些方向是对应于特定语义变换的</strong>[1][2][3]。以Deep Feature Interpolation[1]为例（图5），若我们任意收集一定数量蓝色汽车和红色汽车的图片，取得前者深度特征均值指向后者深度特征均值的向量，则这一向量就代表了“将汽车的颜色由蓝色变为红色”这一语义变换。对于任意一张全新的蓝色汽车图片，我们将其深度特征沿这一方向<strong>平移</strong>后，就可以得到将这辆汽车的颜色换为红色后，所得图片对应的深度特征（这一方法的合理性证明自，此特征可以以特定方式映射回图像空间[1]）。

![](https://pic3.zhimg.com/v2-7685fee948b0078118eaba153328d05c_r.jpg)图5：借助深度特征空间的图像语义变换 —— Deep Feature Interpolation我们的工作受到了这一现象的启发，在深度特征空间中，我们为训练样本寻找改变<strong>颜色、视角、动作和背景</strong>等<strong>不影响类别标签</strong>的<strong>语义变换</strong>所对应的方向，通过将训练数据的深度特征在这些方向上平移，<strong>低成本</strong>地实现<strong>多样化</strong>的<strong>语义数据扩增</strong>，以弥补传统扩增方法在语义不变性上的不足。

2. <strong>Method （方法详述）</strong>
为了实现前文所述的目标，一个显而易见的问题是：如何在深度特征空间中寻找这些“有意义的语义方向”？Deep Feature Interpolation[1]中所采用的的方法是人工收集对应于具体变换的特定数据，再对语义方向进行标注。显然，这一思路是不适用于数据扩增的，其一，对于每一类别甚至每一样本，可行的语义方向都是有所不同的，<strong>对每一变换人工收集数据成本巨大</strong>；其二，可能的语义变换数量极多，<strong>通过预先定义、人工寻找的方只能找到非常有限的少数方向</strong>。

为了解决这两点不足，一个可能的选择是：通过随机采样得到扩增所需的语义方向。这样一方面<strong>节省了人工标注的开销</strong>，另一方面可以保证语义方向的在特征空间中连续分布，<strong>发现更多潜在的语义方向，从而提升扩增的多样性</strong>。但如此一来，采样的方式就变得尤为重要，考虑到特征空间维度极高（例如ResNet-50在ImageNet上产生2048维的特征空间，即便以二值化的假设近似，可能的取值也有 
![](https://www.zhihu.com/equation?tex=2%5E%7B2048%7D) 种），若完全随机采样，得到的语义方向极有可能是<strong>没有任何意义</strong>的，如图6所示，将汽车的图片沿“飞翔”或是“变老”的方向平移是完全没有意义的。

![](https://pic3.zhimg.com/v2-0a72f11bf35a6e7fb4628bc2a66609f8_r.jpg)图6：通过随机采样寻找语义方向那么，如何设计合适的采样方法呢？我们的工作巧妙地利用了已有的训练数据。具体而言，每一类别的样本都是有其类内特征分布的，实际上这种数据分布隐含了这类数据可能变化的方向。为了说明这一点，我们首先考虑下面这一个例子（图7）。“鸟”这一类的样本在“飞翔”这一方向上具有较大的方差，因为<strong>训练数据中同时包含“飞翔”和“不飞翔”的鸟</strong>，相对而言，其在“变老”这一方向上方差几乎为0，因为<strong>数据中不可能存在“老”或“年轻”的鸟</strong>。同理，数据中<strong>存在“老”或“年轻”的人，而不存在“飞翔”的人</strong>，因此“人”这一类的样本在“变老”这一方向上应当有较大的方差，在“飞翔”这一方向上方差几乎为0。总而言之，在多维空间中，我们<strong>可以利用类内特征分布刻画某类图像可能在哪些方向上有语义的变化</strong>。

![](https://pic3.zhimg.com/v2-7955847ef9d161e1946ee533cbf40f0a_r.jpg)图7：类内深度特征分布出于这一点，我们<strong>通过统计每一类别的类内协方差矩阵，为每一类别构建了一个零均值的高斯分布，进而从中采样出有意义的语义变换方向，用于各自类别内的数据扩增</strong>，以此来近似手工标注的过程，以<strong>取得正确性、高效性、多样性的良好权衡</strong>，其示意图如图8所示，关于具体的技术细节（例如协方差估计方法），请参阅我们的paper。

![](https://pica.zhimg.com/v2-62b223789dcc702c600c05871cc26308_r.jpg)图8：基于类内分布的高斯采样在数学上讲，给定第 
![](https://www.zhihu.com/equation?tex=i) 个样本对应的深度特征 
![](https://www.zhihu.com/equation?tex=%5Cbm%7Ba%7D_i) ，其扩增后的形式应当是一个以
![](https://www.zhihu.com/equation?tex=%5Cbm%7Ba%7D_i) 为均值的正态分布随机变量
![](https://www.zhihu.com/equation?tex=%5Cbm%7B%5Ctilde%7Ba%7D%7D_i) ：

![](https://pic3.zhimg.com/v2-b72a273474e3f9203be08c55e99f16ee_r.jpg)图9：语义数据扩增的数学形式其中 
![](https://www.zhihu.com/equation?tex=%5Clambda) 为一常数。给定这一形式后，一个来源于传统数据扩增的自然思路是从随机变量
![](https://www.zhihu.com/equation?tex=%5Cbm%7B%5Ctilde%7Ba%7D%7D_i) 的分布中采样 
![](https://www.zhihu.com/equation?tex=M) 次，优化其平均损失：

![](https://pic2.zhimg.com/v2-9fb1ff4332aca3579c2e744b09ef9349_r.jpg)其中 
![](https://www.zhihu.com/equation?tex=N) 为样本数目，
![](https://www.zhihu.com/equation?tex=y_i) 为 
![](https://www.zhihu.com/equation?tex=%5Cbm%7Ba%7D_i)对应的标签，
![](https://www.zhihu.com/equation?tex=%5Cbm%7Bw%7D%2C+%5Cbm%7Bb%7D) 为网络最后一线性分类层的参数，
![](https://www.zhihu.com/equation?tex=C)为类别数目，
![](https://www.zhihu.com/equation?tex=%5Cbm%7B%5CTheta%7D) 为网络参数。但事实上，
![](https://www.zhihu.com/equation?tex=M) 较大、样本数目较多、特征空间维度较高时，采样 
![](https://www.zhihu.com/equation?tex=M) 次并计算损失所引入的额外训练开销同样是不容小视的。因此，<strong>我们考虑采样无穷次，即</strong>
![](https://www.zhihu.com/equation?tex=M+%5Cto+%5Cinfty)<strong>的情况</strong>：

![](https://pic2.zhimg.com/v2-c8f94baca40a63e1f2e32ced09e9715f_r.jpg)此时，我们实质上得到了在扩增分布上的期望损失。对于传统数据扩增方法而言，这一期望损失是难以计算的。但是，由于我们的扩增操作是在特征空间完成的，在数学上，我们可以方便的对上式进行处理。通过利用 Jensen 不等式，我们可以得到其一个<strong>易于计算的上界</strong>：

![](https://pic3.zhimg.com/v2-e1aacf7d874c2b3eb8e562fafdd858a4_r.jpg)通过将这一上界作为我们的实际优化目标，我们得到了一个简单易行且高效的语义数据扩增算法，如下所示：

![](https://picx.zhimg.com/v2-ba142b492a458ced3f5e45ae8d4e3d71_r.jpg)我们的算法被称为Implicit Semantic Data Augmentation（ISDA，隐式语义数据扩增） ，<strong>其最有趣的一点是，我们从语义数据扩增的角度出发，得到的算法最终却可以归化为一个全新的损失函数。</strong>除标准的图像识别外，本算法也可应用于任何使用Soft-Max交叉熵损失的视觉任务，例如图像分割等。

事实上，除了上述介绍的基本的监督学习情境外，ISDA也可以在一致性正则（consistency regularization）的思路下拓展至半监督学习，其最终算法同样体现为一个全新的损失函数（期望KL散度的一个上界），且同样可以与现有方法实现很好的互补。关于这一点的细节，由于空间所限不在此赘述，请参阅我们的paper~

3. Experiments （实验结果）

- ImageNet 图像识别，在ResNet系列网络上的提升效果普遍在1%左右
![](https://pica.zhimg.com/v2-a78428cee5a4c12f948ef057e673b968_r.jpg)图10：ImageNet 图像识别效果
- 与效果较佳的传统数据扩增方法有效互补（RA、AA分别代表RandAugment[4]和AutoAugment[5]）
![](https://pic2.zhimg.com/v2-89dd1b0d43b7a9e52ce8cfc3376a4635_r.jpg)图11：与 state-of-the-art 的传统数据扩增方法有效互补
- 半监督学习实际效果，可在现有方法基础上有效提升
![](https://pic2.zhimg.com/v2-9df9c0966e260e9a15a46c30ca02a61f_r.jpg)图12：半监督学习的实验结果
- Cityscapes 语义分割，可以在PSPNet[6]和DeepLab-V3[7]的基础上将mIOU提升1%以上
![](https://pic4.zhimg.com/v2-92d91aa8a111988dfaf6f16b23d5fd81_r.jpg)图13：Cityscapes 语义分割的实验结果
- 为了证实我们的确实现了语义数据扩增，我们利用BigGAN[8]在ImageNet上进行了可视化实验，其结果如下图所示。其中 Augmented 中的图片为ISDA扩增的结果，Randomly Generated 中的图片为BigGAN随机生成的图片。可以看到，ISDA所改变的语义包括<strong>狗的动作、鸟的背景、帆船的远近及位置、车的视角、热气球的颜色</strong>等，并不改变类别标签，且可以显著地看出，这些扩增得到的样本分布与原图片更为接近，而与类内随机样本差距较大。这些观察与我们前文所述的假设是高度吻合的。
![](https://pic3.zhimg.com/v2-334f2d82d7ac01f31bdf4ea9dc273316_r.jpg)图14：ImageNet上的可视化结果
4. Conclusion (结语)
最后总结一下，在我个人看来，这项工作的主要价值在于其为数据扩增算法的设计带来了三个启发性的思路：（1）关注<strong>语义层面</strong>的数据扩增；（2）利用特征空间的性质，<strong>对深度特征进行数据扩增</strong>；（3）从期望损失的形式出发，向大家展示了数据扩增不一定是随机化的方法，<strong>亦可以体现为一个确定的形式</strong>，例如损失函数。

欢迎大家follow我们的工作~。

@inproceedings{NIPS2019_9426,
        title = {Implicit Semantic Data Augmentation for Deep Networks},
       author = {Wang, Yulin and Pan, Xuran and Song, Shiji and Zhang, Hong and Huang, Gao and Wu, Cheng},
    booktitle = {Advances in Neural Information Processing Systems (NeurIPS)},
        pages = {12635--12644},
         year = {2019},
}

@article{wang2021regularizing,
        title = {Regularizing deep networks with semantic data augmentation},
       author = {Wang, Yulin and Huang, Gao and Song, Shiji and Pan, Xuran and Xia, Yitong and Wu, Cheng},
      journal = {IEEE Transactions on Pattern Analysis and Machine Intelligence},
         year = {2021}
}
如有任何问题，欢迎留言或者给我发邮件，附上我的主页链接

[wyl.cool](https://link.zhihu.com/?target=http%3A//wyl.cool)