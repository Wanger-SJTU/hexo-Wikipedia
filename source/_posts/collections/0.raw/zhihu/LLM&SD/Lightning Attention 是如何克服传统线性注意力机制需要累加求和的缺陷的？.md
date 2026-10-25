---
title: Lightning Attention 是如何克服传统线性注意力机制需要累加求和的缺陷的？
date: "2025-01-16 00:00:00"
updated: "2025-01-16 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/Lightning-Attention-是如何克服传统线性注意力机制需要累加求和的缺陷的/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/9740764576/answer/80735153803
---


1/18 update: 做了一个视频介绍linear attention一些近期进展

[[Talk][中文] What&#39;s next to Mamba? Towards more expressive recurrent update rule_哔哩哔哩_bilibili](https://link.zhihu.com/?target=https%3A//www.bilibili.com/video/BV1MDwAeWEoM/%3Fvd_source%3D035872531a338721ba64a57a1cdc1ebc)--- 分割线 ---

看来大家对linear attention的一些经典算法和发展历史都了解甚少。。。忍不了来写个睡前回答

其实linear attention的思想很简单，就是把 

![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BO%7D+%3D+%5Coperatorname%7Bsoftmax%7D%28%5Cmathbf%7BQ%7D%5Cmathbf%7BK%7D%5E%5Ctop%29+%5Cmathbf%7BV%7D) 

的softmax去掉，变成了

![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BO%7D+%3D+%28%5Cmathbf%7BQ%7D%5Cmathbf%7BK%7D%5E%5Ctop%29+%5Cmathbf%7BV%7D) 

然后借助矩阵乘法结合律得到

![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BO%7D+%3D+%5Cmathbf%7BQ%7D%28%5Cmathbf%7BK%7D%5E%5Ctop+%5Cmathbf%7BV%7D%29) 

在双向注意力里，比方说古代的bert时期，以及计算机视觉领域中，这样就已经足够了，大家开开心心地在线性时间内算两个很大的矩阵乘法，甚至都不需要写kernel就能很高效

但是在autoregressive modeling中，我们需要有causal mask。 训练和推理的形式分别是：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Balign%2A%7D+%5Cmathbf%7BO%7D+%26%3D+%5Coperatorname%7Bsoftmax%7D%28%5Cmathbf%7BQ%7D%5Cmathbf%7BK%7D%5E%5Ctop+%5Codot+%5Cmathbf%7BM%7D%29+%5Cmathbf%7BV%7D+%26%26%5Cin+%5Cmathbb%7BR%7D%5E%7BL%5Ctimes+d%7D+++%5C%5C+%5Cmathbf%7Bo_t%7D+%26%3D+%5Csum_%7Bj%3D1%7D%5Et+%5Cfrac%7B%5Cexp%28%5Cmathbf%7Bq%7D_t%5E%5Ctop+%5Cmathbf%7Bk%7Dj%29%7D%7B%5Csum_%7Bl%3D1%7D%5Et%5Cexp%28%5Cmathbf%7Bq%7D%5E%5Ctop_t+%5Cmathbf%7Bk%7D_l%29%7D%5Cmathbf%7Bv%7D_j++%26%26+%5Cin+%5Cmathbb%7BR%7D%5Ed+%5Cend%7Balign%2A%7D) 

同样地，把去掉softmax之后，我们可以得到

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Balign%7D%5Cmathbf%7BO%7D+%26%3D+%28%5Cmathbf%7BQ%7D%5Cmathbf%7BK%7D%5E%5Ctop+%5Codot+%5Cmathbf%7BM%7D%29+%5Cmathbf%7BV%7D+%26%26+%5Cin+%5Cmathbb%7BR%7D%5E%7BL+%5Ctimes+d%7D+%5C%5C+%5Cmathbf%7Bo%7D_t+%26%3D+%5Csum_%7Bj%3D1%7D%5Et+%28%5Cmathbf%7Bq%7D_t%5E%5Ctop+%5Cmathbf%7Bk%7D_j%29+%5Cmathbf%7Bv%7D_j+%26%26+%5Cin+%5Cmathbb%7BR%7D%5Ed+%5Cend%7Balign%7D) 

