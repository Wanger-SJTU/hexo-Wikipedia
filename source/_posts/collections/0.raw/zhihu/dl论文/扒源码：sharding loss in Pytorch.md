---
title: 扒源码：sharding loss in Pytorch
date: "2019-12-06 00:00:00"
updated: "2019-12-06 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/扒源码-sharding-loss-in-Pytorch/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/95687913
---


源码：[https://github.com/OpenNMT/OpenNMT-py/blob/master/onmt/utils/loss.py](https://link.zhihu.com/?target=https%3A//github.com/OpenNMT/OpenNMT-py/blob/master/onmt/utils/loss.py)OpenNMT 在计算 NMT 模型的loss时，进行了“shard”处理，即对解码序列 y 分段进行梯度回溯。如果不这样做，超长序列的 loss.backward() 时会导致显存爆炸。

写一点小代码来演示一下。比如 一个简单的网络，输入 x，输入 y：

import torch
x = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
y = x ** 2 + 2
定义 loss 为求和，梯度回退后打印 x 的梯度出来看看：

loss = torch.sum(y)
loss.backward()
print(x.grad)
# tensor([ 2.,  4.,  6.]
梯度计算正确（即 2x）。以上是普通流程。现在开始分段，直接对每个 shard 回溯：

y_list = torch.split(y, 1)
for z in y_list:

```python
    loss = torch.sum(z)
    loss.backward()
    print(x.grad)
```

# tensor([ 2.,  0.,  0.])
# RuntimeError: Trying to backward through the graph a second time, but the buffers have already been freed. Specify retain_graph=True when calling backward the first time.
在循环的第一步，x 得到了梯度 [2, 0, 0]，确实是 y[0] 的梯度回溯结果。可是在循环的第二步，同一个 graph 连续两次进行 backward，报错了。加上 “retain_graph=True”可以解决这个问题，不过那和不分 shard 也没区别了。

正确的做法是，每个 shard 单独计算 loss，但是只回溯到 y，阻断到网络内部（即 x）的更新。在遍历结束后，统一更新。请看注释。

v_list = []
g_list = []

for z in torch.split(y, 1):

```text
    t = z.data.clone()       # 只对data进行clone()，阻断到网络内部的梯度传递;
    t.requires_grad = True   # 将t变成leaf node;

    loss = torch.sum(t)      # 计算loss。OpenNMT将generator包在了里面，shard后更省显存;
    loss.backward()          # 只能计算出t的梯度, 到不了x;

    v_list.append(z)         # 注意t只是计算梯度用的，真正连接着网络内部的是z,即y的shard;
    g_list.append(t.grad)    # 把t的梯度保存下来,它和z的梯度是一样的;
```


# 对v_list中的每一个shard，使用g_list中对应的梯度，继续回溯直至x;
torch.autograd.backward(v_list, g_list)