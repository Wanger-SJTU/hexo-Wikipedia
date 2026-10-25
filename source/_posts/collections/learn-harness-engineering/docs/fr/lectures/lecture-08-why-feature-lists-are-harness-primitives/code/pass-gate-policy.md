---
title: "Politique de Porte de Réussite"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/fr/lectures/lecture-08-why-feature-lists-are-harness-primitives/code/pass-gate-policy/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Politique de Porte de Réussite

Une fonctionnalité ne peut passer de `passes: false` à `passes: true` que lorsque :

- le flux de travail attendu a été exercé
- la preuve de succès est enregistrée
- aucune erreur bloquante n'est présente dans le chemin testé
- l'implémentation ne laisse pas l'application dans un état cassé ou ambigu
