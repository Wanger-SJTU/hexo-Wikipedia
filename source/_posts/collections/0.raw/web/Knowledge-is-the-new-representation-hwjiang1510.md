---
title: "Knowledge is the new representation / 知识即新的表征"
date: "2026-04-29 00:00:00"
updated: "2026-04-29 00:00:00"
layout: "post"
permalink: "/collections/0.raw/web/Knowledge-is-the-new-representation-hwjiang1510/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
source_url: "https://hwjiang1510.github.io/blogs/knowledge-is-the-new-representation/index.html"
---


# Knowledge is the new representation.

> Or: `representation ≠ knowledge = representation`

> 注：这是一篇由 GPT Image 2 触发、关于视觉学习范式转移的个人反思。

## 1. What GPT Image 2 Knows About The World

*Prompt: generate an image of the first page of the best paper at CVPR 2027*

*Prompt: generate a still-life photograph of a glass sphere in front of a black-and-white checkerboard. show the refracted inverted checkerboard inside the sphere and the specular mirror reflection on its surface. render two views 45° apart under different light sources, and include both views together with their corresponding environment maps.*

最近 GPT Image 2 的表现令我非常震惊。在我自己的测试里，下面这两个例子尤其让我目光停留。

<strong>What Stopped Me · 观察</strong>

- <strong>CVPR 2027 best paper 首页</strong>：让我停住的不是它把论文"画得像"，而是它显然知道这句话对一个 computer vision researcher 意味着什么。它知道 CVPR 是什么、best paper 的分量、论文首页该如何组织标题作者（尽管hallucinate了机构🤣）、摘要和 figure，甚至知道 2027 年的 vision community 会觉得什么样的 research direction "像未来"。
- <strong>玻璃球 + 棋盘格 + 双视角 + env map</strong>：一个非常具体的物理 setup。它生成的结果同时对得上四件事：玻璃球内部的棋盘格*折射倒影*符合光学、球面的*镜面反射*与 env map 一致、两个视角之间的几何与高光*连续一致*（不是两张毫不相干的图）、附的 env map 与球面反射方向对得上。这已经不是"把样子记住了"，而是模型内部真的持有一个关于 geometry、refraction、specular reflection、multi-view consistency 的结构化理解。

两个例子放在一起其实指向同一个观察：这个模型不仅有<strong>文本智能</strong>，更关键的是它展现出<strong>视觉乃至物理智能</strong>，而这些规律在训练数据里从来没有通过特定任务显式训练过。这已经不是简单的 image generation 结果，它显露了一种更高层的 <strong>knowledge</strong>。而这也让我越来越难继续沿用传统 computer vision 里的 <strong>representation</strong> 定义去理解它：过去很多年，vision 一直把 representation learning 当成自己的核心叙事之一，但这里的 representation 往往指向一种能在若干标准任务上被验证的中间特征，而不是模型真正拥有的 world knowledge。

> 如果这都不算更好的 representation，那错的就不是模型，而是我们对 representation 的定义。

这篇文章就是从这个不适出发的：GPT Image 2 迫使我重新理解 representation，也迫使我重新理解 vision community 这些年到底在优化什么。把这份感触写成一行式子，如下。

## 2. Meaning of the Two "Representations"

来解释一下这个式子。在这里，我想区分的是同一个词的两个时代含义：左边的 <strong>representation</strong>，是 vision community 上一代的共识；右边的 <strong>representation</strong>，是应该被 <strong>knowledge</strong> 重新定义的现代含义。具体如下：

<strong>"Old" Representation</strong> — 它是 task-specific learning 时代，为了特定任务而学或设计的<strong>representation</strong>，一般由限定的 data distribution 提炼而来。

<strong>"New" Representation</strong> — 它是当代 generalist model 通过在 broader distribution data 上 pretraining 学得的对世界的认识，未必具有结构性，甚至未必可作为 feature 读出，但能支持生成、迁移、推理、组合与跨模态调用，完成复杂任务，因此本质上更接近 <strong>knowledge</strong>。

