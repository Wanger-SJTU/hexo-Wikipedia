---
title: Yetersiz tanımlanmış görev örneği
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/tr/lectures/lecture-01-why-capable-agents-still-fail/code/underspecified-task/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Yetersiz tanımlanmış görev örneği

Yapay zeka ile soru yanıtlama özelliğine sahip bir masaüstü bilgi tabanı uygulaması oluşturun.

Kısıtlar:

- Hiçbiri belirtilmemiş
- Başlatma komutu verilmemiş
- Klasör yapısı yönlendirmesi yok
- Veri modeli tanımlanmamış
- Açık tamamlanma kriterleri yok

Bu tür bir prompt'tan tipik sonuçlar:

- ajan, yapıyı duruma göre kendi uydurur
- uygulama derlenebilir ama tutarlı şekilde başlamayabilir
- kullanılabilir bir veri alma/sorgulama yolu olmadan kullanıcı arayüzü ortaya çıkabilir
- ajan genellikle kozmetik bir başarıdan sonra durur
