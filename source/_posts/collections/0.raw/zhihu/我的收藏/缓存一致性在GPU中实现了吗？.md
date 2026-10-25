---
title: "缓存一致性在GPU中实现了吗？"
date: 2023-10-31
tags: [知乎]
source: https://www.zhihu.com/question/51186122/answer/3271081374

---

L1 是软件管理的一致性。

![](https://picx.zhimg.com/v2-29ce1e815e45220caf699a60bf222115_r.jpg?source=2c26e567)
![](https://picx.zhimg.com/v2-84f686939b10ee7ba5956ad26d25c1c3_r.jpg?source=2c26e567)参考文献：[Instructions for managing a parallel cache hierarchy](https://link.zhihu.com/?target=https%3A//patentimages.storage.googleapis.com/5b/5e/38/9528bb030161bd/US9639479.pdf)对于 A100 来说，L2（两个 partition）是硬件管理的一致性。

![](https://pic1.zhimg.com/v2-4c721bb018918a62ef710204a9170a01_r.jpg?source=2c26e567)参考文献：[NVIDIA Ampere Architecture In-Depth | NVIDIA Technical Blog](https://link.zhihu.com/?target=https%3A//developer.nvidia.com/blog/nvidia-ampere-architecture-in-depth/)
![](https://picx.zhimg.com/v2-ecc370ff7ec7e5c5e0e075215302ed03_r.jpg?source=2c26e567)参考文献：[Dissecting the Ampere GPU Architecture through Microbenchmarking | NVIDIA On-Demand](https://link.zhihu.com/?target=https%3A//www.nvidia.com/en-us/on-demand/session/gtcspring21-s33322/)