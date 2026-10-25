---
id: f9b8a918-8798-4fbc-aee4-9a3b8489fea4
---

# RAG系统中答案无关片段对LLMs生成结果有何影响？ - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/rag-ll-ms-18ec5b472c7)
[Read Original](https://www.zhihu.com/question/652266972/answer/3460316448)

## Highlights

> 现阶段使用RAG, 本质上是希望提供事实信息的同时, 提升上下文数据信噪比, 理想的情况是查全率和查准率(分别对应recall和precision)都非常高, 即相关信息全部召回, 且不掺杂任何无关信息.
> 当召回信息包含了有害数据, 比较容易猜到, 大概率会影响模型的最终输出.
> 当召回信息中包含了一定的无关数据, 是不是就没有影响呢?
> 这种场景有点类似于, 模型本身还得再做一次海底捞针, 而且大概率是多针(Multi Needle in a Haystack), 随着无关数据的占比越来越高, 模型准确获取多针的能力会持续下降(参见langchain多针测试实验), 从这个角度来说, 即使是无关数据, 也会对模型的性能产生一定影响.
> 此外, 即便是同样的一批无关数据, 它们在上下文中的位置, 也会对模型的最终效果产生影响.
> 综上, 不管是RAG召回的信息, 还是常规的prompt, 掺杂过多的无关信息, 对模型最终效果应该都是不利的. [⤴️](https://omnivore.app/me/rag-ll-ms-18ec5b472c7#8d3c392f-872a-4e0f-a721-1721d82bbd5b)  ^8d3c392f

