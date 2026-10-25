---
title: Политика гейта прохождения
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/ru/lectures/lecture-08-why-feature-lists-are-harness-primitives/code/pass-gate-policy/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Политика гейта прохождения

Фича может перейти из `passes: false` в `passes: true`, только когда:

- ожидаемый сценарий был реально пройден
- доказательство успеха зафиксировано
- на проверенном пути нет блокирующей ошибки
- реализация не оставляет приложение в сломанном или неоднозначном состоянии
