---
title: "Inside the Transformer: The Life of a Token"
date: "2026-05-27 00:00:00"
updated: "2026-05-27 00:00:00"
layout: post
permalink: /collections/blog/2026-05-27-inside-the-transformer-life-of-a-token/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - transformer
  - deep-learning
  - attention
  - LLM
  - YaRN
  - RoPE
source_url: https://www.aleksagordic.com/blog/transformer
---


# Inside the Transformer: The Life of a Token

In this post, I'll do a deep dive into the internals of a modern dense transformer <span class="wikilink wikilink--missing" title="未导入的页面">1</span>(https://arxiv.org/abs/1706.03762). I'll focus exclusively on the forward pass on a single GPU, as if we were about to perform a training step, while ignoring the backward pass and distributed systems details (in practice, large Transformers are sharded across multiple devices during both training and inference).

As a running example, I'll use the exact architecture of [Rnj 1.5](https://huggingface.co/EssentialAI/rnj-1.5-instruct) - a model I worked on with my team at Ashish Vaswani's AI Lab (Essential AI Labs).

> **The team behind Rnj-1.5:**
> Rnj 1.5 could not have happened without an amazing group of people (sorted alphabetically):
> Code pod: Adarsh Chaluvaraju, Devaansh Gupta, Yash Jain, Somanshu Singla, Saurabh Srivastava (tech lead), Anil Thomas
> STEM pod: Aleksa Gordić (tech lead), Michael Pust, Tim Romanski, Ali Shehper, Kurt Smith (tech lead), Ameya Velingker
> Infra pod: Mike Callahan, Philip Monk (tech lead), Khoi Nguyen (tech lead), Alok Tripathy, Yash Vanjani
> Org: Divya Mansingka, Mohit Parmar, Peter Rushton
> Research and Engineering Roadmap: Ashish Vaswani

