---
title: Electron Arxitektura Qoidalari
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/uz/lectures/lecture-10-why-end-to-end-testing-changes-results/code/architecture-rules/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Electron Arxitektura Qoidalari

- Renderer kodi bevosita fayl tizimiga kira olmaydi.
- Preload — bu renderer va Electron main oʻrtasidagi yagona koʻprik.
- Qidirish va indekslash mantiqlari (logic) UI komponentlarida emas, balki xizmatlar (service) modullarida joylashadi.
- Logging (log yozish) strukturaviy boʻlishi va xizmat chegaralaridan (service boundaries) uzatilishi kerak.
