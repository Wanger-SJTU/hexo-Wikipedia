---
title: "对于一个badcase，是加大量类badcase做sft，还是加大量的样本对做dpo？"
date: 2025-02-01
tags: [知乎]
source: https://www.zhihu.com/question/9246153349/answer/90565674993

---

如果答主说的badcase是指大模型生成的不良回复的话，应该用DPO。

首先，目前阶段用梯度上升等手段进行machine unlearning有很多挑战，不是首选方案。简单的梯度上升不会收敛，需要同时用正样本和KL散度的目标维持输出分布不会偏离基线模型。方案复杂效果差。

[Large Language Model Unlearning](https://link.zhihu.com/?target=https%3A//arxiv.org/html/2310.10683v2)其次，SFT只能学正样本，并不能直接让大模型纠正错误。如果对于每个问题不良回复，都额外对原问题人工编写正确回复再用SFT学习，那么原始的不良回复就没有利用上，不是浪费了负样本吗？

因此这里解决方法只能是DPO或者GRPO。

下面从训练动力学角度考虑为什么DPO能解决题主这种badcase的问题。

首先，DPO和SFT的梯度更新公式很像。

[Direct Preference Optimization: Your Language Model is Secretly a Reward Model](https://link.zhihu.com/?target=https%3A//arxiv.org/html/2305.18290v3)DPO论文给出的梯度公式是：

![](https://www.zhihu.com/equation?tex=%5Cnabla_%5Ctheta+%5Cmathcal%7BL%7D_%5Ctext%7BDPO%7D%28%5Cpi_%5Ctheta%3B%5Cpi_%7Bref%7D%29+%3D+%5C%5C+-%5Cbeta%5Cmathbb%7BE%7D_%7B%28x%2C+y_w%2C+y_l%29+%5Csim+%5Cmathcal%7BD%7D%7D+%5Cbigg%5B%5Cunderbrace%7B%5Csigma%28%5Chat%7Br%7D_%5Ctheta%28x%2C+y_l%29+-+%5Chat%7Br%7D_%5Ctheta+%28x%2C+y_w%29%29%7D_%5Ctext%7Bhigher+weight+when+reward+estimate+is+wrong%7D%5Cbigg%5B%5Cunderbrace%7B%5Cnabla_%5Ctheta%5Clog+%5Cpi%28y_w+%5Cmid+x%29%7D_%5Ctext%7Bincrease+likelihood+of+%24y_w%24%7D+-+%5Cunderbrace%7B%5Cnabla_%5Ctheta%5Clog%5Cpi%28y_l+%5Cmid+x%29%7D_%5Ctext%7Bdecrease+likelihood+of+%24y_l%24%7D%5Cbigg%5D%5Cbigg%5D%2C+) 

上述公式里，
![](https://www.zhihu.com/equation?tex=x)是问题， 
![](https://www.zhihu.com/equation?tex=y_w)是正确答案，
![](https://www.zhihu.com/equation?tex=y_l)是错误答案， 
![](https://www.zhihu.com/equation?tex=%5Chat%7Br%7D_%5Ctheta)是当前策略模型和参考模型的log概率之差（按论文里的说法，相当于强化学习的优势）。

而SFT的梯度公式是：

![](https://www.zhihu.com/equation?tex=%5Cnabla_%5Ctheta+%5Cmathcal%7BL%7D_%5Ctext%7BSFT%7D+%3D+-%5Cmathbb%7BE%7D+%5Cleft%5B+%5Cnabla_%5Ctheta+%5Clog+%5Cpi_%5Ctheta%28y+%7C+x%29+%5Cright%5D) 

如果我们把常数项
![](https://www.zhihu.com/equation?tex=%5Cbeta)和取平均数的
![](https://www.zhihu.com/equation?tex=%5Cmathbb%7BE%7D)省略，那么其实DPO的梯度公式里藏着两处SFT：

![](https://www.zhihu.com/equation?tex=%5Cnabla_%5Ctheta+%5Cmathcal%7BL%7D_%5Ctext%7BDPO%7D+%3D+%5Csigma%28...%29+%5Cleft%28+%5Cnabla_%5Ctheta+%5Cmathcal%7BL%7D_%5Ctext%7BSFT%7D%28y_w%29+-+%5Cnabla_%5Ctheta+%5Cmathcal%7BL%7D_%5Ctext%7BSFT%7D%28y_l%29+%5Cright%29) 

![](https://www.zhihu.com/equation?tex=%5Csigma%28...%29)在每个样本上是个标量，可以看成是给每个样本乘上一个系数的动态学习率，类似于learning rate decay但是能更精确的判断每个样本有没有被充分学过，而不是根据step数量无脑下降学习率。所以，整体而言，DPO在数学上等价于在同一个minibatch对正样本梯度下降SFT，对负样本梯度上升SFT，并随着训练动态调整每个样本的学习率。

可以看到DPO的参考模型只在计算动态学习率时用到（这个动态学习率的作用是防止过度训练模型已经学会的东西，参见DPO原论文附录C.3的讨论）。

现在问题来了，按前面的说法，单独使用负样本梯度上升会导致不收敛（除非加入其他正则化），而DPO内部也有梯度上升，为什么DPO就不会炸呢？

这是因为，前面提到的SFT的梯度如果在词表维度展开是这样的。

![](https://www.zhihu.com/equation?tex=%5Cnabla_%7Bz_i%7D+%5Cmathcal%7BL%7D_%5Ctext%7BSFT%7D++%3D++%5Cbegin%7Bcases%7D++%5Cpi_%7B%5Ctheta%7D%28i+%5Cmid+x%29+-+1%2C+%26+i+%3D+y+%5C+%28%5Ctext%7Blabel+token%7D%29%2C+%5C%5C+%5Cpi_%7B%5Ctheta%7D%28i+%5Cmid+x%29%2C+%26+i+%5Cneq+y+%5C+%28%5Ctext%7B%E9%9D%9Elabel+token%7D%29%2C+%5Cend%7Bcases%7D+) 

可以看到SFT的所有“非label token”的梯度都是正数，梯度下降时会倾向于减少这些token的log概率，效果上无非相当于某种正则化，并不会引发收敛性的问题。然而，如果对负样本单独跑梯度上升，所有在负样本中的“非label token”的log概率都会上升，这可能就会导致不收敛。

想象一下如果一个样本的问题是“1加1等于2，对吗？”，正样本是“对”，负样本是“错”。但无论如何答案不应该是“China”。如果仅对负样本梯度上升训练，会导致除了“错”以外的整个词表的log概率都上升，模型可能会学到“China”，这可能就不太对劲。log概率上升的梯度在罕见词上很小，但是当使用Adam等具有一阶动量的优化器时，即使很小的梯度也会积累一阶动量，最终还是会炸。

DPO不炸的秘密就在于，在同一个minibatch里同时跑梯度上升和梯度下降，大致能抵消掉对整个词表log概率的上升和下降趋势。这也是为什么DPO的公式不能改成分别计算正样本和负样本的动态学习率，比如以下这样把动态学习率分开是不行的：

![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BL%7D_%5Ctext%7BDPO_variant%7D+%3D+%5Clog+%5Csigma%5Cbigl%28-%5Chat%7Br%7D_%5Ctheta%28x%2Cy_l%29%5Cbigr%29+-+%5Clog+%5Csigma%5Cbigl%28%5Chat%7Br%7D_%5Ctheta%28x%2Cy_w%29%5Cbigr%29) 

![](https://www.zhihu.com/equation?tex=%5Cnabla_%5Ctheta+%5Cmathcal%7BL%7D_%5Ctext%7BDPO_variant%7D+%3D+%5Cbeta%5Csigma%28-%5Chat%7Br%7D_%5Ctheta%28x%2C+y_w%29%29+%5Cnabla_%5Ctheta+%5Cmathcal%7BL%7D_%5Ctext%7BSFT%7D%28y_w%29+-+%5Cbeta%5Csigma%28%5Chat%7Br%7D_%5Ctheta%28x%2C+y_l%29%29+%5Cnabla_%5Ctheta+%5Cmathcal%7BL%7D_%5Ctext%7BSFT%7D%28y_l%29+) 

DPO只在负样本的动态学习率小于等于正样本的动态学习率时，才能保证整个词表log概率的上升趋势能被抵消。而改成分开计算二者的动态学习率不能提供这一保证。