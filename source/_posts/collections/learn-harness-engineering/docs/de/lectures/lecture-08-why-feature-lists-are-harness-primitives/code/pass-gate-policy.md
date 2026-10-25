---
title: Pass-Gate-Richtlinie
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/de/lectures/lecture-08-why-feature-lists-are-harness-primitives/code/pass-gate-policy/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Pass-Gate-Richtlinie

Ein Feature darf nur von `passes: false` zu `passes: true` wechseln, wenn:

- der erwartete Workflow ausgeführt wurde
- der Erfolgsnachweis erfasst wurde
- kein blockierender Fehler im getesteten Pfad vorliegt
- die Implementierung die App nicht in einem defekten oder mehrdeutigen Zustand hinterlässt
