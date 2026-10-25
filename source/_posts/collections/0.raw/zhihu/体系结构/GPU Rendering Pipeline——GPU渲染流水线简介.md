---
title: GPU Rendering Pipeline——GPU渲染流水线简介
date: "2019-04-12 00:00:00"
updated: "2019-04-12 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/GPU-Rendering-Pipeline——GPU渲染流水线简介/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/61949898
---


为了更好地理解GPU Architecture，了解顶层应用是很有必要的，虽然我更关心的是GPU在AI领域的应用，但是Render作为GPU主要的应用场景，还是很有必要了解的。本文是我查阅各种资料后，形成的对Rendering Pipeline的理解，其中会夹杂着一些我个人的思考，由于我在图像领域几乎可以说没有任何经验，难免会有疏漏错误的地方，欢迎大家补充指出。

先来看下Rendering领域比较权威的*Real-time Rendering, 4th*中对Graphics Rendering Pipeline的划分：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_104a03d593c2.png)

Rendering Pipeline上图是目前对Rendering Pipeline比较粗粒度的划分，具体每一阶段内部也有自己相应的流水线，这篇文章将按照上图以四个阶段去展开说明，详细介绍Rendering Pipeline的每一个阶段。但是这个领域的变化实在太快的，业界的标准一直在Update，我发现第三版的*Real-time Rendering*流水线只有三个阶段，没有Pixel Processing阶段，其实只是将Pixel Processing阶段整合在了Rasterization阶段中。所以这里建议大家也不用去拘泥于具体Pipeline是如何去划分的，只需要去了解<strong>每一个阶段做了些什么，输入和输出是什么，改变了什么</strong>，我想这样就足够了。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_6815d56bdc45.jpg)

Real-time Rendering, 3rd中的Rasterization阶段
### Application Stage

Application，简而言之，就是图像在应用中的处理阶段。应用，说白了就是一段运行在CPU上的程序，这时还没有GPU什么事。这个具体的应用可能只是显示一张图片；也有可能是CAD，对一个物体进行缩放、移动、旋转等操作；也有可能是游戏，在一个虚拟世界中上蹿下跳，所有的这些交互和操作，对应的就是应用接收到用户的一系列输入，然后再通过显示器输出对于画面给用户。在接收到用户相应的输入（或者程序设定好的一系列操作），到将相应的图元（primitives）输入到GPU进行Rendering的这个阶段，就是Application Stage。

Application阶段的职责，可以简单理解为：定义当下要构建世界的模型图元，对GPU中的各个Shader进行编程和参数设定，最后将图元和这些信息传递给GPU，GPU便可以帮助我们显示对应的每一帧。Application阶段结束后，会将<strong>渲染图元（rendering primitives）</strong>发往GPU做进一步的处理，这里的图元可以是点、线和三角形。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_8d0ca8dbbd80.jpg)

这里拿Real-time Rendering书中的一幅示意图来说明，左边的图就犹如Application Stage的输出，站在一个上帝视角，决定这个世界的模型和我们的观察角度，还有这个世界中的一些光源信息（光在哪里，什么光，光的强度等）。右边就是经历完整条Rendering Pipeline后，GPU对应的输出结果，决定我们可以看到什么，即当前应该在显示器上显示什么。

该阶段CPU会执行一些诸如collision detection, global acceleration algorithms, animation, physics simulation的操作，比较常见的操作就是<strong>碰撞检测（collision detection）</strong>。顾名思义，碰撞检测就是检测物体之间是否发生了碰撞，用于检测两个物体是否发生重叠， 然后再做出相应的反馈。比如人物在地面上走动、上下楼梯；子弹击中目标留下弹孔；小球在盒子中不断弹跳，这些都需要进行碰撞检测，然后再生成相应的图元。

### Geometry Processing

Application结束后，GPU就拿到rendering primitives和一些相关指令、参数，开始了在GPU中的旅程。首先，这些图元会经过Geometry Pipeline，在*Real-time Rendering*中，将Geometry Pipeline划分成了如下图的四个阶段。整个Geometry Processing阶段的目的是对输入的图元进行调整、修改、转换、增删等操作，在这整个阶段中，我们的处理对象是图元，输入的是图元，输出的还是图元。这里之所以强调处理对象，是因为在Rendering Pipeline的后面，处理对象就从图元变成了像素（Pixel），即光栅化之后的操作。

