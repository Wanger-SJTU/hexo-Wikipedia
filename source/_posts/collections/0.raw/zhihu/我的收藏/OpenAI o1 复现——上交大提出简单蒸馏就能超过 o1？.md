---
title: (2 条消息) OpenAI o1 复现——上交大提出简单蒸馏就能超过 o1？
date: "2025-09-27 00:00:00"
updated: "2025-09-27 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/OpenAI-o1-复现——上交大提出简单蒸馏就能超过-o1/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/10180139030
---


打个小广告 ☻，知乎专栏<strong>《大模型前沿应用》</strong>的内容已经收录在新书<strong>《揭秘大模型：从原理到实战》</strong>中。感兴趣的朋友可以购买，多谢支持！♥♥

[![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_33b7de100ccc.jpg)广告

揭秘大模型：从原理到实战

京东

¥39.90

去购买​

](https://union-click.jd.com/jdc?e=jdext-1955201309570470445-0-1&p=JF8BAUsJK1olXwIEU15fCE4VBV8IHlIdXwEKU24ZVxNJXF9RXh5UHw0cSgYYXBcIWDoXSQVJQwYHXVZfD0MQHDZNRwYlD3EFVAgOADJyWDt1XjpzFHkcPRY4aEcbM28BG1kdXAcCU11tCEoWA2sNGFgTXDYyVFttWiXPtdnQvuoJiayNgdbKOEonA2kMElMXWgQCXV5dC3sXC2s4zfWBiI69je743uG51uK4ztK-ibiEZG5tC3tMVjtBXkcVVQIGV19dCkofB2kJHl0UWAMGSF9BCHsUAm0NGFIdWAEEOltdCUsUAm8KElp7XwYDVVdZDkoRA18IK1glA2gDU1pZCk8VVwFUTVtIVUcGAzBUDk0QBW8JK1kUXAQAZG5tVh12cBlQU1xWXERUIis0dBh0fhxoHyhPMwRBEQwgfCtUaiwAEwVoKFFfJ25YOEsRA204)

随着 OpenAI o1 的发布，推理能力的巨大提升立即吸引了业界的广泛关注，国内迅速掀起了一股复现 o1 的热潮。目前，国内已经有大量团队在复现 o1，以下是几个具有代表性的团队：

模型所属公司是否开源性能（公司宣传的结果）k0-mathKimi闭源在MATH、中考、高考、考研4个数学基准测试中，k0-math成绩超过o1-mini和o1-previewDeepSeek-R1-Lite-PreviewDeepSeek闭源在AIME24、MATH评测中超过o1-preview和o1-miniSkywork o1 Preview昆仑万维闭源Skywork-o1-Open-Llama-3.1-8B昆仑万维开源同大小模型中的 SOTAQWQ-32B-preview阿里同义千问开源性能和 o1-preview、o1-preview 相当，陶哲轩背书Marco-o1-7B阿里国际数字商业集团开源MGSM-en数据上，超过 Qwen2-7B-Instruct虽然上面的几家公司都宣称成功复现了 o1，但是最多也只是开源了模型，关于技术细节是闭口不谈。除了上面这些公司，上海交通大学的 GAIR 团队最近也宣称成功复现了 o1 的效果，甚至超过了 o1-preview。接下来我们就来一探究竟。

O1-Journey 是上交大 GAIR 团队复现 OpenAI o1 的工作。

由于上交大 GAIR 关于 o1 的复现，即没有开源模型，也没有技术细节，所以最开始我个人没怎么关注。但是看了他们的复现结果，号称：

- 通过 327 <strong>条训练样本，就可以提升</strong> 8% 以上，相对性能提升超过 20%**
- 最新工作，已经<strong>超过 o1-preview 和 o1-mini</strong>
这么炸裂！即使没有开源模型，那也必须得看看他们的技术报告，是不是真的有啥“秘密武器”。

模型AIME24 准确率AIME24  token数MATH500 准确率MATH500 token数o1-preview40.0%908385.5%1501o1-mini70.0%990390.0%944上交大 O1-Journey43.3%801687.2%2235备注：表格中的 token 数表示模型回答的平均 token 数

### 一阶段：旅程学习（Journey Learning）

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_395315df39c2.jpg)

