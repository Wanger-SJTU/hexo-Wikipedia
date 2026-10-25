---
title: 从EAGLE-3看Tokenizer对投机解码的影响
date: "2025-06-14 00:00:00"
updated: "2025-06-14 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/从EAGLE-3看Tokenizer对投机解码的影响/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1916965162755285553
---


最近一直在优化LLM端侧的推理性能，目前来看投机解码是加速decode最好方法。EAGLE-3发布后直接成为了投机解码的SOTA，官方论文里的速度也确实非常快，在[Spec Bench](https://link.zhihu.com/?target=https%3A//github.com/hemingkx/Spec-Bench/blob/main/Leaderboard.md)中也是目前最快的方法。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_be4a6d06b9a7.jpg)

我在服务器上下载了EAGLE-3的模型测试了一下，结果非常喜人：`vicuna-13b-v1.3`的加速比高得惊人，与论文中的数据基本一致。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_33aadee834a2.jpg)

vicuna-13b EAGLE-3紧接着，我又测试了其他更常用的模型，比如`Meta-Llama-3.1-8B-Instruct`和`DeepSeek-R1-Distill-Llama-8B`。然而，实际测试下来，它们在同样的测试场景下，表现似乎就不如Vicuna那么抢眼了，尤其是`DeepSeek-R1-Distill-Llama-8B`,在简单的测试似乎上达不到论文中的效果。我开始思考：EAGLE3能带来如此高的加速比，除了它本身优秀的草稿模型和验证机制外，是不是还有其他“玄机”？<strong>初步猜测：</strong>

- <strong>训练数据一致性？</strong> EAGLE3训练Vicuna时使用的数据集应该与Vicuna模型训练使用的数据集一致性很高，所以能更好地预测并被接受？这可能是一个原因。
- <strong>Tokenizer作祟？</strong> 但我发现了当Vicuna使用中文输入时，显示的接受率比我感觉上要高。比如给了一个“你好”作为Vicuna的输入，打印了decode的候选集与接受情况。从这个输入能看出来Vicuna的中文词表比较简单，基础的你好都要分成2个token，所以虽然单次推理的内容大概2个词语，但实际有7个token。
--- 候选Token树结构 ---                                                                                                                                                                      
总候选Token数: 60                                                                                                                                                                            
最大深度: 7                                                                                                                                                                                  
-------------------------                                                                                                                                                                    
└── '' (id: 29871)                                                                                                                                                                           

```text
    ├── '你' (id: 30919)                                                                                                                                                                     
    ├── '好' (id: 31076)                                                                                                                                                                     
    ├── '�' (id: 233)                                                                                                                                                                        
    ├── '�' (id: 232)                                                                                                                                                                        
    ├── '�' (id: 236)                                                                                                                                                                        
    ├── '请' (id: 31088)                                                                                                                                                                     
    ├── '我' (id: 30672)                                                                                                                                                                     
    ├── '非' (id: 31838)                                                                                                                                                                     
    ├── '�' (id: 234)                                                                                                                                                                        
    └── '�' (id: 235)                                                                                                                                                                        
        ├── '好' (id: 31076)                                                                                                                                                                 
        ├── '！' (id: 30584)                                                                                                                                                                 
        ├── '的' (id: 30210)                                                                                                                                                                 
        ├── '，' (id: 30214)                                                                                                                                                                 
        ├── '�' (id: 133)                                                                                                                                                                    
        ├── '�' (id: 141)                                                                                                                                                                    
        ├── '�' (id: 135)                                                                                                                                                                    
        ├── '�' (id: 131)                                                                                                                                                                    
        ├── '好' (id: 31076)                                                                                                                                                                 
        └── '常' (id: 31190)                                                                                                                                                                 
            ├── '！' (id: 30584)                                                                                                                                                             
            ├── '，' (id: 30214)                                                                                                                                                             
            ├── '!' (id: 29991)                                                                                                                                                              
            ├── '�' (id: 171)                                                                                                                                                                            ├── '我' (id: 30672)
            ├── '你' (id: 30919)
            ├── '，' (id: 30214)
            ├── '你' (id: 30919)
            ├── '我' (id: 30672)
            ├── '�' (id: 156)
            ├── '�' (id: 180)
            └── '�' (id: 162)
                ├── '我' (id: 30672)
                ├── '你' (id: 30919)
                ├── '有' (id: 30417)
                ├── '请' (id: 31088)
                ├── '�' (id: 233)
                ├── '我' (id: 30672)
                ├── '你' (id: 30919)
                ├── '请' (id: 31088)
                ├── '好' (id: 31076)
                ├── '的' (id: 30210)
                ├── '我' (id: 30672)
                ├── '你' (id: 30919)
                ├── '请' (id: 31088)
                ├── '' (id: 29871)
                ├── '好' (id: 31076)
                └── '�' (id: 233)
                    ├── '！' (id: 30584)
                    ├── '好' (id: 31076)
                    ├── '好' (id: 31076)
                    ├── '�' (id: 231)
                    ├── '问' (id: 31658)
                    └── '好' (id: 31076)
                        ├── '我' (id: 30672)
                        ├── '！' (id: 30584)
                        ├── '！' (id: 30584)
                        └── '�' (id: 190)
                            └── '�' (id: 131)
```