We announced it this week, with weights released on [Hugging Face](https://huggingface.co/EssentialAI/rnj-1.5-instruct).

It's a long-context follow-up to Rnj 1.0 <span class="wikilink wikilink--missing" title="未导入的页面">2</span>(https://essential.ai/research/rnj-1) that extends the context window from 32k to 160k, scoring 79% on RULER on a 128k context window. This release also offers stronger coding abilities on a wider range of harnesses. See our [model card](https://huggingface.co/EssentialAI/rnj-1.5-instruct) for more details.

This post is structured into seven parts:

- [Transformer forward pass](#transformer-forward-pass): high-level flow of a token
- [RMSNorm](#rmsnorm-root-mean-square-layer-normalization): the normalization layer
- [GeGLU MLP](#geglu-mlp-multi-layer-perceptron): GELU-gated feedforward block
- [MHA](#mha-multi-head-attention): multi-head self-attention
- [YaRN](#yarn): positional embeddings for long context
- [Core Attention](#core-attention): global + block local
- [Transformer math](#transformer-math): FLOPs/token, cluster sizing, and more

In a follow-up post, I'll dive into conditional computation, focusing on sparse transformers (MoE).

## Transformer forward pass

As a running example, assume we sample 2 "documents" from a dataset, with:

- batch size = 1
- sequence length = 16
- document packing enabled

We'll trace how a token flows through the transformer and, along the way, unpack each component.

Let's start. Spend some time analyzing the following:

![Figure 1: Tokenization stage](/images/collections/blog/asset/flow_pre.png)

We tokenize the documents into sequences of integers, then pack the two documents into a single sequence.

For the scope of this blog post, the tokenizer is a black-box component that takes in text and maps it to a sequence of tokens, each represented by an integer ID. In practice, tokenizers are "trained" on a separate corpus of text using algorithms such as BPE, which learn a vocabulary by repeatedly merging frequent character or byte sequences. Good tokenizer design has several desirable properties; for example, representing digits as individual tokens can help with numerical reasoning.

Alongside the tokens, we construct two supporting structures:

- inputs positions - used by the positional embedding module (YaRN)
- segmentation mask - used in attention for masking

This is the preprocessing stage.

> **Side note:**
> For efficiency reasons, the data is chunked ahead of time, before training starts, and the data loader feeds these preprocessed structures directly into the training loop. At that point, we never deal with raw strings. The (Spark) data pipelines and the data loader could easily be separate blog posts.

Next, we use the input tokens to index into the embedding table.

You can think of the embedding table as the vocabulary of the LLM.

This indexing operation converts our sequence of integers into a sequence of 16 4096-dim bf16 vectors:

![Figure 2: Embedding stage](/images/collections/blog/asset/flow_pro.png)

> **Side note:**
> Special tokens don't naturally appear during tokenization - no text maps to token IDs >= 128,000. They're injected during training (and later used at inference) to improve performance (e.g. FIM, repo packing, etc.) or to enforce specific behaviors (e.g. end of generation / turn, tool calls).

Let's dig into FIM <span class="wikilink wikilink--missing" title="未导入的页面">3</span>(https://arxiv.org/abs/2207.14255) (fill-in-the-middle) special tokens.

During (pre)training, we take a document, split it into prefix, middle (infix), and suffix, and construct a sequence of the form: `<FIM_PRE> prefix <FIM_SUF> suffix <FIM_MID> middle`. The model is trained to predict the middle given the prefix and suffix. This capability can then be leveraged at inference time.

For example, imagine using Rnj 1.5 as an autocomplete model in your favorite IDE. Your cursor naturally splits the code into a prefix and suffix, with the middle missing. By inserting FIM tokens and ending with `<FIM_MID>`, you prompt the model to generate a completion for the gap. These tokens help communicate intent to the model.

Tokenizer can easily be its own blog post, so I'll stop here.

Now we're ready to enter the first transformer layer.

Note that all transformer layers have (almost) the same structure, so I'll explain just one. In practice, we pass through 32 such layers - you can think of it as a for loop, but in Rnj 1.5 each layer has its own learnable weights.

*"almost"* because Rnj-1.5 uses both block-local and global attention layers - the only difference is the mask. At a higher level of abstraction, the statement still holds. More on that in the attention section.

Also note that some transformer implementations do weight sharing or partial weight sharing between layers (there are many variations) but here we're focusing on Rnj 1.5.

Let's do a forward pass through transformer blocks. Analyze the following carefully:

![Figure 3: Forward pass through transformer blocks](/images/collections/blog/asset/flow_main.png)

At a high level, the block consists of four RMSNorm submodules, an MLP, an attention module, two residual connections, and two sum operations. The residual connections simply carry forward copies of vectors from earlier in the block.

Importantly, all submodules operate on individual vectors, except for attention.

> **Additional context:**
> In practice, you'll find many variations of the transformer block. Design choices include the placement, type and number of normalization layers, the exact MLP structure (gated vs. non-gated, the choice of gating function, etc.), residual connections structure (identity, Attention Residuals <span class="wikilink wikilink--missing" title="未导入的页面">4</span>(https://arxiv.org/abs/2603.15031), etc.), and especially the attention module.
> Broadly, attention mechanisms are either quadratic (e.g. MLA <span class="wikilink wikilink--missing" title="未导入的页面">5</span>(https://arxiv.org/abs/2405.04434), scaled dot-product attn, etc.) or linear (e.g. Kimi Linear <span class="wikilink wikilink--missing" title="未导入的页面">6</span>(https://arxiv.org/abs/2510.26692)) in sequence length, each with trade-offs between modeling capacity (especially at long context) and efficiency.

Once the vectors exit the final transformer block, they're projected into a 128,256-dimensional space via a matrix multiplication. This produces logits, which are converted into a probability distribution via softmax. We sample from it during inference and use it in the cross-entropy loss during training.

![Figure 4](/images/collections/blog/asset/flow_epi.png)

Next, let's dive into the individual sublayers. I'll go in reverse order this time, which conveniently takes us from the simplest to the most complex:

- RMSNorm (Root Mean Square Layer Normalization)
- GeGLU MLP (Multi-Layer Perceptron)
- Attention (Scaled Dot-Product Attention)

## RMSNorm (Root Mean Square Layer Normalization)

RMSNorm <span class="wikilink wikilink--missing" title="未导入的页面">7</span>(https://arxiv.org/abs/1910.07467) is a normalization technique used to stabilize the training of deep neural networks.

As mentioned earlier, RMSNorm operates on individual vectors, so we'll focus on a single bf16 4096-dim vector (all others are processed in parallel in the same way). The output has the same shape and dtype:

![Figure 5: RMSNorm](/images/collections/blog/asset/RMSNorm.png)

## GeGLU MLP (Multi-Layer Perceptron)

The MLP is a simple, pointwise feedforward neural network that is used to learn the non-linear relationships between the input and output vectors.

Our variant is GeGLU (GELU-gated linear unit <span class="wikilink wikilink--missing" title="未导入的页面">8</span>(https://arxiv.org/abs/2002.05202)), where the gating mechanism uses GELU and takes the form `W2 @ GELU(W0@X)*(W1@X)`:

![Figure 6: GeGLU MLP](/images/collections/blog/asset/MLP.png)

With ReLU, "gate" is more literal because the gating vector is nonnegative, so it only suppresses or scales features. With GELU, gating values can be negative, so the gate can also invert a feature's sign, which makes "gate" a looser historical term.

## MHA (Multi-Head Attention)

MHA is a self-attention mechanism used to model relationships between different tokens in a sequence. We use a special variant of MHA, called GQA, short for group query attention (the number of K/V heads is reduced compared to Q heads, hence multiple queries (group) attend to the same key).

First, I'll give the high level overview - then we'll dig into the two most interesting components: YaRN and core attention.

We start by mapping each vector independently into query, key, and value vectors. We then reshape them, normalize queries and keys, and apply YaRN (which injects positional information through rotation). Next comes core attention, which mixes information across positions. Finally, we apply a linear projection to produce the output.

![Figure 7: MHA - multi head attention](/images/collections/blog/asset/MHA.png)

Let's now focus on YaRN (Yet another RoPE extensioN).

## YaRN

YaRN <span class="wikilink wikilink--missing" title="未导入的页面">9</span>(https://arxiv.org/abs/2309.00071) modifies RoPE <span class="wikilink wikilink--missing" title="未导入的页面">10</span>(https://arxiv.org/abs/2104.09864) (rotary position embeddings) in a clever way, that leads to better extrapolation to longer context lengths.

But why do we need positional embeddings in the first place?

![Figure 8: The WHY behind positional embeddings](/images/collections/blog/asset/yarn_intro.png)

Now that we understand the why, let's see how does RoPE work:

![Figure 9: YaRN frequency table](/images/collections/blog/asset/yarn2.png)

Here is a visualization showing how different YaRN frequencies behave. Notice that our slowest frequency does 1 cycle every 1.088M positions!

![Figure 10: YaRN frequencies](/images/collections/blog/asset/yarn3.png)

With this we're ready to see how positional embeddings are injected during the forward pass:

![Figure 11: YaRN - forward pass](/images/collections/blog/asset/yarn4.png)

That wraps up the YaRN forward pass.

Now that we understand the mechanics of it you might still be wondering: how does YaRN encode relative positional information via pairwise coordinate rotations of the query and key vectors, followed by a dot product?

![Figure 12: How does RoPE encode relative positional information?](/images/collections/blog/asset/yarn5.png)

And that's all there is to RoPE/YaRN! :)

## Core Attention

Finally, let's analyze the core attention mechanism. In practice, we use FlashAttention, which deserves a separate blog post (I actually wrote one back in '23, [check it out](https://gordicaleksa.medium.com/eli5-flash-attention-5c44017022ad) <span class="wikilink wikilink--missing" title="未导入的页面">11</span>(https://gordicaleksa.medium.com/eli5-flash-attention-5c44017022ad)). Here, I'll walk through vanilla attention.

Core attention is the mechanism that models relationships between tokens in a sequence. Take some time to analyze this:

![Figure 13: Computing (seqlen, seqlen) matrix of attention scores](/images/collections/blog/asset/attn1.png)

Now if we just stopped here we'd have a situation where:

- tokens from document 1 could attend to tokens from document 2 (and vice versa)
- token i could attend to token i+1 (future token) which breaks the causality

In order to prevent this we need to introduce masking!

![Figure 14: Attention masking & value vector aggregation](/images/collections/blog/asset/attn2.png)

Now imagine our sequence length is 32,768 instead of 16. For simplicity, assume a single document with no padding. What would the mask look like?

![Figure 15: Hybrid attention: block local + global](/images/collections/blog/asset/attn3.png)

Here's another way to visualize the layout, focusing on tokens at positions 9,000 and 10,000:

![Figure 16: Hybrid attention layout](/images/collections/blog/asset/attn4.png)

You can see that in most layers (block-local), these two tokens cannot attend to positions beyond 4,096. In the remaining eight layers (global), they can attend all the way back to position 0.

## Transformer math

Finally, I want to briefly touch on the KV cache, as it's an extremely important concept for understanding inference. So far, we've looked at the forward pass during training.

During inference, transformers are autoregressive - we generate one token at a time. It would be extremely inefficient to recompute the keys and values for all previous tokens at every step. Fortunately, there's no need: in a causal transformer, they remain unchanged. Instead, we compute them once and store them in a cache.

Let's go through the basic KV cache storage requirements:

![Figure 17: KV cache calculation](/images/collections/blog/asset/calc1.png)

Let's now also calculate how many learnable parameters Rnj 1.5 has. We just need to go through the architecture and account for all the learnable weights.

![Figure 18: Number of learnable parameters calculation](/images/collections/blog/asset/calc2.png)

For quick mental math notice that you only need to account for 3 matrices inside MLP and 4 matrices inside attention and you can ignore everything else.

Let's now calculate how much compute (FLOPs) we need per token. This is extremely valuable when it comes to planning cluster sizing - more on that after this section.

![Figure 19: FLOPs/token calculation](/images/collections/blog/asset/calc3.png)

It's worth remembering the 6N formula. It's also worth remembering the setting under which it holds (i.e. seqlen << inner model dimension).

Finally let's see how we can use the above formula for cluster sizing:

![Figure 20: Cluster sizing calculation](/images/collections/blog/asset/calc4.png)

You now go to Masayoshi Son and ask for a $1B seed round.

![Figure 21: Profit](/images/collections/blog/asset/sp.png)

## Epilogue

We've seen how a single token flows through the transformer and how all the subcomponents work together.

We've explored YaRN and attention in depth, and derived some of the most important transformer formulas.

In upcoming posts, I'll dig deeper into MoE, Muon (the optimizer <span class="wikilink wikilink--missing" title="未导入的页面">12</span>(https://kellerjordan.github.io/posts/muon/)), and several architectural innovations such as MLA (DeepSeek), MTP (multi-token prediction), and DSA (sparse attention <span class="wikilink wikilink--missing" title="未导入的页面">13</span>(https://arxiv.org/abs/2512.02556)).

> **Get in touch:**
> If you spot any errors in the post, please DM me - feel free to drop me a message on [X](https://x.com/gordic_aleksa) or [LinkedIn](https://www.linkedin.com/in/aleksagordic/) or via [anon feedback](https://docs.google.com/forms/d/1z1fEirrN2xtGxAsJvptpM7yV4ByT5SF25S-XiMPrXNA/edit).

## References

1. "Attention Is All You Need", https://arxiv.org/abs/1706.03762
2. RNJ 1.0, https://essential.ai/research/rnj-1
3. "Efficient Training of Language Models to Fill in the Middle", https://arxiv.org/abs/2207.14255
4. "Attention Residual Learning", https://arxiv.org/abs/2603.15031
5. "DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model", https://arxiv.org/abs/2405.04434
6. "Kimi Linear: An Expressive, Efficient Attention Architecture", https://arxiv.org/abs/2510.26692
7. "Root Mean Square Layer Normalization", https://arxiv.org/abs/1910.07467
8. "GLU Variants Improve Transformer", https://arxiv.org/abs/2002.05202
9. "YaRN: Efficient Context Window Extension of Large Language Models", https://arxiv.org/abs/2309.00071
10. "RoFormer: Enhanced Transformer with Rotary Position Embedding", https://arxiv.org/abs/2104.09864
11. "Eli5 Flash Attention", https://gordicaleksa.medium.com/eli5-flash-attention-5c44017022ad
12. Muon, https://kellerjordan.github.io/posts/muon/
13. "Dissecting Sparsity in Large Language Models: Intrinsic Data-Aware Sparse Attention", https://arxiv.org/abs/2512.02556

---

**原文链接**: [Inside the Transformer: The Life of a Token](https://www.aleksagordic.com/blog/transformer)
