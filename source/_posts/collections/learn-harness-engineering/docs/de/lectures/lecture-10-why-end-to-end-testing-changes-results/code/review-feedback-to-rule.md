---
title: "Beispiel: Review-Feedback in eine Regel umwandeln"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/de/lectures/lecture-10-why-end-to-end-testing-changes-results/code/review-feedback-to-rule/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Beispiel: Review-Feedback in eine Regel umwandeln

Wiederholter Review-Kommentar:

> Verwende keine Dateisystem-Dienstprogramme aus dem Renderer. Nutze die Preload-Brücke.

Beförderte Harness-Regel:

- Eine Lint- oder Import-Regel hinzufügen, die `fs`-Verwendung in Renderer-Code verhindert
- Remediation-Text hinzufügen, der die Preload-Grenze erklärt
