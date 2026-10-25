---
title: POD类型和trival类型
date: "2026-04-11 21:40:17"
updated: "2026-04-11 21:40:17"
layout: post
permalink: /collections/草稿/POD类型和trival类型/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

A Plain Old Data (POD) type is a type that is both trivial (has special members that are compiler-provided or explicitly defaulted and occupy a contiguous memory area) and has a standard layout (a class that does not contain language features, such as virtual functions, which are incompatible with the C language, and all members have the same access control). The concept of POD types has been deprecated in C++20 in favor of trivial and standard layout types.