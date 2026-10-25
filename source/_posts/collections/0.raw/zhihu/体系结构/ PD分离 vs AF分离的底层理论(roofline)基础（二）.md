---
title: (1 封私信) PD分离 vs AF分离的底层理论(roofline)基础（二）
date: "2026-04-12 00:00:00"
updated: "2026-04-12 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/PD分离-vs-AF分离的底层理论(roofline)基础(二)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2026612737929684371
---


上一篇我们推导了prefill阶段的attention以及ffn的AI，最后得出prefill阶段在长上下文场景下是算力瓶颈的结论。这一篇继续来计算decode阶段各模块的AI。

先贴上这张图片，图源水印，从这张图上我们可以看到prefill阶段生成的kv cache在decode阶段的作用及参与运算的过程。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_3d87eb018851.jpg)

接下来让我们详细计算decode阶段的attention和ffn，看一下和prefill阶段的主要差异是什么。

- Attention算力
attention的详细计算见[PD分离 vs AF分离的底层理论(roofline)基础](https://zhuanlan.zhihu.com/p/2026224424043430871)。为了详细说明prefill和decode阶段的差异，现在我们假设input_tokens=[I am a researcher],是一个seq_len=4的数组。经过prefill计算后，生成第一个新token，假设是“and”，那么现在送给decode的输入就是prefill阶段生成的kv cache以及新token--“and”的embedding矩阵，见上图。我们知道kv cache里存的是经过线性投影后的K,V，所以现在对于前4个token我们是不需要再计算K,V的，而attention计算的本质是每个token的Q与自身以及其他token去计算自注意力，那么现在要做的就是用新token的Q去计算self-attention，而历史的4个token的自注意力已经算完了，不会再进行计算。这里，计算量就是：计算新token的Q,K,V，然后用新token的Q与历史所有token的K,V进行注意力计算，得到新token的注意力权重。

- QKV线性投影计算

```text
x_new = [B, 1, H], 这里seq_len = 1了

Q_new = x_new x q_proj = [B, 1, H] x [H, H] = [B, 1, H]，**QFLOPS = BH^2**

K_new = x_new x k_proj = [B, 1, H] x [H, H] = [B, 1, H],  **KFLOPS=BH^2**

V_new = x_new x v_proj = [B, 1, H] x [H, H] = [B, 1, H], **VFLOPS=BH^2**
```


将K_new和V_new加入到kv cache里，更新kv cache，K = [B, L+1, H], V = [B, L+1, H]

- 相似度矩阵计算
严谨起见，我们这里仍然做一个多头拆分，其实在算力推导这里拆不拆多头都不影响算力计算，多头拆分主要影响后面的访存计算，但还是保持好习惯，严格按实际来。

Q-->reshaped_Q: <span class="wikilink wikilink--missing" title="未导入的页面">B,1,H</span>-->[B, head_num, 1, head_dim],这里拆分后有个permute，新手可能要注意一下，permute的作用从数学上来讲是为了矩阵乘，从实际意义上讲是为了保持单头内部进行attention，不跨头做注意力。

令head_num =d, head_dim=h

K-->reshaped_K: <span class="wikilink wikilink--missing" title="未导入的页面">B,L+1,H</span>-->[B, d, L+1, h]

V-->reshaped_V: <span class="wikilink wikilink--missing" title="未导入的页面">B,L+1,H</span>-->[B, d, L+1, h]

s = QK^T=[B,d,1,h]x[B,d,h,L+1] = [B,d,1,L+1], <strong>sFLOPS=BH(L+1)</strong>

- 自注意力计算

```text
attn = softmax(s/ \sqrt{d} )V = [B,d,1,L+1] x [B, d, L+1, h] = [B,d,1,h], **attnFLOPS=BH(L+1)**,因为我们关注的是flops，所以softmax这种算子的计算我们暂且忽略。
```


- 多头合并以及输出矩阵线性投影
attn_out = concat（attn）x Wo = concat([B,d,1,h]) x [H,H] = [B,1,H]x[H,H] = [B,1,H],

<strong>attn_outFLOPS=BH^2</strong>

<strong>attnFlops=3BH^2+BH(L+1)+BH(L+1) + BH^2 = 4BH^2 + 2BH(L+1)</strong>

至此，decode阶段的attention模块flops计算完毕。接下来计算attention部分的访存量。

## 2. Attention访存计算


我们还是先来梳理一下decode阶段attention的各个计算阶段在HBM和SRAM之间都要搬运哪些东西。

- QKV矩阵计算过程中的访存量
我们依然假设权重和输入都是fp8.

Decode阶段我们只需要计算新token的QKV。

```text
x = [B, 1, H], q_proj=[H,H], v_proj=[H,H], k_proj=[H,H]

Q=x*q_proj=[B,1,H], 读访存量：**BH+H^2**, 写访存量：**BH**

K=x*k_proj=[B,1,H], 读访存量：**BH+H^2**, 写访存量：**BH**

V=x*v_proj=[B,1,H], 读访存量：**BH+H^2**, 写访存量：**BH**
```


QKV计算阶段的总访存量=<strong>6BH+3H^2</strong>

- 相似度矩阵计算过程的访存量
Q-->reshaped_Q: <span class="wikilink wikilink--missing" title="未导入的页面">B,1,H</span>-->[B, d, 1, h],

K-->reshaped_K: <span class="wikilink wikilink--missing" title="未导入的页面">B,L+1,H</span>-->[B, d, 1, h]

s = reshaped_Q x reshaped_K^T=[B,d,1,h]x[B,d,h,L+1] = [B,d,1,L+1]

读访存量：<strong>B(L+1)H+BH</strong>，写访存量：<strong>Bd(L+1)</strong>

- softmax计算

```text
sf = softmax(s/ \sqrt{d}\ )，读访存量：**Bd(L+1)**， 写访存量：**Bd(L+1)**
```


- 自注意力分数计算
attn = sf x V = [B,d,1,L+1] x [B, d, L+1, h] = [B,d,1,h],

读访存量：<strong>Bd(L+1) + BH(L+1)</strong>，写访存量：Bdh=<strong>BH</strong>

- 输出
out = concat(attn) x Wo = [B, 1, H] x [H,H] = [B, 1, H]

读访存量：<strong>BH+H^2</strong>，写访存量：<strong>BH</strong>

因此，attention阶段总的访存量=6BH+3H^2 + B(L+1)H+BH + Bd(L+1) + Bd(L+1) + Bd(L+1)+Bd(L+1)+BH(L+1)+ BH+ BH+H^2 +  BH = <strong>4H^2+12BH+4Bd+2BHL+4BdL</strong>

- attention AI
 attn_AI = attnFlops/attn_访存 = (4BH^2 + 2BH(L+1)) / (4H^2+12BH+4Bd+2BHL+4BdL)，

当长下文场景时，attn_AI是个非常小的数，远远低于硬件平衡AI，是访存瓶颈。

## 3. FFN算力和访存计算


令intermediate_size = I

```text
ffn_input = attn_out+res=[B, 1, H], gate_proj=[H,I], up_proj=[H,I], down_proj=[I,H]

GATE=ffn_input x gate_proj = [B, 1, H] x [H,I] = [B, 1, I], gateFLOPS=BHI, 读访存：BH+HI，写访存：BI

UP=ffn_input x up_proj = [B, 1, H] x [H,I] = [B, 1, I], upFLOPS=BHI, 读访存：BH+HI，写访存：BI
```


GATE过激活以及GATE和UP逐元素点积 mul=act(GATE) \odot UP=[B, 1, I] \odot [B, 1, I]=[B, 1, I]

```text
FLOPS=BI, 读访存：2BI，写访存：BI

DOWN=mul x down_proj = [B, 1, I] x [I,H] = [B, 1, H], downFLOPS= BHI, 读访存：BI+HI，写访存：BH
```


FFN阶段FLPOS=BHI+BHI+BI+BHI=3BHI+BI , FFN阶段访存= BH+HI +BI+BH+HI+BI+2BI+BI+BI+HI+BH=3BH+3HI +6BI

FFN_AI = (3BHI+BI) / (3BH+3HI +6BI) = (3HI+I)/(3H+3HI/B + 6I),工业界大BATCH场景下，FFN_AI>硬件平衡AI，是算力瓶颈。

<strong>Decode_AI</strong> = (attn_flops + ffn_flops) /(attn_访存+ffn_访存) = (4BH^2+2BH(L+1)+3BHI+BI) / (4H^2+15BH+4Bd+2BHL+4BdL+3HI+6BI4BH^2+2BH(L+1)+3BHI+BI​) \approx H/H+2d，远远小于硬件平衡AI，工业界场景下L远远大于H，忽略低阶项，属于<strong>访存瓶颈</strong>。
