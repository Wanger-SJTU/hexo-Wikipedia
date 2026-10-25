---
title: OpenCV视频分析-光流分析
date: "2019-06-20 00:00:00"
updated: "2019-06-20 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/有用的方向思考/OpenCV视频分析-光流分析/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/69999853
---


### 概述

✔️ 光流是由对象或相机的移动引起的两个连续帧之间的图像对象的明显运动的模式.它是2D矢量场，其中每个矢量是位移矢量，表示从第一帧到第二帧的点的移动。

如下图所示，是一个球在连续的5帧图像中的运动,箭头显示其位移矢量.

![](/images/collections/0.raw/zhihu/%E6%9C%89%E7%94%A8%E7%9A%84%E6%96%B9%E5%90%91%E6%80%9D%E8%80%83/asset/img_8556adf3706f.jpg)

位移矢量<strong>光流有很多应用场景如下：</strong>

- 运动恢复结构
- 视频压缩
- 视频防抖动等
<strong>光流法的工作原理基于如下假设：</strong>

- 连续的两帧图像之间，<strong>目标像素灰度值不变</strong>。
- 相邻的像素之间有<strong>相似的运动</strong>。
<strong>数学原理</strong>

✔️  第一帧的像素 I(x,y,t)" role="presentation">I(x,y,t)I(x,y,t) ，表示在 t 时刻的像素值，那么经过 dt" role="presentation">dtd_t 时间后，像素在下一帧移动的距离为 (dx,dy)" role="presentation">(dx,dy)(d_x,d_y) 。基于像素相同，亮度不变，可得：

```text
I(x,y,t)=I(x+dx,y+dy,t+dt)" role="presentation">I(x,y,t)=I(x+dx,y+dy,t+dt)I(x, y, t)=I\left(x+d_{x}, y+d_{y}, t+d_{t}\right) 
```


假设移动很小，使用泰勒公式得：

$$I(x+\Delta x, y+\Delta y, t+\Delta t)=I(x, y, t)+\frac{\partial I}{\partial x} \Delta x+\frac{\partial I}{\partial y} \Delta y+\frac{\partial I}{\partial t} \Delta t + \varepsilon $$

其中 \varepsilon 为无穷小，由第一个假设得：

  $$\frac{\partial I}{\partial x} \frac{\Delta x}{\Delta t}+\frac{\partial I}{\partial y} \frac{\Delta y}{\Delta t}+\frac{\partial I}{\partial t} \frac{\Delta t}{\Delta t}=0">\frac{\partial I}{\partial x} \Delta x+\frac{\partial I}{\partial y} \Delta y+\frac{\partial I}{\partial t} \Delta t=0    \frac{\partial I}{\partial x} \frac{\Delta x}{\Delta t}+\frac{\partial I}{\partial y} \frac{\Delta y}{\Delta t}+\frac{\partial I}{\partial t} \frac{\Delta t}{\Delta t}=0 $$

$$设  \frac{\partial I}{\partial x}=f_{x} , \frac{\partial I}{\partial y}=f_{y} , \frac{\partial I}{\partial t}=f_{t} , \frac{\Delta x}{\Delta t}=u ; \frac{\Delta y}{\Delta t}=v ,则有得到光流方程为：$$

f_{x} u+f_{y} v+f_{t}=0 

其中， f_x 和 f_y 分别是图像梯度， f_t 是图像沿着时间的梯度。


![](/images/collections/0.raw/zhihu/%E6%9C%89%E7%94%A8%E7%9A%84%E6%96%B9%E5%90%91%E6%80%9D%E8%80%83/asset/img_cbd7ebb78b86.jpg)

✔️ 为了求解未知的 u, v ，采用Lucas-Kanada 方法解决,这个算法最早是有Bruce D. Lucas and Takeo Kanade两位作者提出来的，所以又被称为KLT。

KLT算法工作有三个假设前提条件：

- 亮度恒定 
- 短距离移动 
- 空间一致性

### 函数

✔️ Opencv中使用`cv2.calcOpticalFlowPyrLK()`函数计算一个稀疏特征集的光流，使用金字塔中的迭代 Lucas-Kanade 方法。

nextPts,status,err = cv2.calcOpticalFlowPyrLK(prevImg,   #上一帧图片
                                              nextImg,   #当前帧图片
                                              prevPts,   #上一帧找到的特征点向量 
                                              nextPts    #与返回值中的nextPtrs相同
                                              [, status[, err[, winSize
                                              [, maxLevel[, criteria
                                              [, flags[, minEigThreshold]]]]]]])

