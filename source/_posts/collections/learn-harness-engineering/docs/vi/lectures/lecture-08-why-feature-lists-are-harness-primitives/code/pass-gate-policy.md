---
title: Chính sách Pass Gate
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/vi/lectures/lecture-08-why-feature-lists-are-harness-primitives/code/pass-gate-policy/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Chính sách Pass Gate

Một tính năng chỉ có thể chuyển từ `passes: false` sang `passes: true` khi:

- workflow được kỳ vọng đã được thực thi
- bằng chứng thành công đã được ghi lại
- không có lỗi chặn nào trong đường dẫn đã được test
- triển khai không để lại ứng dụng ở trạng thái bị hỏng hoặc mơ hồ