图1：上交大o1复现一阶段提出了“<strong>旅程学习</strong>”范式，鼓励模型不仅学习捷径，而且学习完整的探索过程，包括试错、反思和回溯。仅使用 <strong>327 个训练样本</strong>，在没有使用任何额外的技巧情况下，"<strong>旅程学习</strong>"在 MATH 数据集上绝对性能就超过了 SFT <strong>8%</strong>以上，相对性能提升超过 <strong>20%</strong>。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a80595984ed3.jpg)

图2：&quot;旅程学习&quot; 在MATH500上的效果
#### 1.1 什么是"旅程学习"？

按照技术报告的说法，"<strong>旅程学习</strong>" 旨在使人工智能系统能够通过学习、反思、回溯和适应不断进步，就像人类一样，从而展现出更高水平的智能。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7420283604b1.jpg)

图3：从“捷径学习”到“旅程学习”的范式转变从图3可以看出，这是一个用于推理任务的搜索树。对于数学问题解决任务，根节点代表初始问题，而叶节点则是最终结论。绿色节点表示正确答案，红色节点表示错误答案。传统上，学习主要集中在对直接从根到叶的捷径路径进行监督训练。然而，"<strong>旅程学习</strong>" 探索了<strong>对整个探索路径进行监督学习，这包括了试错和纠正的过程</strong>。

技术报告中提到，大多数现有的机器学习或大型语言模型训练方法（例如，有监督微调）都可以被归类为 <strong>"捷径学习" (Shortcut Learning)</strong>。这种传统范式，虽然可能在特定、定义明确的任务中有效，但在面对复杂、动态和开放式问题时会有明显的局限性。捷径学习有以下几个明显特点：

- 快速结果导向：它强调在短时间内实现特定的性能指标或完成特定的任务；
- 高度依赖数据：性能提升通常依赖于增加训练数据量，而不是提升学习算法本身；
- 泛化能力有限：在训练数据分布之外的场景中，性能可能会显著下降；
- 缺乏自我纠正能力（反思能力）：这些系统通常缺乏识别和纠正自身错误的能力。
基于此，上交大的 GAIR 团队提出了一种名为<strong>"旅程学习"（Journey Learning)</strong>的新范式。希望通过<strong>旅程学习</strong>大模型能够具备自我反思、自我纠错的能力。

#### 1.2 "旅程学习"的工作原理

<strong>1.2.1 o1 长思维的特点</strong>

技术报告中提到：<strong>随着难度的增加，响应长度往往成比例增长。这表明，难度更高的问题涉及更多的推理步骤。</strong>

根据对 o1 在解决数学问题时所采用的推理过程进行分析，对于需要构建的<strong>长思维链</strong>数据应该具有以下特征：

- <strong>迭代式解决问题</strong>：模型首先定义函数，然后逐步探索相关表达式，将复杂方程分解为更简单的组成部分，反映了一种结构化和有条理的方法。 
- <strong>关键思维指标</strong>：使用 "Therefore" 表示结论，"Alternatively" 探索不同路径，"Wait" 表示反思，以及 "Let me compute" 过渡到计算，突出了模型的推理阶段。 
- <strong>递归和反思方法</strong>：模型经常重新评估和验证中间结果，使用递归结构确保一致性，这在严谨的数学推理中很典型。 
- <strong>假设探索</strong>：模型测试不同的假设，随着获得更多信息而调整其方法，展示了推理过程中的灵活性。
- <strong>结论和验证</strong>：最后，模型解方程并验证结果，强调在完成之前验证结论的重要性。
<strong>1.2.2 长思维是如何工作的？</strong>

技术报告中提到，<strong>o1 长思维方法的显著成功可以归因于在上述中介绍的"旅程学习"</strong>。与传统的捷径学习不同，<strong>旅程学习</strong>允许模型探索<strong>整个决策轨迹</strong>，模仿人类的问题解决过程。这种全面的探索使 o1 能够考虑<strong>多种解决方案路径，从错误中学习，并理解完整的问题解决过程</strong>。

通过经历正确和错误的路径，模型发展出强大的<strong>错误处理</strong>和<strong>自我纠正能力</strong>。<strong>旅程学习</strong>过程模拟人类的认知过程，包含试错、反思和调整。这大大增加了模型输出内容的可解释性，因为 o1 可以提供详细的解决步骤并解释其推理过程，包括如何从错误中恢复。

<strong>1.2.3 如何构建长思维？</strong>

