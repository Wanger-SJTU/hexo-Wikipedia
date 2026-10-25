---
title: LLM in a Flash
date: "2026-04-11 21:40:18"
updated: "2026-04-11 21:40:18"
layout: post
permalink: /collections/0.raw/随笔/LLM-in-a-Flash/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---


 当设备的DRAM容量不足以容纳整个模型时，如何通过将模型参数存储在闪存（flash memory）中，并在需要时按需加载到DRAM中。LIM引入两种主要技术——“**窗口化**”（windowing）和“**行列打包**”（row-column bundling），以减少从闪存到DRAM的数据传输量，并提高数据读取的连续性和效率。

## LIF Pipeline


## Detail

1. **窗口化（Windowing）**：为了减少数据传输，论文提出了一种窗口化技术。这种方法通过重用之前激活的神经元，减少了加载权重的次数。通过在DRAM中维护一个包含最近几个token的神经元数据的缓存，可以减少对闪存的I/O请求。
	![Pasted image 20240811164414.png](/images/collections/assets/Pasted%2520image%252020240811164414.png)

2. **行列打包（Row-column bundling）**：为了提高从闪存读取数据的效率，论文提出了行列打包技术。这种方法通过将上投影（up-projection）和下投影（down-projection）层的行和列存储在一起，使得可以一次性读取更大的数据块，从而提高了读取的连续性和效率。
	![Pasted image 20240811164944.png](/images/collections/assets/Pasted%2520image%252020240811164944.png)

3. **稀疏性预测**：论文利用了LLMs在前馈网络（FFN）层中的高度稀疏性。通过预测哪些神经元将被激活，只加载这些非零参数，从而减少了需要从闪存传输到DRAM的数据量。
![Pasted image 20240811155242.png](/images/collections/assets/Pasted%2520image%252020240811155242.png)




**附录数据**

| 模型           | window-k size | FFN权重比例               | 加载比例 | Predictor | load lantency |
| ------------ | ------------- | --------------------- | ---- | --------- | ------------- |
| OPT 6.7B     | 4             | 24%(0.24×64.62=15.5%) | 2.4% | 1.25%     |               |
| Falcon 7B    | 4             | 33%                   |      |           |               |
| Persimmon 8B | 4             | 25%                   |      |           |               |
| Phi-2        |               |                       |      |           |               |
| Llama 2      |               |                       |      |           |               |
