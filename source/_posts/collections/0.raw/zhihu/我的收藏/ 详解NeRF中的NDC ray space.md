---
title: (1 条消息) 详解NeRF中的NDC ray space
date: "2023-10-17 00:00:00"
updated: "2023-10-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/详解NeRF中的NDC-ray-space/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/628675070
---


本文首发于：

[![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a31558cdd89d.jpg)详解NeRF中的NDC ray spacemp.weixin.qq.com/s?__biz=Mzg4ODA3MDkyMA==&mid=2247485652&idx=1&sn=4c8dd140426700464ccbcc50827519a0&chksm=cf81feb3f8f677a5eba4e57649771b798ccd4f62212046c7aa1eab2f40249161334bc1f1dbc6&token=1889341779&lang=zh_CN#rd](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzg4ODA3MDkyMA%3D%3D%26mid%3D2247485652%26idx%3D1%26sn%3D4c8dd140426700464ccbcc50827519a0%26chksm%3Dcf81feb3f8f677a5eba4e57649771b798ccd4f62212046c7aa1eab2f40249161334bc1f1dbc6%26token%3D1889341779%26lang%3Dzh_CN%23rd)

这篇文章主要介绍 NeRF 中 NDC ray space 的推导过程，如果你在看 NeRF 中的坐标变换时感到一头雾水，那希望这篇文章能帮助到你。(图形学大佬请绕道)

我们从一些背景知识讲起。

### CG中的相机模型

NDC 坐标系统跟三维物体投影到相机屏幕的过程高度相关，因此，需要先了解一下图形学中的相机模型。

在图形学的世界中，最常用的相机模型，其原理和小孔成像是类似的。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_142515cd7ca9.jpg)

其中一点区别是，图形学中的相机，其成像平面是在小孔 (即相机光圈) 前，而不是在小孔后。因为根据小孔成像的原理，小孔后的成像平面上，投影的图像是倒立的，但我们希望的投影图像是正向的，而小孔前成像正好满足了这一点。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2be44427a61c.jpg)

从 3D 到 2D 的投影，就是根据 3D 物体的坐标，计算其投影到 2D 成像平面上的坐标。常识告诉我们，对于一个已有的相机而言，只有在恰当位置范围内的 3D 物体才可能投影到成像平面上。这个恰当范围，跟成像平面的大小，以及相机中心到平面距离等因素有关。在图形学中有一个专门的模型来定义这个范围：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f2da543bd5bc.jpg)

上图这个形似棱锥的模型，就是相机的可视范围。其中，有两个重要的概念：Near clipping plane 和 Far clipping plane。

Near clipping plane 是相机前方的平面，Far clipping plane 是更远处的平面。在这两个平面之间的空间，就是相机的可视范围。在这个范围内的物体，才能投影到相机的成像平面上。在图形学中，这个可视范围被称为视锥体 (Viewing Frustum)。

Near clipping plane 其实就是成像平面，而 Far clipping plane 则限制了相机最远可视的范围，它们都与相机的 z 轴垂直。在真实的相机中，Far clipping plane 一般是无限远的，但在图形学中，为了简化计算，一般将其设置为有限的距离。

由 Near clipping plane 到相机中心的距离，Near clipping plane 的大小，以及 Far clipping plane 的位置，可以计算出 3D 物体是否可见，这在之后的章节中会进一步提及。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6928693d7dd9.jpg)

上图中，P1可以投影到平面上，但P2不可见
### 3D坐标到2D坐标

了解 CG 中的相机模型后，可以帮助我们进一步理解 3D 世界中的点是如何转换到 2D 图像坐标的。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_dafcd66d0977.jpg)

上图是一个典型的物体投影到屏幕上的过程。我们假设已经获得了物体在世界坐标系中的坐标，在世界坐标系转换到图像坐标系的过程中，涉及以下过程。

#### 1. 世界坐标系转换到相机坐标系

对三维物体投影的第一步，是将三维物体从世界坐标系转换到以相机为中心的坐标系统，这样方便后续的投影计算。

相机坐标系是以相机为中心的坐标系 (也叫 eye coordinates)，由于相机和世界坐标系的原点可能不同，且其坐标轴方向和世界坐标系可能不同，因此世界坐标系和相机坐标系的转换一般涉及旋转平移两项操作。在图形学中，通常使用齐次坐标，并配合 4x4 的矩阵来完成两个坐标系统的转换。具体原理我们后面再介绍。

