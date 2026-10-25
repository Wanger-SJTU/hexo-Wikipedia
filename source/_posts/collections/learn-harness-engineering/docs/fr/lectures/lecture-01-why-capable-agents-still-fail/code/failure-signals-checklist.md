---
title: "Liste de Contrôle des Signaux d'Échec"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/fr/lectures/lecture-01-why-capable-agents-still-fail/code/failure-signals-checklist/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Liste de Contrôle des Signaux d'Échec

Utilisez cette liste lors de l'examen d'une exécution de harness faible.

- L'agent a-t-il demandé ou déduit incorrectement comment démarrer l'application ?
- A-t-il créé des répertoires ou abstractions qui ne correspondent pas au produit prévu ?
- S'est-il arrêté après avoir créé une coque UI visible sans un flux complet ?
- A-t-il laissé des notes ou artefacts aidant une future exécution à continuer ?
- Une nouvelle session pourrait-elle comprendre ce qui s'est passé en moins de cinq minutes ?
