---
title: Stable Diffusion基础：ControlNet之人体姿势控制
date: "2024-12-03 00:00:00"
updated: "2024-12-03 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/Stable-Diffusion基础-ControlNet之人体姿势控制/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/649325629
---


在AI绘画中精确控制图片是一件比较困难的事情，不过随着 ControlNet 的诞生，这一问题得到了很大的缓解。 今天我就给大家分享一个使用Stable Diffusion WebUI + OpenPose ControlNet 复制照片人物姿势的方法，效果可以参考上图。

 OpenPose 可以控制人体的姿态、面部的表情，有时候还能够解决坏手的问题（不要抱太大期望，下文会有介绍）。

 OpenPose可以直接复制一张图片的人体姿势，就像题图一样，也可以通过骨架图生成人体图片（什么是骨架图？下文会有介绍）。

 下面我们就以“文生图”为例，来看下如何使用 OpenPose 。

### 安装ControlNet

一般的 Stable Diffusion WebUI 整合包或者镜像都已经安装了这个插件，如果你的还没有安装，需要先安装它。已经安装好的跳过这一小节即可。

方法是打开 Stable Dissusion WebUI 前端页面，进入“扩展插件”-“从网址安装”，在“扩展插件的git仓库网址”中输入：[https://github.com/Mikubill/sd-webui-controlnet](https://link.zhihu.com/?target=https%3A//github.com/Mikubill/sd-webui-controlnet)，然后点击“安装”，待安装完成后重启 SD WebUI。各种 ControlNet 模型和预处理器一般会在首次使用时自动下载安装。

**

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_df90840ee46f.jpg)

如果访问github不畅，也可以通过别的方式下载插件包和对应的模型，然后自己部署到 stable-diffusion-webui 中。文章最后提供了我整理的插件包和各种模型。

具体部署路径如下：

- ControlNet插件：/extensions
- ControlNet模型：/extensions/sd-webui-controlnet/models
- ControlNet预处理器：/extensions/sd-webui-controlnet/annotator/downloads
注意需替换  为你自己的SD WebUI部署路径，如果你的 SD WebUI 启动命令中配置了模型的路径，或者做了文件夹的软链接，也需要根据实际情况进行调整。

安装成功后，在“文生图”、“图生图”界面的下方会出现 ControlNet 区域，点击右侧的展开按钮，下边有4个ControlNet单元，也就是我们可以同时使用4个ControlNet模型控制出图的效果，一般也就够了。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_2fd3f20a7069.jpg)

如果你的 ControlNet 只有1个单元，或者你想修改这个单元的数量，可以到“设置”中调整，如下图所示，找到“多重控制网:最大模型数量”，更改之后别忘了重启。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_20d917888a86.jpg)

### 复制图片姿势

进入“文生图”界面，只需要选择一个你喜欢的大模型，填写简单的提示词就可以了。文章最后提供了我整理的模型合集，有兴趣的可以参考使用。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_cfa7d5a0a03e.jpg)

然后在页面下方的 ControlNet 中设置 OpenPose，按照下图所示的步骤操作：

- 这里只需要设置1个 ControlNet 单元，选择第一个就行了。
- 上传你要复制姿势的图片。
- 启用这个 ControNet 单元，一般选择图片后会自动勾选。
- 选中“完美匹配像素”，让 ControlNet 自动计算一个合理的内部图片处理空间，涉及底层技术细节，无脑勾选就行了。
- Control Type 选择 OpenPose。
- 预处理会自动带出，不用修改。它是用来从参考图片中提取骨架图的。
- 模型会自动带出，不用修改。它是在生成图片时根据骨架图控制人体姿势的。
- 这个按钮可以将参考图片的尺寸带到“文生图”参数中，如果参考图片的高宽没有超过 1024 ，建议使用，超过1024的出图会比较慢，可以按照图片比例手动设置“文生图”中的高宽参数。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_4f0010f2186a.jpg)

最后点击“生成”就等着出图吧。这里会输出两张图片，一张是使用大模型加OpenPose生成的图片，另一张是根据参考图片生成的骨架图，我们可以把这个骨架图复制出来，以后继续使用或者分享给别人使用。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_1f774df7a5e4.jpg)

注意看这个骨架图中是有一点手的形状的，所以理论上，如果我们在骨架图中描绘了手的形状，生成图片中的手是会受到一定约束的。再来一张总统挥手的照片，这只手看着还不错，不过也是生成了很多张之后挑选出来的。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_931a179803f7.jpg)

生图参数：**

a man in a suit waves from a plane window as he stands on the deck of a plane with his hand up, Beeple, sunglasses, a stock photo, american romanticism**Negative prompt: EasyNegative,bad hands,bad fingers
Steps: 20, Sampler: Euler a, CFG scale: 7, Seed: 289185078, Size: 656x432, Model hash: c0d1994c73, Model: realisticVisionV20_v20, Denoising strength: 0.7, Clip skip: 2, ControlNet 0: "preprocessor: openpose_full, model: control_v11p_sd15_openpose_fp16 [73c2b67d], weight: 1.5, starting/ending: (0, 1), resize mode: Crop and Resize, pixel perfect: True, control mode: Balanced, preprocessor params: (512, -1, -1)", Hires upscale: 2, Hires upscaler: Latent, TI hashes: "EasyNegative: c74b4e810b03", Version: v1.5.1

### 使用骨架图姿势

