---
title: Electron 架構規則
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/zh-TW/lectures/lecture-10-why-end-to-end-testing-changes-results/code/architecture-rules/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Electron 架構規則

- Renderer 程式碼不得直接存取檔案系統。
- Preload 是 renderer 與 Electron main 之間唯一的橋樑。
- 檢索和索引邏輯應存在於服務模組中，而非 UI 元件中。
- 日誌應為結構化格式，並從服務邊界發出。