#### 2. 相机坐标系到屏幕坐标系

获得物体的相机坐标系后，接下来就可以计算物体投影到成像平面上的坐标。

这个过程可以根据相似三角形的原理计算得出。

如下图所示，假设相机的中心在 A 点，三维物体在 C 点，其在成像平面上的投影为 C'。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ffa40168f8c2.jpg)

由于我们已经获得了物体在相机坐标系中的坐标，因此可以计算出 AB、BC 的长度。而 AB'、B'C' 的长度，可以根据相似三角形的原理计算出来 (上图假设相机焦距是 1，但实际情况中不做限制，我们用 Z_{near} 表示)：

$$\frac{BC}{AB} = \frac{B'C'}{AB'} \\$$

即：

$$\begin{aligned} \frac{P.y}{|P.z|} &= \frac{P'.y}{Z_{near}} \notag \\ P'.y&=\frac{Z_{near}*P.y}{|P.z|} \notag \\ \end{aligned}  \\$$

$$同理，可以算出：P'.x=\frac{Z_{near}*P.x}{|P.z|}。$$

对于 z 轴坐标来说，由于 Near clipping plane 和 z 轴是垂直的，因此所有投影到成像平面上的点，z 坐标都是相同的。而事实上在投影到 2D 坐标后，z 轴坐标已经没有意义了，因此可以直接忽略。

从 P'.x 和 P'.y 可以发现，投影到成像平面上的坐标，其 x 和 y 坐标都是除以 z 坐标得到的。因此这种投影变换也被称为 <strong>z divide</strong> 或者 <strong>perspective divide</strong>。这也是透视投影的特点，投影到成像平面上的坐标，其 x 和 y 坐标都是 与 z 坐标绝对值成反比的。也因此，物体越远，其在屏幕上的大小越小。

由于屏幕 (也即 Near clipping plane) 的大小有限，当物体有部分坐标超出屏幕范围时，超出部分需要裁剪掉。因此，这一步转换过程中，还涉及到 clipping 操作，在之后的推导中会再具体介绍。

#### 3. 屏幕坐标系到图像坐标系

转换到屏幕坐标系后，我们理论上已经获得了物体的 2D 坐标，但这个坐标并不是最终图像上的坐标。

在第 2 步相机坐标系到屏幕坐标系的转换中，不难发现，屏幕坐标系的原点是在屏幕中心的，但在图像坐标系中，原点一般是在左上角或者左下角。因此，要转换到图像坐标系，还需要一步归一化的过程。

到这里，NDC 坐标系终于可以闪亮登场了。NDC 全称是 <strong>Normalized Device Coordinate</strong>，也即归一化的设备坐标系。这是从屏幕坐标系转换到图像坐标系的中间媒介。

前面说了，在不同的系统中，图像坐标系的原点是存在差异的。比如，有些系统中的图像原点位于左下角，y 轴朝上，但有些则反着来。

而 NDC 坐标系是一个跟设备无关的坐标系统，它将图像的 x/y/z 轴都统一归一化到 [0, 1]，并规定了坐标轴方向 (在有些图形系统中，也会将 x/y/z 轴归一化到 [-1, 1])，如下图所示 (中间即是 NDC 坐标系)。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a50addc75e62.jpg)

用上图的例子来演示屏幕坐标系->NDC 坐标系->图像坐标系 (即上图的 raster 坐标系) 的转换过程。

假设投影屏幕长宽分别为 height、width，NDC 的原点在左下角，y 轴朝上，那么，屏幕坐标系到 NDC 坐标系的转换公式为：

$$\begin{aligned} P_{ndc}.x&=\frac{P'.x+width/2}{width} \notag \\ P_{ndc}.y&=\frac{P'.y+height/2}{height} \notag \end{aligned} \\$$

假设图像大小为 image_height、image_width，图像原点位于左上角，y 轴朝下。那么，NDC 坐标系到图像坐标系的转换公式为：

\begin{aligned} P_{image}.x&=\lfloor P_{ndc}.x*image\_width \rfloor \notag \\ P_{image}.y&=\lfloor (1-P_{ndc}.y)*image\_height \rfloor \notag \end{aligned} \\

<strong>注意 NDC 坐标系是连续的坐标系，只有转换到图像坐标系，才会对坐标进行取整操作。此外，NDC 坐标系仍是三维坐标系，不过在考虑投影的时候，z 轴通常会被忽略。</strong>

在 OpenGL 中，NDC 坐标到 raster 图像坐标的转换过程，也被称为 <strong>viewport transform</strong>。

采用 NDC 坐标的好处是，我们可以将 NDC 看作是一个通用的坐标系统，并将不同系统的坐标统一起来。比如，我们在将屏幕坐标系转换到图像坐标系时，可以先换算到统一的 NDC 坐标系中，再实现二者的相互转化。在 NDC 坐标系中进行处理的时候，就不需要关心投影屏幕长宽、图像大小等信息了。

### 投影矩阵(Projection Matrix)

从上面三维坐标到二维坐标的转换过程中，不难发现，整个过程涉及步骤很多，非常繁琐。为了简化计算，在很多图形系统中，会将物体从相机坐标系到 NDC 坐标系的过程，用一个矩阵串联起来 (即投影矩阵)。

即完成所有操作总共需要两个矩阵：世界坐标系和相机坐标系之间的变换矩阵、投影矩阵。

理解投影矩阵，对后面 NeRF 中 NDC 坐标系统的推导至关重要。因此，这里先详细介绍投影矩阵的由来，并补充一些相关的数学知识。

#### 不同坐标系统的转换

三维坐标转二维坐标的第一步，就是将物体从世界坐标系转换到相机坐标系。

这一步在投影矩阵的求解中是不需要的。不过，由于图形学中，不同坐标系之间的转换是一个基本操作，因此，我们顺便介绍这个转换的原理，不敢兴趣可以跳过 (以下内容会涉及线性代数的知识)。

任何三维坐标系统，都可以用三个互相垂直的坐标轴以及坐标原点来唯一确定。

这三个坐标轴，在线性代数中，也被称为基向量 \mathbf{v}=\{\mathbf{v_1}, \mathbf{v_2}, \mathbf{v_3}\}。通常情况下，我们会用标准向量 \mathbf{e_1}=[1,0,0]、\mathbf{e_2}=[0,1,0]、\mathbf{e_3}=[0,0,1] 来表示这三个坐标轴。不过事实上也可以随意定义，只要它们线性无关，可以表达出整个三维空间即可。

现在，假设有两个不同的坐标系统 A 和 B。A 的基向量 \mathbf{v}=\{\mathbf{v_1}, \mathbf{v_2}, \mathbf{v_3}\}，B 的基向量 \mathbf{u}=\{\mathbf{u_1}, \mathbf{u_2}, \mathbf{u_3}\}。根据线性无关，可以得出：

$\begin{align} \mathbf u_1 &= \gamma_{11}\mathbf v1+\gamma_{12}\mathbf v2+\gamma_{13}\mathbf v_3 \notag \\ \mathbf u_2 &= \gamma_{21}\mathbf v1+\gamma_{22}\mathbf v2+\gamma_{23}\mathbf v_3 \tag{1} \\ \mathbf u_3 &= \gamma_{31}\mathbf v1+\gamma_{32}\mathbf v2+\gamma_{33}\mathbf v_3 \notag \end{align} $

用矩阵方程的形式表示为：

\mathbf u = \mathbf M \mathbf v \tag{2} 

对于三维空间中的某个点 \mathbf w 来说，均可以由 \mathbf{u}、\mathbf{v} 这两个坐标系表示：

\mathbf w = \mathbf a^T \mathbf v = \mathbf b^T \mathbf u \tag{3} 

其中的 \mathbf a^T 和 \mathbf b^T 其实就是 \mathbf w 在这两个坐标系统中的坐标。再结合公式 (2)，可以得到：

\mathbf w = \mathbf b^T \mathbf u = \mathbf b^T \mathbf M \mathbf v=\mathbf a^T \mathbf v \tag{4} 

$由此推出，\mathbf a = \mathbf M^T \mathbf b，\mathbf b = (\mathbf M^T)^{-1} \mathbf a。$

到这里，我们就发现：对于点 \mathbf w 来说，想要从坐标系 A 转换到坐标系 B，只需要对原坐标系 A 中的坐标，乘以一个矩阵 \mathbf M 即可。反之，则是乘以矩阵的逆 (\mathbf M^T)^{-1}。而这个矩阵 \mathbf M，可以通过两个坐标系统的基向量，也就是坐标轴，通过公式 (1) 的矩阵方程进行求解。

在将物体从世界坐标系转到相机坐标系的过程中，只需要将这个矩阵应用到世界坐标系的物体坐标上，就可以得到三维物体相对于相机坐标系的位置坐标。

<strong>这个过程中，物体的实际位置没有发生任何改变，只不过它的坐标，从相对于世界坐标系，变成相对于相机坐标系</strong>。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_94cb7e4f90bd.jpg)

