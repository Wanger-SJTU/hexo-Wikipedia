---
title: 範例：將審查回饋轉化為規則
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/zh-TW/lectures/lecture-10-why-end-to-end-testing-changes-results/code/review-feedback-to-rule/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# 範例：將審查回饋轉化為規則

重複的審查意見：

> 不要從 renderer 呼叫檔案系統工具。使用 preload 橋樑。

提升為 harness 規則：

- 新增 lint 或匯入規則以防止在 renderer 程式碼中使用 `fs`
- 新增修復說明文字，解釋 preload 邊界
