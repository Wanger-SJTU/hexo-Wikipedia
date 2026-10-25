---
title: "Transformer升级之路：1、Sinusoidal位置编码追根溯源"
date: "2021-03-24 00:00:00"
updated: "2021-03-24 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/dl论文/Transformer升级之路-1、Sinusoidal位置编码追根溯源/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/359500899"
---


Transformer升级之路：1、Sinusoidal位置编码追根溯源

苏剑林
​​​
新知答主

收录于 · 科学空间

359 人赞同了该文章

原文链接：

Transformer升级之路：1、Sinusoidal位置编码追根溯源 - 科学空间|Scientific Spaceskexue.fm/archives/8231

最近笔者做了一些理解和改进Transformer的尝试，得到了一些似乎还有价值的经验和结论，遂开一个专题总结一下，命名为“Transformer升级之路”，既代表理解上的深入，也代表结果上的改进。

作为该专题的第一篇文章，笔者将会介绍自己对Google在《Attention is All You Need》中提出来的Sinusoidal位置编码

```text
\begin{equation}\left\{\begin{aligned} \boldsymbol{p}_{k,2i}=\sin\Big(k/10000^{2i/d}\Big)\\   \boldsymbol{p}_{k, 2i+1}=\cos\Big(k/10000^{2i/d}\Big)  \end{aligned}\right.\label{eq:sin}\end{equation}\\
```


的新理解，其中pk,2i,pk,2i+1\boldsymbol{p}_{k,2i},\boldsymbol{p}_{k,2i+1}分别是位置kk的编码向量的第2i,2i+1个分量，d是向量维度。

作为位置编码的一个显式解，Google在原论文中对它的描述却寥寥无几，只是简单提及了它可以表达相对位置信息，后来知乎等平台上也出现了一些解读，它的一些特点也逐步为大家所知，但总体而言比较零散。特别是对于“它是怎么想出来的”、“非得要这个形式不可吗”等原理性问题，还没有比较好的答案。

因此，本文主要围绕这些问题展开思考，可能在思考过程中读者会有跟笔者一样的感觉，即越思考越觉得这个设计之精妙漂亮，让人叹服～

泰勒展开
假设我们的模型为f(\cdots,\boldsymbol{x}_m,\cdots,\boldsymbol{x}_n,\cdots)，其中标记出来的\boldsymbol{x}_m,\boldsymbol{x}_n分别表示第m,n个输入，不失一般性，设ff是标量函数。像Transformer这样的纯Attention模型，它是全对称的，即对于任意的m,n，都有

```text
\begin{equation}f(\cdots,\boldsymbol{x}_m,\cdots,\boldsymbol{x}_n,\cdots)=f(\cdots,\boldsymbol{x}_n,\cdots,\boldsymbol{x}_m,\cdots)\end{equation} \\
```


这就是我们说Transformer无法识别位置的原因——全对称性，简单来说就是函数天然满足恒等式f(x,y)=f(y,x)，以至于我们无法从结果上区分输入是[x,y]还是[y,x]。

因此，我们要做的事情，就是要打破这种对称性，比如在每个位置上都加上一个不同的编码向量：

```text
\begin{equation}\tilde{f}(\cdots,\boldsymbol{x}_m,\cdots,\boldsymbol{x}_n,\cdots)=f(\cdots,\boldsymbol{x}_m + \boldsymbol{p}_m,\cdots,\boldsymbol{x}_n + \boldsymbol{p}_n,\cdots)\end{equation} \\
```


一般来说，只要每个位置的编码向量不同，那么这种全对称性就被打破了，即可以用\tilde{f}代替f来处理有序的输入。但现在我们希望能进一步分析位置编码的性质，甚至得到一个显式解，那么就不能止步于此。

为了简化问题，我们先只考虑m,n这两个位置上的位置编码，将它视为扰动项，泰勒展开到二阶：

