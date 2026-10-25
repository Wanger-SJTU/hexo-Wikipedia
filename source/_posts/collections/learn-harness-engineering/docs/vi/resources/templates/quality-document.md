---
title: "Tài liệu Chất lượng"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/vi/resources/templates/quality-document/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Tài liệu Chất lượng

Một snapshot chất lượng cho mỗi domain sản phẩm và lớp kiến trúc. Cả agent và con người đều có thể sử dụng tài liệu này để nhanh chóng hiểu nơi nào codebase mạnh và nơi nào cần cải thiện.

<strong>Tần suất cập nhật:</strong> Sau mỗi phiên quan trọng, hoặc trước khi bắt đầu giai đoạn công việc mới.

<strong>Thang điểm:</strong>

- <strong>A</strong>: Tất cả xác minh đang vượt qua, kiến trúc sạch, agent có thể đọc được, test ổn định
- <strong>B</strong>: Xác minh đang vượt qua, hầu hết sạch, thiếu nhỏ về khả năng đọc hoặc độ phủ test
- <strong>C</strong>: Hoạt động một phần, có khoảng trống đã biết, một số khu vực mã khó cho agent hiểu
- <strong>D</strong>: Không hoạt động, hoặc có vấn đề cấu trúc lớn

---

## Domain Sản phẩm

| Domain | Điểm | Xác minh | Khả năng đọc của Agent | Độ ổn định Test | Khoảng trống chính | Cập nhật lần cuối |
|--------|-------|-------------|-----------------|---------------|----------|-------------|
| Import Tài liệu | - | - | - | - | - | - |
| Quản lý Tài liệu | - | - | - | - | - | - |
| Indexing Tài liệu | - | - | - | - | - | - |
| Luồng Q&A | - | - | - | - | - | - |
| Câu trả lời có Grounding | - | - | - | - | - | - |

## Lớp Kiến trúc

| Lớp | Điểm | Thực thi Ranh giới | Khả năng đọc của Agent | Khoảng trống chính | Cập nhật lần cuối |
|-------|-------|---------------------|-----------------|----------|-------------|
| Main Process | - | - | - | - | - |
| Preload | - | - | - | - | - |
| Renderer | - | - | - | - | - |
| Services | - | - | - | - | - |

## Lịch sử Thay đổi

### YYYY-MM-DD

- Thay đổi:
- Domain được nâng cấp:
- Domain bị hạ cấp:
- Khoảng trống mới được xác định:
- Khoảng trống đã đóng:
