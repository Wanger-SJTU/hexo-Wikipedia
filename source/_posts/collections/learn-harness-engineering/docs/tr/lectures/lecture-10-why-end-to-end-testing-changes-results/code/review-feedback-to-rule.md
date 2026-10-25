---
title: "Örnek: İnceleme geri bildirimini kurala dönüştürmek"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/tr/lectures/lecture-10-why-end-to-end-testing-changes-results/code/review-feedback-to-rule/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Örnek: İnceleme geri bildirimini kurala dönüştürmek

Tekrar eden inceleme yorumu:

> Renderer içinden dosya sistemi araçlarını çağırmayın. Preload köprüsünü kullanın.

Yükseltilmiş harness kuralı:

- renderer kodunda `fs` kullanımını engelleyen bir lint veya import kuralı ekle
- preload sınırını açıklayan çözüm metnini ekle