由于这个 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BM%7D) 的存在，我们不能直接利用矩阵乘法的结合律得到上面先算KV矩阵乘法的线性形式（因为矩阵乘法跟矩阵点乘是不可以交换的）。另外提一下，很多早期的线性注意力的文章都有QK上的activation function（被称为kernel function，因为是从softmax attention的softmax operator的kernelization的角度出发的，跟传统机器学习的kernel method异曲同工），并且有一个整体的normalization的分母项。但在[The Devil in Linear Transforme](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.10340)r 中证明了分母带来数值问题，所以在最近的linear attention中几乎全部去掉了，取而代之的是加上output normalization。另外，[Fine-Tuning Pre-trained Transformers into Decaying Fast Weights](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.04243)发现QK的activation啥也不设就good enough，后续的RetNet/GLA也不用激活函数，所以这两个term都省掉了）

在自回归linear attention的开山之作

[Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2006.16236) 

当中指明了，linear attention的inference形式可以写成RNN的形式：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Baligned%7D+%26%26%26%26%5Cmathbf%7Bo%7D_t+%26%3D+++%5Csum_%7Bj%3D1%7D%5Et+%5Cmathbf%7Bv%7D_j%28%5Cmathbf%7Bk%7D_j%5E%5Ctop+%5Cmathbf%7Bq%7D_t%29++%26%26%26%26%26+%5Cmathbf%7Bk%7D_j%5E%5Ctop+%5Cmathbf%7Bq%7D_t+%3D+%5Cmathbf%7Bq%7D_t%5E%5Ctop+%5Cmathbf%7Bk%7D_j+%5Cin+%5Cmathbb%7BR%7D+%5C%5C+%26%26%26%26%26%3D+%5Cunderbrace%7B%28%5Csum_%7Bj%3D1%7D%5Et%5Cmathbf%7Bv%7D_j%5Cmathbf%7Bk%7D_j%5E%5Ctop%29%7D_%7B%5Ctext%7B%E8%AE%B0%E4%BD%9C%7D+%5Cquad%5Cmathbf%7BS%7D_t+%5Cin+%5Cmathbb%7BR%7D%5E%7Bd%5Ctimes+d%7D%7D%5Cmathbf%7Bq%7D_t+%26%26%26%26%26+%5Ctext%7BBy+associativity%7D+%5Cend%7Baligned%7D+) 

那么不难看出，linear attention自回归计算output的过程可以写成一个RNN

![](https://www.zhihu.com/equation?tex=+%5Cmathbf%7BS%7D_t+%3D+%5Cmathbf%7BS%7D_%7Bt-1%7D+%2B+%5Cmathbf%7Bv%7D_t%5Cmathbf%7Bk%7D_t%5E%5Ctop+%5Cin+%5Cmathbb%7BR%7D%5E%7Bd%5Ctimes+d%7D%2C+%5Cquad+%5Cmathbf%7Bo%7D_t+%3D+%5Cmathbf%7BS%7D_t+%5Cmathbf%7Bq%7D_t+%5Cin+%5Cmathbb%7BR%7D%5E%7Bd%7D) 

这样我们就可以通过训练RNN的形式，在线性的时间内训练线性注意力。

<strong>但是如果用这种最基本的循环来训练有非常多的问题。</strong>

第一点，如果使用autograd，那么，每一个时刻的hidden state 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BS%7D_t) 都会被保存下来给反向传播算梯度。保存中间hidden state在之前的RNN训练里面没啥问题，<strong>但是在这里却是一个大问题。</strong>为什么呢？因为传统RNN 每个时刻的hidden state的大小是 
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BO%7D%28d%29) ，而linear attention每个时刻的hidden state大小是 
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BO%7D%28d%5E2%29) ，如果全部存下来需要 
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BO%7D%28Ld%5E2%29) ，那是万万不可接受的（你可以想象，输入的QKV才3Ld, 一般d>>3, 那么你基本就显存爆炸寄了不用玩了）

[Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2006.16236) 里面提出了一个<strong>memory-efficient 训练的解决方案。</strong>

在这个方案里， 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BS%7D_t) 在前向传播的过程中是不会被保存的。 由于只有 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bq%7D_%7Bt%7D) 的梯度依赖于 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BS%7D_t) 。那我们索性在backward的时候重新算一遍 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BS%7D_t) ，但这时的output算的不是 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bo%7D_t)，而是 
![](https://www.zhihu.com/equation?tex=+%5Cmathbf%7Bdq%7D_t+%3D+%5Cmathbf%7BS%7D_t+%5Cmathbf%7Bdo%7D_t) 

而 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bk%7D_t%2C+%5Cmathbf%7Bv%7D_t) 的梯度不依赖于 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BS%7D_t) ，可以直接通过平常的BPTT来算出来。