#### 齐次坐标(Homogenous Coordinates)

上面提到的变换矩阵 \mathbf M 存在一点不足，那就是它只能表达旋转和缩放操作，但无法表达平移。具体原因有很多资料已做了描述，这里不再赘述。

在三维世界中，旋转、缩放、平移是三个最基础的操作，因此，为了将平移也融入矩阵运算中，人们引入了齐次坐标。

齐次坐标相比普通的三维坐标，就是在 x、y、z 之外，再引入一维 w：[x,y,z,w]。

同时我们规定，[x,y,z]=[x,y,z,w=1]，即当 w=1 时，齐次坐标可以等价于普通的三维坐标。

$$如果 w \neq 1，那换算方法是：[x,y,z,w]=[\frac{x}{w},\frac{y}{w},\frac{z}{w}]。$$

引入齐次坐标后，变换矩阵自然也可以拓展成 4x4 的维度。

\begin{bmatrix} \color{green}{m_{00}} & \color{green}{m_{01}} & \color{green}{m_{02}} & \color{red}{T_x} \\ \color{green}{m_{10}} & \color{green}{m_{11}} & \color{green}{m_{12}} & \color{red}{T_y}\\ \color{green}{m_{20}} & \color{green}{m_{21}} & \color{green}{m_{22}} & \color{red}{T_z}\\ \color{blue}{0} & \color{blue}{0} & \color{blue}{0} & \color{blue}{1}\\ \end{bmatrix} * \begin{bmatrix} x \\ z \\ y \\ w = 1 \end{bmatrix} \\

