---
title: "Softmax 算法近似与硬件实现"
date: 2026-01-01
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/1948746945867802457
---

Softmax 算法近似与硬件实现

龙云李

Dataflow is all u need.

收录于 · 龙云李的 AI Accelerator

108 人赞同了该文章

​目录

本文主要调研如何通过硬件实现 LLM 中的 softmax 函数

1. Piecewise Linear Fitting (PLF)

1.1 一阶近似
参考《Hardware-efficient Softmax Approximation for  Self-Attention Networks》

σ(zi)=ezi−zmax∑j=1Nezj−zmaxfor i=1,2,…,N\sigma(z_i) = \frac{e^{z_i - z_{\max}}}{\sum_{j=1}^{N} e^{z_j - z_{\max}}} \quad \text{for } i = 1, 2, \ldots, N \\

计算分为三个阶段，并有很强的数据相关性，因此很难流水线化和并行化；同时 exp 和 division 操作硬件不友好：

本文用如下 e 指数实现方法：

ey=2y⋅log2⁡e=2u⋅2ve^y = 2^{y \cdot \log_2 e} = 2^u \cdot 2^v\\

其中 u 表示 integer，v 表示 fraction。 2v2^v 通过线性近似的方式实现， 2u2^u 通过移位的方式实现。

算法实现
硬件电路实现首先将输入数据量化为 5-bit integer + 11-bit fraction，Max Block 通过比较器树( 并行度为n，分 batch 进行 )实现，并且只比较 integer 部分( Line 1 )，为了弥补 fraction，给 Max Block 输出的值加1( Line 2 )。然后相减( Line 5 )。

Line6 乘以 1.5，是将 log_2e 近似为 1.5，在硬件上乘以 1.5 等于右移相加，非常硬件友好。此时 mul   0，frac 属于[-1,0]，因此 2^n 可以用 n/2+1 近似，然后再右移 integer 来实现 \times 2^{int} ( Line 7 )。并使用加法树来实现输出结果的累加( Line 8 )。

Round 模块将加法树的输出进行 round 到最近的 2 的 n 次幂( Line 10 )。最后每个输出右移来实现除法运算( Line 12 )。这种 Base-2 的近似方法参考《Base-2 Softmax Function: Suitability for Training and Efficient Hardware Implementation 》

剪枝优化：

由于硬件资源的限制，只能分 batch 进行 softmax 操作。同时由于填充和人类语言的冗余性，所以可以对输入进行剪枝。因为 softmax 是一个单调函数，因此将小输入值过滤掉即可

输入输出的结果分布，输出结果大量分布在0附近有两种方法：

- 从 N 个输入中选择 k 个最大的( 哈哈，这个可以用 sorting network 来做 )
- 计算出平均值，小于平均值就过滤( 本文采用的方法 )使用法二的话就可以分为两步：1. 计算均值 2. 输入过滤

计算均值可以使用 Adder tree 来完成。回顾上文在计算最大值的时候，Adder tree 此时空闲，因此可以复用硬件，0 tradeoff。

输入过滤使用如下电路实现，但是没讲 b 图的实现细节，应该要用到一堆桶形移位器：

运算器生成移位量，然后进行移位结果评估：

Ours 1 为不剪枝，Ours 2 为剪枝可以看到这种近似计算方式在许多 LLM 中不会造成精度明显下降。

1.2 高阶近似
参考《SystolicAttention: Fusing FlashAttention within a  Single Systolic Array》

本文和《Hardware-efficient Softmax Approximation for  Self-Attention Networks》用的类似的方法，拆分为 integer 和 fraction 两部分，integer 通过移位实现。与之不同的是，fraction 部分本文采用了更精确的8段线性拟合的方式，而不是直接近似为n/2+1。

exp2(x) \approx 2^{x_i} \cdot (slope_k \cdot x_f + intercept_k), \quad k \in [0, 8].\\

因为本文是将 softmax 和 SA 做融合，因此进行8段线性拟合的计算也可以复用 SA 硬件电路。

复用 SA 电路实现 softmax 线性拟合
2. Log-Sum-Exp

2.1 mod2 log-sum-exp
参考《Efficient Precision-Adjustable Architecture for  Softmax Function in Deep Learning》

 首先使用 Ln 域变换将除法干掉：softmax(x_i) = \frac{e^{x_i}}{\sum_{j=1}^{N}e^{x_j}} = \frac{e^{x_i - x_{max}}}{\sum_{j=1}^{N}e^{x_j - x_{max}}}\\ softmax(x_i) = exp(x_i - x_{max} - ln(\sum_{j=1}^{N}e^{x_j - x_{max}}))\\但仍然存在 exp 和 ln 两个硬件不友好的非线性函数

