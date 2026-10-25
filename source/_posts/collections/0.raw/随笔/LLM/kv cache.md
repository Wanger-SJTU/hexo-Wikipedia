---
title: kv cache
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/随笔/LLM/kv-cache/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---


#TODO 

苏神推荐的这篇文章(2305.17118)值得一读，虽然作者说这个是为了节约显存，但是这篇文章的价值显然不是工程上的。最近听 Johnathan Gorard 讨论 Irreducible Computation 中存在 reducibility 是非常自然的，没想到在 LLMs 中居然有这样现成的例子。只能说亦可赛艇。
（备注：Scissorhands 中的 KV Cache 裁剪每个 attention head 都是独立的，反正我想不明白怎么高效地用 tensor arithmetic 实现，如果每个头单独计算这性能也忒差了吧）
发布于 15 分钟前・IP 属地北京