\begin{equation}\tilde{f}\approx f + \boldsymbol{p}_m^{\top} \frac{\partial f}{\partial \boldsymbol{x}_m} + \boldsymbol{p}_n^{\top} \frac{\partial f}{\partial \boldsymbol{x}_n} + \frac{1}{2}\boldsymbol{p}_m^{\top} \frac{\partial^2 f}{\partial \boldsymbol{x}_m^2}\boldsymbol{p}_m + \frac{1}{2}\boldsymbol{p}_n^{\top} \frac{\partial^2 f}{\partial \boldsymbol{x}_n^2}\boldsymbol{p}_n + \underbrace{\boldsymbol{p}_m^{\top} \frac{\partial^2 f}{\partial \boldsymbol{x}_m \partial \boldsymbol{x}_n}\boldsymbol{p}_n}_{\boldsymbol{p}_m^{\top} \boldsymbol{\mathcal{H}} \boldsymbol{p}_n}\end{equation} \\

可以看到，第1项跟位置无关，第2到5项都只依赖于单一位置，所以它们是纯粹的绝对位置信息，第6项是第一个同时包含\boldsymbol{p}_m,\boldsymbol{p}_n的交互项，我们将它记为\boldsymbol{p}_m^{\top} \boldsymbol{\mathcal{H}} \boldsymbol{p}_n，希望它能表达一定的相对位置信息。

（此处的泰勒展开参考了知乎问题《BERT为何使用学习的position embedding而非正弦position encoding?》上的纳米酱的回复。）

相对位置
我们先从简单的例子入手，假设\boldsymbol{\mathcal{H}}=\boldsymbol{I}是单位矩阵，此时\boldsymbol{p}_m^{\top} \boldsymbol{\mathcal{H}} \boldsymbol{p}_n = \boldsymbol{p}_m^{\top} \boldsymbol{p}_n = \langle\boldsymbol{p}_m, \boldsymbol{p}_n\rangle是两个位置编码的内积，我们希望在这个简单的例子中该项表达的是相对位置信息，即存在某个函数g使得

```text
\begin{equation}\langle\boldsymbol{p}_m, \boldsymbol{p}_n\rangle = g(m-n)\label{eq:r1}\end{equation} \\
```


这里的\boldsymbol{p}_m, \boldsymbol{p}_n是d维向量，这里我们从最简单d=2入手。

对于2维向量，我们借助复数来推导，即将向量[x,y]视为复数x + y\text{i}，根据复数乘法的运算法则，我们不难得到：

```text
\begin{equation}\langle\boldsymbol{p}_m, \boldsymbol{p}_n\rangle = \text{Re}[\boldsymbol{p}_m \boldsymbol{p}_n^*]\end{equation} \\
```


其中\boldsymbol{p}_n^*是\boldsymbol{p}_n的共轭复数，\text{Re}[]代表复数的实部。为了满足式\eqref{eq:r1}，我们可以假设存在复数\boldsymbol{q}_{m-n}使得

```text
\begin{equation}\boldsymbol{p}_m \boldsymbol{p}_n^* = \boldsymbol{q}_{m-n}\end{equation} \\
```


这样两边取实部就得到了式\eqref{eq:r1}。为了求解这个方程，我们可以使用复数的指数形式，即设\boldsymbol{p}_m=r_m e^{\text{i}\phi_m}, \boldsymbol{p}_n^*=r_n e^{-\text{i}\phi_n}, \boldsymbol{q}_{m-n}=R_{m-n} e^{\text{i}\Phi_{m-n}}得到

```text
\begin{equation}r_m r_n e^{\text{i}(\phi_m - \phi_n)} = R_{m-n} e^{\text{i}\Phi_{m-n}}\quad\Rightarrow\quad \left\{\begin{aligned} r_m r_n = R_{m-n}\\   \phi_m - \phi_n=\Phi_{m-n}\end{aligned}\right.\end{equation} \\
```


对于第一个方程，代入n=m得r_m^2=R_0，即r_m是一个常数，简单起见这里设为1就好；对于第二个方程，代入n=0得\phi_m - \phi_0=\Phi_m，简单起见设\phi_0=0，那么\phi_m=\Phi_m，即\phi_m - \phi_n=\phi_{m-n}，代入n=m-1得\phi_m - \phi_{m-1}=\phi_1，那么\{\phi_m\}只是一个等差数列，通解为m\theta，因此我们就得到二维情形下位置编码的解为：

