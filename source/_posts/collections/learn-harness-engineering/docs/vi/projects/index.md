---
title: Chào mừng đến với Dự án
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/vi/projects/index/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Chào mừng đến với Dự án

Đây là phần thực hành của Learn Harness Engineering. Chỉ đọc các bài giảng là không đủ—bạn cần phải tự mình xây dựng các môi trường và quan sát cách Codex, Claude Code hoặc các AI agent khác hoạt động dưới các quy tắc khác nhau.

## Tổng quan về Dự án

Khóa học này bao gồm 6 dự án thực hành tiến triển dần, dạy bạn cách xây dựng một môi trường làm việc agent đáng tin cậy từ đầu:

1. <strong>Chỉ Prompt vs. Ưu tiên Quy tắc</strong>: So sánh cách agent hoạt động chỉ với prompt so với một harness cơ bản.
2. <strong>Không gian làm việc Agent đọc được</strong>: Tìm hiểu cách cấu trúc kho lưu trữ của bạn để thân thiện với AI và thiết lập cơ chế bàn giao.
3. <strong>Tính liên tục đa phiên</strong>: Thiết kế các tệp trạng thái và kịch bản khởi tạo để agent của bạn có thể tiếp tục công việc một cách liền mạch qua nhiều phiên.
4. <strong>Phản hồi Runtime và Kiểm soát Phạm vi</strong>: Giới thiệu các công cụ cho phép agent tự kiểm tra mã của mình và sửa lỗi trong quá trình thực thi.
5. <strong>Tự xác minh và Phân tách Vai trò</strong>: Xây dựng một cơ chế đánh giá độc lập để ngăn chặn ảo giác (hallucinations) và việc tuyên bố thành công sớm.
6. <strong>Harness Hoàn chỉnh (Đồ án)</strong>: Lắp ráp một môi trường làm việc agent hoàn chỉnh, có thể quan sát được từ đầu đến cuối.

## Cách Thực hiện

Mỗi thư mục dự án thường chứa:
- `starter/`: Không gian làm việc bắt đầu của bạn.
- `solution/`: Cách triển khai tham khảo (nếu bạn bị mắc kẹt).
- Các hướng dẫn tác vụ nêu chi tiết bối cảnh của bạn và các mục tiêu cụ thể.

Sử dụng AI Coding Agent ưa thích của bạn (ví dụ: Claude Code, Cursor, Trae) để hoàn thành các tác vụ bên trong thư mục `starter/`.
