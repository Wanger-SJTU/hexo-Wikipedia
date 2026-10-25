---
title: Harness Components Example
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/en/lectures/lecture-02-what-a-harness-actually-is/code/harness-components/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Harness Components Example

For a coding agent working in a local repository:

- Model:
  the LLM itself

- Harness:
  - system prompt
  - AGENTS.md
  - bash tool
  - file read/write tools
  - git access
  - local filesystem
  - startup scripts
  - test commands
  - stop hooks
  - lint checks
  - evaluator loop

If you change any of the above harness pieces, you change the effective agent.
