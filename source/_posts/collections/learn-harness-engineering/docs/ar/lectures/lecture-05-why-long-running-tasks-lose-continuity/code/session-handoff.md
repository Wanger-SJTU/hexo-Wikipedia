---
title: مثال على تسليم الجلسة
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/ar/lectures/lecture-05-why-long-running-tasks-lose-continuity/code/session-handoff/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# مثال على تسليم الجلسة

## المكتمل

- إضافة دعم استيراد Markdown
- إضافة قائمة مستندات أساسية في العارض

## المعطل أو غير المُتحقق

- الاستيراد ينجح لملفات `.md` لكنه يفشل لملفات `.txt` الكبيرة
- التطبيق يبدأ، لكن عرض التفاصيل لم يتم توصيله

## الخطوة التالية الأفضل

- إصلاح مسار استيراد `.txt`
- التحقق من الاستيراد من البداية للنهاية
- ثم إضافة لوحة تفاصيل المستند
