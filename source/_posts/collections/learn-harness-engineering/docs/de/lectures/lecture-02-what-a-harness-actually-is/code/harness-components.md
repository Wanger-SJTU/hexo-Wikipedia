---
title: Harness-Komponenten Beispiel
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/de/lectures/lecture-02-what-a-harness-actually-is/code/harness-components/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Harness-Komponenten Beispiel

Für einen Coding-Agenten, der in einem lokalen Repository arbeitet:

- Modell:
  das LLM selbst

- Harness:
  - System-Prompt
  - AGENTS.md
  - Bash-Tool
  - Datei-Lese-/Schreib-Tools
  - Git-Zugriff
  - Lokales Dateisystem
  - Startup-Skripte
  - Test-Befehle
  - Stop-Hooks
  - Lint-Prüfungen
  - Evaluator-Schleife

Wenn Sie eines der obigen Harness-Elemente ändern, ändern Sie den effektiven Agenten.