在 w=1 的情况下，矩阵第 4 列代表的，就是 x、y、z 对应的平移量。

在之后投影矩阵的计算过程中，齐次坐标的作用会更加明显。

#### 投影矩阵推导

假设我们已经获得了物体在相机坐标系中的坐标 P_e=[x_e,y_e,z_e] (如果只有世界坐标系，也可以通过前面所讲的不同坐标系统的变换，来转换到相机坐标系，这一步也属于相机外参标定的流程)。

将 P_e 从相机坐标系转换到 NDC 的过程，其实就是将 P_e 从下图左边的棱锥转换到右边的立方体的过程 (这里使用 OpenGL 中的坐标习惯，NDC 将 x/y/z 轴都归一化到 [-1, 1])：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_aa936fbae828.jpg)

假设 Near Clipping Plane 到相机中心的距离为 n。在 OpenGL 等图形库中，由于相机坐标系的 z 轴是朝向屏幕外的，因此 Near Clipping Plane 上，点的 z 坐标均为 z=-n。

再假设 Near Clipping Plane 平面上，x 轴的屏幕范围是 [l, r]，y 轴的屏幕范围是 [b, t]，那么屏幕上四个边界点的坐标分别是：(l,t,-n)、(r,t,-n)、(l,b,-n)、(r,b,-n)。

首先，将点 P_e 投影到 Near Clipping Plane 上。根据上文的介绍，这就是 z divide 的过程，由此得到投影后的坐标为：

$$\begin{align} x_p&=\frac{n*x_e}{-z_e} \tag{5} \\ y_p&=\frac{n*y_e}{-z_e} \tag{6} \\ \end{align} $$

在投影后需要考虑把超出屏幕的点裁剪掉，不过这一步也可以放在后面进行，我们先跳过。

接下来就是把投影后的点转换到 NDC 空间了，这是归一化的过程，把 [l,r] 和 [b,t] 这两个区间的数值归一化到 [-1,1]。可以分两步完成。

$$先把 x_p 归一化到 [0,1]：\frac{x_p-l}{r-l}。$$

