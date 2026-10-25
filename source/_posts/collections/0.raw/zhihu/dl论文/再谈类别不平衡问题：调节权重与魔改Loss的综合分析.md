---
title: "再谈类别不平衡问题：调节权重与魔改Loss的综合分析"
date: 2020-09-14
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/242763826

---

**作者 | 苏剑林**

**单位 | 追一科技**

**研究方向 | NLP、神经网络**

类别不平衡问题，也称为长尾分布问题，在之前的文章里已经有好几次相关讨论了，比如**[从loss的硬截断、软化到focal loss](https://link.zhihu.com/?target=https%3A//kexue.fm/archives/4733)**、**[将“softmax+交叉熵”推广到多标签分类问题](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzIwMTc4ODE0Mw%3D%3D%26mid%3D2247505145%26idx%3D1%26sn%3D42467a5475b64d3031a46594261600d2%26chksm%3D96ea0b79a19d826fb7e040968bbe928daf528d38e63d916b05cbc60a5d350755e619abc2aff8%23rd)**、**[通过互信息思想来缓解类别不平衡问题](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzIwMTc4ODE0Mw%3D%3D%26mid%3D2247509465%26idx%3D2%26sn%3D1a637068c358970af1ba1bfd1e4b0536%26chksm%3D96ea7a59a19df34f0734d645ba02e33f3df5ac7be442dac471b4799569140c0d0d7d10f27fb9%23rd)**。对于缓解类别不平衡，比较基本的方法就是调节样本权重，看起来“高端”一点的方法则是各种魔改loss了（比如Focal Loss、Dice Loss、Logits Adjustment等），本文希望比较系统地理解它们之间的联系。

![](https://pic2.zhimg.com/v2-4f3fff9f5dee061409e21141d68ea32b_r.jpg)
**从光滑准确率到交叉熵**
这里的分析主要以sigmoid的2分类为主，但多数结论可以平行推广到softmax的多分类。设x为输入，
![](https://www.zhihu.com/equation?tex=y%5Cin%5C%7B0%2C1%5C%7D) 为目标，
![](https://www.zhihu.com/equation?tex=p_%7B%5Ctheta%7D%28x%29+%5Cin+%5B0%2C+1%5D) 为模型。理想情况下，当然是要评测什么指标，我们就去优化那个指标。对于分类问题来说，最朴素的指标当然就是准确率，但准确率并没有办法提供有效的梯度，所以不能直接来训练。

为此，我们一个光滑化的指标。从之前的文章**[函数光滑化杂谈：不可导函数的可导逼近](https://link.zhihu.com/?target=https%3A//kexue.fm/archives/6620)**，准确率的光滑化近似是：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Bequation%7D%5Ctext%7Bsmooth_accuracy%7D%3D%5Cmathbb%7BE%7D_%7B%28x%2Cy%29%5Csim%5Cmathcal%7BD%7D%7D%5Cbig%5By+p_%7B%5Ctheta%7D%28x%29+%2B+%281+-+y%29%281+-+p_%7B%5Ctheta%7D%28x%29%29%5Cbig%5D%5Cend%7Bequation%7D+%5C%5C)

其中 
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BD%7D) 是训练数据集合。所以按道理，我们应该以 
![](https://www.zhihu.com/equation?tex=-%5Ctext%7Bsmooth_accuracy%7D) 为最小化的目标。但事实上，直接优化这个目标的效果并不好，更好的是去优化交叉熵：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Bequation%7D%5Ctext%7Bcross_entropy%7D%3D%5Cmathbb%7BE%7D_%7B%28x%2Cy%29%5Csim%5Cmathcal%7BD%7D%7D%5Cbig%5B-y+%5Clog+p_%7B%5Ctheta%7D%28x%29+-+%281+-+y%29%5Clog%281+-+p_%7B%5Ctheta%7D%28x%29%29%5Cbig%5D%5Cend%7Bequation%7D+%5C%5C)

这就有点耐人寻味了，明明 
![](https://www.zhihu.com/equation?tex=%5Ctext%7Bsmooth_accuracy%7D) 更接近我们的评测指标，为什么用交叉熵反而对评测指标更有利呢？

这需要用梯度来解释。对于 
![](https://www.zhihu.com/equation?tex=p_%7B%5Ctheta%7D%28x%29)，它通常是经过了sigmoid激活的，也就是 
![](https://www.zhihu.com/equation?tex=p_%7B%5Ctheta%7D%28x%29%3D%5Csigma%28z_%7B%5Ctheta%7D%28x%29%29)，其中 
![](https://www.zhihu.com/equation?tex=%5Csigma%28t%29%3D%5Cfrac%7B1%7D%7B1%2Be%5E%7B-t%7D%7D)，它的导数 
![](https://www.zhihu.com/equation?tex=%5Csigma%27%28t%29%3D%5Csigma%28t%29%281+-+%5Csigma%28t%29%29)，而 
![](https://www.zhihu.com/equation?tex=z_%7B%5Ctheta%7D%28x%29) 就是我们通常称的“**logits**”。

假设y是1，那么对应的 
![](https://www.zhihu.com/equation?tex=-%5Ctext%7Bsmooth_accuracy%7D) 就是 
![](https://www.zhihu.com/equation?tex=-p_%7B%5Ctheta%7D%28x%29%3D%5Csigma%28z_%7B%5Ctheta%7D%28x%29%29)，它的梯度是：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Bequation%7D-%5Cnabla_%7B%5Ctheta%7D+p_%7B%5Ctheta%7D%28x%29+%3D+-+p_%7B%5Ctheta%7D%28x%29+%281+-+p_%7B%5Ctheta%7D%28x%29%29%5Cnabla_%7B%5Ctheta%7Dz_%7B%5Ctheta%7D%28x%29%5Cend%7Bequation%7D+%5C%5C)

刚才说了，y是1，所以训练目标是 
![](https://www.zhihu.com/equation?tex=p_%7B%5Ctheta%7D%28x%29%5Cto+1)，因此我们期望当 
![](https://www.zhihu.com/equation?tex=p_%7B%5Ctheta%7D%28x%29) 接近于0时（误差较大），会带来一个较大的梯度，当 
![](https://www.zhihu.com/equation?tex=p_%7B%5Ctheta%7D%28x%29) 接近于1时（误差较小），会带来一个较小的梯度。

但上述 
![](https://www.zhihu.com/equation?tex=-%5Cnabla_%7B%5Ctheta%7D+p_%7B%5Ctheta%7D%28x%29) 显然不是如此，它的调节项 
![](https://www.zhihu.com/equation?tex=p_%7B%5Ctheta%7D%28x%29+%281+-+p_%7B%5Ctheta%7D%28x%29%29) 在0.5处取到最大值，至于0和1都是最小值，这就意味着如果误差太大了，梯度反而也小，这就带来优化效率的低下，最终导致整体效果不好。相反，对于交叉熵来说，有：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Bequation%7D-%5Cnabla_%7B%5Ctheta%7D+%5Clog+p_%7B%5Ctheta%7D%28x%29+%3D+-+%281+-+p_%7B%5Ctheta%7D%28x%29%29%5Cnabla_%7B%5Ctheta%7Dz_%7B%5Ctheta%7D%28x%29%5Cend%7Bequation%7D+%5C%5C)

刚好把梯度里边带来负面作用的 
![](https://www.zhihu.com/equation?tex=p_%7B%5Ctheta%7D%28x%29) 因子去掉了，因此优化效率更高，最终效果也好些。上述分析针对的是y=1，如果y=0，那么结论也是一样的。

**从光滑F1到加权交叉熵**
从这个过程中，我们可以感觉到，对loss的各种魔改，本质上来说都只是在调整梯度，得到更合理的梯度，我们就能实现更有效的优化，得到更好的模型。此外，我们再思考上述转换过程，本来近似目标的梯度是 
![](https://www.zhihu.com/equation?tex=-%5Cnabla_%7B%5Ctheta%7Dp_%7B%5Ctheta%7D%28x%29)，结果 
![](https://www.zhihu.com/equation?tex=-%5Cnabla_%7B%5Ctheta%7D%5Clog+p_%7B%5Ctheta%7D%28x%29) 效果更好。

如果我们不去仔细分析背后的原因，直接把 
![](https://www.zhihu.com/equation?tex=p%5Cto+%5Clog+p) 当作一个“**公理**”来使用，那能否成立呢？会不会带来一些有意思的结果呢？

举个例子，当负样本远远多于正样本时，我们的评测指标通常都不再是准确率了（不然直接全部输出0准确率就很高了），我们通常关心正类的F1，而F1的直接优化也是不容易的，所以我们也需要一个光滑版，文章**[函数光滑化杂谈：不可导函数的可导逼近](https://link.zhihu.com/?target=https%3A//kexue.fm/archives/6620)**同样也给出了结果：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Bequation%7D%5Ctext%7Bsmooth_f1%7D%3D%5Cfrac%7B2+%5Cmathbb%7BE%7D_%7B%28x%2Cy%29%5Csim%5Cmathcal%7BD%7D%7D%5Cbig%5By+p_%7B%5Ctheta%7D%28x%29%5Cbig%5D%7D%7B%5Cmathbb%7BE%7D_%7B%28x%2Cy%29%5Csim%5Cmathcal%7BD%7D%7D%5Cbig%5By+%2B+p_%7B%5Ctheta%7D%28x%29%5Cbig%5D%7D%5Cend%7Bequation%7D+%5C%5C)

所以我们的最小化目标原本是 
![](https://www.zhihu.com/equation?tex=-%5Ctext%7Bsmooth_f1%7D)。根据上述“公理”，我们先直接对 
![](https://www.zhihu.com/equation?tex=-%5Ctext%7Bsmooth_f1%7D) 求梯度：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Bequation%7D%5Cbegin%7Baligned%7D%26-%5Cnabla_%7B%5Ctheta%7D%5Cfrac%7B2+%5Cmathbb%7BE%7D_%7B%28x%2Cy%29%5Csim%5Cmathcal%7BD%7D%7D%5Cbig%5By+p_%7B%5Ctheta%7D%28x%29%5Cbig%5D%7D%7B%5Cmathbb%7BE%7D_%7B%28x%2Cy%29%5Csim%5Cmathcal%7BD%7D%7D%5Cbig%5By+%2B+p_%7B%5Ctheta%7D%28x%29%5Cbig%5D%7D%5C%5C++%3D%26-2%5Cfrac%7B%5Cmathbb%7BE%7D_%7B%28x%2Cy%29%5Csim%5Cmathcal%7BD%7D%7D%5Cbig%5By+%5Cnabla_%7B%5Ctheta%7Dp_%7B%5Ctheta%7D%28x%29%5Cbig%5D%7D%7B%5Cmathbb%7BE%7D_%7B%28x%2Cy%29%5Csim%5Cmathcal%7BD%7D%7D%5Cbig%5By+%2B+p_%7B%5Ctheta%7D%28x%29%5Cbig%5D%7D+%2B+2%5Cfrac%7B%5Cmathbb%7BE%7D_%7B%28x%2Cy%29%5Csim%5Cmathcal%7BD%7D%7D%5Cbig%5By+p_%7B%5Ctheta%7D%28x%29%5Cbig%5D%5Cmathbb%7BE%7D_%7B%28x%2Cy%29%5Csim%5Cmathcal%7BD%7D%7D%5Cbig%5B%5Cnabla_%7B%5Ctheta%7Dp_%7B%5Ctheta%7D%28x%29%5Cbig%5D%7D%7B%5Cleft%28%5Cmathbb%7BE%7D_%7B%28x%2Cy%29%5Csim%5Cmathcal%7BD%7D%7D%5Cbig%5By+%2B+p_%7B%5Ctheta%7D%28x%29%5Cbig%5D%5Cright%29%5E2%7D%5C%5C++%3D%26-%5Cfrac%7B2%5Cmathbb%7BE%7D_%7B%28x%2Cy%29%5Csim%5Cmathcal%7BD%7D%7D%5Cbig%5B%5Cbig%28y-%5Ctext%7Bsmooth_f1%7D%5Cbig%29%5Cnabla_%7B%5Ctheta%7Dp_%7B%5Ctheta%7D%28x%29%5Cbig%5D%7D%7B%5Cmathbb%7BE%7D_%7B%28x%2Cy%29%5Csim%5Cmathcal%7BD%7D%7D%5Cbig%5By+%2B+p_%7B%5Ctheta%7D%28x%29%5Cbig%5D%7D++%5Cend%7Baligned%7D%5Cend%7Bequation%7D%5C%5C)

其中 $\frac{2}{\mathbb{E}{(x,y)\sim\mathcal{D}}[y + p{\theta}(x)]} $是整体的一个缩放因子，我们主要关心的还是每个样本的梯度，所以结果是：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Bequation%7D-%5Cmathbb%7BE%7D_%7B%28x%2Cy%29%5Csim%5Cmathcal%7BD%7D%7D%5Cbig%5B%5Cbig%28y-%5Ctext%7Bsmooth_f1%7D%5Cbig%29%5Cnabla_%7B%5Ctheta%7Dp_%7B%5Ctheta%7D%28x%29%5Cbig%5D%5Cend%7Bequation%7D+%5C%5C)

根据 
![](https://www.zhihu.com/equation?tex=p%5Cto+%5Clog+p) “公理”（负样本则是 
![](https://www.zhihu.com/equation?tex=-p%5Cto%5Clog%281-p%29)），我们得到最后的梯度为：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Bequation%7D-%5Cmathbb%7BE%7D_%7B%28x%2Cy%29%5Csim%5Cmathcal%7BD%7D%7D%5Cbig%5By%5Ccdot%5Cbig%28y-%5Ctext%7Bsmooth_f1%7D%5Cbig%29%5Ccdot%5Cnabla_%7B%5Ctheta%7D%5Clog+p_%7B%5Ctheta%7D%28x%29+%2B+%281+-+y%29%5Ccdot%5Ctext%7Bsmooth_f1%7D%5Ccdot%5Cnabla_%7B%5Ctheta%7D%5Clog+%281-p_%7B%5Ctheta%7D%28x%29%29%5Cbig%5D%5Cend%7Bequation%7D+%5C%5C)

这等价于优化目标：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Bequation%7D-%5Cmathbb%7BE%7D_%7B%28x%2Cy%29%5Csim%5Cmathcal%7BD%7D%7D%5Cbig%5By%5Ccdot%5Cbig%28y-%5Ctext%7Bsmooth_f1%7D%5Cbig%29%5Ccdot%5Clog+p_%7B%5Ctheta%7D%28x%29+%2B+%281+-+y%29%5Ccdot%5Ctext%7Bsmooth_f1%7D%5Ccdot%5Clog+%281-p_%7B%5Ctheta%7D%28x%29%29%5Cbig%5D%5Cend%7Bequation%7D+%5C%5C)

的梯度（其中 
![](https://www.zhihu.com/equation?tex=%5Ctext%7Bsmooth_f1%7D) 不求梯度），所以这其实就是用 
![](https://www.zhihu.com/equation?tex=y-%5Ctext%7Bsmooth_f1%7D) 调节正样本的交叉熵，用 
![](https://www.zhihu.com/equation?tex=%5Ctext%7Bsmooth_f1%7D) 调节负样本的交叉熵。一开始F1值会比较小，所以模型集中精力在优化正样本，后期F1比较大后，模型反而集中精力在优化负样本了，这其实正体现了F1指标的特殊性：对于F1来说，既要尽可能挖掘出正样本，但是负样本也不能错得太多，所以不大适合设置固定不变的调节因子，而是需要动态的调节。

**从扩大边界到Logits调整**
其实无论评测指标是什么，我们肯定都是希望每一个样本都尽可能预测对。问题在于，样本数目比较少的类别，因为学习得不够充分，所以泛化性能不会太好。

让我们从几何角度来思考这个问题。理想情况下，在编码空间里边，每一类样本都占据着自己的一个“地盘”，不同类的“地盘”是互不相交的。样本数目较少的类别泛化性能不大好，主要就体现为其类别所占据的“地盘”比较小，而且往往还会受到类别数目较多的样本的“打压”，因此“生存”几乎都成了问题，更不用说照顾到训练集没有出现过的新样本了。

怎么解决这个问题呢？其实也很形象，如果样本数目少的类别，里边的样本个个都是“大佬”，一个打十个的那种，那么就算样本少，也能在“地盘之争”中不落下风。让我们考虑一个n分类问题，某个样本的编码向量为 
![](https://www.zhihu.com/equation?tex=f_%7B%5Ctheta%7D%28x%29)，类别向量为 
![](https://www.zhihu.com/equation?tex=u_y)，那么该样本与类别向量的相似度，一般用内积 
![](https://www.zhihu.com/equation?tex=%5Clangle+f_%7B%5Ctheta%7D%28x%29%2C+u_y%5Crangle) 来度量。

假设每个样本能占据半径为 
![](https://www.zhihu.com/equation?tex=r_y) 的“地盘”，这样就是说，满足 
![](https://www.zhihu.com/equation?tex=%5CVert+z+-+f_%7B%5Ctheta%7D%28x%29%5CVert+%5Cleq+r_y) 的任意z都算是该样本的编码向量，这也就意味着，满足这个条件的任意z，它跟 
![](https://www.zhihu.com/equation?tex=u_y) 的相似度都应该大于它跟其他类别的相似度。

现在我们考虑：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Bequation%7D%5Clangle+z%2C+u_y%5Crangle+%3D+%5Clangle+f_%7B%5Ctheta%7D%28x%29%2C+u_y%5Crangle+%2B+%5Clangle+z+-+f_%7B%5Ctheta%7D%28x%29%2C+u_y%5Crangle%5Cend%7Bequation%7D+%5C%5C)

由于 
![](https://www.zhihu.com/equation?tex=%5CVert+z+-+f_%7B%5Ctheta%7D%28x%29%5CVert+%5Cleq+r_y)，所以显然有：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Bequation%7D%5Clangle+f_%7B%5Ctheta%7D%28x%29%2C+u_y%5Crangle+-+r_y%5CVert+u_y%5CVert%5Cleq%5Clangle+z%2C+u_y%5Crangle+%5Cleq+%5Clangle+f_%7B%5Ctheta%7D%28x%29%2C+u_y%5Crangle+%2B+r_y%5CVert+u_y%5CVert%5Cend%7Bequation%7D+%5C%5C)

所以，为了达到“z跟 
![](https://www.zhihu.com/equation?tex=u_y) 的相似度都应该大于它跟其他类别的相似度”这个目的，只需要“z跟 
![](https://www.zhihu.com/equation?tex=u_y) 的最小相似度都应该大于它跟其他类别的最大相似度”，因此我们的优化目标变为：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Bequation%7D-%5Clog%5Cfrac%7Be%5E%7B%5Clangle+f_%7B%5Ctheta%7D%28x%29%2C+u_y%5Crangle+-+r_y%5CVert+u_y%5CVert%7D%7D%7Be%5E%7B%5Clangle+f_%7B%5Ctheta%7D%28x%29%2C+u_y%5Crangle+-+r_y%5CVert+u_y%5CVert%7D%2B%5Csum%5Climits_%7Bi%5Cneq+y%7D+e%5E%7B%5Clangle+f_%7B%5Ctheta%7D%28x%29%2C+u_i%5Crangle+%2B+r_y%5CVert+u_i%5CVert%7D%7D%5Cend%7Bequation%7D+%5C%5C)

可以看到，这其实就相当于am-softmax、circle loss等带有margin的softmax变种，具体形式其实不重要，只需要为类别小的类设置更大的margin就好（样本少的类别每个样本都更“能打”）。那怎么设计每个类的margin呢？

之前的文章**[通过互信息思想来缓解类别不平衡问题](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzIwMTc4ODE0Mw%3D%3D%26mid%3D2247509465%26idx%3D2%26sn%3D1a637068c358970af1ba1bfd1e4b0536%26chksm%3D96ea7a59a19df34f0734d645ba02e33f3df5ac7be442dac471b4799569140c0d0d7d10f27fb9%23rd)**就提供了一个方案：
![](https://www.zhihu.com/equation?tex=m_y%3D-%5Ctau%5Clog+p%28y%29)，这里的p(y)是先验分布，那么就有：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Bequation%7D-%5Clog%5Cfrac%7Be%5E%7B%5Clangle+f_%7B%5Ctheta%7D%28x%29%2C+u_y%5Crangle+%2B+%5Ctau+%5Clog+p%28y%29%7D%7D%7B%5Csum%5Climits_%7Bi%7D+e%5E%7B%5Clangle+f_%7B%5Ctheta%7D%28x%29%2C+u_i%5Crangle+%2B+%5Ctau+%5Clog+p%28i%29%7D%7D%5Cend%7Bequation%7D+%5C%5C)

这样我们就联系到了logit adjustment loss了，或者说给logit adjustment loss提供了一种几何直观理解。本质上来说，logit adjustment也是在调节权重，只不过一般的调节权重是在损失函数的 
![](https://www.zhihu.com/equation?tex=%5Clog) 之后调整，而logit adjustment则是在 
![](https://www.zhihu.com/equation?tex=%5Clog) 之前调整。

**感觉上可以小结一下了**
本文就类别不平衡现象及其对策做了一些思考，主要是希望通过一些相对直观的引导，来揭示一些魔改loss的思路，从中我们也可以发现，其实这些方案本质上都算是在调节样本权重或者类权重。本文的分析思路相对来说比较散漫，基本上是笔者的头脑风暴内容，如果错漏之处，请读者见谅并指出。

**#投 稿 通 道#**

如何才能让更多的优质内容以更短路径到达读者群体，缩短读者寻找优质内容的成本呢？ **答案就是：你不认识的人。**

总有一些你不认识的人，知道你想知道的东西。PaperWeekly 或许可以成为一座桥梁，促使不同背景、不同方向的学者和学术灵感相互碰撞，迸发出更多的可能性。

PaperWeekly 鼓励高校实验室或个人，在我们的平台上分享各类优质内容，可以是**最新论文解读**，也可以是**学习心得**或**技术干货**。我们的目的只有一个，让知识真正流动起来。

**来稿标准：**

• 稿件确系个人**原创作品**，来稿需注明作者个人信息（姓名+学校/工作单位+学历/职位+研究方向）

• 如果文章并非首发，请在投稿时提醒并附上所有已发布链接

• PaperWeekly 默认每篇文章都是首发，均会添加“原创”标志

**投稿方式：**

• 方法一：在PaperWeekly知乎专栏页面点击“投稿”，即可递交文章

• 方法二：发送邮件至：hr@paperweekly.site ，所有文章配图，请单独在附件中发送

• 请留下即时联系方式（微信或手机），以便我们在编辑发布时和作者沟通

**关于PaperWeekly**
PaperWeekly 是一个推荐、解读、讨论、报道人工智能前沿论文成果的学术平台。如果你研究或从事 AI 领域，欢迎在公众号后台点击**「交流群」**，小助手将把你带入 PaperWeekly 的交流群里。

**加入社区：**[http://paperweek.ly](https://link.zhihu.com/?target=http%3A//paperweek.ly/)

**微信公众号：PaperWeekly**

**新浪微博：@PaperWeekly**