**

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_8731c5d1b57a.jpg)

Geometry processing stage
#### 1. Vertex Shading**

接收到CPU发来的图元信息后，GPU的Vertex Shader就开始了工作，Vertex就是顶点的意思，之前提到过，图元无非就是点、线和三角形，对应的其实就是一个Vertex，两个Vertex和三个Vertex。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_821668f80df6.jpg)

那么Vertex Shading阶段要对这些Vertex做什么呢？主要有两件事情，一件是计算这些顶点的位置，将这些Vertex从模型空间转换到视角空间；另一件是根据程序员的指令，对这些顶点添加信息，或作出一些修改。其中，Vertex Shader一定要计算每一个Vertex的position（位置），而其他的操作是可选项，由程序员在应用中进行定义。下面会对Vertex Shading阶段所做的事情做一个简要的介绍。

**

- Position**
首先，什么是视角转换，为什么要转换视角，给每个Vertex一个新的Position呢？

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_2e78a440702a.jpg)

这里拿RTR书中的一幅插图来说明，我之前提到过，CPU丢给GPU的信息，仿佛就是站在上帝视角，上帝所洞悉到的所有信息。由于GPU是目的是站在人类的角度，将人类可以观察到的画面，输出在显示器上。所以这里要以人的视角为中心，将刚刚输入的视角点做为坐标的中心，进行坐标转换，这样会使得后续的投影和裁剪（Projection & Clipping）操作更简单快速。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_f37ca17cfe0f.jpg)

通过变换矩阵，以改变Vertex坐标系，得到各个Vertex的新Position**

- Lighting, animation, texture coordinates** **and others**
接下来说说Vertex Shader的其他操作，比如lighting, animation和texture。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_33ad0850c809.jpg)

光照应该比较好理解，因为我们会将光源信息和视角信息也一并送入GPU，GPU拿着这些信息便可以给每个Vertex添加相应的光照信息。当然，物体之间的位置关系、距离、重叠、遮挡这些因素也需要考虑，以得到反射、阴影这些信息。如果展开，还有光的各种反射、折射，还可以引申到光线的追踪范畴，需要注意的是，这里只需对每个Vertex计算对应的光照信息。

**

然后说说animation，动画为什么和Vertex相关呢？既然Vertex Shader可以改变Vertex的信息，就可以使得Vertex移动到特定的位置，以改变物体形状，或者产生一些动作。就拿人物表情作为例子，假设角色的头部由一系列的Vertex组成，通过改变某些特定的Vertex，就可以构成人物各种生动丰富的表情。Vertex数目越多，可以修改的顶点就越多，那么人物的动作就可以越丰富。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_be03c6d27502.jpg)

由许多Vertex组成的头部![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_8c63d91c4fcd.jpg)

The Delsin characters face![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_80a092812525.jpg)

通过对Vertex的修改，以形成各异的茶壶这里放一张经典的贴图，左边是原始的图元，我们通过对这些Vertex进行修改，就可以得到各种我们想要的新物体。

这里还需要提及的就是，上图中的人物主要是靠纹理（texture）来实现不同部位具有不同的颜色的效果，虽然在Vertex Shader阶段还不需要进行贴图操作，但是我们可以在这一阶段通过计算来得到每个Vertex对应的纹理坐标（texture coordinates），以方便后续的阶段使用该坐标。

Tessellation，Geometry Shader**

以上这一系列的操作仅仅是Vertex Shading的一部分，接下来Vertex Shader将会进行Projection阶段的操作，在介绍后续的Projection和Clipping阶段之前，这里需要对Vertex处理阶段中的两个可选阶段单独拎出来重点介绍，分别是Tessellation和Geometry Shader。因为他们在Rendering Pipeline中占有一定地位的，在DX11 pipeline中可以发现他们的身影。Tessellation是在DX11中被引入的，而Geometry Shader是在DX10中被引入的。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_9124343c9307.jpg)

DX11 Pipeline
#### <strong>1.1. Tessellation</strong>

