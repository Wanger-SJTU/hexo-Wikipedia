---
title: "DPO as Verifier"
date: "2024-02-18 00:00:00"
updated: "2024-02-18 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/LLM-SD/DPO-as-Verifier/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/682365020"
---


当我们讨论alignment的时候，不管使用PPO还是其他offline-alignment如DPO，都绕不过如何训练一个鲁棒的打分函数。近期，google等发表了一篇《V-STaR: Training Verifiers for Self-Taught Reasoners》文章，讨论了self-play在数学问题上的应用。其中，提到了一个有趣的观点：使用DPO训练的policy是一个更好的Verifier，在self-play中可以更好的选择样本，让weak-model逐步增强。本文，就笔者在MCTS-EBM中的补充实验以及基于V-STaR的一些初步实践，验证‘DPO as Verifier’的有效性以及DPO等方法在数学问题上应用的问题以及一些可行解决方法。

### V-STaR

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_06e80a3d8e2e.jpg)

V-STaR是google近期提出的一个self-play的方法。其核心流程如上图所示：

- 使用SFT数据训练一个policy并产生一系列response，并根据sft训练集，对模型新产生的样本过滤（只保留正确答案的response用于迭代policy）
- 上一步产生的答案不正确的样本与答案正确的样本构造preference-dataset，用于DPO训练
- 推理阶段，采样多次并应用DPO训练得到的policy作为verifier，对模型输出的样本排序，选择最好的样本作为输出。
$$本文的一个亮点是使用DPO产出的policy，作为一个verifier: log⁡pdpopsft" role="presentation">log⁡pdpopsft\log \frac{p_{\text{dpo}}}{p_{\text{sft}}} ，可以用于对TOP-K样本排序。$$

除了self-play本身取得较好的效果外，本文额外验证（也是笔者之前想做但拖着一直未动手的实验）了DPO在数学/code上的可行性：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_e4a9ca165e03.jpg)

从Figure7中可以看到，在gsm8k（相对简单的数学数据集上），当我们使用DPO后，pass@1的效果存在很大的degradation（即使仅迭代了2k-steps）。相比之下，DPO在通用场景取得了很多LLM-Leadboard上排名较为靠前的结果。也测向说明，DPO等方法在一些数学、code场景，对模型性能存在负向增强的效果。而在这些场景，token-level的对齐方法如PPO等则更为适用。

### 我们的实践

在之前的工作中，我们提出了使用能量模型+MCTS的方法，提升数学推理能力。在底座为Llama2的实验上有些比较好的结果[2]。我们自然也希望该方法能在更强的基座如Mistral、MetaMath-Mistral、DeepSeek-Math上面也能有同样的效果提升。参考之前的经验，我们完成了以下流程：

- 使用SFT训练好的模型如MetaMath-Mistral、DeepSeek-Math-Instruct采样样本（MetaMath作为训练集），纯response采样以及partial-path采样（保留golden-response的前k个句子，采样生成后面的句子）；
- 使用NCE训练能量模型；
- 使用能量模型作为verifier，指导MCTS的搜索过程。
由于Math等数据集的response较长，且我们想验证能量模型的尺寸对树搜索的影响，故使用了qwen-1.5系列的0.5B、1.8B、4B、7B、72B作为基座模型，验证reward-scale-law（但受限于资源和人力，我们目前只完成了0.5B、1.8B和Mistral-7B的结果）。

best-of-N: 用verifier模型打分，从N个response里面选择得分最高的

top-N: N个response里面只要有一个正确即算作正确（best-of-N的上限）

这里，best-of-N， top-N均在mistral-metamath-7B的采样结果验证

#### GSM8k

模型best-of-N(N=10)TOP-NMCTSGreedy训练方法qwen-0.5B0.77170.9360.77330.778NCEqwen-0.5B0.77480.9360.778Rewardqwen-1.8B0.77020.9360.778NCEqwen-7B0.76570.9360.778NCE上表可以看出，使用SFT+模型采样构造的noise-sample，可以训练reward（（gold-response，noise-response））或者使用NCE训练能量模型。从0.5B的模型上，这两者的效果没有特别大的差异。由于best-of-N仅能得到和greedy采样类似的效果，MCTS+能量模型也未能取得更好的效果。而在[2]中，best-of-N可以提升5-6 个点，应用在MCTS上，则还可以提升5-6个点。当我们考虑ORM作为MCTS的verifier时，best-of-N的指标对MCTS有较为重要的指导意义。

#### MATH

模型best-of-N(N=10)TOP-NMCTSGreedy训练方法qwen-0.5B0.22010.550.28NCEqwen-0.5B0.28040.550.28Rewardqwen-1.8B0.27120.550.28NCEqwen-7B0.27460.550.28NCE从MATH和gsm8k上，reward方法训练的模型总体上比nce训练的能量函数泛化性更好一些。NCE在模型参数增加时，best-of-N的效果总体上没有提升（也是比较迷惑的一个现象）。由于时间和资源，reward模型并没有验证不同的model-scale的效果。

