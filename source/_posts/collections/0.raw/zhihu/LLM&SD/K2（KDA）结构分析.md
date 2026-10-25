---
title: K2（KDA）结构分析
date: "2025-11-09 00:00:00"
updated: "2025-11-09 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/K2(KDA)结构分析/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1968379856455701416
---


## 1. 整体结构


![](https://pic2.zhimg.com/v2-f45714b1d84ad6505d41ee94fc4734bf_r.jpg)
- 是MLA和KDA的混合架构，按照3:1的配比来调配
- 核心就是KDA，采用线性attention来提升模型的训推效率
## 2. KDA结构

KDA从结构来说，是集Linear attention大家之所长。他的主体结构是DeltaNet，然后加上了Gated，但是相比默认的Gated DeltaNet， 
$\alpha_t$ 的粒度更细，和RWKV-7类似。下面放几个公式大家就可以感受下了： 
$$Pure LinearAttention: S_t=S_{t-1}+v_tk_t^\top\\  DeltaNet: S_{t}=\color{red}{(I-\beta_tk_tk_t^\top)}S_{t-1}+\color{red}{\beta_t}v_tk_t^\top \\  Gated DeltaNet:S_t=\color{red}{\alpha_t}(I-\beta_tk_tk_t^\top)S_{t-1}+\beta_tv_tk_t^\top \\  GLA/RWKV-6: S_t=S_{t-1}Diag(\alpha_t)+v_tk_t^\top \\  RWKV-7: S_t=S_{t-1}(\color{red}{Diag(\alpha_t)}+a_tb_t^\top)+v_tk_t^\top \\  KDA:S_t=\color{red}{(I-\beta_tk_tk_t^\top)Diag(a_t)S_{t-1}+\beta_tv_tk_t^\top}$$


简单理解：

- 
$\beta_t$ 是来控制memory更新的力度，从DeltaNet公式可以感受到，他就是控制一个新旧value在整个memory矩阵中的权重
- 
$\alpha_t$ 是来控制遗忘的速度，带这个参数的结构也叫做DeltaNet with forget gate。因为默认DeltaNet完全刷新memory矩阵中的信息，至少需要d step，有了 
$\alpha_t$ 就可以实现快速遗忘KDA论文中另一个比较大的技术点，在于其『<strong>Hardware-Efficient Chunkwise Algorithm</strong>』，但这块也借鉴了sonta在[DeltaNet Explained (Part II)](https://link.zhihu.com/?target=https%3A//sustcsonglin.github.io/blog/2024/deltanet-2/)中的研究。

$$S{[t+1]} = Diag(γ_{[t]}^C)S[t] + (Γ_{[t]}^{i→C} ⊙ K_{[t]})^\top (U_{[t]} − W_{[t]}S_{[t]})\in R^{d_k×d_v}$$


![](https://pic4.zhimg.com/v2-dfc2dac6197787e6af877827c1553913_r.jpg)
$$O_{[t]}=(Γ_{[t]}^{i→C}⊙Q_{[t]})S_{[t]}+Tril((Γ_{[t]}^{i→C}⊙Q_{[t]})(\frac{K_{[t]}}{Γ_{[t]}^{i→C}})^\top)(U_{[t]}-W_{[t]}S_{[t]})\in R^{C*d_v}$$


![](https://pic3.zhimg.com/v2-ffceb18eceaafb1bdee6fab38216f93e_r.jpg)
KDA最大的意义在于用生产环境大规模实验论证了：LA具有生产可用性，无论是训推效率，还是大家之前一直担心的效果，都是可以或者可能超过Full attention的。

## 3. 衍生的推导

为了更好的理解上面的公式和拆解，我们可以把相关推导也都熟悉下。

### 3.1 DeltaNet -> Gated DeltaNet -> KDA

<strong>公式推导一</strong>

原始定义如下： 
$$\begin{equation} q_t=W_Qx_t,k_t=W_Kx_t,v_t=W_vx_t \\ \beta_t=sigmoid(W_{\beta}x_t) \\ v_t^{old}=S_{t-1}k_t \\ v_t^{new}=\beta_tv_t+(1-\beta_t)v_t^{old} \end{equation}$$


 从上面定义可以看出：

- 
$v_t^{old}$ 是用当前的 
$k_t$ 去就的记忆矩阵 
$S_{t-1}$ 去查『记忆』值
- 
$v_t^{new}$ 则是当前的值，与旧的『记忆』值得加权表示利用这两个记忆，新的记忆矩阵就按照如下公式来更新：

$$\begin{equation} \begin{aligned} & S_t=S_{t-1}-v_t^{old}k_t^\top+v_t^{new}k_t^\top \\ & = S_{t-1}-S_{t-1}k_tk_t^\top+(\beta_tv_t+(1-\beta_t)v_t^{old})k_t^\top \\ & = S_{t-1}-S_{t-1}k_tk_t^\top+\beta_tv_tk_t^\top+(1-\beta_t)v_t^{old}k_t^\top \\ & = S_{t-1}-S_{t-1}k_tk_t^\top+\beta_tv_tk_t^\top+(1-\beta_t)S_{t-1}k_tk_t^\top \\ & = S_{t-1}(I-k_tk_t^\top+k_tk_t^\top-\beta_tk_tk_t^\top)+\beta_tv_tk_t^\top \\ & = S_{t-1}(I-\beta_tk_tk_t^\top)+\beta_tv_tk_t^\top \end{aligned} \end{equation}$$


也就是最终的公式为：

$${S}_t = S_{t-1}(I-\beta_tk_tk_t^\top)+\beta_tv_tk_t^\top$$


审视这个公式，会发现，整个公式是非对角线的，同时data-dependent，因此 
$\beta_t$ 是和每个位置的输入相关的，所以他的表达能力是超越 
$TC^0$ 的。

<strong>公式推导二</strong>

公式转换一下：

$$\mathbf{S}t = \mathbf{S}_{t-1} - \beta_t(S_{t-1}k_t-v_t)k_t^\top$$


将 
$S$ 看做一个作用于
$\mathbf{k}_t$的映射矩阵，其值要向
$\mathbf{v}_t$靠近，这样中间就形成个预测和真值得delta： 
$$S_{t-1}k_t-v_t$$


定义其loss为： 
$\mathcal{L}_t(\mathbf{S}) = \frac{1}{2}|\mathbf{S} \mathbf{k}_t - \mathbf{v}_t|^2$ 。开始做如下推导：

①  
$\mathbf{S}t = \mathbf{S}_{t-1} - \beta_t \nabla \mathcal{L}t(\mathbf{S}_{t-1}) = \mathbf{S}_{t-1} - \beta_t (\mathbf{S}_{t-1} \mathbf{k}_t - \mathbf{v}_t)\mathbf{k}_t^\top$ ，其中 
$\beta_t$ 是学习率；进一步推导公式

②  
$\begin{align*} \mathbf{S}_t &= \mathbf{S}_{t-1} - \beta_t \left(\mathbf{S}_{t-1} \mathbf{k}_t - \mathbf{v}_t\right) \mathbf{k}_t^\top \\ &= \mathbf{S}_{t-1} {\left(\mathbf{I} - \beta_t \mathbf{k}_t \mathbf{k}_t^\top\right)} + \beta_t \mathbf{v}_t \mathbf{k}_t^\top \end{align*}$ ；这相当于 
$S_t$ 可以更新自己，让 
$k_t$ 尽可能逼近 
$$v_t$$


③  
$\begin{align*} \mathbf{S}_t = \mathbf{S}_{t-1} \left({\color{red}{\alpha_t}}(\mathbf{I} - \beta_t \mathbf{k}_t \mathbf{k}_t^\top)\right) + \beta_t \mathbf{v}_t \mathbf{k}_t^\top \end{align*}$ ，上面公式在训练过程中还是还是会爆炸，因此Gated DeltaNet就增加一个缩放系数 
$\alpha_t$ ，<strong>这是一个标量</strong>

④  
$\begin{align*} \mathbf{S}_t = \left(\mathbf{I} - \beta_t \mathbf{k}_t \mathbf{k}_t^\top\right)\color{red}{\mathbf{Diag}({\alpha_t}})\mathbf{S}_{t-1}  + \beta_t \mathbf{v}_t \mathbf{k}_t^\top \end{align*}\in{R^{d_k*d_v}}$ ； 
$\mathbf{o_t}=\mathbf{S_t}^\top\mathbf{q_t}\in{R^{d_v}}$ ，KDA则是仿照RWKV等模型，将 
$\alpha_t$ 通过Diag转换成了矩阵形式，针对每个特征维度都有个对应的衰减系数。

![](https://pica.zhimg.com/v2-2ac22c531aa2a01506fb0896e9546e9a_r.jpg)
### 3.2 Chunk wise parallel

<strong>原始线性注意力分块并行</strong>

先从普通的线性注意力来看： 
$$S_t=S_{t-1}+v_tk_t^\top;O_t=q_tS_t$$


如果我们将序列拆成一个个chunk，比如每个chunk长度为C，那么可以想想和推导下一个chunk的开始元素 
$$S_{[t]}=S_{[t-1]}+\sum_{i=1}^{C}{v_ik_i^\top}$$


$S_{[t]}$ 指的是第t个chunk的第一个元素，而不是原始公式中第t的位置了；上面公式的右半部分大家比较熟悉，也就是一个矩阵乘，因此公式就变成了chunk内所有元素的V和所有元素的的K的矩阵乘： 
$$S_{[t]}=S_{[t-1]}+V_{[t]}K_{[t]}$$


所以各个chunk位置为0的元素就可以：先并行计算各个chunk内的V*K，然后再循环计算 
$$S_{[t]}$$


接下来再继续看看chunk内的位置： 
$S_{[t]}^r=S_{[t]}+\sum_{i=1}^rv_{[t]}^ik_{[t]}^{i\top}$ ，先不计算，因为最终要计算的是o： 
$$O_{[t]}^r=S_{[t]}^iq_{[t]}^i=(S_{[t]}+\sum_{i=1}^rv_{[t]}^ik_{[t]}^{i\top})q_{[t]}^r=S_{[t]}q_{[t]}^r+\sum_{i=1}^rv_{[t]}^ik_{[t]}^{i\top}q_{[t]}^i$$


和前面类似，上面公式的右半部分就类似传统attention的矩阵操作： 
$O_{[t]}^r=S_{[t]}q_{t}^r+(Q_{[t]}K_{[t]}^\top ⊙ M)V_{[t]}$ ；由于chunk内的每个位置的计算都无关了，所以可以将chunk内所有元素都并行计算： 
$$O_{[t]}=S_{[t]}Q_{[t]}+(Q_{[t]}K_{[t]}^\top ⊙ M)V_{[t]}$$


总结下：

- 先并行计算chunk内的v*k
- 然后再串行计算每个chunk的 
$$S_{[t]}$$

- 最后再并行计算chunk内所有元素的 
$O_{[t]}$ <strong>DeltaNet分块并行</strong>

DeltaNet由于引入了 
$\beta_t$ 相关的矩阵操作，上面的公式不能直接套用。我们也顺着最开始的公式来看： 
$S_t=(I-\beta_tk_tk_t^\top)S_{t-1}+\beta_tv_tk_t^\top$ 。

如果继续顺着前面推导由于 
$S_{[t]}$ 与 
$S_{[t- 1]}$中间隔了C的位置，因此相关的 
$\beta_t$ 系数都需要累积乘上来，并且每个位置的v*k，都累积乘他前面位置的系数，也就是 
$S_{[t]}=\prod_{j=1}^C(I-\beta_jk_jk_j^\top)S_{t-1}+\sum_{i=1}^{C}\prod_{j=i}^{C}(I-\beta_jk_jk_j^\top)\beta_iv_ik_i^\top$ ；这不能如前面那样转换成矩阵乘了。

但参考这篇论文详细介绍的，可以借鉴两个成熟的转换公式。

第一个就是WY表示法： 
$$\prod_{i=1}^t(I-\beta_tk_tk_t^\top)=I-\sum_{i=1}^tw_ik_i^\top \\ w_n=\beta_nk_n-\beta_n\sum_{i=1}^{n-1}(w_i(k_i^\top k_n)) \\ u_n=\beta_nv_n-\beta_n\sum_{i=1}^{n-1}(u_i(k_i^\top v_n))$$


这个公式右边就是一个矩阵乘操作了。上面公式就进化成了： 
$$\begin{equation}  \begin{aligned} & S_{[t]}=\prod_{j=1}^C(I-\beta_jk_jk_j^\top)S_{[t-1]}+\sum_{i=1}^{C}\prod_{j=i}^{C}(I-\beta_jk_jk_j^\top)\beta_iv_ik_i^\top \\  & = (I-\sum_{j=1}^Cw_jk_j^\top)S_{[t-1]}+\sum_{i=1}^C(I-\sum_{j=i}^Cu_jk_j^\top)\beta_iv_ik_i^\top \\  & = (I-\sum_{j=1}^Cw_jk_j^\top)S_{[t-1]}+\sum_{i=1}^C(\beta_iv_i-\beta_i\sum_{j=i}^Cu_jk_j^\top v_i)k_i^\top \\  & = (I-W_{[t]}K_{[t]}^\top)S_{[t-1]}+U_{[t]}K_{[t]}^\top  \end{aligned} \end{equation}$$


推导到这，公式和前面普通线性attention就比较近似了，转换成一些操作的乘加，最后在GPU上就可以用矩阵乘来做计算了。

和前面类似，可以推导出每个chunk内的输出：

$$O_{[t]}=Q_{[t]}S_{[t]}^\top+(Q_{[t]}K_{[t]}^\top ⊙ M)(U_{[t]}-W_{[t]}S_{[t]}^\top)$$


第二个就是UT转换，前面公式就进一步转换成了。

UT转换主要是审视上面的w和u，认为这种表示从图论的角度来说，就是加权有向图：

- 节点代表序列位置
- 有向边链接位置i到r
- 边权重为 
$-\beta_tk_i^\top k_j$ 针对这种图呢，可以将上述公式转换为： 
$$A_{[t]}=tril(-diag(\beta_{[t]}K_{[t]}K_{[t]}^\top)) \\ T_{[t]}=(I-A_{[t]})^{-1} \\ W_{[t]}=T_{[t]}diag(\beta_t)K_{[t]} \\ U_{[t]}=T_{[t]}diag(\beta_t)V_{[t]}$$


到这我们发现所有的计算，都是一个累加的形式了，很好的可以利用矩阵单元了。

理解了这些推导，再来看KDA的推导简单很多了。