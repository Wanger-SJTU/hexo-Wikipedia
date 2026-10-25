---
title: "パスゲートポリシー"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/ja/lectures/lecture-08-why-feature-lists-are-harness-primitives/code/pass-gate-policy/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# パスゲートポリシー

機能は以下の条件をすべて満たした場合にのみ `passes: false` から `passes: true` に移行できる：

- 期待されるワークフローが実行されている
- 成功の証拠が記録されている
- テスト済みパスにブロッキングエラーが存在しない
- 実装がアプリを壊れたまたは曖昧な状態にしていない
