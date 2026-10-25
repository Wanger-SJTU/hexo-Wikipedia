---
title: "Exemple : Transformer un Retour de Review en Règle"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/fr/lectures/lecture-10-why-end-to-end-testing-changes-results/code/review-feedback-to-rule/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Exemple : Transformer un Retour de Review en Règle

Commentaire de review répété :

> N'utilisez pas les utilitaires du système de fichiers depuis le renderer. Utilisez le pont preload.

Règle de harness promue :

- ajouter une règle lint ou d'import empêchant l'utilisation de `fs` dans le code du renderer
- ajouter un texte de remédiation expliquant la frontière du preload
