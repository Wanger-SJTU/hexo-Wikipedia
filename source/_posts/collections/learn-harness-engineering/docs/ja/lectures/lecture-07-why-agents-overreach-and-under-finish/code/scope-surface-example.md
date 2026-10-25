---
title: "スコープ面の例"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/ja/lectures/lecture-07-why-agents-overreach-and-under-finish/code/scope-surface-example/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# スコープ面の例

タスク：

- Electron ナレッジアプリにインデックス機能を追加

悪いスコープ：

- 「インデックス機能を実装」

より良いスコープ：

- インポートされたドキュメントを解析する
- ドキュメントをチャンクに分割する
- チャンクメタデータを永続化する
- UI にインデックス状況を表示する
- 再インデックスアクションを追加する
