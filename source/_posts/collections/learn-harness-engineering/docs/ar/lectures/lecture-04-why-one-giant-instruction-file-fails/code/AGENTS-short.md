---
title: "AGENTS.md"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/ar/lectures/lecture-04-why-one-giant-instruction-file-fails/code/AGENTS-short/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# AGENTS.md

## ابدأ هنا

- اقرأ `docs/ARCHITECTURE.md`
- اقرأ `docs/PRODUCT.md`
- استخدم `npm run dev` لتشغيل التطبيق
- استخدم `npm run check` قبل اعتبار العمل مكتملًا

## قواعد صارمة

- لا تُغيّر حدود main/preload/renderer في Electron بدون قراءة
  `docs/ARCHITECTURE.md`
- لا تُعلن عن مكتمل بدون تحقق (verification)
- اترك حالة نظيفة (clean state) للجلسة التالية
