---
title: Ví dụ Các Thành phần Harness
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/vi/lectures/lecture-02-what-a-harness-actually-is/code/harness-components/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Ví dụ Các Thành phần Harness

Đối với một coding agent làm việc trong kho lưu trữ cục bộ:

- Mô hình:
  bản thân LLM

- Harness:
  - system prompt
  - AGENTS.md
  - bash tool
  - công cụ đọc/ghi tệp
  - quyền truy cập git
  - hệ thống tệp cục bộ
  - script khởi động
  - lệnh test
  - stop hook
  - kiểm tra lint
  - vòng lặp evaluator

Nếu bạn thay đổi bất kỳ phần harness nào ở trên, bạn thay đổi agent thực tế.
