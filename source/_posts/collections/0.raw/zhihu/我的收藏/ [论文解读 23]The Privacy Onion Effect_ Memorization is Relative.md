---
title: "(1 条消息) [论文解读 23]The Privacy Onion Effect: Memorization is Relative"
date: "2023-06-25 00:00:00"
updated: "2023-06-25 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/[论文解读-23]The-Privacy-Onion-Effect_-Memorization-is-Relative/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/639242511
---


最近看了一些关于大模型记忆的文章，目前来看，这个领域非常的新，而且大部分是empirical-driven的。本文是Carlini一作发表在NeurIPS的工作。

机器学习模型在训练过程中，可能会记忆训练数据，这将造成隐私泄露的风险。这种风险进一步强化了在许多情况下从模型的训练集中移除私人数据的重要性。例如，如果用户认为隐私风险过高，他们可以撤回对使用其数据进行学习的同意。这种删除操作在法律规定中已逐渐得到明确化，如《通用数据保护条例》（GDPR）或《加州消费者隐私法案》（CCPA）等。事实上，之前的工作中表示，早期的研究已经表明，训练数据的隐私保护具有高度的不均匀性：尽管大多数数据点通常得到了很好的保护，但由攻击引发的隐私泄露的风险主要集中在一小部分的data outliers上。

研究显示，移除那些最容易受到隐私攻击的训练样本，也就是最脆弱的数据，会产生一种反直觉的结果：在移除了最易受隐私攻击影响的数据，并只在先前被认为安全的数据上重新训练模型后，一组新的样本反过来会变得容易受到同样的隐私攻击。我们将这种现象称为“隐私洋葱效应”，并定义如下：

移除最容易受到隐私攻击的“层”中的 *outlier points*后，新的一层，原先被视为安全的数据点，就可能会暴露在同样的攻击之下。本文考虑了一种非常常见的隐私包含攻击：成员推断攻击。实验中表明，如果从训练样本中删除那些在成员推断中风险最大的5,000个样本，理论上，应该期望在没有任何其他影响的情况下，这种删除应该能提高整体隐私的15倍，但实际上它只增加了2倍的隐私。这就是所谓的隐私洋葱效应，它使得这种删除带来的效果低于预期的6倍以上。

并且，通过实验可以表明为：洋葱效应可能由于outliers的特性而产生。当更多极端的离群值被剔除，那些先前不算outliers的数据点就可能转变为新的outliers。

隐私的洋葱效应带来的启示有：

- 当前的隐私保护方法是不稳定的。**越来越多方法通过具体实例化的攻击方式，例如成员推断，来measure或进行用户隐私风险的审计。然而，此研究揭示了这类隐私审计的"稳定性"问题，因为用户的隐私风险可能因为少部分训练数据的移除而发生重大变化（在对抗性数据添加的场景中也有类似的现象）。而在未来，隐私审计应该随着训练数据集的改变而进行调整。
- <strong>模型遗忘可以降低其他人的隐私。</strong>拥有非常高的隐私暴露风险的用户，可能向模型训练者发出遗忘的请求。为了满足这样的请求，模型提供者可能会无意中降低其他用户的隐私暴露风险。

### 隐私洋葱效应

<strong>Notation.</strong>

$令 X=\{(x_i,y_i)\}_{i=1}^N 表示训练数据集。本文重点讨论了CIFAR-10 和CIFAR-100数据集，每个数据集有50,000个标记的训练数据。用 \mathcal{T}(X) 表示使用训练数据 X 训练出的模型分布。 X 的子集表示为 X_s = \{(x_i,y_i):i\in s\}, s\in2^{[N]} ，且 X_s \subset X 。令 \mathcal{A}(x,f) 表示成员推断攻击在模型 f 和样本 x 上的结果。比如模型 f\gets \mathcal{T}(X_s) ，成功的攻击表示为如果 x\in X_s  ，则\mathcal{A}(x,f) = 1，否则为0。$

<strong>The Likelihood Ratio Attack (LiRA)</strong>

