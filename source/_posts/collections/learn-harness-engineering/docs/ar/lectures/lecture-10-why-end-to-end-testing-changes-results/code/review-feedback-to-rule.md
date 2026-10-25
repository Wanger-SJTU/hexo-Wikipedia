---
title: "مثال: تحويل ملاحظات المراجعة إلى قاعدة"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/ar/lectures/lecture-10-why-end-to-end-testing-changes-results/code/review-feedback-to-rule/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# مثال: تحويل ملاحظات المراجعة إلى قاعدة

تعليق مراجعة متكرر:

> لا تستخدم أدوات نظام الملفات من العارض. استخدم جسر الـ preload.

قاعدة harness مُرقّاة:

- إضافة قاعدة lint أو استيراد تمنع استخدام `fs` في كود العارض
- إضافة نص إصلاح يشرح حدود الـ preload
