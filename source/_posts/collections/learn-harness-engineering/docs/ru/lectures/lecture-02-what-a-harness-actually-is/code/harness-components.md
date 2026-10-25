---
title: "Пример компонентов harness"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/ru/lectures/lecture-02-what-a-harness-actually-is/code/harness-components/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Пример компонентов harness

Для кодинг-агента, работающего в локальном репозитории:

- Модель:
  сама LLM

- Harness:
  - системный промпт
  - AGENTS.md
  - инструмент bash
  - инструменты чтения/записи файлов
  - доступ к git
  - локальная файловая система
  - стартовые скрипты
  - команды тестирования
  - stop-хуки
  - проверки линтера
  - петля evaluator

Если поменять любой из перечисленных компонентов harness — вы меняете эффективного агента.
