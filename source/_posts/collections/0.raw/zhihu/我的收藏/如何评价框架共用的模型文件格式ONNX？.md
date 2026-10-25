---
title: 如何评价框架共用的模型文件格式ONNX？
date: "2023-02-06 00:00:00"
updated: "2023-02-06 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/如何评价框架共用的模型文件格式ONNX/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/65050141/answer/2879112334
---


欢迎加入 ONNX QQ 群 1021964010！入群密码 nndab。也可加我的微信 daquexian 拉入微信群（备注 “ONNX 微信群”）

最近（12 月 8 号）在 OpenMMLab 社区开放麦做了一次分享，介绍了 ONNX 最近几个版本中的一些新特性，如

- ONNX Parser，作用是用文本格式构造 ONNX 图，和`helper.make_node` 说再见
- Function OP，也就是 ONNX 中的多级表示，推广开之后可大大降低后端适配 ONNX 的工作量
- Reference Runtime，ONNX 自带的后端，只依赖 Python 和 NumPy，可用于简单的调试和验证和 ONNX 生态中的一些周边工具，如

- [onnxsim](https://link.zhihu.com/?target=https%3A//github.com/daquexian/onnx-simplifier)，自动简化 ONNX 模型，应该是大家都很熟悉的工具了
- [onnx-graphsurgeon](https://link.zhihu.com/?target=https%3A//github.com/NVIDIA/TensorRT/tree/master/tools/onnx-graphsurgeon)，手动修改 ONNX 模型
- [onnx-modifier](https://link.zhihu.com/?target=https%3A//github.com/ZhangGe6/onnx-modifier)，可视化地修改 ONNX 模型
- [PPQ](https://link.zhihu.com/?target=https%3A//github.com/openppl-public/ppq)，支持 ONNX 模型的量化工具
- [convertmodel.com](https://link.zhihu.com/?target=http%3A//convertmodel.com)，基于 WASM 在浏览器内将 ONNX 模型转为 NCNN/TNN/... 等具体可看社区开放麦的 PPT 和视频：

PPT：[ONNX 新特性和最佳实践介绍](https://link.zhihu.com/?target=https%3A//github.com/daquexian/docs/files/10659674/ONNX-new-feats-and-best-practices-daquexian.pptx)

B 站视频：[社区开放麦#32 | ONNX 新特性和最佳实践介绍_哔哩哔哩_bilibili](https://link.zhihu.com/?target=https%3A//www.bilibili.com/video/BV1LG411K7ah/)