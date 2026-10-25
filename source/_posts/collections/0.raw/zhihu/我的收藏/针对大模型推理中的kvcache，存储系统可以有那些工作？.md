---
title: "针对大模型推理中的kvcache，存储系统可以有那些工作？"
date: 2026-04-22
tags: [知乎]
source: https://www.zhihu.com/question/1962439455760717679/answer/1975312705071121055
---

SuSun

​ 关注

72 人赞同了该回答

写一遍就知道了哈哈哈。

因为vllm v1 kv connector可以动态载入，建议还是不要用py，因为用py少感受了很多，用c++/c/rust这样，带一个pybind库(pybind11/pyo3)，做cpu kv cache offloading。

写完跑通，和主流offloading方案(vllm自己/lmcache等）进行各种input length, output length=1的对比, req rate=1, 2,4,8也都测一遍。

能跑通，基本上就理解kv cache offloading和p/d分离。

性能能对标，基本上理解了offloading的性能路径。

之后就需要用传统存储的路子审视C++/Rust代码，杂糅着cuda和gpu i/o去思考问题，单机单卡可能优化空间不多。

但是多卡，多实例，p/d，不同的模型，最近的稀疏注意力，kv cache又该是一个什么样的存储系统呢？

阅读全文​
​赞同 72​​21 条评论​92 ​喜欢​分享