---
title: RAG：IR Embedding from Sparse to Dense
date: "2026-04-11 21:40:18"
updated: "2026-04-11 21:40:18"
layout: post
permalink: /collections/0.raw/随笔/RAG-IR-Embedding-from-Sparse-to-Dense/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

RAG可以看作是IR的进阶，从信息检索（IR）的角度来看，从文本中要检索获取相关信息，有很多方法。传统方法如关键词、标签等，NN类的方法各种embeding模型叠加向量数据库，当然还有另外一类方法就是稀疏向量检索，这类方法既有BM25这种基于统计的，也有BGE、splade这种与NN结合的。

## NN Dense Vector Embedding
Dense Vector就是我们最常见的embedding 方式了，一段文字、一张图片经过一个embeding 模型（诸如bert、clip），得到一个N维的向量，向量中每个数字都是连续的数字。
```python
from transformers import AutoModelForMaskedLM, AutoTokenizer

model_id = "naver/splade-cocondenser-ensembledistil"

tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForMaskedLM.from_pretrained(model_id)

text = """Arthur Robert Ashe Jr. (July 10, 1943 – February 6, 1993) was an American professional tennis player. He won three Grand Slam titles in singles and two in doubles."""

def compute_vector(text):
    """
    Computes a vector from logits and attention mask using ReLU, log, and max operations.
    """
    tokens = tokenizer(text, return_tensors="pt")
    output = model(**tokens)
    logits, attention_mask = output.logits, tokens.attention_mask
    relu_log = torch.log(1 + torch.relu(logits))
    weighted_log = relu_log * attention_mask.unsqueeze(-1)
    max_val, _ = torch.max(weighted_log, dim=1)
    vec = max_val.squeeze()

    return vec, tokens


vec, tokens = compute_vector(text)

def extract_and_map_sparse_vector(vector, tokenizer):
    # Extract indices and values of non-zero elements in the vector
    cols = vector.nonzero().squeeze().cpu().tolist()
    weights = vector[cols].cpu().tolist()

    # Map indices to tokens and create a dictionary
    idx2token = {idx: token for token, idx in tokenizer.get_vocab().items()}
    token_weight_dict = {
        idx2token[idx]: round(weight, 2) for idx, weight in zip(cols, weights)
    }

    # Sort the dictionary by weights in descending order
    sorted_token_weight_dict = {
        k: v
        for k, v in sorted(
            token_weight_dict.items(), key=lambda item: item[1], reverse=True
        )
    }

    return sorted_token_weight_dict


# Usage example
sorted_tokens = extract_and_map_sparse_vector(vec, tokenizer)
sorted_tokens
```

## Sparse Vector Embedding

## Multi-vector Search

## CAGRA Index Support for Advanced GPU-Accelerated Graph Indexing