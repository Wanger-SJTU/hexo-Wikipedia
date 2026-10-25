---
title: (2 条消息) 2024年MLSys推荐关注列表 - 算法篇
date: "2025-01-05 00:00:00"
updated: "2025-01-05 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/2024年MLSys推荐关注列表-算法篇/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/13960662604
---


年底了，推荐一手**我自己**MLSys推荐关注的列表，有老师，有业界，有很优秀的同龄人或者PhD，如有遗漏，还望多多海涵，可以在评论区提醒我一下~

出于隐私因素，列表中的朋友如果不想被我推荐，或者觉得我哪里写错了，私信告诉我一下即可，我会删掉，还望海涵~

（P：欢迎自荐或者推荐哈哈哈！）

**系统篇可见：**

[](https://zhuanlan.zhihu.com/p/13621083399)

一边跑实验，一边顺带今天把算法篇给更了，算法这块，大体是学术界这边为主，代表性的有Hazy Research（Christopher Ré组）、Beidi Chen组、 Atlas Wang组、Song Han组（以及名下学生组）、Celine Lin组（侧重各种模态的Efficiency）、Tri Dao哥（Flash Attention)、Tim Dettmers哥(QLoRA & LLM.int8())等，我在下文简单介绍一下，相对系统来说，可能数量会少一点，如果没有知乎号，我会提供导向个人/Lab的Blog链接。

### 算 法 篇

- sonta：小迷弟肯定把Sonta小姐姐放第一个，主要做Linear Attention，GLA/GSA/DeltaNet/HGRN2作者，如果想入坑Linear Attn可以看小姐姐知乎/博客，MIT PhD。
写到这里分享下自己最近在看的Linear Attention资源：

- [https://sustcsonglin.github.io/assets/pdf/talk_240425.pdf](https://link.zhihu.com/?target=https%3A//sustcsonglin.github.io/assets/pdf/talk_240425.pdf)
- [https://github.com/lcy-seso/Tiled-EfficientAttention/blob/master/gla/README.pdf](https://link.zhihu.com/?target=https%3A//github.com/lcy-seso/Tiled-EfficientAttention/blob/master/gla/README.pdf)
- [GitHub - sustcsonglin/flash-linear-attention: Efficient implementations of state-of-the-art linear attention models in Pytorch and Triton](https://link.zhihu.com/?target=https%3A//github.com/sustcsonglin/flash-linear-attention)
2. yzhangcs：Linear Attention too, GSA/FLA库作者，苏州大学PhD。

3. 苏剑林：也算成MLSys这一块吧，RoPE伟大，无需多言，[科学空间](https://link.zhihu.com/?target=https%3A//spaces.ac.cn/me.html)质量非常高，期期必看，ML专家。

4. 朱小霖：Ring Flash Attention仓库作者，同时也做训练框架，知乎文章质量非常高。

5. Tri Dao ([主页](https://link.zhihu.com/?target=https%3A//tridao.me/blog/))：Flash Attention-1, 2, 3 & Mamba作者，无需多言，Princeton AP & Together.ai。

6. Albert Gu（[主页](https://link.zhihu.com/?target=https%3A//goombalab.github.io/blog/index.html)）：Mamba & Hydra作者，无需多言，CMU AP & Cartesia.ai。

7. [Weilin Zhao](https://link.zhihu.com/?target=https%3A//brawny-college-5b2.notion.site/Weilin-Zhao-11d20b7deb8280388213d5f5ed072992)：给ex-Mentor推一个，Ouroboros/CA-LoRA/Seq1F1B/BMTrain/作者，THUNLP PhD。

7.5. [SageAttention2](https://link.zhihu.com/?target=https%3A//github.com/thu-ml/SageAttention)：Work很Nice，但作者们不怎么写东西，开一个7.5，THU-ML组。

8. Song Han（[主页](https://link.zhihu.com/?target=https%3A//hanlab.mit.edu/blog)）：AWQ/SVDQuant/EfficientViT/QServe/DuoAttention/StreamingLLM等作者（导师），量化/推理方面的专家，手下学生如Ligeng Zhu/Zhijian Liu/Hanrui Wang同样水平非常高，MIT AP。

9. Hazy Research/Christopher Ré ([主页](https://link.zhihu.com/?target=https%3A//hazyresearch.stanford.edu/blog))：NLP/MLSys，工作比较杂，Tri Dao/Beidi（PostDoc）/Dan Fu导师，很多有趣的Efficiency Work，Stanford Professor。

10. Sasha Rush ([主页](https://link.zhihu.com/?target=https%3A//www.youtube.com/%40srush_nlp))：NLP/MLSys，工作比较杂，但做一些很有趣的Efficiency Work，Cornell Professor。

11. Atlas Wang（[主页](https://link.zhihu.com/?target=https%3A//vita-group.github.io/)）：GaLore作者（导师），产量巨高，UTA AP。

12. Beidi Chen（[主页](https://link.zhihu.com/?target=https%3A//keroro824.github.io/lab-page/)）：ShadowKV/MagicPig/H2O/Deja Vu作者，量化/推理都做，高产，CMU AP。

13. Celine Lin（[主页](https://link.zhihu.com/?target=https%3A//eiclab.scs.gatech.edu/pages/publication.html)）：各种各样的Efficiency，软硬件都做，Gatech AP。

14. Tim Dettmers（[主页](https://link.zhihu.com/?target=https%3A//timdettmers.com/about/)）：LoRA & LLM.int8()作者，量化滴神（但似乎跑去做Agentic AI了），UW PhD，Incoming CMU AP。

15. Hao Zhang（[主页](https://link.zhihu.com/?target=https%3A//cseweb.ucsd.edu/~haozhang/)）：OSD等工作作者，UCSD AP。

15.5 DeepSeek MLA：MLA今年表现亮眼。

16. Lin Zhang：NLP/MLsys：系统/算法都有很多很好的文章。

17. CS二猹树：LLM压缩 & 量化，HKUST PostDoc。

18. pprp：LLM压缩 & 量化，可以多看大佬xhs。

19. 水木皇工仔：LLM量化，也做系统，incoming爱丁堡PhD。

20. pika-jy：[pika-jy：DeepSeek-V2 MLA KV Cache 真的省了吗？](https://zhuanlan.zhihu.com/p/714761319)非常Nice。

21. LiteAI：量化LLM & 端侧部署，华为。

22. [Amir Gholami](https://link.zhihu.com/?target=https%3A//amirgholami.org/)：Squeezed Attention作者（导师），算法 & 系统都做，UCB Research Scientist。

23. 王鸿钰: BitNet系列作者。

24. [Zirui's Homepage](https://link.zhihu.com/?target=https%3A//zirui-ray-liu.github.io/)：导儿，KIVI作者，2bit量化，UMN AP（欢迎报UMN PhD）。

感觉这一篇文章语言不是特别凝练，我自己其实是不太满意的，但意思差不多到这了，还望海涵。

总体来说，你可以注意到学界更偏向做算法层面的工作，为什么呢？（没钱www），还有一个规律，做算法的总是和训练相绑定，而做系统的总是和推理相绑定。

总而言之，希望这篇回答对你有用，预祝各位圣诞节和新年快乐！