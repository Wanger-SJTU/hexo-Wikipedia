---
title: LLM量化实用指南：GPTQ、AWQ、BitsandBytes和Unsloth
date: "2025-04-14 00:00:00"
updated: "2025-04-14 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/LLM量化实用指南-GPTQ、AWQ、BitsandBytes和Unsloth/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1893987794843592456
---


在大语言模型(LLMs)的时代，由于模型规模庞大，我们需要理解量化技术才能在本地PC上运行它们。然而，存在许多实现量化的技术，像我这样的初学者很容易感到困惑。因此，在这篇博客中，我将介绍我们必须了解的主要量化技术，并解释如何在Google Colab环境中实现它们。

### 1. 量化概述

量化是将浮点数映射到低位整数的技术。它在减少LLMs模型大小和推理成本方面非常有效。例如，当我们将7B模型（在float32中大约为4 x 7B = 28GB）量化为float16时，我们可以将其减少到2 x 7B = 14GB。如果我们能将float32模型量化为int8，大小将会是1 x 7B = 7GB！下图显示了每种数据类型的位表示。这些是LLMs常用的数据类型。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_7c6ff75cb25e.jpg)

LLMs使用的常见数据类型那么，我们如何实际减少位大小呢？答案是将值从一种数据类型“四舍五入”到另一种数据类型。为了具体理解量化概念，我们将学习两种基本的四舍五入值的方法：零点量化和绝对最大值量化。

- <strong>零点量化</strong>
零点量化将给定数据中的最小值和最大值映射到目标数据类型范围的最小值和最大值。让我们考虑将FP16值转换为Int8。下图展示了这种量化方式。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3aae6c4963d4.jpg)

零点量化图片来自文档我们想要将数据缩放到Int8范围（在这种情况下是0 ~ 255）。因此，我们计算原始比例中的相对值，并通过乘以Int8比例（即255）来重新缩放它们。公式可以描述如下：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_d456972f17c6.jpg)

零点量化的四舍五入公式其中n是用于量化的位数（在这种情况下是8）。注意，如果我们想要将值重新缩放到-127 ~ 127，我们从上述结果中减去127，然后四舍五入。

这种方法比其他量化方法能更精确地表示原始数据。另一方面，这种方法需要更复杂的计算，所以我们必须在精度和复杂性之间取得平衡。

- <strong>绝对最大值量化</strong>
绝对最大值量化将给定数据中的最大绝对值映射到目标数据类型的有符号范围。再次，让我们考虑将FP16值转换为Int8。为了简单起见，我们考虑受限的量化范围，即-127 ~ 127。供参考，完整的量化范围是-128 ~ 127。下图展示了这种量化方式。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_931355dd20b8.jpg)

绝对最大值量化图片改编自文档我们首先计算数据中的绝对最大值，并用它来重新缩放原始数据。公式可以描述如下：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_f6550d991a22.jpg)

绝对最大值量化的四舍五入公式这种方法在计算上比零点量化更简单。然而，这种方法受数据中异常值的影响很大，所以我们需要仔细检查我们的数据是否适合这种方法。

这些方法属于最近舍入(RTN)量化家族。如果你对其他量化技术感兴趣，可以阅读这篇博客。

另一方面，简单的量化存在精度下降的问题，因为我们通过减少位数来削减信息。因此，最近的量化技术试图在减少位大小的同时尽可能最小化这种精度下降。有两种主流的最新量化技术。

- <strong>量化感知训练(QAT)</strong>
QAT允许对模型进行量化并应用微调来恢复由量化引起的精度下降。虽然它可以比后面要解释的PTQ方法保持更好的模型精度，但它通常需要额外的训练和昂贵的计算资源，比如A100或H100机器。

- <strong>训练后量化(PTQ)</strong>
PTQ允许对预训练模型进行量化，而无需额外训练。因此，它可以节省量化所需的GPU VRAM大小，对普通用户来说是一个更实用的解决方案。最近许多研究人员在这个方向上研究量化，并开发出了许多精巧的方法。

