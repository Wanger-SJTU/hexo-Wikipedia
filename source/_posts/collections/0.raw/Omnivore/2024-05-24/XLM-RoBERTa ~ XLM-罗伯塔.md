---
id: 914d4d4f-5b97-4527-b503-5573e302a5e6
---

# XLM-RoBERTa ~ XLM-罗伯塔
#Omnivore

[Read on Omnivore](https://omnivore.app/me/xlm-ro-ber-ta-xlm-18fa9f28ed7)
[Read Original](https://huggingface.co/docs/transformers/model_doc/xlm-roberta)



The XLM-RoBERTa model was proposed in [Unsupervised Cross-lingual Representation Learning at Scale](https://arxiv.org/abs/1911.02116) by Alexis Conneau, Kartikay Khandelwal, Naman Goyal, Vishrav Chaudhary, Guillaume Wenzek, Francisco Guzmán, Edouard Grave, Myle Ott, Luke Zettlemoyer and Veselin Stoyanov. It is based on Facebook’s RoBERTa model released in 2019\. It is a large multi-lingual language model, trained on 2.5TB of filtered CommonCrawl data.XLM-RoBERTa 模型是由 Alexis Conneau、Kartikay Khandelwal、Naman Goyal、Vishrav Chaudhary、Guillaume Wenzek、Francisco Guzmán、Edouard Grave、Myle Ott、Luke Zettlemoyer 和 Veselin Stoyanov 在《大规模无监督跨语言表示学习》中提出的。它基于 Facebook 2019 年发布的 RoBERTa 模型。它是一个大型多语言语言模型，在 2.5TB 过滤后的 CommonCrawl 数据上进行训练。

_This paper shows that pretraining multilingual language models at scale leads to significant performance gains for a wide range of cross-lingual transfer tasks. We train a Transformer-based masked language model on one hundred languages, using more than two terabytes of filtered CommonCrawl data. Our model, dubbed XLM-R, significantly outperforms multilingual BERT (mBERT) on a variety of cross-lingual benchmarks, including +13.8% average accuracy on XNLI, +12.3% average F1 score on MLQA, and +2.1% average F1 score on NER. XLM-R performs particularly well on low-resource languages, improving 11.8% in XNLI accuracy for Swahili and 9.2% for Urdu over the previous XLM model. We also present a detailed empirical evaluation of the key factors that are required to achieve these gains, including the trade-offs between (1) positive transfer and capacity dilution and (2) the performance of high and low resource languages at scale. Finally, we show, for the first time, the possibility of multilingual modeling without sacrificing per-language performance; XLM-Ris very competitive with strong monolingual models on the GLUE and XNLI benchmarks. We will make XLM-R code, data, and models publicly available.本文表明，大规模预训练多语言语言模型可以为各种跨语言迁移任务带来显着的性能提升。我们使用超过 2 TB 的已过滤 CommonCrawl 数据，在一百种语言上训练基于 Transformer 的屏蔽语言模型。我们的模型被称为 XLM-R，在各种跨语言基准上显着优于多语言 BERT (mBERT)，包括 XNLI 上的平均准确率 +13.8%、MLQA 上的平均 F1 分数 +12.3% 以及 MLQA 上的平均 F1 分数 +2.1% NER。 XLM-R 在低资源语言上的表现尤其出色，与之前的 XLM 模型相比，斯瓦希里语的 XNLI 准确率提高了 11.8%，乌尔都语的 XNLI 准确率提高了 9.2%。我们还对实现这些收益所需的关键因素进行了详细的实证评估，包括（1）正向转移和容量稀释以及（2）大规模和低资源语言的性能之间的权衡。最后，我们首次展示了在不牺牲每种语言性能的情况下进行多语言建模的可能性； XLM-Ri 在 GLUE 和 XNLI 基准测试中与强大的单语言模型非常有竞争力。我们将公开 XLM-R 代码、数据和模型。_

This model was contributed by [stefan-it](https://huggingface.co/stefan-it). The original code can be found [here](https://github.com/pytorch/fairseq/tree/master/examples/xlmr).该模型由 stefan-it 贡献。原始代码可以在这里找到。

A list of official Hugging Face and community (indicated by 🌎) resources to help you get started with XLM-RoBERTa. If you’re interested in submitting a resource to be included here, please feel free to open a Pull Request and we’ll review it! The resource should ideally demonstrate something new instead of duplicating an existing resource.官方 Hugging Face 和社区（由 🌎 表示）资源列表可帮助您开始使用 XLM-RoBERTa。如果您有兴趣提交要包含在此处的资源，请随时打开 Pull 请求，我们将对其进行审核！理想情况下，资源应该展示新的东西，而不是重复现有的资源。

This implementation is the same as RoBERTa. Refer to the [documentation of RoBERTa](https://huggingface.co/docs/transformers/model%5Fdoc/roberta) for usage examples as well as the information relative to the inputs and outputs.此实现与 RoBERTa 相同。有关使用示例以及与输入和输出相关的信息，请参阅 RoBERTa 的文档。

### class班级 transformers.XLMRobertaConfig变压器.XLMRobertaConfig

[](#transformers.XLMRobertaConfig) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/configuration%5Fxlm%5Froberta.py#L28)

( vocab\_size \= 30522hidden\_size \= 768num\_hidden\_layers \= 12num\_attention\_heads \= 12intermediate\_size \= 3072hidden\_act \= 'gelu'hidden\_dropout\_prob \= 0.1attention\_probs\_dropout\_prob \= 0.1max\_position\_embeddings \= 512type\_vocab\_size \= 2initializer\_range \= 0.02layer\_norm\_eps \= 1e-12pad\_token\_id \= 1bos\_token\_id \= 0eos\_token\_id \= 2position\_embedding\_type \= 'absolute'use\_cache \= Trueclassifier\_dropout \= None\*\*kwargs )（vocab\_size = 30522hidden\_​​size = 768num\_hidden\_​​layers = 12num\_attention\_heads = 12intermediate\_size = 3072hidden\_​​act ='gelu'hidden\_​​dropout\_prob = 0.1attention\_probs\_dropout\_prob = 0.1max\_position\_embeddings = 512type\_vocab\_size = 2initializer\_range = 0。 02layer\_norm\_eps = 1e-12pad\_token\_id = 1bos\_token\_id = 0eos\_token\_id = 2position\_embedding\_type = '绝对'use\_cache = Trueclassifier\_dropout = 无\* \*夸格斯） 

This is the configuration class to store the configuration of a [XLMRobertaModel](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaModel) or a [TFXLMRobertaModel](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.TFXLMRobertaModel). It is used to instantiate a XLM-RoBERTa model according to the specified arguments, defining the model architecture. Instantiating a configuration with the defaults will yield a similar configuration to that of the XLMRoBERTa[FacebookAI/xlm-roberta-base](https://huggingface.co/FacebookAI/xlm-roberta-base) architecture.这是用于存储 XLMRobertaModel 或 TFXLMRobertaModel 配置的配置类。它用于根据指定的参数实例化 XLM-RoBERTa 模型，定义模型架构。使用默认值实例化配置将产生与 XLMRoBERTa FacebookAI/xlm-roberta-base 架构类似的配置。

Configuration objects inherit from [PretrainedConfig](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/configuration#transformers.PretrainedConfig) and can be used to control the model outputs. Read the documentation from [PretrainedConfig](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/configuration#transformers.PretrainedConfig) for more information.配置对象继承自 PretrainedConfig，可用于控制模型输出。阅读 PretrainedConfig 的文档以获取更多信息。

Examples:例子：

>>> from transformers import XLMRobertaConfig, XLMRobertaModel

>>> 
>>> configuration = XLMRobertaConfig()

>>> 
>>> model = XLMRobertaModel(configuration)

>>> 
>>> configuration = model.config

### class班级 transformers.XLMRobertaTokenizer变压器.XLMRobertaTokenizer

[](#transformers.XLMRobertaTokenizer) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/tokenization%5Fxlm%5Froberta.py#L35)

( vocab\_filebos\_token \= '<s>'eos\_token \= '</s>'sep\_token \= '</s>'cls\_token \= '<s>'unk\_token \= '<unk>'pad\_token \= '<pad>'mask\_token \= '<mask>'sp\_model\_kwargs: Optional = None\*\*kwargs )（vocab\_filebos\_token ='<s>'eos\_token ='</s>'sep\_token ='</s>'cls\_token ='<s>'<s>'unk\_token =''pad\_token ='pad\_token ='<pad> >'sp\_model\_kwargs：可选=无\*\*kwargs） 

Adapted from [RobertaTokenizer](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/roberta#transformers.RobertaTokenizer) and [XLNetTokenizer](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlnet#transformers.XLNetTokenizer). Based on[SentencePiece](https://github.com/google/sentencepiece).改编自 RobertaTokenizer 和 XLNetTokenizer。基于SentencePiece。

This tokenizer inherits from [PreTrainedTokenizer](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/tokenizer#transformers.PreTrainedTokenizer) which contains most of the main methods. Users should refer to this superclass for more information regarding those methods.该分词器继承自 PreTrainedTokenizer，其中包含大部分主要方法。用户应参考此超类以获取有关这些方法的更多信息。

#### build\_inputs\_with\_special\_tokensbuild\_inputs\_with\_special\_tokens

[](#transformers.XLMRobertaTokenizer.build%5Finputs%5Fwith%5Fspecial%5Ftokens) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/tokenization%5Fxlm%5Froberta.py#L170)

( token\_ids\_0: Listtoken\_ids\_1: Optional = None ) → `List[int]`( token\_ids\_0: Listtoken\_ids\_1: 可选 = 无 ) → List\[int\]

Parameters 参数

* [](#transformers.XLMRobertaTokenizer.build%5Finputs%5Fwith%5Fspecial%5Ftokens.token%5Fids%5F0) **token\_ids\_0** (`List[int]`) — List of IDs to which the special tokens will be added.token\_ids\_0 (List\[int\]) — 将添加特殊标记的 ID 列表。
* [](#transformers.XLMRobertaTokenizer.build%5Finputs%5Fwith%5Fspecial%5Ftokens.token%5Fids%5F1) **token\_ids\_1** (`List[int]`, _optional_) — Optional second list of IDs for sequence pairs.token\_ids\_1 (List\[int\], 可选) — 可选的序列对 ID 的第二个列表。

Returns退货

`List[int]列表[整数]`

List of [input IDs](https://huggingface.co/docs/transformers/glossary#input-ids) with the appropriate special tokens.具有适当特殊标记的输入 ID 列表。

Build model inputs from a sequence or a pair of sequence for sequence classification tasks by concatenating and adding special tokens. An XLM-RoBERTa sequence has the following format:通过连接和添加特殊标记，从一个序列或一对序列构建模型输入以进行序列分类任务。 XLM-RoBERTa 序列具有以下格式：

* single sequence: `<s> X </s>`单个序列：<s> X </s>
* pair of sequences: `<s> A </s></s> B </s>`序列对：<s> A </s></s> B </s>

#### get\_special\_tokens\_mask获取特殊令牌掩码

[](#transformers.XLMRobertaTokenizer.get%5Fspecial%5Ftokens%5Fmask) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/tokenization%5Fxlm%5Froberta.py#L196)

( token\_ids\_0: Listtoken\_ids\_1: Optional = Nonealready\_has\_special\_tokens: bool = False ) → `List[int]`( token\_ids\_0: Listtoken\_ids\_1: 可选 = Nonealready\_has\_special\_tokens: bool = False ) → List\[int\]

Parameters 参数

* [](#transformers.XLMRobertaTokenizer.get%5Fspecial%5Ftokens%5Fmask.token%5Fids%5F0) **token\_ids\_0** (`List[int]`) — List of IDs.token\_ids\_0 (List\[int\]) — ID 列表。
* [](#transformers.XLMRobertaTokenizer.get%5Fspecial%5Ftokens%5Fmask.token%5Fids%5F1) **token\_ids\_1** (`List[int]`, _optional_) — Optional second list of IDs for sequence pairs.token\_ids\_1 (List\[int\], 可选) — 可选的序列对 ID 的第二个列表。
* [](#transformers.XLMRobertaTokenizer.get%5Fspecial%5Ftokens%5Fmask.already%5Fhas%5Fspecial%5Ftokens) **already\_has\_special\_tokens** (`bool`, _optional_, defaults to `False`) — Whether or not the token list is already formatted with special tokens for the model.has\_has\_special\_tokens (bool, 可选, 默认为 False) — 标记列表是否已使用模型的特殊标记进行格式化。

Returns退货

`List[int]列表[整数]`

A list of integers in the range \[0, 1\]: 1 for a special token, 0 for a sequence token.\[0, 1\] 范围内的整数列表：1 表示特殊标记，0 表示序列标记。

Retrieve sequence ids from a token list that has no special tokens added. This method is called when adding special tokens using the tokenizer `prepare_for_model` method.从未添加特殊标记的标记列表中检索序列 ID。使用标记生成器的prepare\_for\_model方法添加特殊标记时会调用此方法。

#### create\_token\_type\_ids\_from\_sequencescreate\_token\_type\_ids\_from\_sequences

[](#transformers.XLMRobertaTokenizer.create%5Ftoken%5Ftype%5Fids%5Ffrom%5Fsequences) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/tokenization%5Fxlm%5Froberta.py#L224)

( token\_ids\_0: Listtoken\_ids\_1: Optional = None ) → `List[int]`( token\_ids\_0: Listtoken\_ids\_1: 可选 = 无 ) → List\[int\]

Parameters 参数

* [](#transformers.XLMRobertaTokenizer.create%5Ftoken%5Ftype%5Fids%5Ffrom%5Fsequences.token%5Fids%5F0) **token\_ids\_0** (`List[int]`) — List of IDs.token\_ids\_0 (List\[int\]) — ID 列表。
* [](#transformers.XLMRobertaTokenizer.create%5Ftoken%5Ftype%5Fids%5Ffrom%5Fsequences.token%5Fids%5F1) **token\_ids\_1** (`List[int]`, _optional_) — Optional second list of IDs for sequence pairs.token\_ids\_1 (List\[int\], 可选) — 可选的序列对 ID 的第二个列表。

Returns退货

`List[int]列表[整数]`

List of zeros.零列表。

Create a mask from the two sequences passed to be used in a sequence-pair classification task. XLM-RoBERTa does not make use of token type ids, therefore a list of zeros is returned.根据传递的两个序列创建一个掩码，用于序列对分类任务。 XLM-RoBERTa 不使用令牌类型 ID，因此返回零列表。

#### save\_vocabulary保存词汇表

[](#transformers.XLMRobertaTokenizer.save%5Fvocabulary) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/tokenization%5Fxlm%5Froberta.py#L282)

( save\_directory: strfilename\_prefix: Optional = None )（保存目录：strfilename\_prefix：可选=无） 

### class班级 transformers.XLMRobertaTokenizerFastTransformers.XLMRobertaTokenizerFast

[](#transformers.XLMRobertaTokenizerFast) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/tokenization%5Fxlm%5Froberta%5Ffast.py#L38)

( vocab\_file \= Nonetokenizer\_file \= Nonebos\_token \= '<s>'eos\_token \= '</s>'sep\_token \= '</s>'cls\_token \= '<s>'unk\_token \= '<unk>'pad\_token \= '<pad>'mask\_token \= '<mask>'\*\*kwargs )（vocab\_file = noneTokenizer\_file = nonebos\_token ='<s>'eos\_token ='</s>'sep\_token ='</s>'cls\_token ='<s>'unk\_token ='unk\_token ='<unun unk>' = '<掩码>'\*\*kwargs ) 

Construct a “fast” XLM-RoBERTa tokenizer (backed by HuggingFace’s _tokenizers_ library). Adapted from[RobertaTokenizer](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/roberta#transformers.RobertaTokenizer) and [XLNetTokenizer](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlnet#transformers.XLNetTokenizer). Based on[BPE](https://huggingface.co/docs/tokenizers/python/latest/components.html?highlight=BPE#models).构建一个“快速”XLM-RoBERTa 分词器（由 HuggingFace 的分词器库支持）。改编自 RobertaTokenizer 和 XLNetTokenizer。基于BPE。

This tokenizer inherits from [PreTrainedTokenizerFast](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/tokenizer#transformers.PreTrainedTokenizerFast) which contains most of the main methods. Users should refer to this superclass for more information regarding those methods.该分词器继承自 PreTrainedTokenizerFast，其中包含大部分主要方法。用户应参考此超类以获取有关这些方法的更多信息。

#### build\_inputs\_with\_special\_tokensbuild\_inputs\_with\_special\_tokens

[](#transformers.XLMRobertaTokenizerFast.build%5Finputs%5Fwith%5Fspecial%5Ftokens) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/tokenization%5Fxlm%5Froberta%5Ffast.py#L128)

( token\_ids\_0: Listtoken\_ids\_1: Optional = None ) → `List[int]`( token\_ids\_0: Listtoken\_ids\_1: 可选 = 无 ) → List\[int\]

Parameters 参数

* [](#transformers.XLMRobertaTokenizerFast.build%5Finputs%5Fwith%5Fspecial%5Ftokens.token%5Fids%5F0) **token\_ids\_0** (`List[int]`) — List of IDs to which the special tokens will be added.token\_ids\_0 (List\[int\]) — 将添加特殊标记的 ID 列表。
* [](#transformers.XLMRobertaTokenizerFast.build%5Finputs%5Fwith%5Fspecial%5Ftokens.token%5Fids%5F1) **token\_ids\_1** (`List[int]`, _optional_) — Optional second list of IDs for sequence pairs.token\_ids\_1 (List\[int\], 可选) — 可选的序列对 ID 的第二个列表。

Returns退货

`List[int]列表[整数]`

List of [input IDs](https://huggingface.co/docs/transformers/glossary#input-ids) with the appropriate special tokens.具有适当特殊标记的输入 ID 列表。

Build model inputs from a sequence or a pair of sequence for sequence classification tasks by concatenating and adding special tokens. An XLM-RoBERTa sequence has the following format:通过连接和添加特殊标记，从一个序列或一对序列构建模型输入以进行序列分类任务。 XLM-RoBERTa 序列具有以下格式：

* single sequence: `<s> X </s>`单个序列：<s> X </s>
* pair of sequences: `<s> A </s></s> B </s>`序列对：<s> A </s></s> B </s>

#### create\_token\_type\_ids\_from\_sequencescreate\_token\_type\_ids\_from\_sequences

[](#transformers.XLMRobertaTokenizerFast.create%5Ftoken%5Ftype%5Fids%5Ffrom%5Fsequences) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/tokenization%5Fxlm%5Froberta%5Ffast.py#L154)

( token\_ids\_0: Listtoken\_ids\_1: Optional = None ) → `List[int]`( token\_ids\_0: Listtoken\_ids\_1: 可选 = 无 ) → List\[int\]

Parameters 参数

* [](#transformers.XLMRobertaTokenizerFast.create%5Ftoken%5Ftype%5Fids%5Ffrom%5Fsequences.token%5Fids%5F0) **token\_ids\_0** (`List[int]`) — List of IDs.token\_ids\_0 (List\[int\]) — ID 列表。
* [](#transformers.XLMRobertaTokenizerFast.create%5Ftoken%5Ftype%5Fids%5Ffrom%5Fsequences.token%5Fids%5F1) **token\_ids\_1** (`List[int]`, _optional_) — Optional second list of IDs for sequence pairs.token\_ids\_1 (List\[int\], 可选) — 可选的序列对 ID 的第二个列表。

Returns退货

`List[int]列表[整数]`

List of zeros.零列表。

Create a mask from the two sequences passed to be used in a sequence-pair classification task. XLM-RoBERTa does not make use of token type ids, therefore a list of zeros is returned.根据传递的两个序列创建一个掩码，用于序列对分类任务。 XLM-RoBERTa 不使用令牌类型 ID，因此返回零列表。

Hide Pytorch content隐藏 Pytorch 内容

## [](#transformers.XLMRobertaModel) XLMRobertaModelXLMRoberta模型

### class班级 transformers.XLMRobertaModel变形金刚.XLMRoberta模型

[](#transformers.XLMRobertaModel) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fxlm%5Froberta.py#L676)

( configadd\_pooling\_layer \= True )（configadd\_pooling\_layer = True） 

Parameters 参数

* [](#transformers.XLMRobertaModel.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel.from%5Fpretrained) method to load the model weights.config (XLMRobertaConfig) — 包含模型所有参数的模型配置类。使用配置文件初始化不会加载与模型关联的权重，仅加载配置。查看 from\_pretrained() 方法来加载模型权重。

The bare XLM-RoBERTa Model transformer outputting raw hidden-states without any specific head on top.裸露的 XLM-RoBERTa 模型变压器输出原始隐藏状态，顶部没有任何特定的头。

This model inherits from [PreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading or saving, resizing the input embeddings, pruning heads etc.)该模型继承自PreTrainedModel。检查超类文档以了解该库为其所有模型实现的通用方法（例如下载或保存、调整输入嵌入的大小、修剪头等）

This model is also a PyTorch [torch.nn.Module](https://pytorch.org/docs/stable/nn.html#torch.nn.Module) subclass. Use it as a regular PyTorch Module and refer to the PyTorch documentation for all matter related to general usage and behavior.该模型也是 PyTorch torch.nn.Module 的子类。将其用作常规 PyTorch 模块，并参阅 PyTorch 文档以了解与一般用法和行为相关的所有事项。

The model can behave as an encoder (with only self-attention) as well as a decoder, in which case a layer of cross-attention is added between the self-attention layers, following the architecture described in _Attention is all you need_\_ by Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser and Illia Polosukhin.该模型可以充当编码器（仅具有自注意力）和解码器，在这种情况下，在自注意力层之间添加一个交叉注意力层，遵循 Ashish 的 Attention is all you need\_ 中描述的架构Vaswani、Noam Shazeer、Niki Parmar、Jakob Uszkoreit、Llion Jones、Aidan N. Gomez、Lukasz Kaiser 和 Illia Polosukhin。

To behave as an decoder the model needs to be initialized with the `is_decoder` argument of the configuration set to `True`. To be used in a Seq2Seq model, the model needs to initialized with both `is_decoder` argument and`add_cross_attention` set to `True`; an `encoder_hidden_states` is then expected as an input to the forward pass.要充当解码器，需要将配置的 is\_decoder 参数设置为 True 来初始化模型。要在 Seq2Seq 模型中使用，该模型需要使用 is\_decoder 参数和 add\_cross\_attention 设置为 True 进行初始化；然后，encoder\_hidden\_​​states 被期望作为前向传递的输入。

.. \_ _Attention is all you need_: <https://arxiv.org/abs/1706.03762>.. \_注意就是您所需要的：https://arxiv.org/abs/1706.03762

#### forward向前

[](#transformers.XLMRobertaModel.forward) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fxlm%5Froberta.py#L724)

( input\_ids: Optional = Noneattention\_mask: Optional = Nonetoken\_type\_ids: Optional = Noneposition\_ids: Optional = Nonehead\_mask: Optional = Noneinputs\_embeds: Optional = Noneencoder\_hidden\_states: Optional = Noneencoder\_attention\_mask: Optional = Nonepast\_key\_values: Optional = Noneuse\_cache: Optional = Noneoutput\_attentions: Optional = Noneoutput\_hidden\_states: Optional = Nonereturn\_dict: Optional = None ) → [transformers.modeling\_outputs.BaseModelOutputWithPoolingAndCrossAttentions](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Foutputs.BaseModelOutputWithPoolingAndCrossAttentions) or `tuple(torch.FloatTensor)`（ input\_ids：可选= Noneattention\_mask：可选= Nonetoken\_type\_ids：可选= Noneposition\_ids：可选= Nonehead\_mask：可选= Noneinputs\_embeds：可选= Noneencoder\_hidden\_​​states：可选= Noneencoder\_attention\_mask：可选= Nonepast\_key\_values：可选= Noneuse\_cache：可选= Noneoutput\_attentions：可选= Noneoutput\_hidden\_​​states：可选= Nonereturn\_dict ：可选=无）→transformers.modeling\_outputs.BaseModelOutputWithPoolingAndCrossAttentions或元组（torch.FloatTensor）

The [XLMRobertaModel](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaModel) forward method, overrides the `__call__` special method.XLMRobertaModel 转发方法重写 \_\_call\_\_ 特殊方法。

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.尽管需要在此函数中定义前向传递的配方，但应该在之后调用 Module 实例而不是此函数，因为前者负责运行预处理和后处理步骤，而后者则默默地忽略它们。

Example:例子：

>>> from transformers import AutoTokenizer, XLMRobertaModel
>>> import torch

>>> tokenizer = AutoTokenizer.from_pretrained("FacebookAI/xlm-roberta-base")
>>> model = XLMRobertaModel.from_pretrained("FacebookAI/xlm-roberta-base")

>>> inputs = tokenizer("Hello, my dog is cute", return_tensors="pt")
>>> outputs = model(**inputs)

>>> last_hidden_states = outputs.last_hidden_state

## [](#transformers.XLMRobertaForCausalLM) XLMRobertaForCausalLMXLMRobertaForCausalLM

### class班级 transformers.XLMRobertaForCausalLM变形金刚.XLMRobertaForCausalLM

[](#transformers.XLMRobertaForCausalLM) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fxlm%5Froberta.py#L862)

( config )（配置） 

Parameters 参数

* [](#transformers.XLMRobertaForCausalLM.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel.from%5Fpretrained) method to load the model weights.config (XLMRobertaConfig) — 包含模型所有参数的模型配置类。使用配置文件初始化不会加载与模型关联的权重，仅加载配置。查看 from\_pretrained() 方法来加载模型权重。

XLM-RoBERTa Model with a `language modeling` head on top for CLM fine-tuning.XLM-RoBERTa 模型，顶部带有语言建模，用于 CLM 微调。

This model inherits from [PreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading or saving, resizing the input embeddings, pruning heads etc.)该模型继承自PreTrainedModel。检查超类文档以了解该库为其所有模型实现的通用方法（例如下载或保存、调整输入嵌入的大小、修剪头等）

This model is also a PyTorch [torch.nn.Module](https://pytorch.org/docs/stable/nn.html#torch.nn.Module) subclass. Use it as a regular PyTorch Module and refer to the PyTorch documentation for all matter related to general usage and behavior.该模型也是 PyTorch torch.nn.Module 的子类。将其用作常规 PyTorch 模块，并参阅 PyTorch 文档以了解与一般用法和行为相关的所有事项。

#### forward向前

[](#transformers.XLMRobertaForCausalLM.forward) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fxlm%5Froberta.py#L888)

( input\_ids: Optional = Noneattention\_mask: Optional = Nonetoken\_type\_ids: Optional = Noneposition\_ids: Optional = Nonehead\_mask: Optional = Noneinputs\_embeds: Optional = Noneencoder\_hidden\_states: Optional = Noneencoder\_attention\_mask: Optional = Nonelabels: Optional = Nonepast\_key\_values: Tuple = Noneuse\_cache: Optional = Noneoutput\_attentions: Optional = Noneoutput\_hidden\_states: Optional = Nonereturn\_dict: Optional = None ) → [transformers.modeling\_outputs.CausalLMOutputWithCrossAttentions](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Foutputs.CausalLMOutputWithCrossAttentions) or `tuple(torch.FloatTensor)`( input\_ids: 可选 = Noneattention\_mask: 可选 = Nonetoken\_type\_ids: 可选 = Noneposition\_ids: 可选 = Nonehead\_mask: 可选 = Noneinputs\_embeds: 可选 = Noneencoder\_hidden\_​​states: 可选 = Noneencoder\_attention\_mask: 可选 = Nonelabels: 可选 = Nonepast\_key\_values: 元组 = Noneuse\_cache: 可选 = Noneoutput\_attentions: 可选 = Noneoutput\_hidden\_​​states : 可选 = Nonereturn\_dict: 可选 = None ) → Transformers.modeling\_outputs.CausalLMOutputWithCrossAttentions 或 tuple(torch.FloatTensor)

The [XLMRobertaForCausalLM](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaForCausalLM) forward method, overrides the `__call__` special method.XLMRobertaForCausalLM 前向方法重写 \_\_call\_\_ 特殊方法。

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.尽管需要在此函数中定义前向传递的配方，但应该在之后调用 Module 实例而不是此函数，因为前者负责运行预处理和后处理步骤，而后者则默默地忽略它们。

Example:例子：

>>> from transformers import AutoTokenizer, XLMRobertaForCausalLM, AutoConfig
>>> import torch

>>> tokenizer = AutoTokenizer.from_pretrained("FacebookAI/roberta-base")
>>> config = AutoConfig.from_pretrained("FacebookAI/roberta-base")
>>> config.is_decoder = True
>>> model = XLMRobertaForCausalLM.from_pretrained("FacebookAI/roberta-base", config=config)

>>> inputs = tokenizer("Hello, my dog is cute", return_tensors="pt")
>>> outputs = model(**inputs)

>>> prediction_logits = outputs.logits

## [](#transformers.XLMRobertaForMaskedLM) XLMRobertaForMaskedLMXLMRobertaForMaskedLM

### class班级 transformers.XLMRobertaForMaskedLM变形金刚.XLMRobertaForMaskedLM

[](#transformers.XLMRobertaForMaskedLM) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fxlm%5Froberta.py#L1026)

( config )（配置） 

Parameters 参数

* [](#transformers.XLMRobertaForMaskedLM.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel.from%5Fpretrained) method to load the model weights.config (XLMRobertaConfig) — 包含模型所有参数的模型配置类。使用配置文件初始化不会加载与模型关联的权重，仅加载配置。查看 from\_pretrained() 方法来加载模型权重。

XLM-RoBERTa Model with a `language modeling` head on top.XLM-RoBERTa 模型，顶部有语言建模头。

This model inherits from [PreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading or saving, resizing the input embeddings, pruning heads etc.)该模型继承自PreTrainedModel。检查超类文档以了解该库为其所有模型实现的通用方法（例如下载或保存、调整输入嵌入的大小、修剪头等）

This model is also a PyTorch [torch.nn.Module](https://pytorch.org/docs/stable/nn.html#torch.nn.Module) subclass. Use it as a regular PyTorch Module and refer to the PyTorch documentation for all matter related to general usage and behavior.该模型也是 PyTorch torch.nn.Module 的子类。将其用作常规 PyTorch 模块，并参阅 PyTorch 文档以了解与一般用法和行为相关的所有事项。

#### forward向前

[](#transformers.XLMRobertaForMaskedLM.forward) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fxlm%5Froberta.py#L1055)

( input\_ids: Optional = Noneattention\_mask: Optional = Nonetoken\_type\_ids: Optional = Noneposition\_ids: Optional = Nonehead\_mask: Optional = Noneinputs\_embeds: Optional = Noneencoder\_hidden\_states: Optional = Noneencoder\_attention\_mask: Optional = Nonelabels: Optional = Noneoutput\_attentions: Optional = Noneoutput\_hidden\_states: Optional = Nonereturn\_dict: Optional = None ) → [transformers.modeling\_outputs.MaskedLMOutput](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Foutputs.MaskedLMOutput) or `tuple(torch.FloatTensor)`( input\_ids: 可选 = Noneattention\_mask: 可选 = Nonetoken\_type\_ids: 可选 = Noneposition\_ids: 可选 = Nonehead\_mask: 可选 = Noneinputs\_embeds: 可选 = Noneencoder\_hidden\_​​states: 可选 = Noneencoder\_attention\_mask: 可选 = Nonelabels: 可选 = Noneoutput\_attentions: 可选 = Noneoutput\_hidden\_​​states: 可选 = Nonereturn\_dict: 可选 = None ) → Transformers.modeling\_outputs.MaskedLMOutput 或 tuple(torch.FloatTensor)

The [XLMRobertaForMaskedLM](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaForMaskedLM) forward method, overrides the `__call__` special method.XLMRobertaForMaskedLM 转发方法重写 \_\_call\_\_ 特殊方法。

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.尽管需要在此函数中定义前向传递的配方，但应该在之后调用 Module 实例而不是此函数，因为前者负责运行预处理和后处理步骤，而后者则默默地忽略它们。

Example:例子：

>>> from transformers import AutoTokenizer, XLMRobertaForMaskedLM
>>> import torch

>>> tokenizer = AutoTokenizer.from_pretrained("FacebookAI/xlm-roberta-base")
>>> model = XLMRobertaForMaskedLM.from_pretrained("FacebookAI/xlm-roberta-base")

>>> inputs = tokenizer("The capital of France is <mask>.", return_tensors="pt")

>>> with torch.no_grad():
...     logits = model(**inputs).logits

>>> 
>>> mask_token_index = (inputs.input_ids == tokenizer.mask_token_id)[0].nonzero(as_tuple=True)[0]

>>> predicted_token_id = logits[0, mask_token_index].argmax(axis=-1)
>>> tokenizer.decode(predicted_token_id)
' Paris'

>>> labels = tokenizer("The capital of France is Paris.", return_tensors="pt")["input_ids"]
>>> 
>>> labels = torch.where(inputs.input_ids == tokenizer.mask_token_id, labels, -100)

>>> outputs = model(**inputs, labels=labels)
>>> round(outputs.loss.item(), 2)
0.1

## [](#transformers.XLMRobertaForSequenceClassification) XLMRobertaForSequenceClassificationXLMRobertaFor序列分类

### class班级 transformers.XLMRobertaForSequenceClassificationTransformers.XLMRobertaForSequenceClassification

[](#transformers.XLMRobertaForSequenceClassification) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fxlm%5Froberta.py#L1156)

( config )（配置） 

Parameters 参数

* [](#transformers.XLMRobertaForSequenceClassification.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel.from%5Fpretrained) method to load the model weights.config (XLMRobertaConfig) — 包含模型所有参数的模型配置类。使用配置文件初始化不会加载与模型关联的权重，仅加载配置。查看 from\_pretrained() 方法来加载模型权重。

XLM-RoBERTa Model transformer with a sequence classification/regression head on top (a linear layer on top of the pooled output) e.g. for GLUE tasks.XLM-RoBERTa 模型转换器，顶部有序列分类/回归头（池化输出顶部的线性层），例如用于 GLUE 任务。

This model inherits from [PreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading or saving, resizing the input embeddings, pruning heads etc.)该模型继承自PreTrainedModel。检查超类文档以了解该库为其所有模型实现的通用方法（例如下载或保存、调整输入嵌入的大小、修剪头等）

This model is also a PyTorch [torch.nn.Module](https://pytorch.org/docs/stable/nn.html#torch.nn.Module) subclass. Use it as a regular PyTorch Module and refer to the PyTorch documentation for all matter related to general usage and behavior.该模型也是 PyTorch torch.nn.Module 的子类。将其用作常规 PyTorch 模块，并参阅 PyTorch 文档以了解与一般用法和行为相关的所有事项。

#### forward向前

[](#transformers.XLMRobertaForSequenceClassification.forward) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fxlm%5Froberta.py#L1176)

( input\_ids: Optional = Noneattention\_mask: Optional = Nonetoken\_type\_ids: Optional = Noneposition\_ids: Optional = Nonehead\_mask: Optional = Noneinputs\_embeds: Optional = Nonelabels: Optional = Noneoutput\_attentions: Optional = Noneoutput\_hidden\_states: Optional = Nonereturn\_dict: Optional = None ) → [transformers.modeling\_outputs.SequenceClassifierOutput](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Foutputs.SequenceClassifierOutput) or `tuple(torch.FloatTensor)`( input\_ids: 可选 = Noneattention\_mask: 可选 = Nonetoken\_type\_ids: 可选 = Noneposition\_ids: 可选 = Nonehead\_mask: 可选 = Noneinputs\_embeds: 可选 = Nonelabels: 可选 = Noneoutput\_attentions: 可选 = Noneoutput\_hidden\_​​states: 可选 = Nonereturn\_dict: 可选 = None ) → Transformers.modeling\_outputs.SequenceClassifierOutput 或元组（火炬.FloatTensor）

The [XLMRobertaForSequenceClassification](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaForSequenceClassification) forward method, overrides the `__call__` special method.XLMRobertaForSequenceClassification 前向方法重写 \_\_call\_\_ 特殊方法。

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.尽管需要在此函数中定义前向传递的配方，但应该在之后调用 Module 实例而不是此函数，因为前者负责运行预处理和后处理步骤，而后者则默默地忽略它们。

Example of single-label classification:单标签分类示例：

>>> import torch
>>> from transformers import AutoTokenizer, XLMRobertaForSequenceClassification

>>> tokenizer = AutoTokenizer.from_pretrained("cardiffnlp/twitter-roberta-base-emotion")
>>> model = XLMRobertaForSequenceClassification.from_pretrained("cardiffnlp/twitter-roberta-base-emotion")

>>> inputs = tokenizer("Hello, my dog is cute", return_tensors="pt")

>>> with torch.no_grad():
...     logits = model(**inputs).logits

>>> predicted_class_id = logits.argmax().item()
>>> model.config.id2label[predicted_class_id]
'optimism'

>>> 
>>> num_labels = len(model.config.id2label)
>>> model = XLMRobertaForSequenceClassification.from_pretrained("cardiffnlp/twitter-roberta-base-emotion", num_labels=num_labels)

>>> labels = torch.tensor([1])
>>> loss = model(**inputs, labels=labels).loss
>>> round(loss.item(), 2)
0.08

Example of multi-label classification:多标签分类示例：

>>> import torch
>>> from transformers import AutoTokenizer, XLMRobertaForSequenceClassification

>>> tokenizer = AutoTokenizer.from_pretrained("cardiffnlp/twitter-roberta-base-emotion")
>>> model = XLMRobertaForSequenceClassification.from_pretrained("cardiffnlp/twitter-roberta-base-emotion", problem_type="multi_label_classification")

>>> inputs = tokenizer("Hello, my dog is cute", return_tensors="pt")

>>> with torch.no_grad():
...     logits = model(**inputs).logits

>>> predicted_class_ids = torch.arange(0, logits.shape[-1])[torch.sigmoid(logits).squeeze(dim=0) > 0.5]

>>> 
>>> num_labels = len(model.config.id2label)
>>> model = XLMRobertaForSequenceClassification.from_pretrained(
...     "cardiffnlp/twitter-roberta-base-emotion", num_labels=num_labels, problem_type="multi_label_classification"
... )

>>> labels = torch.sum(
...     torch.nn.functional.one_hot(predicted_class_ids[None, :].clone(), num_classes=num_labels), dim=1
... ).to(torch.float)
>>> loss = model(**inputs, labels=labels).loss

## [](#transformers.XLMRobertaForMultipleChoice) XLMRobertaForMultipleChoiceXLM罗伯塔多项选择

### class班级 transformers.XLMRobertaForMultipleChoice变形金刚.XLMRobertaForMultipleChoice

[](#transformers.XLMRobertaForMultipleChoice) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fxlm%5Froberta.py#L1256)

( config )（配置） 

Parameters 参数

* [](#transformers.XLMRobertaForMultipleChoice.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel.from%5Fpretrained) method to load the model weights.config (XLMRobertaConfig) — 包含模型所有参数的模型配置类。使用配置文件初始化不会加载与模型关联的权重，仅加载配置。查看 from\_pretrained() 方法来加载模型权重。

XLM-RoBERTa Model with a multiple choice classification head on top (a linear layer on top of the pooled output and a softmax) e.g. for RocStories/SWAG tasks.XLM-RoBERTa 模型，顶部有一个多项选择分类头（池化输出和 softmax 顶部的线性层），例如用于 RocStories/SWAG 任务。

This model inherits from [PreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading or saving, resizing the input embeddings, pruning heads etc.)该模型继承自PreTrainedModel。检查超类文档以了解该库为其所有模型实现的通用方法（例如下载或保存、调整输入嵌入的大小、修剪头等）

This model is also a PyTorch [torch.nn.Module](https://pytorch.org/docs/stable/nn.html#torch.nn.Module) subclass. Use it as a regular PyTorch Module and refer to the PyTorch documentation for all matter related to general usage and behavior.该模型也是 PyTorch torch.nn.Module 的子类。将其用作常规 PyTorch 模块，并参阅 PyTorch 文档以了解与一般用法和行为相关的所有事项。

#### forward向前

[](#transformers.XLMRobertaForMultipleChoice.forward) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fxlm%5Froberta.py#L1275)

( input\_ids: Optional = Nonetoken\_type\_ids: Optional = Noneattention\_mask: Optional = Nonelabels: Optional = Noneposition\_ids: Optional = Nonehead\_mask: Optional = Noneinputs\_embeds: Optional = Noneoutput\_attentions: Optional = Noneoutput\_hidden\_states: Optional = Nonereturn\_dict: Optional = None ) → [transformers.modeling\_outputs.MultipleChoiceModelOutput](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Foutputs.MultipleChoiceModelOutput) or `tuple(torch.FloatTensor)`( input\_ids: 可选 = Nonetoken\_type\_ids: 可选 = Noneattention\_mask: 可选 = Nonelabels: 可选 = Noneposition\_ids: 可选 = Nonehead\_mask: 可选 = Noneinputs\_embeds: 可选 = Noneoutput\_attentions: 可选 = Noneoutput\_hidden\_​​states: 可选 = Nonereturn\_dict: 可选 = None ) → Transformers.modeling\_outputs.MultipleChoiceModelOutput 或元组（火炬.FloatTensor）

The [XLMRobertaForMultipleChoice](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaForMultipleChoice) forward method, overrides the `__call__` special method.XLMRobertaForMultipleChoice 转发方法重写 \_\_call\_\_ 特殊方法。

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.尽管需要在此函数中定义前向传递的配方，但应该在之后调用 Module 实例而不是此函数，因为前者负责运行预处理和后处理步骤，而后者则默默地忽略它们。

Example:例子：

>>> from transformers import AutoTokenizer, XLMRobertaForMultipleChoice
>>> import torch

>>> tokenizer = AutoTokenizer.from_pretrained("FacebookAI/xlm-roberta-base")
>>> model = XLMRobertaForMultipleChoice.from_pretrained("FacebookAI/xlm-roberta-base")

>>> prompt = "In Italy, pizza served in formal settings, such as at a restaurant, is presented unsliced."
>>> choice0 = "It is eaten with a fork and a knife."
>>> choice1 = "It is eaten while held in the hand."
>>> labels = torch.tensor(0).unsqueeze(0)  

>>> encoding = tokenizer([prompt, prompt], [choice0, choice1], return_tensors="pt", padding=True)
>>> outputs = model(**{k: v.unsqueeze(0) for k, v in encoding.items()}, labels=labels)  

>>> 
>>> loss = outputs.loss
>>> logits = outputs.logits

## [](#transformers.XLMRobertaForTokenClassification) XLMRobertaForTokenClassificationXLMRobertaForTokenClassification

### class班级 transformers.XLMRobertaForTokenClassificationTransformers.XLMRobertaForTokenClassification

[](#transformers.XLMRobertaForTokenClassification) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fxlm%5Froberta.py#L1351)

( config )（配置） 

Parameters 参数

* [](#transformers.XLMRobertaForTokenClassification.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel.from%5Fpretrained) method to load the model weights.config (XLMRobertaConfig) — 包含模型所有参数的模型配置类。使用配置文件初始化不会加载与模型关联的权重，仅加载配置。查看 from\_pretrained() 方法来加载模型权重。

XLM-RoBERTa Model with a token classification head on top (a linear layer on top of the hidden-states output) e.g. for Named-Entity-Recognition (NER) tasks.XLM-RoBERTa 模型，顶部有一个标记分类头（隐藏状态输出顶部的线性层），例如用于命名实体识别 (NER) 任务。

This model inherits from [PreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading or saving, resizing the input embeddings, pruning heads etc.)该模型继承自PreTrainedModel。检查超类文档以了解该库为其所有模型实现的通用方法（例如下载或保存、调整输入嵌入的大小、修剪头等）

This model is also a PyTorch [torch.nn.Module](https://pytorch.org/docs/stable/nn.html#torch.nn.Module) subclass. Use it as a regular PyTorch Module and refer to the PyTorch documentation for all matter related to general usage and behavior.该模型也是 PyTorch torch.nn.Module 的子类。将其用作常规 PyTorch 模块，并参阅 PyTorch 文档以了解与一般用法和行为相关的所有事项。

#### forward向前

[](#transformers.XLMRobertaForTokenClassification.forward) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fxlm%5Froberta.py#L1374)

( input\_ids: Optional = Noneattention\_mask: Optional = Nonetoken\_type\_ids: Optional = Noneposition\_ids: Optional = Nonehead\_mask: Optional = Noneinputs\_embeds: Optional = Nonelabels: Optional = Noneoutput\_attentions: Optional = Noneoutput\_hidden\_states: Optional = Nonereturn\_dict: Optional = None ) → [transformers.modeling\_outputs.TokenClassifierOutput](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Foutputs.TokenClassifierOutput) or `tuple(torch.FloatTensor)`( input\_ids: 可选 = Noneattention\_mask: 可选 = Nonetoken\_type\_ids: 可选 = Noneposition\_ids: 可选 = Nonehead\_mask: 可选 = Noneinputs\_embeds: 可选 = Nonelabels: 可选 = Noneoutput\_attentions: 可选 = Noneoutput\_hidden\_​​states: 可选 = Nonereturn\_dict: 可选 = None ) → Transformers.modeling\_outputs.TokenClassifierOutput 或元组（火炬.FloatTensor）

The [XLMRobertaForTokenClassification](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaForTokenClassification) forward method, overrides the `__call__` special method.XLMRobertaForTokenClassification 转发方法重写 \_\_call\_\_ 特殊方法。

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.尽管需要在此函数中定义前向传递的配方，但应该在之后调用 Module 实例而不是此函数，因为前者负责运行预处理和后处理步骤，而后者则默默地忽略它们。

Example:例子：

>>> from transformers import AutoTokenizer, XLMRobertaForTokenClassification
>>> import torch

>>> tokenizer = AutoTokenizer.from_pretrained("Jean-Baptiste/roberta-large-ner-english")
>>> model = XLMRobertaForTokenClassification.from_pretrained("Jean-Baptiste/roberta-large-ner-english")

>>> inputs = tokenizer(
...     "HuggingFace is a company based in Paris and New York", add_special_tokens=False, return_tensors="pt"
... )

>>> with torch.no_grad():
...     logits = model(**inputs).logits

>>> predicted_token_class_ids = logits.argmax(-1)

>>> 
>>> 
>>> 
>>> predicted_tokens_classes = [model.config.id2label[t.item()] for t in predicted_token_class_ids[0]]
>>> predicted_tokens_classes
['O', 'ORG', 'ORG', 'O', 'O', 'O', 'O', 'O', 'LOC', 'O', 'LOC', 'LOC']

>>> labels = predicted_token_class_ids
>>> loss = model(**inputs, labels=labels).loss
>>> round(loss.item(), 2)
0.01

## [](#transformers.XLMRobertaForQuestionAnswering) XLMRobertaForQuestionAnsweringXLMRobertaForQuestionAnswering

### class班级 transformers.XLMRobertaForQuestionAnswering变形金刚.XLMRobertaForQuestionAnswering

[](#transformers.XLMRobertaForQuestionAnswering) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fxlm%5Froberta.py#L1460)

( config )（配置） 

Parameters 参数

* [](#transformers.XLMRobertaForQuestionAnswering.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel.from%5Fpretrained) method to load the model weights.config (XLMRobertaConfig) — 包含模型所有参数的模型配置类。使用配置文件初始化不会加载与模型关联的权重，仅加载配置。查看 from\_pretrained() 方法来加载模型权重。

XLM-RoBERTa Model with a span classification head on top for extractive question-answering tasks like SQuAD (a linear layers on top of the hidden-states output to compute `span start logits` and `span end logits`).XLM-RoBERTa 模型，顶部有一个跨度分类头，用于提取问答任务，如 SQuAD（隐藏状态输出顶部的线性层，用于计算跨度起始逻辑和跨度结束逻辑）。

This model inherits from [PreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading or saving, resizing the input embeddings, pruning heads etc.)该模型继承自PreTrainedModel。检查超类文档以了解该库为其所有模型实现的通用方法（例如下载或保存、调整输入嵌入的大小、修剪头等）

This model is also a PyTorch [torch.nn.Module](https://pytorch.org/docs/stable/nn.html#torch.nn.Module) subclass. Use it as a regular PyTorch Module and refer to the PyTorch documentation for all matter related to general usage and behavior.该模型也是 PyTorch torch.nn.Module 的子类。将其用作常规 PyTorch 模块，并参阅 PyTorch 文档以了解与一般用法和行为相关的所有事项。

#### forward向前

[](#transformers.XLMRobertaForQuestionAnswering.forward) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fxlm%5Froberta.py#L1479)

( input\_ids: Optional = Noneattention\_mask: Optional = Nonetoken\_type\_ids: Optional = Noneposition\_ids: Optional = Nonehead\_mask: Optional = Noneinputs\_embeds: Optional = Nonestart\_positions: Optional = Noneend\_positions: Optional = Noneoutput\_attentions: Optional = Noneoutput\_hidden\_states: Optional = Nonereturn\_dict: Optional = None ) → [transformers.modeling\_outputs.QuestionAnsweringModelOutput](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Foutputs.QuestionAnsweringModelOutput) or `tuple(torch.FloatTensor)`( input\_ids: 可选 = Noneattention\_mask: 可选 = Nonetoken\_type\_ids: 可选 = Noneposition\_ids: 可选 = Nonehead\_mask: 可选 = Noneinputs\_embeds: 可选 = Nonestart\_positions: 可选 = Noneend\_positions: 可选 = Noneoutput\_attentions: 可选 = Noneoutput\_hidden\_​​states: 可选 = Nonereturn\_dict: 可选 = None ) → 变压器。 modeling\_outputs.QuestionAnsweringModelOutput 或元组(torch.FloatTensor)

The [XLMRobertaForQuestionAnswering](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaForQuestionAnswering) forward method, overrides the `__call__` special method.XLMRobertaForQuestionAnswering 转发方法重写 \_\_call\_\_ 特殊方法。

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.尽管需要在此函数中定义前向传递的配方，但应该在之后调用 Module 实例而不是此函数，因为前者负责运行预处理和后处理步骤，而后者则默默地忽略它们。

Example:例子：

>>> from transformers import AutoTokenizer, XLMRobertaForQuestionAnswering
>>> import torch

>>> tokenizer = AutoTokenizer.from_pretrained("deepset/roberta-base-squad2")
>>> model = XLMRobertaForQuestionAnswering.from_pretrained("deepset/roberta-base-squad2")

>>> question, text = "Who was Jim Henson?", "Jim Henson was a nice puppet"

>>> inputs = tokenizer(question, text, return_tensors="pt")
>>> with torch.no_grad():
...     outputs = model(**inputs)

>>> answer_start_index = outputs.start_logits.argmax()
>>> answer_end_index = outputs.end_logits.argmax()

>>> predict_answer_tokens = inputs.input_ids[0, answer_start_index : answer_end_index + 1]
>>> tokenizer.decode(predict_answer_tokens, skip_special_tokens=True)
' puppet'

>>> 
>>> target_start_index = torch.tensor([14])
>>> target_end_index = torch.tensor([15])

>>> outputs = model(**inputs, start_positions=target_start_index, end_positions=target_end_index)
>>> loss = outputs.loss
>>> round(loss.item(), 2)
0.86

Hide TensorFlow content隐藏 TensorFlow 内容

## [](#transformers.TFXLMRobertaModel) TFXLMRobertaModelTFXLM罗伯塔模型

### class班级 transformers.TFXLMRobertaModel变形金刚.TFXLMRobertaModel

[](#transformers.TFXLMRobertaModel) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Ftf%5Fxlm%5Froberta.py#L977)

( config\*inputs\*\*kwargs )（配置\*输入\*\*kwargs） 

Parameters 参数

* [](#transformers.TFXLMRobertaModel.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel.from%5Fpretrained) method to load the model weights.config (XLMRobertaConfig) — 包含模型所有参数的模型配置类。使用配置文件初始化不会加载与模型关联的权重，仅加载配置。查看 from\_pretrained() 方法来加载模型权重。

The bare XLM RoBERTa Model transformer outputting raw hidden-states without any specific head on top.裸露的 XLM RoBERTa 模型变压器输出原始隐藏状态，顶部没有任何特定的头。

This model inherits from [TFPreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.TFPreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading or saving, resizing the input embeddings, pruning heads etc.)该模型继承自 TFPreTrainedModel。检查超类文档以了解该库为其所有模型实现的通用方法（例如下载或保存、调整输入嵌入的大小、修剪头等）

This model is also a [keras.Model](https://www.tensorflow.org/api%5Fdocs/python/tf/keras/Model) subclass. Use it as a regular TF 2.0 Keras Model and refer to the TF 2.0 documentation for all matter related to general usage and behavior.该模型也是 keras.Model 的子类。将其用作常规 TF 2.0 Keras 模型，并参阅 TF 2.0 文档以了解与一般用法和行为相关的所有问题。

TensorFlow models and layers in `transformers` accept two formats as input:TensorFlow 模型和 Transformer 中的层接受两种格式作为输入：

* having all inputs as keyword arguments (like PyTorch models), or将所有输入作为关键字参数（如 PyTorch 模型），或者
* having all inputs as a list, tuple or dict in the first positional argument.将所有输入作为第一个位置参数中的列表、元组或字典。

The reason the second format is supported is that Keras methods prefer this format when passing inputs to models and layers. Because of this support, when using methods like `model.fit()` things should “just work” for you - just pass your inputs and labels in any format that `model.fit()` supports! If, however, you want to use the second format outside of Keras methods like `fit()` and `predict()`, such as when creating your own layers or models with the Keras `Functional` API, there are three possibilities you can use to gather all the input Tensors in the first positional argument:支持第二种格式的原因是 Keras 方法在将输入传递到模型和层时更喜欢这种格式。由于这种支持，当使用像 model.fit() 这样的方法时，事情应该“正常工作” - 只需以 model.fit() 支持的任何格式传递您的输入和标签即可！但是，如果您想在 Keras 方法（如 fit() 和 Predict()）之外使用第二种格式，例如使用 Keras Function API 创建您自己的层或模型时，您可以使用三种可能性来收集所有在第一个位置参数中输入张量：

* a single Tensor with `input_ids` only and nothing else: `model(input_ids)`仅具有 input\_ids 而没有其他内容的单个张量： model(input\_ids)
* a list of varying length with one or several input Tensors IN THE ORDER given in the docstring:`model([input_ids, attention_mask])` or `model([input_ids, attention_mask, token_type_ids])`不同长度的列表，其中一个或多个输入张量按照文档字符串中给出的顺序： model(\[input\_ids, Attention\_mask\]) 或 model(\[input\_ids, Attention\_mask, token\_type\_ids\])
* a dictionary with one or several input Tensors associated to the input names given in the docstring:`model({"input_ids": input_ids, "token_type_ids": token_type_ids})`一本字典，其中包含一个或多个与文档字符串中给出的输入名称相关联的输入张量： model({"input\_ids": input\_ids, "token\_type\_ids": token\_type\_ids})

Note that when creating models and layers with[subclassing](https://keras.io/guides/making%5Fnew%5Flayers%5Fand%5Fmodels%5Fvia%5Fsubclassing/) then you don’t need to worry about any of this, as you can just pass inputs like you would to any other Python function!请注意，当使用子类化创建模型和层时，您无需担心任何这些，因为您可以像传递任何其他 Python 函数一样传递输入！

#### call称呼

[](#transformers.TFXLMRobertaModel.call) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Ftf%5Fxlm%5Froberta.py#L987)

( input\_ids: TFModelInputType | None = Noneattention\_mask: np.ndarray | tf.Tensor | None = Nonetoken\_type\_ids: np.ndarray | tf.Tensor | None = Noneposition\_ids: np.ndarray | tf.Tensor | None = Nonehead\_mask: np.ndarray | tf.Tensor | None = Noneinputs\_embeds: np.ndarray | tf.Tensor | None = Noneencoder\_hidden\_states: np.ndarray | tf.Tensor | None = Noneencoder\_attention\_mask: np.ndarray | tf.Tensor | None = Nonepast\_key\_values: Optional\[Tuple\[Tuple\[Union\[np.ndarray, tf.Tensor\]\]\]\] = Noneuse\_cache: Optional\[bool\] = Noneoutput\_attentions: Optional\[bool\] = Noneoutput\_hidden\_states: Optional\[bool\] = Nonereturn\_dict: Optional\[bool\] = Nonetraining: Optional\[bool\] = False ) → [transformers.modeling\_tf\_outputs.TFBaseModelOutputWithPoolingAndCrossAttentions](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Ftf%5Foutputs.TFBaseModelOutputWithPoolingAndCrossAttentions) or `tuple(tf.Tensor)`( input\_ids: TFModelInputType | None = Noneattention\_mask: np.ndarray | tf.Tensor | None = Nonetoken\_type\_ids: np.ndarray | tf.Tensor | None = Noneposition\_ids: np.ndarray | tf.Tensor | None = Nonehead\_mask: np.ndarray | tf .Tensor | None = Noneinputs\_embeds：np.ndarray | None = Noneencoder\_hidden\_​​states：np.ndarray | None = Noneencoder\_attention\_mask：np.ndarray | None = Nonepast\_key\_values：可选\[元组\[元组\] \[np.ndarray，tf.Tensor\]\]\]\] = Noneuse\_cache：可选\[bool\] = Noneoutput\_attentions：可选\[bool\] = Noneoutput\_hidden\_​​states：可选\[bool\] = Nonereturn\_dict：可选\[bool\] = Nonetraining：可选\[bool\] = False） → Transformers.modeling\_tf\_outputs.TFBaseModelOutputWithPoolingAndCrossAttentions 或 tuple(tf.Tensor)

The [TFXLMRobertaModel](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.TFXLMRobertaModel) forward method, overrides the `__call__` special method.TFXLMRobertaModel 转发方法重写 \_\_call\_\_ 特殊方法。

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.尽管需要在此函数中定义前向传递的配方，但应该在之后调用 Module 实例而不是此函数，因为前者负责运行预处理和后处理步骤，而后者则默默地忽略它们。

Example:例子：

>>> from transformers import AutoTokenizer, TFXLMRobertaModel
>>> import tensorflow as tf

>>> tokenizer = AutoTokenizer.from_pretrained("FacebookAI/xlm-roberta-base")
>>> model = TFXLMRobertaModel.from_pretrained("FacebookAI/xlm-roberta-base")

>>> inputs = tokenizer("Hello, my dog is cute", return_tensors="tf")
>>> outputs = model(inputs)

>>> last_hidden_states = outputs.last_hidden_state

## [](#transformers.TFXLMRobertaForCausalLM) TFXLMRobertaForCausalLMTFXLM罗伯塔ForCausalLM

### class班级 transformers.TFXLMRobertaForCausalLM变形金刚.TFXLMRobertaForCausalLM

[](#transformers.TFXLMRobertaForCausalLM) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Ftf%5Fxlm%5Froberta.py#L1210)

( config: XLMRobertaConfig\*inputs\*\*kwargs )（配置：XLMRobertaConfig\*inputs\*\*kwargs） 

Parameters 参数

* [](#transformers.TFXLMRobertaForCausalLM.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel.from%5Fpretrained) method to load the model weights.config (XLMRobertaConfig) — 包含模型所有参数的模型配置类。使用配置文件初始化不会加载与模型关联的权重，仅加载配置。查看 from\_pretrained() 方法来加载模型权重。

XLM-RoBERTa Model with a `language modeling` head on top for CLM fine-tuning.XLM-RoBERTa 模型，顶部带有语言建模，用于 CLM 微调。

This model inherits from [TFPreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.TFPreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading or saving, resizing the input embeddings, pruning heads etc.)该模型继承自 TFPreTrainedModel。检查超类文档以了解该库为其所有模型实现的通用方法（例如下载或保存、调整输入嵌入的大小、修剪头等）

This model is also a [keras.Model](https://www.tensorflow.org/api%5Fdocs/python/tf/keras/Model) subclass. Use it as a regular TF 2.0 Keras Model and refer to the TF 2.0 documentation for all matter related to general usage and behavior.该模型也是 keras.Model 的子类。将其用作常规 TF 2.0 Keras 模型，并参阅 TF 2.0 文档以了解与一般用法和行为相关的所有问题。

TensorFlow models and layers in `transformers` accept two formats as input:TensorFlow 模型和 Transformer 中的层接受两种格式作为输入：

* having all inputs as keyword arguments (like PyTorch models), or将所有输入作为关键字参数（如 PyTorch 模型），或者
* having all inputs as a list, tuple or dict in the first positional argument.将所有输入作为第一个位置参数中的列表、元组或字典。

The reason the second format is supported is that Keras methods prefer this format when passing inputs to models and layers. Because of this support, when using methods like `model.fit()` things should “just work” for you - just pass your inputs and labels in any format that `model.fit()` supports! If, however, you want to use the second format outside of Keras methods like `fit()` and `predict()`, such as when creating your own layers or models with the Keras `Functional` API, there are three possibilities you can use to gather all the input Tensors in the first positional argument:支持第二种格式的原因是 Keras 方法在将输入传递到模型和层时更喜欢这种格式。由于这种支持，当使用像 model.fit() 这样的方法时，事情应该“正常工作” - 只需以 model.fit() 支持的任何格式传递您的输入和标签即可！但是，如果您想在 Keras 方法（如 fit() 和 Predict()）之外使用第二种格式，例如使用 Keras Function API 创建您自己的层或模型时，您可以使用三种可能性来收集所有在第一个位置参数中输入张量：

* a single Tensor with `input_ids` only and nothing else: `model(input_ids)`仅具有 input\_ids 而没有其他内容的单个张量： model(input\_ids)
* a list of varying length with one or several input Tensors IN THE ORDER given in the docstring:`model([input_ids, attention_mask])` or `model([input_ids, attention_mask, token_type_ids])`不同长度的列表，其中一个或多个输入张量按照文档字符串中给出的顺序： model(\[input\_ids, Attention\_mask\]) 或 model(\[input\_ids, Attention\_mask, token\_type\_ids\])
* a dictionary with one or several input Tensors associated to the input names given in the docstring:`model({"input_ids": input_ids, "token_type_ids": token_type_ids})`一本字典，其中包含一个或多个与文档字符串中给出的输入名称相关联的输入张量： model({"input\_ids": input\_ids, "token\_type\_ids": token\_type\_ids})

Note that when creating models and layers with[subclassing](https://keras.io/guides/making%5Fnew%5Flayers%5Fand%5Fmodels%5Fvia%5Fsubclassing/) then you don’t need to worry about any of this, as you can just pass inputs like you would to any other Python function!请注意，当使用子类化创建模型和层时，您无需担心任何问题，因为您可以像传递任何其他 Python 函数一样传递输入！

#### call称呼

[](#transformers.TFXLMRobertaForCausalLM.call) [< source \>< 来源 >](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Ftf%5Fxlm%5Froberta.py#L1248)

( input\_ids: TFModelInputType | None = Noneattention\_mask: np.ndarray | tf.Tensor | None = Nonetoken\_type\_ids: np.ndarray | tf.Tensor | None = Noneposition\_ids: np.ndarray | tf.Tensor | None = Nonehead\_mask: np.ndarray | tf.Tensor | None = Noneinputs\_embeds: np.ndarray | tf.Tensor | None = Noneencoder\_hidden\_states: np.ndarray | tf.Tensor | None = Noneencoder\_attention\_mask: np.ndarray | tf.Tensor | None = Nonepast\_key\_values: Optional\[Tuple\[Tuple\[Union\[np.ndarray, tf.Tensor\]\]\]\] = Noneuse\_cache: Optional\[bool\] = Noneoutput\_attentions: Optional\[bool\] = Noneoutput\_hidden\_states: Optional\[bool\] = Nonereturn\_dict: Optional\[bool\] = Nonelabels: np.ndarray | tf.Tensor | None = Nonetraining: Optional\[bool\] = False ) → [transformers.modeling\_tf\_outputs.TFCausalLMOutputWithCrossAttentions](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Ftf%5Foutputs.TFCausalLMOutputWithCrossAttentions) or `tuple(tf.Tensor)`

The [TFXLMRobertaForCausalLM](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.TFXLMRobertaForCausalLM) forward method, overrides the `__call__` special method.

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.

Example:

>>> from transformers import AutoTokenizer, TFXLMRobertaForCausalLM
>>> import tensorflow as tf

>>> tokenizer = AutoTokenizer.from_pretrained("FacebookAI/xlm-roberta-base")
>>> model = TFXLMRobertaForCausalLM.from_pretrained("FacebookAI/xlm-roberta-base")

>>> inputs = tokenizer("Hello, my dog is cute", return_tensors="tf")
>>> outputs = model(inputs)
>>> logits = outputs.logits

## [](#transformers.TFXLMRobertaForMaskedLM) TFXLMRobertaForMaskedLM

### class transformers.TFXLMRobertaForMaskedLM

[](#transformers.TFXLMRobertaForMaskedLM) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Ftf%5Fxlm%5Froberta.py#L1120)

( config\*inputs\*\*kwargs ) 

Parameters 

* [](#transformers.TFXLMRobertaForMaskedLM.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel.from%5Fpretrained) method to load the model weights.

XLM RoBERTa Model with a `language modeling` head on top.

This model inherits from [TFPreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.TFPreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading or saving, resizing the input embeddings, pruning heads etc.)

This model is also a [keras.Model](https://www.tensorflow.org/api%5Fdocs/python/tf/keras/Model) subclass. Use it as a regular TF 2.0 Keras Model and refer to the TF 2.0 documentation for all matter related to general usage and behavior.

TensorFlow models and layers in `transformers` accept two formats as input:

* having all inputs as keyword arguments (like PyTorch models), or
* having all inputs as a list, tuple or dict in the first positional argument.

The reason the second format is supported is that Keras methods prefer this format when passing inputs to models and layers. Because of this support, when using methods like `model.fit()` things should “just work” for you - just pass your inputs and labels in any format that `model.fit()` supports! If, however, you want to use the second format outside of Keras methods like `fit()` and `predict()`, such as when creating your own layers or models with the Keras `Functional` API, there are three possibilities you can use to gather all the input Tensors in the first positional argument:

* a single Tensor with `input_ids` only and nothing else: `model(input_ids)`
* a list of varying length with one or several input Tensors IN THE ORDER given in the docstring:`model([input_ids, attention_mask])` or `model([input_ids, attention_mask, token_type_ids])`
* a dictionary with one or several input Tensors associated to the input names given in the docstring:`model({"input_ids": input_ids, "token_type_ids": token_type_ids})`

Note that when creating models and layers with[subclassing](https://keras.io/guides/making%5Fnew%5Flayers%5Fand%5Fmodels%5Fvia%5Fsubclassing/) then you don’t need to worry about any of this, as you can just pass inputs like you would to any other Python function!

#### call

[](#transformers.TFXLMRobertaForMaskedLM.call) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Ftf%5Fxlm%5Froberta.py#L1139)

( input\_ids: TFModelInputType | None = Noneattention\_mask: np.ndarray | tf.Tensor | None = Nonetoken\_type\_ids: np.ndarray | tf.Tensor | None = Noneposition\_ids: np.ndarray | tf.Tensor | None = Nonehead\_mask: np.ndarray | tf.Tensor | None = Noneinputs\_embeds: np.ndarray | tf.Tensor | None = Noneoutput\_attentions: Optional\[bool\] = Noneoutput\_hidden\_states: Optional\[bool\] = Nonereturn\_dict: Optional\[bool\] = Nonelabels: np.ndarray | tf.Tensor | None = Nonetraining: Optional\[bool\] = False ) → [transformers.modeling\_tf\_outputs.TFMaskedLMOutput](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Ftf%5Foutputs.TFMaskedLMOutput) or `tuple(tf.Tensor)`

The [TFXLMRobertaForMaskedLM](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.TFXLMRobertaForMaskedLM) forward method, overrides the `__call__` special method.

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.

Example:

>>> from transformers import AutoTokenizer, TFXLMRobertaForMaskedLM
>>> import tensorflow as tf

>>> tokenizer = AutoTokenizer.from_pretrained("FacebookAI/xlm-roberta-base")
>>> model = TFXLMRobertaForMaskedLM.from_pretrained("FacebookAI/xlm-roberta-base")

>>> inputs = tokenizer("The capital of France is <mask>.", return_tensors="tf")
>>> logits = model(**inputs).logits

>>> 
>>> mask_token_index = tf.where((inputs.input_ids == tokenizer.mask_token_id)[0])
>>> selected_logits = tf.gather_nd(logits[0], indices=mask_token_index)

>>> predicted_token_id = tf.math.argmax(selected_logits, axis=-1)
>>> tokenizer.decode(predicted_token_id)
' Paris'

>>> labels = tokenizer("The capital of France is Paris.", return_tensors="tf")["input_ids"]
>>> 
>>> labels = tf.where(inputs.input_ids == tokenizer.mask_token_id, labels, -100)

>>> outputs = model(**inputs, labels=labels)
>>> round(float(outputs.loss), 2)
0.1

## [](#transformers.TFXLMRobertaForSequenceClassification) TFXLMRobertaForSequenceClassification

### class transformers.TFXLMRobertaForSequenceClassification

[](#transformers.TFXLMRobertaForSequenceClassification) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Ftf%5Fxlm%5Froberta.py#L1389)

( config\*inputs\*\*kwargs ) 

Parameters 

* [](#transformers.TFXLMRobertaForSequenceClassification.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel.from%5Fpretrained) method to load the model weights.

XLM RoBERTa Model transformer with a sequence classification/regression head on top (a linear layer on top of the pooled output) e.g. for GLUE tasks.

This model inherits from [TFPreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.TFPreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading or saving, resizing the input embeddings, pruning heads etc.)

This model is also a [keras.Model](https://www.tensorflow.org/api%5Fdocs/python/tf/keras/Model) subclass. Use it as a regular TF 2.0 Keras Model and refer to the TF 2.0 documentation for all matter related to general usage and behavior.

TensorFlow models and layers in `transformers` accept two formats as input:

* having all inputs as keyword arguments (like PyTorch models), or
* having all inputs as a list, tuple or dict in the first positional argument.

The reason the second format is supported is that Keras methods prefer this format when passing inputs to models and layers. Because of this support, when using methods like `model.fit()` things should “just work” for you - just pass your inputs and labels in any format that `model.fit()` supports! If, however, you want to use the second format outside of Keras methods like `fit()` and `predict()`, such as when creating your own layers or models with the Keras `Functional` API, there are three possibilities you can use to gather all the input Tensors in the first positional argument:

* a single Tensor with `input_ids` only and nothing else: `model(input_ids)`
* a list of varying length with one or several input Tensors IN THE ORDER given in the docstring:`model([input_ids, attention_mask])` or `model([input_ids, attention_mask, token_type_ids])`
* a dictionary with one or several input Tensors associated to the input names given in the docstring:`model({"input_ids": input_ids, "token_type_ids": token_type_ids})`

Note that when creating models and layers with[subclassing](https://keras.io/guides/making%5Fnew%5Flayers%5Fand%5Fmodels%5Fvia%5Fsubclassing/) then you don’t need to worry about any of this, as you can just pass inputs like you would to any other Python function!

#### call

[](#transformers.TFXLMRobertaForSequenceClassification.call) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Ftf%5Fxlm%5Froberta.py#L1408)

( input\_ids: TFModelInputType | None = Noneattention\_mask: np.ndarray | tf.Tensor | None = Nonetoken\_type\_ids: np.ndarray | tf.Tensor | None = Noneposition\_ids: np.ndarray | tf.Tensor | None = Nonehead\_mask: np.ndarray | tf.Tensor | None = Noneinputs\_embeds: np.ndarray | tf.Tensor | None = Noneoutput\_attentions: Optional\[bool\] = Noneoutput\_hidden\_states: Optional\[bool\] = Nonereturn\_dict: Optional\[bool\] = Nonelabels: np.ndarray | tf.Tensor | None = Nonetraining: Optional\[bool\] = False ) → [transformers.modeling\_tf\_outputs.TFSequenceClassifierOutput](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Ftf%5Foutputs.TFSequenceClassifierOutput) or `tuple(tf.Tensor)`

The [TFXLMRobertaForSequenceClassification](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.TFXLMRobertaForSequenceClassification) forward method, overrides the `__call__` special method.

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.

Example:

>>> from transformers import AutoTokenizer, TFXLMRobertaForSequenceClassification
>>> import tensorflow as tf

>>> tokenizer = AutoTokenizer.from_pretrained("cardiffnlp/twitter-roberta-base-emotion")
>>> model = TFXLMRobertaForSequenceClassification.from_pretrained("cardiffnlp/twitter-roberta-base-emotion")

>>> inputs = tokenizer("Hello, my dog is cute", return_tensors="tf")

>>> logits = model(**inputs).logits

>>> predicted_class_id = int(tf.math.argmax(logits, axis=-1)[0])
>>> model.config.id2label[predicted_class_id]
'optimism'

>>> 
>>> num_labels = len(model.config.id2label)
>>> model = TFXLMRobertaForSequenceClassification.from_pretrained("cardiffnlp/twitter-roberta-base-emotion", num_labels=num_labels)

>>> labels = tf.constant(1)
>>> loss = model(**inputs, labels=labels).loss
>>> round(float(loss), 2)
0.08

## [](#transformers.TFXLMRobertaForMultipleChoice) TFXLMRobertaForMultipleChoice

### class transformers.TFXLMRobertaForMultipleChoice

[](#transformers.TFXLMRobertaForMultipleChoice) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Ftf%5Fxlm%5Froberta.py#L1477)

( config\*inputs\*\*kwargs ) 

Parameters 

* [](#transformers.TFXLMRobertaForMultipleChoice.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel.from%5Fpretrained) method to load the model weights.

XLM Roberta Model with a multiple choice classification head on top (a linear layer on top of the pooled output and a softmax) e.g. for RocStories/SWAG tasks.

This model inherits from [TFPreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.TFPreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading or saving, resizing the input embeddings, pruning heads etc.)

This model is also a [keras.Model](https://www.tensorflow.org/api%5Fdocs/python/tf/keras/Model) subclass. Use it as a regular TF 2.0 Keras Model and refer to the TF 2.0 documentation for all matter related to general usage and behavior.

TensorFlow models and layers in `transformers` accept two formats as input:

* having all inputs as keyword arguments (like PyTorch models), or
* having all inputs as a list, tuple or dict in the first positional argument.

The reason the second format is supported is that Keras methods prefer this format when passing inputs to models and layers. Because of this support, when using methods like `model.fit()` things should “just work” for you - just pass your inputs and labels in any format that `model.fit()` supports! If, however, you want to use the second format outside of Keras methods like `fit()` and `predict()`, such as when creating your own layers or models with the Keras `Functional` API, there are three possibilities you can use to gather all the input Tensors in the first positional argument:

* a single Tensor with `input_ids` only and nothing else: `model(input_ids)`
* a list of varying length with one or several input Tensors IN THE ORDER given in the docstring:`model([input_ids, attention_mask])` or `model([input_ids, attention_mask, token_type_ids])`
* a dictionary with one or several input Tensors associated to the input names given in the docstring:`model({"input_ids": input_ids, "token_type_ids": token_type_ids})`

Note that when creating models and layers with[subclassing](https://keras.io/guides/making%5Fnew%5Flayers%5Fand%5Fmodels%5Fvia%5Fsubclassing/) then you don’t need to worry about any of this, as you can just pass inputs like you would to any other Python function!

#### call

[](#transformers.TFXLMRobertaForMultipleChoice.call) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Ftf%5Fxlm%5Froberta.py#L1500)

( input\_ids: TFModelInputType | None = Noneattention\_mask: np.ndarray | tf.Tensor | None = Nonetoken\_type\_ids: np.ndarray | tf.Tensor | None = Noneposition\_ids: np.ndarray | tf.Tensor | None = Nonehead\_mask: np.ndarray | tf.Tensor | None = Noneinputs\_embeds: np.ndarray | tf.Tensor | None = Noneoutput\_attentions: Optional\[bool\] = Noneoutput\_hidden\_states: Optional\[bool\] = Nonereturn\_dict: Optional\[bool\] = Nonelabels: np.ndarray | tf.Tensor | None = Nonetraining: Optional\[bool\] = False ) → [transformers.modeling\_tf\_outputs.TFMultipleChoiceModelOutput](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Ftf%5Foutputs.TFMultipleChoiceModelOutput) or `tuple(tf.Tensor)`

The [TFXLMRobertaForMultipleChoice](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.TFXLMRobertaForMultipleChoice) forward method, overrides the `__call__` special method.

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.

Example:

>>> from transformers import AutoTokenizer, TFXLMRobertaForMultipleChoice
>>> import tensorflow as tf

>>> tokenizer = AutoTokenizer.from_pretrained("FacebookAI/xlm-roberta-base")
>>> model = TFXLMRobertaForMultipleChoice.from_pretrained("FacebookAI/xlm-roberta-base")

>>> prompt = "In Italy, pizza served in formal settings, such as at a restaurant, is presented unsliced."
>>> choice0 = "It is eaten with a fork and a knife."
>>> choice1 = "It is eaten while held in the hand."

>>> encoding = tokenizer([prompt, prompt], [choice0, choice1], return_tensors="tf", padding=True)
>>> inputs = {k: tf.expand_dims(v, 0) for k, v in encoding.items()}
>>> outputs = model(inputs)  

>>> 
>>> logits = outputs.logits

## [](#transformers.TFXLMRobertaForTokenClassification) TFXLMRobertaForTokenClassification

### class transformers.TFXLMRobertaForTokenClassification

[](#transformers.TFXLMRobertaForTokenClassification) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Ftf%5Fxlm%5Froberta.py#L1582)

( config\*inputs\*\*kwargs ) 

Parameters 

* [](#transformers.TFXLMRobertaForTokenClassification.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel.from%5Fpretrained) method to load the model weights.

XLM RoBERTa Model with a token classification head on top (a linear layer on top of the hidden-states output) e.g. for Named-Entity-Recognition (NER) tasks.

This model inherits from [TFPreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.TFPreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading or saving, resizing the input embeddings, pruning heads etc.)

This model is also a [keras.Model](https://www.tensorflow.org/api%5Fdocs/python/tf/keras/Model) subclass. Use it as a regular TF 2.0 Keras Model and refer to the TF 2.0 documentation for all matter related to general usage and behavior.

TensorFlow models and layers in `transformers` accept two formats as input:

* having all inputs as keyword arguments (like PyTorch models), or
* having all inputs as a list, tuple or dict in the first positional argument.

The reason the second format is supported is that Keras methods prefer this format when passing inputs to models and layers. Because of this support, when using methods like `model.fit()` things should “just work” for you - just pass your inputs and labels in any format that `model.fit()` supports! If, however, you want to use the second format outside of Keras methods like `fit()` and `predict()`, such as when creating your own layers or models with the Keras `Functional` API, there are three possibilities you can use to gather all the input Tensors in the first positional argument:

* a single Tensor with `input_ids` only and nothing else: `model(input_ids)`
* a list of varying length with one or several input Tensors IN THE ORDER given in the docstring:`model([input_ids, attention_mask])` or `model([input_ids, attention_mask, token_type_ids])`
* a dictionary with one or several input Tensors associated to the input names given in the docstring:`model({"input_ids": input_ids, "token_type_ids": token_type_ids})`

Note that when creating models and layers with[subclassing](https://keras.io/guides/making%5Fnew%5Flayers%5Fand%5Fmodels%5Fvia%5Fsubclassing/) then you don’t need to worry about any of this, as you can just pass inputs like you would to any other Python function!

#### call

[](#transformers.TFXLMRobertaForTokenClassification.call) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Ftf%5Fxlm%5Froberta.py#L1609)

( input\_ids: TFModelInputType | None = Noneattention\_mask: np.ndarray | tf.Tensor | None = Nonetoken\_type\_ids: np.ndarray | tf.Tensor | None = Noneposition\_ids: np.ndarray | tf.Tensor | None = Nonehead\_mask: np.ndarray | tf.Tensor | None = Noneinputs\_embeds: np.ndarray | tf.Tensor | None = Noneoutput\_attentions: Optional\[bool\] = Noneoutput\_hidden\_states: Optional\[bool\] = Nonereturn\_dict: Optional\[bool\] = Nonelabels: np.ndarray | tf.Tensor | None = Nonetraining: Optional\[bool\] = False ) → [transformers.modeling\_tf\_outputs.TFTokenClassifierOutput](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Ftf%5Foutputs.TFTokenClassifierOutput) or `tuple(tf.Tensor)`

The [TFXLMRobertaForTokenClassification](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.TFXLMRobertaForTokenClassification) forward method, overrides the `__call__` special method.

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.

Example:

>>> from transformers import AutoTokenizer, TFXLMRobertaForTokenClassification
>>> import tensorflow as tf

>>> tokenizer = AutoTokenizer.from_pretrained("ydshieh/roberta-large-ner-english")
>>> model = TFXLMRobertaForTokenClassification.from_pretrained("ydshieh/roberta-large-ner-english")

>>> inputs = tokenizer(
...     "HuggingFace is a company based in Paris and New York", add_special_tokens=False, return_tensors="tf"
... )

>>> logits = model(**inputs).logits
>>> predicted_token_class_ids = tf.math.argmax(logits, axis=-1)

>>> 
>>> 
>>> 
>>> predicted_tokens_classes = [model.config.id2label[t] for t in predicted_token_class_ids[0].numpy().tolist()]
>>> predicted_tokens_classes
['O', 'ORG', 'ORG', 'O', 'O', 'O', 'O', 'O', 'LOC', 'O', 'LOC', 'LOC']

>>> labels = predicted_token_class_ids
>>> loss = tf.math.reduce_mean(model(**inputs, labels=labels).loss)
>>> round(float(loss), 2)
0.01

## [](#transformers.TFXLMRobertaForQuestionAnswering) TFXLMRobertaForQuestionAnswering

### class transformers.TFXLMRobertaForQuestionAnswering

[](#transformers.TFXLMRobertaForQuestionAnswering) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Ftf%5Fxlm%5Froberta.py#L1678)

( config\*inputs\*\*kwargs ) 

Parameters 

* [](#transformers.TFXLMRobertaForQuestionAnswering.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.PreTrainedModel.from%5Fpretrained) method to load the model weights.

XLM RoBERTa Model with a span classification head on top for extractive question-answering tasks like SQuAD (a linear layers on top of the hidden-states output to compute `span start logits` and `span end logits`).

This model inherits from [TFPreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.TFPreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading or saving, resizing the input embeddings, pruning heads etc.)

This model is also a [keras.Model](https://www.tensorflow.org/api%5Fdocs/python/tf/keras/Model) subclass. Use it as a regular TF 2.0 Keras Model and refer to the TF 2.0 documentation for all matter related to general usage and behavior.

TensorFlow models and layers in `transformers` accept two formats as input:

* having all inputs as keyword arguments (like PyTorch models), or
* having all inputs as a list, tuple or dict in the first positional argument.

The reason the second format is supported is that Keras methods prefer this format when passing inputs to models and layers. Because of this support, when using methods like `model.fit()` things should “just work” for you - just pass your inputs and labels in any format that `model.fit()` supports! If, however, you want to use the second format outside of Keras methods like `fit()` and `predict()`, such as when creating your own layers or models with the Keras `Functional` API, there are three possibilities you can use to gather all the input Tensors in the first positional argument:

* a single Tensor with `input_ids` only and nothing else: `model(input_ids)`
* a list of varying length with one or several input Tensors IN THE ORDER given in the docstring:`model([input_ids, attention_mask])` or `model([input_ids, attention_mask, token_type_ids])`
* a dictionary with one or several input Tensors associated to the input names given in the docstring:`model({"input_ids": input_ids, "token_type_ids": token_type_ids})`

Note that when creating models and layers with[subclassing](https://keras.io/guides/making%5Fnew%5Flayers%5Fand%5Fmodels%5Fvia%5Fsubclassing/) then you don’t need to worry about any of this, as you can just pass inputs like you would to any other Python function!

#### call

[](#transformers.TFXLMRobertaForQuestionAnswering.call) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Ftf%5Fxlm%5Froberta.py#L1700)

( input\_ids: TFModelInputType | None = Noneattention\_mask: np.ndarray | tf.Tensor | None = Nonetoken\_type\_ids: np.ndarray | tf.Tensor | None = Noneposition\_ids: np.ndarray | tf.Tensor | None = Nonehead\_mask: np.ndarray | tf.Tensor | None = Noneinputs\_embeds: np.ndarray | tf.Tensor | None = Noneoutput\_attentions: Optional\[bool\] = Noneoutput\_hidden\_states: Optional\[bool\] = Nonereturn\_dict: Optional\[bool\] = Nonestart\_positions: np.ndarray | tf.Tensor | None = Noneend\_positions: np.ndarray | tf.Tensor | None = Nonetraining: Optional\[bool\] = False ) → [transformers.modeling\_tf\_outputs.TFQuestionAnsweringModelOutput](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Ftf%5Foutputs.TFQuestionAnsweringModelOutput) or `tuple(tf.Tensor)`

The [TFXLMRobertaForQuestionAnswering](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.TFXLMRobertaForQuestionAnswering) forward method, overrides the `__call__` special method.

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.

Example:

>>> from transformers import AutoTokenizer, TFXLMRobertaForQuestionAnswering
>>> import tensorflow as tf

>>> tokenizer = AutoTokenizer.from_pretrained("ydshieh/roberta-base-squad2")
>>> model = TFXLMRobertaForQuestionAnswering.from_pretrained("ydshieh/roberta-base-squad2")

>>> question, text = "Who was Jim Henson?", "Jim Henson was a nice puppet"

>>> inputs = tokenizer(question, text, return_tensors="tf")
>>> outputs = model(**inputs)

>>> answer_start_index = int(tf.math.argmax(outputs.start_logits, axis=-1)[0])
>>> answer_end_index = int(tf.math.argmax(outputs.end_logits, axis=-1)[0])

>>> predict_answer_tokens = inputs.input_ids[0, answer_start_index : answer_end_index + 1]
>>> tokenizer.decode(predict_answer_tokens)
' puppet'

>>> 
>>> target_start_index = tf.constant([14])
>>> target_end_index = tf.constant([15])

>>> outputs = model(**inputs, start_positions=target_start_index, end_positions=target_end_index)
>>> loss = tf.math.reduce_mean(outputs.loss)
>>> round(float(loss), 2)
0.86

## [](#transformers.FlaxXLMRobertaModel) FlaxXLMRobertaModel

### class transformers.FlaxXLMRobertaModel

[](#transformers.FlaxXLMRobertaModel) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fflax%5Fxlm%5Froberta.py#L994)

( config: XLMRobertaConfiginput\_shape: Tuple = (1, 1)seed: int = 0dtype: dtype = <class 'jax.numpy.float32'>\_do\_init: bool = Truegradient\_checkpointing: bool = False\*\*kwargs ) 

Parameters 

* [](#transformers.FlaxXLMRobertaModel.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.FlaxPreTrainedModel.from%5Fpretrained) method to load the model weights.

The bare XLM RoBERTa Model transformer outputting raw hidden-states without any specific head on top.

This model inherits from [FlaxPreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.FlaxPreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading, saving and converting weights from PyTorch models)

This model is also a[flax.linen.Module](https://flax.readthedocs.io/en/latest/api%5Freference/flax.linen/module.html) subclass. Use it as a regular Flax linen Module and refer to the Flax documentation for all matter related to general usage and behavior.

Finally, this model supports inherent JAX features such as:

* [Just-In-Time (JIT) compilation](https://jax.readthedocs.io/en/latest/jax.html#just-in-time-compilation-jit)
* [Automatic Differentiation](https://jax.readthedocs.io/en/latest/jax.html#automatic-differentiation)
* [Vectorization](https://jax.readthedocs.io/en/latest/jax.html#vectorization-vmap)
* [Parallelization](https://jax.readthedocs.io/en/latest/jax.html#parallelization-pmap)

#### \_\_call\_\_

[](#transformers.FlaxXLMRobertaModel.%5F%5Fcall%5F%5F) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fflax%5Fxlm%5Froberta.py#L824)

( input\_idsattention\_mask \= Nonetoken\_type\_ids \= Noneposition\_ids \= Nonehead\_mask \= Noneencoder\_hidden\_states \= Noneencoder\_attention\_mask \= Noneparams: dict = Nonedropout\_rng: PRNGKey = Nonetrain: bool = Falseoutput\_attentions: Optional = Noneoutput\_hidden\_states: Optional = Nonereturn\_dict: Optional = Nonepast\_key\_values: dict = None ) → [transformers.modeling\_flax\_outputs.FlaxBaseModelOutputWithPooling](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Fflax%5Foutputs.FlaxBaseModelOutputWithPooling) or `tuple(torch.FloatTensor)`

The `FlaxXLMRobertaPreTrainedModel` forward method, overrides the `__call__` special method.

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.

Example:

>>> from transformers import AutoTokenizer, FlaxXLMRobertaModel

>>> tokenizer = AutoTokenizer.from_pretrained("FacebookAI/xlm-roberta-base")
>>> model = FlaxXLMRobertaModel.from_pretrained("FacebookAI/xlm-roberta-base")

>>> inputs = tokenizer("Hello, my dog is cute", return_tensors="jax")
>>> outputs = model(**inputs)

>>> last_hidden_states = outputs.last_hidden_state

## [](#transformers.FlaxXLMRobertaForCausalLM) FlaxXLMRobertaForCausalLM

### class transformers.FlaxXLMRobertaForCausalLM

[](#transformers.FlaxXLMRobertaForCausalLM) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fflax%5Fxlm%5Froberta.py#L1456)

( config: XLMRobertaConfiginput\_shape: Tuple = (1, 1)seed: int = 0dtype: dtype = <class 'jax.numpy.float32'>\_do\_init: bool = Truegradient\_checkpointing: bool = False\*\*kwargs ) 

Parameters 

* [](#transformers.FlaxXLMRobertaForCausalLM.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.FlaxPreTrainedModel.from%5Fpretrained) method to load the model weights.

XLM Roberta Model with a language modeling head on top (a linear layer on top of the hidden-states output) e.g for autoregressive tasks.

This model inherits from [FlaxPreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.FlaxPreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading, saving and converting weights from PyTorch models)

This model is also a[flax.linen.Module](https://flax.readthedocs.io/en/latest/api%5Freference/flax.linen/module.html) subclass. Use it as a regular Flax linen Module and refer to the Flax documentation for all matter related to general usage and behavior.

Finally, this model supports inherent JAX features such as:

* [Just-In-Time (JIT) compilation](https://jax.readthedocs.io/en/latest/jax.html#just-in-time-compilation-jit)
* [Automatic Differentiation](https://jax.readthedocs.io/en/latest/jax.html#automatic-differentiation)
* [Vectorization](https://jax.readthedocs.io/en/latest/jax.html#vectorization-vmap)
* [Parallelization](https://jax.readthedocs.io/en/latest/jax.html#parallelization-pmap)

#### \_\_call\_\_

[](#transformers.FlaxXLMRobertaForCausalLM.%5F%5Fcall%5F%5F) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fflax%5Fxlm%5Froberta.py#L824)

( input\_idsattention\_mask \= Nonetoken\_type\_ids \= Noneposition\_ids \= Nonehead\_mask \= Noneencoder\_hidden\_states \= Noneencoder\_attention\_mask \= Noneparams: dict = Nonedropout\_rng: PRNGKey = Nonetrain: bool = Falseoutput\_attentions: Optional = Noneoutput\_hidden\_states: Optional = Nonereturn\_dict: Optional = Nonepast\_key\_values: dict = None ) → [transformers.modeling\_flax\_outputs.FlaxCausalLMOutputWithCrossAttentions](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Fflax%5Foutputs.FlaxCausalLMOutputWithCrossAttentions) or `tuple(torch.FloatTensor)`

The `FlaxXLMRobertaPreTrainedModel` forward method, overrides the `__call__` special method.

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.

Example:

>>> from transformers import AutoTokenizer, FlaxXLMRobertaForCausalLM

>>> tokenizer = AutoTokenizer.from_pretrained("FacebookAI/xlm-roberta-base")
>>> model = FlaxXLMRobertaForCausalLM.from_pretrained("FacebookAI/xlm-roberta-base")

>>> inputs = tokenizer("Hello, my dog is cute", return_tensors="np")
>>> outputs = model(**inputs)

>>> 
>>> next_token_logits = outputs.logits[:, -1]

## [](#transformers.FlaxXLMRobertaForMaskedLM) FlaxXLMRobertaForMaskedLM

### class transformers.FlaxXLMRobertaForMaskedLM

[](#transformers.FlaxXLMRobertaForMaskedLM) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fflax%5Fxlm%5Froberta.py#L1064)

( config: XLMRobertaConfiginput\_shape: Tuple = (1, 1)seed: int = 0dtype: dtype = <class 'jax.numpy.float32'>\_do\_init: bool = Truegradient\_checkpointing: bool = False\*\*kwargs ) 

Parameters 

* [](#transformers.FlaxXLMRobertaForMaskedLM.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.FlaxPreTrainedModel.from%5Fpretrained) method to load the model weights.

XLM RoBERTa Model with a `language modeling` head on top.

This model inherits from [FlaxPreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.FlaxPreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading, saving and converting weights from PyTorch models)

This model is also a[flax.linen.Module](https://flax.readthedocs.io/en/latest/api%5Freference/flax.linen/module.html) subclass. Use it as a regular Flax linen Module and refer to the Flax documentation for all matter related to general usage and behavior.

Finally, this model supports inherent JAX features such as:

* [Just-In-Time (JIT) compilation](https://jax.readthedocs.io/en/latest/jax.html#just-in-time-compilation-jit)
* [Automatic Differentiation](https://jax.readthedocs.io/en/latest/jax.html#automatic-differentiation)
* [Vectorization](https://jax.readthedocs.io/en/latest/jax.html#vectorization-vmap)
* [Parallelization](https://jax.readthedocs.io/en/latest/jax.html#parallelization-pmap)

#### \_\_call\_\_

[](#transformers.FlaxXLMRobertaForMaskedLM.%5F%5Fcall%5F%5F) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fflax%5Fxlm%5Froberta.py#L824)

( input\_idsattention\_mask \= Nonetoken\_type\_ids \= Noneposition\_ids \= Nonehead\_mask \= Noneencoder\_hidden\_states \= Noneencoder\_attention\_mask \= Noneparams: dict = Nonedropout\_rng: PRNGKey = Nonetrain: bool = Falseoutput\_attentions: Optional = Noneoutput\_hidden\_states: Optional = Nonereturn\_dict: Optional = Nonepast\_key\_values: dict = None ) → [transformers.modeling\_flax\_outputs.FlaxBaseModelOutputWithPooling](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Fflax%5Foutputs.FlaxBaseModelOutputWithPooling) or `tuple(torch.FloatTensor)`

The `FlaxXLMRobertaPreTrainedModel` forward method, overrides the `__call__` special method.

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.

Example:

>>> from transformers import AutoTokenizer, FlaxXLMRobertaForMaskedLM

>>> tokenizer = AutoTokenizer.from_pretrained("FacebookAI/xlm-roberta-base")
>>> model = FlaxXLMRobertaForMaskedLM.from_pretrained("FacebookAI/xlm-roberta-base")

>>> inputs = tokenizer("The capital of France is [MASK].", return_tensors="jax")

>>> outputs = model(**inputs)
>>> logits = outputs.logits

## [](#transformers.FlaxXLMRobertaForSequenceClassification) FlaxXLMRobertaForSequenceClassification

### class transformers.FlaxXLMRobertaForSequenceClassification

[](#transformers.FlaxXLMRobertaForSequenceClassification) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fflax%5Fxlm%5Froberta.py#L1131)

( config: XLMRobertaConfiginput\_shape: Tuple = (1, 1)seed: int = 0dtype: dtype = <class 'jax.numpy.float32'>\_do\_init: bool = Truegradient\_checkpointing: bool = False\*\*kwargs ) 

Parameters 

* [](#transformers.FlaxXLMRobertaForSequenceClassification.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.FlaxPreTrainedModel.from%5Fpretrained) method to load the model weights.

XLM Roberta Model transformer with a sequence classification/regression head on top (a linear layer on top of the pooled output) e.g. for GLUE tasks.

This model inherits from [FlaxPreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.FlaxPreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading, saving and converting weights from PyTorch models)

This model is also a[flax.linen.Module](https://flax.readthedocs.io/en/latest/api%5Freference/flax.linen/module.html) subclass. Use it as a regular Flax linen Module and refer to the Flax documentation for all matter related to general usage and behavior.

Finally, this model supports inherent JAX features such as:

* [Just-In-Time (JIT) compilation](https://jax.readthedocs.io/en/latest/jax.html#just-in-time-compilation-jit)
* [Automatic Differentiation](https://jax.readthedocs.io/en/latest/jax.html#automatic-differentiation)
* [Vectorization](https://jax.readthedocs.io/en/latest/jax.html#vectorization-vmap)
* [Parallelization](https://jax.readthedocs.io/en/latest/jax.html#parallelization-pmap)

#### \_\_call\_\_

[](#transformers.FlaxXLMRobertaForSequenceClassification.%5F%5Fcall%5F%5F) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fflax%5Fxlm%5Froberta.py#L824)

( input\_idsattention\_mask \= Nonetoken\_type\_ids \= Noneposition\_ids \= Nonehead\_mask \= Noneencoder\_hidden\_states \= Noneencoder\_attention\_mask \= Noneparams: dict = Nonedropout\_rng: PRNGKey = Nonetrain: bool = Falseoutput\_attentions: Optional = Noneoutput\_hidden\_states: Optional = Nonereturn\_dict: Optional = Nonepast\_key\_values: dict = None ) → [transformers.modeling\_flax\_outputs.FlaxSequenceClassifierOutput](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Fflax%5Foutputs.FlaxSequenceClassifierOutput) or `tuple(torch.FloatTensor)`

The `FlaxXLMRobertaPreTrainedModel` forward method, overrides the `__call__` special method.

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.

Example:

>>> from transformers import AutoTokenizer, FlaxXLMRobertaForSequenceClassification

>>> tokenizer = AutoTokenizer.from_pretrained("FacebookAI/xlm-roberta-base")
>>> model = FlaxXLMRobertaForSequenceClassification.from_pretrained("FacebookAI/xlm-roberta-base")

>>> inputs = tokenizer("Hello, my dog is cute", return_tensors="jax")

>>> outputs = model(**inputs)
>>> logits = outputs.logits

## [](#transformers.FlaxXLMRobertaForMultipleChoice) FlaxXLMRobertaForMultipleChoice

### class transformers.FlaxXLMRobertaForMultipleChoice

[](#transformers.FlaxXLMRobertaForMultipleChoice) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fflax%5Fxlm%5Froberta.py#L1212)

( config: XLMRobertaConfiginput\_shape: Tuple = (1, 1)seed: int = 0dtype: dtype = <class 'jax.numpy.float32'>\_do\_init: bool = Truegradient\_checkpointing: bool = False\*\*kwargs ) 

Parameters 

* [](#transformers.FlaxXLMRobertaForMultipleChoice.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.FlaxPreTrainedModel.from%5Fpretrained) method to load the model weights.

XLM Roberta Model with a multiple choice classification head on top (a linear layer on top of the pooled output and a softmax) e.g. for RocStories/SWAG tasks.

This model inherits from [FlaxPreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.FlaxPreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading, saving and converting weights from PyTorch models)

This model is also a[flax.linen.Module](https://flax.readthedocs.io/en/latest/api%5Freference/flax.linen/module.html) subclass. Use it as a regular Flax linen Module and refer to the Flax documentation for all matter related to general usage and behavior.

Finally, this model supports inherent JAX features such as:

* [Just-In-Time (JIT) compilation](https://jax.readthedocs.io/en/latest/jax.html#just-in-time-compilation-jit)
* [Automatic Differentiation](https://jax.readthedocs.io/en/latest/jax.html#automatic-differentiation)
* [Vectorization](https://jax.readthedocs.io/en/latest/jax.html#vectorization-vmap)
* [Parallelization](https://jax.readthedocs.io/en/latest/jax.html#parallelization-pmap)

#### \_\_call\_\_

[](#transformers.FlaxXLMRobertaForMultipleChoice.%5F%5Fcall%5F%5F) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fflax%5Fxlm%5Froberta.py#L824)

( input\_idsattention\_mask \= Nonetoken\_type\_ids \= Noneposition\_ids \= Nonehead\_mask \= Noneencoder\_hidden\_states \= Noneencoder\_attention\_mask \= Noneparams: dict = Nonedropout\_rng: PRNGKey = Nonetrain: bool = Falseoutput\_attentions: Optional = Noneoutput\_hidden\_states: Optional = Nonereturn\_dict: Optional = Nonepast\_key\_values: dict = None ) → [transformers.modeling\_flax\_outputs.FlaxMultipleChoiceModelOutput](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Fflax%5Foutputs.FlaxMultipleChoiceModelOutput) or `tuple(torch.FloatTensor)`

The `FlaxXLMRobertaPreTrainedModel` forward method, overrides the `__call__` special method.

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.

Example:

>>> from transformers import AutoTokenizer, FlaxXLMRobertaForMultipleChoice

>>> tokenizer = AutoTokenizer.from_pretrained("FacebookAI/xlm-roberta-base")
>>> model = FlaxXLMRobertaForMultipleChoice.from_pretrained("FacebookAI/xlm-roberta-base")

>>> prompt = "In Italy, pizza served in formal settings, such as at a restaurant, is presented unsliced."
>>> choice0 = "It is eaten with a fork and a knife."
>>> choice1 = "It is eaten while held in the hand."

>>> encoding = tokenizer([prompt, prompt], [choice0, choice1], return_tensors="jax", padding=True)
>>> outputs = model(**{k: v[None, :] for k, v in encoding.items()})

>>> logits = outputs.logits

## [](#transformers.FlaxXLMRobertaForTokenClassification) FlaxXLMRobertaForTokenClassification

### class transformers.FlaxXLMRobertaForTokenClassification

[](#transformers.FlaxXLMRobertaForTokenClassification) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fflax%5Fxlm%5Froberta.py#L1294)

( config: XLMRobertaConfiginput\_shape: Tuple = (1, 1)seed: int = 0dtype: dtype = <class 'jax.numpy.float32'>\_do\_init: bool = Truegradient\_checkpointing: bool = False\*\*kwargs ) 

Parameters 

* [](#transformers.FlaxXLMRobertaForTokenClassification.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.FlaxPreTrainedModel.from%5Fpretrained) method to load the model weights.

XLM Roberta Model with a token classification head on top (a linear layer on top of the hidden-states output) e.g. for Named-Entity-Recognition (NER) tasks.

This model inherits from [FlaxPreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.FlaxPreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading, saving and converting weights from PyTorch models)

This model is also a[flax.linen.Module](https://flax.readthedocs.io/en/latest/api%5Freference/flax.linen/module.html) subclass. Use it as a regular Flax linen Module and refer to the Flax documentation for all matter related to general usage and behavior.

Finally, this model supports inherent JAX features such as:

* [Just-In-Time (JIT) compilation](https://jax.readthedocs.io/en/latest/jax.html#just-in-time-compilation-jit)
* [Automatic Differentiation](https://jax.readthedocs.io/en/latest/jax.html#automatic-differentiation)
* [Vectorization](https://jax.readthedocs.io/en/latest/jax.html#vectorization-vmap)
* [Parallelization](https://jax.readthedocs.io/en/latest/jax.html#parallelization-pmap)

#### \_\_call\_\_

[](#transformers.FlaxXLMRobertaForTokenClassification.%5F%5Fcall%5F%5F) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fflax%5Fxlm%5Froberta.py#L824)

( input\_idsattention\_mask \= Nonetoken\_type\_ids \= Noneposition\_ids \= Nonehead\_mask \= Noneencoder\_hidden\_states \= Noneencoder\_attention\_mask \= Noneparams: dict = Nonedropout\_rng: PRNGKey = Nonetrain: bool = Falseoutput\_attentions: Optional = Noneoutput\_hidden\_states: Optional = Nonereturn\_dict: Optional = Nonepast\_key\_values: dict = None ) → [transformers.modeling\_flax\_outputs.FlaxTokenClassifierOutput](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Fflax%5Foutputs.FlaxTokenClassifierOutput) or `tuple(torch.FloatTensor)`

The `FlaxXLMRobertaPreTrainedModel` forward method, overrides the `__call__` special method.

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.

Example:

>>> from transformers import AutoTokenizer, FlaxXLMRobertaForTokenClassification

>>> tokenizer = AutoTokenizer.from_pretrained("FacebookAI/xlm-roberta-base")
>>> model = FlaxXLMRobertaForTokenClassification.from_pretrained("FacebookAI/xlm-roberta-base")

>>> inputs = tokenizer("Hello, my dog is cute", return_tensors="jax")

>>> outputs = model(**inputs)
>>> logits = outputs.logits

## [](#transformers.FlaxXLMRobertaForQuestionAnswering) FlaxXLMRobertaForQuestionAnswering

### class transformers.FlaxXLMRobertaForQuestionAnswering

[](#transformers.FlaxXLMRobertaForQuestionAnswering) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fflax%5Fxlm%5Froberta.py#L1371)

( config: XLMRobertaConfiginput\_shape: Tuple = (1, 1)seed: int = 0dtype: dtype = <class 'jax.numpy.float32'>\_do\_init: bool = Truegradient\_checkpointing: bool = False\*\*kwargs ) 

Parameters 

* [](#transformers.FlaxXLMRobertaForQuestionAnswering.config) **config** ([XLMRobertaConfig](https://huggingface.co/docs/transformers/v4.41.2/en/model%5Fdoc/xlm-roberta#transformers.XLMRobertaConfig)) — Model configuration class with all the parameters of the model. Initializing with a config file does not load the weights associated with the model, only the configuration. Check out the [from\_pretrained()](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.FlaxPreTrainedModel.from%5Fpretrained) method to load the model weights.

XLM Roberta Model with a span classification head on top for extractive question-answering tasks like SQuAD (a linear layers on top of the hidden-states output to compute `span start logits` and `span end logits`).

This model inherits from [FlaxPreTrainedModel](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/model#transformers.FlaxPreTrainedModel). Check the superclass documentation for the generic methods the library implements for all its model (such as downloading, saving and converting weights from PyTorch models)

This model is also a[flax.linen.Module](https://flax.readthedocs.io/en/latest/api%5Freference/flax.linen/module.html) subclass. Use it as a regular Flax linen Module and refer to the Flax documentation for all matter related to general usage and behavior.

Finally, this model supports inherent JAX features such as:

* [Just-In-Time (JIT) compilation](https://jax.readthedocs.io/en/latest/jax.html#just-in-time-compilation-jit)
* [Automatic Differentiation](https://jax.readthedocs.io/en/latest/jax.html#automatic-differentiation)
* [Vectorization](https://jax.readthedocs.io/en/latest/jax.html#vectorization-vmap)
* [Parallelization](https://jax.readthedocs.io/en/latest/jax.html#parallelization-pmap)

#### \_\_call\_\_

[](#transformers.FlaxXLMRobertaForQuestionAnswering.%5F%5Fcall%5F%5F) [< source \>](https://github.com/huggingface/transformers/blob/v4.41.2/src/transformers/models/xlm%5Froberta/modeling%5Fflax%5Fxlm%5Froberta.py#L824)

( input\_idsattention\_mask \= Nonetoken\_type\_ids \= Noneposition\_ids \= Nonehead\_mask \= Noneencoder\_hidden\_states \= Noneencoder\_attention\_mask \= Noneparams: dict = Nonedropout\_rng: PRNGKey = Nonetrain: bool = Falseoutput\_attentions: Optional = Noneoutput\_hidden\_states: Optional = Nonereturn\_dict: Optional = Nonepast\_key\_values: dict = None ) → [transformers.modeling\_flax\_outputs.FlaxQuestionAnsweringModelOutput](https://huggingface.co/docs/transformers/v4.41.2/en/main%5Fclasses/output#transformers.modeling%5Fflax%5Foutputs.FlaxQuestionAnsweringModelOutput) or `tuple(torch.FloatTensor)`

The `FlaxXLMRobertaPreTrainedModel` forward method, overrides the `__call__` special method.

Although the recipe for forward pass needs to be defined within this function, one should call the `Module`instance afterwards instead of this since the former takes care of running the pre and post processing steps while the latter silently ignores them.

Example:

>>> from transformers import AutoTokenizer, FlaxXLMRobertaForQuestionAnswering

>>> tokenizer = AutoTokenizer.from_pretrained("FacebookAI/xlm-roberta-base")
>>> model = FlaxXLMRobertaForQuestionAnswering.from_pretrained("FacebookAI/xlm-roberta-base")

>>> question, text = "Who was Jim Henson?", "Jim Henson was a nice puppet"
>>> inputs = tokenizer(question, text, return_tensors="jax")

>>> outputs = model(**inputs)
>>> start_scores = outputs.start_logits
>>> end_scores = outputs.end_logits

