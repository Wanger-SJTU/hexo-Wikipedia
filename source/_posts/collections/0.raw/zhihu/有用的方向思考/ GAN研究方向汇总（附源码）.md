---
title: (1 封私信) GAN研究方向汇总（附源码）
date: "2020-05-10 00:00:00"
updated: "2020-05-10 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/有用的方向思考/GAN研究方向汇总(附源码)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/69305310
---


（**多图，建议在Wi-Fi条件下阅读**）生成对抗性网络(Generative Adversarial Network，GAN)是生成建模的一种神经网络结构。生成模型涉及使用一个模型来生成新的例子，这些例子似乎来自于现有的样本分布，例如生成新的照片，这些照片与现有的照片数据集相似，但还是有不同。

一个 GAN 是一个生成模型，使用双神经网络模型进行训练。 其中一个模型被称为"生成器"或"生成网络"模型，用于学习生成新的看似合理的样本；另一个模型被称为"判别器"或"判别网络"，它学习区分生成的例子和真实例子。这两个模型是在对抗或博弈中建立的，其中生成器模型试图欺骗鉴别器模型，鉴别器提供了实际样本和生成样本的两个例子。经过训练后，生成模型可以根据需要创建新的相似样本。GAN有许多具体的用例，在这篇文章中，我们将回顾大量有趣的GAN应用程序，以帮助大家对可用和有用的问题类型形成直觉，它包含了许多已经在现实中使用的 GANs 的例子。**我们将GAN分为以下几个领域应用，相关的程序和代码可以在github**<span class="wikilink wikilink--missing" title="未导入的页面">1</span>(#ref_1)** 上找到。**

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_eddd112b8fd2.png)

**1.为图像数据集生成新的示例：**

