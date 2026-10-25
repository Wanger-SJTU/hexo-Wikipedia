---
title: "Ví dụ: Biến Phản hồi Review thành Quy tắc"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/vi/lectures/lecture-10-why-end-to-end-testing-changes-results/code/review-feedback-to-rule/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Ví dụ: Biến Phản hồi Review thành Quy tắc

Nhận xét review lặp đi lặp lại:

> Không gọi filesystem utilities từ renderer. Sử dụng preload bridge.

Quy tắc harness được đẩy lên:

- thêm lint hoặc quy tắc import ngăn việc sử dụng `fs` trong mã renderer
- thêm văn bản giải pháp giải thích ranh giới preload
