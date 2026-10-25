---
id: 1ae35cf3-da82-42c7-8517-70caf6e7bca1
---

# ICLR '24|大语言模型的连续长度外推 - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/iclr-24-18ee69686e5)
[Read Original](https://zhuanlan.zhihu.com/p/692764469)



---

这篇论文试图解决什么问题？

这篇论文《CLEX: CONTINUOUS LENGTH EXTRAPOLATION FOR LARGE LANGUAGE MODELS》主要解决的问题是大型语言模型（LLMs）在处理长文本时受到预设上下文窗口大小限制的问题。由于Transformer架构的固有限制，特别是注意力机制的二次方复杂度，导致在训练时无法有效地处理超出预设窗口大小的上下文信息。这限制了模型在自然语言处理（NLP）任务中处理长文本的能力。

为了克服这一挑战，论文提出了一种名为“Continuous Length EXtrapolation”（CLEX）的新方法。CLEX通过以下几个关键点来解决问题：

1. **连续位置嵌入（PE）缩放**：CLEX将传统的PE缩放方法推广到**连续动态系统中，使用常微分方程（ODE）来模拟长度缩放因子上的连续动态**。这种方法克服了为特定长度设计的PE缩放方法的局限性。
2. **长度外推能力**：CLEX通过将动态扩展到训练序列长度之外的期望上下文长度，实现了在实际任务中对长度的外推，即使在训练时使用的序列较短的情况下也能达到良好的性能。
3. **与Rotary Position Embedding（RoPE）的兼容性**：CLEX可以无缝集成到使用RoPE的LLMs中，例如LLaMA和GPT-NeoX，并且对训练和推理延迟的影响微乎其微。
4. **实验结果**：论文中的实验结果表明，CLEX能够有效地将上下文窗口扩展到超过4倍或几乎8倍的训练长度，而且性能没有下降。在LongBench基准测试中，使用CLEX训练的模型在4k长度上的表现与在32k长度上训练的最先进开源模型相当。

总的来说，CLEX旨在提高大型语言模型处理长文本的能力，通过连续的PE缩放和长度外推，使得模型能够更好地理解和生成长文本序列，这对于各种NLP任务来说是一个重要的进步。

---

有哪些相关研究？

这篇论文提到的相关研究主要集中在以下几个方面：

1. **Transformer架构和大型语言模型（LLMs）**：研究如GPT-4和LLaMA等模型在自然语言处理（NLP）任务中的应用，以及它们如何处理长文本信息。
2. **上下文窗口限制**：探讨Transformer架构中预设上下文窗口的限制，以及这种限制如何影响模型处理长文本的能力。
3. **层次化架构和稀疏注意力机制**：研究如Transformer-XL和Recurrent Memory Transformer等，它们通过层次化架构或稀疏注意力机制来扩展上下文长度，尽管这可能会牺牲部分上下文信息。
4. **位置嵌入（PE）缩放方法**：研究如何通过调整位置嵌入来扩展Transformer模型的上下文长度，例如通过位置索引插值（Position Interpolation, PI）和频率基础缩放（Frequency Basis Scaling, FBS）等方法。
5. **长度外推方法**：研究如ALiBi等方法，它们通过在训练时使用较短的上下文，然后在测试时处理更长的上下文，通过引入额外的偏差来编码位置信息。
6. **连续动态系统和常微分方程（ODE）**：研究如何使用神经ODE来模拟和学习PE缩放过程中的连续动态，以便更好地适应和外推长上下文。
7. **长文本处理的实际应用**：研究如何在实际的长文本处理任务中应用这些技术，例如在LongBench基准测试中的各种任务，包括问答、摘要和代码补全等。

---

论文如何解决这个问题？

论文通过提出一种名为“Continuous Length EXtrapolation”（CLEX）的方法来解决大型语言模型（LLMs）处理长文本时受到预设上下文窗口大小限制的问题。CLEX的核心思想和解决方案包括以下几个关键步骤：

1. **连续位置嵌入（PE）缩放**：CLEX将传统的PE缩放方法推广到一个连续的动态系统中。这是通过将PE缩放方法建模为长度缩放因子上的普通微分方程（ODE）来实现的。这种方法允许模型动态地调整其上下文窗口的大小，而不是仅限于特定的长度。
2. **统一的PE缩放视角**：论文首先展示了通过位置索引缩放和频率基础缩放的各种方法本质上都是在转换频率基础。基于这个统一的视角，CLEX提出了一个连续的动态系统，该系统通过连续的动态过程来过渡频率基础，从而克服了现有PE缩放方法的局限性。
3. **使用神经ODE学习连续动态**：CLEX利用神经ODE来学习PE缩放过程中的连续动态。通过一个上下投影层来参数化这个动态，该层具有轻量级的参数，可以学习到精细的频率基础扩展。
4. **连续长度外推（CLEX）训练策略**：CLEX的训练策略允许模型在训练序列长度之外的连续动态中进行泛化。在训练过程中，通过随机采样长度缩放因子，模型能够适应广泛的频率基础，而不会对特定的频率基础过拟合。
5. **位置外推策略**：为了解决训练过程中频率基础和位置索引之间的不一致性，CLEX提出了位置外推策略。在训练步骤中，通过将训练序列的位置索引范围扩展到更大的上下文长度，从而保持与频率基础的一致性。
6. **实验验证**：论文通过在两个数据集上的实验来评估CLEX的性能：一个用于长文本语言建模的RedPajamaBook数据集子集，以及用于长文本实际任务的LongBench基准测试。实验结果表明，CLEX能够有效地将上下文窗口扩展到超过4倍或几乎8倍的训练长度，且性能没有下降。

通过这些方法，CLEX使得大型语言模型能够更有效地处理长文本，提高了模型在长文本上下文理解和生成任务中的性能，同时保持了在短文本上的性能。这些创新的方法和策略为长文本处理提供了新的解决方案，并为未来的研究和应用奠定了基础。

---

论文中进行了一系列实验来评估CLEX方法的性能，特别是在处理长文本上下文方面的能力。以下是论文中提到的主要实验：

1. **长文本语言建模**：作者在一个子集上训练了CLEX和基线模型，该子集从RedPajamaBook数据集中提取，包含大约2B个标记。这些模型在一系列评估序列长度（从4k到64k）上进行了测试，以评估它们的困惑度（Perplexity, PPL）和下一个标记预测准确率（Accuracy, ACC）。这些实验旨在展示CLEX在语言建模任务中扩展上下文窗口的能力。
2. **长文本基准测试（LongBench）**：作者还在LongBench基准测试上评估了CLEX的性能，该基准测试包含多种长文本任务，如问答、摘要和代码补全等。这些任务的评估长度范围从5k到15k。作者对LLaMA-2-7B模型使用CLEX进行了指令调整，并在4k序列长度上进行了训练，然后在16k的上下文长度上进行了测试，以便与在32k长度上训练的其他开源模型进行比较。
3. **模型扩展能力测试**：作者还测试了CLEX在不同模型大小和训练数据规模下的性能。这包括将CLEX应用于不同大小的LLaMA模型（例如7B和13B参数模型），以及在不同规模的训练数据（例如0.25B、1B和2B标记）上训练的模型。这些实验旨在评估CLEX在不同条件下的扩展能力和性能。
4. **消融研究**：为了理解CLEX中各个组件的有效性，作者进行了消融研究。这包括对连续动态、位置外推策略和神经ODE参数规模的影响进行了分析。这些实验有助于揭示CLEX方法中哪些因素对提高长文本处理能力最为关键。
5. **与其他方法的比较**：论文中还比较了CLEX与其他长度外推和PE缩放方法的性能，包括ALiBi、PI（位置插值）、Yarn等。这些比较有助于展示CLEX在长文本处理方面相对于现有技术的优势。

通过这些实验，论文全面地评估了CLEX方法的性能，并证明了它在处理长文本上下文时的有效性和优越性。实验结果表明，CLEX能够有效地扩展大型语言模型的上下文窗口，同时保持或甚至提高模型在短序列上的性能。

---

论文中使用了哪些数据集？它们分别被用来做什么？

论文中使用了两个主要的数据集来评估CLEX方法的性能：

**RedPajamaBook数据集**：这是一个用于长文本语言建模的数据集，它是从Pile-Books3和PG-19数据集收集而来的子集，包含了大约2B个标记。这个数据集被用来训练CLEX以及其他基线模型，以便在一系列评估序列长度（从4k到64k）上进行测试。在这个数据集上，模型的性能通过困惑度（Perplexity, PPL）和下一个标记预测准确率（Accuracy, ACC）来评估。这些评估指标反映了模型在语言建模任务中处理长文本的能力。  
RedPajamaBook数据集的使用主要用于以下目的：

* 训练CLEX和基线模型。
* 评估模型在不同长度序列上的语言建模性能。
* 展示CLEX在扩展上下文窗口方面的能力。

**LongBench基准测试**：这是一个多任务基准测试，包含多种长文本处理任务，如问答、摘要和代码补全等。这些任务的评估长度范围从5k到15k。LongBench基准测试用于评估CLEX在实际长文本任务中的性能。作者对LLaMA-2-7B模型使用CLEX进行了指令调整，并在4k序列长度上进行了训练，然后在16k的上下文长度上进行了测试。这个基准测试的目的是与在32k长度上训练的其他开源模型进行比较，以证明CLEX在实际应用中的有效性。  
LongBench基准测试的使用主要用于以下目的：

* 评估CLEX在多种长文本处理任务上的性能。
* 与其他长文本处理模型进行比较，以展示CLEX的优势。
* 证明CLEX方法在实际长文本应用中的有效性和实用性。

通过在这两个数据集上的实验，论文全面地评估了CLEX方法在理论和实际应用中的性能，证明了其在处理长文本上下文方面的有效性和优越性。

---

有什么可以进一步探索的点？

尽管CLEX在处理长文本上下文方面取得了显著的成果，但仍有一些潜在的研究方向和可以进一步探索的点：

1. **模型泛化能力**：虽然CLEX在特定的数据集和任务上表现出色，但进一步研究其在更广泛的数据集和不同类型的NLP任务上的泛化能力是有价值的。
2. **计算效率和优化**：探索如何进一步减少CLEX方法的计算成本和提高效率，特别是在大规模数据集和巨型模型上的应用。
3. **不同长度的动态调整**：研究CLEX在动态调整不同长度上下文窗口时的性能，以及如何更精细地控制这种调整以适应特定的应用场景。
4. **模型可解释性**：研究CLEX模型在处理长文本时的决策过程和注意力机制，以提高模型的可解释性和透明度。
5. **多模态应用**：将CLEX方法扩展到多模态任务中，例如结合文本、图像和声音的长文本生成和理解。
6. **跨语言和跨领域适应性**：研究CLEX在不同语言和领域中的适应性和迁移学习能力，以及如何通过微调来优化其性能。
7. **模型鲁棒性**：探索CLEX对抗样本和噪声数据的鲁棒性，以及如何提高模型在面对这些挑战时的稳定性和可靠性。
8. **实时应用和部署**：研究CLEX在实时或近实时应用中的性能，以及如何将其有效地部署到生产环境中。
9. **与其他NLP技术的结合**：探索将CLEX与其他NLP技术（如知识图谱、语义理解等）结合的方法，以进一步提升长文本处理的质量。
10. **伦理和社会影响**：研究CLEX在长文本生成和处理中的潜在伦理问题，以及如何确保其应用不会带来负面的社会影响。

---

总结一下论文的主要内容

这篇论文《CLEX: CONTINUOUS LENGTH EXTRAPOLATION FOR LARGE LANGUAGE MODELS》的主要内容可以总结如下：

1. **问题陈述**：论文识别了大型语言模型（LLMs）在处理长文本时受限于预设上下文窗口的问题，这限制了它们在自然语言处理（NLP）任务中的潜力。
2. **CLEX方法**：为了解决这个问题，论文提出了一种名为CLEX的新方法，它通过连续的位置嵌入（PE）缩放来扩展LLMs的上下文窗口。CLEX使用常微分方程（ODE）来模拟PE缩放过程中的连续动态，从而克服了传统PE缩放方法的局限性。
3. **核心概念**：CLEX的核心概念包括将PE缩放方法推广到连续动态系统中，以及通过神经ODE学习这些动态。这使得模型能够适应更长的上下文，即使在训练时使用的序列较短。
4. **实验评估**：论文通过在RedPajamaBook数据集上的语言建模任务和LongBench基准测试中的多种长文本任务上进行实验，来评估CLEX的性能。实验结果显示，CLEX能够有效地将上下文窗口扩展到超过4倍或几乎8倍的训练长度，且性能没有下降。
5. **消融研究**：为了验证CLEX中各个组件的有效性，论文进行了消融研究，包括连续动态、位置外推策略和神经ODE参数规模的影响分析。
6. **与其他方法的比较**：CLEX与其他长度外推和PE缩放方法（如ALiBi、PI、Yarn等）进行了比较，结果表明CLEX在长文本处理方面具有显著优势。
7. **潜在研究方向**：论文还提出了一些可以进一步探索的研究方向，包括模型泛化能力、计算效率和优化、多模态应用、跨语言和跨领域适应性等。

---

请提出本文方法架构与实现细节的五个技术问题（包括一个需要使用python代码实现的问题）并回答

1. **问题**: 如何确保CLEX方法在不同长度的上下文窗口中保持一致的性能表现？ **回答**: CLEX通过连续的PE缩放和使用神经ODE来学习长度缩放因子上的动态变化，从而适应不同长度的上下文。在训练过程中，通过随机采样长度缩放因子，模型能够适应广泛的频率基础，而不会对特定的频率基础过拟合。此外，通过在训练和测试时应用相同的位置外推策略，CLEX能够保持在不同长度上下文窗口中的一致性能。
2. **问题**: CLEX在处理非常长的文本序列时是否会遇到计算资源的限制？ **回答**: 尽管CLEX旨在处理长文本序列，但在处理极长的序列时可能会遇到计算资源的限制。为了缓解这个问题，可以探索模型并行化、梯度累积和混合精度训练等技术来提高训练效率和减少内存使用。
3. **问题**: 在实现CLEX时，如何处理和优化神经ODE的参数化？ **回答**: 神经ODE的参数化是通过一个上下投影层来实现的，该层具有轻量级的参数。可以通过调整这个层的大小、使用激活函数、以及选择合适的初始化方法来优化参数化。此外，可以使用现有的ODE求解器库（如TensorFlow的`odeint`或PyTorch的`torchdiffeq`）来实现和优化ODE的求解过程。
4. **问题**: CLEX方法是否能够与其他NLP模型架构（如BERT、XLNet）集成？ **回答**: CLEX是设计用来扩展Transformer模型的上下文窗口的，但理论上，它可以与其他使用位置嵌入的NLP模型架构集成。需要对这些模型的特定位置嵌入机制进行适配，并可能需要对模型的训练过程进行一些修改。
5. **问题**: 如何使用Python代码实现一个简化版的CLEX方法来处理一个较短的文本序列？ **回答**: 下面是一个简化版的CLEX方法的Python代码实现，用于处理较短的文本序列。这个例子没有使用真正的ODE求解器，而是通过模拟的方式来展示CLEX的核心思想。

```ruby
import torch
import torch.nn as nn
import torch.optim as optim

# 假设我们有一个小型的Transformer模型
class SmallTransformer(nn.Module):
    def __init__(self, d_model, nhead, num_layers):
        super(SmallTransformer, self).__init__()
        self.transformer = nn.Transformer(d_model, nhead, num_layers)

    def forward(self, src):
        output = self.transformer(src, src)
        return output

# 假设我们的文本序列长度为100，上下文窗口长度为10
sequence_length = 100
context_length = 10

# 初始化一个小型Transformer模型
model = SmallTransformer(d_model=512, nhead=8, num_layers=1)

# 假设我们有一个长度为sequence_length的文本序列
text_sequence = torch.randn(sequence_length, 512)  # 一个随机生成的文本序列

# CLEX的连续动态模拟
class ContinuousDynamics(nn.Module):
    def __init__(self, d_model, context_length):
        super(ContinuousDynamics, self).__init__()
        self.context_length = context_length
        self.project_layer = nn.Linear(d_model, d_model)

    def forward(self, x, length_scale):
        # 模拟连续动态的变化
        new_freq_basis = self.project_layer(x) * length_scale
        return new_freq_basis

# 初始化CLEX模块
clex_module = ContinuousDynamics(d_model=512, context_length=context_length)

# 模拟训练过程
optimizer = optim.Adam(model.parameters(), lr=1e-4)

# 假设我们有一个长度缩放因子，从1开始逐渐增加
length_scale = 1.0

# 训练循环
for epoch in range(100):
    with torch.set_grad_enabled(True):
        output = model(text_sequence)
        # 应用CLEX的连续动态
        new_freq_basis = clex_module(text_sequence, length_scale)
        # 假设我们有一个简单的损失函数
        loss = (output - new_freq_basis).pow(2).mean()
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
    
    # 更新长度缩放因子
    length_scale += 0.01

print("Training completed.")
```

---

![](https://proxy-prod.omnivore-image-cache.app/963x309,skIyr-nAknkblbRjQPds3rReLnAyY7tDMFmIrafKp9oY/https://pic2.zhimg.com/v2-37b92648f3d47fbadbd654dd77ff3389_b.jpg)

在64k上下文长度上测试的CLEX和各种基线模型的困惑度

![](https://proxy-prod.omnivore-image-cache.app/922x287,s2LcyCbksSLksY17UeDNX07OqKyqmc2HrBtX4cz4jm1Y/https://pic1.zhimg.com/v2-4fa38560857a13db4abdda3c380d1a68_b.jpg)

离散位置嵌入（PE）缩放的图形模型（左）和我们的连续PE缩放（右）

![](https://proxy-prod.omnivore-image-cache.app/957x412,sCbsFc16UY4a0CCfS2N_JcCIhUhO2MsAS_KLBzoKfY_g/https://pic2.zhimg.com/v2-d7ad4d5bb8293b231c2543c9a139460d_b.jpg)

左侧：使用7B和13B参数规模的CLEX在不同评估序列长度上的困惑度（PPLs）。右侧：CLEX在不同参数规模和评估长度下跨越变化的训练数据大小的困惑度（PPLs）。

![](https://proxy-prod.omnivore-image-cache.app/840x288,s6KRCDVIO7s-Uj8d1OsdaqawLK9_lQoT_YyOtzj5irEY/https://pic1.zhimg.com/v2-b3b2a2f70748730cb836ceecc90f5444_b.jpg)

![](https://proxy-prod.omnivore-image-cache.app/896x235,s7xuLHirA3DzkF8-VyzBWasCCgm8KEB-96leuamvKNio/https://pic3.zhimg.com/v2-d3323d883332a8d5df447ed7a04b0b82_b.jpg)

针对方程(13)中的连续动态、采样策略和λ因子的消融研究。

![](https://proxy-prod.omnivore-image-cache.app/943x373,sPAMuzsKxABtQjhyYGf0tMTiKmEHYU-D7oglt310kM6I/https://pic3.zhimg.com/v2-1d06d968ea7653752bae8f166c794fc6_b.jpg)

左侧：LongBench中每个任务领域平均分数。右侧：对应于每个模型训练长度的所有任务平均分数。请注意，CLEX是在4k序列长度上训练的，但直接在16k上下文长度上进行测试，没有截断。

---

本文首先展示了通过位置索引缩放和频率基础缩放来扩展模型上下文长度的各种方法，其实质上是对频率基础进行变换。这一观点在定理1中得到了形式化，该定理表明对于位置索引m的变换T，存在一个等效的变换T，它可以应用于频率基础θ。这个变换关系可以用方程(6)表示，其中T是一个由d/2个元素组成的向量，⊙表示逐元素变换。

证明部分通过展示方程(1)中的变换关系，说明了如何从位置索引变换到频率基础变换。通过这种变换，我们可以将PE缩放表示为一个统一的形式，即ft(x, m, θ) = f(x, m, α(t) ⊙ θ)，其中α(t)是定义在长度缩放因子t上的单变量变换。PI和Yarn方法可以看作是在这个统一公式中插入特定的α(t)时的特殊情况。

此外，本文还指出了θt = α(t) ⊙ θ表示在上下文长度为t · L时的缩放频率基础，而θ1 = θ（即α(1) = 1）。通过连续化这种渐进变换链，我们可以将PE缩放表述为一个连续动态系统，其频率基础的连续动态由dz(t)/dt表示，这是通过微分α(t)的对数得到的。

总的来说，近期的PE缩放方法通过手动制定α(t)，实际上是在应用各种频率基础的动态，以使模型能够适应更长的上下文。CLEX方法通过引入连续动态系统的概念，提供了一种新的视角，使得模型能够更灵活地适应不同长度的上下文。

![](https://proxy-prod.omnivore-image-cache.app/256x38,smsr-aLfb_xyv54jjvItl1ZIDiJQhaRAptlhB2C-CgT4/https://pic4.zhimg.com/v2-c7e76752ff18710edd6068e46d43596b_b.jpg)

![](https://proxy-prod.omnivore-image-cache.app/99x36,s8NHcf2YY2kqq-MKtXoFcvs8FUv4oPEjKOGsBFNVBbao/https://pic2.zhimg.com/v2-ef917ef6f5593ba1fd129065f20d0991_b.jpg)

![](https://proxy-prod.omnivore-image-cache.app/374x57,sF-A-wBv0Cl_ev1h2WXFDP_OakW4xTtS2hz9q0Dwq_EA/https://pic2.zhimg.com/v2-b175bcbbedbcda60a8ca90d54cfeede1_b.jpg)

![](https://proxy-prod.omnivore-image-cache.app/159x58,skWQBXV92EkWoi53YLF3FOfdOmjsL5N02qs-mdOES4mk/https://pic1.zhimg.com/v2-6e07d6017d6b9866372f495331dde428_b.jpg)

传统方法通常设计为在离散的缩放因子t值下工作，例如PI方法，它会针对特定的缩放因子t进行模型微调，以将上下文窗口长度扩展到t·L。然而，这些方法可能会导致对特定频率基础的过拟合，从而影响模型在训练长度之外的长序列上的外推能力，或者在短序列上的性能。

CLEX旨在构建一个连续的PE缩放方法，使模型能够适应连续范围内的缩放因子t，并相应地调整频率基础。在CLEX中，引入了一个变量函数g，它能够捕捉在长度扩展过程中频率基础的细微变化。为了实现这一点，CLEX使用一个神经网络ϕ来参数化这个函数g，从而得到一个神经ODE，它可以模拟在任意t'∈\[1, t\]区间内频率基础的缩放。  
具体来说，CLEX采用了一个上下投影网络，通过变换矩阵Wup和Wdown、SiLU激活函数σ以及一个标量嵌入ξt来表示。这个标量嵌入ξt是根据Yarn方法的常动态来设计的，以加速收敛过程。通过这种方法，CLEX能够在不同的上下文长度下有效地调整模型的频率基础，从而提高处理长文本的能力。  

![](https://proxy-prod.omnivore-image-cache.app/299x28,s-wKY2ul-Zvqi9FKxpNW_3pIktu4rQ4UAo5iyInugf6M/https://pic4.zhimg.com/v2-0756128c61be1123d06615b3f9edb247_b.jpg)

