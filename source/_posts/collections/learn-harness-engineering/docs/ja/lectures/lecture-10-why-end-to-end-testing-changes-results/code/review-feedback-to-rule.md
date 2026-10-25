---
title: "例：レビューフィードバックをルールに変換"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/ja/lectures/lecture-10-why-end-to-end-testing-changes-results/code/review-feedback-to-rule/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# 例：レビューフィードバックをルールに変換

繰り返しのレビューコメント：

> レンダラーからファイルシステムユーティリティを呼び出さないでください。Preload ブリッジを使用してください。

昇格された harness ルール：

- レンダラーコードでの `fs` 使用を防ぐ lint または import ルールを追加
- Preload 境界を説明する修復テキストを追加
