---
title: PRODUCTSENSE.md
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/fr/resources/openai-advanced/repo-template/docs/PRODUCT_SENSE/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# PRODUCT_SENSE.md

Ce fichier capture le jugement produit durable que les agents ne peuvent pas
inférer de manière fiable uniquement à partir du code.

## Cœur du Produit

- Utilisateur principal : `[remplacer]`
- Travail à accomplir : `[remplacer]`
- Principale frustration à éliminer : `[remplacer]`
- Niveau de qualité pour l'acceptation : `[remplacer]`

## Règles Produit

- Favoriser la fiabilité visible par l'utilisateur plutôt que le nombre de fonctionnalités.
- Traiter le comportement ambigu comme une lacune de spécification, pas comme une permission de deviner.
- Si l'implémentation change ce que les utilisateurs voient ou en qui ils ont confiance, mettre à jour la spécification correspondante.
- Utiliser les spécifications produit pour les flux concrets, et utiliser ce fichier pour les priorités produit transversales.

## Motifs à Éviter

- Actions destructrices cachées
- Échec silencieux sans retour utilisateur
- Source de vérité peu claire pour l'état visible
- Fonctionnalités qui ne peuvent pas être expliquées en une seule phrase
