---
title: 通過閘門策略
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/zh-TW/lectures/lecture-08-why-feature-lists-are-harness-primitives/code/pass-gate-policy/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# 通過閘門策略

一個功能在以下所有條件滿足後，方可從 `passes: false` 變更為 `passes: true`：

- 預期的工作流程已被執行
- 成功的證據已被記錄
- 已測試的路徑中不存在阻礙性錯誤
- 實作未使應用程式處於損壞或不明確的狀態