混用二者便是过去几年 visual representation learning 最常见的误判来源，即用<strong>第一条轴的"标准"</strong>（特定 readout 接口上的分数）去评判<strong>第二条轴定义的"能力"</strong>。任何偏离这一预设任务制度的模型都会天然吃亏，哪怕它已经获得了更强的世界知识。

*Note on "knowledge"*：本文中的 "<strong>knowledge</strong>" 就取它的日常含义：*"the familiarity, awareness, or understanding of facts, information, skills, or concepts acquired through experience, education, or reasoning."*（Wikipedia）。这里不尝试形式化定义；放到 ML 的语境里，它大致对应<strong>一份不依赖任何单一接口、能被多种方式一致调用的内部结构</strong>。

<strong>评价的关键区别 · Two Axes of Evaluation</strong>

## 1. **"好" 由什么定义** (标准 · Criterion)

   - <strong>Old</strong>：在*单一 readout 接口*（linear probe、task head）上友好
   - <strong>New</strong>：同一份内部结构在*多条未被专门优化的接口*之间是否自洽地 zero-shot generalize

## 2. **学什么** (能力 · Capability)

   - <strong>Old</strong>：在 *limited-domain、预设任务分布*里学到的特征（如 ImageNet 标签空间）
   - <strong>New</strong>：在 *open-world data* 上吸收本身就存在的结构，尽量做到 unbiased 而不预设要 cover 什么

## 3. The Readout Trap on *Fake Tasks*

让我们继续解构上一节所讨论的 representation 在不同时代的定义。重中之重乃是其两条关键区别并不平等并列，而是<strong>存在因果关系</strong>：②为因，①为果。为了便于说明，我们先分别说明每一层的内容。

*表层*是 <strong>readout trap</strong>。在传统 representation learning 的评价里，一个 representation "好不好"基本等于它对一组专门接口，比如 linear probe、classification head、segmentation head、decoder 等，是否友好。community 真正在奖励的不是 <strong>knowledge</strong>，而是<strong>单一接口上的 readoutability</strong>：只要某个 feature 能被这组接口轻松读出，它就被认可为"好的表征"。

<strong>A Case From the Readout Trap</strong>

过去几年 vision community 有一个广为认可的观点：用 image generation model（diffusion、autoregressive image model 等）做 ImageNet classification，performance 往往不如 MAE、DINO、JEPA 这类专门以 "学 representation" 为目标的 self-supervised 模型，由此得出的结论几乎成为默认：<strong>"generation model 在学 representation 方面不如 SSL model"</strong>。

但 ImageNet 只考查一种很窄的能力，即 <strong>global semantic understanding</strong>——把整张图压缩到一个类别标签。这让这场比较<strong>两边都失真</strong>：*image gen 分数低*不说明它学得少，因为它在 pixel level 同时 compose 几何、光照、纹理、语义等，*from low-level rendering to high-level semantics*，学到的是<strong>更宽 spectrum 的 knowledge</strong>，只是不以 readout 喜欢的方式浮现；反过来，*MAE / DINO / JEPA 分数高*也不说明 representation 更强：这些 SSL pretraining signal 本来就是为 global-semantic 这个 target 特化的，<strong>在自己被设计来打胜的比赛里打胜了</strong>。

这正是 readout trap 的具象表现：把单一窄接口上的分数当成 representation quality 的证据。长期看，<strong>objective 更 general，less inductive bias 的 representation learning 才是真正 scale 得起来的那个，尽管它可能 less efficient</strong>。

<strong>Classic Tasks · Target vs. Reality</strong>

举几个 task definition 本身就不尽完美的例子：

- <strong>ImageNet classification</strong>: 目的是学习 semantic understanding，但将整张图抽象成一个过度 high-level 的 semantic concept，忽略了之外的所有信息。
- <strong>COCO detection / segmentation</strong>: 目的是学习 objectness，但 objectness 的定义其实不甚明晰，entity-object-part 的界限模糊，composition、occlusion、event 等复杂现象被简化。
- <strong>Novel-view synthesis / 3D reconstruction</strong>: 目的是学习 spatial understanding，但都过度强调 pixel-level accuracy，而不是 symbolic level 的 3D structure；并且 NVS 很容易被 interpolation hack。

