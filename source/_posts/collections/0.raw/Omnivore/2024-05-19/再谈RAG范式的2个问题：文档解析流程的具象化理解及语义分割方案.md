---
title: "再谈RAG范式的2个问题：文档解析流程的具象化理解及语义分割方案"
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: "post"
permalink: "/collections/0.raw/Omnivore/2024-05-19/再谈RAG范式的2个问题-文档解析流程的具象化理解及语义分割方案/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

---
id: ae58d270-a08f-40fa-9265-1cca07f744bc
---

# 再谈RAG范式的2个问题：文档解析流程的具象化理解及语义分割方案
#Omnivore

[Read on Omnivore](https://omnivore.app/me/https-mp-weixin-qq-com-s-9-f-0-x-x-fs-8-tcwp-rk-htcuf-nw-18f8e657b9c)
[Read Original](https://mp.weixin.qq.com/s/9F0xXFs-8tcwpRKHtcufNw)



![cover_image](https://proxy-prod.omnivore-image-cache.app/0x0,slT5dNWtm98il0VEKUzcB0i-x7993HNOkVKadG5e5pm4/https://mmbiz.qpic.cn/sz_mmbiz_jpg/fUBU1yiaEmJiaO1P5S08qk3tNpGkqchmUL3ibqXC0Dmb09LyHT8Sw7Gox31O6fBM7vicnrMPBibOe8sGicCSGg4vlWCA/0?wx_fmt=jpeg) 

原创  刘焕勇  老刘说NLP _2024-05-08 22:00_ _北京_ 

今天是2024年5月8日，星期三，北京，天气晴。

今天我们来看看2个问题，一个是再看RAG中文档解析流程的具象化理解，理解下文档处理中几个模块的输入输出；另一个是现在的语义分割模型，这种思路很依赖于场景标注数据集。

供大家一起参考并思考。

## 问题1：再看RAG中文档解析流程的具象化理解

《A Method for Parsing and Vectorization of Semi-structuredData used in Retrieval Augmented Generation》（https://arxiv.org/pdf/2405.03989）这个实验报告其中提到的针对半结构化文本的具象化理解，可以看看，加深印象。

<strong>1、整个的实现流程</strong>

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sbfH_PgqAet1ri9NEOMy0jtJN1OO6XQYTQcilqTFRVGY/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJiaO1P5S08qk3tNpGkqchmULBeQRqkHibTJACPdCvHu3eb6QVDeazxSUMHMSLQiavEicdFxoBnwdicqaTg/640?wx_fmt=png&from=appmsg)

在解析过程中，利用目标检测系统detectron2(https://unstructured-io.github.io/unstructured/platform.html)，将`.docx`文件划分为多个元素，包括标题、文本、图像、表格、页眉和页脚。细化过程只保留了四个核心元素：“标题”、“文本”、“图像”和“表格”，对于“Table”元素，核心文本信息保留在元素的“text属性”中。

<strong>2、关于图表部分的处理</strong>

对于“图像”元素，利用“gpt-4-vision-preview”API，生成特定查询，提示GPT提供图像的详细文本描述，取代图像最初占据的位置。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,swtIFFAb0_9KZw0IET0dYPTwn4dRHhbdUD7190EraarA/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJiaO1P5S08qk3tNpGkqchmULzcauEdM2wYEAEbDiaauibtK0qY9Mqf6icj1XwThkLia9lG1KGyIDSCAq0Q/640?wx_fmt=png&from=appmsg)

<strong>3、关于表格部分的处理</strong>

为了表格的格式保真度，存储了其HTML表示，可以具象化如下：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sl5CalpnTIfrtt_eOAPsGR6_LsM5WA5ZLqMrEenF41YY/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJiaO1P5S08qk3tNpGkqchmULWpBWGeS9wcsbfVFlxbKjQAiaSIWKNbPgJ23NVxgO6gYBRVXTaxoHwUA/640?wx_fmt=png&from=appmsg)

<strong>这类数据也可以转成html格式进行渲染</strong>

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,slJDHtDlM0H8gLjxXGiQ4Uc7rBhcE6SeCkzLoMuZZXFA/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJiaO1P5S08qk3tNpGkqchmULovN0SicgIjo059ADDEcoIKicuiayOgdghrUMB3HJEHBlCwScU6RoAwNSA/640?wx_fmt=png&from=appmsg)