![](https://picx.zhimg.com/v2-cb7e5d922bb6c210c0330ba36abe282c_r.jpg?source=2c26e567)到此为止，memory的问题解决了。

<strong>第二个问题</strong>，循环训练并行度太差了。此外，linear attention的recurrent update全部都是element-wise的操作（外积，点乘，...），根本没有一丁点矩阵乘法的影子，而矩阵乘法在GPU上非常高效（相同数量的FLOPs,在A100上用tensor cores算半精度矩阵乘法的效率是其他操作的16倍，所以现代的算法都是怎么矩阵乘法怎么来，这也是为什么注意力机制最先被提出来，然后直接席卷deep learning，因为它训的快呀。）

在parallel形式中，我们不需要算任何hidden state，只通过Q K V来得到output，但是需要 
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BO%7D%28L%5E2%29) 复杂度。在Recurrent形式中，我们需要算每个time step的hidden state，但是只需要 
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BO%7D%28L%29) 的复杂度。

那么存不存在一个介于两者之间算法，能够减少recurrent state的数量从而减少循环的次数，同时复杂度依然是线性的呢？ 答案就是linear attention的第三种形式：chunkwise parallel form（最早应该是在[Transformer Quality in Linear Time](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2202.10447) 提出的，现在所有的线性注意力训练都是基于chunkwise parallel form）。当chunk size C=1的时候，它和recurrent form等价，当C=L的时候，它跟parallel form等价。这是一个exact的算法，而不是一个approximate的算法，所以chunk size不影响output的大小（我在给talk的时候发现很多人有这样的疑问，觉得chunkwise算法是approximate的，所以在这里需要特别强调一下。）

核心思想如下：

