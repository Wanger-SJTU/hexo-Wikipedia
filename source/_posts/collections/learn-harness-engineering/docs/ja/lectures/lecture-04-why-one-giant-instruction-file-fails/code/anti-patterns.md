---
title: 指示ファイルのアンチパターン
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/ja/lectures/lecture-04-why-one-giant-instruction-file-fails/code/anti-patterns/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# 指示ファイルのアンチパターン

- リポジトリのすべての知識を 1 つのファイルに詰め込む
- 同じルールを複数の場所で繰り返す
- 誰も監査しない古いルールを残す
- ほとんど適用されないほど具体的な条件付き指示を書く
- 起動コンテキストに長いツールマニュアルを組み込む
