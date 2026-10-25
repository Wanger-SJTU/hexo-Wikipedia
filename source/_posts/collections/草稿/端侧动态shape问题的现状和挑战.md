---
title: "参考文档"
date: "2026-04-11 21:40:18"
updated: "2026-04-11 21:40:18"
layout: "post"
permalink: "/collections/草稿/端侧动态shape问题的现状和挑战/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---



## WHY 动态 Shape

像 MNN、TensorRT、TNN等NN部署框架里，以及TVM、MLIR、Trion这些NN 编译器最初支持的场景，都是处理的静态shape的场景。
## 1. 每层的输入输出shape大小都是确定已知的

## 2. 执行的路径是确定的DAG图，与输入的参数没有关系

在这样固定输入输出的情况下所有与计算优化的信息都是已知的，可以最大程度上优化推理表现，去做一些内存复用、算子优化策略。

但在很多业务场景下，还是希望支持动态尺寸的输入输出。
![Pasted image 20240519221617.png](/images/collections/assets/Pasted%20image%2020240519221617.png)

这里引用一下的论文_arxiv 2403.00176的图。大概包括以下的情况
## 1. 输入shape影响输出的值， 比如shape算子

## 2. 输入shape影响输出shape，大多数算子的输出shape都与输入shape的相关

## 3. 输入shape和值决定输出shape

## 4. 决定了执行情况，这里大多是控制流算子



![Pasted image 20240517221547.png](/images/collections/assets/Pasted%20image%2020240517221547.png)

![Pasted image 20240524220701.png](/images/collections/assets/Pasted%20image%2020240524220701.png)

### 支持动态shape挑战：
静态Shape的场景是一个确定的优化问题，在端侧设备上主要的优化目标也是减少推理延迟和降低内存需求。
对动态Shape而言处理起来就复杂多了：
## 1. 模型推理的内存（显存）占用预估

## 2. 算子实现的执行优化

按实际模型推理的流程拆解一下：
<strong>软件实现层面</strong>
## 1. 模型动态infershape开销消减

## 2. 动态内存申请开销消减

## 3. 算子动态模板匹配

<strong>硬件层面</strong>
## 1. 引入更多的跳转指令，分支预测能力需求大大提高，指令流水中空泡增加，效率降低

## 2. 向量化、Tensor化机会减少，引入更多的scalar运算

## 3. 数据排布？


## Shape 推导
shape推导是整个模型推理计算的关键，每个算子执行需要知晓输入输出的shape尺寸大小，这样才能申请内存，算子计算才知晓读取、写入的位置。
动态shape推导主要由软件框架层提供，目前看主要下面几种方案:
### dynamic to static Shape

既然固定shape这么好，可以在确定性的输入信息中去做到最大程度的优化，那我把输入想办法固定好是不是就OK了。

| 方案             | 说明                                                              | 优势                        | 劣势                              |
| -------------- | --------------------------------------------------------------- | ------------------------- | ------------------------------- |
| 动态编译           | 先编译后执行。编译过程重新推导shape、优化匹配算子实现                                   | 执行效率高，资源节省。与固定shape框架方案匹配 | 编译时间比较长。如果是一次性的编译动作，可能得不偿失      |
| padding 最大长度   |                                                                 | 实现最简单                     | 计算、内存资源浪费；Conv这类算子支持不了          |
| 多尺寸计算图动态匹配     | 上述方案的折衷产物，准备多个尺寸的计算图、向上匹配到固定尺寸                                  | 适用大多数输入可变的场景，             | 需要加载多个计算图、部分额外的存储开销；Conv类算子无法支持 |
| Symbolic shape | 各个中间算子的shape不再是固定的数值，而是与输入相关的变量，在给定输入及shape时，中间算子执行过程动态计算输入输出尺寸 | 引入额外的一点标量运算，降低shape推导开销   | 当前已有框架均不支持这个方案，支持起来变动比较大；       |
### 动态编译
很多框架都是采用就是这个方案，在变更输入Shape的场景下需要重新Init初始化来重新推导shape。如果是特定的NPU，可能还涉及到更为耗时的编译时间。
### Padding
对于NLP，特别是transformer类的模型，padding是一个还算不错的方案，特别是还有一个Mask的输入来指定有效数据。
问题也比较明显，需要牺牲一点额外的计算、带宽、内存（显存）占用的开销。不支持在HW维度上计算的算子（Conv）
#### Symbolic Shape
这个方案可能是onnx模型中最早看到的，后续在TVM的nimble、Relax等也陆续得到支持。与上面尝试先做常量化shape推导不同，symblic shape方案中模型每层的shape是一个与输入相关的变量，实际计算shape在计算阶段才得到。总的开销上理论上与单独做一次infershape相差不大。但是对于某些需要针对DSA编译的场景可能还是有用的。

## 算子优化
如果是padding或者重编译的方案，算子实现和固定shape没什么区别，不做过多叙述。下面介绍一下当前在应对算子优化上的一些方案：

### TVM
tvm提供了两种不同的动态shape方案，[nimble](https://zhuanlan.zhihu.com/p/354995641) 和[relax](https://zhuanlan.zhihu.com/p/627449108) ，两种方案实现思路上有相似之处，可以说relax中动态shape的方案是nimble的进一步演化。
#### Nimble
Nimble的在处理不同shape的方案，使用的是按照tiling因子进行kernel拆分的方式，如
```
tiling factor = 8
```
输入Tensor：Tensor[(x), float32]
拆分前kernel：kernel(x) {……}
拆分后kernel：kernel(k, r) {……}
然后通过dispatch function对拆分后的kernel进行调度执行，拆分粒度可配置（Full dispatch表示完全按照tiling因子拆分，No dispatch表示不拆分）。同时还对Simplification Pass做了增强，尽可能消除动态边界检查。
#### Relax

#### DietCode



### MLIR

#### DISC

### Mindsphore

#### etc



## 整体方案


## 内存复用




 主要面对的问题和挑战
 - shape推导
 - 内存分配
 - 最优schedule
 - shape推导和常量折叠冲突


动态shape计算场景拆分
## 1. 动态batch

## 2. 单一维度可变

## 3. 多维度可变

## 4. shape影响计算结果

## 5. 影响内存申请


当前方案的取舍 
- nimble tvm vm方案，符号shape，内存动态申请，手调shape
- diet code 解决的问题sch生成
- mnn mslite 显式resize
- disc


优化难题
- 算子切分
- 算子融合参数

对 sch 约束
- 最大化利用计算单元能力，计算边界在哪儿

设想
- latency优先
- ddr占用优先
- 结合操作系统接口

# 参考文档
## 1. arxiv 2403.00176

## 2. arxiv 2403.20041

