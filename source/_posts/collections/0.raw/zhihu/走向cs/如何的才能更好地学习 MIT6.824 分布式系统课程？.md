---
title: "如何的才能更好地学习 MIT6.824 分布式系统课程？"
date: 2019-11-03
tags: [知乎]
source: https://www.zhihu.com/question/29597104/answer/880513931

---

这是一门非常好的课程，真羡慕MIT的学生，在大学能有这么好的学习方式和实践。

首先最重要的是要理解Raft算法，如果算法你比较清楚了，实现部分相对来说不是那么难，起码能动手写代码能debug，如果算法不理解，那就比较难了。

理解算法必须看论文[Raft论文](https://link.zhihu.com/?target=https%3A//raft.github.io/raft.pdf) ， 怎么才算理解呢？ 我觉得当你看论文中的Figure2，对于每个句话都知道它是为什么的时候，才算理解Raft算法了。

就是下面这张图：

![](https://picx.zhimg.com/v2-52da63747577729112d894c9a625a3d6_r.jpg?source=2c26e567)学习的方式：

1.首先看下这个[Raft](https://link.zhihu.com/?target=http%3A//thesecretlivesofdata.com/raft/)的可视化介绍，先直观的了解一下。

2.论文要反反复复看，很多地方第一遍可能看不太懂，没关系可以先记下问题，然后跳过，不停回顾，一直到记下的问题都能理解为止。

3.官网[https://raft.github.io](https://link.zhihu.com/?target=https%3A//raft.github.io/) 上有个Raft Visualization部分，这是一个比较有用的工具，第2条中记录的问题，可以用这个工具模拟，看看Raft是怎么工作的。

4.时间充裕的话，可以看一下Raft作者的博士论文，更详细：[https://github.com/ongardie/dissertation/blob/master/book.pdf?raw=true](https://link.zhihu.com/?target=https%3A//github.com/ongardie/dissertation/blob/master/book.pdf%3Fraw%3Dtrue)

5.课程的实验一定要做，实在完不成了，可以参考一下别人的做法，但不是很推荐。2C有个unreliable的case，我折腾了一个多礼拜死活过不了，以为是自己实现的性能不好，后来发现别人都做了批处理，我有想到这样改进，总以为实验的要求是一次一条数据，改了几行代码就pass。像这种参考我觉得是可以接受的。

6.助教写的[https://thesquareplanet.com/blog/students-guide-to-raft/](https://link.zhihu.com/?target=https%3A//thesquareplanet.com/blog/students-guide-to-raft/) 可以好好看一下，介绍了以往这门课程学生常见的坑。

整理了一些参考的资料：

[tianbingJ/Trepang](https://link.zhihu.com/?target=https%3A//github.com/tianbingJ/Trepang)