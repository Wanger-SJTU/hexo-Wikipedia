---
title: Geçer kapı politikası
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/tr/lectures/lecture-08-why-feature-lists-are-harness-primitives/code/pass-gate-policy/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Geçer kapı politikası

Bir özellik yalnızca aşağıdaki koşullar sağlandığında `passes: false` durumundan `passes: true` durumuna geçebilir:

- beklenen iş akışı çalıştırılmış olmalı
- başarının kanıtı kaydedilmiş olmalı
- test edilen yolda engelleyici bir hata bulunmamalı
- uygulama, çözümü ardından bozuk veya belirsiz bir durumda bırakmamalı