首先，与Tessellation相关的是DX11中的Hull Shader, Tesselator, Domain Shader，整个Tessellation阶段的目的其实就是在已有图元的基础上，去加入更多的Vertex（这些Vertex还是在原始的图元内），以形成更精细的模型。Tessellation的中文意思是镶嵌，还是挺形象的，因为是在原始图元的内部添加顶点，所以看起来就像是在内部镶嵌了许多的三角形。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ff87bab0bf58.jpg)

A large primitive change into a bunch of smaller primitives![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_f3f3915252b3.jpg)

应用Tessellation，甚至可以将一个正方体通过不断添加Vertex的方式，来形成一个光滑的球体。通过Tessellation，原有的模型被添加了大量的Vertex，有了这些Vertex，我们再应用Displacement Mapping (贴图置换)，这里的贴图是存储了高度信息的纹理，可以改变每个Vertex的高度信息。如下图所示，原始图元先通过Tessellation变得更加光滑，也同时使得模型含有更多的Vertex。然后再通过贴图置换，给每个顶点加上相应的高度偏移量，使得整个模型充满大量细节，以变得更加逼真。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_e4db7e3d2719.jpg)

Tessellation后再进行Displacement Mapping![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_46a0c64f9ee9.jpg)

Tessellation PipelineTessellation具体的Pipeline可以参照上图，大概是Hull Shader会将控制点信息发往Domain Shader，同时也会给Tessellator一些系数，告诉Tessellator具体的细分级别。最后Domain Shader再将所有接收到的信息进行整合，就可以完成整个Tessellation流程，生成我们想要的新的模型。想了解更多的Tessellation阶段细节，可以浏览以下网址。

**

#### 1.2. Geometry Shader

与Tessellation在原有图元内部镶嵌三角形不同，Geometry Shader是在图元外添加额外的Vertex，将原始图元转换成新图元，以构建一个不一样的模型。比如下图左边的三角形，通过添加三个Vertex，使得原先的三角形变成了六边形；通过对右边的线段添加额外的两个Vertex，以构成了一条折线。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_94abe074864d.jpg)

an additional two vertices for a line, an additional three for a triangle那么，对原始图元进行修改、变换、扩展有什么用呢？假设我们要显示火/烟雾/云朵这类模糊的物体，我们可以通过渲染100或1000个球形粒子来模拟。这些球形粒子在图形中，其实是一个个正方形（由一对三角形组成），然后通过纹理贴图，使其看起来像一个个球体。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a171c0026e69.jpg)

可以将N个球形粒子组合在一起来模拟![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_9223626663b6.png)

每个球形粒子其实是一个矩形贴图有了Geometry Shader，我们就可以只用一个Vertex来表示每一个颗粒，只需要在Geometry Shader阶段将每一个Vertex拓展成两个三角形以形成一个正方形即可。除此之外，还可以使用Geometry Shader来决定下一个粒子的位置，在该坐标新建一个Vertex，以添加更多原始图元中不存在的额外颗粒。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_f38f533cdc01.jpg)

 Use Geometry Shader to expand

#### 2. Projection**

由于GPU最终是在屏幕上显示我们可以观看到的画面，所以Projection阶段需要决定我们的屏幕具体可以投影出什么内容。对于投影方式，有许多种，一般使用透视投影 (perspective projection)和正交投影 (orthographic projection)。当我们观察外界时，外界是通过透视投影来输入到眼睛的，即我们的观察方式是一个视椎体（Viewing frustum）。透视投影的投影线相交于一点，特点是近大远小，具体可以看到左边示意图中的黄球大，红球小。而平行投影的投影线相互平行，投影的结果与原物体的大小相等，主要应用在建筑、工程制图等方面。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ca7a1f1a34de.jpg)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_27cda433293b.jpg)

通过以上两张示意图，便可以很直观地了解到Projection阶段所做的事情，即将三维的物体投影到一个二维的平面上，并且决定具体的投影方式。需要注意的是，虽然这里生成的是二维的平面，但是具体Z坐标信息都会存储在z-buffer中，后续的阶段还会使用到Z坐标的信息。

**

#### 3. Clipping**

裁剪阶段，这个就很好理解了，顾名思义，就是将我们看不到的，也就是视野范围外的物体统统剔除掉，反正他们最后都不会出现在屏幕，要他们有何用？对应的就是上图Far clip plane之外的模型，比如那颗绿球，有可能在Vertex Shading阶段我们对绿球做了许多操作，但是我们最后看不见它啊，我们也只好忍痛将它剔除。这里我就在想，现在的Rendering Pipeline，有什么机制可以使得Vertex Shader提前知道有哪些Vertex将会被clip掉，然后就不对这些Vertex进行操作，避免做无用功，这确实很有意思，后续有空再慢慢挖这个坑吧。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_b400d8389768.jpg)

