---
title: "如何评价 LLM Cannot Self-Correct Reasoning Yet？"
date: 2024-12-02
tags: [知乎]
source: https://www.zhihu.com/question/625455785/answer/45691785285

---

补充：

近期deepseek爆火后，再次感觉到了类o1/R1模型，应该和这些self-correct的工作有很大关联。

学术界做的这些&#34;input->output1&#34;, &#34;output1->feedback&#34;, &#34;input+feedback->output2&#34;的工作，在o1/R1上体现为&#34;input->feedback/reasoning->output2&#34;，即“**内化了self-correct的能力**”。所以说，学术界做的这些工作还是对工业界的开发有一定启发/助力作用的（例如feedback/reasoning的设计）。

对于这个问题，推荐一篇文章：

![](https://picx.zhimg.com/v2-4a9d05a6ffe3f135fba4053eb42a2b0f_r.jpg?source=2c26e567)[When Can LLMs Actually Correct Their Own Mistakes? A Critical Survey of Self-Correction of LLMs](https://link.zhihu.com/?target=https%3A//aclanthology.org/2024.tacl-1.78/)总的来说，我很赞成这篇文章得到的结论：

1）完全基于自身的self-correction是几乎不可行的

2）借助reliable的external feedback的correction是完全可行，且promising的（但应该不能称为self-correction了）；

当然，“完全基于自身的self-correction”也不是没可能，如果能通过large-scale post-training来改善self-correction的能力应该也可能可以？（o1的内部思考就可能有不断的自我迭代修正检查的过程）

另外，补充推荐一篇也是做correction的综述（training-time、inference-time、post-inference time）：

![](https://picx.zhimg.com/v2-449964b5e8c3d0b5f3de981f25949bb4_r.jpg?source=2c26e567)[https://aclanthology.org/2024.tacl-1.27/](https://link.zhihu.com/?target=https%3A//aclanthology.org/2024.tacl-1.27/)有一篇刚中AAAI25的工作也是在探讨大模型correction的策略（做的还是信息抽取任务这个可能大家都不太关注的任务，不过不用太关注任务是什么 ）：

[卡里奇：【AAAI 2025 Oral】基于上下文示例的迭代反馈与修正方法探究](https://zhuanlan.zhihu.com/p/12000560714)