在这篇博客中，我们将学习流行的量化技术，如GPTQ、AWQ和Bitsandbytes(QLoRA)。GPTQ和AWQ被归类为PTQ，而QLoRA被归类为QAT。这些算法已经集成到transformers库中，因此用户可以高效地使用它们。在接下来的章节中，我们将简要检查这些算法的理论。

### 2. 什么是分组精度调整量化(GPTQ)?

分组精度调整量化(GPTQ)[1]是2022年开发的早期成功量化算法之一。在当时，这种技术首次将175B等大型模型（如BLOOM或OPT-175B）量化为4位。

从技术上讲，GPTQ独立量化权重矩阵的每一行，以找到最小化量化误差的最优权重。为了精确量化，它利用Hessian矩阵来计算剩余权重的最优更新，从而减轻压缩过程带来的损失。注意，GPTQ保持嵌入层和输出层为完整的FP16精度，以保持模型精度。下面的伪代码描述了GPTQ算法。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_6dd8bb8a7f8e.jpg)

伪代码改编自论文[1]根据论文，使用单个A100 GPU（80GB VRAM）大约需要四个小时来量化175B参数模型。OPT-175B的量化结果如下表所示。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_46194da9ba9a.jpg)

结果表格改编自论文[1]供参考，困惑度衡量模型预测句子中下一个词的能力。因此，困惑度值的降低意味着模型对其预测更有信心。在上表中，与16位精度相比，GPTQ量化的模型保持了困惑度值增加的最小化。

### 3. 什么是激活感知权重量化(AWQ)?

激活感知权重量化(AWQ)[2]最近成为最受欢迎的量化算法之一。该算法关注对LLM性能非常重要的显著权重。作者的研究表明，LLM有一小部分权重（0.1~1%）显著影响量化误差。他们利用激活幅度来找到这一小部分权重，并应用每通道缩放来减轻显著权重的量化误差。下图(c)展示了这个过程。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_133bad21b43a.jpg)

AWQ算法示意图改编自论文[2]下表显示了Llama-2和LLaMA模型的AWQ结果。如你所见，AWQ能够获得比最近舍入(RTN)量化和GPTQ更好的困惑度。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_e3e3a3b889b3.jpg)

Llama量化的结果比较改编自论文[2]需要注意的是，根据论文，AWQ有时对某些模型（如Mistral模型和指令调整模型）的效果不如GPTQ。当我们量化LLMs时，我们应该比较这些算法的结果并选择最好的一个。

### 4. 什么是BitsandBytes?

BitsandBytes是一个将模型量化为8位或4位的量化库。由于其便利性和有效性，它是最常用的量化库。

BitsandBytes的8位量化基于LLM.int8()论文[3]。为了减轻量化误差，它将模型权重中的敏感异常值保持在FP16中，其他部分保持在INT8中，然后分别进行矩阵乘法。最后，它将它们加在一起返回FP16格式。下图显示了这个过程。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b6d6e7079740.jpg)

LLM.int8()架构改编自论文[3]这种技术可以应用于高达170B规模的模型，但它仍然需要8 x 24GB VRAM来运行170B模型，4 x 24GB VRAM来运行66B模型。这对于在消费级GPU上运行大规模模型来说仍然不够。

因此，4位量化被开发出来解决这个问题。Bitsandbytes的4位量化通常与QLoRA[4]一起使用来微调量化的LLMs。直观地说，QLoRA将目标模型量化为4位，使其冻结，并使用LoRA微调冻结的4位模型。以下是完整微调、LoRA和QLoRA之间的比较。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_ffddebf856a6.jpg)

完整微调、LoRA和QLoRA架构比较改编自论文[4]从技术上讲，QLoRA主要利用以下特性：

- <strong>4位NormalFloat量化</strong>
这种技术利用了预训练神经网络权重具有正态分布的事实，并引入了称为4位NormalFloat类型的新数据类型，确保每个量化区间中有相等的预期值数量。

