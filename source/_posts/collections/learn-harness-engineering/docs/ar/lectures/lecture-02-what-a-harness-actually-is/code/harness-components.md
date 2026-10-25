---
title: مثال على مكونات الـ Harness
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/ar/lectures/lecture-02-what-a-harness-actually-is/code/harness-components/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# مثال على مكونات الـ Harness

لوكيل برمجة يعمل في مستودع محلي:

- النموذج (Model):
  الـ LLM نفسه

- الـ Harness:
  - system prompt
  - AGENTS.md
  - أداة bash
  - أدوات قراءة/كتابة الملفات
  - وصول git
  - نظام الملفات المحلي
  - سكربتات التشغيل
  - أوامر الاختبار
  - stop hooks
  - فحوصات lint
  - حلقة التقييم (evaluator loop)

إذا غيّرت أيًا من مكونات الـ harness أعلاه، فقد غيّرت الوكيل الفعّال.
