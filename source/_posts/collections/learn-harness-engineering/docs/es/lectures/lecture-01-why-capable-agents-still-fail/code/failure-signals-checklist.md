---
title: "Lista de Verificación de Señales de Fallo"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/es/lectures/lecture-01-why-capable-agents-still-fail/code/failure-signals-checklist/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Lista de Verificación de Señales de Fallo

Usa esta lista al revisar una ejecución de harness débil.

- ¿El agente preguntó o infirió incorrectamente cómo iniciar la app?
- ¿Creó directorios o abstracciones que no coinciden con el producto previsto?
- ¿Se detuvo tras construir una shell de UI visible sin un flujo completo?
- ¿Dejó notas o artefactos que ayuden a una ejecución futura a continuar?
- ¿Podría una sesión nueva entender qué ocurrió en menos de cinco minutos?