- <strong>分页优化器</strong>
QLoRA应用分页优化器来避免突然的GPU内存峰值。分页优化器使用NVIDIA统一内存特性来自动在CPU和GPU之间进行页到页的传输（在这种情况下，你可以想象GPU页面类似于内存中的CPU页面）。

- <strong>双重量化</strong>
当你对模型权重进行量化时，你需要与模型权重相同数据类型的量化常数。由于LLMs中有许多参数，量化常数也会给内存空间带来负担。为了最小化每个参数的内存占用，作者对量化常数进行量化。

你可以查看这篇文章来更详细地了解这些特性。下表显示了参数大小与GPU VRAM消耗的关系。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_0c345b14900b.jpg)

参数大小与内存消耗的关系改编自论文[4]注意，内存列显示的是模型的内存需求，所以它不包含微调部分。虽然这取决于数据集或超参数设置，但我们可能可以使用消费级24GB VRAM机器微调高达13B参数的模型。

当零样本LLM精度不足以满足我们的目标任务时，我们应该使用QLoRA。在实际的AI项目中，我们经常使用这种技术，因为基础模型通常不适用于特定领域的数据。

### 5. 什么是Unsloth?

虽然Unsloth不是量化方法，但我想介绍这个用于LLMs的超高效微调开源库。[Unsloth](https://link.zhihu.com/?target=https%3A//github.com/unslothai/unsloth)是一个完全集成了参数高效微调方法（如LoRA和QLoRA）的库。它为开源著名LLMs优化了每个内核，实现了高达~70%的内存使用减少！例如，它支持开源LLMs，如Llama、Mistral、Phi、Qwen和Gemma。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_41cc8e15c737.jpg)

Unsloth支持表格改编自官方仓库Unsloth与HuggingFace和vllm兼容，我们可以在它们之间互换格式。当模型受支持时，我们应该使用Unsloth来节省内存并提高性能。

就在最近（2024年12月4日），Unsloth发布了一种新的量化方法，称为Unsloth — 动态4位量化。这种技术建立在BitsandBytes 4位量化的基础上，动态确定是否对某些参数进行量化。目前，只发布了多模态模型的量化版本。语言模型将随后得到支持。

到目前为止，我们已经看到了流行的量化技术和库。总结一下，我们可以在以下情况下使用这些量化技术：

- 你想在零样本设置中使用LLMs → GPTQ或AWQ
- 你想用自己的数据微调LLMs → QLoRA（BitsandBytes或Unsloth）
在下一节中，我们将学习如何在Google Colab Notebook上实现它们。

### 6. GPTQ、AWQ、BitsandBytes和Unsloth的实践量化实现

在本节中，我们将学习如何加载已经量化的模型和量化我们自己的模型。GPTQ、AWQ和BitsandBytes已经集成到HuggingFace transformers库中，所以我们将使用transformers进行它们的量化。我们将使用Unsloth库进行Unsloth量化。现在，让我们设置环境。

### 环境设置

我们将使用Google Colab Notebook环境。我们实验使用最高24GB VRAM的模型。首先，我们安装以下库。

```bash
pip install auto-gptq autoawq trl bitsandbytes>=0.39.0
pip install accelerate transformers optimum
pip install git+https://github.com/unslothai/unsloth.git
```


如果你遇到与fsspec库版本不兼容的错误，你可以忽略它。所有必要的库都已安装。我会在Colab notebook中附上库版本，所以你可以查看它。 

### GPTQ实现

- <strong>如何加载GPTQ预量化模型</strong>
要加载GPTQ预量化模型，你只需要将你想使用的模型名称传递给AutoModelForCausalLM类。当你将device_map设置为“auto”时，系统会自动利用可用的GPU。让我们使用以下代码加载Mistral 7B模型。

from transformers import AutoModelForCausalLM
​

```text
model_name_or_path = "TheBloke/Mistral-7B-Instruct-v0.1-GPTQ"
model = AutoModelForCausalLM.from_pretrained(model_name_or_path, device_map="auto")
```


你可以看到，我们可以只用~5GB VRAM就加载一个量化的7B模型。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_6861da20e348.jpg)