Clipping阶段我们屏幕最终可以显示的内容就是unit-cube中的内容，由于红色三角形在外部，对其进行剔除；橙色三角形有一部分在外部，对其添加两个新的Vertex，将外部的三角形剔除，最终转变成两个三角形；左下角的线条一部分在外面，直接在边缘交接处形成一个新的顶点，连接起来，再删除原有的外部顶点。这样，就完成了Clipping阶段的所有操作。

**

#### 4. Screen Mapping**

屏幕映射阶段，简而言之，就是将unit-cube中的坐标系转换到屏幕的坐标系，如下图所示，就是将Projection阶段后得到的x, y坐标系转换到(x1, y1)到(x2, y2)这个矩阵坐标系中。当然，对于z坐标系也需要进行转换，以映射到对应的坐标系中，默认是[0, 1]，这个值可以通过API进行修改。是不是映射后就可以直接显示在屏幕上了呢？当然不是，现在只知道有哪些Vertex会在视野范围内，以及他们对应的坐标和其他信息，而真正显示在屏幕上的是一个个像素，这中间还有很多事情需要做，目前大概只完成了Rendering Pipeline的一半工作。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_5fa8b1028275.jpg)

 Screen Mapping阶段**

让我们来简单梳理下Geometry Processing**，首先是Vertex Processing，顶点操作大致可以分为下图三种橙色方框的操作，其中Vertex Shader是必选操作，后面的Tessellation和Geometry Shader是可选操作。CPU将图元输入GPU，GPU首先需要对这些Vertex进行处理，以得到对应的新坐标（position）。然后可以通过Tessellation，在原始图元内部添加更多顶点，以实现对原有模型的精细化。同时，还可以通过Geometry Shader来对现有的图元进行拓展，转换成一个新的模型。在结束了上述操作后，通过Projection得到相应的投影平面，再通过Clipping裁剪掉视野外的模型，最后通过Screen Mapping转换到相应的坐标系。至此，我们就结束了Geometry Processing这个阶段，后续就将经历光栅化，然后就该和像素打交道了。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_7bf5c2950e13.jpg)

### Rasterization

光栅化的目的是将Geometry Processing处理后的得到的图元（primitives）转换成一系列的像素（即picture elements），以方便后续的Pixel Processing，最终输出到屏幕上。Rasterization可以细分成Triangle Setup和Triangle Traversal，名字中含有Triangle并不意味着光栅化只处理三角形（当然还需要处理点和线图元），只是因为大部分的图元是三角形。** 

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_864e1eb3e95f.jpg)

Rasterization, Pixel ProcessingRasterization也被称作scan conversion，比较形象地说明了这个过程是对所有的像素进行扫描遍历，然后决定哪些像素属于该图元。比如下图经过Rasterization阶段后，灰色的像素属于左边的三角形图元，蓝色的像素属于右边的三角形图元。根据不同的硬件和不同的扫描模式，这里的扫描步进可以是32x32, 8x8等不等，并不是一个个像素去遍历，以充分利用GPU的SIMD。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_32cb09374859.jpg)

Rasterization Result

#### 1. Triangle Setup**

这一个阶段也称作primitive assembly，也就是将一个个图元组装起来，会计算图元的边方程和一些其他信息，说白了就是将各个点连接起来，组成真正的三角形（或者连成线）。然后下一阶段会利用这些信息进行三角形的遍历，也就是检查有哪些像素位于该三角形图元内，对于点、线图元，就看他们覆盖了哪些像素。

**

#### 2. Triangle Traversal**

为了将图元转换成像素，就需要识别每个图元覆盖了哪些像素，或者说，哪些像素处于图元的内部。那么，对于那些只有一部分在图元内部的像素，该怎么样去划分呢？一般情况下，我们会将下图中的绿色和黄色像素归为该图元的像素，为什么这样去划分呢？我们可以看到，每个像素的中心有一个点，我们便是用这个中心点来进行划分的，若中心点在图元内部，那么这个中心点所对应的像素就属于该图元。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_d2d9049fb17b.jpg)

