---
title: Electron-Architekturregeln
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/de/lectures/lecture-10-why-end-to-end-testing-changes-results/code/architecture-rules/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Electron-Architekturregeln

- Renderer-Code darf nicht direkt auf das Dateisystem zugreifen.
- Preload ist die einzige Brücke zwischen Renderer und Electron Main.
- Retrieval- und Indexierungslogik leben in Service-Modulen, nicht in UI-Komponenten.
- Logging sollte strukturiert sein und von Service-Grenzen ausgehen.
