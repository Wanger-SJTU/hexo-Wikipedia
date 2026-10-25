---
title: Label Assign：提升目标检测上限
date: "2020-07-21 00:00:00"
updated: "2020-07-21 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/Label-Assign-提升目标检测上限/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/160991530
---


**欢迎关注**[Smarter](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzg4MjQ1NzI0NA%3D%3D%26mid%3D2247484676%26idx%3D1%26sn%3Db3e1d55fe9b0bba767ede2b5eaf65e05%26chksm%3Dcf572af7f820a3e1d287ce8e6d90e1a711a7a431fad577fbcbce82342af06f79a7d77e6cc6ae%26mpshare%3D1%26scene%3D1%26srcid%3D1016B6547fKNGgPPgruP5SoL%26sharer_sharetime%3D1602781937254%26sharer_shareid%3D82cee3a8f0a8ff7eecd2ceefe336efb7%26key%3Df574234d23a61558200582ee93330fd874a26c01c3135b6fa7da5a8ee9293860e990e5df26a6a12b60add19c1e435e9c5c5a790bbf259b995606c51cf98b120940101c054a829d9c6ed48bed205ce22c008e14d5982c7e5d894b3521a72a3df3d1bb721546cce756b41f51a0eedc0c3d251fd696250ed11ef302defd6ac32aa3%26ascene%3D1%26uin%3DMjg2NzcxMTYxMA%253D%253D%26devicetype%3DWindows%2B10%2Bx64%26version%3D62090070%26lang%3Dzh_CN%26exportkey%3DA3I5K5BT6jZRREZDCEHhodo%253D%26pass_ticket%3DGaUOlhvnIhLjiMbxtLcTZyWL7ksGkja0M6SXxgiJcurYxGHGyJOdo7KmfnjlcSR3%26wx_header%3D0)**公众号**

最近因为AutoAssign这篇paper的原因，再加上之前对目标检测中label assign问题很感兴趣， 看了几篇label assign相关论文（**FreeAnchor、ATSS、AutoAssign**），梳理一下几篇论文的关系做个记录~~ 

我用一张图大致梳理出几个label assign相关论文的关系