$$再从 [0,1] 归一化到 [-1,1]：2*\frac{x_p-l}{r-l}-1。$$

调整一下：

$$\begin{align} x_{ndc}&=2*\frac{x_p-l}{r-l}-1 \notag \\ &=\frac{2x_p}{r-l}-\frac{r+l}{r-l} \tag{7} \\ \end{align} $$

同理可以求出 y_{ndc}：

$$\begin{align} y_{ndc}&=\frac{2y_p}{t-b}-\frac{t+b}{t-b} \tag{8} \\ \end{align} $$

由此我们已经得到了 NDC 中的 x/y 坐标。把 (5)(6) 代入到 (7)(8)，得到完整的转换公式：

$$\begin{align} x_{ndc}&=\frac{2n*x_e}{-z_e*(r-l)}-\frac{r+l}{r-l} \tag{9} \\ y_{ndc}&=\frac{2n*y_e}{-z_e*(t-b)}-\frac{t+b}{t-b} \tag{10} \\ \end{align} $$

这个公式看起来复杂，但可以融入到齐次坐标中，变成矩阵运算：

$$\begin{bmatrix} x_{c} \\ y_{c} \\ z_{c} \\ w_{c} \end{bmatrix} = \begin{bmatrix} \frac{2n}{r-l} & 0 & \frac{r+l}{r-l} & 0 \\ 0 & \frac{2n}{t-b} & \frac{t+b}{t-b} & 0 \\ 0 & 0 & A & B \\ 0 & 0 & -1 & 0 \\ \end{bmatrix} * \begin{bmatrix} x_e \\ y_e \\ z_e \\ w_e=1 \end{bmatrix} \\$$

其中 A、B 是待求解的参数。

由这个矩阵可以算出：

$$\begin{align} x_{c}&=\frac{2nx_e}{r-l}+\frac{r+l}{r-l}*z_e \notag \\ w_{c}&=-z_e \notag \\ \end{align} \\$$

前面介绍齐次坐标的时候提到，当 w \neq 1 时，需要除以 w 才能得到最终的坐标，所以这里还需要除以 w_{c}：

$$\begin{align} x_{ndc}&=\frac{x_{c}}{w_{c}} \notag \\ &=\frac{2n*x_e}{-z_e*(r-l)}-\frac{r+l}{r-l} \notag \end{align} \\$$

求出来的 x_{ndc} 和 (9) 中的是一样的，y_{ndc} 也同理。这就是使用齐次坐标的好处。

<strong>由于 r 和 l 是沿中心对称的，即 l=-r，所以 r-l=2r，r+l=0。同理 t-b=2t，t+b=0</strong>。所以矩阵可以简化为：

$$\begin{bmatrix} \frac{n}{r} & 0 & 0 & 0 \\ 0 & \frac{n}{t} & 0 & 0 \\ 0 & 0 & A & B \\ 0 & 0 & -1 & 0 \\ \end{bmatrix} \\$$

上面的矩阵中，还缺失 z_e 对应的参数 A、B。由于 z 轴的计算和 x/y 无关，因此矩阵第三行 x/y 对应的参数可以直接设为 0，我们单独看 A、B 如何求解。

$$由上面的矩阵可以算出：z_{ndc}=\frac{A*z_e+B}{-z_e}$$

假设 Far Clipping Plane 到相机中心的距离为 f。那么 z 轴是从 [-n,-f] 归一化到 [-1,1]，即 z_e=-n 时，z_{ndc}=-1，z_e=-f 时，z_{ndc}=1。由此可以得到两个等式：

$$\begin{align} \frac{-A*f+B}{f}&=1 \notag \\ \frac{A*n+B}{n}&=-1 \notag \end{align} \\$$

$$解出来得到：A=-\frac{f+n}{f-n}、B=\frac{-2fn}{f-n}。$$

由此，我们得到最终的矩阵：

$$\mathbf{P_{proj}}= \begin{bmatrix} \frac{n}{r} & 0 & 0 & 0 \\ 0 & \frac{n}{t} & 0 & 0 \\ 0 & 0 & -\frac{f+n}{f-n} & \frac{-2fn}{f-n} \\ 0 & 0 & -1 & 0 \\ \end{bmatrix} \\$$