[DEBUG] accept_ids:  [29871, 30919, 31076, 30584, 30417, 231, 190, 131]
[DEBUG] accept_txt:  ['', '你', '好', '！', '有', '�', '�', '�'`

这就引出了一个更深层次的问题：<strong>我们看到的“加速比”（每步接受的Token数量），受到模型tokenizer粒度大小的影响有多大？</strong> 如果一个模型的tokenizer把内容分得更细碎，那么即使每步看似接受了更多的Token，它表达同样的信息，却可能需要更多的“步数”和“Token总数”。那么，这样的“加速”还是我们真正想要的“有效加速”吗？这个问题在知乎上 [@灰瞳六分仪](//www.zhihu.com/people/015fe701c60b5254dc8fc2b7c6037ac4)

 的[文章](https://zhuanlan.zhihu.com/p/27877192782)中也有提到：

<strong>在这里再碎碎念一句，据我们实验结果显示，LLaMA 3的大词表似乎是一种训练得不太好的大词表，虽然不比Qwen .5 的词表小多少，但投机解码的加速比就是会高一些。所以 Qwen 真的是很不适合做投机解码的一种模型。当然，也可以理解为 Qwen 的 tokenizer 肩负了部分投机解码的使命。为了验证这个猜想，我设计了一个实验，旨在分析不同tokenizer下的等效加速比</strong>。使用Gemini 2.5 Flash构造了30条测试Prompt：

- 10条纯中文Prompt
- 10条纯英文Prompt
- 10条多语言（每条Prompt仅包含一种语言，如日文、法文、俄文等）Prompt
随后，我分别在<strong>Vicuna-13b-v1.3</strong>、<strong>Llama3.1-8B-Instruct</strong>和<strong>DeepSeek-R1-Distill-Llama-8B</strong>这三个模型上进行了实际的投机解码测试，并记录下EAGLE3在每个解码步骤中实际生成的（被接受的）Token序列。

<strong>核心分析方法：</strong>**对实际测试模型在每一步投机解码中“接受”的Token序列，我进行了以下操作：

- 首先，使用测试模型的tokenizer将这些Token序列解码还原为文本片段**。
- 然后，将这些<strong>文本片段</strong>，再使用其他目标模型（Llama3.1、DeepSeek、Qwen）的tokenizer进行<strong>重新编码</strong>。
- 通过这种方式可以计算出：如果这些文本是由其他模型的tokenizer来处理，它们会产生多少<strong>等效的Token</strong>。这个等效Token数除以投机解码的步数，就是其他模型在“相同语义内容”下的<strong>预估加速比</strong>。
使用Gemini 2.5 Flash实现了分析和对比的脚本，结果如下：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_0249aa177d2d.jpg)

EAGLE-3实测模型与词表等价加速比

- <strong>英文语境下：各模型Tokenizer粒度相对接近</strong>

- <strong>当Vicuna作为实际测试模型时</strong>（图左侧子图），在英文测试中，其实际加速比高达<strong>6.79x</strong>。此时，Llama3（<strong>6.06x</strong>）、Deepseek（<strong>6.06x</strong>）和Qwen3（<strong>6.09x</strong>）的预估加速比也表现得相当接近，都在6x左右。这表明对于英文文本，这些模型的Tokenizer在效率上差异不大。
- <strong>当Llama3作为实际测试模型时</strong>（图中子图），它在英文中的实际加速比为<strong>4.86x</strong>，而Vicuna的预估加速比则达到了<strong>6.74x</strong>。这说明Vicuna的Tokenizer在处理Llama3生成的英文内容时，会将其拆解成更多的Token，从而预估出更高的“每步Token数”。
- <strong>当Deepseek作为实际测试模型时</strong>（图右侧子图），其英文实际加速比仅为<strong>1.60x</strong>，远低于其他模型。Vicuna对Deepseek输出的预估加速比为<strong>2.71x</strong>。
- <strong>结论：</strong> 尽管各模型实际加速比有所差异，但Vicuna的Tokenizer在英文上普遍倾向于更细的粒度，导致其加速比数字看起来更高。

- <strong>中文语境下：Tokenizer粒度差异显著</strong>

- <strong>当Vicuna作为实际测试模型时</strong>（图左侧子图），在中文测试中，其实际加速比是<strong>3.86x</strong>。然而，Llama3、Deepseek和Qwen3的预估加速比则分别只有<strong>2.40x、2.40x、2.16x</strong>。Vicuna的加速比数字明显高于其他模型，但这些“额外”的Token，很可能只是将中文词汇拆分得更细。
- <strong>当Llama3作为实际测试模型时</strong>（图中子图），其中文实际加速比降至<strong>1.46x</strong>。但此时，Vicuna的预估加速比却高达<strong>3.39x</strong>。
- <strong>当Deepseek作为实际测试模型时</strong>（图右侧子图），其中文实际加速比更是低至<strong>1.16x</strong>。Vicuna的预估加速比则为<strong>2.94x</strong>。
- <strong>核心洞察：</strong> 这些数据强烈支持我的猜想：Vicuna这类通用（通常英文优先）的Tokenizer在处理中文时，会将常用词语拆解成更多细碎的Token。而Llama3、Deepseek和Qwen3这类模型，尤其Qwen，其Tokenizer对中文有深度优化，能用更少的Token表示相同的中文内容。<strong>这意味着，即便Vicuna每步看似能“接受”更多Token，但其承载的语义信息量可能不如中文优化模型。最终，拥有高效中文Tokenizer的模型，即使投机解码“步长”数字不显眼，整体生成相同内容的“总时间”却可能更短，效率更高。</strong>

- <strong>多语言语境下：与中文相似</strong>

- 多语言的结果来看与中文结果相似

<strong>结论：</strong> 不同模型对不同语言的tokenizer优化程度不同，导致它们在多语言场景下的表现差异。Vicuna的Tokenizer在不同语言中普遍呈现出较细的粒度；从“每步接受多少Token”的指标上来看是其他模型的1.5~2倍。

*测试代码：[https://github.com/wangzhaode/llm-lab/tree/main/eagle](https://link.zhihu.com/?target=https%3A//github.com/wangzhaode/llm-lab/tree/main/eagle)*
