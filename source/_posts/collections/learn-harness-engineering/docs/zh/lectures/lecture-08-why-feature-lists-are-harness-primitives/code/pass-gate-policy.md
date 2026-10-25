---
title: "通过门控策略"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/zh/lectures/lecture-08-why-feature-lists-are-harness-primitives/code/pass-gate-policy/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# 通过门控策略

一个功能只有在满足以下条件时，才能从 `passes: false` 变为 `passes: true`：

- 预期的工作流已被执行
- 成功的证据已被记录
- 被测试的路径中不存在阻塞性错误
- 实现不会使应用处于损坏或模糊的状态
