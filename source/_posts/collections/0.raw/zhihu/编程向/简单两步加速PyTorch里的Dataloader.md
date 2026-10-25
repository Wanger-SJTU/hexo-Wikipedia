---
title: 简单两步加速PyTorch里的Dataloader
date: "2019-06-05 00:00:00"
updated: "2019-06-05 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/简单两步加速PyTorch里的Dataloader/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/68191407
---


PyTorch中通过Dataloader加载图片，使用十分方便。但当加载图片较多并且需要做较多变换时，加载的速度很慢，会出现加载数据过慢（即使已经使用了多个worker），GPU空闲等待数据加载的情况。这篇文章就和大家分享一下怎么给Dataloader提提速。

1、读取jpg图片加速

加载数据慢的一个很重要的原因的读取图片本身就比较慢，尤其是jpg图片解码更是耗时。如果你是读取jpg图片的话建议使用jpeg4py进行读取，只需要替换一行代码就搞定了。

具体的使用例子：

`import jpeg4py as jpeg
import cv2

if __name__ == "__main__":

```text
    img_path = '1.jpg'
    img = jpeg.JPEG(img_path).decode()
    cv2.imshow('img', img)
    cv2.waitKey(0)`
```


解码出来的直接就是numpy数组，可以直接用opencv显示并进行相应的操作，但需要注意的是通道顺序是RGB，opencv默认的BGR。

自己在小数据上测试了一下，使用opencv读取一个epoch需要7.5s，使用jpeg4py只需要3~4s，提速了近一倍。

[![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_306902ab7b36.jpg)ajkxyz/jpeg4pygithub.com/ajkxyz/jpeg4py](https://link.zhihu.com/?target=https%3A//github.com/ajkxyz/jpeg4py)

2、预取下一次迭代需要的数据

提前预读数据，也是看了这篇文章得到的方法。

[](https://zhuanlan.zhihu.com/p/66145913)

一个使用的例子：

`class data_prefetcher():

```python
    def __init__(self, loader):
        self.loader = iter(loader)
        # self.stream = torch.cuda.Stream()
        self.preload()

    def preload(self):
        try:
            self.next_data = next(self.loader)
        except StopIteration:
            self.next_input = None
            return
        # with torch.cuda.stream(self.stream):
        #     self.next_data = self.next_data.cuda(non_blocking=True)

    def next(self):
        # torch.cuda.current_stream().wait_stream(self.stream)
        data = self.next_data
        self.preload()
        return data
```


###
正常定义train_loader
###

prefetcher = data_prefetcher(train_loader)
data = prefetcher.next()
i = 0
while data is not None:

```python
    print(i, len(data))
    i += 1
    data = prefetcher.next()`
```


由于本地环境没有GPU，使用没有使用cuda，简单的使用预加载，速度可以从3.5s提高到2.25s。

简单增加了这两步，读取速度从7.5s降低到2.25秒，是不是快了很多呢？
