---
title: Harness コンポーネントの例
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/ja/lectures/lecture-02-what-a-harness-actually-is/code/harness-components/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Harness コンポーネントの例

ローカルリポジトリで作業するコーディングエージェントの場合：

- モデル：
  LLM 自体

- Harness：
  - システムプロンプト
  - AGENTS.md
  - bash ツール
  - ファイル読み書きツール
  - git アクセス
  - ローカルファイルシステム
  - 起動スクリプト
  - テストコマンド
  - 停止フック
  - lint チェック
  - 評価ループ（evaluator loop）

上記の harness 構成要素のいずれかを変更すると、実質的なエージェントが変わります。