Mistral-GPTQ VRAM使用情况（作者提供）加载模型部分完成。

- <strong>如何使用GPTQ预量化模型进行推理</strong>
我们可以按照与非量化模型相同的程序进行推理。在这种情况下，我们可以使用名为apply_chat_template的分词器函数来制作LLM输入。我问量化模型如何制作蛋黄酱。我们可以使用transformers API编写以下代码。

```text
messages = [
    {"role": "user", "content": "What is your favourite condiment?"},
    {"role": "assistant", "content": "Well, I'm quite partial to a good squeeze of fresh lemon juice. It adds just the right amount of zesty flavour to whatever I'm cooking up in the kitchen!"},
    {"role": "user", "content": "Do you have mayonnaise recipes?"}
]
```

​
encodeds = tokenizer.apply_chat_template(messages, return_tensors="pt")
​

```text
model_inputs = encodeds.to(device)
model.to(device)
```

​

```python
generated_ids = model.generate(model_inputs, max_new_tokens=1000, do_sample=False)
decoded = tokenizer.batch_decode(generated_ids)
print(decoded[0])
```

# 模型回答：
# Oh, certainly! Here's a quick and easy recipe for classic mayonnaise that I'm sure you'll enjoy:
#
# Ingredients:
# - 2 large egg yolks
# - 1 tablespoon Dijon mustard
# -  teaspoon of salt
# - 2 tablespoons white wine vinegar or lemon juice
# - 1 cup of vegetable or canola oil
# -  cup of olive oil
#
# Instructions:
# 1. In a blender or food processor, combine egg yolks, mustard, and salt.
# 2. With the machine running, slowly drizzle in the white wine vinegar or lemon juice until the mixture thickens.
# 3. In a slow, steady stream, add the vegetable oil, followed by the olive oil, until the mixture is a smooth, creamy consistency.
# 4. Taste the mayonnaise and adjust the salt and acid levels as needed.
# 5. Transfer the mayonnaise to a tightly sealed container and chill in the fridge until ready to serve.

如你所见，模型可以详细回答蛋黄酱的制作方法。即使我们将模型量化为4位，模型仍然能保持其准确性。

- <strong>如何量化和保存我们自己的GPTQ模型？</strong>
现在，让我们量化Llama3.2 3B。我们需要为GPTQ量化定义GPTQConfig类。我们可以传递校准数据集，可以在[“c4”, “wikitext2”, “c4-new”]中选择。我们应该使用相同的数据集来避免过拟合。由于Llama没有公开使用哪个数据集进行训练，我选择wikitext2作为安全选项。以下代码显示了GPTQ量化。

from transformers import GPTQConfig, AutoModelForCausalLM, AutoTokenizer
​
# setting 

```text
model_id = "meta-llama/Llama-3.2-3B"
tokenizer = AutoTokenizer.from_pretrained(model_id)
gptq_config = GPTQConfig(bits=4, dataset="wikitext2", tokenizer=tokenizer)
```

​
# run quantization
quantized_model = AutoModelForCausalLM.from_pretrained(model_id, device_map="auto", quantization_config=gptq_config)
​
# save quantized model

```text
quantized_model.save_pretrained(result_dir)
tokenizer.save_pretrained(result_dir)
```


对3B模型进行量化大约需要30分钟。当我们保存量化模型时，输出目录将如下图所示。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_ffcb12d9ecfe.jpg)

输出目录图片（作者提供）

- <strong>如何加载我们自己的量化模型？</strong>
我们可以通过传递保存的目录名称来加载我们自己的量化模型。

`model = AutoModelForCausalLM.from_pretrained(result_dir, device_map="auto")`

