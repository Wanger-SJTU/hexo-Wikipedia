---
title: "deformable convolution可变形卷积（4uiiurz1-pytorch版）源码分析"
date: 2020-01-18
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/102707081

---

暑假老板给了个工作要用到可变卷积（[Deformable Convolutional Networks](https://zhuanlan.zhihu.com/p/102707081/h%3C/i%3Ettp://www.baidu.com/link?url=9cjIuEjRWep_NtswjToZsj89nvbNl8HJYcuFgZ_mnLbQfRnAhfILve0lHSHl7pSu)），原作者用cuda实现了相关操作，那个时候不是很能看懂，所以找了另一个大佬用纯pytorch实现的版本(冗余比较多，吃内存，其实感觉不是很棒)。当时上手也很苦噶，期末了想起来，写个总结分析一下源码啥的，也希望能帮到同是小白的朋友。

先上一哈code地址[https://github.com/4uiiurz1/pytorch-deform-conv-v2/blob/master/deform_conv_v2.py](https://link.zhihu.com/?target=https%3A//github.com/4uiiurz1/pytorch-deform-conv-v2/blob/master/deform_conv_v2.py)  再给一下论文地址[https://arxiv.org/abs/1703.06211](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1703.06211)感谢一哈大佬的工作

关于这个论文核心思想这里就不详细描述，这里就简要的说一下，传统的卷积操作形状是规则的，如下式

![](https://pic4.zhimg.com/v2-d10645f538c87f049b99cb94cf7bdc3f_r.jpg)传统卷积 简单地说就是对featuremap上的一块小区域进行加权平均，再输出相应值，其形状是规则的方形。作者觉得这个感受野太规则，不能很好地捕捉特征，所以在此基础上对卷积又加了偏置

![](https://pic1.zhimg.com/v2-1e45d68630ebf239520ba6918ea84066_r.jpg)可变卷积其实就是在原来的位置上加了一定的偏移

那么这个偏移是怎么去学习实现的呢？

我们首先看一下代码中这个可变卷积类的初始化函数

![](https://pic4.zhimg.com/v2-b0de34148ccc4e788aec1c858e1a0677_r.jpg)可变卷积开始是对一些常规参数的设置(kernel_size,stride,padding)，后续定义了self.conv（最终输出的卷积层，设置输入通道数和输出通道数），self.p_conv（偏置层，学习之前公式(2)中说的偏移量），self.m_conv(权重学习层，这个是后来提出的第二个版本的卷积也就是公式(3)描述的卷积)。register_backward_hook是为了方便查看这几层学出来的结果，对网络结构无影响。

self.p_conv和self.m_conv输入通道由我们自己设置，self.p_conv输出通道为2*kernel_size*kernel_size代表了卷积核中所有元素的偏移坐标(因为同时存在x和y的偏移，所以要乘以2)，而self.p_conv输出通道为(kernel_size*kernel_size)代表了卷积核每个元素的权重。他们的kernel_size为3，**stride可以由我们自己设置(这里涉及之前公式(1,2)对于 
![](https://www.zhihu.com/equation?tex=p_0) 的查找)stride默认值为1**

接下来我们分析一下前传函数

![](https://pica.zhimg.com/v2-7cd59d2467152e6a3c67c7273f426806_r.jpg)注释中的N=kernel_size*kernel_size这是最开始的一部分，首先我们的数据先经过self.p_conv学习出offset(坐标偏移量)，如果modulation设置为true的话就同时学习出偏置。如之前提到的这两层的stride都是由自己设置的，所以他们所学习出来的feature map上每个元素恰好与卷积核中心是一一对应的。如下图

![](https://pic3.zhimg.com/v2-438063f2198af87b1f780200d6808ae6_1440w.jpg)p_conv卷积过程(stride为2，kernel_size为3)
![](https://pica.zhimg.com/v2-9cbf2e3b90e7516f246f9e940be6d750_1440w.jpg)p_conv卷积后的feature map上每个元素恰好与卷积核中心是一一对应由图片可以知道通过p_conv后的feature map(上图全红的矩形)上每个元素恰好与卷积核中心是一一对应，也就是说通过该feature map的尺寸，卷积核的尺寸，步长可以推算出在卷积过程中卷积核的中心坐标。 如上图，我们可知卷积操作次数为6(由feature map的尺寸2*3得出)，第一次卷积，卷积核的中心坐标为(1,1)(由卷积核尺寸得出)，后续所有卷积核中心坐标(由第一次中心坐标和步长推出)。

接下来通过self._get_p()这个函数获取所有卷积核中心坐标 
![](https://www.zhihu.com/equation?tex=p_0) 具体操作如下

首先通过函数get_p_n()生成了卷积的相对坐标

![](https://pic1.zhimg.com/v2-8c8aa3e68ddb6b6cefec7fc2819ab9a2_r.jpg)生成卷积相对坐标把卷积的中心点定义为原点，其他点坐标都相对于原点而言，比如self.kernel_size为3，通过torch.meshgrid生成从（-1，-1）到（1，1）9个坐标。将坐标的x和y分别存储，然后再将x，y以(1,2N,1,1)的形式返回，这样我们就获取了一个卷积核的所有相对坐标。

 接下来获取卷积核在feature map上对应的中心坐标，也就是 
![](https://www.zhihu.com/equation?tex=p_0) ，代码实现如下

![](https://pic3.zhimg.com/v2-9744aa8edc419841bf76b9fa046e0cf6_r.jpg)获取feature map上的坐标流程如同之前所说，通过torch.meshgrid生成所有中心坐标，通过kernel_size推断初始坐标通过self.stride推断所有中心坐标，(这里注意一下，代码默认torch.arange从1开始，实际上这是kernel_size为3时的情况，我认为代码这里是有那么一点小瑕疵的，torch.arange应当从kernel_size//2开始，已经向作者提出这个问题还没得到反馈)

这个_get_p_0的函数和该图

![](https://pica.zhimg.com/v2-9cbf2e3b90e7516f246f9e940be6d750_1440w.jpg)完全是一一对应的，输入参数的h,w就是通过p_conv后的feature map的尺寸信息，接下来讲获取的张量通过repeat()扩展成(1,2N,h,w)，然后再将我们获取的相对坐标信息与中心坐标相加就获得了我们卷积核的所有坐标，即公式(1)

现在我们看_get_p()中的相关操作就非常好理解了

![](https://pic1.zhimg.com/v2-b4310c42d780cb92d3d603bc85cb1a2c_r.jpg)卷积坐标加上之前学习出的offset后就是论文提出的公式(2)也就是加上了偏置后的卷积操作。比如p(在N=0时)p_0就是中心坐标，而p_n=(-1,-1)，所以此时的p就是卷积核中心坐标加上(-1,-1)(即红色块左上方的块)再加上offset。同理可得N=1,N=2...分别代表了一个卷积核上各个元素。

当然这里仍然有一个问题，我们学习出的量是float类型的，而像素坐标都是整数类型的，所以我们还要用双线性插值的方法去推算相应的值

![](https://picx.zhimg.com/v2-1f75ded20059c06ef7468a209ccb10e9_r.jpg)获取坐标后进行线性插值根据线性插值理论我们需要获取4个整数坐标，所以在获取所有可变卷积核的坐标p后，通过floor()获取不超过本身的最大整数，也就是左上角坐标q_lt，同时为了防止偏移量过大移出feature map的范围通过torch.clamp对卷积核坐标做了限制。接下来只要通过左上角坐标就可以推出左下角(q_lb)，右上角(q_rt)，右下角(q_rb)坐标。

![](https://picx.zhimg.com/v2-2690d02e31c792ea4c21d41fc5341159_r.jpg)双线性插值算法示意图获取4个点的坐标后根据上图公式可以计算出像素值前面的系数(即 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7B%28x_0-x%29%28y_0-y%29%7D%7B%28x_1-x_0%29%28y_1-y_0%29%7D) 这部分)，代码中这4个系数分别为g_lt,g_rb,g_lb,g_rt。现在只获取了坐标值，我们最终木的是获取相应坐标上的值，这里我们通过self._get_x_q()获取相应值。

![](https://pica.zhimg.com/v2-a4cbb480f534c371d22d491d8eb6fe98_r.jpg)通过坐标获取相应值输入x是我们最早输入的数据x，q则是我们的坐标信息。首先我们获取q的相关尺寸信息(b,h,w,2N)，再获取x的w保存在padding_w中，将x(b,c,h,w)通过view变成(b,c,h*w)。这样子就把x的坐标信息压缩在了最后一个维度(h*w)，这样做的目的是为了使用tensor.gather()通过坐标来获取相应值。**(这里注意下q的h,w和x的h,w不一定相同，比如stride不为1的时候)**

同样地，由于(h,w)被压缩成了(h*w)所以在这个维度上，每过w个元素，就代表了一行，所以我们的坐标index=offset_x*w+offset_y(这样就能在h*w上找到(h,w)的相应坐标)同时再把偏移expand()到每一个通道最后返回x_offset(b,c,h,w,N)。(最后输出x_offset的h,w指的是x的h,w而不是q的)

![](https://pic3.zhimg.com/v2-3a902f08959219d9b187c60c46c5e712_r.jpg)返回张量(b,c,h,w)在获取所有值后我们计算出x_offset，但是x_offset的size是(b,c,h,w,N)，我们的目的是将最终的输出结果的size变成和x一致即(b,c,h,w)，所以在最后用了一个reshape的操作。

![](https://picx.zhimg.com/v2-032c9c2a4d71bdf22784c26bb66f4edd_r.jpg)对(b,c,h,w,N)进行reshape函数首先获取了x_offset的所有size信息，然后以kernel_size为单位进行reshape，因为N=kernel_size*kernel_size，所以我们分两次进行reshape，第一次先把输入view成(b,c,h,ks*w,ks)，第二次再view将size变成(b,c,h*ks,w*ks)  (这部分我实在不知道咋描述了，图也画的比较捉急，大家康康，自己悟一下)

![](https://pic3.zhimg.com/v2-53d8b8598d0651e44970ef66c8930044_r.jpg)最后的reshape操作之前我们说过N=0,1,2...代表了卷积核上的各个元素，而这个reshape操作就是把这些元素变成了二维空间的形式(h,w)。实际上这样子做就相当于把每次卷积都单独拎出来，如下图

![](https://pic3.zhimg.com/v2-f8a8aa7b50126ba8d307b214bc1b3192_r.jpg)上述reshape操作的实际意义左图为卷积操作，第一次卷积时涉及9个元素的运算，右图把这个9个元素单独保存下来。这就是这个reshape函数的实际意义，把每一次卷积操作的所需要的数据信息单独保存(N=ks*ks)，当把最后一个维度(N)的信息通过这种方式保留到(h,w)这两个维度上后，自然就扩大了ks倍。(右图开始的3*3块储存第一次卷积所需的数据，后面的3*3块储存第二次卷积所需的数据)

到这一步我们做的就是对输入数据x进行可变卷积，并且把每次卷积所需的数据单独作为一个小块保留得到了一张大的feature map(b,c,ks*h,ks*w)，**如同上图右边的大feature map，此时reshape出的这张大feature map上的每个ks*ks的小块代表的就是公式(2)中求和的元素** 
![](https://www.zhihu.com/equation?tex=x%28p_0%2Bp_n%2B%5CDelta+p_n%29) **！！**最后再过一个普通卷积层以ks为stride这样得出的最终输出size为(b,c,h,w)，**最后一个卷积层的操作后，所有操作就与与公式(2) 
![](https://www.zhihu.com/equation?tex=%5Csum_%7Bn%5Csubset+R%7D%7Bx%28p_0%2Bp_n%2B%5CDelta+p_n%29%7D) 完全符合！**这样可变卷积所有操作就完成了。

至于那个modulation只是对每个元素加了偏置而已并不是很难理解，这里不展开讲

这个reshape操作虽然比较巧妙，但其实空间冗余比较大，和原文作者的cuda版本内存占用量差了10几倍。这个是因为在im2col上直接操作可以去掉很冗余,这个就放到下次再讲了