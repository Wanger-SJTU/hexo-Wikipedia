---
title: Electron アーキテクチャルール
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/ja/lectures/lecture-10-why-end-to-end-testing-changes-results/code/architecture-rules/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Electron アーキテクチャルール

- レンダラーコードはファイルシステムに直接アクセスしてはならない。
- Preload はレンダラーと Electron main の間の唯一の橋渡しである。
- 検索・インデックスロジックは UI コンポーネントではなくサービスモジュールに配置する。
- ログは構造化され、サービス境界から出力されるべきである。
