---
title: "仕様不足のタスク例"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/ja/lectures/lecture-01-why-capable-agents-still-fail/code/underspecified-task/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# 仕様不足のタスク例

AI 質問応答機能付きのデスクトップナレッジベースアプリを構築する。

制約：

- 何も指定されていない
- 起動コマンドが与えられていない
- フォルダー構造のガイダンスがない
- データモデルが定義されていない
- 明示的な完了基準がない

この種のプロンプトの典型的な結果：

- エージェントがアドホックに構造をでっち上げる
- アプリはコンパイルできるが一貫して起動できない
- 利用可能なインポート/クエリパスが存在する前に UI が表示される
- エージェントは表面的な成功の後に停止することが多い
