---
title: 有哪些相见恨晚的 TensorFlow 小技巧？
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/机器学习/有哪些相见恨晚的-TensorFlow-小技巧/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/268375146/answer/339110449
---


闲的发慌，分享一些调包畜 trick 骗赞，至于炒鸡底层的函数功能，效率评测众说纷纭，比如队列那些，写起来还特别浪费时间，码畜也不敢乱 claim 啥技巧，只说一些高层抽象上的 trick，高速搬砖出活用。

- 码畜没有高级库函数，捉襟见肘咋办？tf.py_func 包一个 numpy ，scipy，sklearn 的函数进入 graph 当中，好像是不占背包格子的。
- 多多使用 estimator 和 train_and_evaluate，良心出品的高层抽象，1.4 版本以后的 train 和 evaluation 是异步执行的。可惜 estimator 完全 end-to-end，写个 RL/GAN 这些就不好控制 loss 的训练方式。。。
- pre-train 了一堆网络如何调用；每个网络去掉头，去掉尾，该如何拼接；每次调模型，都要重新建图然后加载，炒鸡麻烦怎么办！推荐 serving 大法，存成 pd 文件。然后推一个 virtualenv 包，tf.saved_model.loader.load( pd 文件)，直接通过名字索引你要的输出， 能够满足你的在各个硬件环境调包 tensorflow 的欲望，还可以在 spark，mapreduce 加载跑哦。
- 尽量不开 placeholder，从读取文件，parse 到写 loss，都交给 tensorflow，整个过程都用写进 graph 里面，调用高层抽象 estimator 会自动给 graph 分配资源，如果自己很有信心也可以自己写 device 信息到每个 op 上，不过一般没必要。
- 经常搞各种乱七八糟的 word2vec ，以前笨的时候，要在非 tf 框架下映射好 id，然后写 pair，然后存文件训练，文件几百 G 的话，做起来炒鸡麻烦。。特么要天天这么搬砖累死人。其实 tf 高层抽象用得好，可以直接读文件，hash 映射，做 pair，一路写到 loss 不带眨眼，不到100行代码可以解决任意任意 csv 格式文件的 embedding  训练问题，还支持 hadoop 上读取，这就炒鸡方便了。

```python
import tensorflow as tf
from tensorflow.contrib.lookup import HashTable
from tensorflow.contrib.lookup import TextFileIdTableInitializer
from tensorflow.contrib.lookup import IdTableWithHashBuckets
```


# files looks like: key a b c\n ...
dataset = tf.data.TextLineDataset(files)
dataset = dataset.map(lambda x: tf.string_split(x, "\t").values[1:fix_len])
feature = dataset.batch(batch_size)
iterator = dataset.make_one_shot_iterator()
feature = iterator.get_next() # feature.shape = [batch_size, fix_len]

# vocab_file looks like: item id\n ...
table_file = TextFileIdTableInitializer(vocab_file)
hash_table = HashTable(table_file)
table = IdTableWithHashBuckets(hash_table)
feature = table.lookup(feature) # feature has shape [batch, fix_len]

# n is the number of sampled pairs, skip_win is context window
# e.g. n = 3, skip_win = 5
ff = [feature[:, k:-skip_win + k] for k in range(skip_win)]
feature = tf.stack([ff[skip_win//2]]*skip_win, axis=2)
feature = tf.reshape(feature, [-1, skip_win])[:, 0:n]
# not the best way to sample target, but simple
targets = tf.reshape(tf.stack(ff, axis=2), [-1, skip_win])
targets = tf.random_shuffle(tf.transpose(targets))
targets = tf.transpose(targets)[:, 0:n]
# mask the unwanted pair in the following way if needed
# feature = tf.boolean_mask(feature, mask)
# label = tf.boolean_mask(label, mask)

embedding = tf.nn.embedding_lookup(tf.Variable(init_emb>), feature)
loss = tf.nn.nce_loss(

```text
    weights=tf.Variable(init_weight>),
    biases=tf.Variable(init_bias>),
    labels=targets,
    inputs=embedding
)
```


- 指定调某几层 weight 的学习率，没必要构造 learning-rate placeholder，每个 layer 写个 lr-multipler，如下。
import tensorflow as tf
# a is a decay factor
weight = tf.Variable(, "some_name")
weight = a * tf.stop_gradient(weight) + (1 - a) * weight。`

- tf 做矩阵 A 的 pairwise-distance ，没有库函数咋办，还是 batch 模式的 pairwise -distance 计算。当然，搞成笛卡尔乘积然后 map_fn 也可以，不过后者似乎慢多了。
import tensorflow as tf
# compute the pairwise Euclidean distance of the given matrix
A = tf.Variable(init_value>, "name") # A has shape [batch, N, M]
r = tf.reduce_sum(A, -1, keep_dims=True) 
K = - 2.0 * tf.matmul(A, A, transposed_b=True)
D = r + K + tf.transposed(r, [0, 2, 1])
D = tf.sqrt(tf.abs(D))`

- 在 tf.summary.image() 中，将多个图像， 也即 x=[batch, H, W, 3] 的 tensor ，输出成一个大拼图形式，有着简单粗暴的做法：
import tensorflow as tf
x = ... # [64, H, W, 3]
x = tf.reshape(x, [8, 8, H, W, 3])
x = tf.transpose(x, [0, 2, 1, 3, 4])
x = tf.reshape(x, [8*H, 8*W, 3])
tf.summary.image(x, ..)`

先写一点打发一下时间骗赞，后面想起啥补啥。。。

[编辑于 2018-03-11 20:41](//www.zhihu.com/question/268375146/answer/339110449)

​​425 ​29 ​分享

​​

收起​
