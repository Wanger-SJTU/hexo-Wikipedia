---
title: RAG系统中答案无关片段对LLMs生成结果有何影响？ - 知乎
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-04-10/RAG系统中答案无关片段对LLMs生成结果有何影响-知乎/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: f9b8a918-8798-4fbc-aee4-9a3b8489fea4
---

# RAG系统中答案无关片段对LLMs生成结果有何影响？ - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/rag-ll-ms-18ec5b472c7)
[Read Original](https://www.zhihu.com/question/652266972/answer/3460316448)



关注者

<strong>15</strong>

被浏览

<strong>990</strong>

创建时间：2024-04-08 20:46:28

最后编辑：2024-04-08 20:54:05

[![奔跑的日月](https://proxy-prod.omnivore-image-cache.app/0x0,sOou2FVwPArYSG0uw2ZthdNkXqlmhNxbVHGSMtGCxFg0/https://pic1.zhimg.com/v2-abed1a8c04700ba7d72b45195223e0ff_l.jpg?source=2c26e567)](https://www.zhihu.com/people/mxue)

[奔跑的日月](https://www.zhihu.com/people/mxue)

事已至此，先行吃饭！

​ 关注

谢邀[@刘聪NLP](https://www.zhihu.com/people/LiuCongNLP)

1 人赞同了该回答

[发布于 2024-04-09 23:27](https://www.zhihu.com/question/652266972/answer/3460316448)・IP 属地上海

大概说下个人理解.

==现阶段使用RAG, 本质上是希望提供事实信息的同时, 提升上下文数据信噪比, 理想的情况是查全率和查准率(分别对应recall和precision)都非常高, 即相关信息全部召回, 且不掺杂任何无关信息.==

==当召回信息包含了有害数据, 比较容易猜到, 大概率会影响模型的最终输出.==

==当召回信息中包含了一定的无关数据, 是不是就没有影响呢?==  
==这种场景有点类似于, 模型本身还得再做一次海底捞针, 而且大概率是多针(Multi Needle in a Haystack), 随着无关数据的占比越来越高, 模型准确获取多针的能力会持续下降(参见langchain多针测试实验), 从这个角度来说, 即使是无关数据, 也会对模型的性能产生一定影响.==

==此外, 即便是同样的一批无关数据, 它们在上下文中的位置, 也会对模型的最终效果产生影响.==

==综上, 不管是RAG召回的信息, 还是常规的prompt, 掺杂过多的无关信息, 对模型最终效果应该都是不利的.==

[发布于 2024-04-09 23:27](https://www.zhihu.com/question/652266972/answer/3460316448)・IP 属地上海

​赞同 1​​添加评论​收藏​喜欢

​

[![刘聪NLP](https://proxy-prod.omnivore-image-cache.app/0x0,sQzpcp9Ze-NEhr3vP6zH5rAYs3UghtWDDpEO_f8Shjy0/https://picx.zhimg.com/v2-53ee42573c43af1ebc16953b5dbd8768_l.jpg?source=1def8aca)](https://www.zhihu.com/people/LiuCongNLP)

[刘聪NLP](https://www.zhihu.com/people/LiuCongNLP)

[​](https://www.zhihu.com/question/48510028)​![](https://proxy-prod.omnivore-image-cache.app/0x0,sEQaOWrSM4sYxMszrQ6lhsM51WgM5AvlqxCkeG6GJZz4/https://pic1.zhimg.com/v2-4812630bc27d642f7cafcd6cdeca3d7a.jpg?source=88ceefae)

云问科技 算法工程师

​ 关注

RAG（检索增强生成）通过检索系统找到用户问题相关的信息片段，利用大模型综合生成一个答案，极大解决了大模型幻觉、信息更新不及时等问题，已经成为了大模型落地的重要手段。

但在检索过程中，往往会检索到与问题极度相似、但又不包含答案或包含干扰答案的片段，这些答案无关片段对大模型生成答案有何影响呢？

带给大家一篇相关文章《How Easily do Irrelevant Inputs Skew the Responses of Large Language Models?》

```groovy
Paper: https://arxiv.org/abs/2404.03302
Github: https://github.com/Di-viner/LLM-Robustness-to-Irrelevant-Information
```

![](https://proxy-prod.omnivore-image-cache.app/1276x564,sGqz7izH8r4SMsBTHJXBDmxF57rGYFc7JYZBm8hy_p1w/https://pica.zhimg.com/50/v2-511d07418605adc6d4446966d4a88e68_720w.jpg?source=1def8aca)

先放相关结论，后面补充相关细节。

* 与常见语义无关的答案无关片段相比，LLMs更容易受到高度语义相关的答案无关片段的影响；
* 随着答案无关片段的增加，LLMs更容易分心，识别正确信息的能力降低；
* LLMs对答案无关片段的的识别能力随着问题格式的不同有所不同，自由式问答>是非性问答>多项选择式问答；
* 系统提示词中增加“忽略无关片段”等相关内容，对LLMs的识别能力有提升，但较小；
* 存在高度语义相关的答案无关片段时，COT或者ICL会导致LLMs过度思考，识别能力变差。

## 数据&片段构造

将答案无关片段，分成三类：

* 无关：与问题主题无关但相似性得分高的段落
* 部分相关：不仅在相似性度量上得分高，而且与问题的主题部分内容重叠
* 相关：不仅在相似性度量上得分高，而且与问题的主题内容重叠，但不包含正确答案。

![](https://proxy-prod.omnivore-image-cache.app/627x0,sS7mPnw8ftKb9NzX90bA5Liu3ycJuHC9geYZs-kLqPoY/https://pic1.zhimg.com/50/v2-2b9514e4018ba877cb4f8c3e6270b53b_720w.jpg?source=1def8aca)

数据构造：

* 无关：通过检索器直接检索Top10的段落；
* 部分相关：从检索Top10的段落中选择一个包含subj，但缺少obj的段落，作为前半段；然后找到一个包含错误答案obj'的片段作为后半段；
* 相关：与“部分相关”相比，“相关”片段与问题高度语义相关，但并不包含正确答案，主要涉及系误导性联类型、共同特征类型和虚构轶事类型。

相关样例如下图所示， 

![](https://proxy-prod.omnivore-image-cache.app/1230x0,sloVKxtzEnOIudgzUoA7PfdXR7l3O4d76kA9ecMzXMJ8/https://pic1.zhimg.com/50/v2-147eb5c3df313cb0d382980dd83c1f62_720w.jpg?source=1def8aca)

通过Contriever model计算不同片段相似度得分，相关和部分相关与问题的相似度甚至比真实片段更高，说明数据构造有效。

![](https://proxy-prod.omnivore-image-cache.app/1290x0,sFI_gTyw4w3hpwlDUNTmhfFrHHA4Y5BZIq296rWEeFrM/https://picx.zhimg.com/50/v2-605400946035a6f7977ccc00393e5672_720w.jpg?source=1def8aca)

评价指标：

* 误表述比率（Misrepresentation Ratio，MR）：LLMs因受到答案无关信息影响而改变正确回答内容的比例，用于衡量LLMs被无关信息误导的倾向；
* 不确定比率（Uncertainty Ratio，UR）：LLMs因受到答案无关信息影响而在回答中表述“不确定”的比例，用于衡量LLMs对干扰后生成答案的信心程度。

为了方便评测，采用多项选择题的形式进行LLMs评估，将“正确答案”、“错误答案”以及“不确定”作为选择供LLMs选择。

![](https://proxy-prod.omnivore-image-cache.app/1231x0,sGALcNa-aTSjCJqZ-4g6wOl-x2hn7AnSsm2af8j6mUMQ/https://picx.zhimg.com/50/v2-d73b0a8503bec801056c5ca96a515f01_720w.jpg?source=1def8aca)

## 结论实验

评估了LLMs在面对三个不同语义相关性级别的答案无关片段时的表现，如下表所示，随着片段的相关性增高，不同模型的效果均有所下降，对于干扰后生成的答案的信心更足。<strong>闭源模型的效果远好于开源模型</strong>。

![](https://proxy-prod.omnivore-image-cache.app/1246x0,sfNL7ooY_iYDfqZizOKRZNWFGPfZk6hOkx0V58ldtTYk/https://picx.zhimg.com/50/v2-5573254c06833b6763cb69c747d59a5f_720w.jpg?source=1def8aca)

PS：开源模型只做了Llama2-7B，感觉应该补充补充\~

随着片段个数的不断增加，LLMs分心更严重，如下表所示，随着答案无关片段的数据增加，更愿意选择无关答案。

![](https://proxy-prod.omnivore-image-cache.app/628x0,sYybGvv93TJCHwamandyg9iWSQx7trtYtZ5RbTy5AEsc/https://pic1.zhimg.com/50/v2-80a4f32daad39454539910cd299ef6a9_720w.jpg?source=1def8aca)

为了方便评估，选择多项选择的形式来对LLMs进行分析。但其他形式的问法表现如何？如下表所示，自由问答形式的问题受答案无关片段影响最小、其次是是否类型，影响最大的是多项选择式问题。

![](https://proxy-prod.omnivore-image-cache.app/616x0,s5bKZIw290ScitUmJaRK51ARxDPbJ31tuA5JMWaDvOuA/https://pic1.zhimg.com/50/v2-8a6ceff0554613c93e0dbb949cf96d88_720w.jpg?source=1def8aca)

PS：对于自由式问题由于没有约束，答案较为散乱，不易评估，由采用了GPT3.5进行了答案对齐操作，人工抽检300条，准确率在97%，认为可靠。

忽略式Prompt对结果有微弱的改善，COT、忽略式Prompt+ICL对结果有害，效果变得更差。

![](https://proxy-prod.omnivore-image-cache.app/1279x0,sX_bz8C_vAjEL4i2_zV2rU8-SeuVNCrqvwPr3bxd45oQ/https://picx.zhimg.com/50/v2-0d51f538040cb3b64c528d8ada750050_720w.jpg?source=1def8aca)

## PS：一个蛮有趣的实验报告，探索检索片段对RAG系统带来的额外影响。

展开阅读全文​

​赞同 22​​7 条评论​收藏​喜欢

​

[![Anooyman](https://proxy-prod.omnivore-image-cache.app/0x0,s84c_Kmmq14pmrJeyk-JrIkRw0Oz5AmGRDsdR8wKS2uo/https://picx.zhimg.com/v2-d1de8df2caa3a5b27756158d408d3353_l.jpg?source=1def8aca)](https://www.zhihu.com/people/anooyman)

[Anooyman](https://www.zhihu.com/people/anooyman)

[​](https://www.zhihu.com/question/48510028)

南京理工大学 计算机技术硕士

​ 关注

创作声明：包含 AI 辅助创作

[发布于 2024-04-09 20:53](https://www.zhihu.com/question/652266972/answer/3460166819)

在RAG（Retrieval-Augmented Generation）系统中，答案无关片段指的是那些与最终生成答案没有直接关联或者不提供必要信息的文本片段。这些片段可能会对LLMs（Large Language Models）的生成结果产生不利影响。

首先，答案无关片段可能会分散LLMs的注意力，导致模型无法集中于生成与问题直接相关的信息。由于LLMs在生成答案时会考虑所有提供的上下文信息，这些无关片段可能会引入噪声，使得模型难以识别和提取出真正有用的信息。

其次，答案无关片段可能会影响生成答案的准确性和相关性。如果无关片段中包含误导性的信息或者与问题主题相矛盾的信息，LLMs在生成答案时可能会受到这些信息的影响，从而产生不准确或者不相关的答案。

此外，答案无关片段还可能影响RAG系统的整体性能。在进行文档检索时，如果检索到的文档中包含大量无关片段，可能会降低检索效率和准确性，从而影响整个RAG系统的输出质量。

综上所述，答案无关片段对LLMs在RAG系统中生成结果的影响主要表现为干扰模型的注意力、降低答案的准确性和相关性，以及影响系统性能。因此，在设计和优化RAG系统时，应尽量减少答案无关片段的影响，以提高生成答案的质量和系统的整体效能。

[发布于 2024-04-09 20:53](https://www.zhihu.com/question/652266972/answer/3460166819)

​赞同 1​​添加评论​收藏​喜欢

​

