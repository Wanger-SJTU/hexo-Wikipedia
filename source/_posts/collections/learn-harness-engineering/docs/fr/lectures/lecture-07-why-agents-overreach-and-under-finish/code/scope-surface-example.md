---
title: "Exemple de Surface de Portée"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/fr/lectures/lecture-07-why-agents-overreach-and-under-finish/code/scope-surface-example/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Exemple de Surface de Portée

Tâche :

- Ajouter l'indexation à l'application de connaissance Electron

Mauvaise forme de portée :

- "Implémenter l'indexation"

Meilleure forme de portée :

- Analyser les documents importés
- Diviser les documents en morceaux
- Persister les métadonnées des morceaux
- Afficher le statut d'indexation dans l'UI
- Ajouter une action de réindexation
