---
title: OpenAI Advanced SOPs
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/ru/resources/openai-advanced/sops/index/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# OpenAI Advanced SOPs

Эти SOP переводят операционные паттерны из статьи в конкретные исполняемые
плейбуки, которым можно следовать или адаптировать.

## Включённые SOP

- [`layered-domain-architecture.md`](./layered-domain-architecture.md):
  ввести явные слои и сквозные границы
- [`encode-knowledge-into-repo.md`](./encode-knowledge-into-repo.md):
  перенести невидимое знание из чатов, документов и памяти в репо-локальные файлы
- [`observability-feedback-loop.md`](./observability-feedback-loop.md):
  дать агентам логи, метрики, трейсы и повторяемый цикл отладки
- [`chrome-devtools-validation-loop.md`](./chrome-devtools-validation-loop.md):
  использовать автоматизацию браузера и снимки для валидации UI-поведения до чистого результата

## Как ими пользоваться

1. Выберите SOP, соответствующий вашему текущему узкому месту.
2. Используйте чек-лист, чтобы настроить недостающие артефакты или инструментарий.
3. Закодируйте получившиеся правила в скопированные документы `repo-template/`.
4. Превращайте повторяющиеся комментарии ревью в проверки, скрипты или ограничители.

Это не для слепого следования. Это для того, чтобы сделать harness
читаемее, проверяемее и повторяемее.
