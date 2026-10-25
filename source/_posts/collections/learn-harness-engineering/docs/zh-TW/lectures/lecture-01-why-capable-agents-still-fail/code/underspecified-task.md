---
title: "規格不足的任務範例"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/zh-TW/lectures/lecture-01-why-capable-agents-still-fail/code/underspecified-task/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# 規格不足的任務範例

建構一個具備 AI 問答功能的桌面知識庫應用程式。

限制條件：

- 未指定任何限制
- 未提供啟動指令
- 無資料夾結構指引
- 未定義資料模型
- 無明確的完成標準

此類提示的典型結果：

- Agent 會臨時編造架構
- 應用程式可能可以編譯，但無法穩定啟動
- UI 可能會在任何可用的匯入/查詢路徑出現之前就顯示
- Agent 通常會在外觀成功後停止