>  输入值：

- prevImg--> 上一帧图片;
- nextImg--> 当前帧图片;
- prevPts--> 上一帧找到的特征点向量;
- nextPts--> 与返回值中的nextPtrs相同;
- status--> 与返回的status相同;
- err--> 与返回的err相同;
- winSize--> 在计算局部连续运动的窗口尺寸（在图像金字塔中）,default=Size(21, 21);
- maxLevel--> 图像金字塔层数，0表示不使用金字塔, default=3;
- criteria--> 寻找光流迭代终止的条件;
- flags--> 有两个宏，表示两种计算方法，分别是OPTFLOW_USE_INITIAL_FLOW表示使用估计值作为寻找到的初始光流，OPTFLOW_LK_GET_MIN_EIGENVALS表示使用最小特征值作为误差测量,default=0;
- minEigThreshold-->  该算法计算光流方程的2×2规范化矩阵的最小特征值，除以窗口中的像素数; 如果此值小于minEigThreshold，则会过滤掉相应的功能并且不会处理该光流，因此它允许删除坏点并获得性能提升, default=1e-4.
>  返回值：

- nextPtrs--> 输出一个二维点的向量，这个向量可以是用来作为光流算法的输入特征点，也是光流算法在当前帧找到特征点的新位置（浮点数）;
- status--> 标志，在当前帧当中发现的特征点标志status==1，否则为0;
- err--> 向量中的每个特征对应的错误率.
实现原理：** - 在第一帧图像中检测Shi-Tomasi角点， - 使用LK算法来迭代的跟踪这些特征点。迭代的方式就是不断向cv2.calcOpticalFlowPyrLK()中传入上一帧图片的特征点以及当前帧的图片。 - 函数会返回当前帧的点，这些点带有状态1或者0，如果在当前帧找到了上一帧中的点，那么这个点的状态就是1，否则就是0。

<strong>实现流程：</strong>

- 加载视频。
- 调用`cv2.GoodFeaturesToTrack` 函数寻找兴趣点（关键点）。
- 调用`cv2.CalcOpticalFlowPyrLK` 函数计算出两帧图像中兴趣点的移动情况。
- 删除未移动的兴趣点。
- 在两次移动的点之间绘制一条线段。

### 示例代码

<strong>1. 删除静止点的光流分析：</strong>

```python
import numpy as np
import cv2 as cv
import math
cap = cv.VideoCapture('car_flow.mp4')
```


#角点检测参数
feature_params = dict(maxCorners=100, qualityLevel=0.1, minDistance=7, blockSize=7)

#KLT光流参数
lk_params = dict(winSize=(15, 15), maxLevel=2, criteria=(cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 10, 0.02))

# 随机颜色
color = np.random.randint(0,255,(100,3))

# 读取第一帧

```x86asm
ret, old_frame = cap.read()
old_gray = cv.cvtColor(old_frame, cv.COLOR_BGR2GRAY)
p0 = cv.goodFeaturesToTrack(old_gray, mask=None, **feature_params,useHarrisDetector=False,k=0.04)
good_ini=p0.copy()

def caldist(a,b,c,d):
    return abs(a-c)+abs(b-d)

mask = np.zeros_like(old_frame)
```

# 光流跟踪
while True:

```x86asm
    ret, frame = cap.read()
    if ret is False:
        break
    frame_gray = cv.cvtColor(frame, cv.COLOR_BGR2GRAY)
    # 计算光流
    p1, st, err = cv.calcOpticalFlowPyrLK(old_gray, frame_gray, p0, None, **lk_params)
    # 根据状态选择

    good_new = p1[st == 1]
    good_old = p0[st == 1]
    #删除静止点
    k=0
    for i, (new0, old0) in enumerate(zip(good_new,good_old)):
        a0,b0 = new0.ravel()
        c0,d0 = old0.ravel()
        dist=caldist(a0,b0,c0,d0)
        if dist>2:
            good_new[k]=good_new[i]
            good_old[k]=good_old[i]
            good_ini[k]=good_ini[i]
            k=k+1
```


    # 提取动态点

```text
    good_ini=good_ini[:k]
    good_new=good_new[:k]
    good_old=good_old[:k]  
```


    # 绘制跟踪线

```text
    for i, (new, old) in enumerate(zip(good_new,good_old)):
        a,b = new.ravel()
        c,d = old.ravel()
        mask = cv.line(mask, (a,b),(c,d), color[i].tolist(), 2)
        frame = cv.circle(frame,(a,b),5,color[i].tolist(),-1)
    cv.imshow('frame',cv.add(frame,mask))
    k = cv.waitKey(30) & 0xff
    if k == 27:
        cv.imwrite("flow.jpg", cv.add(frame,mask))
        break
```


    # 更新

