---
title: "OpenAI Ilgʻor toʻplami (Advanced Pack)"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/uz/resources/openai-advanced/index/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# OpenAI Ilgʻor toʻplami (Advanced Pack)

Bu jild OpenAIʼning “Harness engineering: leveraging Codex in an agent-first world” maqolasida tasvirlangan ancha qatʼiy repo tuzilishini nusxalashga tayyor boshlangʻich fayllarga (starter files) toʻplaydi.

Qachonki minimal harness endi yetarli boʻlmasa va sizning repozitoriyingiz quyidagilarga muhtoj boʻlsa, ushbu toʻplamdan foydalaning:

- qisqa yoʻnaltiruvchi (routing-style) `AGENTS.md`
- repo ichida yagona haqiqat manbai (system-of-record) boʻlgan mustahkam hujjatlar
- faol va tugallangan ishlash rejalari (execution plans)
- aniq mahsulot (product), ishonchlilik (reliability), xavfsizlik (security) va frontend siyosati fayllari
- mahsulot domeni va arxitektura qatlami boʻyicha sifat baholash (quality scoring)
- model tushunadigan maʼlumotnoma (reference material) jildlari
- arxitektura, bilimlarni saqlab qolish va runtime validatsiyasi uchun standart operatsion protseduralar (SOP - standard operating procedures)

## Kiritilgan boshlangʻich (Starter) maket

[`repo-template/`](./repo-template/index.md) ostidagi boshlangʻich toʻplam quyidagi tuzilmani aynan takrorlaydi:

```text
AGENTS.md
ARCHITECTURE.md
docs/
├── design-docs/
│   ├── index.md
│   └── core-beliefs.md
├── exec-plans/
│   ├── active/
│   ├── completed/
│   └── tech-debt-tracker.md
├── generated/
│   └── db-schema.md
├── product-specs/
│   ├── index.md
│   └── new-user-onboarding.md
├── references/
│   ├── design-system-reference-llms.txt
│   ├── nixpacks-llms.txt
│   └── uv-llms.txt
├── DESIGN.md
├── FRONTEND.md
├── PLANS.md
├── PRODUCT_SENSE.md
├── QUALITY_SCORE.md
├── RELIABILITY.md
└── SECURITY.md
```

## Buni qanday qabul qilish (Adopt) mumkin

## 1. Agar repongiz hali kichik boʻlsa, minimal toʻplamdan boshlang.

## 2. Kuchliroq tuzilma kerak boʻlganda [`repo-template/`](./repo-template/index.md) ichidagi fayllarni oʻz repozitoriyingizga koʻchiring.

## 3. `AGENTS.md` faylini qisqa saqlang. Unga ensiklopediya emas, balki chuqurroq hujjatlarga yoʻnaltiruvchi router sifatida qarang.

4. Sifat, ishonchlilik va reja hujjatlarini alohida tozalash kuni sifatida emas, balki oddiy ishingizning bir qismi sifatida yangilab boring.
5. Yaratilgan (generated) artefaktlar va tashqi maʼlumotnomalarni (external references) aniq saqlang, shunda agentlar chat tarixiga tayanmasdan ularni topa oladi.

## SOP Kutubxonasi

[`sops/`](./sops/index.md) jildi maqoladagi diagrammalarni bosqichma-bosqich ishlash protseduralariga aylantiradi:

- qatlamli domen arxitekturasini (layered domain architecture) oʻrnatish
- koʻrinmas bilimlarni repozitoriyga kodlashtirish
- lokal kuzatuvchanlik steki (observability stack) va qayta aloqa (feedback-loop) jarayoni
- UI ishlari uchun Chrome DevTools validatsiya sikli

## Dizayn tamoyillari

- Qisqa kirish nuqtasi (entrypoint), chuqurroq bogʻlangan hujjatlar
- Repozitoriy yagona haqiqat manbai (system of record) sifatida
- Mexanik tekshiruvlar yodda saqlangan qoidalardan ustunroqdir
- Rejalar va sifat tarixi kodning yonida yashaydi
- Tozalash (cleanup) va soddalashtirish (simplification) — birinchi darajali masʼuliyatlardir

Ushbu toʻplam ataylab qatʼiy (opinionated) qilingan, ammo baribir u koʻr-koʻrona nusxalanmasdan, sizning loyihangizga moslashtirilishi kerak.
