---
title: 规格不足的任务示例
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/zh/lectures/lecture-01-why-capable-agents-still-fail/code/underspecified-task/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# 规格不足的任务示例

构建一个带有 AI 问答功能的桌面知识库应用。

约束条件：

- 未指定任何约束
- 未给出启动命令
- 未提供文件夹结构指引
- 未定义数据模型
- 未明确完成标准

这类提示的典型结果：

- Agent 临时编造一个结构
- 应用可能编译通过但无法一致地启动
- UI 可能在没有任何可用的导入/查询路径之前就出现了
- Agent 通常在表面成功后就停止了