Triangle Traversal除了目前传统的划分模式——Standard Rasterization外，在DX11中，引入了一种新的遍历类型——Conservative Rasterization (CR)，然后CR又分为两种类型，故目前总共有三种遍历类型。用上图来做一个解释说明，首先，在outer-conservative rasterization模式下，只要像素被图元触碰了，都属于该图元，意味着上图所有带有颜色的像素都属于该图元；然后在inner-conservative rasterization模式下，只有绿色像素属于该三角形的像素，即只有整个像素被覆盖的情况下才属于图元像素。

如果只用像素的中心点来判别是否属于该图元的像素，可能就会出现下图左边的情形，虽然很大一部分的像素被红色三角形所覆盖，可最终这个像素的颜色是白色。这时如果像素有四个采样点进行识别，就可以得到右边的结果，由于一半在内部一半在外部，所以最终像素的颜色为红色和白色的混合，变成粉红色。这里只是给大家一个思路，就是采样点不一定位于像素的正中心，有很多种的像素处理方式，这里就不展开说明，有兴趣的朋友可以去了解一下Supersampling, Multisampling antialiasing techniques。

**

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a0d720af3040.jpg)

经过了Triangle Setup和Traversal，便完成了Rasterization阶段，后面就需要和Pixel打交道了，故后续的步骤称作Pixel Processing。

### Pixel Processing

通过上述的Rasterization阶段，我们就拿到了各个图元对应的像素，最后这个阶段要做的事情就是给每个Pixel填充上正确的颜色，然后通过一系列处理计算，得到相应的图像信息，最终输出到显示器上。Pixel Processing**可以分为Pixel Shading和Merging两个阶段，这两个阶段也被称作Fragment Shading和Color Blending，从名字可以看出，其实描述的都是同一件事，我们这里只需要关注具体的输入和输出便可以了。

<strong>1. Pixel Shading</strong>

这个阶段的目的是给输入每一个Pixel赋予正确的颜色，这些颜色的来源可以是纹理、图元的顶点信息和光照信息等，这里将分别对他们进行解释。

首先对于纹理信息，前面的阶段我们已经得到了每个Vertex Shader的纹理坐标，那么我们就可以拿着这个这个坐标去纹理单元中裁剪出这个图元对应的纹理，然后再给图元中的每个像素赋值。拿RTR中的一幅插图来详细说明，我们需要将对应的纹理粘到像素上，这里我们并不知道每个像素的纹理坐标，只知道每个Vertex的纹理坐标，但是通过图元的三个顶点，可以得到该图元的纹理块，将该纹理块的颜色信息，对应地赋值到该图元中的像素，便实现了纹理的颜色赋值。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c43bd50ce4a9.jpg)

Texturing之前在Vertex Shading阶段提到过，可以给每个Vertex加上对应的光照、阴影信息，那么这些信息怎么作用到图元中的每个像素呢？在GPU中是通过插值（Interpolate）来实现的，具体就是用三角形三个顶点的值，来得到三角形中某个点的相应信息。比如我们想知道下图p点的信息，我们只需要知道x1, x2, x3三点的信息，通过相应的数学公式求得三点对p点的贡献，就可以得到相应的信息。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_16870d0e17f1.jpg)

**

以上这种方法实现的光照效果，称作Per vertex lighting，即通过Vertex信息插值得到像素的光照信息，如果三角形比较大的话，插值出来的光照效果可能就会不理想，不够真实。相应的，还有一种计算光照信息的方法，称作Per pixel lighting，顾名思义，就是对每个像素进行光照处理。具体实现方法是用光源向量、射线向量、法线向量来计算每个像素的光照信息，这样的实现效果必然比插值的效果更好，同时，运算量会大大增加。目前在纹理中还可以加入向量信息，这样就可以对应知道每个像素的法线向量，通过这个向量，就可以实现凹凸的贴图光照效果。

这里就不继续往下展开了，有兴趣的朋友可以去查阅相关资料，光线追踪什么的，这里也是一个大坑。我们只需要了解到Pixel Shading就是给每个输入的Pixel一个相应的信息就足够了，然后这些Pixel就可以带着这些信息来进行后续处理，最终显示在屏幕上。目前应用中与光照相关的计算，大部分都在这个阶段进行处理，所以这个阶段通常是整个系统最大的性能瓶颈。

