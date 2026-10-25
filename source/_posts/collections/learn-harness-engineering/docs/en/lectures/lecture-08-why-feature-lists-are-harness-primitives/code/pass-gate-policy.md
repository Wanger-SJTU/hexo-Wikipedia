---
title: Pass Gate Policy
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/en/lectures/lecture-08-why-feature-lists-are-harness-primitives/code/pass-gate-policy/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Pass Gate Policy

A feature may only move from `passes: false` to `passes: true` when:

- the expected workflow has been exercised
- the evidence of success is recorded
- no blocking error is present in the tested path
- the implementation does not leave the app in a broken or ambiguous state