$这是成员推断攻击里的一个概念，用来判断样本是否存在于训练数据集中。对于一个机器学习模型 f^\ast \gets \mathcal{T}(X_{s^\ast}) 。LIRA首先训很多在“shadow models”f_s \gets \mathcal{T}(X_{s}), X_s\subset X$

$比如，对于需检测的样本 x \in X ，LiRA然后计算使用x训练的模型 f_s^{\text{in}} 的logit-gap（最高logit和第二高logit之间的差异） \mathcal{L}(x,f^{\text{in}}_s) ，和没使用 x 训练的阴影模型 f_s^{\text{out}} 的logit-gap  \mathcal{L}(x,f^{\text{out}}_s) 。Logit-gaps的两个分布都被建模为单变量高斯。最后，为了预测样本x是否包含在训练集 X_{s^\ast} 的模型 f^\ast 的训练集中，LiRA计算logit-gap  \mathcal{L}(x,f^{\ast}) ，并比较上述两个高斯分布下的likehood。来判断了x是否为成员。$

<strong>Computing privacy scores</strong>

计算一个得分来衡量隐私攻击的成功率。首先在 X 的子集上固定一个分布 \mathbb{D}_X (以50%的概率独立选择每个样本 x\in X 得到的分布)。然后随机的从\mathbb{D}_X中选择一个子集， X_s \gets \mathbb{D}_X ，并训练模型 f_s \gets \mathcal{T}(X_s) ，计算一个样本x\in X的平均攻击成功率，即正确预测的概率。

$\operatorname{ASR}(x, X):=\operatorname{Pr}_{f_s \leftarrow \mathcal{T}\left(X_s\right), X_s \leftarrow \mathbb{D}_X}\left[\mathcal{A}\left(x, f_s\right)=\mathbb{1}\left[x \in X_s\right]\right] $

有时也会提到攻击成功率的，其定义为2 x ASR−1(即，成功率为50%的攻击具有优势为0)。

<strong>Plotting membership inference attack success rates</strong>

更强大的攻击表现为可视化曲线靠近图表的上方和左侧，对应于在较低的假阳性率下获得更高的真阳性率。

### 主实验

<strong>Compute a privacy score for each training example</strong>

使用LiRA成员推理攻击，首先计算训练数据集中每个样本的平均攻击成功率（ASR）。为了确保我们结果的统计有效性，我们在20万个模型上计算这个平均值。然后，我们使用LiRA在这些模型上计算原始数据集中每个样本的攻击成功率。

<strong>Remove the least private examples</strong>

之后，移除了5000个最敏感的数据。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c6f661c9a7b2.jpg)

<strong>Re-compute the privacy scores of each example</strong>

重新使用成员推断攻击计算剩下的45000个样本的ASR。

#### Result

Does removing the easy-to-attack examples significantly improve privacy? Surprisingly, we find the answer is no! <strong>移除最容易被暴露隐私的样本造成了新的样本隐私被暴露。</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_01b2105d97e7.jpg)

### Potential (Incorrect) Explanations for the Onion Effect

在本节中，探讨了各种可能解释洋葱效应的假设，但经过深入的探究，发现这些假设都无法站得住脚。由于实验的计算成本相当高昂（这主要是因为需要训练大量的模型），只针对CIFAR-10数据集进行了研究。

<strong>The Onion Effect Is Not Explained by Statistical Noise in the Privacy Metric</strong>

作者推测洋葱效应是由计算隐私评分的统计特性引起的。也就是说，当移除了那些被认为最易受攻击的样本后，一组新的样本就会因为隐私分数的高度不同而“变成”新的易受攻击的样本。然而，发现并不支持这种假设。（有一说一，这仔细一想就知道肯定不可能）

<strong>The Onion Effect Is Not Explained by the Modifified Dataset Being Smaller</strong>

证明和数据集大小无关

<strong>The Onion Effect Is Not Explained by Limited Model Capacity</strong>

证明和模型复杂程度无关

<strong>The Onion Effect Is Not Explained by Duplicates in the Training Dataset</strong>

证明和样本的 重复出现无关

