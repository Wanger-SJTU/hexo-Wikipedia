---
title: "Document qualité"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/fr/resources/templates/quality-document/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Document qualité

Un instantané qualité pour chaque domaine produit et couche architecturale. Les agents
et les humains peuvent utiliser ce document pour comprendre rapidement où le codebase
est solide et où il a besoin de travail.

<strong>Cadence de mise à jour :</strong> Après chaque session significative, ou avant de commencer
une nouvelle phase de travail.

<strong>Échelle de notation :</strong>

- <strong>A</strong> : Toutes les vérifications réussies, architecture propre, lisible par l'agent, tests stables
- <strong>B</strong> : Vérifications réussies, principalement propre, lacunes mineures en lisibilité ou en couverture de tests
- <strong>C</strong> : Partiellement fonctionnel, lacunes connues, certaines zones de code difficiles à comprendre pour les agents
- <strong>D</strong> : Non fonctionnel, ou problèmes structurels majeurs

---

## Domaines produit

| Domaine | Note | Vérification | Lisibilité agent | Stabilité des tests | Lacunes principales | Dernière mise à jour |
|---------|------|-------------|-----------------|--------------------|--------------------|---------------------|
| Import de documents | - | - | - | - | - | - |
| Gestion des documents | - | - | - | - | - | - |
| Indexation des documents | - | - | - | - | - | - |
| Flux Q&R | - | - | - | - | - | - |
| Réponses fondées | - | - | - | - | - | - |

## Couches architecturales

| Couche | Note | Application des limites | Lisibilité agent | Lacunes principales | Dernière mise à jour |
|--------|------|------------------------|-----------------|--------------------|---------------------|
| Main Process | - | - | - | - | - |
| Preload | - | - | - | - | - |
| Renderer | - | - | - | - | - |
| Services | - | - | - | - | - |

## Historique des changements

### YYYY-MM-DD

- Changements :
- Domaines promus :
- Domaines rétrogradés :
- Nouvelles lacunes identifiées :
- Lacunes comblées :
