---
title: Recursive Language Models (RLMs)
date: "2026-07-20 15:26:13"
updated: "2026-07-20 15:26:13"
layout: post
permalink: /collections/web/2026-07-20-recursive-language-models/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Recursive Language Models (RLMs)

> 原文：https://outcomeschool.com/blog/recursive-language-models
> 作者：Amit Shekhar (Outcome School)
> 抓取时间：2026-07-20

---

In this blog, we will learn about Recursive Language Models (RLMs), a new way of using language models to handle very large inputs that do not fit in the model's context window.

## What is a Recursive Language Model (RLM)?

A Recursive Language Model (RLM) is a way of using a language model where the model can call another language model (or itself) on smaller parts of the input to solve a bigger problem.

In simple words, instead of putting the entire input into the model at once, the model breaks the input into smaller pieces and calls another language model (or itself) on those smaller pieces.

RLM = Recursive + Language Model

Here, Recursive means the model can call itself (or another model) again and again on smaller parts of the problem. Language Model is the LLM that understands and generates text.

## Why do we need RLMs?

Let's say we have a very long document with 1 million tokens, and we want to ask a question about it.

When we put a lot of text into a language model, the following issues arise:

- The model has a context window limit. It cannot accept too many tokens at once.
- The quality of the answer goes down as the context gets longer. The model gets confused with too much information and misses important details in the middle. This is called <strong>context rot</strong>.
- The cost of running the model goes up.
- The speed of the model goes down.

This means, just making the context window bigger does not solve the problem. We need a better approach.

## How an RLM works

In an RLM, the main model does not directly read the full input. Instead, the full input stays inside a Python environment as a variable. The model gets a small prompt that only names this variable and explains how to use it. The model then writes code to read parts of the input and call other language models on those parts. The smaller calls return short answers, which the main model combines into the final answer.

## How the model writes and runs code

Suppose we have a long meeting transcript and we want to ask: "What were the action items?"

The model only generates text. It cannot run code by itself. So, we wrap the model with a Python environment. This environment has a variable `context` that stores the full transcript, and a function `call_llm(prompt)` that calls another language model.

The loop runs as:

1. The model writes Python code as its response — splits context and calls `call_llm` on each piece
2. The code runs in the Python environment. Each `call_llm` call sends one piece to another language model and gets back a short answer
3. The list is sent back to the model. The model now sees only the short answers, not the full transcript
4. The model reads the list and returns the final answer

The full transcript is <strong>never</strong> sent to the main model. Only the variable name `context` is sent in the prompt, not its actual content. This is what keeps the main model's context small even when the input is huge.

## Why RLMs work better

Each smaller call gets a small input. A small input is easy for the model to handle. The model can focus on the small piece and give a good answer. Also, the main model only sees the small answers, not the full input. This way, we avoid context rot.

## Recursion inside RLMs

- The main RLM works on the full input.
- The main RLM calls sub-RLMs on each big piece.
- Each sub-RLM can again call sub-RLMs on each smaller piece.
- The smallest calls work on tiny pieces of text.

This is just like a tree. The top of the tree handles the big problem. The leaves of the tree handle the small pieces. Each level passes its answer up to the next level.

## RLMs vs Simple Chunking

In simple chunking, we fix the chunk size beforehand. We send each chunk to the model, get an answer, and combine the answers. The split is fixed.

In an RLM, the <strong>model itself</strong> decides how to split the input and what to ask for each piece. The model can change its strategy based on the question. The RLM is more like a human reader who skims, jumps, reads carefully, and decides on the fly.

## Advantages of RLMs

- Handles very long inputs (much larger than the model's context window)
- Better accuracy on long context
- Lower cost in some cases
- Modular thinking
- Flexible splitting strategy

## Limitations of RLMs

- More complex to build
- Many model calls — can be slow
- Errors can stack up
- Hard to debug

## RLM vs RAG

| Feature | RAG | RLM |
|---------|-----|-----|
| How it picks data | A search step picks relevant parts first | The model itself explores the data |
| Flexibility | Less flexible, depends on the search step | More flexible, model decides what to do |
| Code execution | No code execution by the model | The model can write and run code |
| Best for | Question answering on a fixed knowledge base | Complex tasks on long inputs |
| Complexity | Easier to build | Harder to build |

## When to use RLMs

- Very long document analysis
- Large codebase analysis
- Long meeting/transcript summarization
- Comparing many files at once
- Tasks that can be broken into smaller, independent sub-tasks
