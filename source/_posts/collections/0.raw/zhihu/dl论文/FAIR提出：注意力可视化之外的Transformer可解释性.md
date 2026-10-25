---
title: "FAIR提出：注意力可视化之外的Transformer可解释性"
date: "2020-12-19 00:00:00"
updated: "2020-12-19 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/dl论文/FAIR提出-注意力可视化之外的Transformer可解释性/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/338156132"
---


本文提出了一种计算Transformers网络相关性的新方法，其基于深度泰勒分解原理分配局部相关性，然后将其传播到各层。实验证明了相对于现有可解释性方法的明显优势，代码现已开源！

<strong>注：文末附【Transformer】学习交流群</strong>

<strong>Transformer Interpretability Beyond Attention Visualization</strong>

![](https://pic2.zhimg.com/v2-d613cf822a0b4ca6275f02e6d884bacf_r.jpg)作者单位：Facebook（FAIR）
代码：[hila-chefer/Transformer-Explainability](https://link.zhihu.com/?target=https%3A//github.com/hila-chefer/Transformer-Explainability)
论文：[https://arxiv.org/abs/2012.09838](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2012.09838)自注意力技术，特别是“Transformers”，在文本处理领域占据主导地位，并且在计算机视觉分类任务中变得越来越流行。有多流行，看一下近期CVer推送的内容就知道了，比如：

- [清华大学提出PCT：Point Cloud Transformer](https://zhuanlan.zhihu.com/p/337824728)
- [牛津大学等提出：Point Transformer](https://zhuanlan.zhihu.com/p/337603099)
- [Cell-DETR：基于Transformer的细胞实例分割网络](https://zhuanlan.zhihu.com/p/337479181)
- [清华大学等提出PED：用于行人检测的DETR](https://zhuanlan.zhihu.com/p/337424525)
- [CNN与Transformer结合！东南大学提出视频帧合成新架构 ConvTransformer](https://zhuanlan.zhihu.com/p/336618837)
- [北大和港中文提出ACT：自适应聚类Transformer的端到端目标检测](https://zhuanlan.zhihu.com/p/336385944)
- [420 FPS！LSTR：基于Transformer的端到端实时车道线检测，代码已开源！](https://zhuanlan.zhihu.com/p/331892664)为了可视化导致某种分类的图像部分，现有方法要么依赖于获得的注意力图（attention maps），要么采用沿注意力图的启发式传播（heuristic propagation）。

在这项工作中，我们提出了一种计算Transformers网络相关性（relevancy）的新颖方法。该方法基于<strong>深度泰勒分解（Taylor decomposition）</strong>原理分配局部相关性，然后将这些相关性分数传播到各层。这种传播涉及注意力层和跳跃连接，这挑战了现有方法。我们的解决方案基于一种特定的方式，该方式被证明可以保持各层之间的整体相关性。

内容较为硬核，这里直接搬原文（建议这块直接看论文，信息量有点大，而且要有Transformer相关基础知识比较好）

![](https://pic2.zhimg.com/v2-306d39e32d7dbc069c711d80f157cf15_r.jpg)
![](https://picx.zhimg.com/v2-a497cf676faa8290cc9db718820e8913_r.jpg)
![](https://pic3.zhimg.com/v2-a97ec08b3a7ccedfb83c38f6eeb433ac_r.jpg)
实验结果
我们在最近的可视化Transformer网络以及文本分类问题上对我们的方法进行了基准测试，并证明了相对于现有可解释性方法的明显优势。

![](https://pic1.zhimg.com/v2-b11e572e7c7bea2cedb1b1d9b699831c_r.jpg)
![](https://pica.zhimg.com/v2-ddfb64e03282bc2a8d9c06038b54db66_r.jpg)
![](https://picx.zhimg.com/v2-f6ef85b5a8e30dd545ce93f129d46cfd_r.jpg)
![](https://pica.zhimg.com/v2-6d7560176ce5257b7d252fc82bd23284_r.jpg)
部分代码示例

![](https://pic1.zhimg.com/v2-ffe548b2cf2e70783a3dd2dc29d62208_r.jpg)
CVer-Transformer交流群
已建立CVer-Transformer微信交流群！想要进Transformer学习交流群的同学，可以直接加微信号：<strong>CVer5555</strong>。加的时候备注一下：Transformer<strong>+学校+昵称</strong>，即可。然后就可以拉你进群了。

<strong>强烈推荐大家关注</strong>[CVer知乎](https://www.zhihu.com/people/cver-38)<strong>账号和</strong>[CVer](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/moRNkCaBDtYZgXwaZDXBwA)<strong>微信公众号，可以快速了解到最新优质的CV论文。</strong>

推荐阅读
[清华大学提出PCT：Point Cloud Transformer](https://zhuanlan.zhihu.com/p/337824728)

[细长目标检测：分析与改进](https://zhuanlan.zhihu.com/p/337737656)

[牛津大学等提出：Point Transformer](https://zhuanlan.zhihu.com/p/337603099)

[Cell-DETR：基于Transformer的细胞实例分割网络](https://zhuanlan.zhihu.com/p/337479181)

[清华大学等提出PED：用于行人检测的DETR](https://zhuanlan.zhihu.com/p/337424525)

[亚马逊李沐团队提出：行为识别的全面调研（2014-2020）](https://zhuanlan.zhihu.com/p/337212192)

[华盛顿大学提出：实时高分辨率图像抠图网络](https://zhuanlan.zhihu.com/p/337069456)

[对医学图像分割中的置信度进行量化](https://zhuanlan.zhihu.com/p/336954764)

[SSL4MIS：半监督医学图像分割论文合集+benchmark](https://zhuanlan.zhihu.com/p/336856716)

[你的NMS该换了！Confluence：实现更准、更强的目标检测](https://zhuanlan.zhihu.com/p/336681585)

[CNN与Transformer结合！东南大学提出视频帧合成新架构 ConvTransformer](https://zhuanlan.zhihu.com/p/336618837)

[DenseCL：自监督视觉预训练的密集对比学习](https://zhuanlan.zhihu.com/p/336499076)

[北大和港中文提出ACT：自适应聚类Transformer的端到端目标检测](https://zhuanlan.zhihu.com/p/336385944)

[清华大学提出：预训练表示的Bi-tuning](https://zhuanlan.zhihu.com/p/334804227)

[综述 | 基于深度学习的单目深度估计技术：全面调研（2014-2020）](https://zhuanlan.zhihu.com/p/334015722)

[AAAI 2021 | 国科大和上海交大提出RSDet：旋转目标新网络，代码已开源！](https://zhuanlan.zhihu.com/p/333632365)

[420 FPS！LSTR：基于Transformer的端到端实时车道线检测](https://zhuanlan.zhihu.com/p/331892664)

[图像分割涨点技巧！从39个Kaggle竞赛中总结出的分割Tips和Tricks](https://zhuanlan.zhihu.com/p/330994781)

[涨点明显！港中文等提出SplitNet：通过切分网络和结合Co-Training提升CNN性能](https://zhuanlan.zhihu.com/p/330096530)

[重磅！中山大学提出行人重识别新方法和史上最大数据集SYSU-30k，已开源！](https://zhuanlan.zhihu.com/p/329077441)

[AAAI 2021 | 上海交大等提出R3Det：旋转目标检测网络，代码已开源！](https://zhuanlan.zhihu.com/p/328109725)

[北京大学等提出SR新模块！通过Squeeze Reasoning实现高效的场景理解](https://zhuanlan.zhihu.com/p/327018016)

[冠军解决方案！用于脑肿瘤分割的nnU-Net改进](https://zhuanlan.zhihu.com/p/325932805)

[刷新WIDER Face纪录！TinaFace：人脸检测新网络，代码已开源！](https://zhuanlan.zhihu.com/p/324302835)

[这个AI能帮你女朋友自拍！从照片生成3D视频，总有个角度让她满意](https://zhuanlan.zhihu.com/p/323413250)

[STTR：基于Transformers的立体深度估计网络，代码已开源！](https://zhuanlan.zhihu.com/p/322474163)

[用GAN生成70岁的你！还可以重返17岁，代码已开源！ECCV 2020 Adobe等新研究](https://zhuanlan.zhihu.com/p/321931335)

[WACV2021 | 用于小目标检测的FPN中的高效融合因子](https://zhuanlan.zhihu.com/p/319693366)

[综述 | 对比自监督学习技术：全面调研](https://zhuanlan.zhihu.com/p/317714408)

[85.4 mIOU！NVIDIA：使用多尺度注意力进行语义分割](https://zhuanlan.zhihu.com/p/315763683)

[深入研究Label Smoothing(标签平滑)](https://zhuanlan.zhihu.com/p/314262853)

[使用PyTorch时，最常见的4个错误](https://zhuanlan.zhihu.com/p/312200297)

[NeurIPS 2020 | Auto-Panoptic：用于全景分割的协作式多组件体系结构搜索](https://zhuanlan.zhihu.com/p/311442024)

[NeurIPS 20 | RelationNet++: Transformer桥接视觉表示的目标检测](https://zhuanlan.zhihu.com/p/309502928)

[利用YOLOv4和Deep SORT实现多摄像头实时目标跟踪和计数（已开源）](https://zhuanlan.zhihu.com/p/308227921)

[NeurIPS 20 | 超越EfficientNet！TinyNet：玩转网络的分辨率，深度和宽度](https://zhuanlan.zhihu.com/p/306860977)

[涨点技巧！汇集13个Kaggle图像分类项目的性能提升指南](https://zhuanlan.zhihu.com/p/305686548)

[利用知识蒸馏改进目标检测：面向准确高效的检测器](https://zhuanlan.zhihu.com/p/305085449)

[使用深度学习从视频中估计车辆的速度（已开源）](https://zhuanlan.zhihu.com/p/303262635)

[ECCV 2020 | 旷视开源LabelEnc：提升目标检测的新型中间监督方法](https://zhuanlan.zhihu.com/p/300181475)

[这9个技巧让你的PyTorch模型训练得飞快！](https://zhuanlan.zhihu.com/p/296887060)

[牛津博士论文 | 学习重建和分割3D目标（143页PDF）](https://zhuanlan.zhihu.com/p/292298343)

[谷歌刚刚发布Objectron新数据集，可完美检测3D目标，超过4百万幅图像和15K视频剪辑！](https://zhuanlan.zhihu.com/p/287791791)

[综述 | MIT提出视频理解/行为识别：全面调研（2004-2020）](https://zhuanlan.zhihu.com/p/282081673)

[综述 | 基于无人机的目标跟踪的相关滤波器：全面调研](https://zhuanlan.zhihu.com/p/280106134)

[从三个维度加速你的CNN：全面的剪枝框架](https://zhuanlan.zhihu.com/p/278305531)

[Recall Loss：用于不平衡图像分类和语义分割的召回损失](https://zhuanlan.zhihu.com/p/273825454)

[即插即用！Rotate to Attend：卷积Triplet注意力模块](https://zhuanlan.zhihu.com/p/272240832)

[旷视提出MegDetV2：目标检测/实例分割系统](https://zhuanlan.zhihu.com/p/270421298)

[综述 | 基于深度学习的医学图像分割技术：全面调研](https://zhuanlan.zhihu.com/p/269625789)

[ResNet还是DenseNet？即插即用的DS涨点神器来了！](https://zhuanlan.zhihu.com/p/269100195)

[综述 | 基于深度学习的端到端人脸识别技术：全面调研](https://zhuanlan.zhihu.com/p/268904950)

[TBC：共享Thinner Filters，实现更强的CNN！](https://zhuanlan.zhihu.com/p/268203197)

[综述 | 行人检测技术（从手工特征到深度学习）：全面调研](https://zhuanlan.zhihu.com/p/267875460)

[超越EfficientNets！无需注意力，也能让你的网络更快更强！](https://zhuanlan.zhihu.com/p/266745304)

[OpenCV 4.5来了！更强的SIFT，改进RANSAC算法，新增目标跟踪网络SiamRPN++](https://zhuanlan.zhihu.com/p/266074038)

[综述 | 基于深度学习的实时语义分割方法：全面调研](https://zhuanlan.zhihu.com/p/266047861)

[涨点神器！南航提出AFF：注意力特征融合](https://zhuanlan.zhihu.com/p/265807713)

[NeurIPS 2020 | 谷歌大脑提出：重新思考预训练和自训练](https://zhuanlan.zhihu.com/p/264915903)

[NeurIPS 2020 | 用于图像复原/恢复的神经稀疏表示](https://zhuanlan.zhihu.com/p/265537820)

[NeurIPS 2020 | aLRPLoss：统一目标检测中的分类和定位的平衡损失函数](https://zhuanlan.zhihu.com/p/261152524)

[CCE：具有互补交叉熵的不平衡图像分类](https://zhuanlan.zhihu.com/p/259388350)

[谷歌地标检索2020 Kaggle 第一名解决方案](https://zhuanlan.zhihu.com/p/258116357)

[ECCV AIM 2020 真实图像超分辨率挑战赛3项冠军解决方案](https://zhuanlan.zhihu.com/p/251061278)

[LVIS 实例分割挑战赛2020的第一名解决方案：好的Box不能保证好的Mask](https://zhuanlan.zhihu.com/p/249098699)

[ETH Zurich提出DPIR：具有Denoiser先验的即插即用图像恢复](https://zhuanlan.zhihu.com/p/243492602)

[ECCV 2020 | NAS-DIP：通过NAS实现DIP（去噪/去雾/超分辨率/修复等）](https://zhuanlan.zhihu.com/p/216160998)

[综述 | 小样本学习：全面调研（Few-shot）](https://zhuanlan.zhihu.com/p/211123233)

[使用深度神经网络从Noisy Labels中学习：全面调研](https://zhuanlan.zhihu.com/p/161822079)

[剪枝filter？还是剪枝layer？这是个问题](https://zhuanlan.zhihu.com/p/163248951)

[ECCV 2020 | WeightNet：重新探索Weight网络的设计空间](https://zhuanlan.zhihu.com/p/185009696)

[ECCV 2020 | 53.5 AP！PAA：用于目标检测的IoU预测的概率Anchor分配](https://zhuanlan.zhihu.com/p/161667111)

[ECCV 2020 | 南京理工提出FPT：特征金字塔Transformer](https://zhuanlan.zhihu.com/p/166649124)

[ECCV 2020 | BMask R-CNN：边界保持的Mask R-CNN](https://zhuanlan.zhihu.com/p/163672090)

[ECCV 2020 | 即插即用！PSConv：将特征金字塔压缩到紧凑](https://zhuanlan.zhihu.com/p/160777733)