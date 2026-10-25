---
title: "失敗訊號檢查清單"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/zh-TW/lectures/lecture-01-why-capable-agents-still-fail/code/failure-signals-checklist/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# 失敗訊號檢查清單

在審查一次較弱的 harness 執行結果時，請使用此清單。

- Agent 是否曾錯誤詢問或錯誤推斷應用程式的啟動方式？
- 它是否建立了與預期產品不符的目錄或抽象？
- 它是否在製作出可見的 UI 外殼後就停止了，而沒有完整的工作流程？
- 它是否留下了有助於後續執行繼續的筆記或產物？
- 一個全新的 session 能否在五分鐘內理解發生了什麼事？