是不是很简单？现在，我们已经学会了如何加载预量化模型、量化我们自己的模型，以及加载我们自己的量化模型的GPTQ。当量化其他模型时，你只需要更改传递给AutoModelForCausalLM类的模型名称。 

### AWQ实现

- <strong>如何加载AWQ预量化模型</strong>
要加载AWQ预量化模型，你只需要将你想使用的模型名称传递给AutoModelForCausalLM类。当你将device_map设置为“auto”时，系统会自动利用可用的GPU。让我们使用以下代码加载Mistral 7B模型。

```text
model_name_or_path = "TheBloke/Mistral-7B-Instruct-v0.1-AWQ"
model = AutoModelForCausalLM.from_pretrained(model_name_or_path, device_map="auto")
```


你可以看到，我们可以只用~5GB VRAM就加载一个量化的7B模型。


![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_2f5bd20cae0e.jpg)

Mistral AWQ VRAM使用情况（作者提供）

- 如何使用AWQ预量化模型进行推理
我们可以像正常的CausalLM推理一样使用预量化模型进行推理。在这种情况下，分词器没有chat_template，所以我们必须传递模板。推理代码如下所示。

```text
prompt = "Tell me about blackhole."
prompt_template=f'''{prompt}'''
```

​
​
tokens = tokenizer(prompt_template, return_tensors="pt").input_ids.cuda()
​

```python
generated_ids = model.generate(
                                tokens, 
                                do_sample=True,
                                temperature=0.7,
                                top_p=0.95,
                                top_k=40,
                                max_new_tokens=512
                              )
decoded = tokenizer.decode(generated_ids[0])
print(decoded)
```

# 模型回答：
# A black hole is a region in space-time where gravity is so strong that nothing, not even light, can escape. 
# Black holes are formed from the collapse of massive stars and are characterized by their event horizon, 
# a boundary beyond which anything that crosses it is unable to return. 
# Black holes come in various sizes, with the smallest being only a few times the mass of the sun, 
# and the largest being billions of times more massive than the sun. They are invisible, 
# but their presence can be inferred from their gravitational effects on nearby objects, such as stars and galaxies. 
# The study of black holes provides important insights into the nature of gravity, space, and time.

如你所见，模型可以详细回答关于黑洞的问题。它似乎保持了模型的准确性。

- <strong>如何量化和保存我们自己的AWQ模型？</strong>
现在，让我们量化Llama3.2 3B。首先，我们需要以字典格式定义AWQ量化的配置。我选择了4位量化和零点量化。此外，AWQ模型有一个特定的类，所以我们需要用模型名称加载它。以下代码显示了AWQ量化。

```text
model_path = "meta-llama/Llama-3.2-3B"
quant_config = {"zero_point": True, "q_group_size": 128, "w_bit": 4, "version":"GEMM"}
```

​
# Load model

```text
model = AutoAWQForCausalLM.from_pretrained(model_path)
tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
```

​
# Quantize
model.quantize(tokenizer, quant_config=quant_config)

对3B模型进行量化需要15分钟。要保存AWQ量化的模型，我们需要修改模型和配置的某些部分，使其与transformers兼容。

# modify the config file so that it is compatible with transformers integration

```text
quantization_config = AwqConfig(
    bits=quant_config["w_bit"],
    group_size=quant_config["q_group_size"],
    zero_point=quant_config["zero_point"],
    version=quant_config["version"].lower(),
```

).to_dict()

# the pretrained transformers model is stored in the model attribute + we need to pass a dict
model.model.config.quantization_config = quantization_config

# save model weights

```text
model.save_quantized(result_dir)
tokenizer.save_pretrained(result_dir)
```


当我们保存量化模型时，输出目录将如下图所示。它看起来像GPTQ量化模型的保存目录。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_d43d66ade15f.jpg)

AWQ输出目录图片（作者提供）