- 把input序列分成若干个大小为C的等长chunk，只算每个chunk最后的hidden state
- 在chunk-level的hidden state上进行recurrence
- 每个chunk通过前一个chunk的last hidden state来aggregate历史信息，在chunk内部则是用一个attention的parallel形式直接得到output，而不是通过当前hidden state来算output。
![](https://pic1.zhimg.com/v2-d758f3ea2cf42cc6df4914f3fac7f469_r.jpg?source=2c26e567)

更加formal的来说，记 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BS%7D_%7B%5Bi%5D%7D+%3A%3D+%5Cmathbf%7BS%7D_%7BiC%7D) 为第i个chunk最后的state （C是chunk size别忘了）， 记
![](https://www.zhihu.com/equation?tex=%5Csquare_%7B%5Bi%5D%7D+%3D+%5Csquare_%7BiC%2B1%3A%28i%2B1%29C%7D+%5Cin+%5Cmathbb%7BR%7D%5E%7BC+%5Ctimes+d%7D) for 
![](https://www.zhihu.com/equation?tex=%5Csquare+%5Cin+%5C%7B%5Cmathbf%7BQ%7D%2C+%5Cmathbf%7BK%7D%2C+%5Cmathbf%7BV%7D%2C+%5Cmathbf%7BO%7D%5C%7D)为 QKVO对应的chunk submatrix，

记
![](https://www.zhihu.com/equation?tex=%5Csquare_%7B%5Bi%5D%7D%5Er+%3D+%5Csquare_%7BiC%2Br%7D) 为第i个chunk第r个位置上的token对应的表示，那么这个过程可以写成：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Balign%2A%7D+%5Cmathbf%7BS%7D_%7B%5Bi%5D%7D%5Er+%26%3D+%5Cmathbf%7BS%7D_%7B%5Bi%5D%7D+%2B+%5Csum_%7Bt%3D1%7D%5E%7Br%7D+%5Cmathbf%7Bv%7D_%7B%5Bi%5D%7D%5Et+%5Cmathbf%7Bk%7D_%7B%5Bi%5D%7D%5E%7Bt%5Ctop%7D+%5C%5C+%5Cmathbf%7Bo%7D_%7B%5Bi%5D%7D%5Er+%26%3D+%5Cmathbf%7BS%7D_%7B%5Bi%5D%7D%5Er+%5Cmathbf%7Bq%7D_%7B%5Bi%5D%7D%5Er+%3D+%5Cmathbf%7BS%7D_%7B%5Bi%5D%7D%5Cmathbf%7Bq%7D_%7B%5Bi%5D%7D%5Er+%2B+%5Csum_%7Bt%3D1%7D%5E%7Br%7D+%5Cmathbf%7Bv%7D_%7B%5Bi%5D%7D%5Et+%28%5Cmathbf%7Bk%7D%5E%7Bt%5Ctop%7D_%7B%5Bi%5D%7D+%5Cmathbf%7Bq%7D_%7B%5Bi%5D%7D%5Er%29+%5Cend%7Balign%2A%7D+) 

然后又注意到，外积的和可以用矩阵乘法表示： 
![](https://www.zhihu.com/equation?tex=%5Csum_%7Bt%3D1%7D%5E%7BC%7D+%5Cmathbf%7Bv%7D_%7B%5Bi%5D%7D%5Et+%5Cmathbf%7Bk%7D_%7B%5Bi%5D%7D%5E%7Bt%5Ctop%7D+%3D+%5Cmathbf%7BV%7D_%7B%5Bi%5D%7D%5Cmathbf%7BK%7D_%7B%5Bi%5D%7D%5E%5Ctop) ，

这样，整个上面的过程可以写成下面的形式：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Balign%2A%7D+%5Cmathbf%7BS%7D_%7B%5Bt%2B1%5D%7D+%26%3D+%5Cmathbf%7BS%7D_%7B%5Bt%5D%7D+%2B+%5Cmathbf%7BV%7D_%7B%5Bt%5D%7D%5E%5Ctop+%5Cmathbf%7BK%7D_%7B%5Bt%5D%7D+%26%26+%5Cin+%5Cmathbb%7BR%7D%5E%7Bd%5Ctimes+d%7D+%5C%5C+%5Cmathbf%7BO%7D_%7B%5Bt%5D%7D+%26%3D+%5Cmathbf%7BQ%7D_%7B%5Bt%5D%7D+%5Cmathbf%7BS%7D_%7B%5Bt%5D%7D%5E%5Ctop+%2B+%28%5Cmathbf%7BQ%7D_%7B%5Bt%5D%7D%5Cmathbf%7BK%7D_%7B%5Bt%5D%7D%5E%5Ctop+%5Codot+%5Cmathbf%7BM%7D%29+%5Cmathbf%7BV%7D_%7B%5Bt%5D%7D+%26%26+%5Cin+%5Cmathbb%7BR%7D%5E%7BC%5Ctimes+d%7D+%5Cend%7Balign%2A%7D) 

Chunkwise parallel form的核心优势在于：

- 总共的循环的次数由recurrent form的L 降低到了 L/C
- 在C是16的倍数的情况下，我们可以利用tensor cores来加速整体计算
- 整体的复杂度是 
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BO%7D%28Ld%5E2%2BLCd%29) 。在C固定的情况下，整体复杂度对sequence length L是线性的。（通常情况下，C取64，128，或者256这三个值来balance整体的计算复杂度和并行度）这个过程可以用下图表示：

![](https://picx.zhimg.com/v2-66f97dd36c2124b5bdaa88433043dfec_r.jpg?source=2c26e567)from https://sustcsonglin.github.io/blog/2024/deltanet-2/这样，我们linear attention循环训练的第二个痛点：没有序列上的并行度，以及不能利用tensor core加速的问题也解决啦。

但是，如果仅仅用pytorch来实现chunkwise算法的话，速度会跟flashattention有一定的差距，这是因为我们没有进行I/O cost的优化。比方说，每次算output的时候， 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BQ%7D_%7B%5Bt%5D%7D+%5Cmathbf%7BS%7D_%7B%5Bt%5D%7D%5E%5Ctop+%2B+%28%5Cmathbf%7BQ%7D_%7B%5Bt%5D%7D%5Cmathbf%7BK%7D_%7B%5Bt%5D%7D%5E%5Ctop+%5Codot+%5Cmathbf%7BM%7D%29+%5Cmathbf%7BV%7D_%7B%5Bt%5D%7D) 加号两边的 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BQ%7D_%7B%5Bt%5D%7D) 明显可以复用：只需要load一遍省去重复读取的开销。同时，我们中间的attention矩阵 
![](https://www.zhihu.com/equation?tex=%28%5Cmathbf%7BQ%7D_%7B%5Bt%5D%7D%5Cmathbf%7BK%7D_%7B%5Bt%5D%7D%5E%5Ctop+%5Codot+%5Cmathbf%7BM%7D%29) 也没有必要写到HBM里面去，可以在SRAM里面一次做了。 诸如此类的I/O优化还有很多，在这里我就不一一列举啦。Flashattention的成功正是靠着fused kernel的I/O优化：

![](https://pica.zhimg.com/v2-6a2c4fe336ad78746ff7c6b8fc2b2f7a_r.jpg?source=2c26e567)在[Gated Linear Attention Transformers with Hardware-Efficient Training](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2312.06635) 中，我们提到了两种chunkwise linear attention的硬件优化方式：

第一种是

![](https://picx.zhimg.com/v2-c0e1aff84b8817162eb13333ea3509a7_r.jpg?source=2c26e567)flash linear attention (nonmaterialization version)这个方式总共的I/O读取是最少的，因为每个QKV block都只被读了一次，而hidden state从始至终都没有被在SRAM里面，没有被写到HBM里面一次过。这样，如果batch size和number of head提供的并行度足够大，我们用这种方式来训练linear attention就已经绰绰有余了。

![](https://picx.zhimg.com/v2-01f0b8f1a3996634662ca6d6f708bbf1_r.jpg?source=2c26e567)I/O优化可以有4倍的运行速度的提升。但是呢，在大规模训练里面，batch size往往很小，batch size x num_head 乘起来可能还没有GPU里的Streaming Multiprocessors的数量多，“喂不饱”GPU，并行度没打满。

这就需要我们有sequence dimension上面的并行度（这也是flashattention2的核心思想）。针对这个常见的case（large-scale training几乎单卡的batch size都开不大），我们可以用到另外一种materialize hidden state的形式，可以分为两步：

![](https://picx.zhimg.com/v2-f1a958efb7f5cd4e9c9cf220d9cb028f_r.jpg?source=2c26e567)
- 第一步：我们只算hidden state，并且materialize chunk-level state。
- 第二步：我们对于每个chunk来并行计算output，打满并行。这样我们就拥有了sequence length上的并行度，很有利于小batch，long sequence的场景。

第一个I/O-aware的算法也基本和同期工作lightningattention的思想一致（我跟lightningattention一作[@Doraemonzz](https://www.zhihu.com/people/ea59b7e0726d2e15c54e2a87e334d6f6) 交流很多。如果我没记错的话，lightningattention第一版应该是没有第二种materialization版本的形式的，只有第一种的fused chunkwise form，没有sequence维度上的并行。）

此外，lightning attention主要是为了[Transnormer](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2307.14995)架构服务的（[retnet](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2307.08621)同期工作，都是linear attention + scalar-valued data-independent decay for each chunk)，所以他们的算法里，还需要把decay的term考虑进去。这个credits公道来讲，是要给retnet的：

![](https://picx.zhimg.com/v2-ffb3eef860974cb841611f673f6d6431_r.jpg?source=2c26e567)
![](https://pic1.zhimg.com/v2-2bda3ebfa1b906fce29da1f8a99da694_r.jpg?source=2c26e567)retnet让很多人第一次注意到chunkwise的形式（包括当时年幼刚踏进序列建模的sonta）而且decay的融入法很有insight，直接启发了mamba2的chunkwise算法（跟retnet的没啥区别，只不过data-indepedent decay变成了data-dependent decay)。GLA则是融入了一些更加fine-grained的decay term，chunkwise算法跟retnet的算法也大差不差。

最后值得一提是，我们上面的I/O-aware算法并不一定是最优的(比方说kernel大师tridao教育我，第二个版本每个chunk计算量太小了，应该同时多算几个chunk，再存一个final state，来增强计算intensity。xLSTM团队应该也采用了类似的思路来优化他们的mLSTM训练)，但核心思路都大差不差，都是基于chunkwise的算法。Minimax分布式chunkwise训练也是自然的推广。

最后，我和 [@yzhangcs](https://www.zhihu.com/people/8d5f4c3b705ef7df799b680515700468)维护的[https://github.com/fla-org/flash-linear-attention](https://link.zhihu.com/?target=https%3A//github.com/fla-org/flash-linear-attention) 就旨在把chunkwise算法科普到户，<strong>让整个领域没有人再用hardware-inefficient的recurrent form来训linear attention （</strong>比方说已经教育了hazyresearch的好姐妹；xlstm团队；rwkv团队等等来用chunkwise算法训他们的线性注意力 XD）。