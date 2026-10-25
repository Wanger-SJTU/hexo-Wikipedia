---
title: "Ejemplo: Convertir Feedback de Review en una Regla"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/es/lectures/lecture-10-why-end-to-end-testing-changes-results/code/review-feedback-to-rule/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Ejemplo: Convertir Feedback de Review en una Regla

Comentario de review repetido:

> No uses utilidades del sistema de archivos desde el renderer. Usa el puente preload.

Regla de harness promovida:

- añadir una regla de lint o import que prevenga el uso de `fs` en código del renderer
- añadir texto de remediación explicando la frontera de preload