```text
\begin{equation}\boldsymbol{p}_m = e^{\text{i}m\theta}\quad\Leftrightarrow\quad \boldsymbol{p}_m=\begin{pmatrix}\cos m\theta \\ \sin m\theta\end{pmatrix}\end{equation} \\
```


由于内积满足线性叠加性，所以更高维的偶数维位置编码，我们可以表示为多个二维位置编码的组合：

\begin{equation}\boldsymbol{p}_m = \begin{pmatrix}e^{\text{i}m\theta_0} \\ e^{\text{i}m\theta_1} \\ \vdots \\ e^{\text{i}m\theta_{d/2-1}}\end{pmatrix}\quad\Leftrightarrow\quad \boldsymbol{p}_m=\begin{pmatrix}\cos m\theta_0 \\ \sin m\theta_0 \\ \cos m\theta_1 \\ \sin m\theta_1 \\ \vdots \\ \cos m\theta_{d/2-1} \\ \sin m\theta_{d/2-1}  \end{pmatrix}\label{eq:r2}\end{equation} \\

它同样满足式\eqref{eq:r1}。当然，这只能说是式\eqref{eq:r1}的一个解，但不是唯一解，对于我们来说，求出一个简单的解就行了。

远程衰减
基于前面的假设，我们推导出了位置编码的形式\eqref{eq:r2}，它跟标准的Sinusoidal位置编码\eqref{eq:sin}形式基本一样了，只是\sin,\cos的位置有点不同。一般情况下，神经网络的神经元都是无序的，所以哪怕打乱各个维度，也是一种合理的位置编码，因此除了各个\theta_i没确定下来外，式\eqref{eq:r2}和式\eqref{eq:sin}并无本质区别。

式\eqref{eq:sin}的选择是\theta_i = 10000^{-2i/d}，这个选择有什么意义呢？事实上，这个形式有一个良好的性质：它使得随着|m-n|的增大，\langle\boldsymbol{p}_m, \boldsymbol{p}_n\rangle有着趋于零的趋势。按照我们的直观想象，相对距离越大的输入，其相关性应该越弱，因此这个性质是符合我们的直觉的。只是，明明是周期性的三角函数，怎么会呈现出衰减趋势呢？

这的确是个神奇的现象，源于高频振荡积分的渐近趋零性。具体来说，我们将内积写为

\begin{equation}\begin{aligned} \langle\boldsymbol{p}_m, \boldsymbol{p}_n\rangle = \, \text{Re}\left[e^{\text{i}(m-n)\theta_0} + e^{\text{i}(m-n)\theta_1} + \cdots + e^{\text{i}(m-n)\theta_{d/2-1}}\right]\\ = \,\frac{d}{2}\cdot\text{Re}\left[\sum_{i=0}^{d/2-1} e^{\text{i}(m-n)10000^{-i/(d/2)}}\frac{1}{d/2}\right]\\ \sim \, \frac{d}{2}\cdot\text{Re}\left[\int_0^1 e^{\text{i}(m-n)\cdot 10000^{-t}}dt\right] \end{aligned}\end{equation}\\

这样问题就变成了积分\int_0^1 e^{\text{i}(m-n)\theta_t}dt的渐近估计问题了。其实这种振荡积分的估计在量子力学中很常见，可以利用其中的方法进行分析，但对于我们来说，最直接的方法就是通过Mathematica把积分结果的图像画出来：

\[Theta][t_] = (1/10000)^t;
f[x_] = Re[Integrate[Exp[I*x*\[Theta][t]], {t, 0, 1}]];
Plot[f[x], {x, -128, 128}]
然后从图像中我们就可以看出确实具有衰减趋势： 

