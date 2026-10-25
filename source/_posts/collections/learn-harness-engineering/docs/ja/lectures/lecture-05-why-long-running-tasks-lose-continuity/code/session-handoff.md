---
title: "セッションハンドオフの例"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/ja/lectures/lecture-05-why-long-running-tasks-lose-continuity/code/session-handoff/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# セッションハンドオフの例

## 完了

- Markdown インポートサポートを追加
- レンダラーに基本的なドキュメントリストを追加

## 壊れているまたは未検証

- `.md` のインポートは成功するが、大きな `.txt` ファイルで失敗する
- アプリは起動するが、詳細ビューが接続されていない

## 次の最適ステップ

- `.txt` インポートパスを修正
- インポートをエンドツーエンドで検証
- その後、ドキュメント詳細パネルを追加