技术报告中给出了 4 种构建长思维的方法，目前的<strong>"旅程学习"是</strong>基于第一种方法：<strong>基于 LLM 和奖励的树搜索。</strong>

长思维最显著的特征是在推理产生错误时或遇到冗余的推理步骤时尝试反思和回溯。这类似于在推理树上搜索问题的解决方案，在错误节点处回溯，直到找到正确的解决路径。为实现这一点，需要构建一棵推理树，其中根节点代表问题，其他每个节点代表一个推理步骤。从根到任何节点的路径代表从问题到该结论的推理过程。此外，回溯和反思必须基于错误的推理步骤，这需要一个<strong>更细粒度的奖励模型（即过程级）</strong>来指示树中每个节点的正确性。通过在具有过程级奖励的推理树上执行搜索算法，可以将错误步骤整合到思维链中，从而构建包含回溯和反思等行为的长思维。

<strong>1.2.4 如何构建过程级奖励模型？</strong>

在上一篇文章中，我们介绍了如何训练一个[过程级奖励模型 PRM](https://zhuanlan.zhihu.com/p/1246547399)。而在对比效果后，上交大最后直接选择了使用 <strong>o1-mini 作为 PRM</strong>。

模型F1 scoreo1-mini0.855GPT-4o-mini0.722Math-shepherd0.734ReasonEval-7B0.728ReasonEval-34B0.735<strong>1.2.5 如何构建 on-policy 推理树？</strong>

构建推理树需要一个能够执行单步推理的策略模型 \pi 。给定一个问题 q 及其相应的最终答案 a ， \pi 从问题作为根节点开始，不断向树中添加新节点。它首先生成 w 个可能的第1步推理步骤，作为根节点的子节点。然后，它迭代地进行前向推理，为每个当前节点（如第1步推理）生成 w 个可能的后续推理步骤，作为该节点的子节点。这个过程不断重复，直到达到预设的最大深度 D 或所有叶节点达到最终答案。

<strong>策略模型和步骤分割：</strong>构建推理树需要明确定义推理步骤。为此，团队采用 Abel 提出的数据格式，将数学问题的解答转化为具有明确步骤的形式，将答案分成多行，每行以行号开始，并包含该行内的推理。因此，使用 Abel 数据集对 DeepSeekMath-7B-Base 进行微调，得到 Abel-DSMath，作为策略模型 \pi 。在这种特定格式数据上微调的模型可以方便地控制单个推理步骤的生成。

<strong>奖励模型和剪枝：</strong>上述提出的树生成算法计算成本高昂。当 w=3 且 D=10 时，最后一次迭代需要生成 3^{10} 个推理步骤。因此，需要使用奖励模型来剪除错误的推理步骤，提高操作效率。具体来说，团队采用<strong>束搜索</strong>，在每次迭代中只选择少量候选项保留到下一轮。根据使用的奖励模型，剪枝实现的细节有所不同。团队尝试了两个奖励模型：math-shepherd 和 o1-mini。

Math-shepherd 为每个步骤提供一个介于 0 和 1 之间的实数，表示当前步骤正确的概率。在每轮树生成迭代中，对所有推理步骤进行评分，并选择得分最高的前 K 个步骤进入下一轮迭代。这使得总生成次数从 n^{D-1} 减少到 n^KD 。然而，math-shepherd 在评估困难问题的推理步骤时存在困难，<strong>需要一个更强大的奖励模型，能够为每个步骤提供高准确度的正确性指示</strong>。因此，<strong>最终使用 o1-mini 为每个步骤提供奖励</strong>，直接指示每个推理步骤是否正确。此时，在树生成的每次迭代中，利用来自 o1-mini 的奖励，选择最多 K 个正确的推理步骤进入下一次迭代。

<strong>备注：</strong>如果是数据少，可以使用 o1-mini 作为 PRM，但是如果数据量是几十万，那么使用 o1-mini 的成本就太高了。所以还是需要训练一个好的 PRM。

<strong>1.2.6 如何从推理树中推导出长思维？</strong>

一旦推理树构建完成，目标就变为根据树推导出一个包含试错过程的长思考。推理树的每个节点都被奖励模型标注，指示该步骤是否正确。

- <strong>从推理树构建捷径：</strong>首先从推理树构建<strong>捷径</strong>，其中只包括正确答案和有效的中间步骤。从代表问题的根节点开始，找出通向正确答案叶节点的路径。如果有多个正确答案节点，则建立多条正确路径。
- <strong>遍历推理树：</strong>为了得到<strong>长思维</strong>，采用深度优先搜索（DFS）遍历树。这种遍历按 DFS 顺序构建路径，记录从根问题节点到正确答案叶节点的每一步，<strong>同时包括任何被标记为错误的节点的推理</strong>。DFS 的挑战在于它探索了庞大的搜索空间，产生了大量可能无法得到正确解决方案的试错路径。为了简化这一初始探索，可以使用约束来缓解复杂性。根据节点是否位于正确路径（即捷径）上来标记树中的所有节点。遍历遵循以下规则： 

- 正确路径上的节点：DFS 遇到正确路径上的节点时，它可能会探索导致错误结果的子节点，从而模拟试错的过程。一旦这个节点到达叶节点并被确定为错误，算法就会回溯并切换到正确的路径继续遍历。 
- 不在正确路径上的节点：随机选择一个子节点进行探索，并不产生试错的分支。

为进一步简化过程，应用了一个额外的约束：<strong>正确路径上的每个节点最多允许</strong>K<strong>次试错</strong>，一次在错误路径上的试错和一次在正确路径上的探索。 这些约束确保 DFS 遍历专注有意义的试错探索，同时避免过度探索错误路径。在未来的实验中，计划移除或调整这些约束，以研究<strong>试错路径长度与最终模型性能之间的关系</strong>。

- <strong>从遍历路径得到长思维：</strong>生成遍历路径并将推理附加到错误节点后，通过连接路径中的所有步骤来构建长思维，其中还包含了每个错误步骤的推理。然而，初步实验表明，使用这个形式的长思维数据来训练模型的性能不佳。为解决这个问题，团队尝试使用 GPT-4o 来修改草稿。GPT-4o 在保留所有推理步骤（包括错误步骤、反思和修正）的同时，增强了思维过程的连贯性和流畅性。这种方法确保最终的长思维不仅准确，而且自然流畅，模拟了包含正确和错误步骤的人类问题解决过程。

#### 1.3 如何评估"旅程学习"效果？

除了在基准测试中使用特定的评估指标来测试准确性得分，人工审查实际案例是评估数据和模型的关键步骤。因此，为了提供一种更直观的方法来评估模型在特定问题上的性能，团队使用 Streamlit 构建了一个可视化数据分析平台。

具体来说，可视化平台包括合成树及其相应长思维的可视化，以及训练模型的输出。此外，在可视化结果时，平台支持详细的条件过滤，例如过滤正确或错误回答的问题，或者输出是否包含表示反思或犹豫的关键词（例如，“wait”）。此外，平台支持合成数据和模型输出之间的比较，这样可以轻松验证新一批数据或模型是否有效。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_91507cd0ad8e.jpg)

