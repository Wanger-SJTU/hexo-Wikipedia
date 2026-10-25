---
title: قواعد بنية Electron
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/ar/lectures/lecture-10-why-end-to-end-testing-changes-results/code/architecture-rules/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# قواعد بنية Electron

- لا يجوز لرمز العارض الوصول مباشرة إلى نظام الملفات.
- الـ Preload هو الجسر الوحيد بين العارض و Electron main.
- منطق الاسترجاع والفهرسة يعيش في وحدات الخدمة، وليس مكونات واجهة المستخدم.
- يجب أن تكون السجلات منظمة ومنبعثة من حدود الخدمات.
