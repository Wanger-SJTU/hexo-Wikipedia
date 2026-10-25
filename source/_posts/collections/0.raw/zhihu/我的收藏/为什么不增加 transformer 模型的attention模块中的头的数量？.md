---
title: "为什么不增加 transformer 模型的attention模块中的头的数量？"
date: 2024-11-12
tags: [知乎]
source: https://www.zhihu.com/question/3366352749/answer/28960384806

---

根据Johnson-Lindenstrauss引理，head size不能太小，否则会表示不足。一般不应低于64。

同时，模型维度d应正比于logL，L是序列长度，对于长上下文模型，head size还应该更大点。

这样就给num_head设置了上限了，现在主流模型的head size都在64-128之间，没办法进一步增加头的数量。