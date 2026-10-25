---
title: "Object Detection from Scratch - A Brief Review"
date: "2020-05-02 00:00:00"
updated: "2020-05-02 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/dl论文/Object-Detection-from-Scratch-A-Brief-Review/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/137410354"
---


<strong>之前看过很多人对于这个问题的解读，趁现在天天在家，也想谈一下自己对于这个问题的一些看法和理解，所以今天就来讨论一下learning object detection from scratch这个主题，顺便回顾一下我们之前的工作DSOD（大约16年底开始的一个project，发表于ICCV2017），还有Kaiming等人[1]以及ScratchDet [2]等其他几篇相关的工作。个人觉得这还是一个比较重要的topic，毕竟现在很多基于nas的detection backbone结构搜索的工作都是基于目标检测可以脱离预训练网络这个基本前提假设的 [7, 8]。</strong>

<strong>提到learning object detection from scratch大家首先想到的肯定是Kaiming他们那篇[Rethinking ImageNet Pre-training](https://link.zhihu.com/?target=http%3A//openaccess.thecvf.com/content_ICCV_2019/html/He_Rethinking_ImageNet_Pre-Training_ICCV_2019_paper.html) (ICCV 2019), 以及知乎上很火的讨论：[https://www.zhihu.com/question/303234604](https://www.zhihu.com/question/303234604)，不得不说Kaiming做的工作真的很solid，每次总能把问题总结得很到位，包括这篇。但是很多人可能不知道，在Kaiming这个工作的两年之前，已经有工作关注到了这个问题，即如何脱离ImageNet预训练网络依然能训练很好的目标检测模型。DSOD这个项目开始于16年底，我记得是在cvpr deadline刚过不久，当时我跟刘壮正在Intel Labs China实习（mentor是李建国老师），这个idea始于我们在茶水间的一次聊天，我们对这个想法都很兴奋，当天晚上就开始了动手实验。虽然我们有了一个很好的motivation和研究问题，但是说实话对于具体该如何来做我们真的一点方向都没有。当时唯一有用的线索是刘壮跟我介绍DenseNet有一些非常好玩和有意思的性质（当时DenseNet还刚投到cvpr，后来正如大家所知道的拿了当年的best paper），比如在训练样本比较少的情况下收敛得比ResNet更好，而我们这里拿掉预训练的权重其实在变相的减少训练数据，这也是为什么我们最后主要使用dense connection的原因，因为我们觉得这种dense的连接非常适合少量训练数据的收敛，比如PASCAL VOC只有几万张训练图片。这边我要强调一下的是，当时最好的code base也还是基于caffe的py-faster-rcnn，当时还没有Sync BN [3]，也没有Group Norm [4]，更没有显存巨大的GPU，后来从我们的实验中发现只要有了其中一个就能比较好的解决train object detection from scratch的问题，这个后面我会详细说到。</strong>

<strong>众所周知，自从Ross发表RCNN以来，所有基于deep learning的目标检测器都严重依赖于ImageNet预训练的权重。但是预训练的权重只是给了网络一个初始值，为什么对性能影响会这么巨大呢？我们最初的策略是把当时已有的所有state-of-the-art的检测算法都去掉pretrain的权重试一下，包括Fast/Faster RCNN, SSD (当时没试YOLO，因为我觉得YOLO跟SSD的结论应该会比较一致，而且SSD比初代YOLO拥有更好的性能)。最后结论是SSD可以得到decent的结果（PASCAL VOC上有69点多，这是我们paper里的结果，后来我follow了一些DSOD里面用到的训练超参数，比如增大batch size和延长训练时间等等，可以训到74点多）而Fast/Faster都只有十几二十多的样子。我相信很多人都看过Faster RCNN上这个issue：[https://github.com/rbgirshick/py-faster-rcnn/issues/238](https://link.zhihu.com/?target=https%3A//github.com/rbgirshick/py-faster-rcnn/issues/238)。我当时也研究了很久为什么Faster RCNN不能脱离pre-trained network来训练。因为SSD是可以训的，效果也不错。所以我们对比之后觉得ROI Pooling layer可能是影响性能的原因，本质上one-stage的detector更像是一个分类模型，同时SSD multi-stage prediction的结构本质上也是deeply supervised的。所以当时我们归结为需要一个one-stage+deeply supervised的结构来training from scratch，目的之一是为了摆脱ROI Pooling。后来的ScratchDet [2]也表示one-stage比two-stage更容易得到好的结果，虽然他们发现通过gradient clip也能把two-stage的性能提升上去一定程度。后面很多解读的文章说one-stage这个结论不对，因为Kaiming他们在two-stage上就得到了不亚于用pretrain模型的性能。但是大家可能都忽略了一个不大但是很重要的改动，Mask RCNN之后大家在two-stage的detector里面都普遍使用ROI Align而不是ROI Pooling，我在我们extended版本中对比了两者，two-stage detector from scratch下ROI Align的确可以帮助提升不少性能。</strong>

<strong>现在我来好好回答一下上面这个issue，为什么vanilla的Faster RCNN （two-stage detector） without pre-trained network效果不好。除了ROI Pooling可以换成ROI Align来提升一定程度性能外，我觉得更本质的一点是batch size太小（通常每张卡上1或2）导致BN收敛不好（ResNet和其他带有BN的backbone网络情况下），fine-tune我们通常fix BN所以不用考虑这个问题，如果是VGGNet这种没有BN的网络为什么效果也不好呢，我的观点是还是batch size太小的问题，我觉得大家有一个很常见的误区是把classification和detection完全分割开来对待，对于training from scratch，我觉得他们完全是相近的，我们可以想象如果ImageNet上用很小的batch size训classification model是不是也没法收敛得很好。ScratchDet中提出BN对于train from scratch非常crucial，这点完全没错，我也认同，他们也在one-stage的detector上取得了非常好的效果，我认为原因是one-stage的input相比two-stage是比较小的（300x300或者512x512），每张卡上默认的batch size可以设置得比较大，所以只使用普通的BN就可以收敛的不错，ScratchDet采用ResNet作为backbone，普通方式实现的DenseNet比较占用显存，需要通过一些特殊方式来减缓它 [5]，相比而言ResNet就要友好很多，所以ScratchDet可以在单张卡上使用比DSOD更大的batch size，所以结果好了很多，因为DSOD里面也是用了BN的，我后来尝试了使用24G显存的显卡跑更大batch size（double了一下batch size）的DSOD，结果直接提升了一个多点，所以我认为one-stage本身可以大batch训练让它很容易train from scratch。ScratchDet在two-stage上还是没有one-stage的好，我觉得是因为问题不在用不用BN这边，这里BN的作用跟在分类任务中是很相似的，没有BN之前AlexNet，VGGNet不是效果也还可以么，同理SSD+VGGNet在完全没有BN的情况下也能得到不错的结果（74点多在PASCAL VOC上）。所以这里正常的BN更多的是锦上添花的作用。Kaiming他们就总结得更加深入和本质：使用Sync BN和Group Norm，从本质上看这两个techniques跟使用普通的BN是不一样的，他们能很好的解决batch size太小的问题，当然直接暴力的使用更大显存的GPU也是一个可能的解决方法，作用等同于Sync BN，这也是为什么上面我说只要有了其中一个就能比较好的解决from scratch的问题，不管是one-stage和two-stage的detectors，同时这也是为什么Kaiming他们能在two-stage上得到非常strong的结果。由于detection使用过大的batch size可能会稍微影响性能，所以对于 two-stage detector from scratch使用group norm和其他类似功能的normalization可能是一个比较优的解决方法。我在Sync BN刚出来之后也尝试了一下用在two-stage from scratch的detector上，的确可以提升很多accuracy。</strong>

<strong>最后总结一下，one-stage因为自身特点每张卡上的batch size（包括整体的batch size）比较大，所以普通的BN就可以train from scratch，没有BN也可以（比如SSD+VGGNet，加上DSOD中用到的大batch size，128 vs. 32和更久的training），对于two-stage的模型，单卡和整体batch size都比较小，所以需要引入其他一些技术，包括ROI Align，Group Norm，Sync BN等等，只是16年底的时候并没有这些方法，所以我们当时提出train from scratch需要基于one-stage的detector也是完全可以理解的。DSOD除了提出train from scratch这个问题外，还有其他一些很小但有意思的contribution，包括stem结构对于detection的帮助等等（我们应该是最先发现用3个3x3小卷积替换第一层7x7大卷机可以带来明显提升的工作，虽然我们论文里写的是受Inception V3启发，但其实两者并没有什么关联，当时做完实验之后写论文时担心被reviewer说这个design不合理，所以硬是找一个能support这个结构的文章==），后面的PeeleNet [6]，ScratchDet [2]等也或多或少验证和借鉴了这点。个人觉得Kaiming的rethinking很好的把这个问题给讲透彻了，包括training data scale和training epoch数目对最终performance的影响，但还是要说network structure对于数据规模的需求的确不太一样，也很重要。我觉得未来在这个方向可能还可以挖掘的点一个是如何提升from scratch的训练效率（8倍于finetune的训练时长还是太久了），或者大幅度提升检测性能（通过改变backbone的结构[9]，现在已经有一些跟NAS结合的文章了[7, 8]）。DSOD当时投稿ICCV拿到了三个weak accept，rebuttal之后有个reviewer提升到了oral/poster，当时有个reviewer提出想看下如果我们的模型在imagenet上pretrain了之后结果会怎么样，他同时也强调即使这个结果更高也不会damage我们文章的contribution，我跑了一下然后发现用了imagenet pretrain之后居然没有什么提升，虽然由于rebuttal时间有限pretrain的模型比标准的epoch要少，但是我对这个结果还是非常震惊的，最后这个结论也被保留在了camera ready版本之中，但当时我的确有点担心有没有可能是我实验弄错了导致结论不正确，毕竟在17年初你跟我说不用pretrain的object detection可以跟用了的结果差不多我是很难相信的，所以这里也要感谢coauthor们对我的信任以及坚持要把这个结论放进最后的论文。我很喜欢当时其中一个reviewer给的一句评论：I think this paper is worth publishing at ICCV to open up more discussions on this direction. 如果大家有兴趣的话我可以把review意见share一下，当时看了还是很受鼓舞的。</strong>

<strong>[1] Kaiming He, Ross Girshick, and Piotr Dollár. "Rethinking imagenet pre-training." In Proceedings of the IEEE International Conference on Computer Vision, pp. 4918-4927. 2019.</strong>

<strong>[2] Rui Zhu, Shifeng Zhang, Xiaobo Wang, Longyin Wen, Hailin Shi, Liefeng Bo, and Tao Mei. "ScratchDet: Training single-shot object detectors from scratch." In Proceedings of the IEEE conference on computer vision and pattern recognition, pp. 2268-2277. 2019.</strong>

<strong>[3] Chao Peng, Tete Xiao, Zeming Li, Yuning Jiang, Xiangyu Zhang, Kai Jia, Gang Yu, and Jian Sun. "Megdet: A large mini-batch object detector." In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pp. 6181-6189. 2018.</strong>

<strong>[4] Yuxin Wu, and Kaiming He. "Group normalization." In Proceedings of the European Conference on Computer Vision (ECCV), pp. 3-19. 2018.</strong>

<strong>[5] Geoff Pleiss, Danlu Chen, Gao Huang, Tongcheng Li, Laurens van der Maaten, and Kilian Q. Weinberger. "Memory-efficient implementation of densenets." arXiv preprint arXiv:1707.06990 (2017).</strong>

<strong>[6] Robert J. Wang, Xiang Li, and Charles X. Ling. "Pelee: A real-time object detection system on mobile devices." In Advances in Neural Information Processing Systems, pp. 1963-1972. 2018.</strong>

<strong>[7] Lewei Yao, Hang Xu, Wei Zhang, Xiaodan Liang, and Zhenguo Li. "SM-NAS: Structural-to-Modular Neural Architecture Search for Object Detection." arXiv preprint arXiv:1911.09929(2019).</strong>

<strong>[8] Yosuke Shinya, Edgar Simo-Serra, and Taiji Suzuki. "Understanding the Effects of Pre-Training for Object Detectors via Eigenspectrum." In Proceedings of the IEEE International Conference on Computer Vision Workshops, pp. 0-0. 2019.</strong>

<strong>[9] Zeming Li, Chao Peng, Gang Yu, Xiangyu Zhang, Yangdong Deng, and Jian Sun. "Detnet: A backbone network for object detection." arXiv preprint arXiv:1804.06215(2018).</strong>