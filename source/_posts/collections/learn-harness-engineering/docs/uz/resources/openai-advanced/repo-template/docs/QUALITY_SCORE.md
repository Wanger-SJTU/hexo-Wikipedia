---
title: QUALITYSCORE.md
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/uz/resources/openai-advanced/repo-template/docs/QUALITY_SCORE/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# QUALITY_SCORE.md

Bu hujjat repozitoriy vaqt oʻtishi bilan kuchayib boryaptimi yoki zaiflashib borayotganini kuzatib boradi.

## Baholash shkalasi (Grading Scale)

- `A`: tekshirilgan (verified), tushunarli, barqaror, chegaralar himoyalangan (boundaries enforced)
- `B`: ishlayapti lekin kichik boʻshliqlar bor
- `C`: qisman ishlayapti, sezilarli tushunmovchiliklar yoki beqarorliklar mavjud
- `D`: buzilgan, xavfsiz emas yoki strukturasi umuman aniq emas

## Mahsulot Domenlari (Product Domains)

| Domen | Baho | Tekshiruv | Agent Tushunishi | Test Barqarorligi | Asosiy Boʻshliqlar | Oxirgi Yangilanish |
|--------|-------|-------------|-----------------|---------------|----------|-------------|
| `[domain-a]` | - | - | - | - | - | - |
| `[domain-b]` | - | - | - | - | - | - |
| `[domain-c]` | - | - | - | - | - | - |

## Arxitektura Qatlamlari (Architectural Layers)

| Qatlam | Baho | Chegaraga Rioya | Agent Tushunishi | Asosiy Boʻshliqlar | Oxirgi Yangilanish |
|-------|-------|---------------------|-----------------|----------|-------------|
| Types | - | - | - | - | - |
| Services | - | - | - | - | - |
| Runtime | - | - | - | - | - |
| UI | - | - | - | - | - |

## Benchmark Kadrlar (Benchmark Snapshots)

| Sana | Harness Varianti | Tugallash Darajasi | Takroriy Urinishlar (Retries) | Tekshiruvdan Oldingi Defektlar | Qaydlar |
|------|-----------------|----------------|--------|-----------------------|------|
| YYYY-MM-DD | `[baseline / improved / simplified]` | - | - | - | - |

## Soddalashtirish Jurnali (Simplification Log)

| Sana | Olib Tashlangan Komponent | Natija | Qaror |
|------|-------------------|---------|----------|
| YYYY-MM-DD | `[component]` | `[degraded (yomonlashdi) / unchanged (oʻzgarmadi)]` | `[restore (tiklash) / keep removed (olib tashlanganicha qolsin)]` |