这个矩阵，即是所谓的<strong>投影矩阵</strong>，它可以完成相机坐标系到 NDC 坐标系的转换。

对于投影点的坐标 (x_{ndc},y_{ndc},z_{ndc})，如果数值超出 [-1,1] 的范围，就说明投影后的点超出了屏幕范围，可以直接舍弃。

### NeRF中的NDC ray space

前面掰扯了这么多，一方面是帮助大家了解 3D 坐标投影到屏幕上的过程，当然，更重要的是对投影矩阵的推导，这是接下来推导 NDC ray space 的基础。

NeRF 中的坐标，是以射线的形式表示：\mathbf{o}+t\mathbf{d}，其中 \mathbf{o} 是射线起点，\mathbf{d} 是方向向量，t 是射线长度。

<strong>所谓的 NDC ray space，就是把这种射线形式表示的坐标，从相机坐标系投影到 NDC 坐标系</strong>。因此，转换的媒介仍然是投影矩阵：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9cbe7735c734.jpg)

不过，由于坐标的表达形式换了，因此公式上也发生了一些变动。

假设我们已经获得了相机坐标系中的坐标点 P_e=\mathbf{o}+t\mathbf{d}，对应 x/y/z 轴的坐标分别为 (注意区分这里的 t 和投影平面的边界 t)：

\begin{align} x_e&=o_x+t*d_x \notag \\ y_e&=o_y+t*d_y \notag \\ z_e&=o_z+t*d_z \notag \end{align} \\

现在需要求出它在 NDC 坐标系中的投影坐标，假设是 P'=\mathbf{o'}+t'\mathbf{d'}。

那么根据投影矩阵，P_e 转换到 P' 的过程可以表示为：

$$\begin{align} x'&=o_x'+t'*d_x'=-\frac{n}{r}*\frac{o_x+t*d_x}{o_z+t*d_z} \notag \\ y'&=o_y'+t'*d_y'=-\frac{n}{t}*\frac{o_y+t*d_y}{o_z+t*d_z} \notag \\ z'&=o_z'+t'*d_x'=\frac{f+n}{f-n}+\frac{2fn}{f-n}*\frac{1}{o_z+t*d_z} \notag \end{align} \\$$

$$为了简洁一些，假设 -\frac{n}{r}=a_x，-\frac{n}{t}=a_y，\frac{f+n}{f-n}=a_z，\frac{2fn}{f-n}=b_z。那么上面这堆复杂的式子可以简化为：$$

$$\begin{align} x'&=a_x*\frac{o_x+t*d_x}{o_z+t*d_z} \notag \\ y'&=a_y*\frac{o_y+t*d_y}{o_z+t*d_z} \tag{11} \\ z'&=a_z+\frac{b_z}{o_z+t*d_z} \notag \end{align} $$

