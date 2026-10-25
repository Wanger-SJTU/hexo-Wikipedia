---
title: 如何从零构建语言特定的LLM [完整手册]
date: "2026-04-25 00:00:00"
updated: "2026-04-25 00:00:00"
layout: post
permalink: /collections/0.raw/web/从零构建语言特定LLM完整指南-freeCodeCamp/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - LLM
  - 训练
  - 教程
  - freeCodeCamp
source_url: https://www.freecodecamp.org/news/how-to-build-your-own-language-specific-llm-handbook/
---


2026年4月24日

## 如何从零构建语言特定的LLM [完整手册]

如果你能从零开始构建一个会说你的母语的LLM，会怎样？这正是我们在这个教程中要做的。理解LLM工作原理的最好方式就是亲手构建一个。

我们将逐步讲解如何用特定语言（本例中为乌尔都语）创建自己的LLM。这将帮助你理解LLM内部的运作机制。

现代LLM的起源可以追溯到那篇改变一切的论文：[<strong>"Attention Is All You Need"</strong>](https://arxiv.org/abs/1706.03762)。但我们不会迷失在数学公式中（很遗憾，我数学不好），而是通过动手实践来学习。

## 这本手册适合谁？

软件工程师、产品负责人，或者任何对LLM工作原理感到好奇的人。如果你有一些机器学习知识会更好，但没有也没关系。我写这篇教程时确保你不需要参考任何外部资料。

学完之后，你将拥有一个<strong>可运行、已部署的乌尔都语LLM聊天机器人</strong>。你也可以按照下面定义的步骤，为自己的母语创建一个。

## 关于期望的说明：

这里的目标是通过实际操作所有步骤来学习LLM的工作原理。

目标<strong>不是</strong>让你的LLM表现得像ChatGPT。那需要海量数据集、数月的训练时间以及基于人类反馈的强化学习（RLHF）等条件，通过这个教程你会更好地理解这些因素。

## 关于代码的说明：

本教程中的代码主要由Claude Opus 4生成。这一点值得强调，因为它展示了LLM不仅仅是帮你更快交付功能的编码助手，它们也可以是强大的学习工具。

通过提示Claude生成、解释和迭代每个组件，我对LLM训练内部机制的理解比单纯阅读文档要深入得多。

如果你跟着做，我鼓励你也这样做：用LLM辅助你的学习。

## 我们将涵盖的内容：

[LLM训练的组成部分](#heading-components-of-llm-training)

[所需技术栈](#heading-tech-stack-required)

[1. 数据准备](#heading-1-data-preparation)

[数据清洗](#heading-data-cleaning)

[2. 分词（Tokenization）](#heading-2-tokenization)

[分词方法](#heading-tokenization-approaches)

[特殊Token](#heading-special-tokens)

[BPE分词器配置](#heading-bpe-tokenizer-configuration)

[构建分词器](#heading-building-the-tokenizer)

[训练分词器](#heading-training-the-tokenizer)

[配置后处理（自动添加BOS/EOS）](#heading-configuring-post-processing-auto-wrapping-with-boseos)

[测试分词器](#heading-testing-the-tokenizer)

[生育率分数](#heading-fertility-score)

[保存分词器](#heading-saving-the-tokenizer)

[3. 预训练](#heading-3-pre-training)

[预训练步骤](#heading-steps-to-do-pre-training)

[模型配置](#heading-model-configuration)

[配置参数详解](#heading-configuration-parameters-explained)

[Transformer架构](#heading-transformer-architecture)

[Transformer代码拆解](#heading-transformer-code-breakdown)

[加载数据集和训练](#heading-loading-the-dataset-and-training)

[训练代码逐行解析](#heading-training-code-explained-line-by-line)

[总结：6步完成一个Batch](#heading-summary-one-batch-in-6-steps)

[关键指标](#heading-key-metrics)

[4. 监督微调（SFT）](#heading-4-supervised-fine-tuning-sft)

[格式化对话数据](#heading-formatting-conversations-for-training)

[格式化总结](#heading-formatting-summary)

[SFT数据集与DataLoader](#heading-sft-dataset-amp-dataloader)

[加载预训练模型](#heading-loading-the-pre-trained-model)

[SFT训练循环](#heading-sft-training-loop)

[聊天函数：推理](#heading-chat-function-inference)

[5. 部署](#heading-5-deployment)

[Gradio Web界面（app.py）](#heading-gradio-web-interface-apppy)

[部署选项](#heading-deployment-options)

[完整流水线总结](#heading-full-pipeline-summary)

[结果](#heading-results)

[结论](#heading-conclusion)

## LLM训练的组成部分

在本教程中，我们将逐一讲解以下组件，并提供代码示例以便理解：

数据准备

分词（Tokenization）

预训练

监督微调（SFT）

部署

## 所需技术栈

在开始之前，这里是你需要的技术栈：

Python 3.9+

PyTorch

Tokenizers / SentencePiece

Hugging Face Datasets & Hub

regex, BeautifulSoup4, requests（用于数据清洗）

tqdm, matplotlib（用于训练工具）

Gradio（用于聊天UI部署）

Google Colab（免费T4 GPU用于训练）

<strong>注意：</strong> 开始之前，请确保已安装仓库中 `requirements.txt` 文件列出的所有依赖。

## 1. 数据准备

在数据准备阶段，首要步骤是<strong>数据收集</strong>。LLM需要在大量文本数据上进行训练。没有一个地方能获取所有数据，根据你要构建的模型类型，可以从多种来源收集文本：

<strong>数字图书馆和档案馆：</strong> [Internet Archive](https://archive.org/) 或 Wikipedia dumps

<strong>代码仓库：</strong> GitHub, GitLab（如果你的模型需要理解代码的话很有用）

<strong>网页爬取：</strong> 使用自动化脚本爬取网站、博客和论坛

<strong>学术数据集：</strong> 研究论文、开放获取期刊

<strong>现成数据集：</strong> [Hugging Face Datasets](https://huggingface.co/datasets) 和 [Kaggle](https://www.kaggle.com/datasets) 等平台托管了数千个即用型数据集

在实际操作中，GPT和LLaMA等大规模LLM主要依赖通过自动化流水线从多个来源爬取网页数据。但有一个重要原则需要遵循：<strong>只使用公开可用的开源数据。</strong> 不要爬取私人的或个人用户信息。坚持使用明确公开分享或属于宽松许可协议的数据。

<strong>另外，</strong> 请记住这个原则：<strong>垃圾进，垃圾出。</strong> 仅仅获取数据是不够的，数据应该是正确的、干净的、没有噪声的。

实际操作中，你可以从不同来源收集数据。在我的案例中，我从<strong>Hugging Face</strong>找到了足够好的数据。Hugging Face有[<strong>CulturaX</strong>](https://huggingface.co/datasets/uonlp/CulturaX)多语言数据集。数据集非常大，所以我没有下载全部，只下载了一小部分。

本教程我选择<strong>Hugging Face</strong>作为数据源。选择它有几个原因。

首先，既然目标是学习LLM的工作原理，我想把时间花在模型上，而不是写网页爬虫。Hugging Face已经有大量清洗过、结构化的数据集，这省去了很多前期工作。

其次，Hugging Face提供特定语言的数据集。因为我在构建乌尔都语LLM，我特别需要乌尔都语文本，而Hugging Face有[<strong>CulturaX</strong>](https://huggingface.co/datasets/uonlp/CulturaX)，提供包括乌尔都语在内的多语言数据集。数据集非常大，所以我没有下载全部，只下载了一小部分。

<strong>重要提示：</strong> 在从Hugging Face下载数据集之前，你需要创建一个账户。然后通过CLI登录，之后才能下载数据集。

在下面的脚本中，我们从Hugging Face加载数据集，并将streaming设置为`True`。这样做的好处是我们不需要下载所有数据，只需按`NUM_SAMPLES`定义的块获取样本：

```
# ============================================================
# Option A: Download from CulturaX (recommended, high quality)
# ============================================================
# CulturaX is a cleaned version of mC4 + OSCAR
# We stream it to avoid downloading the entire dataset

NUM_SAMPLES = 100_000  # Start with 100K samples (~50-100MB text)

print("Loading CulturaX Urdu dataset (streaming)...")
dataset = load_dataset(
    "uonlp/CulturaX",
    "ur",                    # Urdu language code
    split="train",
    streaming=True,          # Don't download everything
    trust_remote_code=True
)

# Collect samples
raw_texts = []
for i, sample in enumerate(tqdm(dataset, total=NUM_SAMPLES, desc="Downloading")):
    if i >= NUM_SAMPLES:
        break
    raw_texts.append(sample["text"])

print(f"\nDownloaded {len(raw_texts)} samples")
print(f"Total characters: {sum(len(t) for t in raw_texts):,}")
print(f"\nSample text (first 500 chars):")
print(raw_texts[0][:500])

```

## 数据清洗

仅仅拥有数据不足以开始训练模型。下一步可能是最重要的一步：<strong>数据清洗</strong>。目标是让数据尽可能纯净。

因为我构建的是特定语言的乌尔都语LLM，我需要编写清洗逻辑来移除非乌尔都语文本、HTML链接、特殊字符、重复内容和多余空格。所有这些因素都会污染训练数据，可能在训练期间引起问题。

根据数据集类型，需要进行一些特定语言或特定用例的清洗。

你可能不太熟悉的一个步骤是<strong>NFKC Unicode规范化</strong>。这会将看起来相同但以不同Unicode形式存在的文本统一为一种规范形式。

你还会看到一些用于只保留乌尔都语文本的正则表达式模式。由于乌尔都语文字基于阿拉伯语，我们使用阿拉伯语Unicode范围。我还移除了原始数据中存在的`//`、`--`和多余空格等残留物。

这个清洗过程经过了多次迭代。每次我都会手动审查结果，发现不一致的间距、长破折号和零散标点等问题。所有这些问题都可能对后续阶段产生负面影响，所以彻底清洗很重要。

这也让你了解到数据部分仍然有多么重要，以及LLM在多大程度上依赖于数据。

以下是我使用的清洗函数：

```
def clean_urdu_text(text: str) -> str:
    """
    Clean a single Urdu text document.
    
    Steps:
    1. Remove URLs
    2. Remove HTML tags and entities
    3. Remove email addresses
    4. Normalize Unicode (NFKC normalization)
    5. Remove non-Urdu characters (keep Urdu + punctuation + digits)
    6. Normalize repeated punctuation (۔۔۔, ..., - -, etc.)
    7. Normalize whitespace
    """
    import unicodedata
    
    # Step 1: Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    
    # Step 2: Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Remove HTML entities
    text = re.sub(r'&[a-zA-Z]+;', ' ', text)
    text = re.sub(r'&#\d+;', ' ', text)
    
    # Step 3: Remove email addresses
    text = re.sub(r'\S+@\S+', '', text)
    
    # Step 4: Unicode normalization (NFKC)
    # This normalizes different representations of the same character
    text = unicodedata.normalize('NFKC', text)
    
    # Step 5: Keep only Urdu characters, basic punctuation, digits, and whitespace
    # Urdu Unicode ranges + Arabic punctuation + Western digits + basic punctuation
    urdu_pattern = regex.compile(
        r'[^'
        r'\u0600-\u06FF'    # Arabic (includes Urdu)
        r'\u0750-\u077F'    # Arabic Supplement
        r'\u08A0-\u08FF'    # Arabic Extended-A
        r'\uFB50-\uFDFF'    # Arabic Presentation Forms-A
        r'\uFE70-\uFEFF'    # Arabic Presentation Forms-B
        r'0-9۰-۹'           # Western and Eastern Arabic-Indic digits
        r'\s'               # Whitespace
        r'۔،؟!٪'           # Urdu punctuation (full stop, comma, question mark, etc.)
        r'.,:;!?\-\(\)"\']'  # Basic Latin punctuation
    )
    text = urdu_pattern.sub(' ', text)
    
    # Step 6: Normalize repeated punctuation
    text = re.sub(r'۔{2,}', '۔', text)
    text = re.sub(r'\.{2,}', '.', text)
    text = re.sub(r'-\s*-+', '-', text)
    text = re.sub(r'-{2,}', '-', text)
    text = re.sub(r'،{2,}', '،', text)
    text = re.sub(r',{2,}', ',', text)
    text = re.sub(r'\s+[۔\.\-,،]\s+', ' ', text)
    
    # Step 7: Normalize whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)  # Max 2 newlines
    text = re.sub(r'[^\S\n]+', ' ', text)    # Collapse spaces (but keep newlines)
    text = text.strip()
    
    return text

def is_mostly_urdu(text: str, threshold: float = 0.5) -> bool:
    """
    Check if text is mostly Urdu characters.
    This filters out documents that are primarily English/other languages.
    
    threshold: minimum fraction of characters that must be Urdu
    """
    if len(text) == 0:
        return False
    urdu_chars = len(regex.findall(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]', text))
    return (urdu_chars / len(text)) > threshold

# Test the cleaning function
sample = raw_texts[0]
print("=== BEFORE CLEANING ===")
print(sample[:300])
print("\n=== AFTER CLEANING ===")
cleaned = clean_urdu_text(sample)
print(cleaned[:300])
print(f"\nIs mostly Urdu: {is_mostly_urdu(cleaned)}")

```

清洗完成后，我将数据存储为两种格式：<strong>文本文件</strong>（用于分词器训练）和<strong>JSONL文件</strong>（用于预训练）。每种格式在后续步骤中都有特定用途。

## 2. 分词（Tokenization）

清洗后的下一步是<strong>分词</strong>。分词将文本转换为数字，并提供将这些数字转换回文本的方法。

这是必要的，因为神经网络无法理解文本——它们只能理解数字。所以分词本质上是人类语言和模型能处理的格式之间的翻译层。

例如：

```
"hello world"  →  ["hel", "lo", " world"]  →  [1245, 532, 995]
"اردو زبان"   ←  ["ار", "دو", "زب", "ان"]  ←  [412, 87, 953, 201]

```

## 分词方法

主要有三种分词方法：

## 方法1：字符级

这种方法将文本拆分为单个字符：

`hello` -> `['h', 'e', 'l', 'l', 'o']`

`اردو` -> `['ا', 'ر', 'د', 'و']`

问题是序列会变得非常长。一篇1000词的文档可能变成5000+个token。模型需要学会将字符组合成单词，这非常困难。

## 方法2：词级

这种方法按单词之间的空格拆分：

`hello how are you` -> `['hello', 'how', 'are', 'you']`

`اردو بہت اچھی زبان ہے` -> `['اردو', 'بہت', 'اچھی', 'زبان', 'ہے']`

问题是语言的词汇量巨大（乌尔都语有10万+个独特词，英语有17万+）。模型无法处理新词或罕见词（词汇表外问题）。

## 方法3：使用BPE（字节对编码）的子词分词

这种方法让模型从数据中学习常见的字符序列。

`unhappiness` 可能拆分为 `['un', 'happi', 'ness']`

مکمل` 可能拆分为 `['مکم', 'ل']` 或如果足够常见则保持完整。

词汇表更小（我们使用32K个token），且能处理任何单词，甚至新词。常见词保持为单个token。

BPE是行业标准，被GPT、LLaMA和大多数现代LLM使用。以下是它的工作步骤：

<strong>从字符开始：</strong> 词汇表 = 所有个体字符

<strong>计算配对：</strong> 找出最常见的相邻token对

<strong>合并：</strong> 将该配对合并为新token

<strong>重复：</strong> 直到词汇表达到目标大小

示例：

```
Start:  ا ر د و   ز ب ا ن
Merge 1: 'ا ر' -> 'ار'    (most common pair)
Result: ار د و   ز ب ا ن
Merge 2: 'ز ب' -> 'زب'    (next most common)
Result: ار د و   زب ا ن
...and so on for 32,000 merges

```

这就是我们为乌尔都语LLM采用的方法。我在清洗后的乌尔都语文本上训练了一个词汇表大小为32K的BPE分词器。

## 特殊Token

除了BPE，我们还需要添加一些<strong>特殊Token</strong>。这些token为模型在训练和推理期间提供所需的结构化信息。

| Token | 用途 | 为什么需要 |
|-------|------|-----------|
| `<pad>` | 等长序列的填充 | 批处理要求所有序列长度相同。较短的序列用`<pad>`填充。 |
| `<unk>` | 未知词回退 | 如果模型遇到不在词汇表中的token，它会映射到`<unk>`而不会失败。 |
| `<bos>` | 标记序列开始 | 告诉模型输入从哪里开始，使生成更稳定。 |
| `<eos>` | 标记序列结束 | 告诉模型何时停止生成。没有它，输出可能无限运行或随机停止。 |
| `<sep>` | 分隔段落 | 在对话格式中，分隔系统提示、用户消息和助手回复，让模型知道哪个角色是哪个。 |
| `<user>` | | |
| `<assistant>` | | |
| `<system>` | | |

## BPE分词器配置

我将词汇表大小设置为<strong>32K</strong>。这意味着什么？意味着模型的词汇查找表中将有32K个token。

这是语言覆盖率和模型大小之间的良好平衡。如果增加词汇表大小，嵌入层和输出层都会增大，意味着需要训练更多参数。对于一个学习项目来说，32K保持可控。

MIN_FREQUENCY`设置为2，意味着一个token必须在语料库中至少出现两次才会被包含。这过滤掉了一次性的噪声token，避免浪费词汇表空间。

<strong>参考：</strong> GPT-2使用50K个token的词汇表，LLaMA使用32K。我们选择32K与生产模型保持一致。

```
VOCAB_SIZE = 32_000  # Number of tokens in our vocabulary
MIN_FREQUENCY = 2    # Token must appear at least twice (filters noise)

# Special tokens - these have reserved IDs
SPECIAL_TOKENS = [
    "<pad>",    # ID 0: padding
    "<unk>",    # ID 1: unknown
    "<bos>",    # ID 2: beginning of sequence 
    "<eos>",    # ID 3: end of sequence
    "<sep>",    # ID 4: separator (for chat format)
    "egli>",     # ID 5: user turn marker (for chat)
    "gpt>", # ID 6: assistant turn marker (for chat)
    "er",    # ID 7: system prompt marker (for chat)
]

```

## 构建分词器

接下来是使用我们之前创建的清洗后文本文件来构建分词器。首先，我们导入所需的库并设置文件路径：

```
import os
from pathlib import Path
from tokenizers import (
    Tokenizer,
    models,
    trainers,
    pre_tokenizers,
    decoders,
    processors,
    normalizers,
)

PROJECT_ROOT = Path(".").resolve().parent
CLEANED_DIR = PROJECT_ROOT / "data" / "cleaned"
TOKENIZER_DIR = PROJECT_ROOT / "tokenizer" / "urdu_tokenizer"
TOKENIZER_DIR.mkdir(parents=True, exist_ok=True)

CORPUS_FILE = str(CLEANED_DIR / "urdu_corpus.txt")
print(f"Corpus file: {CORPUS_FILE}")
print(f"Tokenizer output: {TOKENIZER_DIR}")

# Verify corpus exists
assert os.path.exists(CORPUS_FILE), f"Corpus not found at {CORPUS_FILE}. Run notebook 01 first!"
file_size_mb = os.path.getsize(CORPUS_FILE) / 1024 / 1024
print(f"Corpus size: {file_size_mb:.1f} MB")

```

现在我们来配置分词器组件：

```
# ============================================================
# Build the tokenizer
# ============================================================

# Step 1: Create a BPE model (the core algorithm)
tokenizer = Tokenizer(models.BPE(unk_token="<unk>"))

# Step 2: Add normalizer (text cleaning before tokenization)
# NFKC normalizes Unicode (e.g., different forms of the same Arabic letter)
tokenizer.normalizer = normalizers.NFKC()

# Step 3: Pre-tokenizer (how to split text before BPE)
# We use Metaspace which replaces spaces with ▁ and splits on them
# This preserves space information so we can reconstruct the original text
tokenizer.pre_tokenizer = pre_tokenizers.Metaspace()

# Step 4: Decoder (how to convert tokens back to text)
# Metaspace decoder converts ▁ back to spaces
tokenizer.decoder = decoders.Metaspace()

# Step 5: Configure the trainer
trainer = trainers.BpeTrainer(
    vocab_size=VOCAB_SIZE,
    min_frequency=MIN_FREQUENCY,
    special_tokens=SPECIAL_TOKENS,
    show_progress=True,
    initial_alphabet=[]  # Learn alphabet from data
)

print("Tokenizer configured. Ready to train!")

```

## 训练分词器

分词器配置完成后，下一步是运行它。根据你的设备，这大约需要5到10分钟。

```
print("Training tokenizer... (this may take a few minutes)")
tokenizer.train([CORPUS_FILE], trainer)

print(f"\n Tokenizer trained!")
print(f"  Vocabulary size: {tokenizer.get_vocab_size():,}")

```

## 配置后处理（自动添加BOS/EOS）

接下来，我们配置后处理，让分词器自动用`<bos>`和`<eos>`token包裹每个序列。这意味着我们不必每次编码文本时都手动添加它们：

```
bos_id = tokenizer.token_to_id("<bos>")
eos_id = tokenizer.token_to_id("<eos>")

tokenizer.post_processor = processors.TemplateProcessing(
    single=f"<bos>:0 $A:0 <eos>:0",
    pair=f"<bos>:0 \(A:0 <sep>:0 \)B:1 <eos>:1",
    special_tokens=[
        ("<bos>", bos_id),
        ("<eos>", eos_id),
        ("<sep>", tokenizer.token_to_id("<sep>")),
    ],
)

print("Post-processor configured (auto-adds <bos> and <eos>)")

```

<strong>注意：</strong> 你可能会想，既然我们已经在`SPECIAL_TOKENS`中定义了`<bos>`和`<eos>`，为什么还需要这一步？`SPECIAL_TOKENS`列表只是为这些token<strong>预留词汇表位置</strong>（分配ID）。后处理告诉分词器在每次编码序列时<strong>自动插入</strong>它们。

没有这一步，这些token会存在于词汇表中，但永远不会出现在你的数据中，除非你每次都手动添加。

## 测试分词器

分词的最后一步是测试它。测试将乌尔都语句子编码为token ID，然后将这些ID解码回文本。如果解码后的文本与原始输入匹配，说明分词器工作正常。这个往返测试确认了编码和解码过程中没有信息丢失：

```
test_sentences = [
    "اردو ایک بہت خوبصورت زبان ہے",           # "Urdu is a very beautiful language"
    "پاکستان کا دارالحکومت اسلام آباد ہے",      # "The capital of Pakistan is Islamabad"
    "آج موسم بہت اچھا ہے",                     # "The weather is very nice today"
    "مصنوعی ذہانت مستقبل کی ٹیکنالوجی ہے",     # "AI is the technology of the future"
    "السلام علیکم! آپ کیسے ہیں؟",               # "Peace be upon you! How are you?"
]

print("=" * 70)
print("TOKENIZER TEST RESULTS")
print("=" * 70)

for sentence in test_sentences:
    encoded = tokenizer.encode(sentence)
    decoded = tokenizer.decode(encoded.ids)
    
    print(f"\n Input:    {sentence}")
    print(f" Token IDs: {encoded.ids}")
    print(f"  Tokens:   {encoded.tokens}")
    print(f" Decoded:  {decoded}")
    print(f"   Num tokens: {len(encoded.ids)}")
    print(f"   Roundtrip OK: {sentence in decoded}")
    print("-" * 70)

```

输出看起来像这样：

```
======================================================================
TOKENIZER TEST RESULTS
======================================================================

 Input:    اردو ایک بہت خوبصورت زبان ہے
 Token IDs: [2, 1418, 324, 431, 2965, 1430, 276, 3]
 Tokens:   ['<bos>', '▁اردو', '▁ایک', '▁بہت', '▁خوبصورت', '▁زبان', '▁ہے', '<eos>']
 Decoded:  اردو ایک بہت خوبصورت زبان ہے
   Num tokens: 8
   Roundtrip OK: True
----------------------------------------------------------------------

 Input:    پاکستان کا دارالحکومت اسلام آباد ہے
 Token IDs: [2, 474, 289, 3699, 616, 1004, 276, 3]
 Tokens:   ['<bos>', '▁پاکستان', '▁کا', '▁دارالحکومت', '▁اسلام', '▁آباد', '▁ہے', '<eos>']
 Decoded:  پاکستان کا دارالحکومت اسلام آباد ہے
   Num tokens: 8
   Roundtrip OK: True

```

注意`<bos>`和`<eos>`是如何自动添加的（归功于我们的后处理步骤），常见的乌尔都语词汇如`پاکستان`保持为单个token，`▁`前缀标记了来自Metaspace预分词器的词边界。最重要的是，每个往返测试都成功，意味着解码后的文本与原始输入完全匹配。

## 生育率分数（Fertility Score）

Fertility是每个词的平均token数。

Fertility为1意味着每个词映射到一个token（理想情况，但在现代子词分词器中不现实）。

在现代LLM中，Fertility通常在1.3–2.5之间，取决于语言。

较高的Fertility意味着更多的token拆分，增加了成本并降低了效率，但它也受语言复杂度影响，不仅仅取决于分词器质量。

```
# ============================================================
# Calculate fertility score on training corpus
# ============================================================
import json

jsonl_file = CLEANED_DIR / "urdu_corpus.jsonl"
corpus_words = 0
corpus_tokens = 0
sample_size = 10000  # Sample 10K documents for speed

print(f"Calculating fertility on {sample_size:,} documents from corpus...")

with open(jsonl_file, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if i >= sample_size:
            break
        doc = json.loads(line)
        text = doc["text"]
        
        words = text.split()
        tokens = tokenizer.encode(text).tokens
        n_tokens = len(tokens) - 2  # Remove <bos> and <eos>
        
        corpus_words += len(words)
        corpus_tokens += n_tokens

corpus_fertility = corpus_tokens / corpus_words
print(f"\n📊 Fertility Score (corpus): {corpus_fertility:.2f} tokens/word")
print(f"   (Total: {corpus_words:,} words → {corpus_tokens:,} tokens)")
print(f"   Documents sampled: {min(i+1, sample_size):,}")

if corpus_fertility < 2.0:
    print("   ✅ Excellent! Tokenizer is well-optimized for Urdu.")
elif corpus_fertility < 3.0:
    print("   ⚠️ Good, but could be better. Consider larger vocab.")
else:
    print("   ❌ High fertility. The tokenizer needs improvement.")

```

我们这里得到的Fertility分数是1.04，相当不错。但请记住，这个数字人为偏低，因为分词器是在它被评估的同一小语料库上训练的。在更大或未见过的数据集上，Fertility可能会更高（接近生产级分词器典型的1.3-2.5范围）。

## 保存分词器

最后一步是将分词器保存为JSON格式并验证它能正确加载：

```
# ============================================================
# Save the tokenizer
# ============================================================

tokenizer_path = str(TOKENIZER_DIR / "urdu_bpe_tokenizer.json")
tokenizer.save(tokenizer_path)

print(f" Tokenizer saved to: {tokenizer_path}")
print(f"   File size: {os.path.getsize(tokenizer_path) / 1024:.0f} KB")

# Verify we can load it back
loaded_tokenizer = Tokenizer.from_file(tokenizer_path)
test = loaded_tokenizer.encode("اردو ایک خوبصورت زبان ہے")
print(f"\n   Verification: {test.tokens}")
print(f"    Tokenizer loads correctly!")

```

保存后，我们就拥有了一个查找表。使用它以及我们的语料库数据，可以执行下一个重要步骤：<strong>预训练</strong>。

## 3. 预训练

在这一部分，模型学习语言、语法、模式和词汇。训练完成后，模型能够预测序列中的下一个词，这也是我们开始看到原始数据转化为LLM的地方。

<strong>LLM本质上是下一个词的预测器。</strong> 给定一个词序列，它们预测最可能的下一个词。

通过训练，模型学到：

语言的语法

语义，即上下文含义

常用表达

训练数据集中的事实

关于训练，你有一些选项。由于模型很小，你可以在本地机器上训练。速度会慢一些，但能完成工作。

另一个选择是使用Google Colab。这是我用的——免费版本足够我所需的训练，使用T4 GPU。

## 预训练步骤

将数据集JSONL文件和分词器上传到Google Drive。

设置模型配置（词汇表大小、层数、注意力头数等）。

定义Transformer架构（注意力、前馈、块）。

加载并分词语料库，划分为训练集/验证集。

使用优化器、学习率调度和检查点运行训练循环。

## 模型配置

```
from dataclasses import dataclass

@dataclass
class UrduLLMConfig:
    # Vocabulary
    vocab_size: int = 32_000
    pad_token_id: int = 0
    bos_token_id: int = 2
    eos_token_id: int = 3

    # Model Architecture
    d_model: int = 384
    n_layers: int = 6
    n_heads: int = 6
    d_ff: int = 1536  # 4 * d_model
    dropout: float = 0.1
    max_seq_len: int = 256

    # Training
    batch_size: int = 32
    learning_rate: float = 3e-4
    weight_decay: float = 0.1
    max_epochs: int = 10
    warmup_steps: int = 500
    grad_clip: float = 1.0

```

## 配置参数详解：

词汇表参数（`vocab_size`、`pad_token_id`、`bos_token_id`、`eos_token_id`）与我们之前构建的分词器一致。`vocab_size`是32K（我们的BPE词汇表），特殊token的ID（0、2、3）对应我们在分词器训练期间分配的位置。

## 模型架构参数：

| 变量 | 含义 | 示例 | 数值的影响 |
|------|------|------|-----------|
| `d_model` | 每个token的嵌入/向量大小 | 384 | 更高：理解力更强但更慢、更耗内存。更低：更快但表达能力更弱 |
| `n_layers` | Transformer层数 | 6 | 更多层：理解更深入但延迟更高。更少层：更快但能力更弱 |
| `n_heads` | 每层的注意力头数 | 6 | 更多头：更好的上下文捕获。太少：注意力多样性受限 |
| `d_ff` | 前馈层大小 | 1536 | 更大：更多计算能力。更小：更快但变换更弱 |
| `dropout` | 训练期间丢弃的神经元比例 | 0.1 | 更高：防止过拟合但可能欠拟合。更低：更好的训练拟合但有过拟合风险 |
| `max_seq_len` | 每个输入的最大token数 | 256 | 更高：更多上下文但更慢、更贵。更低：更快但上下文受限 |

## 训练超参数：

| 变量 | 含义 | 示例 | 数值的影响 |
|------|------|------|-----------|
| `batch_size` | 每个训练步的样本数 | 32 | 更大：训练更快但需要更多内存。更小：稳定但更慢 |
| `learning_rate` | 更新的步长 | 0.0003 | 太高：训练不稳定。太低：学习非常慢 |
| `weight_decay` | 正则化强度 | 0.1 | 更高：减少过拟合。更低：有过拟合风险 |
| `max_epochs` | 完整遍历数据集的次数 | 10 | 更多：学习更好但有过拟合风险。更少：模型训练不足 |
| `warmup_steps` | 学习率渐进增加的步数 | 500 | 更多：启动更平滑、更安全。更少：早期不稳定的风险 |
| `grad_clip` | 最大梯度值 | 1.0 | 更低：稳定但学习更慢。更高：有梯度爆炸风险 |

## Transformer架构

接下来是训练的主要部分：编写<strong>Transformer架构</strong>。在看代码之前，了解什么是Transformer架构很重要。

要深入了解什么是Transformer以及它们与RNN和CNN的区别，我建议阅读这篇文章：[AWS: What is Transformers in Artificial Intelligence](https://aws.amazon.com/what-is/transformers-in-artificial-intelligence/)

简单来说：

"Transformer是一种神经网络架构，将输入序列转换或变换为输出序列。"

原始的Transformer论文同时引入了<strong>编码器</strong>（读取输入）和<strong>解码器</strong>（生成输出）。但像我们这样的GPT风格模型只使用解码器部分。这被称为<strong>仅解码器（decoder-only）</strong>架构。

解码器接收一个token序列，应用[<strong>自注意力</strong>](https://www.ibm.com/think/topics/self-attention)来理解它们之间的关系，并预测下一个token。

自注意力是Transformer强大的原因：与按顺序逐个处理token（如RNN）不同，模型同时查看所有之前的token，并确定哪些与当前预测最相关。

以下是完整的Transformer代码。每个组件的详细拆解如下：

```
import math
import torch
import torch.nn as nn
import torch.nn.functional as F

class MultiHeadSelfAttention(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.n_heads = config.n_heads
        self.d_model = config.d_model
        self.head_dim = config.d_model // config.n_heads

        self.qkv_proj = nn.Linear(config.d_model, 3 * config.d_model)
        self.out_proj = nn.Linear(config.d_model, config.d_model)
        self.dropout = nn.Dropout(config.dropout)

    def forward(self, x, mask=None):
        B, T, C = x.shape

        qkv = self.qkv_proj(x)
        qkv = qkv.reshape(B, T, 3, self.n_heads, self.head_dim)
        qkv = qkv.permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]

        attn = (q @ k.transpose(-2, -1)) * (self.head_dim ** -0.5)

        if mask is not None:
            attn = attn.masked_fill(mask == 0, float('-inf'))

        attn = F.softmax(attn, dim=-1)
        attn = self.dropout(attn)

        out = attn @ v
        out = out.transpose(1, 2).reshape(B, T, C)
        out = self.out_proj(out)
        return out

class FeedForward(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.fc1 = nn.Linear(config.d_model, config.d_ff)
        self.fc2 = nn.Linear(config.d_ff, config.d_model)
        self.dropout = nn.Dropout(config.dropout)

    def forward(self, x):
        x = F.gelu(self.fc1(x))
        x = self.dropout(x)
        x = self.fc2(x)
        return x

class TransformerBlock(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.ln1 = nn.LayerNorm(config.d_model)
        self.attn = MultiHeadSelfAttention(config)
        self.ln2 = nn.LayerNorm(config.d_model)
        self.ff = FeedForward(config)
        self.dropout = nn.Dropout(config.dropout)

    def forward(self, x, mask=None):
        x = x + self.dropout(self.attn(self.ln1(x), mask))
        x = x + self.dropout(self.ff(self.ln2(x)))
        return x

class UrduGPT(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.config = config

        self.token_emb = nn.Embedding(config.vocab_size, config.d_model)
        self.pos_emb = nn.Embedding(config.max_seq_len, config.d_model)
        self.dropout = nn.Dropout(config.dropout)

        self.blocks = nn.ModuleList([
            TransformerBlock(config) for _ in range(config.n_layers)
        ])

        self.ln_f = nn.LayerNorm(config.d_model)
        self.head = nn.Linear(config.d_model, config.vocab_size, bias=False)

        # Weight tying
        self.head.weight = self.token_emb.weight

        self.apply(self._init_weights)

    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                torch.nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def forward(self, input_ids, targets=None):
        B, T = input_ids.shape
        device = input_ids.device

        tok_emb = self.token_emb(input_ids)
        pos = torch.arange(0, T, dtype=torch.long, device=device)
        pos_emb = self.pos_emb(pos)

        x = self.dropout(tok_emb + pos_emb)

        # Causal mask
        mask = torch.tril(torch.ones(T, T, device=device)).unsqueeze(0).unsqueeze(0)

        for block in self.blocks:
            x = block(x, mask)

        x = self.ln_f(x)
        logits = self.head(x)

        loss = None
        if targets is not None:
            loss = F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1))

        return {'logits': logits, 'loss': loss}

    @torch.no_grad()
    def generate(self, input_ids, max_new_tokens=100, temperature=0.8,
                 top_k=50, top_p=0.9, eos_token_id=None):
        """
        Generate text autoregressively.

        Sampling strategies:
        - temperature: Controls randomness (low = deterministic, high = creative)
        - top_k: Only consider the top K most likely tokens
        - top_p (nucleus): Only consider tokens whose cumulative probability <= p
        - eos_token_id: Stop generating when this token is produced
        """
        self.eval()
        eos_token_id = eos_token_id or getattr(self.config, 'eos_token_id', None)

        for _ in range(max_new_tokens):
            idx_cond = input_ids if input_ids.size(1) <= self.config.max_seq_len \
                       else input_ids[:, -self.config.max_seq_len:]

            outputs = self.forward(idx_cond)
            logits = outputs["logits"][:, -1, :] / temperature

            # Top-K filtering
            if top_k > 0:
                v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
                logits[logits < v[:, [-1]]] = float('-inf')

            # Top-P (nucleus) filtering
            if top_p < 1.0:
                sorted_logits, sorted_indices = torch.sort(logits, descending=True)
                cumulative_probs = torch.cumsum(F.softmax(sorted_logits, dim=-1), dim=-1)
                sorted_indices_to_remove = cumulative_probs > top_p
                sorted_indices_to_remove[:, 1:] = sorted_indices_to_remove[:, :-1].clone()
                sorted_indices_to_remove[:, 0] = 0
                indices_to_remove = sorted_indices_to_remove.scatter(
                    1, sorted_indices, sorted_indices_to_remove
                )
                logits[indices_to_remove] = float('-inf')

            probs = F.softmax(logits, dim=-1)
            next_token = torch.multinomial(probs, num_samples=1)
            input_ids = torch.cat([input_ids, next_token], dim=1)

            if eos_token_id is not None and next_token.item() == eos_token_id:
                break

        return input_ids

```

这段代码构建了一个文本预测机器。你给它一些乌尔都语词汇，它猜测下一个词，如此反复，直到组成一个句子。ChatGPT本质上也是这样工作的，只是规模大得多。

## Transformer代码拆解

## 1. MultiHeadSelfAttention："回顾系统"

想象你在读一个句子。当你看到"اس"（这个）这个词时，你的大脑会回头看，找出"这个"指的是什么。这就是注意力机制。

<strong>Q、K、V</strong>：把它想象成图书馆：

<strong>Query（Q）：</strong> "我在寻找关于X的信息"

<strong>Key（K）：</strong> 每个前面的词举着一个牌子："我有关于Y的信息"

<strong>Value（V）：</strong> 该词携带的实际信息

<strong>6个头</strong> = 6个不同的"读者"同时阅读同一个句子。一个可能专注于语法，另一个专注于含义，还有一个专注于附近的词，以此类推。

<strong>因果掩码</strong> = 一条规则："你只能看在你之前的词，不能看之后的。"（因为在生成时，未来的词还不存在！）

<strong>数学原理：</strong> 将Q×K相乘得到"每个词的相关程度？"，然后用这些分数从V中获取最有用的信息。

## 2. FeedForward："思考步骤"

注意力机制找出了哪些词重要之后，这里就是模型真正思考它们含义的地方。

它就是两层：

<strong>扩展（384 → 1536）：</strong> 给模型更多"脑力空间"来思考

<strong>压缩（1536 → 384）：</strong> 将想法压缩回来

<strong>GELU激活：</strong> 一个过滤器，决定"保留这个想法"或"丢弃它"（平滑地，而不是生硬地）

## 3. TransformerBlock："一轮阅读"

对句子的一个完整阅读和思考过程。

<strong>步骤1：</strong> 查看其他词（注意力）

<strong>步骤2：</strong> 思考你看到的内容（前馈）

<strong>LayerNorm：</strong> 像在步骤之间重置大脑，使数字不会变得太大或太小。

**残差连接（`x + ...`）：** 模型保留原始想法并添加新见解。就像做笔记：你不会擦掉旧笔记，而是添加新笔记。

模型这样做6次（6个块）。每一轮对文本的理解都更深一层。

## 4. UrduGPT："完整机器"

**初始化（`__init__`）：**

<strong>Token嵌入：</strong> 一个巨大的查找表。32,000个乌尔都语词/子词各获得一个包含384个数字的列表，代表其"含义"。

<strong>位置嵌入：</strong> 另一个查找表，告诉模型"这个词是第1个，这个是第2个，这个是第3个..."（否则它不会知道词序）。

<strong>6个Transformer块：</strong> 上面描述的6轮阅读。

<strong>LM头：</strong> 最后，将模型的内部"想法"（384个数字）转换回对32,000个可能下一个词中每个词的分数。

<strong>权重绑定：</strong> 输入查找表和输出评分表共享相同的数据。节省内存，实际上效果更好！

**处理（`forward`）：**

查找每个词的含义（嵌入）

添加位置信息

运行6轮注意力+思考

对每个可能的下一个词打分

如果我们知道正确答案，计算我们错得有多远（损失）

**生成文本（`generate`）：** 一个简单的循环：

输入目前为止的词

获取下一个词的分数

<strong>Temperature：</strong> 控制创造性。低 = 安全/可预测，高 = 大胆/有创意

<strong>Top-K：</strong> 只考虑最好的K个选项（忽略其余31,950个不太可能的词）

<strong>Top-P（核采样）：</strong> 动态选择累计概率达到阈值的最小token集合

从剩余选项中随机选一个词

将其添加到句子中，回到步骤1

当生成`<eos>`或达到`max_new_tokens`时停止

## 加载数据集和训练

首先，我们加载JSONL语料库，并将每个文档分词为一个长长的token ID序列。然后按90/10的比例划分为训练集和验证集，并用PyTorch Dataset包装，创建固定长度的块用于下一个token预测：

```
import json
from tokenizers import Tokenizer
from torch.utils.data import Dataset, DataLoader
from tqdm import tqdm

# Device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using: {device}")

# Load tokenizer
tokenizer = Tokenizer.from_file(TOKENIZER_PATH)
print(f"Tokenizer loaded. Vocab: {tokenizer.get_vocab_size():,}")

# Load and tokenize corpus
print("Loading corpus...")
all_token_ids = []
with open(DATA_PATH, "r", encoding="utf-8") as f:
    for line in tqdm(f, desc="Tokenizing"):
        doc = json.loads(line)
        encoded = tokenizer.encode(doc["text"])
        all_token_ids.extend(encoded.ids)

all_token_ids = torch.tensor(all_token_ids, dtype=torch.long)
print(f"Total tokens: {len(all_token_ids):,}")

```

```
class UrduTextDataset(Dataset):
    def __init__(self, token_ids, seq_len):
        self.token_ids = token_ids
        self.seq_len = seq_len
        self.n_chunks = (len(token_ids) - 1) // seq_len

    def __len__(self):
        return self.n_chunks

    def __getitem__(self, idx):
        start = idx * self.seq_len
        chunk = self.token_ids[start:start + self.seq_len + 1]
        return chunk[:-1], chunk[1:]  # input, target (shifted by 1)

config = UrduLLMConfig()

# Split 90/10
split_idx = int(len(all_token_ids) * 0.9)
train_dataset = UrduTextDataset(all_token_ids[:split_idx], config.max_seq_len)
val_dataset = UrduTextDataset(all_token_ids[split_idx:], config.max_seq_len)

train_loader = DataLoader(train_dataset, batch_size=config.batch_size, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=config.batch_size)

print(f"Train: {len(train_dataset):,} chunks")
print(f"Val: {len(val_dataset):,} chunks")

```

每个块的长度为256个token。`__getitem__`返回`(input, target)`，其中target是input偏移一个位置的结果，这正是下一个token预测所需要的。

我的训练大约花了3个小时，完成了3个epoch。原本应该完成10个epoch，但在3个epoch后我达到了Google Colab的免费限额。既然训练的目的是学习，我使用了生成的模型并保存在Drive中。

以下是完整的训练代码：

```
# Optimizer
optimizer = torch.optim.AdamW(model.parameters(), lr=config.learning_rate, weight_decay=config.weight_decay)

# LR Schedule
total_steps = len(train_loader) * config.max_epochs
def get_lr(step):
    if step < config.warmup_steps:
        return config.learning_rate * step / config.warmup_steps
    progress = (step - config.warmup_steps) / (total_steps - config.warmup_steps)
    return config.learning_rate * 0.5 * (1 + math.cos(math.pi * progress))

# Training
history = {'train_loss': [], 'val_loss': []}
global_step = 0
best_val_loss = float('inf')

for epoch in range(config.max_epochs):
    model.train()
    epoch_loss = 0
    pbar = tqdm(train_loader, desc=f"Epoch {epoch+1}")

    for input_ids, targets in pbar:
        input_ids, targets = input_ids.to(device), targets.to(device)

        lr = get_lr(global_step)
        for g in optimizer.param_groups:
            g['lr'] = lr

        outputs = model(input_ids, targets)
        loss = outputs['loss']

        optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), config.grad_clip)
        optimizer.step()

        epoch_loss += loss.item()
        global_step += 1
        pbar.set_postfix({'loss': f'{loss.item():.4f}'})

    # Validation
    model.eval()
    val_loss = 0
    with torch.no_grad():
        for input_ids, targets in val_loader:
            input_ids, targets = input_ids.to(device), targets.to(device)
            val_loss += model(input_ids, targets)['loss'].item()
    val_loss /= len(val_loader)

    train_loss = epoch_loss / len(train_loader)
    history['train_loss'].append(train_loss)
    history['val_loss'].append(val_loss)

    print(f"Epoch {epoch+1}: Train={train_loss:.4f}, Val={val_loss:.4f}")

    # Save best
    if val_loss < best_val_loss:
        best_val_loss = val_loss
        torch.save(model.state_dict(), f"{DRIVE_PATH}/best_model.pt")
        print(f"Best model saved!")

print(f"\nDone! Best val loss: {best_val_loss:.4f}")

```

现在让我们逐行解析训练代码的每个部分。

## 训练代码逐行解析

## 1. 优化器设置

```
optimizer = torch.optim.AdamW(model.parameters(), lr=config.learning_rate, weight_decay=config.weight_decay)

```

AdamW`为每个参数维护两个运行统计量（23M × 2 = 内存中46M个额外值）：

<strong>一阶矩（动量）：</strong> 梯度的指数移动平均。平滑嘈杂的更新，使优化器不会锯齿形摆动。

<strong>二阶矩：</strong> 梯度平方的指数移动平均。为每个参数提供自适应学习率（频繁更新的参数获得较小的步长，罕见的获得较大的）。

<strong>权重衰减（0.1）：</strong> 每一步，权重乘以`(1 - lr × 0.1)`，略微缩小它们。这是<strong>L2正则化</strong>。它防止任何单个权重增长过大，从而减少过拟合。AdamW中的"W"意味着这种衰减与梯度更新解耦（直接应用于权重，而不是像原始Adam那样混入梯度中）。

## 2. 学习率调度

```
total_steps = len(train_loader) * config.max_epochs  # e.g., 500 batches × 10 epochs = 5000 steps

def get_lr(step):
    if step < config.warmup_steps:                                      # Phase 1: steps 0–499
        return config.learning_rate * step / config.warmup_steps        # Linear ramp: 0 → 3e-4
    progress = (step - config.warmup_steps) / (total_steps - config.warmup_steps)  # 0.0 → 1.0
    return config.learning_rate * 0.5 * (1 + math.cos(math.pi * progress))        # 3e-4 → ~0

```

<strong>预热（前500步）：</strong> 在第0步，权重是随机的，梯度指向半随机方向，所以较大的学习率会导致破坏性的参数更新。通过从0线性提升到3e-4，我们让损失函数的"地形"在做出激进更新之前"稳定下来"。

<strong>余弦衰减（剩余步数）：</strong> 公式`0.5 × (1 + cos(π × progress))`在progress从0到1时画出一条平滑的S曲线，从1.0到0.0。乘以峰值学习率，得到：

<strong>早期：</strong> 较大的学习率——大的参数变化，导致损失快速下降

<strong>后期：</strong> 微小的学习率——小的调整，在不超出局部最小值的情况下进行微调

```
LR:  0 ──ramp──▶ peak ──smooth curve──▶ ~0
     |  warmup  |     cosine decay      |

```

## 3. 跟踪变量

```
history = {'train_loss': [], 'val_loss': []}   # For plotting curves later
global_step = 0                                 # Counts total batches across all epochs (for LR schedule)
best_val_loss = float('inf')                    # Tracks best validation; starts at infinity so any real loss beats it

```

## 4. 训练循环

<strong>外层循环：Epoch</strong>

```
for epoch in range(config.max_epochs):
    model.train()     # Enables dropout (randomly zeros 10% of activations for regularization)

```

每个epoch = 完整遍历一次所有训练数据。我们重复`max_epochs`轮。

<strong>内层循环：Batch</strong>

<strong>1. 移动到GPU：</strong>

```
input_ids, targets = input_ids.to(device), targets.to(device)

```

将张量数据从CPU RAM传输到GPU VRAM。Transformer中的矩阵乘法（注意力、FFN）在GPU上运行速度快50–100倍，得益于大规模并行性。

<strong>2. 手动更新学习率：</strong>

```
lr = get_lr(global_step)
for g in optimizer.param_groups:
    g['lr'] = lr

```

PyTorch的AdamW本身不支持自定义调度，所以我们在每一步手动覆盖学习率。`param_groups`是一个列表（这里只有一个组），每个组可以有自己的学习率/权重衰减。

<strong>3. 前向传播：</strong>

```
outputs = model(input_ids, targets)
loss = outputs['loss']

```

输入token流经：嵌入 → 6个Transformer块 → LM头 → logits。在logits（形状`[batch, seq_len, 32000]`）和目标token ID之间计算交叉熵损失。这个损失衡量模型分配给正确下一个token的负对数概率，在所有位置和批次元素上取平均。

<strong>4. 反向传播 + 更新：</strong>

```
optimizer.zero_grad()          # Reset all parameter gradients to zero (they accumulate by default)
loss.backward()                # Backpropagation: compute ∂loss/∂θ for all 23M parameters via chain rule
torch.nn.utils.clip_grad_norm_(model.parameters(), config.grad_clip)  # If ||gradient||₂ > 1.0, scale it down
optimizer.step()               # θ_new = θ_old - lr × adam_adjusted_gradient - lr × weight_decay × θ_old

```

```text
zero_grad()`：PyTorch默认累积梯度（适用于微批次间的梯度累积）。我们必须在每次新的反向传播之前手动清除它们。

loss.backward()`：反向传播通过链式法则反向遍历计算图，为每个参数计算∂loss/∂θ。这是与正向传播并列的计算量最大的步骤。
```


<strong>梯度裁剪：</strong> 计算所有参数梯度拼接成一个向量的L2范数。如果范数超过1.0，每个梯度乘以`1.0/范数`，保持方向但限制幅度。这防止罕见的批次（不寻常的token分布）导致灾难性的巨大更新，使训练不稳定。

optimizer.step()`：AdamW使用动量、自适应的逐参数学习率和解耦的权重衰减来应用更新规则。

<strong>5. 记录：</strong>

```
epoch_loss += loss.item()      # .item() extracts the Python float from the CUDA tensor (avoids GPU memory leak)
global_step += 1               # Increment for LR schedule
pbar.set_postfix({'loss': ...})  # Update the tqdm progress bar display

```

## 5. 验证

```
model.eval()                   # Disables dropout so we use full model capacity for honest evaluation
val_loss = 0
with torch.no_grad():          # Disables gradient tracking, saves ~50% memory and runs faster
    for input_ids, targets in val_loader:
        input_ids, targets = input_ids.to(device), targets.to(device)
        val_loss += model(input_ids, targets)['loss'].item()
val_loss /= len(val_loader)    # Average loss per batch

```

这在模型从未训练过的保留数据上进行测试。比较训练损失和验证损失可以揭示：

| 模式 | 含义 |
|------|------|
| 两者都在下降 | 模型在学习可泛化的模式 |
| 训练↓，验证停滞/↑ | 过拟合：在记忆，不是在学习 |
| 两者都很高且平坦 | 欠拟合：模型需要更多容量或数据 |

model.eval()`关闭dropout，以便我们用完整的模型进行评估。`torch.no_grad()`跳过梯度计算，因为我们只是在测量，不是在学习。

## 6. 检查点

```
if val_loss < best_val_loss:
    best_val_loss = val_loss
    torch.save(model.state_dict(), f"{DRIVE_PATH}/best_model.pt")

```

model.state_dict()`返回一个`OrderedDict`，将参数名映射到张量。`torch.save`使用Python的pickle + zip将其序列化到磁盘。我们只在验证损失改善时保存。

这在精神上是<strong>早停（early stopping）</strong>：我们保留泛化效果最好的检查点，不管后续epoch发生什么。

## 总结：6步完成一个Batch

将32个乌尔都语序列输入模型 → 获取预测概率

与实际下一个token的交叉熵 → 标量损失（错了多少？）

通过23M参数反向传播 → 每个参数的梯度（要修正什么？）

将梯度范数裁剪到 ≤ 1.0 → 防止不稳定

AdamW用动量+衰减更新参数 → 实际的学习过程

重复约5000次，保存最佳检查点 → 完成

## 关键指标

<strong>交叉熵损失</strong>衡量预测概率分布与真实下一个token的距离。一个在32K词汇表上随机猜测的模型损失约为 ln(32000) ≈ 10.4

<strong>困惑度 = e^loss</strong>，可以理解为"模型在N个等可能的token之间选择"

PPL 32,000 = 随机猜测

```text
PPL 100 = 缩小到约100个候选

PPL 10 = 相当自信的预测
```


训练完成并将模型保存在Drive中后，下一步是将模型下载到你的本地系统以执行后续步骤。

现在我们有了一个可用的模型，但一个问题出现了：它准备好像我们使用ChatGPT、Claude或Copilot等任何AI工具那样与之对话了吗？答案是<strong>没有</strong>，还没完全准备好。为什么？

训练部分完成了，但它不知道如何以对话方式组织或撰写内容，比如回答用户查询。这就是我们所说的<strong>监督微调（SFT）</strong>步骤。

## 4. 监督微调（SFT）

在非常高的层面上，SFT中我们教模型如何回复查询。就像给它示例，让它学习如何回答。你拥有的示例越多，回复会变得越好。所以本质上，监督微调将模型转换为一个对话代理。

为此，我们将创建一个包含以下关键对的示例数据集，格式如下：

```
{
  "conversations": [
    {"role": "system", "content": "آپ ایک مددگار اردو اسسٹنٹ ہیں۔"},
    {"role": "user", "content": "سوال..."},
    {"role": "assistant", "content": "جواب..."}
  ]
}

```

大约<strong>79个示例</strong>被输入系统并保存为JSONL格式。在实际情况下，你会使用多得多的示例。正如我已经提到的，更多示例会带来更好的结果。

## 格式化对话数据

下一步是将上面保存的对话格式化以供训练。这是SFT的对话格式化步骤。它将原始对话JSON转换为带有<strong>损失掩码</strong>的token ID序列，使模型只学习生成助手回复。

损失掩码意味着我们有意对输入的某些部分隐藏训练损失。在这种情况下，我们掩码系统提示和用户消息，使模型不会被训练去记忆或复现它们。训练信号仅来自助手的回复，这是教导模型应该生成什么以及何时停止的有用部分。

## 第1部分：禁用自动格式化并获取特殊Token ID

```
tokenizer.no_padding()

BOS_ID = tokenizer.token_to_id("<bos>")       # 2
EOS_ID = tokenizer.token_to_id("<eos>")       # 3
SEP_ID = tokenizer.token_to_id("<sep>")       # 4
PAD_ID = tokenizer.token_to_id("<pad>")       # 0
USER_ID = tokenizer.token_to_id("egli>")          # 5
ASSISTANT_ID = tokenizer.token_to_id("gpt>") # 6
SYSTEM_ID = tokenizer.token_to_id("er")       # 7

IGNORE_INDEX = -100

```

no_padding()`：告诉分词器"不要自动添加填充，我自己处理"。我们需要对token序列有完全的控制。

我们获取每个特殊token的整数ID，以便在正确位置手动插入它们。

IGNORE_INDEX = -100`：PyTorch的`cross_entropy`有一个内置功能：任何设置为-100的标签在损失计算中会被跳过。这就是我们实现损失掩码的方式。

## 第2部分：`format_conversation()`：核心函数

这接收一个对话并产生两个并行数组：

```
input_ids: [BOS, SYSTEM, آپ, ایک, مددگار, ..., SEP, USER, پاکستان, کا, ..., SEP, ASST, اسلام, آباد, ہے, EOS, PAD, PAD, ...]
labels:    [-100, -100, -100, -100, -100, ..., -100, -100, -100,    -100,..., -100, -100, اسلام, آباد, ہے, EOS, -100, -100, ...]

```

<strong>函数内部的逐步过程：</strong>

1. 从BOS开始：

```
input_ids = [BOS_ID]
labels = [IGNORE_INDEX]    # Don't learn to predict BOS

```

2. 对每个轮次，编码内容并去除自动添加的BOS/EOS：

```
content_ids = tokenizer.encode(content).ids
if content_ids[0] == BOS_ID: content_ids = content_ids[1:]     # Remove if tokenizer auto-added
if content_ids[-1] == EOS_ID: content_ids = content_ids[:-1]

```

我们去除这些是因为我们在精确位置手动放置特殊token，所以不想要重复。

3. 按角色构建token序列：

| 角色 | Token序列 | Labels |
|------|----------|--------|
| system | `[SYSTEM_ID] + content + [SEP_ID]` | 全部-100（被掩码） |
| user | `[USER_ID] + content + [SEP_ID]` | 全部-100（被掩码） |
| assistant | `[ASST_ID] + content + [EOS_ID]` | `[-100] + content + [EOS_ID]` |

助手的角色token（`gpt>`）本身被掩码，因为我们不想让模型学习预测它。但实际的回复内容和`<eos>`确实有标签，所以模型学到：

<strong>说什么</strong>（回复内容）

<strong>何时停止</strong>（预测`<eos>`）

4. 截断和填充：

```
input_ids = input_ids[:max_len]          # Cut to 256 tokens max
pad_len = max_len - len(input_ids)
input_ids = input_ids + [PAD_ID] * pad_len
labels = labels + [IGNORE_INDEX] * pad_len   # Don't learn from padding either

```

所有序列必须长度相同才能进行批处理训练。填充标签为-100，这样它们在损失计算中被忽略。

以下是完整的`format_conversation()`函数：

```
def format_conversation(conversation: dict, max_len: int = 256) -> dict:
    """
    Convert a conversation dict into token IDs + labels for SFT.

    Format: <bos>er...<sep>egli>...<sep>gpt>...<eos>
    Labels: -100 for system/user tokens (masked), actual IDs for assistant tokens.
    """
    input_ids = [BOS_ID]
    labels = [IGNORE_INDEX]

    for turn in conversation["conversations"]:
        role = turn["role"]
        content = turn["content"]

        content_ids = tokenizer.encode(content).ids
        if content_ids and content_ids[0] == BOS_ID:
            content_ids = content_ids[1:]
        if content_ids and content_ids[-1] == EOS_ID:
            content_ids = content_ids[:-1]

        if role == "system":
            role_ids = [SYSTEM_ID] + content_ids + [SEP_ID]
            role_labels = [IGNORE_INDEX] * len(role_ids)
        elif role == "user":
            role_ids = [USER_ID] + content_ids + [SEP_ID]
            role_labels = [IGNORE_INDEX] * len(role_ids)
        elif role == "assistant":
            role_ids = [ASSISTANT_ID] + content_ids + [EOS_ID]
            role_labels = [IGNORE_INDEX] + content_ids + [EOS_ID]

        input_ids.extend(role_ids)
        labels.extend(role_labels)

    # Truncate and pad to max_len
    input_ids = input_ids[:max_len]
    labels = labels[:max_len]
    pad_len = max_len - len(input_ids)
    input_ids = input_ids + [PAD_ID] * pad_len
    labels = labels + [IGNORE_INDEX] * pad_len

    return {"input_ids": input_ids, "labels": labels}

```

## 第3部分：验证

```
n_loss_tokens = sum(1 for l in test_formatted['labels'] if l != IGNORE_INDEX)
print(f"  Tokens with loss: {n_loss_tokens} / 256")

```

这确认了只有一小部分token（助手的词 + EOS）对损失有贡献。对于一个典型的示例，你可能会看到类似`Tokens with loss: 18 / 256`的结果，意味着只有约7%的序列驱动梯度更新。其余部分（系统提示、用户问题、特殊token、填充）用`-100`掩码。

这使得SFT极其高效：100%的学习信号来自预测助手的实际回复和知道何时停止（`<eos>`）。这种效率在你只有79个训练示例时尤为关键。

## 格式化总结

| 组件 | 用途 |
|------|------|
| `no_padding()` | 手动控制token放置 |
| 特殊token ID | 在精确位置插入聊天结构标记 |
| `IGNORE_INDEX = -100` | PyTorch内置机制，在损失中跳过位置 |
| System/User labels → -100 | 不从这些学习（仅作为上下文） |
| Assistant labels → 实际ID | 学习生成回复 + 何时停止 |
| 截断到256 | 匹配模型的上下文窗口 |
| 用-100标签填充 | 批处理对齐而不污染损失 |

## SFT数据集与DataLoader

```
class SFTDataset(Dataset):
    def __init__(self, conversations: list, max_len: int = 256):
        self.examples = []
        for conv in conversations:
            formatted = format_conversation(conv, max_len)
            self.examples.append(formatted)

    def __len__(self):
        return len(self.examples)

    def __getitem__(self, idx):
        return (
            torch.tensor(self.examples[idx]['input_ids'], dtype=torch.long),
            torch.tensor(self.examples[idx]['labels'], dtype=torch.long),
        )

```

这将所有79个格式化的对话包装到PyTorch Dataset中。初始化时，它使用`format_conversation()`预格式化每个对话并存储结果。当DataLoader请求第`idx`个项时，它返回`(input_ids, labels)`张量。

<strong>DataLoader：</strong>

```
sft_loader = DataLoader(sft_dataset, batch_size=4, shuffle=True)

```

```text
batch_size=4`：小批次，因为我们只有79个示例。更大的批次意味着每个epoch的梯度更新更少。

shuffle=True`：每个epoch随机化顺序，使模型不会记住固定的示例序列。
```


## 加载预训练模型

```
model = UrduGPT(config).to(device)
checkpoint = torch.load("best_model.pt", map_location=device)
state_dict = checkpoint['model_state_dict']

# Name mapping (Colab → local)
name_mapping = {
    'token_emb.weight': 'token_embedding.weight',
    'pos_emb.weight': 'position_embedding.weight',
    'ln_f.weight': 'ln_final.weight',
    'ln_f.bias': 'ln_final.bias',
    'head.weight': 'lm_head.weight',
}

```

这创建了一个新的UrduGPT模型并加载来自阶段3的预训练权重。

你可能会想：为什么需要名称映射？模型是在Google Colab上训练的，使用了一些不同的变量名（例如`token_emb` vs `token_embedding`）。映射将Colab的命名约定转换为本地代码的约定。`load_state_dict`中的`strict=False`允许加载即使某些键不完全匹配。

另外，为什么要从预训练开始？因为SFT建立在预训练之上。模型已经知道乌尔都语的语法、词汇和事实。SFT只是教它对话格式。从随机权重开始将需要多得多的数据和训练。

## SFT训练循环

以下是完整的SFT训练循环：

```
SFT_LR = 2e-5
SFT_EPOCHS = 50
optimizer = torch.optim.AdamW(model.parameters(), lr=SFT_LR, weight_decay=0.01)

sft_history = {'loss': []}
best_loss = float('inf')

for epoch in range(SFT_EPOCHS):
    model.train()
    epoch_loss = 0
    n_batches = 0

    for input_ids, labels in sft_loader:
        input_ids = input_ids.to(device)
        labels = labels.to(device)

        outputs = model(input_ids)
        logits = outputs['logits']

        shift_logits = logits[:, :-1, :].contiguous()
        shift_labels = labels[:, 1:].contiguous()

        loss = F.cross_entropy(
            shift_logits.view(-1, shift_logits.size(-1)),
            shift_labels.view(-1),
            ignore_index=IGNORE_INDEX,
        )

        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()

        epoch_loss += loss.item()
        n_batches += 1

    avg_loss = epoch_loss / n_batches
    sft_history['loss'].append(avg_loss)

    if avg_loss < best_loss:
        best_loss = avg_loss
        torch.save({
            'model_state_dict': model.state_dict(),
            'config': config.__dict__,
            'epoch': epoch + 1,
            'loss': avg_loss,
        }, "sft_model.pt")

    if (epoch + 1) % 10 == 0 or epoch == 0:
        print(f"Epoch {epoch+1}/{SFT_EPOCHS} | Loss: {avg_loss:.4f}")

print(f"SFT complete! Best loss: {best_loss:.4f}")

```

为什么这些超参数与预训练不同：

| 参数 | 预训练 | SFT | 为什么不同 |
|------|--------|-----|-----------|
| 学习率 | 3e-4 | 2e-5 | 较低的学习率防止灾难性遗忘。大的更新会抹去预训练期间学到的乌尔都语知识 |
| Epoch | 3 | 50 | 只有79个示例 vs 数百万个token。模型需要多次遍历来学习对话模式 |
| 权重衰减 | 0.1 | 0.01 | 需要较少的正则化，因为我们希望模型紧密拟合这些特定示例 |
| 学习率调度 | 余弦预热 | 恒定 | 简单且有效，适合小数据微调 |

以下是每个批次的训练步骤：

```
# Forward pass with no targets; we compute loss manually
outputs = model(input_ids)
logits = outputs['logits']

# Shift for next-token prediction
shift_logits = logits[:, :-1, :].contiguous()    # Predictions at positions 0..254
shift_labels = labels[:, 1:].contiguous()         # Targets at positions 1..255

# Loss with masking
loss = F.cross_entropy(
    shift_logits.view(-1, shift_logits.size(-1)),
    shift_labels.view(-1),
    ignore_index=IGNORE_INDEX,  # Skip -100 positions
)

```

与预训练的一个关键区别是：在预训练中，我们将targets直接传给`model(input_ids, targets)`，它在所有token上内部计算损失。这里我们手动计算损失，以便使用`ignore_index=-100`来掩码非助手位置。

<strong>偏移：</strong> `logits[:, :-1]`和`labels[:, 1:]`实现下一个token预测。模型在位置`i`的预测与位置`i+1`的实际token进行比较。

反向传播 + 更新：

```
optimizer.zero_grad(set_to_none=True)
loss.backward()
torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
optimizer.step()

```

这与预训练相同：清除梯度 → 反向传播 → 裁剪以防止不稳定 → 更新参数。梯度裁剪到1.0在这里尤为重要，因为模型正在微调，小数据上一些梯度可能很大。

检查点：

```
if avg_loss < best_loss:
    torch.save({'model_state_dict': model.state_dict(), ...}, "sft_model.pt")

```

每当训练损失改善时保存。与预训练不同，我们没有单独的验证集（79个示例太少，无法拆分），所以我们在训练损失上做检查点。

## 聊天函数：推理

以下是完整的聊天函数：

```
def chat(model, tokenizer, user_message: str, system_prompt: str = None,
         max_tokens: int = 100, temperature: float = 0.7) -> str:
    """Generate a chat response."""
    model.eval()

    if system_prompt is None:
        system_prompt = SYSTEM_PROMPT

    # Build the prompt
    prompt_ids = [BOS_ID, SYSTEM_ID]

    sys_ids = tokenizer.encode(system_prompt).ids
    if sys_ids and sys_ids[0] == BOS_ID: sys_ids = sys_ids[1:]
    if sys_ids and sys_ids[-1] == EOS_ID: sys_ids = sys_ids[:-1]
    prompt_ids.extend(sys_ids)
    prompt_ids.append(SEP_ID)

    prompt_ids.append(USER_ID)
    user_ids = tokenizer.encode(user_message).ids
    if user_ids and user_ids[0] == BOS_ID: user_ids = user_ids[1:]
    if user_ids and user_ids[-1] == EOS_ID: user_ids = user_ids[:-1]
    prompt_ids.extend(user_ids)
    prompt_ids.append(SEP_ID)

    prompt_ids.append(ASSISTANT_ID)

    # Generate
    input_tensor = torch.tensor([prompt_ids], dtype=torch.long).to(device)
    with torch.no_grad():
        output_ids = model.generate(
            input_tensor,
            max_new_tokens=max_tokens,
            temperature=temperature,
            top_k=50,
            top_p=0.9,
            eos_token_id=EOS_ID,
        )

    # Decode only the generated part
    generated_ids = output_ids[0][len(prompt_ids):].tolist()
    if EOS_ID in generated_ids:
        generated_ids = generated_ids[:generated_ids.index(EOS_ID)]

    return tokenizer.decode(generated_ids)

```

以下是逐步拆解：

<strong>1. 构建提示：</strong>

```
prompt_ids = [BOS_ID, SYSTEM_ID]
prompt_ids.extend(sys_ids)          # System prompt content
prompt_ids.append(SEP_ID)
prompt_ids.append(USER_ID)
prompt_ids.extend(user_ids)          # User message content
prompt_ids.append(SEP_ID)
prompt_ids.append(ASSISTANT_ID)      # "Now respond..."

```

这构建了与SFT训练期间模型看到的完全相同的格式：

```
<bos>erآپ ایک مددگار...<sep>egli>پاکستان کا دارالحکومت؟<sep>gpt>

```

模型看到`gpt>`后知道"我现在应该生成回复"，因为在SFT期间，它学到`gpt>`之后的token就是它应该产生的内容。

<strong>2. 自回归生成：</strong>

```
with torch.no_grad():
    output_ids = model.generate(
        input_tensor,
        max_new_tokens=max_tokens,
        temperature=temperature,
        top_k=50,
        top_p=0.9,
        eos_token_id=EOS_ID,
    )

```

```text
torch.no_grad()`：推理不需要梯度，节省内存和速度

temperature=0.7`：略微尖锐的分布，输出连贯但不机械

top_k=50`：只从top 50个token中采样，避免低概率噪声

top_p=0.9`：核采样，动态选择累计概率 ≥ 0.9的最小token集合
```


eos_token_id`：当产生`<eos>`时停止生成

<strong>3. 提取和解码：</strong>

```
generated_ids = output_ids[0][len(prompt_ids):].tolist()    # Only the new tokens
if EOS_ID in generated_ids:
    generated_ids = generated_ids[:generated_ids.index(EOS_ID)]  # Trim at EOS
return tokenizer.decode(generated_ids)

```

我们切掉提示部分（我们不想返回系统提示和用户消息），在`<eos>`处截断，并将token ID解码回乌尔都语文本。

## 5. 部署

到这一步，你已经拥有了自己的LLM。这是一个了不起的里程碑。但还有一个经典问题："它在我的机器上能运行"。

要让其他人也能使用模型，我们需要部署它并提供一个用户交互界面。

在探索部署选项时，我发现了Gradio，它提供了一个简单、干净的界面来部署机器学习模型和应用。Gradio直接与Hugging Face Spaces集成，为我们提供免费托管，设置极少。

## Gradio Web界面（`app.py`）

app.py`文件将所有东西整合在一起：加载分词器和模型，定义`chat()`函数，并启动Gradio UI。模型加载和`chat()`逻辑与我们在SFT部分介绍的完全相同，所以这里只展示Gradio特定的部分：

```
import gradio as gr

def respond(message, history):
    if not message.strip():
        return "براہ کرم کچھ لکھیں۔"
    return chat(message)

demo = gr.ChatInterface(
    fn=respond,
    title="🇵🇰 اردو LLM چیٹ بوٹ",
    description="""
    ### ایک چھوٹا اردو زبان ماڈل جو شروع سے تیار کیا گیا ہے
    **A small Urdu language model built from scratch (~23M parameters)**
    """,
    examples=[
        "السلام علیکم",
        "پاکستان کا دارالحکومت کیا ہے؟",
        "لاہور کے بارے میں بتائیں۔",
        "بریانی کیسے بنتی ہے؟",
        "کرکٹ کیسے کھیلی جاتی ہے؟",
        "چاند کیسے چمکتا ہے؟",
        "رمضان کیا ہے؟",
        "علامہ اقبال کون تھے؟",
        "خوش کیسے رہیں؟",
        "آپ کون ہیں؟",
    ],
    theme=gr.themes.Soft(),
)

if __name__ == "__main__":
    demo.launch()

```

respond()`用空输入守卫包装`chat()`，匹配Gradio的`ChatInterface`期望的签名。

gr.ChatInterface`提供现成的聊天UI，包含消息历史、输入框和发送按钮。

examples`是用户可以点击尝试的预填消息。

theme=gr.themes.Soft()`提供干净、现代的视觉主题。

<strong>注意：</strong> Hugging Face Spaces将`app.py`作为独立脚本运行，所以仓库中完整的`app.py`将所有内容内联到一个文件中：模型配置、完整的Transformer架构、使用`gc.collect()`进行内存优化的模型加载、`chat()`函数，以及上面的Gradio界面。

我们不会在这里重复所有这些，因为它们已经在预训练和SFT部分讲过了。

<strong>本地运行：</strong>

```
python app.py
# Opens at http://127.0.0.1:7860

```

## 部署选项

## 选项A：Hugging Face Spaces（免费，推荐）

Hugging Face Spaces为Gradio应用提供免费的CPU托管。

<strong>需要上传的文件：</strong>

```
urdu-llm-chat/
├── app.py                          # Gradio web interface
├── requirements.txt                # torch, tokenizers, gradio
├── README.md                       # Space metadata (sdk: gradio)
├── model/
│   ├── __init__.py
│   ├── config.py
│   ├── transformer.py
│   └── checkpoints/sft_model.pt    # ~90MB trained model weights
└── tokenizer/
    └── urdu_tokenizer/
        └── urdu_bpe_tokenizer.json

```

<strong>工作方式：</strong>

在[huggingface.co](https://huggingface.co)创建免费账户

创建新的Space（SDK: Gradio，Hardware: CPU Basic）

通过git推送文件：`git clone https://huggingface.co/spaces/USERNAME/urdu-llm-chat`

将项目文件复制到克隆的仓库中并推送

Hugging Face自动安装依赖并运行`app.py`

你的模型上线于`https://huggingface.co/spaces/USERNAME/urdu-llm-chat`

<strong>为什么CPU就够了：</strong> 我们的模型只有23M参数（约90MB）。CPU上的推理不到1秒。服务不需要GPU。

## 选项B：本地运行

```
cd your-project-directory
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py

```

在`http://127.0.0.1:7860`打开。可在任何装有Python 3.9+的机器上运行。

## 选项C：终端聊天（无UI）

一个轻量级的替代方案，不需要Gradio依赖，只用终端输入/输出。加载模型并进入交互循环：

```
"""
Standalone Chat Inference Script for Urdu LLM

Usage:
    python inference/chat.py
"""

import sys
import torch
from pathlib import Path
from tokenizers import Tokenizer

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from model.config import UrduLLMConfig
from model.transformer import UrduGPT

def load_model(checkpoint_path: str, device: str = None):
    """Load the fine-tuned model."""
    if device is None:
        if torch.cuda.is_available():
            device = "cuda"
        elif torch.backends.mps.is_available():
            device = "mps"
        else:
            device = "cpu"

    device = torch.device(device)

    config = UrduLLMConfig()
    model = UrduGPT(config).to(device)

    checkpoint = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()

    return model, config, device

def chat_response(model, tokenizer, config, device, user_message,
                  system_prompt="آپ ایک مددگار اردو اسسٹنٹ ہیں۔",
                  max_tokens=100, temperature=0.7):
    """Generate a chat response."""
    BOS_ID = tokenizer.token_to_id("<bos>")
    EOS_ID = tokenizer.token_to_id("<eos>")
    SEP_ID = tokenizer.token_to_id("<sep>")
    USER_ID = tokenizer.token_to_id("egli>")
    ASSISTANT_ID = tokenizer.token_to_id("gpt>")
    SYSTEM_ID = tokenizer.token_to_id("er")

    # Build prompt
    prompt_ids = [BOS_ID, SYSTEM_ID]

    sys_ids = tokenizer.encode(system_prompt).ids
    if sys_ids and sys_ids[0] == BOS_ID: sys_ids = sys_ids[1:]
    if sys_ids and sys_ids[-1] == EOS_ID: sys_ids = sys_ids[:-1]
    prompt_ids.extend(sys_ids)
    prompt_ids.append(SEP_ID)

    prompt_ids.append(USER_ID)
    user_ids = tokenizer.encode(user_message).ids
    if user_ids and user_ids[0] == BOS_ID: user_ids = user_ids[1:]
    if user_ids and user_ids[-1] == EOS_ID: user_ids = user_ids[:-1]
    prompt_ids.extend(user_ids)
    prompt_ids.append(SEP_ID)

    prompt_ids.append(ASSISTANT_ID)

    # Generate
    input_tensor = torch.tensor([prompt_ids], dtype=torch.long).to(device)
    output_ids = model.generate(
        input_tensor,
        max_new_tokens=max_tokens,
        temperature=temperature,
        top_k=50,
        top_p=0.9,
        eos_token_id=EOS_ID,
    )

    generated_ids = output_ids[0][len(prompt_ids):].tolist()
    if EOS_ID in generated_ids:
        generated_ids = generated_ids[:generated_ids.index(EOS_ID)]

    return tokenizer.decode(generated_ids)

def main():
    print("=" * 60)
    print("🇵🇰  اردو LLM چیٹ بوٹ  🇵🇰")
    print("    Urdu LLM ChatBot")
    print("=" * 60)

    # Load model
    tokenizer_path = PROJECT_ROOT / "tokenizer" / "urdu_tokenizer" / "urdu_bpe_tokenizer.json"

    # Try SFT model first, fall back to pre-trained
    sft_path = PROJECT_ROOT / "model" / "checkpoints" / "sft_model.pt"
    pretrained_path = PROJECT_ROOT / "model" / "checkpoints" / "best_model.pt"

    if sft_path.exists():
        checkpoint_path = sft_path
        print("Loading SFT (conversational) model...")
    elif pretrained_path.exists():
        checkpoint_path = pretrained_path
        print("Loading pre-trained model (not fine-tuned for chat)...")
    else:
        print("❌ No model checkpoint found!")
        print("   Run notebooks 03 and 04 first to train the model.")
        sys.exit(1)

    model, config, device = load_model(str(checkpoint_path))
    tokenizer = Tokenizer.from_file(str(tokenizer_path))

    print(f"Model loaded on {device}")
    print("\nType your message in Urdu. Type 'quit' to exit.\n")
    print("-" * 60)

    while True:
        try:
            user_input = input("\n👤 آپ: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nخدا حافظ! 👋")
            break

        if user_input.lower() in ['quit', 'exit', 'q']:
            print("خدا حافظ! 👋")
            break

        if not user_input:
            continue

        response = chat_response(model, tokenizer, config, device, user_input)
        print(f"🤖 بوٹ: {response}")

if __name__ == "__main__":
    main()

```

运行方式：

```
python inference/chat.py

```

```
👤 آپ: السلام علیکم
🤖 بوٹ: وعلیکم السلام! میں آپ کی کیا مدد کر سکتا ہوں؟

```

## 完整流水线总结

| 阶段 | 描述 |
|------|------|
| <strong>阶段1</strong> | 原始乌尔都语文本 → 清洗后的语料库 |
| <strong>阶段2</strong> | 语料库 → BPE分词器（32K词汇表） |
| <strong>阶段3</strong> | 分词后的块 → 预训练GPT（23M参数，下一个token预测） |
| <strong>阶段4</strong> | 对话 → 带损失掩码的SFT → 聊天模型 |
| <strong>部署</strong> | `app.py` + 模型权重 → Hugging Face Spaces / 本地 |

你可以在这里查看已部署的模型：[https://huggingface.co/spaces/Wisamul/urdu_llm](https://huggingface.co/spaces/Wisamul/urdu_llm)

## 结果

结果相当有趣。由于我们的训练样本很小，产生幻觉的概率相当高，特别是如果你能理解乌尔都语，你会欣赏幻觉的有趣之处。但总体来说它运行正常。

以下是与部署模型的一些示例交互：

```
👤 User: السلام علیکم
🤖 Assistant: وعلیکم السلام! میں آپ کی کیا مدد کر سکتا ہوں؟

👤 User: پاکستان کا دارالحکومت کیا ہے؟
🤖 Assistant: پاکستان کا دارالحکومت اسلام آباد ہے۔ یہ شہر 1960 کی دہائی میں تعمیر کیا گیا تھا۔

👤 User: تعلیم کی اہمیت کیا ہے؟
🤖 Assistant: تعلیم انسانی ترقی کی بنیاد ہے۔ یہ نہ صرف علم حاصل کرنے کا ذریعہ ہے بلکہ معاشرے کی تعمیر میں اہم کردار ادا کرتی ہے۔

```

对于接近训练数据的问题，模型的回复准确且流畅。对于分布外的查询，它倾向于产生幻觉或重复片段。考虑到小的SFT数据集（79个示例）和模型大小（23M参数），这是意料之中的。

## 结论

所有这些的目标是讨论和解释构建LLM过程中涉及的所有步骤。我希望这让你明白为什么不是每个人都在构建自己的LLM：成本、训练、数据收集等因素。同时，经历这个过程希望能帮助你欣赏之前所做的工作以及我们在这里取得的成就。

我们从原始乌尔都语文本一路走到了部署的聊天机器人：数据清洗、BPE分词、预训练GPT风格的Transformer、带损失掩码的监督微调，以及最后的Gradio Web界面。

模型很小，数据集也不大，但这里的每个概念（注意力、下一个token预测、SFT、聊天格式化）正是驱动GPT-4和Llama等生产级LLM的核心——只是规模大得多。

如果你想在此基础上改进，影响最大的下一步是：

更多的SFT数据（数千个示例而不是79个），

更大的模型（100M+参数），以及

RLHF/DPO对齐。

但即使在这个规模上，你现在对完整的LLM流水线有了具体的理解。
