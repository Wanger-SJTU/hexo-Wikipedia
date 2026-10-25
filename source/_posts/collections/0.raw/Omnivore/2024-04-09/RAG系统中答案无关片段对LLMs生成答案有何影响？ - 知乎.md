---
title: RAG系统中答案无关片段对LLMs生成答案有何影响？ - 知乎
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-04-09/RAG系统中答案无关片段对LLMs生成答案有何影响-知乎/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: b134d624-faf8-49d8-920b-cf90c8bd40fd
---

# RAG系统中答案无关片段对LLMs生成答案有何影响？ - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/rag-ll-ms-18ec2d54615)
[Read Original](https://zhuanlan.zhihu.com/p/691370554)



[![刘聪NLP](https://proxy-prod.omnivore-image-cache.app/0x0,sLJd3Gwv4DBhbx59fuqDyhmcG09ylsrnzGDVZeZBD4jk/https://pic1.zhimg.com/v2-53ee42573c43af1ebc16953b5dbd8768_l.jpg?source=172ae18b)](https://www.zhihu.com/people/LiuCongNLP)

[刘聪NLP](https://www.zhihu.com/people/LiuCongNLP)

[​](https://www.zhihu.com/question/48510028)​![](https://proxy-prod.omnivore-image-cache.app/0x0,sKBtfFYtK0ROqGdvN0zCp5BhZ6pS4CW6jvNAosyO8byE/https://pica.zhimg.com/v2-4812630bc27d642f7cafcd6cdeca3d7a.jpg?source=88ceefae)

云问科技 算法工程师

​关注他

18 人赞同了该文章

## 写在前面

大家好，我是刘聪NLP。

RAG（检索增强生成）通过检索系统找到用户问题相关的信息片段，利用大模型综合生成一个答案，极大解决了大模型幻觉、信息更新不及时等问题，已经成为了大模型落地的重要手段。

但在检索过程中，往往会检索到与问题极度相似、但又不包含答案或包含干扰答案的片段，这些答案无关片段对大模型生成答案有何影响呢？

今天正好刷到一篇相关文章，带给大家《How Easily do Irrelevant Inputs Skew the Responses of Large Language Models?》

```groovy
Paper: https://arxiv.org/abs/2404.03302
Github: https://github.com/Di-viner/LLM-Robustness-to-Irrelevant-Information
```

![](https://proxy-prod.omnivore-image-cache.app/1276x564,sS6U6FuWEIimmg5DoK8qs_jvRrqzLZnSKC9d3JX426vI/https://pic1.zhimg.com/v2-511d07418605adc6d4446966d4a88e68_b.jpg)

先放相关结论，后面补充相关细节。

```text
* 与常见语义无关的答案无关片段相比，LLMs更容易受到高度语义相关的答案无关片段的影响；
* 随着答案无关片段的增加，LLMs更容易分心，识别正确信息的能力降低；
* LLMs对答案无关片段的的识别能力随着问题格式的不同有所不同，自由式问答>是非性问答>多项选择式问答；
* 系统提示词中增加“忽略无关片段”等相关内容，对LLMs的识别能力有提升，但较小；
* 存在高度语义相关的答案无关片段时，COT或者ICL会导致LLMs过度思考，识别能力变差。
```


## 数据&片段构造

将答案无关片段，分成三类：

```text
* 无关：与问题主题无关但相似性得分高的段落
* 部分相关：不仅在相似性度量上得分高，而且与问题的主题部分内容重叠
* 相关：不仅在相似性度量上得分高，而且与问题的主题内容重叠，但不包含正确答案。
```


![](https://proxy-prod.omnivore-image-cache.app/627x399,s_weMEYEfcl9d-5QnIK8E_BK4KCRFwyZIH_jsFVhRmEs/https://pic4.zhimg.com/v2-2b9514e4018ba877cb4f8c3e6270b53b_b.jpg)

数据构造：

```text
* 无关：通过检索器直接检索Top10的段落；
* 部分相关：从检索Top10的段落中选择一个包含subj，但缺少obj的段落，作为前半段；然后找到一个包含错误答案obj'的片段作为后半段；
* 相关：与“部分相关”相比，“相关”片段与问题高度语义相关，但并不包含正确答案，主要涉及系误导性联类型、共同特征类型和虚构轶事类型。
```


相关样例如下图所示， 

![](https://proxy-prod.omnivore-image-cache.app/1230x874,siDIhA6lSvK5t5QTgi9IsejrcV9d7P_rwaU0xpau_Ipo/https://pic3.zhimg.com/v2-147eb5c3df313cb0d382980dd83c1f62_b.jpg)

通过Contriever model计算不同片段相似度得分，相关和部分相关与问题的相似度甚至比真实片段更高，说明数据构造有效。

![](https://proxy-prod.omnivore-image-cache.app/1290x687,sl1JxHGfWcpi1PMO3Q7u2YXHzCwl7xSYcmXogd21xQpA/https://pic3.zhimg.com/v2-605400946035a6f7977ccc00393e5672_b.jpg)

评价指标：

```text
* 误表述比率（Misrepresentation Ratio，MR）：LLMs因受到答案无关信息影响而改变正确回答内容的比例，用于衡量LLMs被无关信息误导的倾向；
* 不确定比率（Uncertainty Ratio，UR）：LLMs因受到答案无关信息影响而在回答中表述“不确定”的比例，用于衡量LLMs对干扰后生成答案的信心程度。
```


为了方便评测，采用多项选择题的形式进行LLMs评估，将“正确答案”、“错误答案”以及“不确定”作为选择供LLMs选择。

![](https://proxy-prod.omnivore-image-cache.app/1231x591,shdSSblVVOsPAOPmNbvJyWJI7CAbdDGzWykOiScxjv_w/https://pic2.zhimg.com/v2-d73b0a8503bec801056c5ca96a515f01_b.jpg)

## 结论实验

评估了LLMs在面对三个不同语义相关性级别的答案无关片段时的表现，如下表所示，随着片段的相关性增高，不同模型的效果均有所下降，对于干扰后生成的答案的信心更足。<strong>闭源模型的效果远好于开源模型</strong>。

![](https://proxy-prod.omnivore-image-cache.app/1246x454,stRBdNFW2_WG9xshVnAeCELVIjgkUydW3YtkRvcBLabo/https://pic4.zhimg.com/v2-5573254c06833b6763cb69c747d59a5f_b.jpg)

PS：开源模型只做了Llama2-7B，感觉应该补充补充\~

随着片段个数的不断增加，LLMs分心更严重，如下表所示，随着答案无关片段的数据增加，更愿意选择无关答案。

![](https://proxy-prod.omnivore-image-cache.app/628x607,siqib2PR351MO7O7O5_wAs5K_mT5JH2p7dmuGunbz8Yw/https://pic2.zhimg.com/v2-80a4f32daad39454539910cd299ef6a9_b.jpg)

为了方便评估，选择多项选择的形式来对LLMs进行分析。但其他形式的问法表现如何？如下表所示，自由问答形式的问题受答案无关片段影响最小、其次是是否类型，影响最大的是多项选择式问题。

![](https://proxy-prod.omnivore-image-cache.app/616x588,sqJkCa1_YqeQHI9_Nh8u2LCQtLlnyL173hZGWblJD_0I/https://pic1.zhimg.com/v2-8a6ceff0554613c93e0dbb949cf96d88_b.jpg)

PS：对于自由式问题由于没有约束，答案较为散乱，不易评估，由采用了GPT3.5进行了答案对齐操作，人工抽检300条，准确率在97%，认为可靠。

忽略式Prompt对结果有微弱的改善，COT、忽略式Prompt+ICL对结果有害，效果变得更差。

![](https://proxy-prod.omnivore-image-cache.app/1279x559,sVN_HBtJ_hpNig8kLjbvkN9d6aSewO-zYUtCxBHEcbY0/https://pic1.zhimg.com/v2-0d51f538040cb3b64c528d8ada750050_b.jpg)

## 写在最后

一个蛮有趣的实验报告，探索检索片段对RAG系统带来的额外影响。

---

欢迎多多关注公众号「NLP工作站」，[加入交流群](https://mp.weixin.qq.com/s/oqJZsxHgs6qDuYHQB6KyJA)，交个朋友吧，一起学习，一起进步！

我们的口号是“生命不止，学习不停”！

<strong>往期回顾</strong>

[刘聪NLP：Qwen1.5开源32B模型-将开源进行到底](https://zhuanlan.zhihu.com/p/690973779)

[刘聪NLP：InternLM2技术报告](https://zhuanlan.zhihu.com/p/690251291)

[刘聪NLP：Qwen1.5-MoE模型：2.7B的激活参数量达到7B模型的性能](https://zhuanlan.zhihu.com/p/689637785)

[刘聪NLP：自我蒸馏方法-减轻大模型微调过程中的灾难性遗忘](https://zhuanlan.zhihu.com/p/686515415)

[刘聪NLP：Yi技术报告细节分享](https://zhuanlan.zhihu.com/p/686042639)  
[刘聪NLP：大模型增量预训练新技巧-防止模型灾难性遗忘](https://zhuanlan.zhihu.com/p/679354000)  
[刘聪NLP：如何提高LLMs的文本表征(Text Embedding)能力?](https://zhuanlan.zhihu.com/p/676589001)  
[刘聪NLP：DEITA-大模型指令微调的数据高效筛选方法](https://zhuanlan.zhihu.com/p/675928711)  
[刘聪NLP：1-2B参数规模大模型使用心得及模型汇总](https://zhuanlan.zhihu.com/p/673405755)  
[刘聪NLP：大模型微调技巧 | 高质量指令数据筛选方法-MoDS](https://zhuanlan.zhihu.com/p/671183709)  
[刘聪NLP：大模型下载使我痛苦](https://zhuanlan.zhihu.com/p/662947944)  
[刘聪NLP：大模型微调技巧-在Embedding上加入噪音提高指令微调效果](https://zhuanlan.zhihu.com/p/662024086)  
[刘聪NLP：通义千问-Qwen技术报告细节分享](https://zhuanlan.zhihu.com/p/658392609)  
[刘聪NLP：如何从数据集中自动识别高质量的指令数据-IFD指标的使用](https://zhuanlan.zhihu.com/p/658128530)  
[刘聪NLP：BaiChuan2技术报告细节分享&个人想法](https://zhuanlan.zhihu.com/p/656570703)  
[刘聪NLP：领域大模型-训练Trick&落地思考](https://zhuanlan.zhihu.com/p/648798461)  
[刘聪NLP：千Star-大模型LLM微调项目-更新](https://zhuanlan.zhihu.com/p/648327222)  
[刘聪NLP：Llama2技术细节&开源影响](https://zhuanlan.zhihu.com/p/644671690)  
[刘聪NLP：垂直领域大模型的一些思考及开源模型汇总](https://zhuanlan.zhihu.com/p/642611747)  
[刘聪NLP：如何评估大模型-LLMs的好坏？](https://zhuanlan.zhihu.com/p/642117003)  
[刘聪NLP：大模型流水线并行（Pipeline）实战](https://zhuanlan.zhihu.com/p/636488690)  
[刘聪NLP：支持多模态的ChatGLM模型-VisualGLM-6B](https://zhuanlan.zhihu.com/p/630265131)  
[刘聪NLP：大模型时代-不进则退](https://zhuanlan.zhihu.com/p/625934485)  
[刘聪NLP：大模型LLM-微调经验分享&总结](https://zhuanlan.zhihu.com/p/620885226)  
[刘聪NLP：ChatGPT-所见、所闻、所感](https://zhuanlan.zhihu.com/p/605331104)  
[刘聪NLP：ACL2022 | DCSR：一种面向开放域段落检索的句子感知的对比学习方法](https://zhuanlan.zhihu.com/p/527366495)  
[刘聪NLP：ACL2022 | NoisyTune：微调前加入少量噪音可能会有意想不到的效果](https://zhuanlan.zhihu.com/p/523865674)  
[刘聪NLP：总结|Prompt在NER场景的应用](https://zhuanlan.zhihu.com/p/518146549)  
[刘聪NLP：PERT：一种基于乱序语言模型的预训练模型](https://zhuanlan.zhihu.com/p/509647368)  
[刘聪NLP：常用预训练语言模型（PTMs）总结](https://zhuanlan.zhihu.com/p/406512290)

[检索增强生成](https://www.zhihu.com/topic/28779274)

[大模型检索增强生成](https://www.zhihu.com/topic/29352993)

[LLM（大型语言模型）](https://www.zhihu.com/topic/26797383)

​赞同 18​​添加评论

​分享

​喜欢​收藏​申请转载

​

赞同 18

​

分享

