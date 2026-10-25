---
title: "Projelere Hoş Geldiniz"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/tr/projects/index/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Projelere Hoş Geldiniz

Burası Learn Harness Engineering'in uygulamalı bölümüdür. Yalnızca dersleri okumak yeterli değildir; ortamları kendiniz inşa etmeniz ve Codex, Claude Code ya da diğer yapay zeka ajanlarının farklı kurallar altında nasıl davrandığını gözlemlemeniz gerekir.

## Proje Genel Bakışı

Bu kurs, sıfırdan güvenilir bir ajan çalışma ortamı kurmayı öğreten 6 ilerlemeli, uygulamalı proje içerir:

1. <strong>Yalnızca prompt vs. önce kurallar (Prompt-Only vs. Rules-First)</strong>: Bir ajanın yalnızca prompt ile mi yoksa temel bir harness ile mi daha iyi performans gösterdiğini karşılaştırın.
2. <strong>Ajanın okuyabildiği çalışma alanı (Agent-Readable Workspace)</strong>: Deponuzu yapay zeka dostu olacak şekilde nasıl yapılandıracağınızı ve devir mekanizmalarını nasıl kuracağınızı öğrenin.
3. <strong>Çok oturumlu süreklilik (Multi-Session Continuity)</strong>: Durum dosyalarını ve başlatma betiklerini, ajanınızın oturumlar arasında çalışmasını kesintisiz biçimde sürdürebileceği şekilde tasarlayın.
4. <strong>Çalışma zamanı geri bildirimi ve kapsam kontrolü (Runtime Feedback and Scope Control)</strong>: Ajanın kendi kodunu test edip yürütme sırasında hataları düzeltmesini sağlayan araçları devreye alın.
5. <strong>Öz-doğrulama ve rol ayrımı (Self-Verification and Role Separation)</strong>: Halüsinasyonları ve erken zafer ilanlarını önlemek için bağımsız bir inceleme mekanizması kurun.
6. <strong>Eksiksiz harness (bitirme projesi) (Complete Harness — Capstone)</strong>: Son, gözlemlenebilir, uçtan uca bir ajan çalışma ortamını bir araya getirin.

## Nasıl İlerlenir

Her proje klasörü tipik olarak şunları içerir:
- `starter/`: Başlangıç çalışma alanınız.
- `solution/`: Referans uygulama (takılırsanız diye).
- Arka planınızı ve belirli hedeflerinizi ayrıntılandıran görev talimatları.

Tercih ettiğiniz yapay zeka kod yazma ajanını (örn. Claude Code, Cursor, Trae) kullanarak `starter/` dizini içindeki görevleri tamamlayın.