那么，问题来了，必须是\theta_t = 10000^{-t}才能呈现出远程衰减趋势吗？当然不是。事实上，对于我们这里的场景，“几乎”每个[0,1]上的单调光滑函数\theta_t，都能使得积分\int_0^1 e^{\text{i}(m-n)\theta_t}dt具有渐近衰减趋势，比如幂函数\theta_t = t^{\alpha}。那么，\theta_t = 10000^{-t}有什么特别的吗？我们来比较一些结果。 

就这样看上去，除了\theta_t=t比较异常之外（与横轴有交点），其他都没有什么明显的区分度，很难断定孰优孰劣，无非就是幂函数在短距离降得快一点，而指数函数则在长距离降得快一点，\theta_t整体越接近于0，那么整体就降得慢一些，等等。如此看来\theta_t = 10000^{-t}也只是一个折中的选择，没有什么特殊性，要是笔者来选，多半会选\theta_t = 1000^{-t}。还有一个方案是，直接让\theta_i = 10000^{-2i/d}作为各个\theta_i的初始化值，然后将它设为可训练的，由模型自动完成微调，这样也不用纠结选哪个了。

一般情况
前面两节中，我们展示了通过绝对位置编码来表达相对位置信息的思想，加上远程衰减的约束，可以“反推”出Sinusoidal位置编码，并且给出了关于\theta_i的其他选择。但是别忘了，到目前为止，我们的推导都是基于\boldsymbol{\mathcal{H}}=\boldsymbol{I}这个简单情况的，对于一般的\boldsymbol{\mathcal{H}}，使用上述Sinusoidal位置编码，还能具备以上的良好性质吗？

如果\boldsymbol{\mathcal{H}}是一个对角阵，那么上面的各个性质可以得到一定的保留，此时

```text
\begin{equation}\boldsymbol{p}_m^{\top} \boldsymbol{\mathcal{H}} \boldsymbol{p}_n=\sum_{i=1}^{d/2} \boldsymbol{\mathcal{H}}_{2i,2i} \cos m\theta_i \cos n\theta_i + \boldsymbol{\mathcal{H}}_{2i+1,2i+1} \sin m\theta_i \sin n\theta_i\end{equation} \\
```


由积化和差公式得到

```text
\begin{equation}\sum_{i=1}^{d/2} \frac{1}{2}\left(\boldsymbol{\mathcal{H}}_{2i,2i} + \boldsymbol{\mathcal{H}}_{2i+1,2i+1}\right) \cos (m-n)\theta_i + \frac{1}{2}\left(\boldsymbol{\mathcal{H}}_{2i,2i} - \boldsymbol{\mathcal{H}}_{2i+1,2i+1}\right) \cos (m+n)\theta_i \end{equation} \\
```


可以看到它也是确实包含了相对位置m-n，只不过可能会多出m+n这一项，如果不需要它，模型可以让\boldsymbol{\mathcal{H}}_{2i,2i} = \boldsymbol{\mathcal{H}}_{2i+1,2i+1}来消除它。在这个特例下，我们指出的是Sinusoidal位置编码赋予了模型学习相对位置的可能，至于具体需要什么位置信息，则由模型的训练自行决定。

特别地，对于上式，远程衰减特性依然存在，比如第一项求和，类比前一节的近似，它相当于积分

```text
\begin{equation}\sum_{i=1}^{d/2} \frac{1}{2}\left(\boldsymbol{\mathcal{H}}_{2i,2i} + \boldsymbol{\mathcal{H}}_{2i+1,2i+1}\right) \cos (m-n)\theta_i \sim \int_0^1 h_t e^{\text{i}(m-n)\theta_t}dt\end{equation} \\
```


同样地，振荡积分的一些估计结果（参考《Oscillatory integrals》、《学习笔记3-一维振荡积分与应用》等）告诉我们，该振荡积分在比较容易达到的条件下，有|m-n|\to\infty时积分值趋于零，因此远程衰减特性是可以得到保留的。

