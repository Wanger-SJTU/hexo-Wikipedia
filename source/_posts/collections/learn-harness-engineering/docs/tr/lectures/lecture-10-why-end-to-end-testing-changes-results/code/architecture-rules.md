---
title: "Electron mimari kuralları"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/tr/lectures/lecture-10-why-end-to-end-testing-changes-results/code/architecture-rules/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Electron mimari kuralları

- Renderer kodu dosya sistemine doğrudan erişemez.
- Preload, renderer ile Electron main arasındaki tek köprüdür.
- Geri getirme ve dizinleme mantığı arayüz bileşenlerinde değil, servis modüllerinde yaşar.
- Loglama yapılandırılmış olmalı ve servis sınırlarından yayılmalıdır.
