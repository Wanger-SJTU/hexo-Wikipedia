---
title: "Архитектурные правила Electron"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/ru/lectures/lecture-10-why-end-to-end-testing-changes-results/code/architecture-rules/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Архитектурные правила Electron

- Код рендерера не должен напрямую обращаться к файловой системе.
- Preload — единственный мост между рендерером и main-процессом Electron.
- Логика поиска и индексации живёт в сервисных модулях, а не в UI-компонентах.
- Логирование должно быть структурированным и исходить из границ сервисов.