如果\boldsymbol{\mathcal{H}}不是对角阵，那么很遗憾，上述性质都很难重现的。我们只能寄望于\boldsymbol{\mathcal{H}}的对角线部分占了主项，这样一来上述的性质还能近似保留。对角线部分占主项，意味着d维向量之间任意两个维度的相关性比较小，满足一定的解耦性。对于Embedding层来说，这个假设还是有一定的合理性的，笔者检验了BERT训练出来的词Embedding矩阵和位置Embedding矩阵的协方差矩阵，发现对角线元素明显比非对角线元素大，证明了对角线元素占主项这个假设具有一定的合理性。

问题讨论
有读者会反驳：就算你把Sinusoidal位置编码说得无与伦比，也改变不了直接训练的位置编码比Sinusoidal位置编码效果要好的事实。的确，有实验表明，在像BERT这样的经过充分预训练的Transformer模型中，直接训练的位置编码效果是要比Sinusoidal位置编码好些，这个并不否认。本文要做的事情，只是从一些原理和假设出发，推导Sinusoidal位置编码为什么可以作为一个有效的位置，但并不是说它一定就是最好的位置编码。

推导是基于一些假设的，如果推导出来的结果不够好，那么就意味着假设与实际情况不够符合。那么，对于Sinusoidal位置编码来说，问题可能出现在哪呢？我们可以逐步来反思一下。

第一步，泰勒展开，这个依赖于\boldsymbol{p}是小量，笔者也在BERT中做了检验，发现词Embedding的平均模长要比位置Embedding的平均模长大，这说明\boldsymbol{p}是小量某种程度上是合理的，但是多合理也说不准，因为Embedding模长虽然更大但也没压倒性；第二步，假设\boldsymbol{\mathcal{H}}是单位阵，因为上一节我们分析了它很可能是对角线占主项的，所以先假设单位阵可能也不是太大的问题；第三步，假设通过两个绝对位置向量的内积来表达相对位置，这个直觉上告诉我们应该是合理的，绝对位置的相互应当有能力表达一定程度的相对位置信息；最后一步，通过自动远程衰减的特性来确定\theta_i，这个本身应该也是好的，但就是这一步变数太大，因为可选的\theta_i形式太多，甚至还有可训练的\theta_i，很难挑出最合理的，因此如果说Sinusoidal位置编码不够好，这一步也非常值得反思。

文章小结
总的来说，本文试图基于一些假设，反推出Sinusoidal位置编码来，这些假设具有其一定的合理性，也有一定的问题，所以相应的Sinusoidal位置编码可圈可点，但并非毫无瑕疵。但不管怎样，在当前的深度学习中，能够针对具体的问题得到一个显式解，而不是直接暴力拟合，Sinusoidal位置编码是一个不可多得的案例，值得我们思考回味。

编辑于 2021-03-24 12:30
BERT

自然语言处理

Transformer

​赞同 359​​19 条评论​543 ​57 ​分享

​申请转载​​

未登录用户

19 条评论

默认
最新

杨流

太强了，喜欢这种有理有据，追本溯源的理论分析方式来研究ai
2021-04-15

​回复​8

frbf

会不会论文中不提有两种可能，一种就是太牛逼，不想告诉别人。另一种就是无所谓，所以也不用消融实验。？？？

2023-09-08

​回复​1

henan

哥，数学能够出一期学习的路线或者推荐的书籍，学校的教材实在是.....

2024-10-18

​回复​1

苏剑林

作者​

都是边学边补的，没有什么教材能搞定ML所需要的所有数学
2024-10-18

​回复​8

henan

苏剑林

没想到苏神能回复
我发现也是，现在刚开始学算法跟数据结构，把最近开源的hello算法那本书看完了，准备看B站有人转YouTube印度小哥录制的算法视频（听说这个印度人已经去世了）
2024-10-20

​回复​喜欢

sleepyleo

为什么维度位置也需要区分？为什么不可以只区分序列位置，然后在该序列位置下所有维度的频率项都设置为一样的呢？

2025-08-30

​回复​喜欢

最特别的母胎solo

关注你很久了，但是在新知青年大会直播里没看到你，请问你没去新知青年大会吗

