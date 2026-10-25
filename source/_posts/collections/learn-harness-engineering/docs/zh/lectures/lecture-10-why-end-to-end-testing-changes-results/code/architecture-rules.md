---
title: "Electron 架构规则"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/zh/lectures/lecture-10-why-end-to-end-testing-changes-results/code/architecture-rules/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Electron 架构规则

- 渲染器代码不能直接访问文件系统。
- 预加载是渲染器与 Electron 主进程之间的唯一桥梁。
- 检索和索引逻辑位于服务模块中，而非 UI 组件中。
- 日志应该是结构化的，并从服务边界发出。
