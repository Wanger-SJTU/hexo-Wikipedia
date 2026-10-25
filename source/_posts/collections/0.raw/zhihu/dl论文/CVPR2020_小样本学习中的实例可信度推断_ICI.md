---
title: CVPR2020|小样本学习中的实例可信度推断|ICI
date: "2020-03-30 00:00:00"
updated: "2020-03-30 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/CVPR2020_小样本学习中的实例可信度推断_ICI/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/120354934
---


本文介绍复旦大学付彦伟老师课题组在CVPR2020的一篇文章：Instance Credibility Inference for Few-Shot Learning（[论文链接](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2003.11853.pdf)）。论文代码将在走完必要程序后开源（[GitHub链接](https://link.zhihu.com/?target=https%3A//github.com/Yikai-Wang/ICI-FSL)）。

文章作者：王艺楷，徐程明，刘宸，张力，付彦伟

小样本学习关注机器学习模型在极端少量样本条件下的学习能力。人类拥有基于已有知识积累和少量实例快速学习新概念的能力，受此启发，小样本学习假设模型可在某拥有大量样本的数据集（基数据集）上进行预训练，获得特征提取能力或元学习能力等，之后模型需要在与基数据集类别无交的新数据集上进行学习。大多数小样本学习模型采用N-way-m-shot的方法，即在新数据集中采样N个类别，每个类别采样m个样本构建小样本学习任务。小样本学习的目标在于在N-way-m-shot的任务下学习后，模型可在N类的分类问题中取得较好的表现。

为了缓解小样本学习中样本量过少的问题，最近研究者采用了两种方式扩增模型可获得的数据：(1)半监督小样本学习（semi-supervised few-shot learning）：在该任务中，除去 
![](https://www.zhihu.com/equation?tex=N%5Ctimes+m) 个有标签的样本外，还存在一定数量的无标签样本，模型可利用这些无标签样本辅助学习；(2)直推式推理（transductive inference）：在该任务中，模型不再每次对1个测试样本推断标签，相反，所有测试样本都是可见的，模型可在此基础上修正推断结果。

在某种程度上，两种设定都是通过在 
![](https://www.zhihu.com/equation?tex=p%5Cleft%28+x+%5Cright%29) 上增加一定信息，帮助对 
![](https://www.zhihu.com/equation?tex=p%5Cleft%28+y%5Cbig%5Cvert+x+%5Cright%29) 的建模。研究者往往采用fine-tune、数据增广、元学习等方法对该问题进行建模。本文试图从统计的角度出发，通过重新归置自学习（self-taught learning）策略，对含有无标签样本的小样本学习问题提出一种新的解决方案。

自学习是一种常见的使用无标签样本帮助模型学习的策略。简单来讲，模型在有标签样本上进行学习后，赋予无标签样本以伪标签，并利用标记有伪标签的无标签样本训练模型。然而，这些伪标签的可信度往往是要打问号的，如何剔除错误标记的样本引来的噪声，是自学习中一个重要的问题。

在统计和金融中，研究者们研究了机器学习模型中的偶发参数（incidental parameters）问题。偶发参数问题认为模型中除了存在常规的结构化参数（structured parameters）以外，还存在有数据相关的偶发参数。以线性回归模型为例，对于样本点 
![](https://www.zhihu.com/equation?tex=%5Cleft%28x_i%2Cy_i%5Cright%29) ,除去回归系数 
![](https://www.zhihu.com/equation?tex=%5Cbeta) 外，我们假设存在与该样本点相关的参数 
![](https://www.zhihu.com/equation?tex=%5Cgamma_i) ，模型表示如下:

![](https://www.zhihu.com/equation?tex=y_i%3Dx_i%5E%5Ctop%5Cbeta%2B%5Cgamma_i%2B%5Cepsilon_i) 

其中 
![](https://www.zhihu.com/equation?tex=%5Cepsilon_i) 服从均值为0的正态分布。在统计领域中，相关研究往往关注于如何解得一个更加鲁棒的 
![](https://www.zhihu.com/equation?tex=%5Cbeta) ，使得 
![](https://www.zhihu.com/equation?tex=%5Cgamma_i) 的影响降到最低[1]。与这些研究相反，本文假设当对 
![](https://www.zhihu.com/equation?tex=%5Cbeta) 的估计 
![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Cbeta%7D) 较弱时， 
![](https://www.zhihu.com/equation?tex=%5Cgamma_i) 的估计 
![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Cgamma%7D_i) 可反映该样本点的拟合难度。例如，可以将 
![](https://www.zhihu.com/equation?tex=%5Cgamma_i) 视为对线性回归模型 
![](https://www.zhihu.com/equation?tex=x_i%5E%7B%5Ctop%7D%5Cbeta) 估计的修正， 
![](https://www.zhihu.com/equation?tex=%5Cleft%5CVert%5Cgamma_i%5Cright%5CVert) 越大，回归模型对该样本的拟合程度越差。当该样本点的标签为伪标签时，可反映该样本点的可信程度。

基于此，我们构建了针对小样本学习的实例可信度推断（Instance Credibility Inference）模型。在小样本学习的推断阶段，我们利用有标签的小样本训练一个线性分类器（如逻辑回归或支持向量机），利用该线性分类器对无标签样本进行推断赋予伪标签，之后我们对有标签样本和伪标签样本构建含偶发参数的线性回归模型，并求解相关的结构化参数和偶发参数。我们的优化问题如下：

![](https://www.zhihu.com/equation?tex=%5Cleft%28%5Chat%7B%5Cbeta%7D%2C%5Chat%7B%5Cgamma%7D%5Cright%29%3D%5Cunderset%7B%5Cbeta%2C%5Cgamma%7D%7B%5Carg%5Cmin%7D%5Cleft%5CVert+Y-X%5Cbeta-%5Cgamma%5Cright%5CVert+_%7BF%7D%5E%7B2%7D%2B%5Clambda+R%5Cleft%28%5Cgamma%5Cright%29) 

其中， 
![](https://www.zhihu.com/equation?tex=Y%2CX%2C%5Cbeta%2C%5Cgamma) 均为矩阵，矩阵的每一行代表一个样本点的对应值。首先，我们求出该方程对 
![](https://www.zhihu.com/equation?tex=%5Cbeta) 的偏导，令其等于0，可得：

![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Cbeta%7D%3D%5Cleft%28X%5E%7B%5Ctop%7DX%5Cright%29%5E%7B%5Cdagger%7DX%5E%7B%5Ctop%7D%5Cleft%28Y-%5Cgamma%5Cright%29) 

**注意基于我们的假设，我们实际并不关注 
![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Cbeta%7D) 的解，同时 
![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Cbeta%7D) 也依赖于对 
![](https://www.zhihu.com/equation?tex=%5Cgamma) 的估计**，因此，我们将 
![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Cbeta%7D) 代入原问题，则现在我们要解决的问题为：

![](https://www.zhihu.com/equation?tex=%5Cunderset%7B%5Cgamma%5Cin%5Cmathbb%7BR%7D%5E%7Bn%5Ctimes+N%7D%7D%7B%5Carg%5Cmin%7D%5Cleft%5CVert+Y-H%5Cleft%28Y-%5Cgamma%5Cright%29-%5Cgamma%5Cright%5CVert+_%7BF%7D%5E%7B2%7D%2B%5Clambda+R%5Cleft%28%5Cgamma%5Cright%29) 

其中 
![](https://www.zhihu.com/equation?tex=H%3DX%5Cleft%28X%5E%7B%5Ctop%7DX%5Cright%29%5E%7B%5Cdagger%7DX%5E%7B%5Ctop%7D) 。进一步的，定义 
![](https://www.zhihu.com/equation?tex=%5Ctilde%7BX%7D%3D%5Cleft%28I-H%5Cright%29%EF%BC%8C%5Ctilde%7BY%7D%3D%5Ctilde%7BX%7DY) ，则该问题可化简为：

![](https://www.zhihu.com/equation?tex=%5Cunderset%7B%5Cgamma%5Cin%5Cmathbb%7BR%7D%5E%7Bn%5Ctimes+N%7D%7D%7B%5Carg%5Cmin%7D%5Cleft%5CVert+%5Ctilde%7BY%7D-%5Ctilde%7BX%7D%5Cgamma%5Cright%5CVert+_%7BF%7D%5E%7B2%7D%2B%5Clambda+R%5Cleft%28%5Cgamma%5Cright%29) 

这时，该问题已经变成了以 
![](https://www.zhihu.com/equation?tex=%5Cgamma) 为回归系数的线性回归模型。然而， 
![](https://www.zhihu.com/equation?tex=%5Cgamma) 的解与惩罚项的系数 
![](https://www.zhihu.com/equation?tex=%5Clambda) 相关，而对于我们所关注的问题而言，很难确定一个特定的 
![](https://www.zhihu.com/equation?tex=%5Clambda) 使得我们的解是最优的。进一步的，我们认为一个可信度较高的样本在不同的 
![](https://www.zhihu.com/equation?tex=%5Clambda) 下解的鲁棒性应该更好。因此，我们采用Glmnet[2]实现的算法来求解该问题的解路径。

直观的讲，我们可以将问题中的 
![](https://www.zhihu.com/equation?tex=%5Cgamma) 当作是 
![](https://www.zhihu.com/equation?tex=%5Clambda) 的函数，当 
![](https://www.zhihu.com/equation?tex=%5Clambda%3D0) 时，所有的 
![](https://www.zhihu.com/equation?tex=%5Cgamma) 都是非零的，随着 
![](https://www.zhihu.com/equation?tex=%5Clambda) 的增加， 
![](https://www.zhihu.com/equation?tex=%5Cgamma) 逐渐减小，当 
![](https://www.zhihu.com/equation?tex=%5Clambda%3D%5Cinfty) 时， 
![](https://www.zhihu.com/equation?tex=%5Cgamma) 的所有项都是0。记得我们最初关于 
![](https://www.zhihu.com/equation?tex=%5Cgamma) 的假设，在这个过程中当某一项 
![](https://www.zhihu.com/equation?tex=%5Cgamma_i) 更先变为0，说明我们比较弱的线性回归模型就可以拟合该样本点，那么这个样本点的可信程度就更高。我们设置惩罚项 
![](https://www.zhihu.com/equation?tex=R%5Cleft%28%5Cgamma%5Cright%29%3D%5Csum_%7Bi%3D1%7D%5E%7Bn%7D%5Cleft%5CVert+%5Cgamma_%7Bi%7D%5Cright%5CVert+_%7B2%7D) 使得 
![](https://www.zhihu.com/equation?tex=%5Cgamma) 以每一行，即每一个样本点衰减。因此，我们可以根据 
![](https://www.zhihu.com/equation?tex=%5Cgamma_i) 变为0时对应的 
![](https://www.zhihu.com/equation?tex=%5Clambda) 值对所有的伪标签样本进行排序，并从中选取最可信的子集与我们的有标签样本集合一起重新训练我们的线性分类器。一个简单的例子如下：

![](https://pic4.zhimg.com/v2-59e6c3c990be98b69bcb7ce755fb71e3_r.jpg)γ关于λ的解路径，随着λ的增大，γ的norm逐渐减小，直到为0，我们认为最先减小为0（红色）的样本最可信，因为一个很弱的线性回归模型就能拟合该样本点。我们重复该过程直到所有无标签样本都被选中，此时所有的无标签样本的伪标签都已经唯一确定。

我们在四个小样本学习的数据集上进行了实验，结果如下：

![](https://picx.zhimg.com/v2-46cf753528800385db8ab4bed88fd475_r.jpg)关于模型的更多细节，请阅读我们的文章。对于该模型，还有很多比较有趣的地方，在CVPR之后我们做了进一步的探索，并有了一定的结果，希望可以尽快与大家分享。