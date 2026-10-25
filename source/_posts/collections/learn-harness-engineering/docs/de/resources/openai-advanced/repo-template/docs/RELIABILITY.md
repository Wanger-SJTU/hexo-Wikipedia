---
title: RELIABILITY.md
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/de/resources/openai-advanced/repo-template/docs/RELIABILITY/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# RELIABILITY.md

Diese Datei definiert, wie das System beweist, dass es gesund und neu startbar ist.

## Standardpfade

- Bootstrap: `[Befehl]`
- Verifikation: `[Befehl]`
- App oder Dienst starten: `[Befehl]`
- Debugging oder Laufzeit-Inspektion: `[Befehl]`

## Erforderliche Laufzeitsignale

- strukturierte Logs für Start und kritische Abläufe
- Health-Checks für wichtige Dienste
- Trace- oder Timing-Daten für langsame Pfade, wenn verfügbar
- für den Benutzer sichtbare Fehlerzustände bei behebbaren Ausfällen

## Golden Journeys

- `[Journey 1]`
- `[Journey 2]`
- `[Journey 3]`

Jede Golden Journey sollte einen wiederholbaren Verifikationspfad und klare
Fehlersignale haben.

## Zuverlässigkeitsregeln

- Kein Feature ist vollständig, wenn das System danach nicht sauber neu starten kann.
- Laufzeitfehler sollten aus repo-lokalen Signalen diagnostizierbar sein.
- Wenn ein wiederholtes Fehlermuster auftritt, einen Benchmark oder eine Leitplanke dafür hinzufügen.
- Aufräumen ist Teil der Zuverlässigkeit, keine separate concern.
