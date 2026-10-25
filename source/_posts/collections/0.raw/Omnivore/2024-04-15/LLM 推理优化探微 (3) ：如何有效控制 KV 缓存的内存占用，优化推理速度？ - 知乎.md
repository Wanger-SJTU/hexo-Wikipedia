---
id: cdcf47e2-bf14-4d87-8099-fbb5cf9c4d9d
---

# LLM 推理优化探微 (3) ：如何有效控制 KV 缓存的内存占用，优化推理速度？ - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/llm-3-kv-18edf77011f)
[Read Original](https://zhuanlan.zhihu.com/p/686107883)



04 减少模型层数能够减少 KV 缓存的内存占用？

05 减少注意力头数量可以减少 KV 缓存的内存占用吗？

09 如果 GPU 内存不足，为什么不“只是”想办法使用更多 GPU 呢？或者将工作负载转移到 CPU 内存甚至到磁盘上呢？

> **编者按：**随着 LLM 赋能越来越多需要实时决策和响应的应用场景，以及用户体验不佳、成本过高、资源受限等问题的出现，大模型高效推理已成为一个重要的研究课题。为此，Baihai IDP 推出 Pierre Lienhart 的系列文章，从多个维度全面剖析 Transformer 大语言模型的推理过程，以期帮助读者对这个技术难点建立系统的理解，并在实践中做出正确的模型服务部署决策。  
> 本文是该系列文章的第三篇，作者的观点是：多头注意力（MHA）模型的 KV 缓存确实会消耗大量 GPU 内存，并且很容易增长到比模型权重还大的规模， KV 缓存大小的控制对于优化大模型的推理至关重要。  
> 本文主要内容如下：(1) KV缓存随序列长度线性增长，容易超过模型本身的规模，严重制约最大序列长度； (2) 减小KV缓存对GPU内存的占用，是优化推理速度和吞吐量的关键； (3) MQA、GQA等新型注意力机制、FastGen等缓存压缩策略，以及PagedAttention等内存管理机制，都是能够有效缓解 KV 缓存内存占用压力的技术手段。  
> 在下一篇文章中，我们将探讨可能影响模型延迟和吞吐量的各种瓶颈。到时见！

**作者 | Pierre Lienhart**

**编译 | 岳扬**

在上一篇文章中，我们介绍了 KV 缓存，这是对 LLMs 推理过程的一种常见优化。**使用 KV 缓存技术的目的是在生成过程中计算过去 tokens 的键和值张量时，将这些张量存储（"缓存"）在 GPU 内存中，从而避免在每个生成步骤中重新计算这些 tokens 的键和值张量。**

KV缓存是一种妥协：我们以内存的消耗换取计算量的减少。在这篇文章中，我们将了解 KV 缓存的容量有多大、会带来哪些挑战，以及面对这些挑战最常用的应对策略是什么。

## 01 **KV 缓存的容量有多大？**

这相当简单：对于每个 batch 中每个序列的每个token，我们需要为每个注意力层（attention layer）的每个注意力头（attention head）存储两个大小为 d\_head 的向量张量（一个键张量和一个值张量）。每个张量参数（tensor parameter）所需的空间取决于精度（precision）：全精度（FP32）为 4 字节/参数，半精度（BF16、FP16）为 2 字节/参数，8 位（bit）数据类型（INT8、FP8）为 1 字节/参数，等等。

b 为batch size，t 为序列总长度（包括用户提供的提示词（prompt）以及模型生成的补全部分（completion）），n\_layer 为解码器块/注意力层数，n\_heads 为每个注意力层的注意力头数，d\_head 为注意力层的隐藏维度，p\_a 为精度。多头注意力（MHA）模型使用 KV 缓存技术，每个 token 的内存消耗量（以字节为单位）为：

![](https://proxy-prod.omnivore-image-cache.app/244x80,sr3Kv5sTgaJLGMdbPqmRxUqPtit2mvTwrNtPuCeohmvA/https://pic4.zhimg.com/v2-d7f7284ed8287003bf252d8b367639ef_b.jpg)

请注意：在 MHA 模型中，n\_heads × d\_head = d\_model，但本文没有根据这个情况来简化上面的公式。

因此，KV 缓存的总大小（以字节为单位）为：

![](https://proxy-prod.omnivore-image-cache.app/265x70,s3HHBmBhtjxcDTkdeaRX2SehSOohYHgZX38FCri87q68/https://pic2.zhimg.com/v2-33776344877199f0a3b044569fb1d711_b.jpg)

使用 KV 缓存技术面临的首要挑战之一是：**它的大小随 batch size 线性增长，最重要的是随总序列长度线性增长。**由于它与总序列长度（total sequence length）成正比增长，KV 缓存的大小在实际上几乎没有上限，而 GPU 内存显然是有限的。**更糟糕的是，由于无法预先知道序列的总长度，因此 KV 缓存的内存需求也是未知的，使得内存管理变得尤为困难。**

让我们来看看流行的 MHA 模型的一些数据（表 1），即 Meta 的 Llama-2 \[1\] 和 OPT \[2\]、MosaicML 的 MPT \[3\] 和 BigScience 的 BLOOM \[4\]：

![](https://proxy-prod.omnivore-image-cache.app/1080x534,sI44U-cJrY4pC9RztxEnPHBtD-WKFRpibQx6tb0WDPG4/https://pic3.zhimg.com/v2-441824200f70e1fc34c3a20e4b8d8cc2_b.jpg)

表 1 —— 市场上常见的多头注意力（MHA）模型规格

假设参数以半精度（FP16、BF16）存储，并选择一个较小的模型（Llama-2-7B）和一个较大的模型（BLOOM-176B）。对于 Llama-2-7B 和 BLOOM-176B，KV 缓存的内存消耗分别为 \~0.5MB/token 和 \~4MB/token。

现在把重点放在 Llama-2-7B 上。使用半精度时，加载模型权重消耗约 14GB 的内存，相当于缓存 28k 个 token 的 key 和 value 。28k 个 token 可能对应于长度为 512 的 56 个序列的 batch ，这并不是特别极端。

从以上数据可以看出，**KV 缓存内存消耗可能会变得非常大，甚至超过了加载大型序列模型权重所需的内存量。**

现在，让我们将这些数字与常见的 NVIDIA 数据中心 GPU 的内存容量进行比较（见表 2）：

![](https://proxy-prod.omnivore-image-cache.app/1080x398,s7UENf1IksVItwdVhz1vkHY9TvdcwtMlJSjPQu3Izh7g/https://pic4.zhimg.com/v2-856d91c0702c2f97b92d1fc8bfd3e683_b.jpg)

表 2 —— 用于LLM训练服务的常用NVIDIA数据中心GPU规格一览

让我们选择成本相对较低的 A10 GPU，并使用 Llama-2–7B 来计算最大的 KV 缓存容量。加载模型权重后，KV 缓存的可用容量为 24-2x7=10 GB，即总容量约为 20k token（包括提示词），这显然无法满足大量并发请求，尤其是在处理或生成长序列时。

我们现在明白了，**KV 缓存阻碍了我们处理或生成超长序列（即长上下文窗口带来的挑战或障碍）和/或处理大 batches ，因此无法最大限度地提高硬件效率。**

从这个角度来看，最大化模型处理能力意味着为 KV 缓存留出尽可能多的内存空间，可以通过以下方式实现：

* **减少模型权重的内存占用**（权重量化（weight quantization））
* **减少 KV 缓存的内存占用**（参见下文）
* **将模型分片到多个 GPU 上，以牺牲网络通信为代价（模型并行（model parallelism））或使用其他类型的存储，如 CPU 内存或磁盘（通过 offloading ），从而将多个设备的内存池化。**

由于模型权重和不断增长的 KV 缓存都必须在每次前向传递（forward pass）时加载，解码步骤涉及非常大的数据传输，正如我们将在接下来的文章中看到的那样，实际上是受内存带宽限制的，也就是说，我们实际上花在移动数据上的时间要多于做有用工作（即计算）的时间。在这种情况下，延迟只能通过增加内存带宽（即更好的硬件）或减少数据传输来改善。较小的模型权重和 KV 缓存可以腾出内存用于更多序列，从而提高吞吐量（和/或增加最大序列长度）。

在这方面，减少内存占用的相关策略具有三重作用，因为它们能让我们提高硬件利用率，从而提高成本效益比，同时减少延迟并提高吞吐量。

_**题外话 —— 为什么要对我们输入给大模型的 tokens 收费？ （表 3）**_

![](https://proxy-prod.omnivore-image-cache.app/735x183,sxIdL8LYPtf3zis6AhTbBmLovfyauSyjg9jiWG3eWEIw/https://pic2.zhimg.com/v2-b13c122a31957d6bf522ac96b2cfa065_b.jpg)

表 3 —— OpenAI 收费标准（检查日期：2024 年 1 月 12 日）

说到这里，你应该明白为什么输入给模型的 token 和模型输出的 token 都要收费了。一旦处理完输入的提示词，即在预填充阶段（prefill phase）结束时，就已经开始消耗 GPU 内存（用于存储每个输入token的键和值张量）和计算（将提示词 token 通过模型进行处理）。

现在让我们来看看一些真实的数据。假设一个参数量为 P 的模型进行前向传递的总 FLOPs 数约为 2.P FLOPs/token\[5\]，使用 Llama-2-7B 处理提示词会消耗约 0.5 MB/token 的 GPU 内存（见上文）和约 14 GFLOPs/token 的 GPU 计算资源。对于一个由 1000 个 token 组成的提示词（比两页纸还少）来说，大约需要 500 MB 的内存和 14 TFLOPs 的计算能力，而我们还没有生成任何内容。

现在，让我们通过上面的公式，依次查看每一项，看看有哪些方法可以减少 KV 缓存的内存占用：

![](https://proxy-prod.omnivore-image-cache.app/265x70,s3HHBmBhtjxcDTkdeaRX2SehSOohYHgZX38FCri87q68/https://pic2.zhimg.com/v2-33776344877199f0a3b044569fb1d711_b.jpg)

## 02 **那减少 batch size 呢？**

在大多数情况下，我们不希望减少batch size，因为虽然它有助于减少 KV 缓存的内存占用，从而减少延迟，但也**会降低硬件利用率，从而降低成本效率比。**在后续博客中，我们将确实看到这一情况，所以我们希望尽可能地增加batch size。

## 03 **那么，减少对总序列长度的依赖呢？**

不去存储序列中所有 token 的 key 和 value 的一个原因可能是，我们明确选择在每次迭代时重新计算缺失的tokens，因为这样做比消耗 GPU 内存更值得（例如，因为我们受到内存带宽的限制，在自回归阶段就是这种情况）。据我所知，这并非我所知道的实际情况，因此本文不会在这方面进行深入研究。

另一种观点是，我们可以选择不存储模型对其关注不多或完全不关注的 token 的 key 和 value 。对于只关注部分序列的模型（例如 Mistral AI 的 Mistral-7B）来说，这可能是设计上的某种考虑，也可能是内存消耗和模型准确性之间的一种折衷。让我来解释一下。

像 Mistral-7B 这样的模型 \[6\] 被训练成不会关注整个序列。Mistral-7B 的注意力层的确是通过关注最后的 4096 个相邻 tokens 来构建 tokens 表征的。这种注意力机制的变体被称为滑动窗口注意力（SWA）或局部注意力（local attention）。根据设计，局部注意力可以保证我们在 KV 缓存中存储的张量对永远不会超过窗口大小（例如 4096）。

另一种方法是利用注意力层在序列中分配注意力的模式。众所周知，注意力模块会不成比例地持续将更多的注意力分配给序列中的少数几个 tokens （见图1）。相比之下，许多 tokens 对输出的贡献始终微乎其微，因此根本没有必要费心存储它们的键和值。

![](https://proxy-prod.omnivore-image-cache.app/750x668,s20vlujLTbtahirRhhSppqVsJ7u2n-rlOQJveCi4g8H8/https://pic2.zhimg.com/v2-f19c5457466200e9830e837abdf8efd1_b.jpg)

图 1 —— 来自 StreamingLLM 论文的注意力热图示例：大量注意力持续分配给第一个 token 和最后一个相邻 token （局部注意力）

丢弃这些 tokens ，实际上就是将相应的注意力分数设为零，并用一个更稀疏的注意力矩阵来近似估计注意力矩阵。成功的近似估计可以最大限度地减小近似误差，从而降低对模型准确性的影响（例如，使用困惑度进行度量）。

让我们看看过去几个月出现的几种方法，这些方法无需重新训练或微调就可以直接应用：StreamingLLM 框架、H2O（Heavy-Hitter Oracle）、Scissorhands 和 FastGen。**然而据我所知，目前还没有任何流行的 LLM 推理框架支持它们。**

针对使用有限长度的上下文窗口训练的模型，StreamingLLM 框架 \[7\] 观察到了这样一种现象：初始的这些 tokens 收集了大量的注意力。因此，该框架仅通过在缓存中保留最初的位置 tokens （“sink tokens”）和最后的相邻tokens（局部注意力）来构建滑动窗口。因此，StreamingLLM框架的 KV 缓存长度是固定的，既有固定部分（通常为 1 到 4 个 tokens ），也有滑动部分。

类似的 H2O \[8\] 和 Scissorhands \[9\] 方法通过设置缓存 tokens 的最大数量，并且在达到设置的最大缓存数量时丢弃 tokens 来压缩 KV 缓存。H2O 算法每次只丢弃一个 token ，而 Scissorhands 则根据设置的目标压缩比例丢弃尽可能多的 tokens （例如，减少 30% 的 KV 缓存大小）。

这两种方法都基于这样一种观点：在特定步骤中具备影响力的 tokens （“关键 tokens ”或“重要 tokens ”）在未来的步骤中仍具备影响力（Scissorhands 的作者将其命名为“tokens的重要程度具备持续性假说（Persistence of Importance Hypothesis）”）。换句话说，**我们可以确保被丢弃的低影响力 tokens 在未来的步骤中仍会被相对忽略，因此可以放心地丢弃它们。**

**这两种算法的关键点在于缓存丢弃策略（cache eviction policy）。**Scissorhands 只会简单地保留最近的 tokens 以及在历史上下文窗口内具有最高注意力分数的 tokens 。H2O 则会丢弃累积注意力分数最低的 tokens ，因此只保留在迭代过程中始终获得高注意力分数的 tokens 。两个团队的研究都已经证明，他们的算法可以减少高达 80% 的 KV 缓存大小，并且模型准确性的损失可以忽略不计。

FastGen 方法 \[10\]（不要将其与不相关的 DeepSpeed-FastGen 方法混淆）仍然以注意力模式（attention patterns）为基础，但采用了另一种方法，这种算法并非采用 cache budget （译者注：cache budget 指的是用于存储KV缓存的最大容量），而是为注意力矩阵（attention matrix）设定一个最大的近似误差，从而专注于模型准确性的保持。

FastGen 是一种分两步走的方法：首先，在预填充阶段（prefill phase）结束时对模型的注意力层进行剖析，以确定能够达到误差目标（error target）的压缩策略集。与其他方法一样，它假定已确定的注意力模式在未来的生成步骤中将保持不变。该方法使用压缩策略包括：保留特殊tokens、保留标点符号、保留最后相邻的tokens（局部注意力）等（如图 2所示）。如果误差目标（error target）过于严格而无法达到，FastGen 就会退回到常规的 KV 缓存。然后，在每个生成步骤（generation step）中将所选的压缩策略应用于 KV 缓存。

![](https://proxy-prod.omnivore-image-cache.app/1080x1047,spmxI92tYJP_OqGM9xlFmlWkREDfw_XyTHVqT9w48ZSk/https://pic1.zhimg.com/v2-3bc649e354636c3007edfeeef096ee18_b.jpg)

图 2 —— FastGen 论文中的一组压缩策略示例： 特殊字符（绿色）+ 标点符号（橙色）+ 局部注意力（蓝色），灰色为被丢弃的 tokens

请注意，与其他方法不同的是，FastGen 为每个提示词都量身定制了压缩策略。FastGen的作者表明，在给定的 KV 缓存压缩比率下，他们的算法比 H2O 和 Scissorhands 更能保持模型的准确性。

无论如何，打破对序列总长度不可预测特性的限制是一种解脱，因为这样可以为每个序列分配可供使用的内存量限额，从而大大地简化了内存管理。由于数据传输是造成延迟的主要原因，因此没有随着序列长度线性增长的 KV 缓存，特别是对于更长的序列长度，可以带来显著的速度提升。

## 04 **减少模型层数能够减少 KV 缓存的内存占用？**

在这方面并没有太多可以获得的好处。较小的模型通常层数较少（见表4），因此，**如果较小的模型在某个使用场景中表现良好，那么只需选择它即可。**

![](https://proxy-prod.omnivore-image-cache.app/1080x285,sMwS1edZ1co_gEUaVtVJSlZg6JdKd58CvPLdBqpS_Ruk/https://pic3.zhimg.com/v2-58de3000571ee5377d0d958040cb6682_b.jpg)

表 4 —— Llama-2 系列模型规格

## 05 **减少注意力头数量可以减少 KV 缓存的内存占用吗？**

对于给定的模型架构，**模型大小主要由层数和注意力头数控制，因此减少注意力头数意味着选择更小的模型**（参见表 4）。

然而，如果我们仔细观察，就会发现我们只需要减少每个注意力头所包含的 key 和 value 数量，注意力头的 query 数量并不会影响 KV 缓存的大小。这正是多查询注意力（MQA）\[11\] 和分组查询注意力（GQA）\[12\] 架构的核心思想。这些多头注意力机制（MHA）变体的唯一动机就是减小 KV 缓存的大小。

MQA 最早于 2019 年推出。在 MQA 中，每个注意力头的 query 都使用相同的 key 和 value 来计算注意力分数。换句话说，所有注意力头的 query 都使用相同的 key 计算它们的注意力分数，并且所有注意力头的输出都是使用相同的 value 计算的（但注意力分数不同）（见图 3）。

![](https://proxy-prod.omnivore-image-cache.app/1080x1029,sFfSwzFJZoktXgKRLLJaUP-zTQJdBcj-GO1Ixw7mgZIM/https://pic2.zhimg.com/v2-af3c20de0981c63ce30665a239a1fb69_b.jpg)

图 3 —— 多头注意力机制（上图） vs. 多查询注意力机制（下图）（两个注意力头）

将所有注意力头（heads）剥离的做法对于较大的模型来说相对更为激进。例如，与从 32 个注意力头减少到 1 个相比，从 64 个注意力头减少到 1 个在模型在学习和表达输入数据时的能力上的削减要大得多。GQA 通过提供一个中间解决方案来解决这个问题：这种方法并非让所有注意力头的 query 共享相同的唯一 KV heads，而是将它们分成由 g 个query heads 组成的组，同一组的 query heads 共享相同的唯一 KV heads。换句话说，与其将 query heads 的数量从 n\_heads 减少到 1 个 KV heads，不如将 KV heads 的数量从 n\_heads 减少到 1<g<n\_heads。

从这个角度来看，MHA 和 MQA 都是 GQA 的特例（分别对应 g=1 和 g=n\_heads 的情况）。GQA （译者注：原文为“GQA“，可能是笔误。）允许在两个极端情况（MHA 和 MQA）之间更平滑地在模型准确性和 KV 缓存大小（与延迟和吞吐量都有关）之间取得折衷。

因为需要考虑新参数 g，KV 缓存大小的计算公式变为：

![](https://proxy-prod.omnivore-image-cache.app/266x80,sbcIAZGOJUPkXwKRCbvi3HZPHK3v6jPmQgnUQFY0OGMA/https://pic2.zhimg.com/v2-4cb62e14ef73638e78cec02991eb9fcd_b.jpg)

在实践中，MQA/GQA 架构已经被 Google Research 的 PaLM \[13\]、TII 的 Falcon \[14\] 模型、Meta 的 Llama-2 \[1\]（仅限于 70B）和 Mistral AI 的 Mistral-7B \[7\]（见表 5）等所实现。

![](https://proxy-prod.omnivore-image-cache.app/1080x529,sIpZQZWZ0s2HCsm_shAqJ1VxhKmvCOc-RY8g3sn5i9Gg/https://pic3.zhimg.com/v2-4f0e6f1c3cb0e53ffbf310796eef1662_b.jpg)

表 5 —— 使用 MQA 或 GQA 的模型系列

## 06 **选择不同的注意力头隐藏层维度呢？**

同样，如果你不准备选择其他模型系列的话，在这方面也没有太多可获得的好处。注意力头的隐藏层维度（hidden dimension）可能在同一模型系列中的各个模型中是保持不变的（例如 Llama-2、Falcon），因此选择同一系列中的较小参数规格的模型并不会有所帮助。

## 07 **使用更少的字节数来表示每个参数呢？**

对 KV 缓存进行量化处理确实是大幅减小其 size 的一种比较有效的方法。然而，仅对权重进行量化的算法，如 AWQ \[15\] 或 GPTQ \[16\]，从定义上讲是没有用的。只有那些对权重和“activations”（即不是权重的其他任何内容）都进行量化的算法，比如 LLM.int8() \[17\] 或 SmoothQuant \[18\]，才能产生经过量化的 KV 缓存，将其转换为较低精度的表示形式。

请注意，那些同时作用于权重和 “activations” 的量化算法，其目的之一便是以更低的精度执行计算密集型的矩阵乘法。如果在训练过程中计算能力受限，进行量化操作能够带来一定的性能提升，但正如我们将在接下来的文章中看到的那样，**模型推理的自回归阶段（autoregressive phase）实际上是受到内存带宽（memory-bandwidth）的限制，因此更快的计算速度并不会带来太多价值。**由于模型推理受到内存带宽的限制，我们实际上只对如何减少内存占用感兴趣，因为这意味着更少的数据传输。

从这个角度来看，像 LLM.int8() 或 SmoothQuant 这样的量化算法有点矫枉过正：在将缓存的张量（tensors）移动到 GPU 内存之前对其进行量化，并在从 GPU 内存中获取相同的张量后对其进行反量化（以额外的开销为代价（译者注：此处的“额外的开销”应当是指附加计算开销和内存复制开销）），这就足够了。

一些 LLM 推理系统已经包含了这种 KV 缓存量化功能。例如，FlexGen \[19\] 将 KV 缓存和模型权重都量化并存储在 4-bit 的数据格式中。NVIDIA TensorRT-LLM(1) 能够将 KV 缓存量化为 8-bit 的数据格式（INT8 或 FP8）(2)。主流的 vLLM 框架从版本 0.3.0(3) 开始也支持 KV 缓存 FP8 量化。由于量化步骤是在每次迭代时动态执行的，因此无需校准步骤（calibration step）。

## 08 **高效内存管理策略的重要性**

直到现在，我们都默认没有浪费内存空间：**所有预留的内存都用于存储 tokens ，所有可用的内存都可以被预留。然而，在实践中，简单的内存管理策略可能导致大量内存被浪费**（PagedAttention 论文 \[20\] 表明实际的内存有效利用率可能低至 20%，即 80% 的浪费！）：

1. 由于请求的总序列长度事先是未知的，我们可能会预留能够满足最大序列长度的连续内存块。这种方式分配的一部分内存肯定永远不会被使用，并且由于不可用于其他请求，而被浪费（内部内存碎片化）。
2. 即使序列长度是事先已知的，由于内存逐渐被使用，但内存块是为请求的整个生命周期保留的，因此较短的内存请求无法使用仍未使用的内存块。
3. 如果我们使用每个内存请求能够产生多个序列的解码策略，如束搜索（beam search），那么多个候选序列实际上可以部分共享其 KV 缓存。如果我们不考虑这种情况，就会不可避免地重复存储原本可以共享的 KV 条目，从而造成内存浪费。

这些缺点正是现在流行的 PagedAttention 算法所要解决的问题。PagedAttention 算法分配固定大小且相对较小的内存块，称为 blocks 。每个 block 可以包含固定数量的tokens，并且必要时可在不同请求之间共享。按需分配和使用较小的 block size 减轻了内部内存碎片化，而相同大小的 blocks 消除了外部内存碎片化。

总体而言，PagedAttention 实现了 KV 缓存内存的近乎零浪费（小于 4% \[21\]）。以前浪费的内存现在可以用来满足更多的请求，从而提高吞吐量。当年 PagedAttention 推出时，其吞吐量的改进数据与当时的内存浪费情况一样引人注目。

PagedAttention 最早是由 vLLM(4) 推理系统实现的，但现在已受到所有主要推理框架的支持（例如 HuggingFace TGI(5)、NVIDIA TensorRT-LLM(1)、LMDeploy TurboMind(6) 等）。

PagedAttention 没有涉及到的另一个可能的优化措施是跨请求重用键值缓存（reusing the key-value cache across requests）。当提示词（prompts）共享某一类共同的前缀时，这种优化就会适用，这种情况通常出现在聊天界面和Agent等多轮用例或使用提示词模板时（图 4）。

![](https://proxy-prod.omnivore-image-cache.app/569x138,schADOMGc8os9l8nGR3yBrtzk6dRRCNSMxzH5hStV5V8/https://pic3.zhimg.com/v2-336bd38ef48855565aca41ad0974894e_b.jpg)

图 4 —— 来自 SGLang 论文的 KV 缓存共享示例（多轮聊天），共计四个生成请求。蓝色框表示可共享的 Prompt 部分

如果能在不同请求之间重复使用 KV 缓存，就能显著改善延迟（特别是首个 token 的延迟）和吞吐量（通过大大减少具有共享前缀的并发请求的内存占用）。

LMSYS SGLang 论文\[22\]中介绍的 RadixAttention 技术就是这种 KV 缓存重用的一个经典案例。

RadixAttention 算法在完成内容生成请求后，并非直接丢弃 KV 缓存，而是将其保留在 GPU 内存中，并向专用数据结构（radix tree）添加一个新条目，将 tokens 序列映射到其 KV 缓存张量。当新请求到达时，调度程序会使用 radix tree 进行前缀匹配。如果有缓存命中，调度程序就会重新使用缓存的 KV 张量来满足请求。

由于 GPU 内存有限，缓存的 KV 张量不可能永远保留。因此，RadixAttention 算法包括一种缓存淘汰策略（例如，最近最少使用 (LRU) 缓存淘汰策略）。最佳的缓存重用技术可能与先到先服务等调度方案不兼容。因此，RadixAttention 附带了一个修改过的调度程序，可优先处理与缓存前缀相匹配的请求（缓存感知调度（cache-aware scheduling））。

注意：PagedAttention 和 RadixAttention 的命名容易误导人，可能与大家的想象相反，它们不是对模型的注意力层进行优化（如 FlashAttention），而是在模型服务器级别进行操作（它们帮助服务应用程序更好地管理主机上的 KV 缓存）。

## 09 **如果 GPU 内存不足，为什么不“只是”想办法使用更多 GPU 呢？或者将工作负载转移到 CPU 内存甚至到磁盘上呢？**

这是两种不同但有效的方法。

首先是关于将工作负载转移到容量更大但速度较慢的存储介质（CPU 内存和磁盘）上。并非所有推理框架都支持此功能，例如 HuggingFace Accelerate(7)、DeepSpeed-Inference(8) 和更高级的 FlexGen(9)。由于涉及使用速度较慢的存储介质，转移负载会带来严重的延迟问题，因此这种选项显然不适用于对推理延迟敏感的使用场景。**转移负载系统（Offloading systems）通常用于以吞吐量为导向的使用场景，如离线批处理（offline batch processing）。**

至于使用多个 GPU（对于大模型推理而言，这是无法避免的），将模型分片到多个设备上，可以通过利用聚合的内存容量和内存带宽来释放内存压力。

如果选择 pipeline 并行\[23\]，则模型和 KV 缓存都会沿着层（layer）的维度进行分片。如果选择张量并行\[24\]（在模型推理场景更常见），则 KV 缓存会沿着注意力头（attention heads）的维度进行分片。请注意，在这种设置下，MQA 会变得相当低效：由于我们无法将单个注意力头分片到多个设备上，因此 KV 缓存必须在所有设备上进行复制，从而失去了 MQA 的优势。对于实施 MQA 的模型来说，另一种方法是将 KV 缓存沿着 batch size 的维度进行分片\[25\]。

无论如何，上述所有情况都假定只有一台主机，我们仍然受限于我们手头最大的多 GPU 实例的存储容量。据我所知，目前还没有任何推理框架支持多主机模型并行。如果我们能够将模型和 KV 缓存分片到多个主机上，那么我们可以处理的可用内存量和最大序列长度几乎是无限的。这就是 Infinite-LLM 论文\[26\]要解决的问题，该论文引入了一种新的分布式注意力算法（DistAttention），并调整了 Ray 框架，以构建一个多主机分布式 KV 缓存管理和调度系统（DistKV-LLM）。

## 10 **Summary**

在本文中，我们了解到选择使用 KV 缓存会带来一些额外的挑战。多头注意力（MHA）模型的 KV 缓存确实会消耗大量 GPU 内存，大约在每个 token 约1MB左右，并且很容易增长到比模型权重还大的规模。

考虑到 GPU 内存非常有限，KV缓存的内存需求产生的压力引发了许多不同方向的创新：新型的注意力架构（MQA、GQA、SWA）、缓存压缩策略（H2O、Scissorhands、FastGen）、高效内存管理策略（PagedAttention、RadixAttention）、模型量化技术和存储容量扩展（离线处理系统、单机器和多机器模型并行）。

我们将在接下来的文章中看到，**减少 KV 缓存大小至关重要，不仅因为 GPU 内存有限，还因为数据移动量实际上是造成每个自回归步骤延迟的主要因素，因此也是整个生成过程延迟的主要因素。**

在下一篇文章中，我们将探讨可能影响模型延迟和吞吐量的各种瓶颈。到时见！

**参考文献：**

\[1\]: Llama 2: Open Foundation and Fine-Tuned Chat Models (Touvron et al., 2023)

\[2\]: OPT: Open Pre-trained Transformer Language Models (Zhang et al., 2022)

\[3\]: Release blog posts for: MPT-7B (May 2023) and MPT-30B (June 2023)

\[4\]: BLOOM: A 176B-Parameter Open-Access Multilingual Language Model (BigScience, 2023)

\[5\]: Scaling Laws for Neural Language Models (Kaplan et al., 2020)

\[6\]: Mistral 7B (Jiang et al., 2023)

\[7\]: Efficient Streaming Language Models with Attention Sinks (Xiao et al., 2023) + GitHub repository

\[8\]: H\_2O: Heavy-Hitter Oracle for Efficient Generative Inference of Large Language Models (Zhang et al., 2023) + GitHub repository

\[9\]: Scissorhands: Exploiting the Persistence of Importance Hypothesis for LLM KV Cache Compression at Test Time (Liu et al. 2023)

\[10\]: Model Tells You What to Discard: Adaptive KV Cache Compression for LLMs (Ge et al., 2023)

\[11\]: Fast Transformer Decoding: One Write-Head is All You Need (Shazeer, 2019)

\[12\]: GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints (Ainslie et al., 2023)

\[13\]: PaLM: Scaling Language Modeling with Pathways (Chowdhery et al., 2022)

\[14\]: The Falcon Series of Open Language Models (Almazrouei et al., 2023)

\[15\]: AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration (Lin et al., 2023) + GitHub repository

\[16\]: GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers (Frantar et al., 2022) + GitHub repository

\[17\]: LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale (Dettmers et al., 2022) + GitHub repository

\[18\]: SmoothQuant: Accurate and Efficient Post-Training Quantization for Large Language Models (Xiao et al., 2022) + GitHub repository

\[19\]: FlexGen: High-Throughput Generative Inference of Large Language Models with a Single GPU (Sheng et al., 2023) + GitHub repository

\[20\] Efficient Memory Management for Large Language Model Serving with PagedAttention (Kwon et al., 2023) + GitHub repository

\[21\] vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention (Kwon et al. 2023)

\[22\] Efficiently Programming Large Language Models using SGLang (Zheng et al., 2023) + Blog post

\[23\]: GPipe: Efficient Training of Giant Neural Networks using Pipeline Parallelism (Huang et al., 2018)

\[24\]: Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM (Narayanan et al., 2021)

\[25\]: Efficiently Scaling Transformer Inference (Pope et al., 2022)

\[26\]: Infinite-LLM: Efficient LLM Service for Long Context with DistAttention and Distributed KVCache (Lin et al., 2024)

**Thanks for reading!**

**END**

**参考资料**

\[1\]<https://github.com/NVIDIA/TensorRT-LLM>

\[2\]<https://nvidia.github.io/TensorRT-LLM/gpt%5Fattention.html#int8-fp8-kv-caches>

\[3\]<https://github.com/vllm-project/vllm/releases/tag/v0.3.0>

\[5\]<https://huggingface.co/docs/text-generation-inference/index>

\[6\]<https://github.com/InternLM/lmdeploy>

\[7\]<https://huggingface.co/docs/accelerate/index>

\[8\]<https://www.deepspeed.ai/tutorials/inference-tutorial/>

\[9\]<https://github.com/FMInference/FlexGen>

**本文经原作者授权，由Baihai IDP编译。如需转载译文，请联系获取授权。**

**原文链接：**

<https://medium.com/@plienhar/llm-inference-series-4-kv-caching-a-deeper-look-4ba9a77746c8>