伊恩 · 古德费勒等人在2014年的论文《生成对抗性网络》<span class="wikilink wikilink--missing" title="未导入的页面">2</span>(#ref_2)中描述了产生新的相似样本的应用，在这篇论文中，作者用 GANs 为 MNIST 手写数字数据集、 CIFAR-10数据集和面部数据库产生了新的相似样本：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_35adc0844ee3.jpg)

来自论文Alec Radford 等人在2015年发表的题为"深度卷积生成对抗性网络的非监督表征学习"<span class="wikilink wikilink--missing" title="未导入的页面">3</span>(#ref_3)的重要论文中所使用的演示，该论文演示了如何在一定规模上训练稳定的 GANs。 他们演示了生成卧室的新例子的模型：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_535411ada696.jpg)

来自论文**2.生成人脸照片：**

泰罗 · 卡拉斯等人在他们2017年的论文中<span class="wikilink wikilink--missing" title="未导入的页面">4</span>(#ref_4)展示了生成以假乱真的真实人脸照片。 他们看起来是如此的真实，我们可以说这个结果是非凡的，这个结果受到了媒体的广泛关注。 这些面孔是根据名人的例子训练出来的，这意味着在生成的面孔中有现有名人的元素，使他们看起来很熟悉，但并不完全熟悉：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_a21566c28f31.jpg)

来自论文他们的方法也被用来演示对象和场景的生成：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_6f03b7003050.jpg)

2018年的一份题为《人工智能的恶意使用: 预测、预防和缓解》<span class="wikilink wikilink--missing" title="未导入的页面">5</span>(#ref_5)的报告中使用了这篇论文中的例子，以展示2014年至2017年间GAN的快速发展。

**3.生成逼真的照片：**

安德鲁 · 布洛克等人在他们2018年发表的论文<span class="wikilink wikilink--missing" title="未导入的页面">6</span>(#ref_6)中展示了利用 BigGAN 技术生成的合成照片，这些合成照片与真实照片几乎没法区分：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_a0ff30babb31.jpg)

来自论文**4.生成卡通人物：**

金同学等人在他们2017年的论文<span class="wikilink wikilink--missing" title="未导入的页面">7</span>(#ref_7)中展示了如何训练和使用 GAN 来生成动漫人物的面孔：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_7ecd392c3d4f.jpg)

来自论文**5.图像到图像的翻译：**

Phillip Isola 等人在他们2016年的论文<span class="wikilink wikilink--missing" title="未导入的页面">8</span>(#ref_8)中展示了使用 GANs和 pix2pix 方法用于图像到图像的翻译任务：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_a7880b84b348.jpg)

来自论文朱同学在他们2017年的论文<span class="wikilink wikilink--missing" title="未导入的页面">9</span>(#ref_9)中介绍了他们著名的 cycleGAN<span class="wikilink wikilink--missing" title="未导入的页面">10</span>(#ref_10) 和一系列令人印象深刻的图像到图像的翻译例子。

**6.文本到图像的翻译：**

Han Zhang 等人在他们2016年发表的论文<span class="wikilink wikilink--missing" title="未导入的页面">11</span>(#ref_11)中展示了 GANs 的使用，主要是StackGAN，通过对简单物体如鸟儿和花朵的文本描述生成看起来很真实的照片：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_7ebf9a1fa7ba.jpg)

来自论文**7.语义-图像-照片翻译：**

王同学等人在他们2017年题为"高分辨率图像合成和条件 GANs 语义操作"的论文<span class="wikilink wikilink--missing" title="未导入的页面">12</span>(#ref_12)中演示了使用条件 GANs 生成真实感图像，并给出语义图像或草图作为输入，他们还演示了用于操作生成图像的交互式编辑器：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_db06be11534f.jpg)

语义图像和 GAN 生成的城市景观照片，来自论文**8.面部正面视图的生成：**

黄同学等人在他们2017年题为"超越面部旋转: 全局和局部感知 GAN 的真实感和保持身份的正面视图合成"的论文中，演示了用 GANs 生成人脸正面视图(即正面对视)的方法，并给出了从某个角度拍摄的照片：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_6851f4f54253.jpg)

来自论文**9.生成新的人体姿势：**

马同学等人在他们2017年题为"基于姿势的人像生成"的论文<span class="wikilink wikilink--missing" title="未导入的页面">13</span>(#ref_13)中提供了一个生成新姿势的人体模特新照片的例子：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_3c8d734a53f7.jpg)

**10.照片生成脸萌：**

Yaniv Taigman 等人在他们2016年题为"无监督跨域图像生成"的论文<span class="wikilink wikilink--missing" title="未导入的页面">14</span>(#ref_14)中，使用 GAN 将图像从一个域翻译到另一个域，包括从街道号码到 MNIST 手写数字，从名人照片到他们所代表的表情符号或小卡通脸孔：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_4f62fa337918.jpg)

**11.图片编辑：**

Guim Perarnau 等人在他们2016年题为"基于可逆条件GANs的图像编辑"的论文<span class="wikilink wikilink--missing" title="未导入的页面">15</span>(#ref_15)中使用了一个GAN，特别是他们的 IcGAN来重建具有特定特征的人脸照片，比如头发颜色、风格、面部表情，甚至性别的变化：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_cbd42d98e32a.jpg)

来自论文刘同学等人在他们2016年题为"耦合的生成对抗性网络"的论文<span class="wikilink wikilink--missing" title="未导入的页面">16</span>(#ref_16)中也探索了具有特定属性的面孔的生成，比如头发颜色、面部表情和眼镜。 他们还探索其他图像的生成，如不同颜色和深度的场景。Andrew Brock 等人在他们2016年的论文<span class="wikilink wikilink--missing" title="未导入的页面">17</span>(#ref_17)中展示了一个使用变分自动编码器和 GANs 的混合体的面部照片编辑器。 该编辑器允许快速真实地修改人脸，包括改变头发颜色、发型、面部表情、姿势和添加面部毛发。何同学等人在他们2017年的论文<span class="wikilink wikilink--missing" title="未导入的页面">18</span>(#ref_18)中使用GAN进行图像编辑，包括从照片中去除雨和雪等例子。

**12.面部老化：**

格里戈里 · 安蒂波夫等人在他们2017年题为"有条件的生成对抗性网络的面部老化"的论文<span class="wikilink wikilink--missing" title="未导入的页面">19</span>(#ref_19)中使用 GANs 生成不同年龄的面部照片，从年轻到年长：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_a33804b03fc4.jpg)

张同学在他们2017年发表的题为"年龄增长 / 条件对抗性自动编码器的回归"的论文<span class="wikilink wikilink--missing" title="未导入的页面">20</span>(#ref_20)中，使用了一种基于 GAN 的方法来去除人脸照片的老化。

**13.照片混合：**

吴同学等人在他们2017年的论文<span class="wikilink wikilink--missing" title="未导入的页面">21</span>(#ref_21)中展示了GAN在混合照片中的应用，特别是来自不同照片的元素，如田野、山脉和其他大型结构融合：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_8c23bc019787.jpg)

来自论文**14.增强分辨率：**

Christian Ledig 等人在他们2016年的论文<span class="wikilink wikilink--missing" title="未导入的页面">22</span>(#ref_22)中展示了 GANs 的使用，他们的 SRGAN 模型用来产生更高，有时甚至超高像素分辨率的图像输出。黄同学等人在他们2017年的论文<span class="wikilink wikilink--missing" title="未导入的页面">23</span>(#ref_23)中使用GAN创建不同分辨率的人脸照片：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_b9602b6027e1.jpg)

Subeesh Vasu 等人在他们2018年的论文<span class="wikilink wikilink--missing" title="未导入的页面">24</span>(#ref_24)中提供了一个用GAN创建高分辨率照片的例子，聚焦于街景。

**15.图片修补：**

迪帕克 · 帕塔克等人在他们2016年的论文<span class="wikilink wikilink--missing" title="未导入的页面">25</span>(#ref_25)中描述了 GANs 的使用来执行照片修改或孔洞填充，即填充一个由于某种原因被删除的照片区域：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_25f54218e9a9.png)

Raymond a. Yeh 等人在他们2016年题为"深层生成模型的语义图像修复"的论文<span class="wikilink wikilink--missing" title="未导入的页面">26</span>(#ref_26)中使用 GANs 来填充和修复故意损坏的人脸照片。李同学等人在他们2017年的论文<span class="wikilink wikilink--missing" title="未导入的页面">27</span>(#ref_27)中也使用 GANs 来修复和重建人脸的损坏照片。

**16.服饰翻译：**

Donggeun Yoo等人在其2016年题为"像素级域转移"的论文<span class="wikilink wikilink--missing" title="未导入的页面">28</span>(#ref_28)中展示了使用 GANs 生成服装照片的方法，这些照片可以在目录或网上商店中看到：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_3bee8a1ce7ac.jpg)

**17.视频预测：**

Carl Vondrick 等人在他们2016年发表的题为"使用场景动态生成视频"的论文<span class="wikilink wikilink--missing" title="未导入的页面">29</span>(#ref_29)中描述了GAN在视频预测中的应用，特别是成功地预测了多达一秒的视频帧，主要是预测场景中的静态元素：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_d92e52fa2550.jpg)

来自论文**18.3d对象生成：**

吴同学等人在他们2016年的论文<span class="wikilink wikilink--missing" title="未导入的页面">30</span>(#ref_30)中展示了一个 GAN用于生成新的三维物体(例如3D 模型)的例子 ，如椅子、汽车、沙发和桌子：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_0c8897cf1532.png)

来自论文Matheus Gadelha 等人在他们2016年题为"从多个物体的2D 视图进行3D 形状归纳"的论文<span class="wikilink wikilink--missing" title="未导入的页面">31</span>(#ref_31)使用 GANs 从多个角度给出物体的二维图片，从而生成三维模型。

### 参考

- [^](#ref_1_0)[https://github.com/nashory/gans-awesome-applications](https://github.com/nashory/gans-awesome-applications)
- [^](#ref_2_0)[https://arxiv.org/abs/1406.2661](https://arxiv.org/abs/1406.2661)
- [^](#ref_3_0)[https://arxiv.org/abs/1511.06434](https://arxiv.org/abs/1511.06434)
- [^](#ref_4_0)[https://arxiv.org/abs/1710.10196](https://arxiv.org/abs/1710.10196)
- [^](#ref_5_0)[https://arxiv.org/abs/1802.07228](https://arxiv.org/abs/1802.07228)
- [^](#ref_6_0)[https://arxiv.org/abs/1809.11096](https://arxiv.org/abs/1809.11096)
- [^](#ref_7_0)[https://arxiv.org/abs/1708.05509](https://arxiv.org/abs/1708.05509)
- [^](#ref_8_0)[https://arxiv.org/abs/1611.07004](https://arxiv.org/abs/1611.07004)
- [^](#ref_9_0)[https://arxiv.org/abs/1703.10593](https://arxiv.org/abs/1703.10593)
- [^](#ref_10_0)https://junyanz.github.io/CycleGAN/
- [^](#ref_11_0)[https://arxiv.org/abs/1612.03242](https://arxiv.org/abs/1612.03242)
- [^](#ref_12_0)[https://arxiv.org/abs/1711.11585](https://arxiv.org/abs/1711.11585)
- [^](#ref_13_0)[https://arxiv.org/abs/1705.09368](https://arxiv.org/abs/1705.09368)
- [^](#ref_14_0)[https://arxiv.org/abs/1611.02200](https://arxiv.org/abs/1611.02200)
- [^](#ref_15_0)[https://arxiv.org/abs/1611.06355](https://arxiv.org/abs/1611.06355)
- [^](#ref_16_0)[https://arxiv.org/abs/1606.07536](https://arxiv.org/abs/1606.07536)
- [^](#ref_17_0)[https://arxiv.org/abs/1609.07093](https://arxiv.org/abs/1609.07093)
- [^](#ref_18_0)[https://arxiv.org/abs/1701.05957](https://arxiv.org/abs/1701.05957)
- [^](#ref_19_0)https://ieeexplore.ieee.org/document/8296650
- [^](#ref_20_0)[https://arxiv.org/abs/1702.08423](https://arxiv.org/abs/1702.08423)
- [^](#ref_21_0)[https://arxiv.org/abs/1703.07195](https://arxiv.org/abs/1703.07195)
- [^](#ref_22_0)[https://arxiv.org/abs/1609.04802](https://arxiv.org/abs/1609.04802)
- [^](#ref_23_0)[https://arxiv.org/abs/1707.00737](https://arxiv.org/abs/1707.00737)
- [^](#ref_24_0)[https://arxiv.org/abs/1811.00344](https://arxiv.org/abs/1811.00344)
- [^](#ref_25_0)[https://arxiv.org/abs/1604.07379](https://arxiv.org/abs/1604.07379)
- [^](#ref_26_0)[https://arxiv.org/abs/1607.07539](https://arxiv.org/abs/1607.07539)
- [^](#ref_27_0)[https://arxiv.org/abs/1704.05838](https://arxiv.org/abs/1704.05838)
- [^](#ref_28_0)[https://arxiv.org/abs/1603.07442](https://arxiv.org/abs/1603.07442)
- [^](#ref_29_0)[https://arxiv.org/abs/1609.02612](https://arxiv.org/abs/1609.02612)
- [^](#ref_30_0)[https://arxiv.org/abs/1610.07584](https://arxiv.org/abs/1610.07584)
- [^](#ref_31_0)[https://arxiv.org/abs/1612.05872](https://arxiv.org/abs/1612.05872)