```text
    old_gray = frame_gray.copy()
    p0 = good_new.reshape(-1, 1, 2)
```


    if good_ini.shape[0]40:

```text
        p0 = cv.goodFeaturesToTrack(old_gray, mask=None, **feature_params)
        good_ini=p0.copy()

cv.destroyAllWindows()
cap.release()
```


![](/images/collections/0.raw/zhihu/%E6%9C%89%E7%94%A8%E7%9A%84%E6%96%B9%E5%90%91%E6%80%9D%E8%80%83/asset/img_a5fce382d542.jpg)

输出<strong>2. 反向检测的光流分析：</strong>

```python
import numpy as np
import cv2 as cv
import math
cap = cv.VideoCapture('car_flow.mp4')
```


#角点检测参数
feature_params = dict(maxCorners=100, qualityLevel=0.1, minDistance=7, blockSize=7)

#KLT光流参数

```text
lk_params = dict(winSize=(15, 15), maxLevel=2, criteria=(cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 10, 0.02))

height = cap.get(cv.CAP_PROP_FRAME_HEIGHT)
width = cap.get(cv.CAP_PROP_FRAME_WIDTH)
fps = cap.get(cv.CAP_PROP_FPS)
```

#out = cv.VideoWriter("reslut.avi", cv.VideoWriter_fourcc('D', 'I', 'V', 'X'), fps,

```text
                     #(np.int(width), np.int(height)), True)

tracks = []
track_len = 15
frame_idx = 0
detect_interval = 5
```

while True:

```x86asm
    ret, frame = cap.read()
    if ret:
        frame_gray = cv.cvtColor(frame, cv.COLOR_BGR2GRAY)
        vis = frame.copy()

        if len(tracks)>0:
            img0 ,img1 = prev_gray, frame_gray
            p0 = np.float32([tr[-1] for tr in tracks]).reshape(-1,1,2)
            # 上一帧的角点和当前帧的图像作为输入来得到角点在当前帧的位置  
            p1, st, err = cv.calcOpticalFlowPyrLK(img0, img1, p0, None, **lk_params)
```


            # 反向检查,当前帧跟踪到的角点及图像和前一帧的图像作为输入来找到前一帧的角点位置  
            p0r, _, _ = cv.calcOpticalFlowPyrLK(img1, img0, p1, None, **lk_params)

            # 得到角点回溯与前一帧实际角点的位置变化关系 
            d = abs(p0-p0r).reshape(-1,2).max(-1)

            #判断d内的值是否小于1，大于1跟踪被认为是错误的跟踪点

```text
            good = d  1

            new_tracks = []

            for i, (tr, (x, y), flag) in enumerate(zip(tracks, p1.reshape(-1, 2), good)):
```


                # 判断是否为正确的跟踪点
                if not flag:
                    continue

                # 存储动态的角点
                tr.append((x, y))

                # 只保留track_len长度的数据，消除掉前面的超出的轨迹

```text
                if len(tr) > track_len:
                    del tr[0]
                # 保存在新的list中
                new_tracks.append(tr)

                cv.circle(vis, (x, y), 2, (0, 255, 0), -1)
```


            # 更新特征点    
            tracks = new_tracks

            # #以上一振角点为初始点，当前帧跟踪到的点为终点,画出运动轨迹
            cv.polylines(vis, [np.int32(tr) for tr in tracks], False, (0, 255, 0), 1)

        # 每隔 detect_interval 时间检测一次特征点

```text
        if frame_idx % detect_interval==0:
            mask = np.zeros_like(frame_gray)
            mask[:] = 255

            if frame_idx !=0:
                for x,y in [np.int32(tr[-1]) for tr in tracks]:
                    cv.circle(mask, (x, y), 5, 0, -1)

            p = cv.goodFeaturesToTrack(frame_gray, mask=mask, **feature_params)
            if p is not None:
                for x, y in np.float32(p).reshape(-1,2):
                    tracks.append([(x, y)])

        frame_idx += 1
        prev_gray = frame_gray

        cv.imshow('track', vis)
        #out.write(vis)
        ch = cv.waitKey(1)
        if ch ==27:
            cv.imwrite('track.jpg', vis)
            break
    else:
        break

cv.destroyAllWindows()
cap.release()
```