图4：可视化分析平台
#### 1.4 如何训练模型？

使用 deepseek-math-7b-base 作为基座模型，训练过程分为两个主要阶段：SFT 和 DPO。

<strong>第一阶段：SFT</strong>

SFT 过程包括两个阶段：

- <strong>快捷学习</strong>：在这个阶段，专注于使用只包含正确中间步骤和最终正确答案的响应来微调模型。在 Abel 数据集（12w）和 PRM800K 数据集上进行微调。对于 PRM800K 中的每个问题，使用单个正确的逐步解决方案，丢弃不导向最终答案的回复。在这个阶段，对每个数据集进行一个 epoch 的微调，主要目的是让模型熟悉所需的响应格式。
- <strong>旅程学习</strong>：在第二阶段，使用构建的长思维（<strong>包含 327 个样本</strong>）进一步微调 SFT 模型。这个阶段旨在增强模型发现错误、自我反思、自我修正和执行回溯的能力。通过在合成的包含试错、反思的长思维数据上训练，加强模型对更长推理链的理解。为了比较，团队还在从同一推理树生成的相应捷径上微调模型（<strong>同样是 327 个样本</strong>），从而更直观的比较旅程学习相比捷径学习所带来的增益。
<strong>第二阶段：DPO</strong>

在这个阶段，使用核采样（top_p = 0.95 和温度 T = 0.7）从 MATH Train 数据集为每个问题生成 20 个回复。这 20 个回复根据最终答案的正确性分类为正面和负面响应。从中，随机选择 5 个正面响应和 5 个负面响应来创建 5 个 pair。然后，使用这些偏好对进行 DPO 训练。

