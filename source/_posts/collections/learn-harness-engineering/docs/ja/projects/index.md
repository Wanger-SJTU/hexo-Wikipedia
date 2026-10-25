---
title: プロジェクトへようこそ
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/ja/projects/index/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# プロジェクトへようこそ

ここは Learn Harness Engineering の実践セクションです。講義を読むだけでは不十分です。自分で環境を作り、Codex、Claude Code、その他の AI エージェントがルールの違いでどう振る舞うかを観察します。

## プロジェクト概要

このコースには、信頼できるエージェント作業環境をゼロから構築するための 6 つの段階的な実践プロジェクトがあります。

1. <strong>プロンプトのみ vs ルール優先</strong>: プロンプトだけの場合と基本的な harness を使う場合で、エージェントの結果を比較します。
2. <strong>エージェントが読めるワークスペース</strong>: AI が理解しやすいリポジトリ構造と引き継ぎの仕組みを作ります。
3. <strong>複数セッションの継続性</strong>: 状態ファイルと初期化スクリプトを設計し、セッションをまたいで自然に作業を再開できるようにします。
4. <strong>ランタイムフィードバックとスコープ制御</strong>: エージェントが自分のコードをテストし、実行中にエラーを修正できる道具を導入します。
5. <strong>自己検証と役割分離</strong>: 幻覚や早すぎる完了宣言を防ぐため、独立したレビュー機構を作ります。
6. <strong>完全な harness（総合課題）</strong>: 観測可能で end-to-end に動く最終的なエージェント作業環境を組み立てます。

## 進め方

各プロジェクトフォルダには通常、次のものが含まれています。
- `starter/`: 開始用のワークスペース。
- `solution/`: 詰まったときに参照する実装例。
- 背景と具体的な目標を説明するタスク指示。

好みの AI Coding Agent（Claude Code、Cursor、Trae など）を使い、`starter/` ディレクトリ内でタスクを完了してください。
