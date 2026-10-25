---
title: "Roberta: Bert调优"
date: "2020-09-30 00:00:00"
updated: "2020-09-30 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/Roberta_-Bert调优/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/260693956
---


最近要开始使用Transformer去做一些事情了，特地把与此相关的知识点记录下来，构建相关的、完整的知识结构体系。

以下是要写的文章，文章大部分都发布在公众号【雨石记】上，欢迎关注公众号获取最新文章。

- <strong>[Transformer:Attention集大成者](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI4ODg3NDY2NQ%3D%3D%26mid%3D2247483679%26idx%3D1%26sn%3D26ec25fcb954332f2c21ca89c324278e%26chksm%3Dec3688d9db4101cf99ed29500e1b3f50225159a7b1e3d318d4409caad1955fe354f7f502363f%26token%3D1357491502%26lang%3Dzh_CN%23rd)</strong>
- <strong>[GPT-1 & 2: 预训练+微调带来的奇迹](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI4ODg3NDY2NQ%3D%3D%26mid%3D2247483710%26idx%3D1%26sn%3D7f9ccf321297e9e848be59a1b7aaacc5%26chksm%3Dec3688f8db4101ee72649c98bebe249f0e0b1e78dde6c7e09d35570c277c388bc6a0f28f038b%26token%3D1357491502%26lang%3Dzh_CN%23rd)</strong>
- <strong>[Bert: 双向预训练+微调](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI4ODg3NDY2NQ%3D%3D%26mid%3D2247483736%26idx%3D1%26sn%3Dc5116efdd7f935baccde0cd76bf05115%26chksm%3Dec36889edb410188ee2a269da9f2c14105a8f9afeab2d40ac01179a98e807f4760701cd27406%26token%3D1357491502%26lang%3Dzh_CN%23rd)</strong>
- Bert与模型压缩 

- <strong>[Bert与模型蒸馏：PKD和DistillBert](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI4ODg3NDY2NQ%3D%3D%26mid%3D2247483796%26idx%3D1%26sn%3Dc4acb3e8cf0cdc56d55943ef875e2f8c%26chksm%3Dec368852db410144f05119f0bef7d28b4e3de29d5b22c083c976d7ea93afd62d5fe5c01069a0%26token%3D1357491502%26lang%3Dzh_CN%23rd)</strong>
- <strong>[ALBert: 轻量级Bert](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI4ODg3NDY2NQ%3D%3D%26mid%3D2247483848%26idx%3D1%26sn%3D56c5a5bf0f61b0d0db226aa6e5fa210d%26chksm%3Dec36880edb4101189215fa8b9d68e9adf8d5659d16d5b1aca2354f19fdd0edb6eb07097319db%26token%3D1357491502%26lang%3Dzh_CN%23rd)</strong>
- <strong>[TinyBert: 模型蒸馏的全方位应用](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI4ODg3NDY2NQ%3D%3D%26mid%3D2247483867%26idx%3D1%26sn%3Dc83cb7109eea8d128d0e644baf8b2f30%26chksm%3Dec36881ddb41010b2df0afe1e866dda28f7a243f42104bce2499b29a206e0931dff0444274bf%26token%3D1357491502%26lang%3Dzh_CN%23rd)</strong>
- <strong>[MobileBert: Pixel4上只需40ms](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI4ODg3NDY2NQ%3D%3D%26mid%3D2247483931%26idx%3D1%26sn%3De3cba339cc6003fe549155ce9af37a87%26chksm%3Dec368bdddb4102cb1f9074e6fb024f1b5771e6c86184c2d1f406650f420f485e4e1fd998e304%26token%3D1357491502%26lang%3Dzh_CN%23rd)</strong>
- 更多待续

- <strong>[Transformer + AutoML: 进化的Transformer](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI4ODg3NDY2NQ%3D%3D%26mid%3D2247484211%26idx%3D2%26sn%3Dcca62a5662dea8b3a24ccb2a75fa41f3%26chksm%3Dec368af5db4103e34b044ab5ad1e8a61b8e8517d4b0fd514d94126f6e4dd9e0a25faaaa522a5%26token%3D806322780%26lang%3Dzh_CN%23rd)</strong>
- Bert变种 