#### 1.5 实验结果

实验结果如下所示。所有结果都在 MATH-test 上进行测试，使用的是重新划分的 PRM800K 子集，其中包括 500个示例。

deepseek-sft-abeldeepseek-sft-prm800kSFT-phase10.3720.290SFT-phase2-shortcutLearning0.3860.348SFT-phase2-journeyLearining0.4700.428DPO0.4720.440结果显示，与捷径学习相比，"<strong>旅程学习</strong>" 取得了显著的改进，在 deepseek-sft-abel 和 deepseek-sft-prm800k 模型上分别提升了 <strong>8%</strong>和 <strong>8.4%</strong>。

<strong>327 条数据长啥样？</strong>

仅仅是把 327 条正常回答替换为新的长思维数据，就能取得 8% 的提升，那我们就来看一下这 327 条数据新构建的回答长什么样。

问题1：一个顶点在 A(1, 1) ，另一个顶点在 B\left( 6,1 \right) ，第三个顶点在 C\left( 3,7 \right) 的三角形的面积是多少平方单位？

长思维回答：

让我们来探讨如何求出顶点为 A(1, 1) 、 B\left( 6,1 \right) 和 C\left( 3,7 \right) 的三角形的面积。
首先，我们使用给定顶点 A\left( x_1,y_1 \right) 、 B\left( x_2,y_2 \right) 和 C\left( x_3,y_3 \right) 的三角形面积公式。公式如下：

$$ \text{面积} = \frac{1}{2} |x_1(y_2-y_3) + x_2(y_3-y_1) + x_3(y_1-y_2)| $$

现在，将顶点的坐标代入这个公式。对于我们的三角形，顶点分别是 A\left( 1,1 \right)、 B\left( 6,1 \right) 和 C\left( 3,7 \right) ，代入公式得到：

$$ \text{面积} = \frac{1}{2} |1(1-7) + 6(7-1) + 3(1-1)| $$

让我们暂停并仔细计算每一项。第一项是  1(1-7)  ，简化为 $ 1 \times (-6) = -6 $ 。
第二项是 6(7-1) ，简化为 6 \times 6 = 36  。
第三项是   3(1-1)  ，简化为 $ 3 \times 0 = 0 $ 。
将所有项加在一起，我们得到：

$$ \text{面积} = \frac{1}{2} |-6 + 36 + 0| $$

现在，我们计算绝对值内部的表达式：

$$ -6 + 36 + 0 = 30 $$

因此，面积为：

$$ \text{面积} = \frac{1}{2} \times 30 = 15 $$

让我们花点时间复查并确保所有计算正确。整个过程是正确的，方法也一致。因此，三角形的面积是  \boxed{15} 平方单位。计算过程确实更加详细了。但是这个例子没有纠错和自我反思的过程，我们再看一个有纠错和自我反思的例子**。

问题2：将圆柱体的半径增加 6 个单位使体积增加了 y 立方单位。将圆柱体的高度增加 6 个单位也使体积增加了 y 立方单位。如果原始高度是 2，那么原始半径是多少？

长思维回答：

让我们一步一步地解决这个问题，记录我们的推理过程以及在过程中需要做的任何调整。
我们有一个关于圆柱体的问题，其中将半径增加6个单位和将高度增加6个单位都会导致体积增加 y 立方单位。我们的目标是找到圆柱体的原始半径，已知原始高度为2。
首先，让我们使用圆柱体体积的公式 V = \pi r^2 h  来建立初始方程。我们假设原始半径为 r ，高度为 2。因此，原始体积为 V = \pi r^2 \times 2  。
现在，当半径增加6个单位时，新体积变为 V' = \pi (r+6)^2 \times 2  。我们知道这导致体积增加了 y 立方单位，因此：

$$ \pi (r+6)^2 \times 2 = \pi r^2 \times 2 + y $$

在这一点上，我意识到之前错误地认为增加半径会导致体积增加36倍。让我们纠正这一点。<strong>变化是加法的，我们应该正确展开 (r+6)^2 。</strong>现在，让我们考虑将高度增加6个单位。新体积为 V'' = \pi r^2 \times (2+6)  。这也导致体积增加了 y 立方单位，因此：
...我们发现，回答中确实包含了纠错，但是指出的错误莫名其妙，“在这一点上，我意识到之前错误地认为增加半径会导致体积增加36倍**”，但是前面的过程并没有增加 36 倍的结论。

