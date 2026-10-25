---
title: (1 条消息) 推荐一个非常实用的峰值查找算法（peak detection）
date: "2022-08-04 00:00:00"
updated: "2022-08-04 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/推荐一个非常实用的峰值查找算法(peak-detection)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/549588865
---


本文算法的原始论文出处：Algorithms | Free Full-Text | An Efficient Algorithm for Automatic Peak Detection in Noisy Periodic and Quasi-Periodic Signals | HTML (mdpi.com)

在数字信号处理中，经常涉及到波峰（或波谷）查找算法，比如心率测量、步数计数等。对于周期信号或者准周期信号，有一种称之为Automatic multiscale-based peak detection (AMPD)，即自动多尺度峰值查找算法，非常好用。已经用在了本人参与的多个项目中。

其优势是：

（1）算法本身（几乎）没有超参数，无需调参，对信号具有良好的自适应性，唯一的假设是信号是周期的或者准周期的；

（2）抗噪能力强，后面可以看到，对周期性的要求也不是很高。

原理不多讲，可以直接来看原文，也比较简单，就是用一个多尺度的滑动窗口去两侧进行比较，寻找局部最大值。

但是原始文献中的算法时间和空间复杂度比较高，我做了优化，明显提高了计算效率，直接上Python代码：

`import numpy as np

def AMPD(data):
    """
    实现AMPD算法
    :param data: 1-D numpy.ndarray 
    :return: 波峰所在索引值的列表
    """
    p_data = np.zeros_like(data, dtype=np.int32)
    count = data.shape[0]
    arr_rowsum = []
    for k in range(1, count // 2 + 1):
        row_sum = 0
        for i in range(k, count - k):
            if data[i] > data[i - k] and data[i] > data[i + k]:
                row_sum -= 1
        arr_rowsum.append(row_sum)
    min_index = np.argmin(arr_rowsum)
    max_window_length = min_index
    for k in range(1, max_window_length + 1):
        for i in range(k, count - k):
            if data[i] > data[i - k] and data[i] > data[i + k]:
                p_data[i] += 1
    return np.where(p_data == max_window_length)[0]`

我们先来合成一段数据看看效果：

`import matplotlib.pyplot as plt

def sim_data():
    N = 1000
    x = np.linspace(0, 200, N)
    y = 2 * np.cos(2 * np.pi * 300 * x) \
        + 5 * np.sin(2 * np.pi * 100 * x) \
        + 4 * np.random.randn(N)
    return y

def vis():
    y = sim_data()
    plt.plot(range(len(y)), y)
    px = AMPD(y)
    plt.scatter(px, y[px], color="red")

    plt.show()

vis()`

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_9996097782c3.jpg)

AMPD峰值检测数据的噪声还是比较大的，但是AMPD的效果很好。

原始文献中还给出了很多检测例子，比如：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_9df4f51a85b9.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_67ce69aa1bf6.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_b7fc888384c0.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_765aeb46054f.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_900bc091d865.jpg)

怎么样，效果还不错吧?

有人问波谷怎么检测？将信号乘以-1翻转一下就是。
