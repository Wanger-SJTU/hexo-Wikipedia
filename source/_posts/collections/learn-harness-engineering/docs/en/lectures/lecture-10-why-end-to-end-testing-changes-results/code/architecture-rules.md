---
title: Electron Architecture Rules
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/en/lectures/lecture-10-why-end-to-end-testing-changes-results/code/architecture-rules/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Electron Architecture Rules

- Renderer code may not directly access the filesystem.
- Preload is the only bridge between renderer and Electron main.
- Retrieval and indexing logic live in service modules, not UI components.
- Logging should be structured and emitted from service boundaries.
