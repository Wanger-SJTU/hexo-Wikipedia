## 对标竞品

[ChatRWKV 项目](https://zhuanlan.zhihu.com/p/603840957?utm_campaign=&utm_medium=social&utm_oi=31223103619072&utm_psn=1635420086210093056&utm_source=md.obsidian)

## 量化


[GPTQ-for-LLaMa 量化分析和优化](https://zhuanlan.zhihu.com/p/625701227?utm_campaign=&utm_medium=social&utm_oi=31223103619072&utm_psn=1635420670166376448&utm_source=md.obsidian)

RLHF



## 本地知识库

基于LLM构建私有知识库问答系统目前存在一个共性问题，由于输入词数限制和选用模型本身的摘要能力影响，导致回答的问题经常会出现信息丢失的问题。

我们也在实践中发现了这个问题，以至于我自己观察到一种有趣行为模式：由于不确信大模型返回的问答结果，不得不每次再找到原始文档的相关段落后再次检查回答是否正确。当存在多文档内容引用时，还要检查相关的文档本身是否可信。

以实际场景举例，1-客服FAQ问答，我们更希望模型按照原始FAQ文档中内容进行精准回答，不要丢失信息或者自我发挥。2-科研学术论文问答，当对整篇论文进行摘要问答时，用户同样会非常关心回答的严谨性。

所有基于私有知识的问答系统，都最终要追溯到”问答质量“这个根本问题上。

Semantra这个项目提出一个很好的想法，只采用向量化模型来进行相似度语义检索，放弃了通过大模型来进行文本段落的摘要和回答，所以定位就变成了一个轻量化的语义检索工具。虽然少了对话问答的交互看起来没有那么炫酷，但对于有文档知识精准引用要求且又想利用语义检索优势的场景，也是一种不错的选择。

当然我们也考虑过在工具的交互层面上优化体验，比如同时显示引用片段和摘要结果，方便比对内容可信度。或者先检索，再根据检索到TopK结果做人为确认后的摘要，这都要根据实际应用场景来设计。

项目地址：github.com/freedmand/semantra



## 4bit量化

https://github.com/huggingface/transformers/pull/23479


This PR introduces 4-bit QLoRA to transformers. The main changes are for the bitsandbytes config. Additionally, we added one change to the LLaMA implementation where there is a bug that the data type chances if layer norms are in 32-bit and the rest is in bf16.

More information about QLoRA from our abstract:

> We develop QLoRA tuning, a method that finetunes by backpropagating gradients through a frozen 4-bit base model into low rank adapters (LoRA). With QLoRA tuning we can finetune 30B/65B parameter models on 24/48GB GPUs while preserving regular 16-bit full finetuning runtime and task performance. We achieve the memory efficiency and quantization precision through a combination of new methods: nested quantization to reduce the average memory footprint from 4.5 to 4.1 bits per parameter, paged optimizers to manage gradient checkpointing memory spikes, and a new data type, 4-bit NormalFloat (NF4), which is information theoretically and empirically optimal for normally distributed weights. To demonstrate the effectiveness and ease of use of QLoRA tuning we finetune more than 1,000 models to create a detailed dissection of instruction following performance across datasets (FLAN, Alpaca, Chip2, SuperNatural Instructions, Chip2, AnthropicHH), models types (LLaMA, T5), and model scales (125M to 65B). A discussion of the results is forthcoming in our paper.