*深层*是 <strong>fake task trap</strong>。再往上游一层：community 默认这些 *固定 task 就是 visual intelligence 本身*。公平地说，这套 paradigm 在它的时代是合理的，经典 <strong>representation</strong> 定义曾是 knowledge learning 的一个可解释性近似，而 ImageNet / COCO / NVS 这类 task 也提供了当时最可行的 evaluation signal：好测、有 ground truth、语义定义清晰。但这些 task 本质上只是 biased proxy，<strong>"适合测量"从来不等于"等同于目标"</strong>。测量本是为了近似目标，我们却渐渐把近似值当成了目标本身。<strong>我们需要重新理解 vision 之"道"，而不是只关心这些 task context 下的"技"</strong>。

把这两层放在一起，其因果关系自现：一旦 community 默认 classification 就是等同于 visual intelligence 的关键 task，那么"谁在 classification 上读出更高分"自然成为最关键的评价维度。Readout trap 从来不是独立发生的事，它是"proxy task = visual intelligence"这个底层假设在评价层面的必然投影。

两层 trap 合起来其实指向同一个更深的 lesson，它本质上是一次<strong>认识论（epistemic）上的转向</strong>：可读性以及 specific task 上的 high score，都只能算 <strong>knowledge</strong> 的旁证，有时甚至是误导性的；真正能印证 knowledge 存在的，只能是 model 在*开放的、非平凡的任务上展现的 capability*——换言之，model output 才是对 input 的更完整响应，因此也才是 readout 更自然的形式，才能作为 knowledge 和 capability 的真正考量。从"模型内部长什么样"转向"模型能完成什么"，这才是 §3 真正留下的 take-away。而一旦立足于 capability，下一个问题自然从认识论滑向<strong>本体论（ontological）</strong>：knowledge 究竟住在哪里？

## 4. Knowledge as Representation

答案其实并不玄奥：<strong>knowledge</strong> 必然住在 <strong>representation</strong> 里。我们不需要抛弃 representation 这个词，而应该反过来以 knowledge 为中心重构它。如果一个 model 真的拥有 knowledge，那么这份 knowledge 必然被编码、压缩、组织，并在生成、推理、迁移、行动中被调用，<strong>knowledge 不可能存在于 representation 之外</strong>。

<strong>A Classical Parallel · 神居何所</strong>

这层关系在中国古典艺术，尤其是我所熟悉的书法理论里早被说透。邱振中《神居何所》的核心命题正是如此：***神*不住在任何一笔、任何一字里，却只有通过点划的整体才能浮现<strong>。王僧虔更早就谓之"惟见神采，不见字形"。神无法从任何单一笔画中被线性抽离，却必然住在</strong>形<strong>中。</strong>形<strong>为具象、</strong>*知识*<strong>为抽象，</strong>*knowledge* 就是抽象化的 *representation*；*representation* 就是具象化的 *knowledge***。而这也不是某一种美学传统的独有直觉：Aristotle 的 hylomorphism（form 不能脱离 matter）、Susanne Langer 的 "symbol and meaning as the same thing"，都在从不同角度讲同一件事。

如此一来，这里被检验的 representation 就不只是 latents：model weights 本身就是 compressed knowledge，pretraining 的过程，就是把关于世界、语言、视觉、结构和规律的大量统计与语义信息压进参数里；而 inference 时的 hidden states，则更像这些知识在具体上下文中的展开、检索和组合。

§3 的 epistemic shift，落到 representation 层面，需要一个可操作的 signature：*<strong>cross-interface invariance</strong>*，即同一份内部结构能在多条*未被专门优化*的接口之间一致地浮现。回到 §1 的 GPT Image 2：真正令人震惊的不是"图生成得像"，而是同一个 forward 里 language、physics、layout、community culture 几条从未被单独训练的通道同时以 compositional 的方式发挥作用。signature 不长在任何单一 probe 或 decoder 上，而长在<strong>多条接口（特指"real tasks"）之间的一致性</strong>里。

<strong>A Classical Parallel · 集古字</strong>