- <strong>如何加载我们自己的量化模型？</strong>
我们可以通过传递保存的目录名称来加载我们自己的量化模型。

`model = AutoModelForCausalLM.from_pretrained(result_dir, device_map="auto")`

现在，我们已经学会了如何加载预量化模型、量化我们自己的模型，以及加载我们自己的量化模型的AWQ。注意，当你使用AWQ量化模型时，你需要使用特定的类。 

### BitsandBytes实现

- <strong>如何使用BitsandBytes实现QLoRA？</strong>
在本节中，我们将使用BitsandBytes 4位量化实现QLoRA。现在，我们将微调llama3.2 3B使其成为指令调整的聊天机器人。首先，我们需要配置BitsandBytes 4位配置。我们使用与QLoRA论文相同的设置，它具有NormalFloat4数据类型和双重量化。

# configure BitsandBytes configuration for 4-bit quantization

```text
bnb_config = BitsAndBytesConfig(
   load_in_4bit=True,
   bnb_4bit_quant_type="nf4",
   bnb_4bit_use_double_quant=True,
   bnb_4bit_compute_dtype=torch.bfloat16
)

model_id = "meta-llama/Llama-3.2-3B"
model_nf4 = AutoModelForCausalLM.from_pretrained(model_id, quantization_config=bnb_config, device_map={"":0})
model_nf4.gradient_checkpointing_enable()
```


我们需要为4位量化训练应用以下准备函数。

`model_nf4 = prepare_model_for_kbit_training(model_nf4)`

接下来，我们需要为模型微调定义LoRA。LoraConfig中的以下参数是超参数，所以我们必须调整它们。我们可以通过应用get_peft_model函数获得LoRA模型。

```text
config = LoraConfig(
    r=16, 
    lora_alpha=32, 
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                     "gate_proj", "up_proj", "down_proj"], 
    lora_dropout=0.05, 
    bias="none", 
    task_type="CAUSAL_LM"
)

model_nf4 = get_peft_model(model_nf4, config)
```


你可以看到，我们可以只用~4GB VRAM就加载一个量化的3B模型。


![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_ae54f16da1b8.jpg)

使用BitsandBytes量化的Llama3.2 VRAM使用情况图片（作者提供）对于指令调整数据集，我们使用grade-school-math-instructions[5]。我们可以通过dataset API加载它。

dataset = load_dataset("qwedsacf/grade-school-math-instructions", split='train')

# 示例数据
# Instruction:
# 'This math problem has got me stumped: Natalia sold clips to 48 of her friends in April, and then she sold half as many clips in May. How many clips did Natalia sell altogether in April and May?\nCan you show me the way?',
# Answer:
# 'Natalia sold  = 24 clips in May.\nNatalia sold 48+24 = 72 clips altogether in April and May.')

trl库存在于实现指令调整。我们想使用trl库中的监督微调(SFT) Trainer来方便使用，所以我们需要修改我们的数据格式以适应SFTTrainer。我们通过定义如下的格式函数来格式化我们的数据。

```python
def formatting_prompts_func(example):
    output_texts = []
    for i in range(len(example['INSTRUCTION'])):
        text = f"### Question: {example['INSTRUCTION'][i]}\n ### Answer: {example['RESPONSE'][i]}"
        output_texts.append(text)
    return output_texts
```


接下来，我们定义整理器来使模型只针对给定的数据集答案进行训练。有一个名为“DataCollatorForCompleionOnlyLM”的类可以完成这项工作，所以我们只需要用答案模板实例化这个类来区分给定输入中的答案部分。

```text
response_template = " ### Answer:"
collator = DataCollatorForCompletionOnlyLM(response_template=response_template, tokenizer=tokenizer, mlm=False)
```


最后，在我们定义了训练参数之后，我们可以开始训练！处理整个数据集大约需要2小时。在这篇博客中，为了训练速度，数据量被限制了。

