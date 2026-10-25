---
title: "Oʻtish Holati Qoidasi (Pass Gate Policy)"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/uz/lectures/lecture-08-why-feature-lists-are-harness-primitives/code/pass-gate-policy/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Oʻtish Holati Qoidasi (Pass Gate Policy)

Funksiya (feature) faqat quyidagi hollarda `passes: false` holatidan `passes: true` holatiga oʻtishi mumkin:

- kutilgan jarayon (workflow) sinovdan oʻtgan boʻlsa
- muvaffaqiyat dalili yozib qoʻyilgan boʻlsa
- test qilingan yoʻlda hech qanday toʻsqinlik qiluvchi xatolik boʻlmasa
- implementatsiya ilovani buzilgan yoki noaniq holatda tashlab ketmasa
