---
title: UWA2022_移动端实时GI方案
date: "2023-01-18 00:00:00"
updated: "2023-01-18 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/优化/UWA2022_移动端实时GI方案/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/599876256
---


(Github正常排版: [移动端实时GI方案](https://link.zhihu.com/?target=https%3A//github.com/HHHHHHHHHHHHHHHHHHHHHCS/MyStudyNote/blob/main/MyUWA2022Note/%25E7%25A7%25BB%25E5%258A%25A8%25E7%25AB%25AF%25E5%25AE%259E%25E6%2597%25B6GI%25E6%2596%25B9%25E6%25A1%2588.md))

UWA视频地址, 2021年Unity开放日就讲过了 文章地址, 视频地址.

原作者/大佬的 知乎主页

括号()内的话都是我自己想的.

### <strong>1. 光源</strong>

目标是手机同屏32盏点光, PC 128盏点光.

#### <strong>1.1 Tile-based Light Culling</strong>

- 相关文章, COD Tile Culling
- 先基于tile进行一次culling, 再在Z上进行一次culling
- 在Compute Shader上完成
- (现在好像很多在研游戏都已经用了这套技术在手机上)

#### <strong>1.2 Light Barrier</strong>

- 遮挡剔除, 视椎体裁剪
- 比如 给点光加一个范围**

- 下图点光范围有一个BOX裁剪范围,
- 如果没有裁剪范围就会漏光
- 同时可以让Tile Light Culling 更加精确
- (其实Light Layer上也可以解决漏光)

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_26b679435596.jpg)

#### 1.3 Light Num**

- 检测屏幕物体接受光源的数量
- 如果是深红色则说明超标了
- (有点类似于OverDraw的感觉)
![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_d6ab64ab8724.jpg)

### <strong>2. GI</strong>

#### <strong>2.1 一般</strong>

- 一般手游静态光用UV2去烘焙Lightmap
- 动态物体用Light Probe(光照探针)
- (Lightmap占用硬盘和内存压力比较大)
- (其实Lightmap是可以realtime的, 大佬秀技)

#### <strong>2.2 Irradiance Volume</strong>

- 相关文章
- 储存每一块区域的光照信息
- 他们游戏就是用的这套
![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_5ad102798659.jpg)

#### <strong>2.3 储存详细</strong>

- 用2阶球谐, 1阶段存 Color(3Byte), 2阶只存亮度(3Byte)
- 存Sky Visbility(1Byte), 存Light Mask(1Byte)
- 合计8Byte, 即两个UInt
- 为什么2阶段球谐不存4个Color?

- 为了压缩数据

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_bcbcafd22df4.jpg)

- Sky Visbility?

- 有点类似于长距离AO, AO分为长距离AO和短距离AO
- 下图GI AO 即 Sky Visbility, 可以看到往内部区域走会逐渐变暗

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_97acdac333af.jpg)

- 计算公式?**

- 间接光 = GIIndirectSH(烘焙) * LightIntensity(美术调节) + GISkyVisibility(烘焙) * SkySH(美术调节)

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_2879ff2d7f76.jpg)

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_1c5be1d80d2c.jpg)

- Light Mask?

- 表示这块区域的光照贡献主要是平行光产生的, 还是附加光产生的
- 当白天变成晚上时, 区域的光照贡献主要是附加光, 则亮度不怎么会产生变化
- 如冰柱的主要贡献是平行光, 白天还好, 但是晚上冰柱周围都变暗了, 冰柱没有变暗会很诡异

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_eeff54dc95e4.jpg)

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_f0b44dcf8c21.jpg)

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_c4b186f29c08.jpg)

#### 2.4 Streaming**

- Scrolling Clipmap Update

- 比如一组是个128×128×100的3D texture
- 分帧数, 切片更新, 当角色到边缘的时候发起加载和upload
- 相关文章

#### <strong>2.5 Baker Tools</strong>

- (他们自己写了一个工具可以烘焙选定区域)
- 根据NavMesh和碰撞体自动摆放区域, 溢出无效的probes
- 数据压缩
- 做预处理, 减少漏光
- 远处变成2D的Gobal Map

- 因为3D Texture覆盖范围比较小 远处就需要2D 做弥补

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_61b40705bc70.jpg)

#### <strong>2.5 耗时</strong>

- 范围: 256m * 256m * 200m
- 3D Texture: 2 * RGBA8 128 * 128 * 100
- GPU运算时间: 0.4ms(IphoneX)
- CPU解析时间: 0.17ms(Mi 9)
- 内存: 2~4MB
- 包体占用: 2MB~9MB / 1KM

#### <strong>2.6 其它</strong>

- 3D Virtual Texture (没有细说)

- 当巨高的场景, 可以用做数据整合, 使其规则化

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_75cc96bd03c7.jpg)

- Lightmap VS Irradiance Volume
Lightmap VolumeIrradiance Volume静态物体两者都可需要UV2不用UV2更大的包体和内存占用包体和内存小可扩展性强大数据要自定义效果更好漏光兼容度更好是用Compute Shader 和 3D Texutre烘焙慢烘焙更快离线烘焙可以实时GI
### <strong>3. Dynamic GI</strong>

#### <strong>3.1 以往的技术</strong>

- Radiosity

- 把场景分成很多patch, 类似于UV2
- 然后预计算一个patch 对另一个patch 的影响, 距离 朝向 可见性
- 解方程很难, 基本都是靠迭代

- PRT(Precomputed Radiance Transfer)

- 相关文章, 还有全境封锁2016GDC的分享
- 预存储光照传播关系, 每个probe受哪些surfel影响, 每个surfel的材质信息
- 直接光变化时, 更新surfel, 从而更新probe, 最后做relightinng
- 需要场景是静态的
- 手机上这套方案也已经在实现了