```text
output_dir = os.path.join(base_dir, "llama3.2-3B-qlora")
per_device_train_batch_size = 8
gradient_accumulation_steps = 4
optim = "paged_adamw_32bit"
save_steps = 500
logging_steps = 100
learning_rate = 2e-4
max_grad_norm = 0.3
max_steps = 500   # int(len(dataset['train']) // per_device_train_batch_size)
warmup_ratio = 0.03
lr_scheduler_type = "constant"

training_arguments = TrainingArguments(
    output_dir=output_dir,
    per_device_train_batch_size=per_device_train_batch_size,
    gradient_accumulation_steps=gradient_accumulation_steps,
    optim=optim,
    save_steps=save_steps,
    logging_steps=logging_steps,
    learning_rate=learning_rate,
    fp16=True,
    max_grad_norm=max_grad_norm,
    max_steps=max_steps,
    warmup_ratio=warmup_ratio,
    group_by_length=True,
    lr_scheduler_type=lr_scheduler_type,
    report_to=None
)

trainer = SFTTrainer(
    model_nf4,
    args=training_arguments,
    train_dataset=dataset['train'],
    eval_dataset=dataset['test'],
    formatting_func=formatting_prompts_func,
    data_collator=collator,
)

trainer.train()
```


训练后，我们需要保存模型。我们可以使用以下方法。

# 保存模型
trainer.save_model(output_dir)

我们可以保存分词器和LoRA模型权重。保存的目录看起来如下图所示。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_80300d4630dc.jpg)

保存目录图片（作者提供）

- 如何使用训练好的QLoRA模型进行推理？
当我们加载QLoRA模型时，我们只需要传递trainer.save_model()的保存目录。

tokenizer = AutoTokenizer.from_pretrained(output_dir)
tokenizer.pad_token = tokenizer.eos_token
model = AutoModelForCausalLM.from_pretrained(output_dir, load_in_4bit=True, device_map="auto")

现在，使用测试数据集检查微调结果。我们使用以下问题比较结果。

There are 180 school days in the academic year. 
Aliyah packs a lunch half the time. 
Becky packs her lunch half as much as Aliyah. 
How many days a year does Becky pack her lunch?
Find the solution. 

基础模型的推理如下所示。它无法捕捉整个问题的上下文。

`90 days`

QLoRA模型的推理如下所示。

```text
Aliyah packs her lunch =90 days.
Becky packs her lunch =45 days.
```


如你所见，即使使用小数据集，我们也可以微调模型！当我们有限的计算资源和数据时，QLoRA真的很有用。 

### Unsloth实现

- <strong>如何使用Unsloth实现QLoRA？</strong>
当我们使用Unsloth应用QLoRA时，过程与使用BitsandBytes的QLoRA非常相似。不同的部分是如何加载模型和分词器。当我们使用Unsloth加载模型时，我们需要使用Unsloth包装器和Unsloth定义的模型，如下所示。你可以看到模型类和模型名称与前一节不同。

```text
max_seq_length = 2048 # 选择任意值！我们内部自动支持RoPE缩放！
dtype = None # None用于自动检测。Tesla T4、V100使用Float16，Ampere+使用Bfloat16
load_in_4bit = True # 使用4位量化来减少内存使用。可以为False。
```


model, tokenizer = FastLanguageModel.from_pretrained(

```text
    model_name = "unsloth/Llama-3.2-3B-Instruct", # 或选择 "unsloth/Llama-3.2-1B-Instruct"
    max_seq_length = max_seq_length,
    dtype = dtype,
    load_in_4bit = load_in_4bit,
   )
```


要加载LoRA适配器，我们也需要使用Unsloth包装器，如下所示。

```text
model = FastLanguageModel.get_peft_model(
    model,
    r = 16, # 选择任何 > 0 的数字！建议 8, 16, 32, 64, 128
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                      "gate_proj", "up_proj", "down_proj",],
    lora_alpha = 16,
    lora_dropout = 0.05, # 支持任何值，但 = 0 是优化的
    bias = "none",    # 支持任何值，但 = "none" 是优化的
    # [新特性] "unsloth" 使用30%更少的VRAM，适合2倍大的批量大小！
    use_gradient_checkpointing = "unsloth", # True 或 "unsloth" 用于很长的上下文
    random_state = 3407,
    use_rslora = False,  # 我们支持等级稳定化LoRA
    loftq_config = None, # 和LoftQ
)
```


你可以看到，我们可以只用~3GB VRAM就加载一个量化的3B模型。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_262383770cbe.jpg)

