---
title: 浅谈NMS的多种实现
date: "2019-08-29 00:00:00"
updated: "2019-08-29 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/机器学习/浅谈NMS的多种实现/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/64423753
---


最近刚好结束了面试，在假期正好整理一下。面某独角兽时有一个印象比较深刻的问题就是手写nms算法。按理说这个应该烂大街了，但是我方向并不是目标检测啊，后面知道面试官应该是做这个方向的，问我知道不？但目标检测毕竟是通用算法，或多或少了解一些，但肯定只是看过而已，知道大概的意思，手写还是有点痛苦。勉强写了一些，结果面试官来了一句，不排序行么？我当场懵逼，nms现有算法就是要求排序啊，不排序也行？但他竟然这么问了，我只能说应该也行，但奈何水平不够，半天没写出来。当时已经面了一个半小时，看我没憋出来，说回去想想发给他。第一次知道面试还给留作业的。后面我又重新在网上看了一些实现，发现找不到不排序的，难怪面试官不怕我直接收答案了。不过最后还是实现了给他，虽然最后拒了它2333.

前面扯了一堆，下面开始介绍。首先还是要科普一下nms算法的思想：简单来说就是去重框。这里的重框针对的当然是某一类的框。下面实现的时候也是默认拿到某一类所有的框。

算法思路：

For a prediction bounding box B, the model calculates the predicted probability for each category. Assume the largest predicted probability is p, the category corresponding to this probability is the predicted category of B. We also refer to* *pas the confidence level of prediction bounding box B. On the same image, we sort the prediction bounding boxes with predicted categories other than background by confidence level from high to low, and obtain the list L. Select the prediction bounding box B1 with highest confidence level from L as a baseline and remove all non-benchmark prediction bounding boxes with an IoU with B1    greater than a certain threshold from L. The threshold here is a preset hyper-parameter. At this point,L retains the prediction bounding box with the highest confidence level and removes other prediction bounding boxes similar to it. Next, select the prediction bounding box B2 with the second highest confidence level from L as a baseline, and remove all non-benchmark prediction bounding boxes with an IoU with B2 greater than a certain threshold from L. Repeat this process until all prediction bounding boxes in *L *have been used as a baseline. At this time, the IoU of any pair of prediction bounding boxes in L is less than the threshold. Finally, output all prediction bounding boxes in the list L.前面这段话基本说出了算法的具体实现思路：先对每个框的score进行排序，首先选择第一个，也就是score最高的框，它一定是我们要保留的框。然后拿它和剩下的框进行比较，如果IOU大于一定阈值，说明两者重合度高，应该去掉，这样筛选出的框就是和第一个框重合度低的框，第一次迭代结束。第二次从保留的框中选出score第一的框，重复上述过程直到没有框保留了。

Talk is cheap, show me the code. 网上基本都有实现好的faster-cnn版本的，这里只是了解算法，不关心性能，所以用python实现的方便一点：

```python
import numpy as np
def nms(dets, thresh):
    """Pure Python NMS baseline."""
    x1 = dets[:, 0]
    y1 = dets[:, 1]
    x2 = dets[:, 2]
    y2 = dets[:, 3]
    scores = dets[:, 4]
    areas = (x2 - x1 + 1) * (y2 - y1 + 1)
    order = scores.argsort()[::-1]
    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]]）
        w = np.maximum(0.0, xx2 - xx1 + 1)
        h = np.maximum(0.0, yy2 - yy1 + 1)
        inter = w * h
        ovr = inter / (areas[i] + areas[order[1:]] - inter)
        inds = np.where(ovr  thresh)[0]
        order = order[inds + 1]
    return keep`
```


可以看到，基本是按照上述思路去写的，按照score进行降序排序，然后每次拿到第一个框，也就是score最大的框，然后计算该框与其他框的IOU，最后留下`ioudef nms(dets, thresh):                   

```text
    areas=np.prod(bbox[:,2:]-bbox[:,:2],axis=1)
    order = scores.argsort()[::-1]
    keep=[]
    while order.size>0:
        i=order[0]
        keep.append(i)
        tl=np.maximum(b[:2],bbox[i+1:,:2])
        br=np.minimum(b[2:],bbox[i+1:,2:])
        inter=np.prod(br-tl,axis=1)*(br>tl).all(axis=1)
        ovr=inter/(areas[order[1:]]+areas[i]-inter)
        inds=np.where(ovrthresh)[0]
        order=order[inds+1]
    return keep`
```


当然这里的思路还是要排序，只不过iou部分写的更精简了。

好了，铺垫了这么久，说一下不排序怎么写。基本思路是，依次遍历每个框，计算这个框与其他框的iou,找到iou大于一定阈值的其他框，因为这个时候不能保证它一定是score最高的框，所以要进行判断，如果它的score小于其他框，那就把它去掉，因为它肯定不是要保留的框。如果它的score大于其他框，那应该保留它，同时可以去掉所有其他框了。最后保留的框就是结果。

```python
def nms(bbox, scores, thresh):
    area=np.prod(bbox[:,2:]-bbox[:,:2],axis=1)
    keep=np.ones(len(bbox),dtype=bool)
    for i, b in enumerate(bbox):
        if(keep[i]==False):
            continue
        tl=np.maximum(b[:2],bbox[i+1:,:2])
        br=np.minimum(b[2:],bbox[i+1:,2:])
        inter=np.prod(br-tl,axis=1)*(br>=tl).all(axis=1)
        iou=ia/(area[i+1:]+area[i]-inter)
        r = [ k for k in np.where(iou>thresh)[0]+i+1 if keep[k]==True]
        if (scores[i]>scores[r]).all():
            keep[r]=False
        else:
            keep[i]=False
    return np.where(keep)[0].astype(np.int32)`
```


这是我按照上面思路写的，用keep表示框的去留，为True的框要保留。当然这个思路的效率不见得比前面排序的要好，只是作为其他角度思考。

补充：之前排序实现是通过每次筛除框来完成的，直到最后没有框剩下了则循环结束。但还可以这么想：同样先将框按score排好序，这次循环条件为遍历所有框，在某次循环，拿到一个框，将其与所有已经保留的框**进行比较，如果iou大于阈值，说明它应该被删去，直接进行下一次循环，如果小于将其加入进要保留的框中。当遍历完所有框时结束，拿到保留的框。

嗯，文字还是有点绕，直接看code更清楚：

```python
def _non_maximum_suppression_cpu(bbox, thresh, score):
    order=np.argsort(score)[::-1]
    bbox=bbox[order]      
    bbox_area=np.prod(bbox[:, 2:]-bbox[:, :2],axis=1)
    keep=np.zeros(bbox.shape[0], dtype=bool)  
    for i, b in enumerate(bbox):
    	tl=np.maximum(b[:2],bbox[keep,:2])  
    	br=np.minimum(b[2:],bbox[keep, 2:])	   
    	area = np.prod(br-tl, axis=1)*(tlbr).all(axis=1)
    	iou=area/(bbox_area[i]+bbox_area[keep]-area) 
    	if (iou>=thresh).any():   
            continue
    	keep[i]=True
    keep = np.where(keep)[0]
    return keep.astype(np.int32)`
```


至此介绍了三种NMS算法的实现思路。即使作为常规的算法题考察也很好，因为这也不牵扯到目标检测的东西。而且还顺便考察了numpy的操作。这也提醒自己有时候要多深入想想，而不是简单copy网上现有的东西。

以上。