- <strong>[Roberta: Bert调优](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI4ODg3NDY2NQ%3D%3D%26mid%3D2247483768%26idx%3D1%26sn%3Dc922c50c4154a295d2e18ebb468336be%26chksm%3Dec3688bedb4101a8fb5cc8fa8f86c01a8cd5e841fc00b850a435b412c323eee08f144b745b79%26token%3D1357491502%26lang%3Dzh_CN%23rd)</strong>
- <strong>[Electra: 判别还是生成，这是一个选择](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI4ODg3NDY2NQ%3D%3D%26mid%3D2247484119%26idx%3D1%26sn%3D8391824e48fe3721204a0420aaa6f848%26chksm%3Dec368b11db4102078ec82f422c047e664f0fb9ce52ec5a78036b87ea7d491fa773e32943bc5d%26token%3D1355058864%26lang%3Dzh_CN%23rd)</strong>
- <strong>[Bart: Seq2Seq预训练模型](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI4ODg3NDY2NQ%3D%3D%26mid%3D2247484142%26idx%3D2%26sn%3De25a63b46cd4e54e8cace83cdad931fb%26chksm%3Dec368b28db41023eaa94252959057f6ea823ed0a25af46893c003ebb93540d337feaa0a0c9ce%26token%3D1106608718%26lang%3Dzh_CN%23rd)</strong>
- <strong>[Transformer优化之自适应宽度注意力](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI4ODg3NDY2NQ%3D%3D%26mid%3D2247483910%26idx%3D1%26sn%3D850c743b140677e35557d148770b551c%26chksm%3Dec368bc0db4102d67774ac90605cdb1ea68fbe26aca675f4854748b40b87b401b5179a0f459f%26token%3D1357491502%26lang%3Dzh_CN%23rd)</strong>
- <strong>[Transformer优化之稀疏注意力](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI4ODg3NDY2NQ%3D%3D%26mid%3D2247484022%26idx%3D1%26sn%3Df5367afb33952896a38a513320fdf17f%26chksm%3Dec368bb0db4102a664d6a867b905656a83d49ffaf163ccfffa77a09a8c48d711270a939d45aa%26token%3D176708162%26lang%3Dzh_CN%23rd)</strong>
- <strong>[Reformer: 局部敏感哈希和可逆残差带来的高效](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI4ODg3NDY2NQ%3D%3D%26mid%3D2247483911%26idx%3D1%26sn%3D8d98a214d455a55650bb589830b08dae%26chksm%3Dec368bc1db4102d7d54216e917ec22f83b47df55153ef4c3f83aaafd68a0dd60caf836fb712a%26token%3D1357491502%26lang%3Dzh_CN%23rd)</strong>
- <strong>[Longformer: 局部attentoin和全局attention的混搭](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI4ODg3NDY2NQ%3D%3D%26mid%3D2247483958%26idx%3D1%26sn%3Dde7b14bf4d2c56988598363dc12737fe%26chksm%3Dec368bf0db4102e6fd289bd8aa18df2748433a19c272e72946db64cacdad4d0bfb5d08abf90f%26token%3D1143207534%26lang%3Dzh_CN%23rd)</strong> -<strong>[Linformer: 线性复杂度的Attention](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI4ODg3NDY2NQ%3D%3D%26mid%3D2247483972%26idx%3D1%26sn%3Dd9ae4489bd0d0a43e199aa96684906de%26chksm%3Dec368b82db41029438c8807e98384217f016540394f5e890423e9d0080caa0919a6ff91102ba%26token%3D1618065730%26lang%3Dzh_CN%23rd)</strong>
- <strong>[XLM: 跨语言的Bert](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI4ODg3NDY2NQ%3D%3D%26mid%3D2247484046%26idx%3D1%26sn%3D73634b99c940f96a4c9996c865f0173d%26chksm%3Dec368b48db41025eb1cc4a83aa54fa193e40428b70e47a1e5efa050de5d183387e807c5e73b7%26token%3D176708162%26lang%3Dzh_CN%23rd)</strong>
- T5 (待续)
- 更多待续

- GPT-3
- 更多待续

### <strong>Overall</strong>

Bert出来以后，迅速引爆了NLP领域，出现了很多的针对模型的改进。然而，Roberta用实力表明，只对原来的Bert模型调优就可以有明显的提升。

Roberta，是Robustly Optimized BERT Approach的简称。

** Robustly用词很赞，既有“鲁棒的”，又有”体力的”。Roberta是一片实验为基础的论文，有点体力活的意思，但是结果又非常的鲁棒可信赖。
 先来回顾一下Bert中的一些细节：

- 在输入上，Bert的输入是两个segment，其中每个segment可以包含多个句子，两个segment用[SEP]拼接起来。
- 模型结构上，使用Transformer，这点跟Roberta是一致的。
- 学习目标上，使用两个目标： 

- Masked Language Model(MLM): 其中15%的token要被Mask，在这15%里，有80%被替换成[Mask]标记，有10%被随机替换成其他token，有10%保持不变。
- Next Sentence Prediction: 判断segment对中第二个是不是第一个的后续。随机采样出50%是和50%不是。

