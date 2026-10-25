---
title: Harness bileşenleri örneği
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/tr/lectures/lecture-02-what-a-harness-actually-is/code/harness-components/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Harness bileşenleri örneği

Yerel bir depoda çalışan bir kod yazma ajanı için:

- Model:
  LLM'nin kendisi

- Harness:
  - sistem prompt'u
  - AGENTS.md
  - bash aracı
  - dosya okuma/yazma araçları
  - git erişimi
  - yerel dosya sistemi
  - başlatma betikleri
  - test komutları
  - durdurma kancaları
  - lint kontrolleri
  - değerlendirici döngüsü

Yukarıdaki harness parçalarından herhangi birini değiştirirseniz, fiili ajanı değiştirirsiniz.