使用 PLF 消掉 exp：

e^{-x_i} = 2^{-x_i \cdot \log_2 e}, x_i \ge 0.\\e^{-x_i} = 2^{(-u_i)+(-v_i)} = 2^{-u_i} \cdot 2^{-v_i} = 2^{-v_i} \gg u_i.\\与前面一样，vi 为 fraction \subset (0,1] ，ui 为 integer。 2^{-v_i} 用一阶线性近似。用高 p 位作为 index 来决定使用的 k b。0.10111 是 log_2e 的二进制。

exp 整体近似计算算法然后使用如下算法消掉 ln：

F = \sum_{j=1}^{N} e^{x_j-x_{\max}} \ge e^{x_{\max}-x_{\max}} = 1.\\ \forall F \ge 0, \exists !(m,w): F = 2^w \cdot m.\\ \ln F = \ln 2 \cdot \log_2 F = \ln 2 \cdot (w + \log_2 m).\\ \log_2 m \approx m - 1, m \in [1, 2).\\ \ln F = \ln 2 \cdot (m - 1 + w).\\硬件上寻找 w 和 m 只需要一个 leading-one detector 和 shifter。

整体算法如下：

整体算法
整体电路实现
EU 微架构，使用 LUT 暂存 k b
LNU 电路实现在本算法中 \ln F = \ln 2 \cdot (m - 1 + w) ，m-1 和 w 刚好分别占据小数位和整数位，因此可以直接拼接而成，无需加法器。

还有一个对于 1.0111 乘法的优化：

1.0111\times A=A+(A  1)-(A  4)\\ =A+(A  1)+1+(\sim(A  4))\\ =A+(A  1)+(\sim(A  4))+1\\

电路实现
2.2 兼容 systolic 数据流的电路实现
参考《COSA:Co-Operative Systolic Arrays for  Multi-head Attention Mechanism in Neural  Network using Hybrid Data Reuse and Fusion  Methodologies》

 使用如下变换：softmax(x_i) = \frac{e^{x_i}}{\sum_{j=1}^{N}e^{x_j}} = \frac{e^{x_i - x_{max}}}{\sum_{j=1}^{N}e^{x_j - x_{max}}}\\ softmax(x_i) = exp(x_i - x_{max} - ln(\sum_{j=1}^{N}e^{x_j - x_{max}}))\\ ln(x) = ln(2^q s) = qln2 + lns = 0.1011*q+s-1+c \\变换后 s 的范围是(1,2]，c 是补偿项。

电路结构本文使用了 SA 进行计算，为了兼容 SA 输出数据流，Softmax unit 也使用 systolic 式的数据流。LN 的电路由 LOD( leading 1 detector ), SF( shifter ), CM( constant multiplier ), LUT( 补偿值查表计算 ), ADD( 全部加起来 ) 构成。

3. improved with penalties (ISP)
基于 Log-Sum-Exp 加入 penalty 进行精度优化。参考《SoftAct: A High-Precision Softmax Architecture for Transformers Supporting Nonlinear Functions》

3.1 算法实现
Log-Sum-Exp 的方法在硬件上有以下问题：

- \log_2 m \approx m - 1 有 14.78% 的误差
- log_2e 的计算在硬件上近似为 1.0111 存在误差
- ln2     的计算在硬件上近似为 0.1011 存在误差在 attention 实现中 softmax 很普遍且作为权重，因此对精度有很高要求。

引入误差项，优化 log_2e :

err_0 = \log_2(e) - \log_2(e)_h,\\ \exp(-x_i) = 2^{-x_i \cdot (\log_2(e)_h + err_0)} = 2^{-x_i \cdot err_0} \times 2^{-x_i \cdot \log_2(e)_h}.\\\exp(-x_i) = 2^{\frac{-err_0(n_i+f_i)}{\log_2(e)_h}} \times 2^{-(n_i+f_i)}  = 2^{-n_i \cdot \frac{err_0}{\log_2(e)_h}} \times 2^{-f_i \cdot \left(1+\frac{err_0}{\log_2(e)_h}\right)} \gg n_i,\\ P_{ov} = 2^{-n_i \cdot \frac{err_0}{\log_2(e)_h}} ~~~~~~P_{in} = \frac{err_0}{\log_2(e)_h}\\ 使p_0=n_i\\ exp_{p_0}(-x_i) = P_{ov} \times 2^{-f_i(1+P_{in})} \gg n_i  = P_{ov} \times (k \cdot f_i + b) \gg n_i\\同理优化 ln2 :

