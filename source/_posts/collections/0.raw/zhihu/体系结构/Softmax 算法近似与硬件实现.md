---
title: Softmax 算法近似与硬件实现
date: "2026-01-01 00:00:00"
updated: "2026-01-01 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/Softmax-算法近似与硬件实现-adbc93/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1948746945867802457
---


本文主要调研如何通过硬件实现 LLM 中的 softmax 函数

### 1. Piecewise Linear Fitting (PLF)

#### 1.1 一阶近似

参考《Hardware-efficient Softmax Approximation for  Self-Attention Networks》

$$σ(zi)=ezi−zmax\sigma(z_i) = \frac{e^{z_i - z_{\max}}}{\sum_{j=1}^{N} e^{z_j - z_{\max}}} \quad \text{for } i = 1, 2, \ldots, N \\$$

计算分为三个阶段，并有很强的<strong>数据相关性</strong>，因此很难<strong>流水线化</strong>和<strong>并行化；</strong>同时 <strong>exp</strong>和 <strong>division</strong>操作硬件不友好：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_1cb7f63b7ac4.jpg)

本文用如下 e 指数实现方法：

$e^y = 2^{y \cdot \log_2 e} = 2^u \cdot 2^v\\$

其中 u 表示 integer，v 表示 fraction。 2^v 通过<strong>线性近似</strong>的方式实现， 2^u 通过<strong>移位</strong>的方式实现。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a68a9783a1c9.jpg)

算法实现![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_3aeb2f52a3c5.jpg)

硬件电路实现首先将输入数据量化为 5-bit integer + 11-bit fraction，Max Block 通过<strong>比较器树</strong>( 并行度为n，<strong>分 batch 进行</strong> )实现，并且只比较 <strong>integer</strong>部分( Line 1 )，为了弥补 fraction，给 Max Block 输出的值<strong>加1</strong>( Line 2 )。然后相减( Line 5 )。

$Line6 乘以 1.5，是将 log_2e 近似为 1.5，在硬件上乘以 <strong>1.5</strong>等于<strong>右移相加</strong>，非常<strong>硬件友好</strong>。此时 mul 2^n 可以用 n/2+1 近似，然后再右移 integer 来实现 \times 2^{int} ( Line 7 )。并使用加法树来实现输出结果的累加( Line 8 )。$

Round 模块将加法树的输出进行 <strong>round 到最近的 2 的 n 次幂</strong>( Line 10 )。最后每个输出<strong>右移</strong>来<strong>实现除法运算</strong>( Line 12 )。这种<strong>Base-2</strong>的<strong>近似方法</strong>参考《Base-2 Softmax Function: Suitability for Training and Efficient Hardware Implementation 》

<strong>剪枝优化：</strong>

由于硬件资源的限制，只能分 batch 进行 softmax 操作。同时由于填充和人类语言的冗余性，所以可以对输入进行剪枝。因为 softmax 是一个单调函数，因此将小输入值过滤掉即可

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a8aa293ca2f4.jpg)

输入输出的结果分布，输出结果大量分布在0附近有两种方法：

- 从 N 个输入中选择 k 个最大的( 哈哈，这个可以用 <strong>sorting network</strong> 来做 )
- 计算出平均值，小于平均值就过滤( 本文采用的方法 )
使用法二的话就可以分为两步：1. 计算均值 2. 输入过滤

*<strong>计算均值</strong>*可以使用 Adder tree 来完成。回顾上文在计算最大值的时候，Adder tree 此时空闲，因此可以<strong>复用硬件</strong>，0 tradeoff。

*<strong>输入过滤</strong>*使用如下电路实现，但是没讲 b 图的实现细节，应该要用到一堆桶形移位器：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_19da88d8a136.jpg)

运算器生成移位量，然后进行移位<strong>结果评估：</strong>

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_76fa94a79cc6.jpg)

Ours 1 为不剪枝，Ours 2 为剪枝可以看到这种近似计算方式在许多 LLM 中不会造成精度明显下降。

#### 1.2 高阶近似

参考《SystolicAttention: Fusing FlashAttention within a  Single Systolic Array》