在上一小节我们使用 OpenPose 时，先提取了图片人物的骨架图，然后使用骨架图生成的图片，所以只要有骨架图就能生成图片了。这对于创造太方便了，毕竟没有那么多的图片可以参考。

这里为了演示方便，直接使用上一小节提取的骨架图。我们只需要更改 ControlNet 这里的设置，如下图所示：

- 上传照片使用骨架图。
- 预处理器设置为None，因为我们不需要再从照片中提取人物的骨架图。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_90070a82aa8d.jpg)

其他参数都不变，直接生成就好了。

### 创造骨架图

骨架图从哪里来？这里介绍一个网站、两个插件，都可以生成或者获取骨架图。

#### Avatar Pose Maker

这是一个制作骨架图的网站，可以调整人体的姿势、拍照的视角，也可以下载别人制作好的骨架图。

访问地址：https://avatarposemaker.deezein.com/

打开的页面如下图所示，我简单说下几个操作区域：

- 这里选择你要调整的身体部位
- 这里设置具体身体部位的参数，可以调整姿势。
- 这里可以调整人物的视角，是正面、侧面，还是仰视、俯视等等。
- 这里下载你创造的骨架图照片
- 这里可以随机生成很多人体姿势。
- 这里可以进入查看别人分享的姿势，有标签说明姿势是什么含义，选择下载就好了。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_ebf1b367d662.jpg)

#### OpenPose Editor

这是 Stable Diffusion WebUI 的一个插件，插件访问地址：[https://github.com/fkunn1326/openpose-editor.git](https://link.zhihu.com/?target=https%3A//github.com/fkunn1326/openpose-editor.git)，插件安装方法参考上文的“安装ControlNet”。

安装成功后，我们可以在一级页签中看到“OpenPose Editor”，这个插件的使用比较简单，可以在绘图区域这里直接调整人物的姿势，然后下载图片备用，或者直接发送到文生图、图生图等使用。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_dc5c9eb4d867.jpg)

这里贴出我这个骨架图的出图效果：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_eb4ac03beff3.jpg)

生图参数：**

eastern girl,18 years old, standing, waving left hand, balck hair, long straight hair, blue eyes, white shirt, blue jeans, trees, blue sky, cloud
Negative prompt: EasyNegative, bad hands, bad fingers, malformed
Steps: 30, Sampler: DPM++ 2M Karras, CFG scale: 7, Seed: 1995058330, Face restoration: CodeFormer, Size: 512x512, Model hash: 15012c538f, Model: realisticVisionV51_v51VAE, Denoising strength: 0.7, Clip skip: 2, ControlNet 0: "preprocessor: none, model: control_v11p_sd15_openpose_fp16 [73c2b67d], weight: 1, starting/ending: (0, 1), resize mode: Crop and Resize, pixel perfect: False, control mode: Balanced, preprocessor params: (-1, -1, -1)", Hires upscale: 2, Hires upscaler: Latent, TI hashes: "EasyNegative: c74b4e810b03", Version: v1.5.1

#### 3D Openpose

这是又一个Stable Diffusion WebUI的插件，访问地址：[https://github.com/nonnonstop/sd-webui-3d-open-pose-editor.git](https://link.zhihu.com/?target=https%3A//github.com/nonnonstop/sd-webui-3d-open-pose-editor.git)，不会安装的同学请参考上文的“安装ControlNet”。

安装成功后，我们可以在一级页签中看到“3D Openpose”，这个插件功能比较强大，我们可以在一个3D的环境中调整人物的形态，但是操作上也会比较复杂，大家可以自己体会下。

- 双击骨架图中的关节部位可以调整这个关节的方向。
- 鼠标滑动可以调整人物的视角和大小。
- 特别支持了手脚的深度图、边缘检测图，用于优化手脚的生成，也可以单独只生成手。
调整好后，点击“生成”。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_f461e7fa806d.jpg)

生成后的预览图如下，第一张是骨架图，后边几张是用来画手脚的辅助图。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_20a58a024773.jpg)

可以直接发送到文生图和图生图，也可以下载后备用。直接发送感觉不太好用，建议先下载再上传。ControlNet的设置方式和上文直接使用骨架图生成图片一样，注意不需要选择预处理器。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_5ee7732851b8.jpg)

如果我们希望对手脚进行专门的修复，可以使用画手脚的辅助图。这里选择边缘检测这个ControlNet，注意还是不要选择预处理器，启动控制步数和结束控制步数大家可以根据实际情况调整，文生图中不要从0到1，会影响图片的结构，图生图中可以使用局部绘图修手修脚。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_743d12c5ece1.jpg)

虽然我们专门对手脚进行了处理，但是出图的效果还是经常出现畸形的手脚，效果是有的，但和期望的差距还比较大。下边是两个例子：

- 文生图带修手：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3de2d357001f.jpg)

- 先文生图，再图生图局部修手：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_be35e0a0f406.jpg)

### 资源下载

如果你下载插件和模型不方便，可以使用我整理的资源包，关/注/公/众/号：萤火AI绘画，发消息：插件，即可获取下载地址。

以上就是本次分享的主要内容，如果有问题欢迎沟通交流。

如果你还没有使用过Stable Diffusion WebUI，可以先看这几篇文章，了解下如何使用：

手把手教你在本机安装Stable Diffusion秋叶整合包

[手把手教你在云环境炼丹（部署Stable Diffusion WebUI）](https://zhuanlan.zhihu.com/p/646996035)

[SDXL 1.0出图效果直逼Midjourney！手把手教你快速体验！](https://zhuanlan.zhihu.com/p/648693902)
