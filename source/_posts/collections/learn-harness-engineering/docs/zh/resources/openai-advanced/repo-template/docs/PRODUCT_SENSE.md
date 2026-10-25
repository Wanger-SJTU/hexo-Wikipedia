---
title: PRODUCTSENSE.md
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/zh/resources/openai-advanced/repo-template/docs/PRODUCT_SENSE/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# PRODUCT_SENSE.md

这份文件记录那些代码本身并不能可靠表达出来的产品判断。

## 产品核心

- 主要用户：`[替换]`
- 要完成的任务：`[替换]`
- 最想解决的核心痛点：`[替换]`
- 可接受质量门槛：`[替换]`

## 产品规则

- 优先保证用户可感知的可靠性，而不是一味加功能。
- 行为有歧义时，把它当成 spec 缺口，不要默认允许猜。
- 只要实现改变了用户看见或信任的东西，就更新对应 spec。
- 具体流程写在 product spec 里，跨流程的产品优先级写在这里。

## 禁区模式

- 隐蔽的破坏性操作
- 没有用户反馈的静默失败
- 用户可见状态没有明确真相来源
- 不能用一句话解释清楚的功能