- SDFGI
- Voxel Cone Tracing

- 把场景体素化, 然后Cone Tracing
- 相关文章

- Lumen

- 一堆技术的组合
- Radiance Cache
- SDF/SSGI
- Screen Space Probe
- Voxe Radiance

- (RTX)
- ...

#### <strong>3.2 Lux</strong>

他们自己取名, 跟Lumen名字类似.

是基于LPV的(Light Propagation Volumes), Games也有讲过, 相关文章,[相关知乎](https://zhuanlan.zhihu.com/p/412287249).

如果用RSM生成初始数据. 比如说从光源生成4张RT 深度图, 法线图, Diffuse图, 位置图. 然后实际用的时候, 当作虚拟光源, 多次采样叠加当作间接光的结果.

但是RSM 的DrawCall 是非常爆炸的. 然后采样的次数也是非常的多, 每个位置要采样64次. 所以需要分帧, 和Temporal降噪.

他们使用的: 把间接光和直接光都注入到Radiance Volume的Probe, 光照在Probe之间传播, 最后用Volume照亮场景.

LPV需要用RSM来考虑遮挡关系, 但是这里没有用到RSM. 所以引入了新的数据结构Propagate Buffer.

就是用Physics.Raycast计算相邻的Probe的可见性, 储存数据是0和1. 判断的准确性不太行, 但是效率不错.

然后美术可以标记哪些部件不参与遮挡, 比如说玻璃可以透光, 但是墙不会.

计算方式就是线性插值.比如a1是室外 SkyVis=1, a2是室内 SkyVis=0, a0就是处于中间 可以做插值. 然后6个方向加起来除以6. 然后分帧迭代. 如果有的点周围没有相邻的点, 则说明在室内, SkyVis为0.

间接光SH也差不多, 就是多考虑了方向性. 比如L1在靠近L0反向的颜色为黑色.

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_cde080db0e6d.jpg)

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_1fa52eec1357.jpg)

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_526291135d0d.jpg)

<strong>迭代叠加越加越亮?</strong>

雅克比迭代, 每次计算完当前全部迭代之后带入下一次迭代. 高斯赛德尔, 如果计算的时候有值已经算出来了, 则带入公式加速求解速度.

比如Pixel Shader 对于两张RT的pingpong, 就是雅克比. 但是他们这里用Compute Shader, 如果是高斯赛德尔迭代, 就需要很处理Barrier和数据一致性, 比较繁琐性能也不好. 所以这里就很随意如果数据更新了就用新的, 没有更新就用旧的.

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_2dd937374298.jpg)

<strong>迭代反射?</strong>

用迭代近似处理多次反射. 比如下面的L3是不连通的, 因此会反射一定的irrdiance, 计算的时候就会考虑一定的从下往上的加成.

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_e41b12e23377.jpg)

<strong>耗时?</strong>

初始化需要24ms. loading的时候做完, 玩家修改建筑的时候局部更新. 更新的时 平均CPU耗时0.5ms.

<strong>光照注入?</strong>

怎么知道哪些probe受到哪些光影响? 在CPU 做 Lighting Culling, 因为屏幕上的probe其实是非常少的.

关于光照的遮挡. 在Propagate Buffer中用Raycast的时候顺便记录了六个方向的深度值. 这样只考虑probe和光源的距离就好了. 对于每个光源只考虑周围的八个probe, 别的位置都不计算.

#### <strong>3.3 效果</strong>

比平行光 Diffuse效果要好, 而且效率也会高点. 不过高光部分效果不太行, 平行光是GGX, 而Lux高光效果会变散.

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_009e8066d0c1.jpg)

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_62a7b761d4cb.jpg)

#### <strong>3.4 漏光</strong>

大体上是不会漏光的, 但是采样时插值还是会漏光. 比如下图墙角处, 蓝绿色插值就会出现漏光.

(后面一篇文章也会快速讲一个这个)

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_06582e019f49.jpg)

一种是区分室内室外做两套probe. 对于规则物体的demo效果比较好, 但是实际上房子不太规则, 所以没有采样.

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_37d971734b7e.jpg)

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_78d0372afe6f.jpg)

COD用四面体. probe储存四面体中一个点到对面三角面的每个点的深度, 然后做深度对比.

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_97b193220a88.jpg)

DDGI. 每个probe对应一个2D的八面体深度贴图, 八个点的距离, 距离平方, 然后用切比雪夫不等式做一个概率估计. 不用线性插值, 而且自己还可以做权重处理. 但是需要的数据量太多了. 每个probe需要16*16个Bytes来记录深度.

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_bf80a0aff8c5.jpg)

Lux.

实时的时候可以用Propagate Buffer记录的六个方向的深度.

离线可以精准点, 在预烘焙阶段抓一张深度图, 用八个方向的球面高斯去拟合 [球面高斯](https://zhuanlan.zhihu.com/p/514017351), 然后记录八个方向的系数.

然后手动计算插值做深度比较.

为什么用球面高斯?

因为球谐的形状比较圆, 但是球面高斯比较符合墙角的形状.

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_0a4e39089a17.jpg)

#### <strong>3.5 性能</strong>

- Iphone13
- 地图大小120m * 120m * 40m.
- 前20帧LPV准备. GPU0.5ms, CPU<0.8ms.
- Relighting阶段. 硬件三线性插值0.5ms. 防漏光需要自己采样八次计算插值做比较 耗时1.5ms.
- 防漏光是可选的, 并且可以降低分辨率继续减少消耗.

#### <strong>3.6 缺点</strong>

- 高光效果
- 附加光的形状
- Volume精度和深度精度导致的瑕疵