### Understanding the Onion Effect

洋葱效应是由于在移除更极端的离群值后，原本的内部值变成了离群值。在这一节中，我们将提供实验证据来支持这个观点，然后会讨论这对机器遗忘的影响。

<strong>Transforming Inliers to Outliers</strong>

$实验思路也非常的简单，进行了一个实验，即在之前LiRA攻击失败的样本中，移除目标样本少数几个（附近的）训练样本，以使其成为离群点，被攻击成功。** \operatorname{PrivInF}\left(\operatorname{RemOVE}(x) \Rightarrow x^{\prime}\right):=\underset{f_s \leftarrow \mathcal{T}\left(X_s\right), X_s \leftarrow \mathbb{D}_X}{\mathbb{E}}\left[\mathcal{A}\left(x^{\prime}, f_s\right)=\mathbb{1}\left[x^{\prime} \in X_s\right] \mid x \notin X_s\right], $

就是，在没有 x 时，衡量所有模型的 x' 的成员推断平均攻击成功率。完成这些分数的计算后，删除预期目标具有最大影响的 k  个训练样本。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_029c394d60b1.jpg)

Consequences for Machine Unlearning

上述的洋葱效应，对机器学习遗忘有一些启发。

首先，本文的结果证实了先前的发现，基于成员推断的指标不应被依赖来衡量，即，审计一个模型是否已经遗忘了一个点如果依赖成员推断的指标，可能（错误地）得出一些样本不需被遗忘的结论，因为成员推断攻击对它们几乎无法成功。这可能是用户错误的认为不要求遗忘他们的数据。

另一方面，模型拥有者也可能决定某些遗忘请求无需被积极处理。然而，鉴于洋葱效应，一个当前对成员推断安全的数据点如果底层数据集发生变化，可能会变得易受攻击。这可能是由于其他用户提出遗忘请求的情况。这导致了一个矛盾：最初认为已经被遗忘的点（因为成员推断攻击在它上面失败了）可能会在后来被认为并未被完全遗忘。

上述关于PRIVINF分数的实验也揭示了一种f *adversarial unlearning*：面对一个特定训练数据点，攻击者可以自适应地选择其他训练数据点进行遗忘学习，以最大化提升对该目标个体的成员推断攻击的成功率。

### Conclusion

<strong>Membership inference attacks only audit specifific (dataset, model) tuples.</strong>

为了回答“模型是否保护隐私？”研究人员建议基于成员推理进行实证审计分析。我们的研究揭示，除非这种方法执行得极其细致，否则可能存在缺陷。任何个体隐私审计的结果应该被限制在模型的特定训练数据集中，并且应被视为在该数据集的任何变化下都是稳定的审计结果。因此，除非我们预期训练集永远不会发生改变，否则这样的审计结果可能误导从业人员相信某个模型是私有的，然而实际上，该模型在不同数据集上可能并非如此。值得注意的是，删除样本并不一定会引起洋葱效应，也就是增加对剩余数据点的隐私攻击成功率。如果被删除的样本所提出的"被投毒"样本，那么删除这些样本可能会产生相反的效果，降低攻击成功率，或者完全没有影响。在未来的工作中，研究在其他情况下删除样本时哪种效果占主导地位，将会是一个有趣的问题。

<strong>Instance-specifific privacy-enhancing strategies.</strong>

目前，防止训练数据被记忆的主要策略是修改训练算法(如保证差分隐私)。我们的工作可以看作是研究一种潜在的替代方案：修改训练数据集。

虽然 "洋葱效应 "表明，从训练数据集中删除样本的防御措施可能是无效的，但有，插入更多的离群值可能会使原先的异常值更加隐蔽。但是，仅仅只是简单的增加任意的离群数据是没用的。另外，文章中4.4节的结论也表明，重复数据点可以帮助改善这些点的隐私，但不幸的是，这种推理也是不正确的。因为，当且仅当原始例子在训练集中时，重复的样本会使成员推断更容易。这是一个有趣的开放问题，是否有可能修改训练数据集以改善隐私。
