---
title: "Пример: превращение фидбэка с ревью в правило"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/ru/lectures/lecture-10-why-end-to-end-testing-changes-results/code/review-feedback-to-rule/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Пример: превращение фидбэка с ревью в правило

Повторяющийся комментарий с ревью:

> Не вызывайте утилиты файловой системы из рендерера. Используйте preload-мост.

Поднято до правила harness:

- добавить правило линтера или импорта, запрещающее использование `fs` в коде рендерера
- добавить текст с инструкцией, объясняющей границу preload
