---
title: "Failure Signals Checklist"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/en/lectures/lecture-01-why-capable-agents-still-fail/code/failure-signals-checklist/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Failure Signals Checklist

Use this checklist when reviewing a weak harness run.

- Did the agent ask, or infer incorrectly, how to start the app?
- Did it create directories or abstractions that do not match the intended
  product?
- Did it stop after making a visible UI shell without a complete workflow?
- Did it leave notes or artifacts that help a future run continue?
- Could a fresh session understand what happened in under five minutes?
