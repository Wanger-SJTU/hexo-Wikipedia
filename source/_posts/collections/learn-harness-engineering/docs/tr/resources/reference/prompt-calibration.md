---
title: "Prompt Kalibrasyonu"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/tr/resources/reference/prompt-calibration/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Prompt Kalibrasyonu

Kök talimatlar, olası her hareketi değil, çalışma çerçevesini tanımlamalıdır.

## Kök Dosyada Tutulacaklar

- depo amacı ve kapsamı
- başlatma yolu
- doğrulama yolu
- üzerinde pazarlık edilemeyen kısıtlamalar
- gerekli durum dosyaları
- oturum sonu kuralları

## Kök Dosyadan Çıkarılacaklar

- uzun tarihsel uç durumlar
- konuya özgü uygulama ayrıntıları
- koda yakın yerde olması gereken yerel mimari notları
- yalnızca tek bir alt sistem için geçerli olan örnekler

## Çalışma Kuralı

Kök dosya, yeni bir oturumun kendisini hızlıca yönlendirmesine yardımcı
olmalıdır. Dosya her geçmiş hata için bir çöp alanı haline geliyorsa,
ayrıntıyı daha küçük belgelere bölüp bunun yerine onlara bağlantı verin.
