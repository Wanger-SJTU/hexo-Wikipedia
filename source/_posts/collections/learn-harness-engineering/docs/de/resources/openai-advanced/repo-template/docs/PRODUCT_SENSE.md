---
title: PRODUCTSENSE.md
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/de/resources/openai-advanced/repo-template/docs/PRODUCT_SENSE/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# PRODUCT_SENSE.md

Diese Datei erfasst dauerhaftes Produkturteil, das Agenten nicht zuverlässig nur
aus dem Code ableiten können.

## Produktkern

- Hauptbenutzer: `[ersetzen]`
- Zu erledigende Aufgabe: `[ersetzen]`
- Hauptfrustration, die behoben werden soll: `[ersetzen]`
- Qualitätsmaßstab für Akzeptanz: `[ersetzen]`

## Produktregeln

- Bevorzugen Sie für den Benutzer sichtbare Zuverlässigkeit gegenüber Feature-Anzahl.
- Behandeln Sie mehrdeutiges Verhalten als Spezifikationslücke, nicht als Erlaubnis zum Raten.
- Wenn die Implementierung ändert, was Benutzer sehen oder vertrauen, aktualisieren Sie die zugehörige Spezifikation.
- Verwenden Sie Produktspezifikationen für konkrete Abläufe und diese Datei für
  produktübergreifende Prioritäten.

## No-Go-Muster

- Versteckte destruktive Aktionen
- Stilles Scheitern ohne Benutzer-Feedback
- Unklare Wahrheitsquelle für sichtbaren Zustand
- Features, die nicht in einem Satz erklärt werden können
