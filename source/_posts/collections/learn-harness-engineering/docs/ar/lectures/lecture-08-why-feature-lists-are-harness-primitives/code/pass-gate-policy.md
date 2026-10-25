---
title: سياسة بوابة النجاح
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/ar/lectures/lecture-08-why-feature-lists-are-harness-primitives/code/pass-gate-policy/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# سياسة بوابة النجاح

لا يمكن للميزة الانتقال من `passes: false` إلى `passes: true` إلا عندما:

- يكون سير العمل المتوقع قد تم تنفيذه
- يكون دليل النجاح مسجلاً
- لا يوجد خطأ حاظر في المسار المختبر
- التنفيذ لا يترك التطبيق في حالة معطلة أو غامضة