- Optimizations: 

- Adam, beta1=0.9, beta2=0.999, epsilon=1e-6, L2 weight decay=0.01
- learning rate, 前10000步会增长到1e-4, 之后再线性下降。
- dropout=0.1
- GELU激活函数
- 训练步数：1M
- mini-batch: 256
- 输入长度: 512

- Data 

- BookCorpus + English Wiki = 16GB

Roberta在如下几个方面对Bert进行了调优：

- Masking策略——静态与动态
- 模型输入格式与Next Sentence Prediction
- Large-Batch
- 输入编码
- 大语料与更长的训练步数

### Masking策略——静态与动态**

原来的Bert中是在训练数据中静态的标上Mask标记，然后在训练中是不变的，这种方式就是静态的。

Roberta尝试了一种动态的方式，说是动态，其实也是用静态的方式实现的，把数据复制10份，每一份中采用不同的Mask。这样就有了10种不同的Mask数据。

从结果中，可以看到动态mask能带来微小的提升。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_7f31ab395521.jpg)

### <strong>模型输入格式与Next Sentence Prediction</strong>

Bert的模型输入中是由两个segment组成的，因而就有两个问题：

- 两个segment是不是必要？
- 为什么是segment而不是单个的句子？
因此设置了四个实验：

- Segment-Pair + NSP
- Sentence-Pair + NSP: 只用了sentence以后，输入的长度会变少，为了使得每一步训练见到的token数类似，在这里会增大batch size
- Full-Sentence: 每一个样本都是从一个文档中连续sample出来的，如果跨过文档边界，就添加一个[SEP]的标记，没有NSP损失。
- Doc-Sentence: 类似于Full-Sentence，但是不会跨过文档边界。
从实验结果中可以看到，改用Sentence-Pair会带来一个较大的损失。猜测是因为这样无法捕捉long-term的依赖。

另外，Full-Sentence和Doc-Sentence能够带来微小的提升，说明NSP不是必须的。

** 这点跟Bert中的消融实验结论相反，但是请注意它们的输入还是不同的，原始Bert中的输入是Segment-Pair，有50%/50%的采样，而Full/Doc-Sentence中则是从文章中连续sample来的句子。![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_be099e0fbe5c.jpg)

因为Doc-Sentence会导致不同的batch_size（因为要保证每个batch见到的token数类似），所以在Roberta中，使用Full-Sentence模式。

### Large-Batch**

现在越来越多的实验表明增大batch_size会使得收敛更快，最后的效果更好。原始的Bert中，batch_size=256，同时训练1M steps。

在Roberta中，实验了两个设置：

- batch_size=2k, 训练125k steps。
- batch_size=8k, 训练31k steps。
从结果中看，batch_size=2k时结果最好。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_ae8269daafdc.jpg)

### <strong>输入编码</strong>

不管是GPT还是Bert，都是用的BPE的编码方式，BPE是Byte-Pair Encoding的简称，是介于字符和词语之间的一个表达方式，比如hello，可能会被拆成“he”, "ll", "o", 其中BPE的字典是从语料中统计学习到的。

原始Bert中，采用的BPE字典是30k， Roberta中增大到了50K，相对于Bertbase和Bertlarge会增加15M/20M的参数。

### <strong>增大语料和训练步数</strong>

增大语料和训练步数还是能带来比较大的提升的。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_a562dca03b4b.jpg)

### <strong>Roberta</strong>

就是上面所有改进的总和。可以看到，在各项任务中的提升还是很大的。Roberta的训练在1024个 V100GPU上训练一天左右。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_66d311033ccd.jpg)

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_cfc7a9dfb42b.jpg)

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_91eefb1867de.jpg)

### <strong>思考与总结</strong>

从上面的各种实验结果中看，可以得到如下结论：

- NSP不是必须的loss
- Mask的方式虽不是最优但是已接近。
- 增大batch size和增大训练数据能带来较大的提升。
由于Roberta出色的性能，现在很多应用都是基于Roberta而不是原始的Bert去微调了。

** 勤思考， 多提问是Engineer的良好品德。
 提问如下：

- 继续增大数据集，还有没有可能提升？数据集的量与所带来的提升是一个什么分布？
- 不管是Bert还是Roberta，训练时间都很长，如何进行优化？
回答后续公布，欢迎关注公众号【雨石记】

### 参考文献**

- [1]. Liu, Yinhan, et al. "Roberta: A robustly optimized bert pretraining approach." arXiv preprint arXiv:1907.11692 (2019).
