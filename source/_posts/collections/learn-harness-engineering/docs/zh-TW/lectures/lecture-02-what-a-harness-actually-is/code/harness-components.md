---
title: Harness 元件範例
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/zh-TW/lectures/lecture-02-what-a-harness-actually-is/code/harness-components/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Harness 元件範例

對於在本機 repo 中工作的程式碼 Agent：

- 模型：
  LLM 本身

- Harness：
  - system prompt
  - AGENTS.md
  - bash 工具
  - 檔案讀取/寫入工具
  - git 存取
  - 本機檔案系統
  - 啟動腳本
  - 測試指令
  - 停止鉤子
  - lint 檢查
  - 評估迴圈

如果你更改上述任何一個 harness 元件，你就改變了有效的 Agent。
