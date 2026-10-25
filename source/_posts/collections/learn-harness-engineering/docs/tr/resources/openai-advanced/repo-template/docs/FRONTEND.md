---
title: "FRONTEND.md"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/tr/resources/openai-advanced/repo-template/docs/FRONTEND/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# FRONTEND.md

Bu dosya, ajanların UI örüntülerini öngörülemez biçimde icat etmemesi için
istikrarlı frontend beklentilerini tanımlar.

## UI İlkeleri

- Yenilikten önce netlik için optimize edin.
- Etkileşim akışlarını keşfedilebilir ve yeniden başlatılabilir tutun.
- Tek seferlik varyantlar yerine az sayıda yeniden kullanılabilir bileşeni
  tercih edin.
- Erişilebilirlik kontrolleri cila çalışması değil, normal doğrulamanın
  parçasıdır.

## Korkuluklar

- Tasarım sistemini ya da bileşen kütüphanesini `docs/references/` içinde
  belgeleyin.
- Anahtar kullanıcı yüzlü durumları kaydedin: boş, yükleniyor, başarılı,
  hata, yeniden deneme.
- Metni, klavye davranışını ve görsel hiyerarşiyi akışlar arasında tutarlı
  tutun.
- Bir UI hatası düzeltildiğinde, eşleşen doğrulama adımını ekleyin ya da
  güncelleyin.

## Doğrulama Beklentileri

- Kritik kullanıcı yolculukları için kanıt yakalayın.
- Tarayıcı ya da runtime doğrulama adımlarını ilgili plana kaydedin.
- Görsel regresyonlar yaygınsa ekran görüntüsü ya da DOM kontrollerini
  standartlaştırın.
