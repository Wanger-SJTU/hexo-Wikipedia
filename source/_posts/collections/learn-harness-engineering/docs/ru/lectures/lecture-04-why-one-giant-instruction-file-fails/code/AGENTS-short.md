---
title: "AGENTS.md"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/ru/lectures/lecture-04-why-one-giant-instruction-file-fails/code/AGENTS-short/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# AGENTS.md

## Начните здесь (Start Here)

- Прочитайте `docs/ARCHITECTURE.md`
- Прочитайте `docs/PRODUCT.md`
- Используйте `npm run dev` для запуска приложения
- Используйте `npm run check` перед тем как пометить работу как завершённую

## Строгие правила (Hard Rules)

- Не изменяйте границы main/preload/renderer процесса Electron без
  прочтения `docs/ARCHITECTURE.md`
- Не помечайте функцию как завершённую без проверки (verification)
- Оставляйте чистое состояние (clean state) для следующей сессии
