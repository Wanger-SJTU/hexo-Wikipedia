---
title: SGD在两层神经网络上是怎么收敛的？
date: "2018-05-10 00:00:00"
updated: "2018-05-10 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/机器学习/SGD在两层神经网络上是怎么收敛的/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/36624193
---


最近刚决定回清华交叉信息学院做助理教授，于是借着更新专栏的契机，打个广告：

<strong>今年6月9号-6月10号我会参加清华大学交叉信息研究院-优秀大学生夏令营，招收博士生。如果你恰好是大三的打算保研的学生，对我做的方向（理论+机器学习+优化）比较感兴趣，并且觉得我之前的几篇专栏文章挺有意思，欢迎你报名这个夏令营，和我聊一聊。我在这个方向做得还算比较前沿</strong>：）

<strong>当然了，清华交叉信息学院人才济济，就算你对理论机器学习不感兴趣，如果你对信息安全、机器智能、金融科技、网络科学、计算生物学、能源信息科学、机器人、理论计算机科学、量子信息、计算机系统结构等等感兴趣，我院总有一位老师适合你！过来瞅一眼总是好的。</strong>

<strong>报名截止时间：2018年5月15日</strong>

--------------------------------------------

[本文介绍我与李远志的NIPS'17论文 Convergence Analysis of Two-layer Neural Networks with ReLU Activation]


神经网络很神奇的地方是，你设计一个不算复杂的结构（那些一百层一千层的网络，其实每一层长得都差不多），使用一个非常简单的算法（SGD，Stochastic Gradient Descent，如果你对这个算法不熟悉，可以读一下我之前的[博文](https://zhuanlan.zhihu.com/p/27609238)），加上海量的数据，居然能够表现得那么好。假如用这种东西就能够实现强人工智能，那么和我们从小接受的教育，即“人脑是一个复杂而精致的奇迹”，还是有很大出入的——也许我们脑袋里每天做的运算不过就是SGD的一个变体罢了。

在这种情况下，我们便应该好好考虑一下SGD到底在干什么。有人说，别看SGD这么简单，一行就写明白了，其实它在做非常深刻的事情。比如说，其实它在做Bayesian Inference，在做Multi-armed bandit tradeoff，在模拟退火，而且自带各种regularization，SGD里的噪声还有一十七种功用，初始化的条件蕴含了丰富的哲理，等等等等，不一而足。

这些说得当然都很有道理。但我一般还是比较悲观的，我觉得吹得再好，SGD能做的事情还是比较有限。我最喜欢的例子是长城的例子：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_d92078d0ac99.jpg)

图1：一个奇怪的像长城一样的函数假如我们用SGD来优化这个长城函数，怎么看SGD都是很难找到那个尖尖的最小值的。实际上，SGD很容易就陷到了某个凹陷处，然后就动不了了。单凭局部的导数信息，SGD很难跨过城垛，这是一目了然的事实。所以说，SGD的成功是和目标函数的样子分不开的。假如目标函数长得不好，SGD再深刻也没什么用。

那么，我们关心的神经网络的目标函数长什么样子呢？非常遗憾的是，神经网络往往包含几十万上百万个参数，以我们目前的技术还是很难理解参数空间到底长什么样子。目前常用的方法是把这个高维参数空间投影到二维或者三维，然后看看投影之后是什么样子。比如说，Hao Li, Zheng Xu, Gavin Taylor, Christoph Studer, Tom Goldstein 最近的一篇“Visualizing the Loss Landscape of Neural Nets”就画了很漂亮的两张图（如下）。在这里，他们选取了一个局部最优点，然后把目标函数在这个点周围的样子进行了三维投影。

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_9fdb8e5b0f3e.jpg)

图2：不带residual link的普通56层网络![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_b4a8aa742a03.jpg)

图3：56层残差网络很漂亮是不是？

图2就是普通的神经网络，图3则是著名的残差网络resnet（详见Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun的经典论文“Deep Residual Learning for Image Recognition”）。两个网络有什么差异呢？本质的差异就是普通网络没有residual link，而残差网络是有residual link的。什么是residual link咱们一会儿再讲。