![](https://pic4.zhimg.com/v2-dd8adf73b920e01d5508d0423399c0c9_r.jpg)FreeAnchor、ATSS、AutoAssign都是Label Assign方面的改进。ATSS提出RetinaNet和FCOS的gap主要源于采样方式的不同，ATSS提出更好的Label Assign，来缩小RetinaNet和FCOS的差距，FreeAnchor在RetinaNet的基础上提出更好的Label Assign，AutoAssign在FCOS的基础上提出更好的Label Assign。

RetinaNet是Anchor-based经典算法，FCOS是Anchor-Free的经典算法，FCOS在RetinaNet的基础上，去掉anchor先验，转变成point先验，同时增加了center-ness分支来去除低质量的point采样。相关的算法细节可以看我之前的笔记 

[陀飞轮：目标检测：Anchor-Free时代](https://zhuanlan.zhihu.com/p/62103812)

[陀飞轮：Soft Sampling：探索更有效的采样策略](https://zhuanlan.zhihu.com/p/63954517)

**ReinaNet和FCOS主要有3点不同：**

1.每个位置的先验数量不同。RetinaNet每个位置有几个anchor先验，而FCOS每个位置只有一个point先验。

2.正负样本的采样方式不同。RetinaNet通过IOU来选择正负样本，而FCOS通过空间和尺度的约束来选择正负样本。

3.回归的起始点不同。RetinaNet回归的起始点是筛选过的anchor box，而FCOS回归的起始点是筛选过的point box。

**Inconsistency Removal**

![](https://pic2.zhimg.com/v2-a4bbdb81d3731daa2bf2888587dfb455_r.jpg)FCOS相比于只设置一个anchor先验的RetinaNet来说，COCO数据集上的mAP高差不多5个点，为了公平的比较RetinaNet和FCOS的精度差异的原因，ATSS的paper中用一致的trick对RetinaNet和FCOS进行实验。如实验所示，相同trick设置下，RetinaNet比FCOS少0.8个点，这时RetinaNet和FCOS的差别仅仅在于采样方式和回归起点的不同。

**Essential Difference**

![](https://pica.zhimg.com/v2-9b8b74d9de785ba8992ea2f10a4dc4aa_r.jpg)
![](https://picx.zhimg.com/v2-28b119f0e6ae6b22a9220218a9e4d6b7_r.jpg)为了进一步探究采样方式和回归起点对于精度的影响，ATSS中对RetinaNet和FCOS排列组合了四种实验进行比较。如实验所示，回归起点对精度影响微乎其微，采样方式才是RetinaNet和FCOS最本质的差别。

![](https://pic4.zhimg.com/v2-47370752ea69755cb3c703cecb916e21_r.jpg)通过上述实验观察，引出了目标检测任务中非常重要的难点，**How to define positive and negative training samples? **也就是本文关注的label assign问题。好的label assign方式可以提升目标检测器的上限。

ATSS
ATSS的paper中进而提出了一种更加合适的label assign方式，称为ATSS。

ATSS吸收了RetinaNet和FCOS的采样方式的优点，ATSS采样方式如下：

1.基于anchor box和ground-truth的中心点距离选择候选正样本

2.使用候选anchor box的mean和std之和作为IOU阈值自适应的挑选候选正样本

3.通过候选正样本中心是否落在ground-truth内筛选出最终的正样本

下图中显示出了ATSS对于不同分布的样本可以自适应的调整阈值，挑选到合适尺度下的正样本。

自适应阈值为：
![](https://www.zhihu.com/equation?tex=t+_+%7B+g+%7D+%3D+m+_+%7B+g+%7D+%2B+v+_+%7B+g+%7D) 

![](https://pic1.zhimg.com/v2-2a12dbbcdfdc616c3e1c65555cf96cc6_r.jpg)RetinaNet和FCOS都可以叠加ATSS的采样方式，实验结果显示，RetinaNet和FCOS在ATSS的采样方式下，mAP基本上持平，缩小了Anchor-based和Anchor-Free之间的精度差异。验证了好的采样方式能够提升目标检测精度的上限。

**FreeAnchor**

![](https://picx.zhimg.com/v2-5a1c619b1633130562a892b9f9e11f9f_r.jpg)将检测训练过程看成一个极大似然估计问题

![](https://www.zhihu.com/equation?tex=%5Cmathcal+%7B+L+%7D+%28+%5Ctheta+%29+%3D+%5Csum+_+%7B+a+_+%7B+j+%7D+%5Cin+A+_+%7B+%2B+%7D+%7D+%5Csum+_+%7B+b+_+%7B+i+%7D+%5Cin+B+%7D+C+_+%7B+i+j+%7D+%5Cmathcal+%7B+L+%7D+_+%7B+i+j+%7D+%5E+%7B+c+l+s+%7D+%28+%5Ctheta+%29+%2B+%5Cbeta+%5Csum+_+%7B+a+_+%7B+j+%7D+%5Cin+A+_+%7B+%2B+%7D+%7D+%5Csum+_+%7B+b+_+%7B+i+%7D+%5Cin+B+%7D+C+_+%7B+i+j+%7D+%5Cmathcal+%7B+L+%7D+_+%7B+i+j+%7D+%5E+%7B+l+o+c+%7D+%28+%5Ctheta+%29+%2B+%5Csum+_+%7B+a+_+%7B+j+%7D+%5Cin+A+_+%7B+-+%7D+%7D+%5Cmathcal+%7B+L+%7D+_+%7B+j+%7D+%5E+%7B+b+g+%7D+%28+%5Ctheta+%29%5C%5C) 
 
![](https://www.zhihu.com/equation?tex=%5Cbegin%7Baligned%7D+%5Cmathcal+%7B+P+%7D+%28+%5Ctheta+%29+%26+%3D+e+%5E+%7B+-+%5Cmathcal+%7B+L+%7D+%28+%5Ctheta+%29+%7D+%5C%5C+%26+%3D+%5Cprod+_+%7B+a+_+%7B+j+%7D+%5Cin+A+_+%7B+%2B+%7D+%7D+%28+%5Csum+_+%7B+b+_+%7B+i+%7D+%5Cin+B+%7D+C+_+%7B+i+j+%7D+e+%5E+%7B+-+%5Cmathcal+%7B+L+%7D+_+%7B+i+j+%7D+%5E+%7B+c+l+s+%7D+%28+%5Ctheta+%29+%7D%29+%5Cprod+_+%7B+a+_+%7B+j+%7D+%5Cin+A+_+%7B+%2B+%7D+%7D+%28+%5Csum+_+%7B+b+_+%7B+i+%7D+%5Cin+B+%7D+C+_+%7B+i+j+%7D+e+%5E+%7B+-+%5Cbeta+%5Cmathcal+%7B+L+%7D+_+%7B+i+j+%7D+%5E+%7B+l+o+c+%7D+%28+%5Ctheta+%29+%7D%29+%5Cprod+_+%7B+a+_+%7B+j+%7D+%5Cin+A+_+%7B+-+%7D+%7D+e+%5E+%7B+-+%5Cmathcal+%7B+L+%7D+_+%7B+j+%7D+%5E+%7B+b+g+%7D+%28+%5Ctheta+%29+%7D+%5C%5C+%26+%3D+%5Cprod+_+%7B+a+_+%7B+j+%7D+%5Cin+A+_+%7B+%2B+%7D+%7D+%28+%5Csum+_+%7B+b+_+%7B+i+%7D+%5Cin+B+%7D+C+_+%7B+i+j+%7D+%5Cmathcal+%7B+P+%7D+_+%7B+i+j+%7D+%5E+%7B+c+l+s+%7D+%28+%5Ctheta+%29+%29+%5Cprod+_+%7B+a+_+%7B+j+%7D+%5Cin+A+_+%7B+%2B+%7D+%7D+%28+%5Csum+_+%7B+b+_+%7B+i+%7D+%5Cin+B+%7D+C+_+%7B+i+j+%7D+%5Cmathcal+%7B+P+%7D+_+%7B+i+j+%7D+%5E+%7B+l+o+c+%7D+%28+%5Ctheta+%29+%29+%5Cprod+_+%7B+a+_+%7B+j+%7D+%5Cin+A+_+%7B+-+%7D+%7D+%5Cmathcal+%7B+P+%7D+_+%7B+j+%7D+%5E+%7B+b+g+%7D+%28+%5Ctheta+%29+%5Cend%7Baligned%7D%5C%5C) 
构造极大似然估计问题的recall和precision似然函数

![](https://www.zhihu.com/equation?tex=%5Cmathcal+%7B+P+%7D+_+%7B+%5Ctext+%7Brecall%7D+%7D+%28+%5Ctheta+%29+%3D+%5Cprod+_+%7B+i+%7D+%5Cmax+_+%7B+a+_+%7B+j+%7D+%5Cin+A+_+%7B+i+%7D+%7D+%5Cleft%28+%5Cmathcal+%7B+P+%7D+_+%7B+i+j+%7D+%5E+%7B+c+l+s+%7D+%28+%5Ctheta+%29+%5Cmathcal+%7B+P+%7D+_+%7B+i+j+%7D+%5E+%7B+l+o+c+%7D+%28+%5Ctheta+%29+%5Cright%29%5C%5C) 
 
![](https://www.zhihu.com/equation?tex=%5Cmathcal+%7B+P+%7D+_+%7B+%5Ctext+%7Bprecision%7D+%7D+%28+%5Ctheta+%29+%3D+%5Cprod+_+%7B+j+%7D+%28+1+-+P+%5Cleft%5C%7B+a+_+%7B+j+%7D+%5Cin+A+_+%7B+-+%7D+%5Cright%5C%7D+%28+1+-+%5Cmathcal+%7B+P+%7D+_+%7B+j+%7D+%5E+%7B+b+g+%7D+%28+%5Ctheta+%29+%29+%29%5C%5C) 

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Baligned%7D+%5Cmathcal+%7B+P+%7D+%5E+%7B+%5Cprime+%7D+%28+%5Ctheta+%29+%26+%3D+%5Cmathcal+%7B+P+%7D+_+%7B+%5Ctext+%7Brecall%7D+%7D+%28+%5Ctheta+%29+%5Ctimes+%5Cmathcal+%7B+P+%7D+_+%7B+%5Ctext+%7Bprecision%7D+%7D+%28+%5Ctheta+%29+%5C%5C+%26+%3D+%5Cprod+_+%7B+i+%7D+%5Cmax+_+%7B+a+_+%7B+j+%7D+%5Cin+A+_+%7B+i+%7D+%7D+%5Cleft%28+%5Cmathcal+%7B+P+%7D+_+%7B+i+j+%7D+%5E+%7B+c+l+s+%7D+%28+%5Ctheta+%29+%5Cmathcal+%7B+P+%7D+_+%7B+i+j+%7D+%5E+%7B+l+o+c+%7D+%28+%5Ctheta+%29+%5Cright%29+%5Ctimes+%5Cprod+_+%7B+j+%7D+%28+1+-+P+%5C%7B+a+_+%7B+j+%7D+%5Cin+A+_+%7B+-+%7D+%5C%7D+%28+1+-+%5Cmathcal+%7B+P+%7D+_+%7B+j+%7D+%5E+%7B+b+g+%7D+%28+%5Ctheta+%29+%29%29+%5Cend%7Baligned%7D%5C%5C) 
转变成损失函数
 
![](https://www.zhihu.com/equation?tex=%5Cbegin%7Baligned%7D+%5Cmathcal+%7B+L+%7D+%5E+%7B+%5Cprime+%7D+%28+%5Ctheta+%29+%26+%3D+-+%5Clog+%5Cmathcal+%7B+P+%7D+%5E+%7B+%5Cprime+%7D+%28+%5Ctheta+%29+%5C%5C+%26+%3D+-+%5Csum+%5Clog+%28+%5Cmax+_+%7B+a+_+%7B+j+%7D+%5Cin+A+_+%7B+i+%7D+%7D+%28+%5Cmathcal+%7B+P+%7D+_+%7B+i+j+%7D+%5E+%7B+c+l+s+%7D+%28+%5Ctheta+%29+%5Cmathcal+%7B+P+%7D+_+%7B+i+j+%7D+%5E+%7B+l+o+c+%7D+%28+%5Ctheta+%29+%29+%29+-+%5Csum+%5Clog+%28+1+-+P+%5C%7B+a+_+%7B+j+%7D+%5Cin+A+_+%7B+-+%7D+%5C%7D+%28+1+-+%5Cmathcal+%7B+P+%7D+_+%7B+j+%7D+%5E+%7B+b+g+%7D+%28+%5Ctheta+%29+%29+%29+%5Cend%7Baligned%7D%5C%5C) 
 
![](https://www.zhihu.com/equation?tex=%5Cmathcal+%7B+L+%7D+%5E+%7B+%5Cprime+%5Cprime+%7D+%28+%5Ctheta+%29+%3D+-+w+_+%7B+1+%7D+%5Csum+_+%7B+i+%7D+%5Clog+%5Cleft%28+%5Coperatorname+%7B+Mean-%7D%5Cmax+%5Cleft%28+X+_+%7B+i+%7D+%5Cright%29+%5Cright%29+%2B+w+_+%7B+2+%7D+%5Csum+_+%7B+j+%7D+F+L+%28+P+%5Cleft%5C%7B+a+_+%7B+j+%7D+%5Cin+A+_+%7B+-+%7D+%5Cright%5C%7D+%28+1+-+%5Cmathcal+%7B+P+%7D+_+%7B+j+%7D+%5E+%7B+b+g+%7D+%28+%5Ctheta+%29+%29+%29%5C%5C) 
FreeAnchor在RetianNet的基础上，将检测器的训练过程定义成一个极大似然估计问题，通过优化recall和precision似然函数的loss，自适应的将匹配的anchor构建成bag of anchors。 

将检测看成一个极大似然估计问题的好处是可以不用平衡分类和定位分支，通过一个loss来监督检测器的训练，并且可以自适应的调整匹配的anchor。 

如下图所示，随着训练的进行，检测器挑选出匹配的anchor。

![](https://picx.zhimg.com/v2-4215a5645bf282748ccf76a04faba419_r.jpg)
**AutoAssign**

![](https://pic4.zhimg.com/v2-e02f56843698e2f7205c01e1f72104b5_r.jpg)但是FreeAnchor和ATSS本质上还是通过中心先验、IOU、空间和尺度约束来进行label assign，避免不了大量超参数的调整，不是完完全全的自适应label assign。

最近的AutoAssign在FCOS的基础上，通过引入ImpObj、Center Weighting和Confidence Weighting三个分支，将FCOS中根据空间和尺度定义正负样本的方式和center-ness分支都去掉，将label assign做的更加彻底，完完全全通过CNN学习自适应的label assign方式。

借鉴了作者的理解：[poodar.chu：From VanillaDet to AutoAssign](https://zhuanlan.zhihu.com/p/158907507)

**From VanillaDet to AutoAssign**

![](https://pic4.zhimg.com/v2-830f620b3d78470ea9f27ed90368c889_r.jpg)VanillaDet 是指：对于一个 gt box，所有在这个 gt box 内的位置（所有 FPN 层都包含在内），都是这个 gt 的正样本；反之，所有不落在 gt 框内部的位置都是负样本。可以理解为label assign的下限。

从实验结果可知，更好的label assign方式可以大幅度提升检测器的精度。

![](https://pic2.zhimg.com/v2-b01793b85bee81e1e5d72fc73c382b2b_r.jpg)**Center Weighting**

引入高斯中心先验，通过与gt中心点的距离学习出不同类别自适应的中心先验

![](https://www.zhihu.com/equation?tex=G+%28+%5Cvec+%7B+d+%7D+%5Cmid+%5Cvec+%7B+%5Cmu+%7D+%2C+%5Cvec+%7B+%5Csigma+%7D+%29+%3D+e+%5E+%7B+%5Cfrac+%7B+-+%28+%5Cvec+%7B+d+%7D+-+%5Cvec+%7B+%5Cmu+%7D+%29+%5E+%7B+2+%7D+%7D+%7B+2+%5Cvec+%7B+%5Csigma+%7D+%5E+%7B+2+%7D+%7D+%7D%5C%5C) 
**Confidence Weighting**

​通过ImpObj分支来避免引入大量背景位置

![](https://www.zhihu.com/equation?tex=%5Cmathcal+%7B+P+%7D+_+%7B+i+%7D+%28+c+l+s+%5Cmid+%5Ctheta+%29+%3D+%5Cmathcal+%7B+P+%7D+_+%7B+i+%7D+%28+c+l+s+%5Cmid+o+b+j+%2C+%5Ctheta+%29+%5Cmathcal+%7B+P+%7D+_+%7B+i+%7D+%28+o+b+j+%5Cmid+%5Ctheta+%29%5C%5C) 
与FreeAnchor相似，将分类和定位联合看成极大似然估计问题，学习出样本的置信度

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Baligned%7D+%5Cmathcal+%7B+L+%7D+_+%7B+i+%7D+%28+%5Ctheta+%29+%26+%3D+%5Cmathcal+%7B+L+%7D+_+%7B+i+%7D+%5E+%7B+c+l+s+%7D+%28+%5Ctheta+%29+%2B+%5Clambda+%5Cmathcal+%7B+L+%7D+_+%7B+i+%7D+%5E+%7B+l+o+c+%7D+%28+%5Ctheta+%29+%5C%5C+%26+%3D+-+%5Clog+%5Cleft%28+%5Cmathcal+%7B+P+%7D+_+%7B+i+%7D+%28+c+l+s+%5Cmid+%5Ctheta+%29+%5Cright%29+%2B+%5Clambda+%5Cmathcal+%7B+L+%7D+_+%7B+i+%7D+%5E+%7B+l+o+c+%7D+%28+%5Ctheta+%29+%5C%5C+%26+%3D+-+%5Clog+%28+%5Cmathcal+%7B+P+%7D+_+%7B+i+%7D+%28+c+l+s+%5Cmid+%5Ctheta+%29+e+%5E+%7B+-+%5Clambda+%5Cmathcal+%7B+L+%7D+_+%7B+i+%7D+%5E+%7B+l+o+c+%7D+%28+%5Ctheta+%29+%7D%29+%5C%5C+%26+%3D+-+%5Clog+%5Cleft%28+%5Cmathcal+%7B+P+%7D+_+%7B+i+%7D+%28+c+l+s+%5Cmid+%5Ctheta+%29+%5Cmathcal+%7B+P+%7D+_+%7B+i+%7D+%28+%5Coperatorname+%7B+loc+%7D+%5Cmid+%5Ctheta+%29+%5Cright%29+%5C%5C+%26+%3D+-+%5Clog+%5Cleft%28+%5Cmathcal+%7B+P+%7D+_+%7B+i+%7D+%28+%5Ctheta+%29+%5Cright%29+%5Cend%7Baligned%7D%5C%5C) 

![](https://www.zhihu.com/equation?tex=C+%5Cleft%28+%5Cmathcal+%7B+P+%7D+_+%7B+i+%7D+%5Cright%29+%3D+e+%5E+%7B+%5Cfrac+%7B+p+_+%7B+i+%7D+%28+%5Ctheta+%29+%7D+%7B+%5Ctau+%7D+%7D%5C%5C) 
**positive weights**

通过Center Weighting和Confidence Weighting得到Positive weights

![](https://www.zhihu.com/equation?tex=w+_+%7B+i+%7D+%5E+%7B+%2B+%7D+%3D+%5Cfrac+%7B+C+%28+%5Cmathcal+%7B+P+%7D+_+%7B+i+%7D+%29+G+%28+%5Cvec+%7B+d+%7D+_+%7B+i+%7D+%29+%7D+%7B+%5Csum+_+%7B+j+%5Cin+S+_+%7B+n+%7D+%7D+C+%5Cleft%28+%5Cmathcal+%7B+P+%7D+_+%7B+i+%7D+%5Cright%29+G+%28+%5Cvec+%7B+d+%7D+_+%7B+i+%7D+%29+%7D%5C%5C) 
**negative weights**

通过最大IOU得到Negative weights

![](https://www.zhihu.com/equation?tex=w+_+%7B+i+%7D+%5E+%7B+-+%7D+%3D+1+-+f+%28+%5Cfrac+%7B+1+%7D+%7B+1+-+%5Cmathrm+%7B+i+%7D+%5Cmathrm+%7B+ou+%7D+_+%7B+i+%7D+%7D+%29%5C%5C) 
对于前景和背景的 weighting function，有一个共同的特点是 “单调递增”；也就是说，一个位置预测 pos / neg 的置信度越高，那么他们当多前景 / 背景的权重就越大。

**loss function**

Positive weights和Negative weights在训练过程中动态调整达到平衡，像是在学一个正负样本的决策边界，而根据IOU阈值来定义正负样本的决策边界是人为定义的。

![](https://www.zhihu.com/equation?tex=%5Cmathcal+%7B+L+%7D+%28+%5Ctheta+%29+%3D+-+%5Csum+_+%7B+n+%3D+1+%7D+%5E+%7B+N+%7D+%5Clog+%28+%5Csum+_+%7B+i+%5Cin+S+_+%7B+n+%7D+%7D+w+_+%7B+i+%7D+%5E+%7B+%2B+%7D+%5Cmathcal+%7B+P+%7D+_+%7B+i+%7D+%5E+%7B+%2B+%7D+%29+-+%5Csum+_+%7B+j+%5Cin+S+%7D+%5Clog+%28+w+_+%7B+j+%7D+%5E+%7B+-+%7D+%5Cmathcal+%7B+P+%7D+_+%7B+j+%7D+%5E+%7B+-+%7D+%29%5C%5C) 
**Ablation Studies**

![](https://pic2.zhimg.com/v2-a4acd3a01d8aec3be433383f20242ed7_r.jpg)
![](https://pic4.zhimg.com/v2-cbd3a534ccd2d42a41e6af0f70726d1b_r.jpg)
![](https://pic3.zhimg.com/v2-44c035c4ab4b020a66e031ee53b5f066_r.jpg)通过消融实验可以看出，引入的3个分支对检测器都有提升。

**Visualization**

![](https://pic4.zhimg.com/v2-bcc7365971b91ffe7b292c2fb4243893_r.jpg)
![](https://pic2.zhimg.com/v2-37707e4c3aad965e8374aa812b52f473_r.jpg)AutoAssign 并不显式的区分不同 FPN 层的 locations，而是全部平等地看待。因此，**只需要依靠一套 weighitng 策略，就可以同时解决 spatial 和 scale 的 assignment 问题**。 

AutoAssign另一个理解，keypoint在heatmap上分类即定位，**AutoAssign学习到的正负样本决策边界，是为了筛选出那些更加容易定位的点，分类后定位难度小。AutoAssign在动态学习真正有效的前景。**

**一些想法：**

其实早期也有很多探索label assign相关的paper，比如RPN、FPN、cascade-RCNN、IoU-Net等等，但是这些文章基本上还是在anchor先验的框架下，hand-craft的采样方式设置空间和尺度，最近出现了很多通过CNN自适应学习出适合样本的采样方式，比如GuidedAnchor、MetaAnchor、FSAF、PISA等等，但是都没有很好的解决label assign问题，还是存在一些敏感参数的设置。AutoAssign整体的设置感官上还是略显复杂，但是避免了大量超参数的设置，使得检测器更加鲁棒。 

目标检测任务是介于分类和分割之间，比起分类可以进一步定位出位置，比起分割标注更为简单，但是会不可避免的引入无关的背景信息，这就导致了目标检测器对于正负样本采样格外敏感，anchor机制的引入正是为了更好的定位目标但是不可避免的引入了label assign问题，如何定义正负样本显的格外重要，单纯的通过IOU阈值来区分正负样本过于hard，**直觉上来讲，目标检测任务的label assign应该是一种连续问题，没有真正意义上的正负样本之分，简单的根据IOU阈值定义正负样本，这样会将一个连续的label assign问题变成了一个离散的label assign问题，无法根本性解决目标检测的label assign问题。**最新的几种label assign方法本质上是将目标检测的label assign设计成连续的自适应label assign。**如何更好的学习正负样本的决策边界是关键。**期待出现比AutoAssign更加简洁的label assign的方法！

**参考：**

[poodar.chu：From VanillaDet to AutoAssign](https://zhuanlan.zhihu.com/p/158907507)

[RetinaNet](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1708.02002)

[FCOS](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1904.01355)

[FreeAnchor](https://link.zhihu.com/?target=http%3A//arxiv.org/abs/1912.02424)

[ATSS](https://link.zhihu.com/?target=http%3A//arxiv.org/abs/2006.07733)

[AutoAssign](https://link.zhihu.com/?target=http%3A//arxiv.org/abs/2007.03496)

欢迎加入Smarter交流群，添加微信**「cjy094617」**，备注**「学校-方向」**即可