Unsloth VRAM使用情况图片（作者提供）除了上述设置外，其余部分几乎相同。我们使用SFTTrainer进行微调。处理整个数据集大约需要2小时。在这篇博客中，为了训练速度，数据量被限制了。

```text
trainer = SFTTrainer(
    model,
    args=training_arguments,
    train_dataset=dataset['train'],
    formatting_func=formatting_prompts_func,
    data_collator=collator,
)

trainer.train()
```


训练后，我们需要保存模型。我们可以使用以下方法。保存的目录看起来如下图所示。

# 只保存LoRA权重

```text
model.save_pretrained(os.path.join(output_dir, "lora_model"))
tokenizer.save_pretrained(os.path.join(output_dir, "lora_model"))
```


![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_bd5d3a96c991.jpg)

保存目录图片（作者提供）这种方法保存了一个名为adapter_config.json的配置文件用于加载模型。在推理时，Unsloth会自动读取设置，我们只需要传递保存LoRA权重和配置的目录名称。

model, tokenizer = FastLanguageModel.from_pretrained(

```text
        model_name = os.path.join(output_dir, "lora_model"), # 你用于训练的模型
        max_seq_length=512,
        dtype=None,
        load_in_4bit=True,
    )
FastLanguageModel.for_inference(model) # 启用原生2倍速推理
```


我们可以以与标准HuggingFace CausalLM相同的方式推理给定的句子。

```text
prompt = f"###Question: {dataset['test']['INSTRUCTION'][idx]}\n ### Answer:"
prompt_template=f'''{prompt}'''
```

​

```python
tokens = tokenizer(prompt_template, return_tensors="pt").input_ids.cuda()
outputs = model.generate(
    input_ids=tokens,
    temperature=0.2,
    top_p=0.95,
    max_new_tokens=512
)
print(tokenizer.batch_decode(outputs, skip_special_tokens=True)[0])
```


这是BitsandBytes QLoRA部分中相同示例问题的结果。它可以正确回答问题！

```text
Aliyah packs her lunch  = 90 days.
Becky packs her lunch  = 45 days.
```


在这篇博客中，我们从基础开始学习了最近流行的量化技术的概念。随着最近LLMs规模的增长，量化的重要性变得越来越高。这种技术对实际的AI应用很有帮助，我希望这篇博客能帮助你进入量化领域。下面的代码可以用来复现这篇博客的结果。

### 参考文献

[1] Elias Fratar, et.al., [GPTQ: ACCURATE POST-TRAINING QUANTIZATION FOR GENERATIVE PRE-TRAINED TRANSFORMERS](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2210.17323), *Arxiv*

[2]Ji Lin, Jiaming Tang, et.al., [AWQ: ACTIVATION-AWARE WEIGHT QUANTIZATION FOR ON-DEVICE LLM COMPRESSION AND ACCELERATION](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2306.00978), *Arxiv*

[3] Tim Dettmers, et.al., [LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2208.07339), *Arxiv*

[4] Tim Dettmers, et.al., [QLORA: Efficient Finetuning of Quantized LLMs](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2305.14314), *Arxiv*

[5] Karl Cobbe, Vinnet Kosaraju, et.al., [Training Verifiers to Solve Math Word Problems](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2110.14168), *Arxiv* 

[6] https://generativeai.pub/practical-guide-of-llm-quantization-gptq-awq-bitsandbytes-and-unsloth-bdeaa2c0bbf6
