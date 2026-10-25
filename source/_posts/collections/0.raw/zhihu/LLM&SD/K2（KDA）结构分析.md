---
title: "K2（KDA）结构分析"
date: 2025-11-09
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/1968379856455701416

---

1. 整体结构

![](https://pic2.zhimg.com/v2-f45714b1d84ad6505d41ee94fc4734bf_r.jpg)
- 是MLA和KDA的混合架构，按照3:1的配比来调配
- 核心就是KDA，采用线性attention来提升模型的训推效率
2. KDA结构
KDA从结构来说，是集Linear attention大家之所长。他的主体结构是DeltaNet，然后加上了Gated，但是相比默认的Gated DeltaNet， 
![](https://www.zhihu.com/equation?tex=%5Calpha_t) 的粒度更细，和RWKV-7类似。下面放几个公式大家就可以感受下了： 
![](https://www.zhihu.com/equation?tex=Pure+LinearAttention%3A+S_t%3DS_%7Bt-1%7D%2Bv_tk_t%5E%5Ctop%5C%5C++DeltaNet%3A+S_%7Bt%7D%3D%5Ccolor%7Bred%7D%7B%28I-%5Cbeta_tk_tk_t%5E%5Ctop%29%7DS_%7Bt-1%7D%2B%5Ccolor%7Bred%7D%7B%5Cbeta_t%7Dv_tk_t%5E%5Ctop+%5C%5C++Gated+DeltaNet%3AS_t%3D%5Ccolor%7Bred%7D%7B%5Calpha_t%7D%28I-%5Cbeta_tk_tk_t%5E%5Ctop%29S_%7Bt-1%7D%2B%5Cbeta_tv_tk_t%5E%5Ctop+%5C%5C++GLA%2FRWKV-6%3A+S_t%3DS_%7Bt-1%7DDiag%28%5Calpha_t%29%2Bv_tk_t%5E%5Ctop+%5C%5C++RWKV-7%3A+S_t%3DS_%7Bt-1%7D%28%5Ccolor%7Bred%7D%7BDiag%28%5Calpha_t%29%7D%2Ba_tb_t%5E%5Ctop%29%2Bv_tk_t%5E%5Ctop+%5C%5C++KDA%3AS_t%3D%5Ccolor%7Bred%7D%7B%28I-%5Cbeta_tk_tk_t%5E%5Ctop%29Diag%28a_t%29S_%7Bt-1%7D%2B%5Cbeta_tv_tk_t%5E%5Ctop%7D) 

简单理解：

- 
![](https://www.zhihu.com/equation?tex=%5Cbeta_t) 是来控制memory更新的力度，从DeltaNet公式可以感受到，他就是控制一个新旧value在整个memory矩阵中的权重
- 
![](https://www.zhihu.com/equation?tex=%5Calpha_t) 是来控制遗忘的速度，带这个参数的结构也叫做DeltaNet with forget gate。因为默认DeltaNet完全刷新memory矩阵中的信息，至少需要d step，有了 
![](https://www.zhihu.com/equation?tex=%5Calpha_t) 就可以实现快速遗忘KDA论文中另一个比较大的技术点，在于其『**Hardware-Efficient Chunkwise Algorithm**』，但这块也借鉴了sonta在[DeltaNet Explained (Part II)](https://link.zhihu.com/?target=https%3A//sustcsonglin.github.io/blog/2024/deltanet-2/)中的研究。

![](https://www.zhihu.com/equation?tex=S%7B%5Bt%2B1%5D%7D+%3D+Diag%28%CE%B3_%7B%5Bt%5D%7D%5EC%29S%5Bt%5D+%2B+%28%CE%93_%7B%5Bt%5D%7D%5E%7Bi%E2%86%92C%7D+%E2%8A%99+K_%7B%5Bt%5D%7D%29%5E%5Ctop+%28U_%7B%5Bt%5D%7D+%E2%88%92+W_%7B%5Bt%5D%7DS_%7B%5Bt%5D%7D%29%5Cin+R%5E%7Bd_k%C3%97d_v%7D) 

![](https://pic4.zhimg.com/v2-dfc2dac6197787e6af877827c1553913_r.jpg)
![](https://www.zhihu.com/equation?tex=O_%7B%5Bt%5D%7D%3D%28%CE%93_%7B%5Bt%5D%7D%5E%7Bi%E2%86%92C%7D%E2%8A%99Q_%7B%5Bt%5D%7D%29S_%7B%5Bt%5D%7D%2BTril%28%28%CE%93_%7B%5Bt%5D%7D%5E%7Bi%E2%86%92C%7D%E2%8A%99Q_%7B%5Bt%5D%7D%29%28%5Cfrac%7BK_%7B%5Bt%5D%7D%7D%7B%CE%93_%7B%5Bt%5D%7D%5E%7Bi%E2%86%92C%7D%7D%29%5E%5Ctop%29%28U_%7B%5Bt%5D%7D-W_%7B%5Bt%5D%7DS_%7B%5Bt%5D%7D%29%5Cin+R%5E%7BC%2Ad_v%7D) 

![](https://pic3.zhimg.com/v2-ffceb18eceaafb1bdee6fab38216f93e_r.jpg)
KDA最大的意义在于用生产环境大规模实验论证了：LA具有生产可用性，无论是训推效率，还是大家之前一直担心的效果，都是可以或者可能超过Full attention的。

3. 衍生的推导
为了更好的理解上面的公式和拆解，我们可以把相关推导也都熟悉下。

3.1 DeltaNet -> Gated DeltaNet -> KDA
**公式推导一**

原始定义如下： 
![](https://www.zhihu.com/equation?tex=%5Cbegin%7Bequation%7D+q_t%3DW_Qx_t%2Ck_t%3DW_Kx_t%2Cv_t%3DW_vx_t+%5C%5C+%5Cbeta_t%3Dsigmoid%28W_%7B%5Cbeta%7Dx_t%29+%5C%5C+v_t%5E%7Bold%7D%3DS_%7Bt-1%7Dk_t+%5C%5C+v_t%5E%7Bnew%7D%3D%5Cbeta_tv_t%2B%281-%5Cbeta_t%29v_t%5E%7Bold%7D+%5Cend%7Bequation%7D++) 

 从上面定义可以看出：

- 
![](https://www.zhihu.com/equation?tex=v_t%5E%7Bold%7D) 是用当前的 
![](https://www.zhihu.com/equation?tex=k_t) 去就的记忆矩阵 
![](https://www.zhihu.com/equation?tex=S_%7Bt-1%7D) 去查『记忆』值
- 
![](https://www.zhihu.com/equation?tex=v_t%5E%7Bnew%7D) 则是当前的值，与旧的『记忆』值得加权表示利用这两个记忆，新的记忆矩阵就按照如下公式来更新：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Bequation%7D+%5Cbegin%7Baligned%7D+%26+S_t%3DS_%7Bt-1%7D-v_t%5E%7Bold%7Dk_t%5E%5Ctop%2Bv_t%5E%7Bnew%7Dk_t%5E%5Ctop+%5C%5C+%26+%3D+S_%7Bt-1%7D-S_%7Bt-1%7Dk_tk_t%5E%5Ctop%2B%28%5Cbeta_tv_t%2B%281-%5Cbeta_t%29v_t%5E%7Bold%7D%29k_t%5E%5Ctop+%5C%5C+%26+%3D+S_%7Bt-1%7D-S_%7Bt-1%7Dk_tk_t%5E%5Ctop%2B%5Cbeta_tv_tk_t%5E%5Ctop%2B%281-%5Cbeta_t%29v_t%5E%7Bold%7Dk_t%5E%5Ctop+%5C%5C+%26+%3D+S_%7Bt-1%7D-S_%7Bt-1%7Dk_tk_t%5E%5Ctop%2B%5Cbeta_tv_tk_t%5E%5Ctop%2B%281-%5Cbeta_t%29S_%7Bt-1%7Dk_tk_t%5E%5Ctop+%5C%5C+%26+%3D+S_%7Bt-1%7D%28I-k_tk_t%5E%5Ctop%2Bk_tk_t%5E%5Ctop-%5Cbeta_tk_tk_t%5E%5Ctop%29%2B%5Cbeta_tv_tk_t%5E%5Ctop+%5C%5C+%26+%3D+S_%7Bt-1%7D%28I-%5Cbeta_tk_tk_t%5E%5Ctop%29%2B%5Cbeta_tv_tk_t%5E%5Ctop+%5Cend%7Baligned%7D+%5Cend%7Bequation%7D) 

也就是最终的公式为：

![](https://www.zhihu.com/equation?tex=%7BS%7D_t+%3D+S_%7Bt-1%7D%28I-%5Cbeta_tk_tk_t%5E%5Ctop%29%2B%5Cbeta_tv_tk_t%5E%5Ctop) 

审视这个公式，会发现，整个公式是非对角线的，同时data-dependent，因此 
![](https://www.zhihu.com/equation?tex=%5Cbeta_t) 是和每个位置的输入相关的，所以他的表达能力是超越 
![](https://www.zhihu.com/equation?tex=TC%5E0) 的。

**公式推导二**

公式转换一下：

![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BS%7Dt+%3D+%5Cmathbf%7BS%7D_%7Bt-1%7D+-+%5Cbeta_t%28S_%7Bt-1%7Dk_t-v_t%29k_t%5E%5Ctop) 

将 
![](https://www.zhihu.com/equation?tex=S) 看做一个作用于
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bk%7D_t+)的映射矩阵，其值要向
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bv%7D_t)靠近，这样中间就形成个预测和真值得delta： 
![](https://www.zhihu.com/equation?tex=S_%7Bt-1%7Dk_t-v_t) 

定义其loss为： 
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BL%7D_t%28%5Cmathbf%7BS%7D%29+%3D+%5Cfrac%7B1%7D%7B2%7D%7C%5Cmathbf%7BS%7D+%5Cmathbf%7Bk%7D_t+-+%5Cmathbf%7Bv%7D_t%7C%5E2) 。开始做如下推导：

①  
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BS%7Dt+%3D+%5Cmathbf%7BS%7D_%7Bt-1%7D+-+%5Cbeta_t+%5Cnabla+%5Cmathcal%7BL%7Dt%28%5Cmathbf%7BS%7D_%7Bt-1%7D%29+%3D+%5Cmathbf%7BS%7D_%7Bt-1%7D+-+%5Cbeta_t+%28%5Cmathbf%7BS%7D_%7Bt-1%7D+%5Cmathbf%7Bk%7D_t+-+%5Cmathbf%7Bv%7D_t%29%5Cmathbf%7Bk%7D_t%5E%5Ctop) ，其中 
![](https://www.zhihu.com/equation?tex=%5Cbeta_t) 是学习率；进一步推导公式

②  
![](https://www.zhihu.com/equation?tex=%5Cbegin%7Balign%2A%7D+%5Cmathbf%7BS%7D_t+%26%3D+%5Cmathbf%7BS%7D_%7Bt-1%7D+-+%5Cbeta_t+%5Cleft%28%5Cmathbf%7BS%7D_%7Bt-1%7D+%5Cmathbf%7Bk%7D_t+-+%5Cmathbf%7Bv%7D_t%5Cright%29+%5Cmathbf%7Bk%7D_t%5E%5Ctop+%5C%5C+%26%3D+%5Cmathbf%7BS%7D_%7Bt-1%7D+%7B%5Cleft%28%5Cmathbf%7BI%7D+-+%5Cbeta_t+%5Cmathbf%7Bk%7D_t+%5Cmathbf%7Bk%7D_t%5E%5Ctop%5Cright%29%7D+%2B+%5Cbeta_t+%5Cmathbf%7Bv%7D_t+%5Cmathbf%7Bk%7D_t%5E%5Ctop+%5Cend%7Balign%2A%7D) ；这相当于 
![](https://www.zhihu.com/equation?tex=S_t) 可以更新自己，让 
![](https://www.zhihu.com/equation?tex=k_t) 尽可能逼近 
![](https://www.zhihu.com/equation?tex=v_t) 

③  
![](https://www.zhihu.com/equation?tex=%5Cbegin%7Balign%2A%7D+%5Cmathbf%7BS%7D_t+%3D+%5Cmathbf%7BS%7D_%7Bt-1%7D+%5Cleft%28%7B%5Ccolor%7Bred%7D%7B%5Calpha_t%7D%7D%28%5Cmathbf%7BI%7D+-+%5Cbeta_t+%5Cmathbf%7Bk%7D_t+%5Cmathbf%7Bk%7D_t%5E%5Ctop%29%5Cright%29+%2B+%5Cbeta_t+%5Cmathbf%7Bv%7D_t+%5Cmathbf%7Bk%7D_t%5E%5Ctop+%5Cend%7Balign%2A%7D) ，上面公式在训练过程中还是还是会爆炸，因此Gated DeltaNet就增加一个缩放系数 
![](https://www.zhihu.com/equation?tex=%5Calpha_t) ，**这是一个标量**

④  
![](https://www.zhihu.com/equation?tex=%5Cbegin%7Balign%2A%7D+%5Cmathbf%7BS%7D_t+%3D+%5Cleft%28%5Cmathbf%7BI%7D+-+%5Cbeta_t+%5Cmathbf%7Bk%7D_t+%5Cmathbf%7Bk%7D_t%5E%5Ctop%5Cright%29%5Ccolor%7Bred%7D%7B%5Cmathbf%7BDiag%7D%28%7B%5Calpha_t%7D%7D%29%5Cmathbf%7BS%7D_%7Bt-1%7D++%2B+%5Cbeta_t+%5Cmathbf%7Bv%7D_t+%5Cmathbf%7Bk%7D_t%5E%5Ctop+%5Cend%7Balign%2A%7D%5Cin%7BR%5E%7Bd_k%2Ad_v%7D%7D) ； 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bo_t%7D%3D%5Cmathbf%7BS_t%7D%5E%5Ctop%5Cmathbf%7Bq_t%7D%5Cin%7BR%5E%7Bd_v%7D%7D) ，KDA则是仿照RWKV等模型，将 
![](https://www.zhihu.com/equation?tex=%5Calpha_t) 通过Diag转换成了矩阵形式，针对每个特征维度都有个对应的衰减系数。

![](https://pica.zhimg.com/v2-2ac22c531aa2a01506fb0896e9546e9a_r.jpg)
3.2 Chunk wise parallel
**原始线性注意力分块并行**

先从普通的线性注意力来看： 
![](https://www.zhihu.com/equation?tex=S_t%3DS_%7Bt-1%7D%2Bv_tk_t%5E%5Ctop%3BO_t%3Dq_tS_t) 

如果我们将序列拆成一个个chunk，比如每个chunk长度为C，那么可以想想和推导下一个chunk的开始元素 
![](https://www.zhihu.com/equation?tex=S_%7B%5Bt%5D%7D%3DS_%7B%5Bt-1%5D%7D%2B%5Csum_%7Bi%3D1%7D%5E%7BC%7D%7Bv_ik_i%5E%5Ctop%7D) 

![](https://www.zhihu.com/equation?tex=S_%7B%5Bt%5D%7D) 指的是第t个chunk的第一个元素，而不是原始公式中第t的位置了；上面公式的右半部分大家比较熟悉，也就是一个矩阵乘，因此公式就变成了chunk内所有元素的V和所有元素的的K的矩阵乘： 
![](https://www.zhihu.com/equation?tex=S_%7B%5Bt%5D%7D%3DS_%7B%5Bt-1%5D%7D%2BV_%7B%5Bt%5D%7DK_%7B%5Bt%5D%7D) 

所以各个chunk位置为0的元素就可以：先并行计算各个chunk内的V*K，然后再循环计算 
![](https://www.zhihu.com/equation?tex=S_%7B%5Bt%5D%7D)

接下来再继续看看chunk内的位置： 
![](https://www.zhihu.com/equation?tex=S_%7B%5Bt%5D%7D%5Er%3DS_%7B%5Bt%5D%7D%2B%5Csum_%7Bi%3D1%7D%5Erv_%7B%5Bt%5D%7D%5Eik_%7B%5Bt%5D%7D%5E%7Bi%5Ctop%7D) ，先不计算，因为最终要计算的是o： 
![](https://www.zhihu.com/equation?tex=O_%7B%5Bt%5D%7D%5Er%3DS_%7B%5Bt%5D%7D%5Eiq_%7B%5Bt%5D%7D%5Ei%3D%28S_%7B%5Bt%5D%7D%2B%5Csum_%7Bi%3D1%7D%5Erv_%7B%5Bt%5D%7D%5Eik_%7B%5Bt%5D%7D%5E%7Bi%5Ctop%7D%29q_%7B%5Bt%5D%7D%5Er%3DS_%7B%5Bt%5D%7Dq_%7B%5Bt%5D%7D%5Er%2B%5Csum_%7Bi%3D1%7D%5Erv_%7B%5Bt%5D%7D%5Eik_%7B%5Bt%5D%7D%5E%7Bi%5Ctop%7Dq_%7B%5Bt%5D%7D%5Ei) 

和前面类似，上面公式的右半部分就类似传统attention的矩阵操作： 
![](https://www.zhihu.com/equation?tex=O_%7B%5Bt%5D%7D%5Er%3DS_%7B%5Bt%5D%7Dq_%7Bt%7D%5Er%2B%28Q_%7B%5Bt%5D%7DK_%7B%5Bt%5D%7D%5E%5Ctop+%E2%8A%99+M%29V_%7B%5Bt%5D%7D) ；由于chunk内的每个位置的计算都无关了，所以可以将chunk内所有元素都并行计算： 
![](https://www.zhihu.com/equation?tex=O_%7B%5Bt%5D%7D%3DS_%7B%5Bt%5D%7DQ_%7B%5Bt%5D%7D%2B%28Q_%7B%5Bt%5D%7DK_%7B%5Bt%5D%7D%5E%5Ctop+%E2%8A%99+M%29V_%7B%5Bt%5D%7D) 

总结下：

- 先并行计算chunk内的v*k
- 然后再串行计算每个chunk的 
![](https://www.zhihu.com/equation?tex=S_%7B%5Bt%5D%7D) 
- 最后再并行计算chunk内所有元素的 
![](https://www.zhihu.com/equation?tex=O_%7B%5Bt%5D%7D) **DeltaNet分块并行**

DeltaNet由于引入了 
![](https://www.zhihu.com/equation?tex=%5Cbeta_t) 相关的矩阵操作，上面的公式不能直接套用。我们也顺着最开始的公式来看： 
![](https://www.zhihu.com/equation?tex=S_t%3D%28I-%5Cbeta_tk_tk_t%5E%5Ctop%29S_%7Bt-1%7D%2B%5Cbeta_tv_tk_t%5E%5Ctop) 。

如果继续顺着前面推导由于 
![](https://www.zhihu.com/equation?tex=S_%7B%5Bt%5D%7D) 与 
![](https://www.zhihu.com/equation?tex=S_%7B%5Bt-+1%5D%7D)中间隔了C的位置，因此相关的 
![](https://www.zhihu.com/equation?tex=%5Cbeta_t) 系数都需要累积乘上来，并且每个位置的v*k，都累积乘他前面位置的系数，也就是 
![](https://www.zhihu.com/equation?tex=S_%7B%5Bt%5D%7D%3D%5Cprod_%7Bj%3D1%7D%5EC%28I-%5Cbeta_jk_jk_j%5E%5Ctop%29S_%7Bt-1%7D%2B%5Csum_%7Bi%3D1%7D%5E%7BC%7D%5Cprod_%7Bj%3Di%7D%5E%7BC%7D%28I-%5Cbeta_jk_jk_j%5E%5Ctop%29%5Cbeta_iv_ik_i%5E%5Ctop) ；这不能如前面那样转换成矩阵乘了。

但参考这篇论文详细介绍的，可以借鉴两个成熟的转换公式。

第一个就是WY表示法： 
![](https://www.zhihu.com/equation?tex=%5Cprod_%7Bi%3D1%7D%5Et%28I-%5Cbeta_tk_tk_t%5E%5Ctop%29%3DI-%5Csum_%7Bi%3D1%7D%5Etw_ik_i%5E%5Ctop+%5C%5C+w_n%3D%5Cbeta_nk_n-%5Cbeta_n%5Csum_%7Bi%3D1%7D%5E%7Bn-1%7D%28w_i%28k_i%5E%5Ctop+k_n%29%29+%5C%5C+u_n%3D%5Cbeta_nv_n-%5Cbeta_n%5Csum_%7Bi%3D1%7D%5E%7Bn-1%7D%28u_i%28k_i%5E%5Ctop+v_n%29%29) 

这个公式右边就是一个矩阵乘操作了。上面公式就进化成了： 
![](https://www.zhihu.com/equation?tex=%5Cbegin%7Bequation%7D++%5Cbegin%7Baligned%7D+%26+S_%7B%5Bt%5D%7D%3D%5Cprod_%7Bj%3D1%7D%5EC%28I-%5Cbeta_jk_jk_j%5E%5Ctop%29S_%7B%5Bt-1%5D%7D%2B%5Csum_%7Bi%3D1%7D%5E%7BC%7D%5Cprod_%7Bj%3Di%7D%5E%7BC%7D%28I-%5Cbeta_jk_jk_j%5E%5Ctop%29%5Cbeta_iv_ik_i%5E%5Ctop+%5C%5C++%26+%3D+%28I-%5Csum_%7Bj%3D1%7D%5ECw_jk_j%5E%5Ctop%29S_%7B%5Bt-1%5D%7D%2B%5Csum_%7Bi%3D1%7D%5EC%28I-%5Csum_%7Bj%3Di%7D%5ECu_jk_j%5E%5Ctop%29%5Cbeta_iv_ik_i%5E%5Ctop+%5C%5C++%26+%3D+%28I-%5Csum_%7Bj%3D1%7D%5ECw_jk_j%5E%5Ctop%29S_%7B%5Bt-1%5D%7D%2B%5Csum_%7Bi%3D1%7D%5EC%28%5Cbeta_iv_i-%5Cbeta_i%5Csum_%7Bj%3Di%7D%5ECu_jk_j%5E%5Ctop+v_i%29k_i%5E%5Ctop+%5C%5C++%26+%3D+%28I-W_%7B%5Bt%5D%7DK_%7B%5Bt%5D%7D%5E%5Ctop%29S_%7B%5Bt-1%5D%7D%2BU_%7B%5Bt%5D%7DK_%7B%5Bt%5D%7D%5E%5Ctop++%5Cend%7Baligned%7D+%5Cend%7Bequation%7D) 

推导到这，公式和前面普通线性attention就比较近似了，转换成一些操作的乘加，最后在GPU上就可以用矩阵乘来做计算了。

和前面类似，可以推导出每个chunk内的输出：

![](https://www.zhihu.com/equation?tex=O_%7B%5Bt%5D%7D%3DQ_%7B%5Bt%5D%7DS_%7B%5Bt%5D%7D%5E%5Ctop%2B%28Q_%7B%5Bt%5D%7DK_%7B%5Bt%5D%7D%5E%5Ctop+%E2%8A%99+M%29%28U_%7B%5Bt%5D%7D-W_%7B%5Bt%5D%7DS_%7B%5Bt%5D%7D%5E%5Ctop%29)  

第二个就是UT转换，前面公式就进一步转换成了。

UT转换主要是审视上面的w和u，认为这种表示从图论的角度来说，就是加权有向图：

- 节点代表序列位置
- 有向边链接位置i到r
- 边权重为 
![](https://www.zhihu.com/equation?tex=-%5Cbeta_tk_i%5E%5Ctop+k_j) 针对这种图呢，可以将上述公式转换为： 
![](https://www.zhihu.com/equation?tex=A_%7B%5Bt%5D%7D%3Dtril%28-diag%28%5Cbeta_%7B%5Bt%5D%7DK_%7B%5Bt%5D%7DK_%7B%5Bt%5D%7D%5E%5Ctop%29%29+%5C%5C+T_%7B%5Bt%5D%7D%3D%28I-A_%7B%5Bt%5D%7D%29%5E%7B-1%7D+%5C%5C+W_%7B%5Bt%5D%7D%3DT_%7B%5Bt%5D%7Ddiag%28%5Cbeta_t%29K_%7B%5Bt%5D%7D+%5C%5C+U_%7B%5Bt%5D%7D%3DT_%7B%5Bt%5D%7Ddiag%28%5Cbeta_t%29V_%7B%5Bt%5D%7D) 

到这我们发现所有的计算，都是一个累加的形式了，很好的可以利用矩阵单元了。

理解了这些推导，再来看KDA的推导简单很多了。