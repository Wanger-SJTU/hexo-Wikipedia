---
title: "Ví dụ Tác vụ Không được Chỉ định Rõ ràng"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/vi/lectures/lecture-01-why-capable-agents-still-fail/code/underspecified-task/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Ví dụ Tác vụ Không được Chỉ định Rõ ràng

Xây dựng ứng dụng desktop cơ sở kiến thức với hỏi đáp AI.

Ràng buộc:

- Không có ràng buộc nào được chỉ định
- Không có lệnh khởi động được cung cấp
- Không có hướng dẫn cấu trúc thư mục
- Không có data model được định nghĩa
- Không có tiêu chí hoàn thành rõ ràng

Kết quả điển hình từ loại prompt này:

- agent tự phát minh ra cấu trúc một cách tùy tiện
- ứng dụng có thể biên dịch nhưng không khởi động nhất quán
- UI có thể xuất hiện trước khi có bất kỳ đường dẫn ingest/query nào có thể sử dụng được
- agent thường dừng lại sau thành công về mặt thẩm mỹ
