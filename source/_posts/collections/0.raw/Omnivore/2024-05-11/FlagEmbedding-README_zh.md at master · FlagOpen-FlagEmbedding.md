---
title: FlagEmbedding/READMEzh.md at master · FlagOpen/FlagEmbedding
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-05-11/FlagEmbedding-README_zh.md-at-master-·-FlagOpen-FlagEmbedding/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: 92ae0bf7-2dbd-4b06-a7af-a1a33029da3c
---

# FlagEmbedding/README_zh.md at master · FlagOpen/FlagEmbedding
#Omnivore

[Read on Omnivore](https://omnivore.app/me/flag-embedding-readme-zh-md-at-master-flag-open-flag-embedding-18f65a406db)
[Read Original](https://github.com/FlagOpen/FlagEmbedding/blob/master/README_zh.md)



## FlagEmbedding

[](#flagembedding)

[ ![Build](https://proxy-prod.omnivore-image-cache.app/0x0,sJbAxpRpnPyUMQDPRlLDS8i4ByEI2RCGmiMS2EvXz9zU/https://camo.githubusercontent.com/fb572bdbba39fab01daa5e6d8b56b8e37767e9e2825523e5022272035df7146a/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f4d61646520776974682d507974686f6e2d707572706c65) ](https://www.python.org/) [ ![License](https://proxy-prod.omnivore-image-cache.app/0x0,sB30Nlgt4S-nX2u_SnQQsBCbmJgvKVI4zJdzMSrbmOOg/https://camo.githubusercontent.com/86889d4f4340b330e3ee268cba9d76ee678ac121f9dae48e1f913655dd8e0e5f/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f4c4943454e53452d4d49542d677265656e) ](https://github.com/FlagOpen/FlagEmbedding/blob/master/LICENSE) [ ![License](https://proxy-prod.omnivore-image-cache.app/0x0,sUwoMHdEzakrOUvfWbC9oymk-5GSKGLkk_-STi8Dnfxs/https://camo.githubusercontent.com/d8217e9233b7e6934f263a8c713364bb9b014277ee215716c097e8ef667ee398/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f435f4d5445422df09fa4972d79656c6c6f77) ](https://huggingface.co/C-MTEB) [ ![License](https://proxy-prod.omnivore-image-cache.app/0x0,s3R_ZmWv4-PqERkzthlxhkJTepv9CQCOSvXhp-ifQUFo/https://camo.githubusercontent.com/24cd7c1de4f165cf09c76a54e1b53294e69832ecb9ff29deef6cfcf9485926e6/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f756e6976657273616c20656d62656464696e672d312e312d726564) ](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding) 

#### 

[更新](#更新) |[项目](#项目) |[模型列表](#模型列表) |[Citation](#citation) |[License](#license) 

[](#------------更新---------项目---------模型列表---------citation---------license-----)

[English](https://github.com/FlagOpen/FlagEmbedding/blob/master/README.md) | [中文](https://github.com/FlagOpen/FlagEmbedding/blob/master/README%5Fzh.md)

FlagEmbedding专注于检索增强llm领域，目前包括以下项目:

* <strong>Long-Context LLM</strong>: [Activation Beacon](https://github.com/FlagOpen/FlagEmbedding/tree/master/Long%5FLLM/activation%5Fbeacon), [LongLLM QLoRA](https://github.com/FlagOpen/FlagEmbedding/tree/master/Long%5FLLM/longllm%5Fqlora)
* <strong>Fine-tuning of LM</strong> : [LM-Cocktail](https://github.com/FlagOpen/FlagEmbedding/tree/master/LM%5FCocktail)
* <strong>Embedding Model</strong>: [Visualized-BGE](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding/visual), [BGE-M3](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding/BGE%5FM3), [LLM Embedder](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding/llm%5Fembedder), [BGE Embedding](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding/baai%5Fgeneral%5Fembedding)
* <strong>Reranker Model</strong>: [llm rerankers](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding/llm%5Freranker), [BGE Reranker](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding/reranker)
* <strong>Benchmark</strong>: [C-MTEB](https://github.com/FlagOpen/FlagEmbedding/tree/master/C%5FMTEB)

## 更新

[](#更新)

* 4/30/2024: 发布[Llama-3-8B-Instruct-80K-QLoRA](https://huggingface.co/namespace-Pt/Llama-3-8B-Instruct-80K-QLoRA), 其通过在少量合成的长文本数据上的QLoRA训练，有效地将Llama-3-8B-Instruct的上下文长度从8K扩展到80K。详见[代码](https://github.com/FlagOpen/FlagEmbedding/tree/master/Long%5FLLM/longllm%5Fqlora) 🔥
* 3/18/2024: 发布新的[rerankers](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding/llm%5Freranker), 拥有更好的性能同时支持多语言和长文本。 🔥
* 3/18/2024: 发布[Visualized-BGE](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding/visual)，该项目通过引入image token embedding赋予BGE视觉编码能力。Visualized-BGE可以对混合图文数据进行编码，用于广泛的混合模态检索任务。 🔥
* 1/30/2024: 发布<strong>BGE-M3</strong>, 第一个具有多功能、多语言和多粒度特性的文本检索模型，高效支持多语言（100+语言）、长文本（至多8192长度的输入文本）、和混合检索（稠密、稀疏、多向量）。 详见[report](https://github.com/FlagOpen/FlagEmbedding/blob/master/FlagEmbedding/BGE%5FM3/BGE%5FM3.pdf)和[代码](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding/BGE%5FM3) 🔥
* 1/9/2024: 发布[Activation-Beacon](https://github.com/FlagOpen/FlagEmbedding/tree/master/Long%5FLLM/activation%5Fbeacon), 一个有效、高效、兼容、低成本（训练）的扩展大预言模型上下文长度的方法。[技术报告](https://arxiv.org/abs/2401.03462)
* 12/24/2023: 发布<strong>LLaRA</strong>, 一个基于LLaMA-7B的稠密检索模型, MS MARCO与BEIR上取得了迄今最好的实验结果. 模型与代码将会陆续开源. 敬请关注. [技术报告](https://arxiv.org/abs/2312.15503)
* 11/23/2023: 发布[LM-Cocktail](https://github.com/FlagOpen/FlagEmbedding/tree/master/LM%5FCocktail), 一种通过模型融合在微调时保持原有模型通用能力的方法. [技术报告](https://arxiv.org/abs/2311.13534)
* 10/12/2023: 发布 [LLM-Embedder](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding/llm%5Fembedder), 专为大语言模型<strong>各种检索增强任务设计</strong>的英文向量模型。[技术报告](https://arxiv.org/pdf/2310.07554.pdf)
* 09/12/2023: 更新：  
   * <strong>新增重排模型</strong>：开源交叉编码器模型bge-reranker，具有比向量模型更强大的排序能力。非常建议使用或者微调它来重新排序向量模型返回的top-k文档，提高最终结果的相关性。  
   * <strong>更新向量模型</strong>：发布bge-\*-v1.5向量模型，缓解相似度分布问题，提升无指令情况下的检索能力（但检索任务仍建议使用指令）
* 08/09/2023: BGE模型整合入Langchain, 可以在langchain中非常简单的[使用它](#using-langchain); C-MTEB中文榜单已[在线更新](https://huggingface.co/spaces/mteb/leaderboard).
* 08/05/2023: 发布更小的模型(base, small), <strong>在同尺寸模型中取得最好的性能！ 🤗</strong>
* 08/02/2023: 🎉 🎉 发布中英文向量模型BGE(BAAI General Embedding的缩写), <strong>在MTEB和C-MTEB榜单上取得最好的性能</strong>

## 项目

[](#项目)

在这个项目中，我们发布了BGE-M3，它是第一个具有多功能、多语言和多粒度特性的文本检索模型。

* 多功能:可以同时执行三种检索功能：单向量检索、多向量检索和稀疏检索。
* 多语言:支持100多种工作语言。
* 多粒度:它能够处理不同粒度的输入，从短句子到长达8192个词汇的长文档。

在本项目中，为了提高单一检索模式的性能，提出了一种新的自知识蒸馏方法。 我们优化了批处理策略，支持大批处理大小，这可以在对长文本或大型语言模型进行向量微调时简单使用。 我们还构建了一个用于文档检索的数据集，并提出了一个简单的策略来提高长文本的建模能力。<strong>训练代码和微调数据将在不久的将来开源。</strong>

在这个项目中，我们发布了Visualized-BGE。 通过引入image token embedding，Visualized-BGE可以被用来编码混合图文数据。它可以被应用在广泛的多模态检索任务中，包括但不限于：多模态知识检索，多模态查询的图像检索等。

我们通过 QLoRA 微调将 Llama-3-8B-Instruct 的上下文长度从 8K 扩展到 80K。 整个训练过程非常高效，在一台8xA800 (80G) GPU 机器上仅需要8个小时。 该模型在NIHS、主题检索和长上下文语言理解等广泛的评估任务中表现出卓越的性能； 同时，它在短上下文中也很好地保留了其原有的能力。 如此强大的长文本能力主要归因于GPT-4生成的仅3.5K合成数据，这表明LLM具有扩展其原始上下文的固有（但在很大程度上被低估）潜力。 事实上，一旦有更多的计算资源，该方法可以将上下文长度扩展更长。

由于有限的上下文窗口长度，有效利用长上下文信息是对大型语言模型的一个巨大挑战。 Activation Beacon 将 LLM 的原始激活压缩为更紧凑的形式，以便它可以在有限的上下文窗口中感知更长的上下文。 它是一种有效、高效、兼容、低成本（训练）的延长LLM上下文长度的方法。 更多细节请参考[技术报告](https://arxiv.org/abs/2401.03462)和[代码](https://github.com/FlagOpen/FlagEmbedding/tree/master/Long%5FLLM/activation%5Fbeacon)。

模型合并被用于提高单模型的性能。 我们发现这种方法对大型语言模型和文本向量模型也很有用， 并设计了”语言模型鸡尾酒“方案，其自动计算融合比例去融合基础模型和微调模型。 利用LM-Cocktail可以缓解灾难性遗忘问题，即在不降低通用性能的情况下提高目标任务性能。 通过构造少量数据样例，它还可以用于为新任务生成模型，而无需进行微调。 它可以被使用来合并生成模型或向量模型。 更多细节请参考[技术报告](https://arxiv.org/abs/2311.13534)和[代码](https://github.com/FlagOpen/FlagEmbedding/tree/master/LM%5FCocktail)。

LLM-Embedder向量模型是根据LLM的反馈进行微调的。 它可以支持大型语言模型的检索增强需求，包括知识检索、记忆检索、示例检索和工具检索。 它在6个任务上进行了微调:问题回答，对话搜索，长对话， 长文本建模、上下文学习和工具学习。 更多细节请参考[./FlagEmbedding/llm\_embedder/README.md](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding/llm%5Fembedder)

交叉编码器将对查询和答案实时计算相关性分数，这比向量模型(即双编码器)更准确，但比向量模型更耗时。 因此，它可以用来对嵌入模型返回的前k个文档重新排序。 我们在多语言数据上训练了交叉编码器，数据格式与向量模型相同，因此您可以根据我们的[示例](https://github.com/FlagOpen/FlagEmbedding/tree/master/examples/reranker) 轻松地对其进行微调。 更多细节请参考[./FlagEmbedding/reranker/README.md](https://github.com/FlagOpen/FlagEmbedding/blob/master/FlagEmbedding/reranker/README.md)

我们提供了新版的交叉编码器，支持更多的语言以及更长的长度。使用的数据格式与向量模型类似，但是新增了prompt用于微调以及推理。您可以使用特定的层进行推理或使用完整的层进行推理，您可以根根据我们的[示例](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding/llm%5Freranker#fine-tune) 轻松地对其进行微调。 更多细节请参考[./FlagEmbedding/llm\_reranker/README.md](https://github.com/FlagOpen/FlagEmbedding/blob/master/FlagEmbedding/llm%5Freranker/README.md)

BGE Embedding是一个通用向量模型。 我们使用[retromae](https://github.com/staoxiao/RetroMAE) 对模型进行预训练，再用对比学习在大规模成对数据上训练模型。<strong>你可以按照我们的[示例](https://github.com/FlagOpen/FlagEmbedding/tree/master/examples/finetune) 在本地数据上微调嵌入模型。</strong>我们还提供了一个[预训练示例](https://github.com/FlagOpen/FlagEmbedding/tree/master/examples/pretrain) 。 请注意，预训练的目标是重构文本，预训练后的模型无法直接用于相似度计算，需要进行微调之后才可以用于相似度计算。 更多关于bge的训练情况请参阅[论文](https://arxiv.org/pdf/2309.07597.pdf)和[代码](https://github.com/FlagOpen/FlagEmbedding/blob/master/FlagEmbedding/baai%5Fgeneral%5Fembedding/README.md).

<strong>注意BGE使用CLS的表征作为整个句子的表示，如果使用了错误的方式（如mean pooling)会导致效果很差。</strong>

中文向量榜单，已整合入MTEB中。更多细节参考 [论文](https://arxiv.org/pdf/2309.07597.pdf) 和[代码](https://github.com/FlagOpen/FlagEmbedding/tree/master/C%5FMTEB).

## 模型列表

[](#模型列表)

| Model                                                                     | Language            | Description                                                                                                                                                                       | query instruction for retrieval \[1\]  |                                                                                                 |
| ------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [BAAI/bge-m3](https://huggingface.co/BAAI/bge-m3)                         | Multilingual        | [推理](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding/BGE%5FM3#usage) [微调](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding/BGE%5FM3)       | 多功能（向量检索，稀疏检索，多表征检索）、多语言、多粒度（最大长度8192） |                                                                                                 |
| [LM-Cocktail](https://huggingface.co/Shitao)                              | English             | 微调的Llama和BGE模型，可以用来复现LM-Cocktail论文的结果                                                                                                                                             |                                        |                                                                                                 |
| [BAAI/llm-embedder](https://huggingface.co/BAAI/llm-embedder)             | English             | [推理](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding/llm%5Fembedder) [微调](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding/llm%5Fembedder) | 专为大语言模型各种检索增强任务设计的向量模型                 | 详见 [README](https://github.com/FlagOpen/FlagEmbedding/tree/master/FlagEmbedding/llm%5Fembedder) |
| [BAAI/bge-reranker-large](https://huggingface.co/BAAI/bge-reranker-large) | Chinese and English | [推理](#usage-for-reranker) [微调](https://github.com/FlagOpen/FlagEmbedding/tree/master/examples/reranker)                                                                           | 交叉编码器模型，精度比向量模型更高但推理效率较低 \[2\]         |                                                                                                 |
| [BAAI/bge-reranker-base](https://huggingface.co/BAAI/bge-reranker-base)   | Chinese and English | [推理](#usage-for-reranker) [微调](https://github.com/FlagOpen/FlagEmbedding/tree/master/examples/reranker)                                                                           | 交叉编码器模型，精度比向量模型更高但推理效率较低 \[2\]         |                                                                                                 |
| [BAAI/bge-large-en-v1.5](https://huggingface.co/BAAI/bge-large-en-v1.5)   | English             | [推理](#usage-for-embedding-model) [微调](https://github.com/FlagOpen/FlagEmbedding/tree/master/examples/finetune)                                                                    | 1.5版本，相似度分布更加合理                        | Represent this sentence for searching relevant passages:                                        |
| [BAAI/bge-base-en-v1.5](https://huggingface.co/BAAI/bge-base-en-v1.5)     | English             | [推理](#usage-for-embedding-model) [微调](https://github.com/FlagOpen/FlagEmbedding/tree/master/examples/finetune)                                                                    | 1.5版本，相似度分布更加合理                        | Represent this sentence for searching relevant passages:                                        |
| [BAAI/bge-small-en-v1.5](https://huggingface.co/BAAI/bge-small-en-v1.5)   | English             | [推理](#usage-for-embedding-model) [微调](https://github.com/FlagOpen/FlagEmbedding/tree/master/examples/finetune)                                                                    | 1.5版本，相似度分布更加合理                        | Represent this sentence for searching relevant passages:                                        |
| [BAAI/bge-large-zh-v1.5](https://huggingface.co/BAAI/bge-large-zh-v1.5)   | Chinese             | [推理](#usage-for-embedding-model) [微调](https://github.com/FlagOpen/FlagEmbedding/tree/master/examples/finetune)                                                                    | 1.5版本，相似度分布更加合理                        | 为这个句子生成表示以用于检索相关文章：                                                                             |
| [BAAI/bge-base-zh-v1.5](https://huggingface.co/BAAI/bge-base-zh-v1.5)     | Chinese             | [推理](#usage-for-embedding-model) [微调](https://github.com/FlagOpen/FlagEmbedding/tree/master/examples/finetune)                                                                    | 1.5版本，相似度分布更加合理                        | 为这个句子生成表示以用于检索相关文章：                                                                             |
| [BAAI/bge-small-zh-v1.5](https://huggingface.co/BAAI/bge-small-zh-v1.5)   | Chinese             | [推理](#usage-for-embedding-model) [微调](https://github.com/FlagOpen/FlagEmbedding/tree/master/examples/finetune)                                                                    | 1.5版本，相似度分布更加合理                        | 为这个句子生成表示以用于检索相关文章：                                                                             |
| [BAAI/bge-large-en](https://huggingface.co/BAAI/bge-large-en)             | English             | [推理](#usage-for-embedding-model) [微调](https://github.com/FlagOpen/FlagEmbedding/tree/master/examples/finetune)                                                                    | 向量模型，将文本转换为向量                          | Represent this sentence for searching relevant passages:                                        |
| [BAAI/bge-base-en](https://huggingface.co/BAAI/bge-base-en)               | English             | [推理](#usage-for-embedding-model) [微调](https://github.com/FlagOpen/FlagEmbedding/tree/master/examples/finetune)                                                                    | base-scale 向量模型                        | Represent this sentence for searching relevant passages:                                        |
| [BAAI/bge-small-en](https://huggingface.co/BAAI/bge-small-en)             | English             | [推理](#usage-for-embedding-model) [微调](https://github.com/FlagOpen/FlagEmbedding/tree/master/examples/finetune)                                                                    | small-scale 向量模型                       | Represent this sentence for searching relevant passages:                                        |
| [BAAI/bge-large-zh](https://huggingface.co/BAAI/bge-large-zh)             | Chinese             | [推理](#usage-for-embedding-model) [微调](https://github.com/FlagOpen/FlagEmbedding/tree/master/examples/finetune)                                                                    | 向量模型，将文本转换为向量                          | 为这个句子生成表示以用于检索相关文章：                                                                             |
| [BAAI/bge-base-zh](https://huggingface.co/BAAI/bge-base-zh)               | Chinese             | [推理](#usage-for-embedding-model) [微调](https://github.com/FlagOpen/FlagEmbedding/tree/master/examples/finetune)                                                                    | base-scale 向量模型                        | 为这个句子生成表示以用于检索相关文章：                                                                             |
| [BAAI/bge-small-zh](https://huggingface.co/BAAI/bge-small-zh)             | Chinese             | [推理](#usage-for-embedding-model) [微调](https://github.com/FlagOpen/FlagEmbedding/tree/master/examples/finetune)                                                                    | small-scale 向量模型                       | 为这个句子生成表示以用于检索相关文章：                                                                             |

## Contributors:

[](#contributors)

[ ![](https://proxy-prod.omnivore-image-cache.app/0x0,skIepOyL5_UHa2UghWwnKXdvSU2mncSXCw6dqTEMBcVo/https://camo.githubusercontent.com/34f4a0fa20eed90c3b4e26d8818f19ea644a62fe99f36130ffb4ed54061fe6b2/68747470733a2f2f636f6e747269622e726f636b732f696d6167653f7265706f3d466c61674f70656e2f466c6167456d62656464696e67) ](https://github.com/FlagOpen/FlagEmbedding/graphs/contributors) 

## Citation

[](#citation)

如果您觉得我们的工作有所帮助，请考虑点个星 ⭐ 和引用以下论文:

```dust
@misc{cocktail,
      title={LM-Cocktail: Resilient Tuning of Language Models via Model Merging}, 
      author={Shitao Xiao and Zheng Liu and Peitian Zhang and Xingrun Xing},
      year={2023},
      eprint={2311.13534},
      archivePrefix={arXiv},
      primaryClass={cs.CL}
}

@misc{llm_embedder,
      title={Retrieve Anything To Augment Large Language Models}, 
      author={Peitian Zhang and Shitao Xiao and Zheng Liu and Zhicheng Dou and Jian-Yun Nie},
      year={2023},
      eprint={2310.07554},
      archivePrefix={arXiv},
      primaryClass={cs.IR}
}

@misc{bge_embedding,
      title={C-Pack: Packaged Resources To Advance General Chinese Embedding}, 
      author={Shitao Xiao and Zheng Liu and Peitian Zhang and Niklas Muennighoff},
      year={2023},
      eprint={2309.07597},
      archivePrefix={arXiv},
      primaryClass={cs.CL}
}

```

## License

[](#license)

FlagEmbedding基于[MIT License](https://github.com/FlagOpen/FlagEmbedding/blob/master/LICENSE)开源协议。