err_1 = \ln(2) - \ln(2)_h,\\ \ln(S) = (\ln(2)_h + err_1) \cdot \log_2(u \cdot 2^v) = (\ln(2)_h + err_1) \cdot v + \ln(2) \cdot \log_2(u),\\ P_{ln} = err_1 \cdot v.\\ 使p_1=v\\ \ln_{p_1}(S) = \ln(2)_h \cdot v + (k' \cdot u + b') + P_{ln}\\

最终得到 ISP 表达式：

x′_i = x_i − x_{max}\\ f_{p_0p_1}(x_i) = exp_{p_0}\left(x'_i - \ln_{p_1}\left(\sum_{j=0}^{N-1} exp_{p_0}(x'_j)\right)\right)\\ 其中 p_0,p_1 可以通过分析输入数据特征而 offline 地确定。本文设定

p_0=4\\ p_1 = \begin{cases}     0,   \text{if } v   3 \\     th,   \text{if } v \ge 3 \end{cases}\\

3.2 跳零
QK^T 计算后经过量化执行 softmax 操作。

\frac{P - min}{max - min}   2^{-n}.\\

因此如果量化后为0可以直接跳过 softmax 计算：

stage1跳零的条件：

\exp(x_i - x_{\max})   2^{-n} \implies x_i - x_{\max}   -n \cdot \ln(2). \\

stage3跳零的条件： 

 x_i - x_{\max} - \ln(S)   -n \cdot \ln(2).\\

3.3 整体算法

还有一些使用 CORDIC/MacLaurin 进行 exp/division 的实现就比较过时了

编辑于 2026-01-01 16:03・四川
大语言模型

AI芯片

非线性函数

​赞同 108​​9 条评论​317 ​1 ​分享

​申请转载​​

未登录用户

9 条评论

默认
最新

yahah

​

fa4是不是也做了一个近似
2025-09-16 · 广东

​回复​1

AwAy

fa4用blackwell mufu实现的还是exp2数学等价变换，fa4本身没有引入近任何近似，即使有近似也是mufu带来的
2025-09-17 · 上海

​回复​2

yahah

​

AwAy

2025-09-17 · 广东

​回复​喜欢

阿龙aloong

​

强啊
01-20 · 中国香港

​回复​喜欢

小毛

你的有些工作的近似方法没在llm上做精度验证，TCAS2、dac上面有一系列softmax硬件相关的工作，一直到今年还有人在做。我正好之前看过一段时间这个玩意儿。
2025-10-07 · 重庆

​回复​喜欢

Waldeinsamkeit

你好，我想请问下“通过分析输入数据特征而 offline 地确定”这里是要怎么理解？为什么能像本文这样去设定p0和p1的值

2025-09-17 · 浙江

​回复​喜欢

龙云李

作者

如果在实际运行过程中算，那又需要增加一堆硬件电路，成本太高了，划不来

所以可以先采集很多实际应用场景中的数据，提前分析一下然后确定这俩值，这样硬件电路中这俩就是定值了。相同的应用场景下，数据的统计规律差逑不多。本质是一种tradeoff
2025-09-17 · 四川

​回复​喜欢

kuaikuai

算法截图是什么书啊
2025-09-16 · 上海

​回复​喜欢

龙云李

作者

论文里的
2025-09-17 · 四川

​回复​喜欢

关于作者

龙云李
Dataflow is all u need.

回答
43
文章
28
关注者
1,434

​关注他​发私信

大家都在搜
换一换

伊朗局势466 万热
拼多多被罚 15.2 亿且暴力阻碍监管437 万热
李雨桐泄露薛之谦信息被行拘370 万热
中将军衔很厉害吗349 万
日本发生7.5级地震328 万热
建议低精力人群查维D326 万热
网传酒店打回访电话致住客离婚300 万
养什么花是四季都开的285 万
女子频繁表白后被确诊「桃花癫」270 万
2026 人形机器人半程马拉松赛259 万

推荐阅读

HDLBits：在线学习 Verilog （十五 · Problem 70 - 74）
首先附上传送门：Adder100 - HDLBitsProblem 70 100-bit binary adder题目要求我们创建一个100bit的二进制的加法器，该电路共包含两个100bit的输入和一个cin， 输出产生sum和cout。 (本次练…

木帅宇发表于OpenI...

三行代码提升一倍vllm性能
抱歉我标题党了，当然是提升特定场景下特定模型的性能，回收之前写过的文章： 10倍性能 LLM sampler 优化 关于采样器这块我闭关两周，终于搞定了一个完整的，可用的包，命名为flashsampler …

阿嚏

DALL·E-2是如何工作的以及部署自己的DALL·E模型
deeph...发表于deeph...

复刻ChatGPT语言模型系列-（三）指令学习微调
JMXGO...发表于复刻Cha...