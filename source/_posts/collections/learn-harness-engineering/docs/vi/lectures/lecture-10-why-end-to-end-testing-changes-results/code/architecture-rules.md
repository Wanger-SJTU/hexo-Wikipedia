---
title: Quy tắc Kiến trúc Electron
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/vi/lectures/lecture-10-why-end-to-end-testing-changes-results/code/architecture-rules/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Quy tắc Kiến trúc Electron

- Mã renderer không được truy cập trực tiếp hệ thống tệp.
- Preload là cầu nối duy nhất giữa renderer và Electron main.
- Logic truy xuất và indexing nằm trong các module service, không phải trong UI component.
- Logging nên có cấu trúc và được phát ra từ các ranh giới service.