![](/images/collections/0.raw/zhihu/%E6%9C%89%E7%94%A8%E7%9A%84%E6%96%B9%E5%90%91%E6%80%9D%E8%80%83/asset/img_9fb360f7790c.jpg)

输出

![](/images/collections/0.raw/zhihu/%E6%9C%89%E7%94%A8%E7%9A%84%E6%96%B9%E5%90%91%E6%80%9D%E8%80%83/asset/img_da73182c73fb.jpg)00:05

光流分析

### 稠密光流

### 概述

✔️ Lucas-Kanade方法计算稀疏特征集的光流，OpenCV提供了另一种算法来查找密集的光流，它计算帧中所有点的光流。它基于Gunner Farneback于2003年的《Two-Frame Motion Estimation Based on Polynomial Expansion》。

### 函数

✔️ 我们可以通过Opencv的函数`cv2.calcOpticalFlowFarneback`寻找稠密光流，我们得到的一个两个通道的向量(u,v)。得到的该向量的大小和方向。用不同的颜色编码来使其可视化。 

✔️ 方向与Hue值相关，大小与Value值相关。

```text
flow=cv.calcOpticalFlowFarneback(
        prev, 
        next, flow, 
        pyr_scale, levels, winsize, 
        iterations, poly_n, poly_sigma, flags)
```


输入

- prev--> 前一帧图片 
- next--> 下一帧图片，格式与prev相同 
- flow--> 与返回值相同，得到一个CV_32FC2格式的光流图 
- pyr_scale--> 构建图像金字塔尺度 
- levels--> 图像金字塔层数 
- winsize--> 窗口尺寸，值越大探测高速运动的物体越容易，但是越模糊，同时对噪声的容错性越强 
- iterations--> 对每层金字塔的迭代次数 
- poly_n--> 每个像素中找到多项式展开的邻域像素的大小。n越大越光滑，也越稳定 
- poly_sigma--> 高斯标准差，用来平滑倒数，n越大，sigma应该适当增加 
- flags--> 光流的方式，有OPTFLOW_USE_INITIAL_FLOW 和OPTFLOW_FARNEBACK_GAUSSIAN 两种 
> -  输出 

- 一个两通道的光流向量，实际上是每个点的像素位移值

### 示例代码

```x86asm
import cv2 as cv
import numpy as np
cap = cv.VideoCapture("vtest.avi")
ret, frame1 = cap.read()
prvs = cv.cvtColor(frame1,cv.COLOR_BGR2GRAY)
hsv = np.zeros_like(frame1)
```

hsv[...,1] = 255

```x86asm
while(1):
    ret, frame2 = cap.read()
    next = cv.cvtColor(frame2,cv.COLOR_BGR2GRAY)
```


    # 返回一个两通道的光流向量，实际上是每个点的像素位移值
    flow = cv.calcOpticalFlowFarneback(prvs,next, None, 0.5, 3, 15, 3, 5, 1.2, 0)

    # 笛卡尔坐标转换为极坐标，获得极轴和极角

```text
    mag, ang = cv.cartToPolar(flow[...,0], flow[...,1])

    hsv[...,0] = ang*180/np.pi/2  #角度
    hsv[...,2] = cv.normalize(mag,None,0,255,cv.NORM_MINMAX) 
    bgr = cv.cvtColor(hsv,cv.COLOR_HSV2BGR)
    cv.imshow('frame2',bgr)
    cv.imshow("frame1", frame2)
    k = cv.waitKey(30) & 0xff
    if k == 27:
        break
    elif k == ord('s'):
        cv.imwrite('opticalfb.png',frame2)
        cv.imwrite('opticalhsv.png',bgr)
    prvs = next
cap.release()
cv.destroyAllWindows()
```


![](/images/collections/0.raw/zhihu/%E6%9C%89%E7%94%A8%E7%9A%84%E6%96%B9%E5%90%91%E6%80%9D%E8%80%83/asset/img_d8bd6c0f3eae.jpg)

原图![](/images/collections/0.raw/zhihu/%E6%9C%89%E7%94%A8%E7%9A%84%E6%96%B9%E5%90%91%E6%80%9D%E8%80%83/asset/img_19e44ba6974b.jpg)

稠密------------------------------------------可爱の分割线------------------------------------------

更多Opencv教程可以 Follow github的opencv教程，中文&English**   **欢迎Star**❤️❤️❤️

[](https://link.zhihu.com/?target=https%3A//github.com/JimmyHHua/opencv_tutorials)

### 参考

   - 机器视觉 OpenCV—python目标跟踪（光流）

   - opencv python 光流法

   - OpenCV Tutorial 官网