书法古训里还有另一面。米芾《海岳名言》自述"<strong>集古字</strong>"，即"壮岁遍取诸家之长，总而成之；及老自成一家，人见之不知以何为祖"。遍学诸形，神采自生；过度专守一门，反而失神。同样的逻辑迁移到 representation learning：*<strong>cross-interface invariance</strong>* 不是靠某一个 target 训练出来的，而是靠<strong>足够广、足够 diverse</strong> 的接口 exposure 让它自然浮现；过度 specialize 到任何一种 probe、loss 或 task，反而会重新掉进 §3 那两层 trap。这也是为什么下一节会展开 *unified multimodal learning paradigm*：覆盖 open-world knowledge 这件事，本身就要求一份足够 diverse 的接口 exposure。

> Weights are compressed knowledge; hidden states are knowledge unfolded by input.
> 权重是被压缩的知识 · 隐状态是被输入展开的知识

新时代真正重要的问题已经不是"这个 feature 对人为设计的特定任务多有用"，而是"模型内部有没有形成可被广泛调用的世界知识"。如果有，那就是更 general 的 representation，也是我理解中 representation 这个词一开始想指向的东西。

> I say <strong>knowledge</strong> is the new <strong>representation</strong>.
> But it was never new — <strong>representation</strong> was always reaching for this. We've barely started to execute on it.

## 5. Knowledge is Compressed Data.

我们已经讨论了 <strong>knowledge</strong> 与 representation 的联系以及存在形式。下一个问题自然是：knowledge <strong>从哪来</strong>？答案朴素得近乎平庸：<strong>来自 data</strong>。语言 data 里压着抽象语义化和符号化的世界结构，图像 data 里压着视觉与物理的结构，视频 data 里还压着时间与因果的结构；多模态 data 里又额外压着<strong>跨模态的桥梁</strong>："苹果"这个词 ↔ 苹果的样子 ↔ 咬苹果的声音 ↔ 削苹果的动作。世界早已以它自己的结构与知识以 data 的形式存好了；learning 从来不发明什么，它只是将 data 里已经存在的 knowledge 搬进 weights。如此说来，learning（尤其是 pretraining）的本质即为<strong>数据到权重的压缩</strong>。

> Data is knowledge.
> Weights are compressed knowledge; hidden states are knowledge unfolded by input.
> Pretraining is absorbing knowledge as representation learning.
> 数据即知识 / 权重是被压缩的知识 · 隐状态是被输入展开的知识 / 预训练即知识吸收 · 即 representation learning

既然 learning 的本质就是压缩，那么一个 learning paradigm 的好坏，就由三个轴决定：

<strong>Three Axes of a Learning Paradigm</strong>

## 1. **Scalability** — 随 data / compute 扩张持续压缩更多 knowledge

   - 取决于 <strong>minimal data curation</strong>：任何人工介入（labeling, filtering, etc.）都会随 data 增大而上涨，限制 scaling。
   - 以及 <strong>minimal inductive bias</strong>：不把模型锁在某个预设的 domain 上，否则一旦超出该 domain 就饱和。

## 2. **Effectiveness** — 在给定 scale 下真正压出 knowledge，而非 superficial pattern

   - 由 <strong>objective</strong> 决定。Next-token prediction 这类 self-supervised signal 与 data 本身同构，压出的是 data 的联合分布；task-specific (self-)supervised loss 只压出"对某个接口最有用的一小块"，错过绝大部份的 data 及其蕴含的 knowledge。

## 3. **Efficiency** — 单位 compute / sample / param 能压出多少 knowledge

   - 由 <strong>objective</strong> 与 <strong>modality</strong> 共同决定。objective 决定每个样本能供出多少有效梯度：*dense objective*（如 NTP、pixel-level reconstruction）天然让每个 token / patch 都提供梯度，sparse objective（CLS-only contrastive 等）则一张图只回传一次。modality 决定 data 本身的信息密度，越密、冗余越少，越 sample-efficient。

当理解了 knowledge 和 learning paradigm 的关系，回到 <strong>visual representation learning</strong>，它的终极答案呼之欲出：<strong>unified multimodal omni-model</strong>。每种模态都是同一 world 在不同 modality 接口下的不完整投影，而只有学习多模态的联合分布才能真正得到 compression of the world。

