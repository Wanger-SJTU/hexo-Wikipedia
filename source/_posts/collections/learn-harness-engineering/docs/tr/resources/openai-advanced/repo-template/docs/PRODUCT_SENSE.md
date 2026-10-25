---
title: PRODUCTSENSE.md
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/tr/resources/openai-advanced/repo-template/docs/PRODUCT_SENSE/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# PRODUCT_SENSE.md

Bu dosya, ajanların yalnızca koddan güvenilir biçimde çıkaramayacağı
kalıcı ürün muhakemesini yakalar.

## Ürün Çekirdeği

- Birincil kullanıcı: `[değiştirin]`
- Yapılacak iş: `[değiştirin]`
- Giderilecek ana sıkıntı: `[değiştirin]`
- Kabul için kalite çıtası: `[değiştirin]`

## Ürün Kuralları

- Özellik sayısı yerine kullanıcı yüzlü güvenilirliği tercih edin.
- Belirsiz davranışı, tahmin etme izni olarak değil, bir spec eksikliği
  olarak ele alın.
- Uygulama, kullanıcıların gördüğünü ya da güvendiğini değiştirirse,
  eşleşen spec'i güncelleyin.
- Somut akışlar için ürün spec'lerini kullanın ve bu dosyayı kesişen ürün
  öncelikleri için kullanın.

## Yasak Örüntüler

- Gizli yıkıcı eylemler
- Kullanıcıya geri bildirim olmadan sessiz başarısızlık
- Görünür durumun belirsiz kayıt kaynağı
- Tek bir cümleyle açıklanamayan özellikler
