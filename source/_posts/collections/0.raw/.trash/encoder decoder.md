# Encoder 模型
Encoder 模型仅使用 Transformer 中的 encoder。在每个阶段，注意力层都可以访问原始句子中的每个单词。这种模型通常拥有“**双向注意力**”的特点，常被称作自动编码模型（auto-encoding models）。

这类模型的预训练一般围绕着重构被污染的原句子，例如**随机掩盖**掉原句中的一部分单词再让模型去预测它们。Encoder 模型最适用于需要对整个句子进行理解的任务（比如句子分类、命名实体识别、QA 等）。

这个系列模型的代表包括：
- ALBERT 
- BERT 
- DistilBERT 
- ELECTRA 
- RoBERTa

# Decoder 模型
Decoder 模型仅使用 Transformre 中的 decoder。在每个阶段，注意力层仅能访问给定单词在句子中之前位置的单词。这种模型常被称作自回归模型（auto-regressive models）。

这类模型的预训练一般围绕着预测句子中的下一个词展开。Decoder 模型最适合涉及文本生成的任务。

这个系列模型的代表包括： 
- CTRL 
- GPT 
- GPT-2 
- Transformer XL