我们可以看到，带了residual link的话，曲面光滑了很多，非常平整；而不带residual link的话，曲面坑坑洼洼，到处都是局部最优点。所以从这两张图不难理解，为什么SGD在resnet很容易得到更好的解。

而实验角度上来看，SGD在resnet上走的路径也非常简单，比如同样是“Visualizing the Loss Landscape of Neural Nets”这篇论文，他们画了一个SGD的路径图（投影到了2维）：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_687977cb33ab.jpg)

图4：SGD绕了一个圈圈，收敛到了一个局部最优点我后来也做了一系列实验，发现SGD的这种“圈圈路径图”非常常见，即一开始SGD可能逐渐远离最后的结果，但很快会一步一步逐渐接近。对resnet, densenet这样的常用网络，对于cifar10, cifar100这样的常用数据集，都可以观察到这样的现象。

仔细想想，其实这样的现象是挺令人惊讶的。深度学习这么成功，能够处理那么复杂的问题，我们可能会觉得参数空间的曲面是非常非常复杂的，就像图2一样。可是，如果我们看图3，再看看SGD的历史路径，会发现其实对resnet而言，整个参数空间可能没有那么乱，比较像凸函数，所以优化起来也轻松容易。所以，至少从优化的角度来看，resnet的成功似乎在于它把曲面变得更加平滑。

那到底什么是resnet呢？见下图：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_c23ff04c880f.jpg)

图5：resnet中每一块的结构，摘自“Deep Residual Learning for Image Recognition”就是说，对于网络中的每两层，本来我们是把输入 x 放进一层weight layer，放进relu，放进一层weight layer，然后得到 F(x) 的。resnet会加一个residual link（最右边的箭头），本质就是把 x 复制一遍，传到最后一层，所以得到的结果变成了 F(x)+x ，即把输入 x 也放入了输出中。

换句话说，仅仅是把输入加到输出上，就会给神经网络带来惊人的提升！曲面更加平滑，SGD优化更加简单，在各类问题中表现也更好，等等。

那么，为什么会发生这样的事情呢？虽然resnet原作者们提出了一些直观上的解释，但并没有正式的证明。我今天讲一讲怎么分析SGD在两层带residual link的神经网络的收敛情况。（虽然现实生活中没人用两层的网络，但是目前来看，想要分析很多层的网络，理论上还是很困难的。两层的分析，聊胜于无吧。）

我们考虑的是一个两层的带Relu，带residual link的模型，见下图。之前田渊栋大神的“Symmetry-Breaking Convergence Analysis of Certain Two-layered Neural Networks with ReLU nonlinearity”已经分析过不带residual link的情况，发现在一些很特别的条件下，曲面仍然存在鞍点，因此比较复杂，就像图2一样。我们要说的就是，加了residual link，曲面就变简单了，就像图3一样。

我们需要假设输入服从高斯分布。同时，注意我们的residual link只跳了一层，但是resnet里面residual link是需要跳两层的，所以并不完全一样。由于只跳了一层，本质我们就是在 W 旁边加了一个 I 矩阵。

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_2e7706053d18.jpg)

为了理论分析方便，我们还假设存在一个正确答案 W^* ，它代表另一个完全一样结构的网络的参数取值。我们跑SGD的最终目标，就是为了找到 W^* 。

我们可以证明下图这样的结果：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_6f89d97a0379.jpg)

就是说，如果没有加 I 这个东西，整个曲面比较复杂，SGD不一定能够收敛。如果加了 I ，那么我们可以证明SGD一定能够收敛到 W^* ，并且有两个阶段。第一个阶段， W 可能会随着SGD离 W^* 越来越远，第二个阶段， W 会随着SGD离 W^* 越来越近。这个和图4显示的在实际网络实际数据中观察到的SGD路径是一致的。

那么具体应该怎么证明呢？我们要用到一个叫做单点凸的性质（one point convexity）。单点凸函数是比凸函数更加一般的一个概念，如下图所示：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_4cd512bc3496.jpg)