进一步把这一点落到三轴上：<strong>scalability</strong> 上，每多一种模态即多一次对 world 的独立观测，互为印证；<strong>effectiveness</strong> 上，objective 训的就是 cross-interface invariance 本身，不必再靠 evaluation 时的 readout 倒推；<strong>efficiency</strong> 上，语言作为高密度模态与低密度的 pixel 共训，sample efficiency 被语言一侧抬起。omni-model 不是工程偏好，是<strong>必然</strong>。

更进一步，omni-model 不止是好 learner，同时也是 §3 / §4 所呼唤的 <strong>evaluation</strong>。它在一份权重里并置 generation、understanding、rendering、retrieval 等多条*未被专门优化*的接口，任何一条 knowledge 都必须在所有接口上同时成立：fake task 不再独占判罚权，readout trap 随之失效，*<strong>cross-interface invariance</strong>* 才真正有了 verifier。

## 6. There's No Ladder to the Moon

读到这里容易产生一种误解：既然 omni-model 是 visual representation learning 的必然下一步，那么过去十几年的 <strong>task-specific research</strong> 是否就此失去意义？我也曾为此自我否定，但最后发现也许并非如此，因为<strong>我们无法一步登天</strong>。<strong>会延续的不是领域研究的形式，而是资产</strong>。

一个能吸收整个世界知识的模型，不可能被凭空创造；它的每一个 weight，都将由各个领域长年累月沉淀的经验塑造：<strong>data 怎么造</strong> (何为 real task/knowledge)、<strong>data 怎么 mix</strong> (何为更重要的 knowledge)、<strong>multimodal 怎么交织</strong>（何为 modality synergy）。每一项背后都是某个 domain 长期的试错与理解，不写在 paper 标题里，而埋在 dataset、ablation 和对「什么才算真问题」的共识里。

因此，死掉的是把 proxy 当 intelligence 的旧壳，留下来的是它曾经挖出来的真实结构。Domain 不会消失，而是下沉：那些被烘焙进 pretraining 的 domain-specific knowledge，终将互相壮大，在 post-training 迎来轮回。范式将变，而穿越范式更替而沉淀下来的知识和资产，终将以另一种身份重新出场。

**\* Why I have this thought**

Multimodal data 的意义不只是让模型学到更多 <strong>knowledge</strong>，而是让许多原本被当作 domain-specific 的能力，第一次拥有了共同的知识底座，彼此互补，又在规模上远超任何单一 domain，这会显著抬高模型的 general world knowledge。

一旦这层底座足够厚，很多能力就不再需要靠一整套 domain-specific pretraining for representation learning 从零造起。过去一个领域往往要先定义自己的 data、objective 和 inductive bias，才能让模型学会最基本的能力；未来更可能是，general multimodal pretraining 已经把绝大多数底层知识学进去了，只需要再给模型一点低频率但高价值的 domain-specific data，在 pretraining 的尾部或 midtraining 阶段稍作点拨，它就能把这项能力组织出来。

除此之外，multimodal capability 不是终点，而是起点：它是 agentic system 走向 continual learning 的前提。只有当一个模型已经拥有足够广的跨模态知识，它才可能在持续交互中不断吸收新经验，把 learning 从一次性的 pretraining 推向开放世界中的长期更新。

## 7. Conclusion

回到 §1 那两张图：让人停住的不是它生成得像，而是它真的<strong>知道</strong>。vision 追了多少年的 <strong>representation</strong>，所求即此；§4 王僧虔那句"惟见神采，不见字形"，才在我们自己的领域里第一次成立。

> <strong>representation</strong> ≠ <strong>knowledge</strong> = <strong>representation</strong>： What dies is not the knowledge, but the shell that once contained it.
> <strong>knowledge</strong> 从未离开过 vision。我们用了十年，才学会念对它的名字。

<strong>Afterword · 后记</strong>

写下本文之时，<strong>multimodal model</strong> 的研究在社区里早已如火如荼地推进了两年，而我却始终未真正读懂它的含义。古人云*"一叶障目，不见泰山"*，我沉浸在 spatial understanding 的 proxy task 里太久，深以为憾。文中许多结论或许在 domain 里早已是常识；我仅以此文记录自己一段迟来的思考。不求振聋发聩，聊作雪泥鸿爪耳。
