---
title: "Política de Puerta de Aprobación"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/es/lectures/lecture-08-why-feature-lists-are-harness-primitives/code/pass-gate-policy/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Política de Puerta de Aprobación

Un feature solo puede pasar de `passes: false` a `passes: true` cuando:

- el flujo de trabajo esperado ha sido ejecutado
- la evidencia de éxito está registrada
- no hay errores bloqueantes en la ruta probada
- la implementación no deja la app en un estado roto o ambiguo
