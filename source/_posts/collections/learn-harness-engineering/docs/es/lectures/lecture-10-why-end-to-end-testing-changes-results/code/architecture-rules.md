---
title: Reglas de Arquitectura de Electron
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/es/lectures/lecture-10-why-end-to-end-testing-changes-results/code/architecture-rules/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Reglas de Arquitectura de Electron

- El código del renderer no puede acceder directamente al sistema de archivos.
- Preload es el único puente entre el renderer y Electron main.
- La lógica de recuperación e indexación vive en módulos de servicio, no en componentes UI.
- El logging debe ser estructurado y emitido desde los límites de servicio.