本文和《Hardware-efficient Softmax Approximation for  Self-Attention Networks》用的类似的方法，拆分为 integer 和 fraction 两部分，integer 通过<strong>移位</strong>实现。与之不同的是，fraction 部分本文采用了更精确的<strong>8段线性拟合</strong>的方式，而不是直接近似为n/2+1。

$exp2(x) \approx 2^{x_i} \cdot (slope_k \cdot x_f + intercept_k), \quad k \in [0, 8].\\$

因为本文是将 softmax 和 SA 做融合，因此进行8段线性拟合的计算也可以<strong>复用 SA 硬件电路</strong>。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_702c8d6f70a0.jpg)

复用 SA 电路实现 softmax 线性拟合
### 2. Log-Sum-Exp

#### 2.1 mod2 log-sum-exp

参考《Efficient Precision-Adjustable Architecture for  Softmax Function in Deep Learning》

 $$首先使用 Ln 域变换将<strong>除法</strong>干掉：softmax(x_i) = \frac{e^{x_i}}{\sum_{j=1}^{N}e^{x_j}} = \frac{e^{x_i - x_{max}}}{\sum_{j=1}^{N}e^{x_j - x_{max}}}\\ softmax(x_i) = exp(x_i - x_{max} - ln(\sum_{j=1}^{N}e^{x_j - x_{max}}))\\但仍然存在 exp 和 ln 两个硬件不友好的非线性函数$$

使用 PLF 消掉 <strong>exp</strong>：

$e^{-x_i} = 2^{-x_i \cdot \log_2 e}, x_i \ge 0.\\e^{-x_i} = 2^{(-u_i)+(-v_i)} = 2^{-u_i} \cdot 2^{-v_i} = 2^{-v_i} \gg u_i.\\与前面一样，vi 为 fraction \subset (0,1] ，ui 为 integer。 2^{-v_i} 用<strong>一阶线性</strong>近似。用高 p 位作为 index 来决定使用的 k b。0.10111 是 log_2e 的二进制。$

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_43cc4a89b0d8.jpg)

exp 整体近似计算算法然后使用如下算法消掉 ln：

$F = \sum_{j=1}^{N} e^{x_j-x_{\max}} \ge e^{x_{\max}-x_{\max}} = 1.\\ \forall F \ge 0, \exists !(m,w): F = 2^w \cdot m.\\ \ln F = \ln 2 \cdot \log_2 F = \ln 2 \cdot (w + \log_2 m).\\ \log_2 m \approx m - 1, m \in [1, 2).\\ \ln F = \ln 2 \cdot (m - 1 + w).\\硬件上寻找 w 和 m 只需要一个 leading-one detector 和 shifter。$

整体算法如下：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_7b432084afec.jpg)

整体算法![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_1b903d94cb45.jpg)

整体电路实现![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_302b3d6e3242.jpg)

EU 微架构，使用 LUT 暂存 k b![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_022e420e8def.jpg)

LNU 电路实现在本算法中 \ln F = \ln 2 \cdot (m - 1 + w) ，m-1 和 w 刚好分别占据小数位和整数位，因此可以直接<strong>拼接</strong>而成，无需加法器。

还有一个对于 1.0111 乘法的优化：

>1)-(A>>4)\\ =A+(A>>1)+1+(\sim(A>>4))\\ =A+(A>>1)+(\sim(A>>4))+1\\">1.0111\times A=A+(A>>1)-(A>>4)\\ =A+(A>>1)+1+(\sim(A>>4))\\ =A+(A>>1)+(\sim(A>>4))+1\\

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ee4288f7ff37.jpg)

电路实现
#### 2.2 兼容 systolic 数据流的电路实现

参考《COSA:Co-Operative Systolic Arrays for  Multi-head Attention Mechanism in Neural  Network using Hybrid Data Reuse and Fusion  Methodologies》

 $$使用如下变换：softmax(x_i) = \frac{e^{x_i}}{\sum_{j=1}^{N}e^{x_j}} = \frac{e^{x_i - x_{max}}}{\sum_{j=1}^{N}e^{x_j - x_{max}}}\\ softmax(x_i) = exp(x_i - x_{max} - ln(\sum_{j=1}^{N}e^{x_j - x_{max}}))\\ ln(x) = ln(2^q s) = qln2 + lns = 0.1011*q+s-1+c \\变换后 s 的范围是(1,2]，c 是补偿项。$$

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_07a91d51e891.jpg)