单点凸性质：对于每个点W，W的导数（绿色）都指向W*（夹角小于90度）单点凸的意思就是我们想要找到 W^* ，但是只能用SGD来找，所以每一步都要用导数的方向往前走。如果对于任何 W ， W 的导数方向与正确的指向 W^*  的方向的夹角小于90度，也就是说我们每次都基本走在正确的道路上，那么这个函数就叫做单点凸。之所以叫做单点凸，是因为整个函数只对 W^* 是凸的，而对别的点， W' 之类，没有凸的性质。

如果目标函数对 W^* 满足单点凸的性质，那么单纯跑SGD就可以收敛到 W^*  ，如下图所示：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_e4f00d68cb52.jpg)

由于函数是单点凸的，所以我们跑SGD每步都会离W*更近一些，最后会收敛这个性质非常直观，很容易用。那么一个简单的问题就是，我们考虑的两层的带residual link的神经网络，他的目标函数对 I+W^* 是不是满足单点凸的性质呢？如果直接满足这个性质，那么SGD的收敛性就非常容易证明了。

为了讨论这个问题，我们要引入势能函数的概念。对于当前的位置 I+W ，和目标位置 I+W^* ，势能函数 g=\left|\left(\sum_i ||e_i+w_i^*|| \right)-\left(\sum_i ||e_i+w_i|| \right)\right| 

这里 e_i, w_i, w_i^* 是指 I, W, W^* 的第i列。这个东西是什么意思呢？它是指当前位置的参数矩阵和目标位置的参数矩阵的列长之和的差**。

基于这个势能函数，我们可以证明如下的引理：

如果 g\leq \alpha ， \alpha 是一个常数，那么当前的 I+W 的导数是指向 I+W^* 的（即夹角小于90度）。

也就是说，势能函数 g 控制了 I+W 是否处于对于 I+W^* 的单点凸区域。换句话说，如果我们知道 g 非常小，那么 I+W 就处于单点凸区域，那么SGD就会很容易收敛了。

那实际上这个势能函数 g 大不大，有多大呢？我们可以跑一些实验：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_d3892faafd3f.jpg)

可以看到，如果我们使用了不好的初始化，那么 g （绿线）有可能是会很大的。如果 g 很大，那么我们的导数就不会指向 I+W^* ，即导数与 W^*-W 方向的内积（蓝线）是负的。但是，另一方面，随着我们不断地跑SGD，可以看到 g 会不断变小，而与此同时，当 g 变得比较小的时候，蓝线就慢慢变正了。也就是说，导数就开始慢慢指向 I+W^* ，整个SGD路径也开始向 I+W^* 收敛。

所以说，其实SGD的收敛过程是有两个阶段的。第一阶段是势能函数 g 非常大的时候，这个时候内积可能是负的，所以SGD会朝着相反方向走（绕圈圈），离 I+W^* 越来越远。第二个阶段是 g 慢慢变小直到小于 \alpha 的时候，这个时候内积变成了正的，所以SGD会朝着 I+W^* 慢慢收敛。

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_19b85199c7e1.jpg)

这大概就是我们这篇论文证明的结果。虽然我们考虑的是一个非常简单基本的两层网络的模型，但是我们分析的SGD两个阶段的收敛性质，在真实网络真实数据上一样可以观察到，所以我觉得还是挺有意思的。

另一方面，在我们这个模型下面，SGD的两个阶段的目标其实是不一致的——SGD并不是一直在尝试逼近 I+W^* ：

第一个阶段，SGD只是在让势能函数 g 越来越小，也就是说，让 I+W 与 I+W^* 的列长之和**的差越来越小。注意，这个比优化 ||(I+W)-(I+W^*)||_F 要容易很多，因为只需要两个矩阵的列长之和吻合就可以了。

第二个阶段，等 g 小于 \alpha 了，也就是说两个矩阵列长之和差不多了，SGD才开始真正地去逼近 I+W^* ，即优化 ||(I+W)-(I+W^*)||_F 

也就是说，虽然我们一直在无脑地跑SGD，但是SGD却在自动地调节自己的目标，而且干得很漂亮。——从这个角度来看，我们似乎又得到了另一种SGD深刻的工作原理的解释，哈哈哈。