接下来就是要把 \mathbf{o'}、t'、\mathbf{d'} 求解出来。

首先，对于 \mathbf{o'} 来说，可以直接通过 \mathbf{o} 投影得到，即：

$$\begin{align} \mathbf{o'}& = \begin{bmatrix} o_x' \\ o_y' \\ o_z' \end{bmatrix} = \begin{bmatrix} a_x*\frac{o_x}{o_z} \\ a_y*\frac{o_y}{o_z} \\ a_z+\frac{b_z}{o_z} \tag{12} \end{bmatrix} \end{align} $$

在 \mathbf{o'} 确定后，t'*\mathbf{d'} 可以表示为：

$$\begin{align} \begin{bmatrix} t'*d_x' \\ t'*d_y' \\ t'*d_z' \end{bmatrix} &= \begin{bmatrix} x'-o_x' \\ y'-o_y' \\ z'-o_z' \notag \end{bmatrix} \\ &= \begin{bmatrix} a_x*\frac{o_x+t*d_x}{o_z+t*d_z}-a_x*\frac{o_x}{o_z} \\  a_y*\frac{o_y+t*d_y}{o_z+t*d_z}-a_y*\frac{o_y}{o_z} \\  a_z+\frac{b_z}{o_z+t*d_z}-a_z-\frac{b_z}{o_z+t*d_z} \tag{13} \end{bmatrix} \end{align} $$

由此可以解出：

$$\begin{align} t'&=1-\frac{o_z}{o_z+t*d_z} \tag{14} \\ \mathbf{d'}&= \begin{bmatrix} a_x*(\frac{d_x}{d_z}-\frac{o_x}{o_z}) \\ a_y*(\frac{d_y}{d_z}-\frac{o_y}{o_z}) \\ -b_z*\frac{1}{o_z} \tag{15} \end{bmatrix} \end{align} $$

从公式 (14) 可以看出，当 t=0 时，t'=0，当 t \rightarrow \infty 时，t'\rightarrow 1。所以，在相机坐标系对光线进行采样 (t\in(0,\infty))，就等价于在 NDC ray space 中，对 t' 在 [0,1] 范围内进行采样。

到这一步，整个转换过程基本完成了。

对于投影屏幕来说，可以设定最后成像的图片长宽 (H*W) 和屏幕大小一致，由于投影屏幕的中心即是坐标原点，因此 r=W/2，t=H/2。再假定相机的焦距 f_{cam} 和 Near Clipping Plane 到相机中心的距离相等，即 n=f_{cam}。则 a_x、a_y 可以重新表示为：

$$\begin{align} a_x&=-\frac{f_{cam}}{W/2} \tag{16} \\ a_y&=-\frac{f_{cam}}{H/2} \tag{17} \end{align} $$

(所谓焦距，指的是相机光圈到成像平面的距离。但正如文章开始提到的，由于图形学中的相机是模拟的，所以并不存在焦距的概念。只是由于投影平面一般和 Near Clipping Plane 重合，因此可以简单认为 f_{cam}=n，但二者其实是不同的概念)

对于 a_z 和 b_z，由于论文将 f 设定为无穷远，因此：

$$\begin{align} a_z&=\lim_{f \to \infty} \frac{f+n}{f-n} \notag \\ &=\lim_{f \to \infty}(1+\frac{2n}{f-n}) \notag \\ &=1 \tag{18} \\ b_z&=\lim_{f \to \infty} \frac{2fn}{f-n} \notag \\ &=\lim_{f \to \infty} \frac{2n}{1-\frac{n}{f}} \notag \\ &=2n \tag{19} \end{align} $$

将公式 (16)~(19) 代入公式 (13)(15)，可以得到最终的 \mathbf{o'} 和 \mathbf{d'}： 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cb22af0726eb.jpg)

看到这里还没划走的同学，再坚持一下，马上就结束了。

还剩最后一个 trick。

在公式 (14) 中我们知道，在 t'\in[0,1] 内采样，等价于相机坐标系中在 t\in[0,\infty] 范围内采样。但是，如前文描述的，相机坐标系的可视范围是从 Near Clipping Plane 到 Far Clipping Plane 之间，也就是在 z\in[-\infty,-n] 这个区间。为了保证光线上每个采样点可见，需要把光线起点对齐到 Near Clipping Plane 上。

即 \mathbf{o} 沿光线方向移动 t_n 个单位后，o_z=-z，表示成公式为：

$$\begin{align} o_z+t_n*d_z&=-n \notag \\ t_n&=\frac{n+o_z}{d_z} \tag{18} \\ \end{align} $$

因此，移动后的光线起点为：\mathbf{o_n}=\mathbf{o}+t_n\mathbf{d}

#### 代码实现

以上这些，最终汇总为 NeRF 中的这段代码：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_670f87fb5f80.jpg)

看懂上面的流程，这段代码也就不难理解了。

### 总结

这篇文章主要介绍了世界坐标系到相机坐标系，再到 NDC 的转换流程以及数学原理，并由此推导出光线从相机坐标系到 NDC ray space 的转换公式。

NDC 坐标系由于把各个坐标轴都归一化到 [-1,1] 区间，对坐标处理更加方便，尤其是对于 z 轴上极其远处的物体，在 NDC 坐标系中仍然只需在一个固定区间内处理即可。此外，使用归一化的坐标作为输入，也有利于神经网络的训练。这也是 NeRF 中使用 NDC 坐标系的原因之一。

### 参考

- http://www.songho.ca/opengl/gl_projectionmatrix.html
- [https://github.com/bmild/nerf/files/4451808/ndc_derivation.pdf](https://link.zhihu.com/?target=https%3A//github.com/bmild/nerf/files/4451808/ndc_derivation.pdf)
- 本文大量参考自：https://www.scratchapixel.com/index.html
