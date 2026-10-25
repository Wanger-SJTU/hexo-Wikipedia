---
title: 提示詞校準
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/zh-TW/resources/reference/prompt-calibration/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# 提示詞校準

根指令應該定義操作框架，不應把每一個可能動作都寫死。

## 應保留在根檔案的內容

- 儲存庫用途與範圍
- 啟動路徑
- 驗證路徑
- 不可協商的約束
- 必要的狀態工件
- 工作階段結束規則

## 應移出根檔案的內容

- 冗長的歷史邊角案例
- 特定主題的實作細節
- 更適合放在程式碼附近的局部架構筆記
- 只適用於單一子系統的範例

## 工作規則

根檔案應幫助新的工作階段快速定位方向。如果它開始變成蒐集過去所有失敗案例的地方，就把細節拆到更小的文件，再從根檔案連過去。