然而，我们可以看到，NCE训练的能量模型在model-scale上，并没有取得更好的打分效果，也导致使用更复杂的树搜索效果也无法更近一步。

#### DPO-Verifier

参考V-STaR，同时，我们也想验证DPO对数学推理问题的提升，我们跑了以下实验且保持超参数不变。

模型best-of-N(N=10)dposftTOP-Ndatasetqwen-0.5B-dpo0.79450.26990.3870.936gsm8kqwen-1.8B-dpo0.80280.04320.4970.936gsm8kmistral-7B-dpo0.84760.36610.7780.936gsm8kqwen-0.5B-dpo0.30200.1080.55MATHqwen-1.8B-dpo0.31140.55MATHmistral-7B-dpo0.32380.04080.280.55MATH与V-STaR结论类似，DPO微调后，生成式的效果(pass@1)直线下降（且早期迭代1-2k-steps就下降到很低的水准）。一个原因是 DPO微调后，破坏了输出格式，导致评估函数无法正确解析答案，甚至会出现如下答案。

SFTDPOJanet's ducks lay 16 eggs per day.\nShe eats three for breakfast every morning, so she has 16 - 3 = 13 eggs left.\nShe bakes muffins for her friends every day with four eggs, so she has 13 - 4 = 9 eggs left.\nShe sells the remainder at the farmers' market daily for $2 per fresh duck egg.\nSo, she makes 9 * $2 = $18 every day at the farmers' market.\n#### 18\nThe answer is: 18"Janet's ducks lay a total of 16 eggs per day. \nShe eats 3 eggs for breakfast and bakes muffins with another 4 eggs, so she uses a total of 3+4= 7 eggs per day. \nThe remaining eggs she can sell at the farmers' market is 16-7= 9 eggs. \nShe sells each egg for $2, so she makes 9 x $2 = $18 per day. \nJanet makes $18 in profit every day from selling the extra duck eggs at the farmers' market. \n#### 18\nThe answer can not be determined而DPO作为verifier，则可以比较好地符合scaling-law即模型参数越大，dpo-verifier的best-of-N会有持续的提升。而且，DPO的数据集完全从SFT-dataset构建 即 模型采样且答案不正确的样本作为负样本（或者增加随机性，模型采样结果全为不正确样本），在SFT模型的基础上，DPO微调一定steps即可。

在DPO-Verifier的基础上，可以与SFT流程形成一个更好的self-play 即 用dpo-verifier的得分+rejection-sampling[3] 构建更好的preference-datasets。

### 总结

本文简要介绍了V-STaR的流程以及文章里面的一些有趣的实验结果。并在qwen-1.5的不同model-scale上做了一些初步实验。实验表明，verifier对mcts/树搜索的影响较大，如果verifier不能提升best-of-N的效果，树搜索基本也不会有明显提升。而使用reward-trainer或者nce-trainer则可能效果相当，没有特别大的差距。

DPO在数学推理任务上，存在性能degradation的现象，一个原因是DPO没有token-level的监督，导致数学、code等具备一定强格式要求的场景，会出现格式不对齐等问题，导致评估性能下降。而在通用问答场景，则可以提升效果。当然，在DPO的基础上加入sft-loss也是一种缓解问题的选项，但在笔者的初步实验中，并没有特别多的作用（在已经经过sft微调的模型上加入sft-loss，一般会加剧过拟合，导致模型性能下降）。

最重要的一个点是：DPO-Verifier。相比reward-trainer或者nce-trainer，DPO训练后的policy，是一个很好的vertifier，在多个模型尺寸、数学数据集上，都比同尺寸的reward-trainer、nce-trainer好很多，且在sft模型能力更强后，DPO-verifier也会更强，是self-play里面verifier的首选，而且，如果dpo-policy能提升任务效果，也是一举多得。

目前的self-play都在比较弱的模型上开展，而在更强的模型如metamath-mistral、deepseek-math等垂直领域的强基线上则没有更多的实践。从V-STaR的结果来看，可能其上限 并没有达到metamath-mistral的效果，该方法能否在metamath-mistral-7B上得到提升也是一个比较重要的问题：毕竟，从0到60分相对容易，从60分到80分甚至90分则更难。得到60分不需要self-play这么复杂的流程，做好数据增强和数据构造即可实现（比如metamath的数据集构造过程）。而从60分到80分，可能需要更多的精细化过程。

### 参考文献

[1] V-STaR: Training Verifiers for Self-Taught Reasoners

[2] [皓天：EBM-based Global Rank+MCTS for COT](https://zhuanlan.zhihu.com/p/650438958)

[3] STATISTICAL REJECTION SAMPLING IMPROVES PREFERENCE OPTIMIZATION