实际上，当前的许多工具都已天然支持，例如llama\_parse：https://docs.llamaindex.ai/en/stable/module\_guides/loading/connector/llama\_parse.html，以及ragflow(https://github.com/infiniflow/ragflow.git)

当然，当前也有一些开源工具集合：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,slpC9gv0aaRTomNyo8SP-2yuWU77g7gc2E7_Z5ltJBCE/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJiaO1P5S08qk3tNpGkqchmULphrZhnZTsetjNNeujGKu5jibnica3mWbH6HHL03GtiaT5Cp5gyOnZofFw/640?wx_fmt=png&from=appmsg)

语义分割模型是当前进行chunk以及在缺少段落信息的场景下，我们所需要关注，langchain中内置的一些方案实际上很粗糙暴力切分。我们可以看看这个问题，一个具象化的结果如下：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,spF8ihFow3416zW19E6W0lBcY3-9D1aUbrDQlRGnhgw0/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJiaO1P5S08qk3tNpGkqchmUL5lkTuBxsUm0G8ywVSFDpxw1ibgibdCFpaZKuOjSsIic6hNJA3f3BsZbuQ/640?wx_fmt=png&from=appmsg)

有一些方案，例如，基于Cross Segment Attention的文本分割。例如，工作《Text Segmentation by Cross Segment Attention》(https://aclanthology.org/2020.emnlp-main.380.pdf)中提到了3种方案：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,suu4cmkcRSVAIXMBSex0D3ZSA_tINVgvRO9xPyXcLh_I/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJiaO1P5S08qk3tNpGkqchmULOImssHvH9QVz9a5nyHZUT9NvajJ5P22mcWDNPPW5FGqIDJDsLq5ftg/640?wx_fmt=png&from=appmsg)

在跨段BERT模型（左侧）中，模型提供潜在段落断点周围的局部上下文：左侧k个标记和右侧k个标记。

在BERT+Bi-LSTM模型（中间）中，首先使用BERT模型对每个句子进行编码，然后将句子表示输入到一个Bi-LSTM中。

在分层BERT模型（右侧）中，首先使用BERT对每个句子进行编码，然后将输出的句子表示输入到另一个模型当中。

另外，也有一个开源项目SeqModel模型，用于文本切分，地址：nlp\_bert\_document-segmentation\_chinese-base(https://modelscope.cn/models/damo/nlp\_bert\_document-segmentation\_chinese-base/summary)可以进行调用。

![](https://proxy-prod.omnivore-image-cache.app/0x0,stICKcT1j9p25LpMbXqqM1ybA_Girm42YuhxP9bktRpo/https://mmbiz.qpic.cn/mmbiz_svg/Xewa2JUmZ1o1Yibps1Tia02er09ucbkEA8cukQfRpLqQv0wACHT5wleITrf2o3XlGc5vUQ1ibhLKwiaQ5IvSWp6DpEaPP9aiacJoN/640?wx_fmt=svg&from=appmsg)`from modelscope.outputs import OutputKeys

```python
from modelscope.pipelines import pipeline
from modelscope.utils.constant import Tasks
 p = pipeline(
    task=Tasks.document_segmentation,
    model='damo/nlp_bert_document-segmentation_chinese-base')

 result = p(documents='......')
print(result[OutputKeys.TEXT])
```


当然，效果并不是很好，如下一个badcase:

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,stvfR-fsrl5sesLICIaq5PNdhFfuD-WRNJzezl0EqmXo/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJiaO1P5S08qk3tNpGkqchmULbUZ79yBxJOI8CJ2eGEg89lqiaBgqJpoa987fNjP5wDLTAS47rulPdvg/640?wx_fmt=png&from=appmsg)

## 总结

本文主要谈了2个问题，一个是再看RAG中文档解析流程的具象化理解，一个是RAG中的语义分割方案是什么，后者实际上很依赖标注数据。

## 参考文献

1、https://blog.csdn.net/v\_JULY\_v/article/details/135386202

2、https://arxiv.org/pdf/2405.03989

## 关于我们

老刘，刘焕勇，NLP开源爱好者与践行者，主页：https://liuhuanyong.github.io。

老刘说NLP，将定期发布语言资源、工程实践、技术总结等内容，欢迎关注。

<strong>对于想加入更优质的知识图谱、事件图谱、大模型AIGC实践、相关分享的，可关注公众号，在后台菜单栏中点击会员社区->会员入群加入。</strong>

