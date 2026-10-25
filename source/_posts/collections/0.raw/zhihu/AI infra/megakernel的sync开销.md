---
title: "megakernel的sync开销"
date: 2026-06-29
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/2054985214791775283

---

近期AMD的2篇megakernel相关的内容引起了我的注意，都探讨了megakernel里的sync开销。

[https://blog.kog.ai/building-a-single-kernel-latency-optimized-llm-inference-engine-on-amd-mi300x-gpus/](https://link.zhihu.com/?target=https%3A//blog.kog.ai/building-a-single-kernel-latency-optimized-llm-inference-engine-on-amd-mi300x-gpus/)

[Fleet: Hierarchical Task-based Abstraction for Megakernels on Multi-Die GPUs](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2604.15379)

![](https://picx.zhimg.com/v2-97f0a36b7a0f6f74defb06bbeb85bcbb_r.jpg)【kog】

![](https://pica.zhimg.com/v2-ea235c4d7ca1d812cd8af0bf65868764_r.jpg)【fleet】意思是，尽可能在本层级内发生sync，避免全局sync

sync的层级naivehbmkogLLCfleetLLC&L2
![](https://pic4.zhimg.com/v2-20b6aa255b5246e09a15516299762883_r.jpg)【AMD架构】

根据kog的描述，似乎在合适的层级做sync是非常重要的（也是拿L2 hint写的，倒不能硬性控制）。但是我很怀疑。。。因为理论上sync的数据量占比是很小的，sync一个tile大概需要一个fp16，读取的数据量大概是128 * 4+256 * 64个fp16，相比之下，sync几乎不占多少。。

我实测了一下H20上，dpskv3 bs=2 decoding，等待dispatch，等待gemm0等加起来，也只占总时长的2%。。。。

当然也许是AMD那边的baseline故意选的很烂吗。。。还是说AMD的硬件在sync上就是很笨重？