我们再看一个：

问题3：正六边形的对角线有两种可能的长度。较短长度与较长长度的比率是多少？
长思维回答：

> 让我们探讨在正六边形中较短对角线与较长对角线的比率问题。
首先，我们将正六边形可视化，并连接相对的顶点以形成对角线。这些对角线将在六边形内形成两种类型的等腰三角形。
现在，假设六边形的边长为 s ，我们将对角线的长度记为 d 。
最初，我认为在正六边形中较长对角线与较短对角线的比率可能是 <strong>1 + \sqrt{3}</strong> 。但是，等一下，让我们仔细检查一下。****在边长为 s 的正六边形中，较长的对角线实际上是 2s ，而较短的对角线是 s\sqrt{3} 。所以，正确的比率应该是：

$$ \frac{\text{较长对角线}}{\text{较短对角线}} = \frac{2s}{s\sqrt{3}} = \frac{2}{\sqrt{3}} = \frac{2\sqrt{3}}{3} $$

嗯，这显然与我最初认为的 <strong>1 + \sqrt{3}</strong> 相矛盾。让我们继续看看能否解决这个问题。****...

和上面的问题一样，回答中找出的错误根本不存在。前面并没有计算出 1+\sqrt{3} 的过程，而纠错位置却硬造出一个错误。

目前看上交大开源的这份包含 327 条示例的长思维数据是有问题的，回答中找出的错误根本不存在。

### 二阶段：知识蒸馏

上面介绍了上交大 GAIR 团队一阶段的工作，时间是在 10 月 8 号。主要是<strong>基于树搜索和过程奖励模型，构建具有自我反思、自我纠错的长思维数据，然后基于这份数据进行 SFT</strong>。但是很遗憾，最重要的部分，那份包含 327 条示例就能提升 8% 的数据，明显是有问题的。

而在 11 月 22 号，上交大 GAIR 团队放出了[第二份技术报告](https://link.zhihu.com/?target=https%3A//github.com/GAIR-NLP/O1-Journey/blob/main/resource/report-part2.pdf)，<strong>通过简单的知识蒸馏方法，就能使模型在数学推理能力上超越 o1-preview</strong>。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ee608b24918b.jpg)

图5：上交大o1复现二阶段使用 Qwen2.5-Math-72B 作为基座模型，经过精心设计的数据筛选和处理流程，<strong>仅使用数万个从 o1 蒸馏的长思维链</strong>样本进行训练。在美国高中数学邀请赛 (AIME) 等权威测试中，模型表现就能优于 o1-preview。

#### 2.1 o1 复现的捷径

在上交大 GAIR 团队复现的第一部分中，提出了一种合成长思维过程的新方法，称为“<strong>旅程学习</strong>”。该方法利用树搜索来构建长思维链数据。在整个技术路线中，最为关键的一个环节是如何构建长思维链数据，这种长思维数据需要体现 “深度” 的思考，包含反思、纠错和回溯步骤。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_99ab3ce4c115.jpg)

图6：旅程学习框架虽然树搜索是最有效的方法之一，但它可能会耗费大量计算资源和时间。除了树搜索之外，合成长推理链的其他替代方法如下图所示。这些方法在计算效率和推理完整性之间提供了不同的权衡。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d4b287780af8.jpg)

图7：生成长思维链数据的不同方法（代价从低到高）<strong>方法一：完整的人类思维过程标注（代价最高）</strong>

人类解决问题很少遵循一条线性路径走向成功或失败。相反，人们在遇到障碍时往往会暂停下来思考、回溯并调整他们的方法。这一自然过程体现了长思维的特点。通过详细记录人类解决问题的方法，我们可以生成真实的长思维训练数据。

但是这种方式需要依赖大量极高质量的人工标注，并且随着问题难度的升级，标注的难度也会大幅上升。

<strong>方法二：多智能体方法</strong>

不同于<strong>旅程学习</strong>中策略模型不直接对反馈做出反应，我们可以让多个智能体来完成探索过程，指导它们扮演不同的角色。例如，我们可以构建一个多智能体辩论系统，其中策略模型生成连续推理，而评判模型评估是否继续或回溯。当找到解决方案时，这种交互过程自然会产生长思考训练数据。

