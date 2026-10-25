---
title: "Exemple de Composants du Harness"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/fr/lectures/lecture-02-what-a-harness-actually-is/code/harness-components/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Exemple de Composants du Harness

Pour un agent de programmation travaillant dans un dépôt local :

- Modèle :
  le LLM lui-même

- Harness :
  - prompt système
  - AGENTS.md
  - outil bash
  - outils de lecture/écriture de fichiers
  - accès git
  - système de fichiers local
  - scripts de démarrage
  - commandes de test
  - hooks d'arrêt
  - vérifications lint
  - boucle d'évaluation (evaluator loop)

Si vous modifiez l'une des pièces du harness ci-dessus, vous modifiez l'agent effectif.
