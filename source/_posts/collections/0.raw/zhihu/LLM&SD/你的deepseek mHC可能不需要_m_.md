---
title: 你的deepseek mHC可能不需要_m_
date: "2026-05-06 16:32:04"
updated: "2026-05-06 16:32:04"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/你的deepseek-mHC可能不需要_m_/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---


最近几周在学习deepseek mHC先进经验，捣鼓出一个令人啼笑皆非的实验结论：

论文最关键的算法改进，便是把 
![](https://www.zhihu.com/equation?tex=H%5E%7Bres%7D) 做了manifold constraint, sinkhorn_knopp约束到双随机矩阵，使得前反向传播稳定。
一个自然而然的问题是， 
![](https://www.zhihu.com/equation?tex=H%5E%7Bres%7D) 非要不可吗？
我们发现，直接换成identity效果明显就更好, 
![](https://www.zhihu.com/equation?tex=H%5E%7Bres%7D%3DI) 就行哈哈!
![](https://pic3.zhimg.com/v2-a11731a3dfe22054067127149f6b4674_r.jpg)qwen1.7B from scratch, 150B tokens,部分曲线截图<strong>目前结论是Identity HC > mHC > mHC lite > mHC orthogonal(例如cayley正交)。</strong>实验在qwen3 1.7B和8B dense上完成， 150B tokens, 希望没有megatron coding bug的问题(

单位阵(对角线为1)，其实也是行列和各自为1，谱范数为1，完全norm preserving, 是最简单的“manifold constraint”。直观上，单位阵hres，意思是各个residual流都保留自己的信息，不与其他流交换。实际实验里，我们观察到原版mhc自己学出来的hres大概就是这个pattern:、

- 单层 H_res（depth=1）：接近单位阵（对角线 ~0.96，非对角线 ~0.01）
- 累积乘积（depth≥10）：坍缩为全 0.25 矩阵（均匀混合矩阵
![](https://pic3.zhimg.com/v2-cd9cac191974716ddc47937f86034382_r.jpg)多层hres累积也就是说，SK 学到的单层 hres 可能更接近单位阵一些，但多层连乘后就变成了全 0.25 矩阵。

这背后的数学原因是：当双随机矩阵满足一致正性条件（即所有元素有正的下界 δ > 0）时，其 Dobrushin 遍历系数 τ(P) ≤ 1 - dδ < 1，连乘的遍历系数以几何速率衰减 τ(A_n) ≤ (1 - dδ)^n → 0，迫使所有行趋于一致，最终收敛到均匀矩阵 (1/d)·<strong>11</strong>^T。（严格证明可参考 Dobrushin 遍历系数的次乘性；需要注意的是，如果矩阵序列是纯置换矩阵或可约的，则不满足一致正性条件，不会坍缩——但 Sinkhorn 输出的矩阵通常是严格正的，满足此条件。）

我们直接设成Identity，把他自己学到的单层行为固定下来(接近置换)，但消除了双随机累乘坍缩rank1均匀混合的弊端。

可能有人会argue说hres退化到置换矩阵了，这好嘛？

实际上，mHC的H_res 在不同层学到的可能是不同的近似置换矩阵——比如第1 层是(1,2,3,4)→(3,1,4,2)，第5 层是(1,2,3,4)→(2,4,1,3)。这些不同的置换连乘后，效果等价于一个新的置换。每层做一次流重排，打乱了流的语义一致性。流1在第 1 层之后变成了流 3的位置，第5 层之后又变成了流 2 的位置。H_pre和H_post需要&#34;追踪&#34;每条流在被反复重排后到底在哪个位置，增加了学习难度

Identity 的优势可能在于所有层用同一个恒等置换?

- 流 0 永远在位置 0，流 1 永远在位置 1——流的语义在深度方向上完全一致
- H_pre 和 H_post 不需要适应流的重排，直接学习&#34;从哪条流读、往哪条流写&#34;
- 累积乘积 I^L = I，不会坍缩也不会混乱identity应该是最直观，最朴素的hres实现才是，不知道为什么HC原论文和mHC论文都没有写这个消融 。也许他们做了，hres矩阵的必要性这么关键的消融，我觉得还是有必要写一下的(

先简单介绍一下hyper connection和mHC的背景

标准残差连接Transformer 的每一层是一个恒等映射加上一个变换输出(谢谢resnet)：

![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bx%7D_%7Bl%2B1%7D+%3D+%5Cmathbf%7Bx%7D_l+%2B+f%28%5Cmathbf%7Bx%7D_l%2C+%5Cmathcal%7BW%7D_l%29)

Hyper-Connections（HC）将残差流从 1 条扩展为 n 条（默认n=4），更新公式变为：

![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bx%7D_%7Bl%2B1%7D+%3D+%5Cmathcal%7BH%7D%5E%7B%5Ctext%7Bres%7D%7D_l+%5Ccdot+%5Cmathbf%7Bx%7D_l+%2B+%5Cmathcal%7BH%7D%5E%7B%5Ctext%7Bpost%7D%5C%2C%5Ctop%7D_l+%5Ccdot+f%28%5Cmathcal%7BH%7D%5E%7B%5Ctext%7Bpre%7D%7D_l+%5Ccdot+%5Cmathbf%7Bx%7D_l%2C+%5Cmathcal%7BW%7D_l%29)

其中 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bx%7D_l+%5Cin+%5Cmathbb%7BR%7D%5E%7Bn+%5Ctimes+C%7D) 是 n 条并行的残差流，三个可学习映射分别负责：

映射维度作用H_pren 流 → 1 流n 条流中读入H_post1 流 → n 流写回到 n 条流H_resn 流 → n 流流间信息混合而deepseek的核心创新是将 
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BH%7D%5E%7B%5Ctext%7Bres%7D%7D) 约束到双随机流形上，矩阵行和列和为 1，来做 norm preserving，多层H连乘不会导致信号爆炸，不过也没保证信号不消失hhhh,虽然我实验里mHC谱范数是大致在1附近的。mhc论文里个人感觉最好的点在于，把HC公式给我写明白了，原HC论文属实看不懂；其次，激活函数从tanh换成sigmoid,值域非负是个好文明

![](https://pica.zhimg.com/v2-8d668abf4fee3ab9888fa1170359e296_r.jpg)mHC核心计算过程，清晰简洁论文里sk迭代看起来还是蛮贵的。关键问题是：H_res 到底有多重要？

<strong>实际上，</strong>
![](https://www.zhihu.com/equation?tex=%5Cphi)<strong>才是跨流信息混合的关键。</strong>

它是先把n条残差流flatten ( 
![](https://www.zhihu.com/equation?tex=nC) )，然后全部投影到( 
![](https://www.zhihu.com/equation?tex=n%5E2%2B2n) = 24 )的 
![](https://www.zhihu.com/equation?tex=H) 融合矩阵里，随后再拆分出hpre, hpost, hres (4, 4, 4*4)矩阵

即使 H_res = I ，ϕ生成的 h_pre 也是<strong>input-dependent</strong>的

输入: x_l = [s, b, n*C]  （4 条流 flatten）

Step 1: φ 投影（跨流信息融合已在此发生）
   x̂&#39; · φ → [s, b, 2n]  （identity 模式下只投影 2n=8 维）
   φ 的输入包含了全部 4 条流的信息

Step 2: 激活
   h_pre = sigmoid(α_pre · proj[:n] + b[:n])      ← 动态聚合权重
   h_post = 2·sigmoid(α_post · proj[n:2n] + b[n:2n])  ← 动态扩展权重

Step 3: 聚合（跨流融合的显式体现）
   aggregated = Σ h_pre_i · x_stream_i    ← [s, b, C]

Step 4: 变换
   output = f(aggregated)    ← Attention 或 MLP

Step 5: 恒等残差 + 动态写回
   x_{l+1} = I · x_l + diag(h_post) · f(...)
           = x_l + diag(h_post) · f(...)    ← 每条流独立保持残差
实际上H_res 做双随机约束不仅用处不大，可能还有害，双随机矩阵的累积乘积必然坍缩

根据 Perron-Frobenius 定理，双随机矩阵 H 的特征值满足：最大特征值 
![](https://www.zhihu.com/equation?tex=%5Clambda_1+%3D+1)，其余 
![](https://www.zhihu.com/equation?tex=%7C%5Clambda_i%7C+%3C+1)（只要 H 不是可约的置换矩阵）。L 层累积乘积的最小奇异值：

![](https://www.zhihu.com/equation?tex=%5Csigma_%7B%5Cmin%7D%5Cleft%28%5Cprod_%7Bl%3D1%7D%5EL+H_l%5Cright%29+%5Clesssim+%5Cprod_%7Bl%3D1%7D%5EL+%7C%5Clambda_%7B%5Cmin%7D%28H_l%29%7C)

当 
![](https://www.zhihu.com/equation?tex=%7C%5Clambda_%7B%5Cmin%7D%7C+%3C+1) 时，这个乘积指数衰减到零。实验在 Qwen3-1.7B（28 层，56 个 HC 模块）上，Sinkhorn 版本的 H_res 最小特征值均值为 0.49。粗略估计：

![](https://www.zhihu.com/equation?tex=%5Csigma_%7B%5Cmin%7D+%5Csim+0.49%5E%7B56%7D+%5Capprox+10%5E%7B-17%7D)

实测值为 <strong>9.2 × 10⁻¹⁸</strong>——与估计吻合。这意味着浅层信号经过 56 个 HC 模块后，除均值方向外信号很可能衰减没了。不过这也未尝不是一件好事(

也可以看本文第一张累积Hres图：10 层之后，4 条流的信息完全坍缩为均值0.25 ——混合最终变成了同质化。

20 步 Sinkhorn-Knopp 迭代来近似投影到双随机矩阵流形。但 20 步不保证收敛：我们实测行和的标准差为 0.12，这个误差会在多层中累积。mHC-lite也说，约 27.9% 的 Sinkhorn 输入的 relative range 
![](https://www.zhihu.com/equation?tex=1%2F%5Cnu+%5Cgeq+10%5E%7B13%7D)，此时 20 步迭代后列和偏差可达 100%。

所以，当我们取 H_res = I 时：

指标SinkhornIdentity累积乘积rank-1 坍缩（κ = 10¹⁷）I（κ = 1）近似误差行和 std = 0.12精确额外计算20 步迭代 + 反向 recompute零额外参数nC \times n^2 投影权重无信号传递浅层信号指数衰减无损传递(好吧，其实上面部分文字是ai的，比如这个表格hh，但是实验数据是我们实打实跑出来的

本来我一直在捣鼓各种mhc lite变体，怎么试都不如原版mhc,大为苦恼。某天下午王老师一语点醒梦中人 [@王阳](https://www.zhihu.com/people/69eb361e8dc44e548e00c74a013429e1) ，说不如试试identity得了，实验试下来一看，哈哈哈哈，一看一个不吭声(x

失败的尝试有：试过mHC lite凸组合做精确双随机，softmax加权，看上去非常有道理。不过我在qwen3 1.7B上怎么尝试效果都不如原版mHC(悲。后来看内科观察到，alpha_res 增大时(init 0.01逐步增长到2附近，softmax 温度降低，输出趋向 one-hot，mixing变少了？

也试过做正交化(cayley变换，givens旋转), 保证谱范数恒为1，不爆炸不消失。实验发现alpha res几乎不动了，停在0.01附近。正交最要命的是，它允许了负值，某些流可能会被取反，容量坍缩学废了，引发了一些不好看的内科指标问题

最后share一些opus老师画的实验分析图吧hh，看着还挺有趣的

例如mHC里任意两层之间的有效信道大小, 衡量层 i 的变换输出有多少信号能传递到层 j 的变换输入。

![](https://www.zhihu.com/equation?tex=c_%7Bij%7D+%3D+%5Cmathbf%7Bh%7D_j%5E%7B%5Ctext%7Bpre%7D%7D+%5Ccdot+%5Cleft%28%5Cprod_%7Bk%3Di%2B1%7D%5E%7Bj-1%7D+H_k%5E%7B%5Ctext%7Bres%7D%7D%5Cright%29+%5Ccdot+%5Cmathbf%7Bh%7D_i%5E%7B%5Ctext%7Bpost%7D%5C%2CT%7D) 

![](https://pica.zhimg.com/v2-cc2c4c7f03ea9310d8d9e000cf88bb6a_r.jpg)layer gap 1-15）信道强度维持在 0.3~0.5// gap > 20 后明显衰减//log scale 下近似线性衰减
![](https://pic3.zhimg.com/v2-638c516d3d534a5bed674eb1c1cc2348_r.jpg)呈现"中间层辐射、深层汇聚"的模式：模块 20-40 是核心信息枢纽（outgoing 最强），最后几层（44-55）几乎不发射（outgoing ≈ 0）但大量接收，浅层（0-10）信号较弱。当 H_res = I 时，信道公式简化为：

![](https://www.zhihu.com/equation?tex=c_%7Bij%7D+%3D+%5Cmathbf%7Bh%7D_j%5E%7B%5Ctext%7Bpre%7D%7D+%5Ccdot+I+%5Ccdot+%5Cmathbf%7Bh%7D_i%5E%7B%5Ctext%7Bpost%7D%5C%2CT%7D+%3D+%5Cmathbf%7Bh%7D_j%5E%7B%5Ctext%7Bpre%7D%7D+%5Ccdot+%5Cmathbf%7Bh%7D_i%5E%7B%5Ctext%7Bpost%7D%5C%2CT%7D)

任意两层之间的直达通信强度只取决于它们各自的 h_pre 和 h_post，不受中间层 H_res 的累积衰减影响

行文匆匆，未免有不少纰漏，尤其是挪用了不少ai生成的文字，我没有逐字校对，但实验现象，结论和大致思路应该是大差不差的。

总之，把deepseek mhc里的m扔掉，换成古朴的identity就行。换个角度想，其实这样也不用苦一苦infra，去开发什么sinkhorn-knopp tilelang kernel, 皆大欢喜!