电路结构本文使用了 SA 进行计算，为了<strong>兼容 SA 输出数据流</strong>，Softmax unit 也使用 systolic 式的数据流。LN 的电路由 LOD( leading 1 detector ), SF( shifter ), CM( constant multiplier ), LUT( 补偿值查表计算 ), ADD( 全部加起来 ) 构成。

### 3. improved with penalties (ISP)

基于 <strong>Log-Sum-Exp</strong>加入 <strong>penalty</strong>进行精度优化。参考《SoftAct: A High-Precision Softmax Architecture for Transformers Supporting Nonlinear Functions》

#### 3.1 算法实现

Log-Sum-Exp 的方法在硬件上有以下问题：

- \log_2 m \approx m - 1 有 14.78% 的误差
- log_2e 的计算在硬件上近似为 1.0111 存在误差
- ln2     的计算在硬件上近似为 0.1011 存在误差
在 attention 实现中 softmax 很普遍且作为<strong>权重</strong>，因此对<strong>精度</strong>有很高要求。

引入误差项，优化 log_2e :

$$err_0 = \log_2(e) - \log_2(e)_h,\\ \exp(-x_i) = 2^{-x_i \cdot (\log_2(e)_h + err_0)} = 2^{-x_i \cdot err_0} \times 2^{-x_i \cdot \log_2(e)_h}.\\\exp(-x_i) = 2^{\frac{-err_0(n_i+f_i)}{\log_2(e)_h}} \times 2^{-(n_i+f_i)}  = 2^{-n_i \cdot \frac{err_0}{\log_2(e)_h}} \times 2^{-f_i \cdot \left(1+\frac{err_0}{\log_2(e)_h}\right)} \gg n_i,\\ P_{ov} = 2^{-n_i \cdot \frac{err_0}{\log_2(e)_h}} ~~~~~~P_{in} = \frac{err_0}{\log_2(e)_h}\\ 使p_0=n_i\\ exp_{p_0}(-x_i) = P_{ov} \times 2^{-f_i(1+P_{in})} \gg n_i  = P_{ov} \times (k \cdot f_i + b) \gg n_i\\同理优化 ln2 :$$

$err_1 = \ln(2) - \ln(2)_h,\\ \ln(S) = (\ln(2)_h + err_1) \cdot \log_2(u \cdot 2^v) = (\ln(2)_h + err_1) \cdot v + \ln(2) \cdot \log_2(u),\\ P_{ln} = err_1 \cdot v.\\ 使p_1=v\\ \ln_{p_1}(S) = \ln(2)_h \cdot v + (k' \cdot u + b') + P_{ln}\\$

最终得到 ISP 表达式：

$x′_i = x_i − x_{max}\\ f_{p_0p_1}(x_i) = exp_{p_0}\left(x'_i - \ln_{p_1}\left(\sum_{j=0}^{N-1} exp_{p_0}(x'_j)\right)\right)\\ 其中 p_0,p_1 可以通过分析输入数据特征而 offline 地确定。本文设定$

p_0=4\\ p_1 = \begin{cases}     0, & \text{if } v 

#### 3.2 跳零

QK^T 计算后经过量化执行 softmax 操作。

$$\frac{P - min}{max - min} $$

因此如果量化后为0可以直接跳过 softmax 计算：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_4ae6dd5efc6e.jpg)

stage1跳零的条件：

$\exp(x_i - x_{\max}) $

stage3跳零的条件： 

 $x_i - x_{\max} - \ln(S) $

#### 3.3 整体算法

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_5b0762425e79.jpg)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_2847473e396d.jpg)

还有一些使用 <strong>CORDIC/MacLaurin</strong>进行 <strong>exp/division</strong> 的实现就比较过时了