<strong>方法三：蒸馏更好模型（比如 o1）</strong>

像 o1 这样的模型，已经展示了强大的反思和自我纠正能力。使用更强大的模型来指导较弱模型学习，从 o1 中蒸馏响应是一个非常自然的方法。然而，由于 o1 限制了对其内部思维过程的访问，因此<strong>需要设计特殊的 prompt</strong>。

#### 2.2 蒸馏的技术路线

上交大 GAIR 团队选用了 Qwen-2.5-Math-72B 作为基座模型，在实际进行蒸馏之前，研究团队首先在这个模型上面进行了 “<strong>格式化对齐</strong>” (Reformatted Alignment)。

<strong>2.3.1 格式化对齐</strong>

团队从开源数据集 NuminaMath-CoT 上选取了一部分奥林匹克级别的问题作为起点，并应用了一个过滤流程来优化数据集：设计规则移除了依赖图像的问题、缺乏明确标注答案的问题以及所有证明题，<strong>仅保留答案类型为数值的问题</strong>。

为了进一步增强数据集，利用 GPT-4o-mini 重写原始解答。重写过程遵循特定的标准，确保解答的步骤是细粒度的、高度详细的，并且篇幅更长。这一步骤还规范化了输出格式，要求使用 \boxed {} 明确表示最终答案，以符合长思维格式。

<strong>2.3.2 蒸馏</strong>

通过使用 OpenAI o1 进行长思维链的合成，构建长思维链数据，然后进行 SFT。最后在 AIME24 和 MATH-500 上进行评测，效果超过了 o1-preview！

没错，就是这样简单粗暴！就连作者最后在技术报告中都指出，通过蒸馏别人家模型虽然是最简单有效的方式，但是这也导致你的天花板非常有限，无法实现真正的超越。

所以，还是少走捷径，脚踏实地做好每一步！

### 参考

[O1 Replication Journey: A Strategic Progress Report – Part 1](https://link.zhihu.com/?target=https%3A//github.com/GAIR-NLP/O1-Journey/blob/main/resource/report.pdf)

[O1 Replication Journey – Part 2:Surpassing O1-preview through Simple DistillationBig Progress or Bitter Lesson?](https://link.zhihu.com/?target=https%3A//github.com/GAIR-NLP/O1-Journey/blob/main/resource/report-part2.pdf)

[机器之心：上交大发布首个OpenAI o1复现项目进展报告，满满的经验洞察](https://zhuanlan.zhihu.com/p/885851537)

[上交大o1复现新突破：蒸馏超越原版，警示AI研发"捷径陷阱"](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/bJc_hSrXsUgrzAfSxAoYoA)

[绝密伏击：OpenAI o1 复现——过程奖励模型（PRM）](https://zhuanlan.zhihu.com/p/1246547399)

[杨植麟发布Kimi新模型：数学对标o1，中考高考考研成绩全第一 | 量子位](https://link.zhihu.com/?target=https%3A//www.qbitai.com/2024/11/219790.html)

[昆仑万维「天工大模型4.0」o1版（Skywork o1）正式启动邀请测试](https://link.zhihu.com/?target=https%3A//www.qbitai.com/2024/11/224684.html)

[🚀 DeepSeek-R1-Lite-Preview is now live: unleashing supercharged reasoning power! | DeepSeek API Docs](https://link.zhihu.com/?target=https%3A//api-docs.deepseek.com/news/news1120)

[https://huggingface.co/collections/Skywork/skywork-o1-open-67453df58e12f6c3934738d0](https://link.zhihu.com/?target=https%3A//huggingface.co/collections/Skywork/skywork-o1-open-67453df58e12f6c3934738d0)

[莫笑傅立叶：O1复现之旅-part 2 通过简单蒸馏是超越O1-preview的巨大进步还是苦涩教训？](https://zhuanlan.zhihu.com/p/9229809205)

[QwQ: 思忖未知之界](https://link.zhihu.com/?target=https%3A//qwenlm.github.io/zh/blog/qwq-32b-preview/)

[陶哲轩：通义千问QwQ奥数真厉害，开源大模型顶流](https://link.zhihu.com/?target=https%3A//www.jiqizhixin.com/articles/2024-11-30-3)