2025-05-29

​回复​喜欢

苏剑林

作者​

感谢关注，确实没去

2025-05-29

​回复​1

最特别的母胎solo

苏剑林

可以给个粉丝福利吗？

2025-05-29

​回复​喜欢

展开其他 1 条回复​

晓风轻飏

位置为啥不能作为独立模态？
2025-02-10

​回复​喜欢

useprxf

除了复数，我们还可以用旋转矩阵来理解Sinusoidal编码。要寻找的目标是： pm, pn  = g(n-m)。

已知旋转矩阵Ra（角度为a*t）有如下性质：
Ra^T = R-a
Ra Rb = R(a+b)
很容易验证 pm = Rm A时（这里A是任意一个列向量），有 pm, pn  = A^T R(n-m) A。

A取成[1; 0]时便是Sinusoidal编码： Rm * [1; 0] = [cos(mt); sin(mt)]

2023-09-05

​回复​喜欢

悲伤的苏格拉底

苏神牛逼！

关于如果H不是对角阵的情况，有另外一个可能的思路：就是任意一个方阵，都可以写成一个对角阵+反对角阵的形式，具体就是任意A，肯定可以写成A = (A+A^T)/2 + (A-A^T)/2。

第一部分肯定可以对角化，所以上面的部分继续成立。

第二部分，对角线位置的是0，其他的对称位置是互为相反数的，这样成对的去计算，可能也能计算出来跟(m-n)成一定关系的结果。(太复杂了，我没有细算^_^)

2023-03-15

​回复​喜欢

悲伤的苏格拉底

苏剑林

确实

2023-03-16

​回复​喜欢

苏剑林

作者​

可以随便举反例，证明对于任意矩阵，结果不可能总是m-n的函数的，所以更复杂的分析就没必要了
2023-03-15

​回复​喜欢

白如雪

公式好多没显示的
2021-04-05

​回复​喜欢

苏剑林

作者​

Tom

维度足够高就是可分离的
2023-09-21

​回复​喜欢

Tom

苏剑林

大佬，有个地方不理解，transformer中词向量+位置向量合成了一个新的向量，那后续流程怎么从这个混合之后的向量中提取出词信息或者是位置信息？

2023-09-20

​回复​喜欢

展开其他 1 条回复​

未登录用户

关于作者

苏剑林​​
数学、python、数据挖掘、天文

回答
176
文章
268
关注者
90,497

​关注他​发私信

大家都在搜
换一换

伊朗局势464 万热
拼多多被罚 15.2 亿且暴力阻碍监管436 万热
李雨桐泄露薛之谦信息被行拘368 万热
日本发生7.5级地震326 万热
建议低精力人群查维D325 万热
网传酒店打回访电话致住客离婚300 万
女子频繁表白后被确诊「桃花癫」270 万
2026 人形机器人半程马拉松赛259 万
万达电影更名为儒意电影240 万
女子产后被男友起诉退彩礼分娩费225 万

推荐阅读

Transformer升级之路：15、Key归一化助力长度外推
最佳版本请看原博客： Transformer升级之路：15、Key归一化助力长度外推 - 科学空间|Scientific Spaces 大体上，我们可以将目前Transformer的长度外推技术分为两类：一类是事后修改，比如 N…

苏剑林发表于科学空间

[读苏笔记] 8265 Transformer升级之路2博采众长的旋转式位置编码
文章 Transformer升级之路：2、博采众长的旋转式位置编码链接 https://spaces.ac.cn/archives/8265总结 Sinusoidal是一种想要成为相对位置编码的绝对位置编码提出旋转位置编码，配合注意力…

SOHii5AjZtg

图解Transformer（完整版）
前一段时间谷歌推出的BERT模型在11项NLP任务中夺得SOTA结果，引爆了整个NLP界。而BERT取得成功的一个关键因素是Transformer的强大作用。谷歌的Transformer模型最早是用于机器翻译任务，当时…

NLP自然...发表于NLP培训...

收藏！深入理解Transformer！
Sophi...发表于人工智能干...