---
title: 也看文档处理分而治之策略：PDF文档的Pipeline式处理逻辑
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-05-20/也看文档处理分而治之策略-PDF文档的Pipeline式处理逻辑/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: e505d4b9-448a-4747-a5e9-a169bab4522c
---

# 也看文档处理分而治之策略：PDF文档的Pipeline式处理逻辑
#Omnivore

[Read on Omnivore](https://omnivore.app/me/https-mp-weixin-qq-com-s-w-e-9-jf-win-0-a-7-z-rk-3-k-5-f-kp-vg-18f936ca5e4)
[Read Original](https://mp.weixin.qq.com/s/wE9jfWin0A7zRK3k5fKpVg)



![cover_image](https://proxy-prod.omnivore-image-cache.app/0x0,skb3iKywXEvgfv5zKtH9TvSLN4boQ44p4dMU_TBd6xkE/https://mmbiz.qpic.cn/sz_mmbiz_jpg/fUBU1yiaEmJhRWqKZS8KCbic9lg9tWVa66CBax1nmaiaNObOwkKngMoPRUjtO13icyQdYQEeqIW5KaS9f2voL9JAicA/0?wx_fmt=jpeg) 

原创  刘焕勇  老刘说NLP _2024-04-17 22:10_ _北京_ 

今天是2024年4月17日，周三，北京，天气晴。

最近文档处理这块受到的关注比较多。

我们今天来看看PDF文档的处理逻辑，以及PPstructure开源工具，供大家一起参考。

## 一、先看PDF文档的处理逻辑

针对给定的文档，可以根据是否可以直接提取内容来选择是走通用解析，还是走OCR方案，如下，图来自于参考文献1。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s9aFuxT6dd9Y-JH2q_sjJ82ILYC6dPJxMfgAq3F7PoFQ/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJhRWqKZS8KCbic9lg9tWVa668OH0G1bVoONJBmjhsfAaBR1NaB8PicicBTLER8qHQPgrCy6j5mibC4xyA/640?wx_fmt=png)

而进一步处理细节上，其具体执行逻辑，按照pipeline，可以分成文档方向分类，版面分析，而在版式分析之后，分别对不同的区域进行处理，例如表格识别、公式识别、文字识别，之后对工作进行聚合，包括阅读顺序等。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s-6VMnPB7m_ABu_pG7v3t3XoAyomMDSkq8Br3Lxd7sGM/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJhRWqKZS8KCbic9lg9tWVa66tV9ACcOzBAp7Xk7lMOzu0x6WicIgoFKX6LDywJrJr8lLF9VPFX7TGjA/640?wx_fmt=png)

## 二、比较流行的PPStructure系列文档开源模型

版面分析指的是对图片形式的文档进行区域划分，定位其中的关键区域，如文字、标题、表格、图片等，PPStrucure提供了版面分析、表格识别、关键信息抽取以及版面恢复等多个功能：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sOp9Y9ADwDITdKl9gQNY1jpC2Dc1naaFYutrk6JtkEgo/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJhRWqKZS8KCbic9lg9tWVa66FP0BlC60FlHu4ssDn0noaJIRp7wmQteQuJib0fE2FgXXfWFFTBTSFUQ/640?wx_fmt=png)

使用的手册如下：https://github.com/PaddlePaddle/PaddleOCR/blob/release/2.7/ppstructure/docs/quickstart.md，https://github.com/PaddlePaddle/PaddleOCR/blob/release/2.7/ppstructure/docs/PP-StructureV2\_introduction.md

代码比较简单，例如图像方向分类+版面分析+表格识别实现如下：

![](https://proxy-prod.omnivore-image-cache.app/0x0,sg-pZS2-CyVBX28Ms8avu5Lq52rg3Ajl5MbmN79rde3s/https://mmbiz.qpic.cn/mmbiz_svg/Xewa2JUmZ1o1Yibps1Tia02fBbZhqc13O0fr3QSqx0A5sdFvGpZqL07QiaN6VNx06XaibSM8UrW8w8uoM4hgm3TwRlfGOWHHMX2N/640?wx_fmt=svg&from=appmsg)`import os
import cv2
from paddleocr import PPStructure,draw_structure_result,save_structure_res
table_engine = PPStructure(show_log=True, image_orientation=True)

save_folder = './output'
img_path = 'ppstructure/docs/table/1.png'
img = cv2.imread(img_path)
result = table_engine(img)
save_structure_res(result, save_folder,os.path.basename(img_path).split('.')[0])

for line in result:
    line.pop('img')
    print(line)

from PIL import Image

font_path = 'doc/fonts/simfang.ttf' # PaddleOCR下提供字体包
image = Image.open(img_path).convert('RGB')
im_show = draw_structure_result(image, result,font_path=font_path)
im_show = Image.fromarray(im_show)
im_show.save('result.jpg')
`

地址：https://github.com/PaddlePaddle/PaddleOCR/blob/133d67f27dc8a241d6b2e30a9f047a0fb75bebbe/ppstructure/layout/README\_ch.md

## 总结

本文主要介绍了两个工作，一个是PDF的处理逻辑，另一块儿是PPstructure的开源工具，虽然使用过程中有很多bad case，但可以针对其中的模块进行魔改。

## 参考文献

1、https://github.com/RapidAI

2、https://github.com/PaddlePaddle/PaddleOCR/blob/release/2.7/ppstructure/docs/quickstart.md

## 关于我们

老刘，刘焕勇，NLP开源爱好者与践行者，主页：https://liuhuanyong.github.io。

老刘说NLP，将定期发布语言资源、工程实践、技术总结等内容，欢迎关注。

**对于想加入更优质的知识图谱、事件图谱、大模型AIGC实践、相关分享的，可关注公众号，在后台菜单栏中点击会员社区->会员入群加入。**