#### 2. Merging**

到了Merging这一阶段，输入的每个Pixel都有相应的颜色信息，被存储在Color buffer，这一阶段就是要整合这些Pixel信息，以得到具体一帧的图像信息，这一阶段也被称作ROP。

之前提到过，每个Vertex在经过Projection阶段后，对应的Z坐标信息并不会丢弃，而是存放在z-buffer中，在上一阶段做颜色插值的同时，其实也会将z-buffer中的信息对应地插值到每个Pixel，也就是意味着这一阶段的每个Pixel其实是带有Z坐标的深度信息。除了Z坐标信息，每个Pixel会带有Alpha信息，即透明度，alpha与RGB信息一同被存放color buffer中。

有了这些深度信息和alpha信息，我们就可以做一系列的测试，以确定哪些Pixel会被遮挡，不需要显示；哪些Pixel透明度不为1，需要做Blending操作，以决定最终需要输出的图像。这些测试包括Alpha Test, Stencil Test, Depth Test，可以理解为，输入的各个Pixel，需要过五关暂六将，一一通过这些测试，才能最终显示在我们的屏幕上。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_fa3ef869cfa5.jpg)

Stencil Test![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_284037bc6910.jpg)

Blending**

这里对Pixel Processing阶段做个总结，我们拿到光栅化的Pixel之后，首先通过Pixel Shading（即Fragment Shading）给每个像素赋予相应的信息，然后再通过Merging阶段，得到最终需要在屏幕上显示的图像信息，至此，就完成了整条Rendering Pipeline。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_47872f50a0e6.jpg)

### Conclusion & Example

到这里，我们就梳理完了整条Rendering Pipeline，先来简单回顾下各个阶段。下图中绿色方框表示该阶段完全可编程，其中有两个绿色方框是虚线，表示这两个步骤是可选项，然后黄色方框表示该阶段可以使用参数进行配置，但是不可编程，蓝色方框表示该阶段完全固定，不可编程和配置。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_3c1a71436d7d.png)

Rendering Pipeline

如果印象还深刻的话，应该还记得从Vertex Shader到Screen Mapping都属于Geometry Processing，其中前三个阶段属于Vertex Shading阶段。然后通过Projection、Clipping，得到unit-cube（也被称作canonical view volume），再进行Screen Mapping，转换到对应的屏幕坐标系。接下来就到了光栅化阶段，即通过Triangle Setup & Travelsal，得到各个图元对应的像素，拿着这些像素，就来到了最后的Pixel Processing阶段。首先通过Pixel  Shader得到每个像素的颜色信息，再通过Merging进行各种测试、混合颜色，以得到最终的画面信息。到这里，就完成了整条Rendering Pipeline，下一步就可以将画面输出到显示器上了。下面两张图是比较Detail的Rendering Pipeline，大家可以对照着重温一下。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_e1b0ebb5ed55.jpg)

Rendering Pipeline of more details![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_3f4817a4da11.jpg)

Rendering Pipeline with example

最后用一个Example来结束对Rendering Pipeline的介绍。如下图所示，假如我们要显示一张街景图片，上面有一些房子的模型，那么，我们是如何让GPU完成这一系列的处理呢？首先，CPU完成3D Modeling，并且将相应的图元发送到GPU，这时所有的Vertex处于World Space坐标系，然后通过Vertex Shading转换到View Space，同时可以给每个Vertex加上光照信息。接下来，我们可以对这些Vertex进行修改、增删操作，比如将其中的方形建造转换成圆形建筑。然后到第五步，将这些Vertex按照一定的方式投影到一个平面，再通过第六步剔除视野外的模型。接下来就可以进入第七步的光栅化操作，将所有的图元变成Pixel。第八第九步属于Pixel Shading过程，即给每个Pixel加上纹理颜色、光照等信息。最后第十步经过一系列测试和Blending，得到最终要输出的图像信息。至此，便完成了Rendering Pipeline，可能这个示意图的Pipeline划分和命名与上面的介绍有些许出入。但是没关系，我们只需要知道每一阶段的目的，输入、输出是什么，**这就足够了。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c7d4df2cd9a7.jpg)

Rendering Pipeline
