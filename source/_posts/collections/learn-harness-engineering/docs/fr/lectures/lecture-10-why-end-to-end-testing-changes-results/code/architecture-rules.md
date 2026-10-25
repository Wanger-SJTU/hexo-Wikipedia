---
title: Règles d'Architecture Electron
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/fr/lectures/lecture-10-why-end-to-end-testing-changes-results/code/architecture-rules/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Règles d'Architecture Electron

- Le code du renderer ne peut pas accéder directement au système de fichiers.
- Le preload est le seul pont entre le renderer et Electron main.
- La logique de récupération et d'indexation vit dans les modules de service, pas dans les composants UI.
- La journalisation doit être structurée et émise depuis les frontières de service.
