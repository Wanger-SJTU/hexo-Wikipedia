---
title: Early Fusion 与 Late Fusion：多模态大模型的两种核心范式
date: "2026-02-26 00:00:00"
updated: "2026-02-26 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/Early-Fusion-与-Late-Fusion-多模态大模型的两种核心范式/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2008312941645149174
---


多模态大模型在处理视觉、语音与文本的跨模态交互时，Early Fusion 与 Late Fusion 是两种核心的架构范式。

### 一、 Early Fusion

在 MLLM 语境下，早期融合通常指原生多模态架构。模型没有深层、独立的不同模态编码器，而是在输入层将所有模态转换为统一格式（如 Token 或连续向量），随后输入到同一个 Transformer 骨干网络中进行联合计算。

#### 1. 架构特点

- **统一的输入空间**：图像、音频等非文本模态被直接切块（Patch）或通过离散化分词器（如 VQ-VAE）转化为 Token 序列，与文本 Token 拼接在一起。
- **深层跨模态交互**：不同模态的信息从 Transformer 的第一层就开始进行 Self-Attention 计算，模态间的特征融合贯穿整个网络的深度。
- **代表模型**：Meta Chameleon、Adept Fuyu、Google Gemini（部分原生特性）。

#### 2. 工程实现与挑战

- **数据预处理**：需要构建高度复杂的 Interleaved 多模态数据集。工程上需要精细处理不同模态 Token 的位置编码，例如为图像块分配二维位置编码，为文本分配一维位置编码。
- **Tokenizer 设计**：如果是离散化早期融合，需要训练高质量的视觉/音频 Tokenizer，使得非文本模态的离散 Token 具备良好的信息压缩率和语义表达能力。
- **计算复杂度**：序列长度极长。图像转化为 Token 后会大幅增加 Context Window 的压力，对 KV Cache 的显存占用极高。工程上常需要引入 Ring Attention 或长序列优化技术。
- **训练成本**：通常需要从头开始预训练，对算力和数据规模的要求极高，很难直接复用现有的单模态预训练权重。

### 二、 Late Fusion

在现阶段的开源 MLLM 中，最主流的范式实际上是这种基于特征对齐的晚期融合（有时也被细分为中期融合）。它依赖于预训练好的独立单模态编码器，在深层特征空间进行模态拼接或交叉注意力映射。

#### 1. 架构特点

- **模块化解耦**：包含独立的模态编码器（如处理图像的 CLIP-ViT）、对齐连接器（Connector/Adapter）和 LLM 骨干网络。
- **浅层跨模态交互**：视觉或音频先在自身的编码器中提取出高维抽象特征，然后通过连接器映射到 LLM 的文本词 Embedding 空间中，LLM 本质上还是在处理被伪装成文本的视觉特征。
- **代表模型**：LLaVA 系列、Qwen-VL、Flamingo。

#### 2. 工程实现与挑战

- **连接器（Connector）设计**：工程重点在于如何将视觉特征高效压缩并映射到 LLM 空间。常见的实现包括：

- **线性投影/MLP**（如 LLaVA）：直接对 ViT 输出的特征进行线性变换。实现简单，但 Token 数量不减。
- **Q-Former**（如 BLIP-2）：通过一组可学习的 Query 与视觉特征进行 Cross-Attention，既能对齐语义也能压缩 Token 数量。
- **Perceiver Resampler**（如 Flamingo）：类似 Q-Former 的注意力池化机制。

- **多阶段训练范式**：

- **阶段一（特征对齐）**：冻结独立的编码器和 LLM，仅训练 Connector，使用大量的图文对数据建立基础联系。
- **阶段二（指令微调）**：解冻 LLM（或部分解冻），使用高质量的多模态对话数据进行 SFT，提升模型的逻辑推理和遵循指令的能力。

- **计算与成本优势**：可以无缝接入社区最前沿的开源大语言模型和视觉模型，训练只需关注连接层的参数，成本极低，迭代速度快。

### 三、 核心差异总结

维度Early FusionLate Fusion模态对齐位置输入层（Input Token Level）特征层（Feature/Embedding Level）网络结构单一主干网络（Unified Transformer）组合网络（Encoder + Connector + LLM）训练成本与难度极高（需从头预训练，收敛困难）较低（多阶段微调，复用预训练权重）跨模态推理能力潜力大，模态间特征融合更充分受限于独立编码器的能力上限（如 CLIP 丢失细粒度特征）多模态生成（Any-to-Any）容易实现（原生支持输出图像/音频 Token）困难（通常需外接 Diffusion 模型等额外解码器）Early Fusion 完全不同于传统的 ViT + LLM 结构。

常见的 ViT + LLM（如 LLaVA）是拼图，有独立的视觉编码器和语言模型；而 Early Fusion 是原生一体，只有一个共享的大脑。

在 ViT + LLM 结构中，图像必须先经过一个完整的、拥有几十层 Transformer 结构的 ViT。ViT 把底层的像素特征逐步抽象成高层语义特征后，才把最终结果交给 LLM。模态之间的融合发生在网络的极深处；而在 Early Fusion 架构中，图像和文本在进入主干网络的第一层之前，就被强行拉平到了同一个维度和格式。

**如何理解转换为统一格式（Token 或连续向量）？****我们可以把主干网络 Transformer 想象成一个只能处理一维向量序列的机器。文本天生就是离散序列，而图像是二维矩阵，音频是连续波形。在输入层统一格式，就是把图像和音频也变成一维序列。
工程上通常有两种实现路径：
1. 转换为连续向量（Patch-based）****这是最直接的方式。
操作**：直接把一张完整的图像切成若干个小 Patch，比如 16x16 像素的网格。**展平**：通过一个简单的线性映射层，将每个二维的 Patch 展平压缩成一个一维的连续向量。这个向量的维度正好和文本的 Embedding 维度一致。**拼接**：将这些图像 Patch 向量与文本的 Embedding 向量直接拼接成一个超长序列，送入主干网络的第一层。**代表**：Adept Fuyu 架构就采用了这种简单粗暴的切块方式。**2. 转换为离散 Token（Token-based）****这种方式试图让图像完全向文本的格式靠拢。
操作**：预先训练一个视觉 Tokenizer（通常是基于 VQ-VAE 等离散化自编码器技术）。**量化**：这个 Tokenizer 包含一个视觉词表。它扫描图像，并把图像区域映射为词表中的离散 ID（类似文本里的词汇 ID）。**映射**：把这些离散的视觉 ID 像查字典一样转成 Embedding 向量，再和文本向量拼接。**代表**：Meta 的 Chameleon 模型就是将图像和文本全部转换为离散 Token 后进行联合预训练。
