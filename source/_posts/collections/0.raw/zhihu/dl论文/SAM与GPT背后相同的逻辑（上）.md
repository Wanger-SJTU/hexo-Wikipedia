---
title: SAM与GPT背后相同的逻辑（上）
date: "2023-05-04 00:00:00"
updated: "2023-05-04 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/SAM与GPT背后相同的逻辑(上)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/626510234
---


本月（）Meta提出的Segment Anything(SAM)，对图像分割甚至整个计算机视觉CV来说，不啻为一枚重磅炸弹。而SAM背后的大逻辑，居然和GPT的大语言模型LLM是一模一样的，CV和NLP领域之前相似的思想不太多，Transformer是其中重要一个，SAM和GPT也都用到了。本文要讨论其背后的大逻辑，甚至超越了Transformer。

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_65505b2e400c.jpg)

https://hackaday.com//14/need-to-pick-objects-out-of-images-segment-anything-does-exactly-that/**GPT的本质：**

GPT的成功源于一个简单到惊人的近乎哲学的命题：**世界上所有的知识都可以被压缩到一个神经网络(的参数)中，而其表现就是能准确的预测下一个词(Predict Next Token)。**

换言之，预测下一个词的越准确的神经网络，融合了世界上更多的知识。

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_b002d422e0b1.jpg)

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_20a3d8b6e10c.jpg)

https://blog.feedly.com/nlp-breakfast-2-the-rise-of-language-models/维特根斯坦说过：语言的边界就是思想的边界。虽然这句话还有些争议，但是我们姑且可以认为，人类的思想基本上都是可以通过文字表达的，也许佛法是个例外，真正的佛法是无字天书，不可言说，不在我们这些凡夫俗子这里的讨论范围之内。

GPT3.0 将从45TB数据中过滤出来的570GB的高质量的知识“压缩”到1750亿的参数中，使它能很好的进行预测下一个词的“文字接龙”游戏。

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_959c947f68a4.jpg)

https://towardsdatascience.com/what-are-the-data-centric-ai-concepts-behind-gpt-models-a590071bb727GPT3.5及之后没有开源，我们无法了解其细节，但是其主要思想应没有发生根本变化，正如OpenAI的联合创始人和首席科学家Ilya Sutskever在接受采访时所说，其实十多年来，他们一直相信，在神经网络中大量堆积简单的神经元，将产生令人难以相信的能力。十年前（2013），正是他和Alex与导师Hinton一起提出了AlexNet，开启了CV乃至深度学习蓬勃发展的十年，而这次GPT则是拉开了可能改变人类命运的AGI的序幕。GPT和AlexNet都是基于GPU，只是规模上要大的多的多。下图摄于2013年，从左到右依次为Ilya Sutskever，Alex Krizhevsky和Hinton。对了，Hinton昨天刚从Google离职，不论表面是什么原因，那个原因可能也是事实，但可能也有其他不太方便说的原因，比如学术研究的方向与商业化目标的不一致等。

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_4974b63e765b.jpg)

https://www.wired.com//google-hinton/**GPT与BERT**

如果说GPT的本质的文字接龙，那么BERT就是完形填空。GPT使用左侧的词预测最右边的词，而BERT则是随机的盖(Mask)住一个句子中的某个词，利用其左右两侧的词来预测被盖住的词。GPT个BERT中的T都都是Transformer，而BERT的B是Bidirectional双向。

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_f0010cb77000.jpg)

BERT在NLP领域的绝大成功在于其采用的自监督的Pretrain+针对具体任务fine-tune模式，从今天的模型规模看，事后诸葛大概可以认为是小学毕业(Pretrain)后就分专业了；GPT则是大学毕业前什么都学的通才教育，因为学生所学到的物理知识可能会有助于理解化学，后期的微调通过Prompt的Few-shot（and/or Instrunction tune）来实现，实验表明，不进行微调而直接进行的zero-shot learning已经达到/接近fine-tune的效果。要知道，fine-tune需要的标签数据通常需要人工打标签，相对标签成本为0的自监督而言，fine-tune的成本高，数量少。

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_24fd81def788.jpg)

结论：基于大量高质量数据的自监督学习可获得相当于监督学习fine tune的效果，但泛化能力更强，因为fine tune已经是针对某一具体任务进行的，是流水线的最后一个环节，不再具有进一步的泛化能力。

下篇将分析SAM的工作原理，以及与GPT相同的逻辑--在本科毕业前不分专业。

**参考文献：**

Segment Anything
