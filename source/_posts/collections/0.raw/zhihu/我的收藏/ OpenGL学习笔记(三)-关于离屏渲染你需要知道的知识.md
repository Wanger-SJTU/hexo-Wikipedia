---
title: (1 条消息) OpenGL学习笔记(三)-关于离屏渲染你需要知道的知识
date: "2020-07-12 00:00:00"
updated: "2020-07-12 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/OpenGL学习笔记(三)-关于离屏渲染你需要知道的知识/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/157649253
---


### 0.测试代码

在开始之前，先看看如下的代码：

`//1.按钮存在背景图片
UIButton *btn1 = [UIButton buttonWithType:UIButtonTypeCustom
btn1.frame = CGRectMake(100, 30, 100, 100);
btn1.layer.cornerRadius = 50;
[self.view addSubview:btn1];
[btn1 setImage:[UIImage imageNamed:@"image.png"] forState:UI
btn1.clipsToBounds = YES;

//2.按钮不存在背景图片
UIButton *btn2 = [UIButton buttonWithType:UIButtonTypeCustom
btn2.frame = CGRectMake(100, 180, 100, 100);
btn2.layer.cornerRadius = 50;
btn2.backgroundColor = [UIColor blueColor];
[self.view addSubview:btn2];
btn2.clipsToBounds = YES;

```text
//3.UIImageView 设置了图片+背景色;
```

UIImageView *img1 = [[UIImageView alloc]init];
img1.frame = CGRectMake(100, 320, 100, 100);
img1.backgroundColor = [UIColor blueColor];
[self.view addSubview:img1];
img1.layer.cornerRadius = 50;
img1.layer.masksToBounds = YES;
img1.image = [UIImage imageNamed:@"image.png"];

```text
//4.UIImageView 只设置了图片,无背景色;
```

UIImageView *img2 = [[UIImageView alloc]init];
img2.frame = CGRectMake(100, 480, 100, 100);
[self.view addSubview:img2];
img2.layer.cornerRadius = 50;
img2.layer.masksToBounds = YES;
img2.image = [UIImage imageNamed:@"image.png"];`

打开模拟器的Color off-screen Rendered，看到的结果如下:

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_08a49c1d5587.png)

案例发现第一个和第二个颜色变成了黄色，说明发生了离屏渲染。

从代码来看：1设置了圆角和图片，3设置了背景色、圆角和图片；2虽然设置了圆角，但是仅仅只设置了背景色，4仅仅设置了圆角和图片，没有设置背景色。

### 1.App的渲染流程

<strong>1.1.正常的渲染渲染流程</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f7056bd5b628.jpg)

渲染渲染流程App以60FPS给帧缓冲区(Frame Buffer)填入数据，显示器以60Hz的速度向帧缓冲区取数据并显示在屏幕上。这是正常的完美情况，但是，实际上确不一定是这样的，因为CPU和GPU存在瓶颈，或者其他的原因导致这个正常的情况会被打破。

<strong>1.2.离屏渲染流程</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_dbe5ba92f8ff.jpg)

发生了离屏渲染的流程当正常的渲染流程被打破时，App就会先把数据存入离屏缓存区，然后进行图层的叠加，放入帧缓冲区，最后再去显示，但是这时数据在离屏缓冲区，就会发生上下文切换，如果在一个TableView或者CollectionView上快速滑动的话，就会导致卡顿掉帧。

<strong>1.3.使用遮罩时发生的离屏渲染</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7807b06ba7f6.jpg)

使用遮罩时发生的离屏渲染如上图所示：

- App把数据提交到Core Animation，不管系统这时用的时OpenGL还是Metal来渲染，但是大致流程都是一样的，都是提交到Render Server，然后在GPU中的Command Buffer得到顶点，使用顶点着色器来绘制位置，得到片段，再用像素着色器来渲染，这时只能得到遮罩即①，即得到MaskTexture，这时这个遮罩是不能显示在屏幕上的，这时这个遮罩就存在了离屏缓冲区中了；
- 为了得到②也是按上1的流程重新走一遍得到②，也存放到离屏缓冲区；
- 最终得到效果除了走一遍1的流程以外，还要把上面得到①和②从离屏缓冲区中取出来，然后再组合起来，存放到帧缓冲区中，最后显示出来。
总结: 所以当App需要进行额外得渲染和合并时，就会把数据存放到offscreen Buffer，然后在组合，放在Frame Buffer，最后再显示到屏幕上；

**面试题:为什么离屏渲染会有性能问题？
1.离屏渲染会有额外得存储空间；
2.从offScreen取出来放入Frame Buffer时也有时间消耗
3.offScreen是有空间限制，是屏幕像素的2.5倍

> 既然离屏渲染会发生性能问题，那为什么还要用呢？
1.其主要原因是，有些特殊的效果，无法一次性得到最终的效果，必须使用offScreen Buffer来保存中间状态，就不的不使用，这时是系统自动触发，常见的圆角、阴影等；
2.如果这个特殊效果会多次渲染到屏幕上，那么我们就可以提前渲染好，保存在offScreen Buffer中，从而达到复用的目的；这是手动触发的；

1.4.毛玻璃渲染流程**

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6ecd2dd0a5c0.jpg)

官方图![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_12ab28c53c13.jpg)

毛玻璃渲染流程当使用系统的UIVisualEffectView来实现毛玻璃效果时，整个流程如上图所示，

- 先得到原图
- 得到缩略图
- 得到水平模糊
- 得到垂直模糊
- 最后合并成想要的效果
上面的前4步都属于中间效果，所以都需要先存放到Off Screen中。

### 2.离屏渲染的原因

<strong>2.1.设置光栅化（shouldRasterize）</strong>

**When the value of this property istrue, the layer is rendered as a bitmap in its local coordinate space and then composited to the destination with any other content.Apple原话是，当把这个属性设置为true时，该图层将在其本地坐标空间中呈现为位图，然后与其他任何内容合成到目标。即当想要把某个效果复用时，就把这个属性设置为true

光栅化的使用建议:

- 如果layer不能被复用，则没有必要打开光栅化；
- 如果layer不是静态的，需要频繁修改修改的，比如处于动画之中，那么开启离屏渲染反而会影响效率；
- 离屏渲染缓存内容有时间限制，缓存内容在100ms内，如果内容没有被使用，那么它就会被丢弃，无法再进行复用了；
- 离屏渲染缓存空间优先，超过2.5倍的屏幕像素大小的话，也会失效，且无法进行复用。
2.2圆角导致**

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a049f73978a5.jpg)

图层的构造图层由三个部分构成：backgroundColor，contents，border组成。

当仅仅只设置view.layer.cornerRadius = 2时，能触发离屏渲染吗?

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9431ba949f71.jpg)

官方文档文档上说，如果只设置了view.layer.cornerRadius时，只会设置background和border的圆角，不会设置content的圆角，除非同时设置了layer.maskToBounds为True。

### 3.离屏渲染的逻辑

油画算法

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d7760a1d5879.jpg)

油画算法图层叠加时，使用油画算法来绘制，即先渲染远处的，再渲染中间，最后渲染近区的。所以苹果建议，尽量不要使用很多图层叠加，因为图层太多后，进行渲染时计算量很大，会有一点的性能开销。

不进行圆角等操作时:

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5cd0a4f7f0a2.jpg)

不使用离屏渲染时当sublayer绘制到屏幕上之后，就会将sublayer从帧缓冲区中移除，从而节省空间。

当需要进行圆角等操作时:

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e796dcc67394.jpg)

开始圆角![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a06a7774891d.jpg)

三个进行圆角后，组合渲染比显示
### 4.圆角处理手段

<strong>4.1.方案一:</strong>

`_imageView.clipsToBounds=YES;
_imageView.layer.cornerRadius=4.0;`

4.2.方案二:

贝塞尔曲线一

`- (UIImage *)roundedCornerImageWithCornerRadius:(CGFloat)cornerRadius {

```text
    CGFloat w = self.frame.size.width;
    CGFloat h = self.frame.size.height;
    CGFloat scale = [UIScreen mainScreen].scale;
    // 防止圆角半径小于0或者大于宽高中较小的一半
    if (cornerRadius  0) {
        cornerRadius = 0;
    } else if (cornerRadius > MIN(w, h)) {
        cornerRadius = MIN(w, h)/ 2.0;
    }
    UIImage *image = nil;
    CGRect imageFrame = CGRectMake(0, 0, w, h);
    UIGraphicsBeginImageContextWithOptions(self.frame.size, NO, scale);
    [[UIBezierPath bezierPathWithRoundedRect:imageFrame cornerRadius:cornerRadius] addClip];
    [self drawRect:imageFrame];
    image = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();

    return image;
```

}`

贝塞尔曲线二

`- (void)addMaskToBounds:(CGFloat)maskBounds {

```text
    CGFloat w = self.frame.size.width;
    CGFloat h = self.frame.size.height;
    CGFloat scale = [UIScreen mainScreen].scale;
    CGRect imageFrame = CGRectMake(0, 0, w, h);

    if (self.cornerRadius  0) {
        self.cornerRadius = 0;
    } else if (self.cornerRadius > MIN(w, h)) {
        self.cornerRadius = MIN(w, h)/ 2.0;
    }
    UIImage *image = self.image;

    UIGraphicsBeginImageContextWithOptions(self.frame.size, NO, scale);
    [[UIBezierPath bezierPathWithRoundedRect:imageFrame cornerRadius:self.cornerRadius] addClip];
    [self drawRect:imageFrame];
    image = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
```

}`

4.3.方案三：

图片覆盖遮罩

`@interface RoundImageView : UIView
@property (nonatomic, strong) UIImageView *maskView;
@end

@implementation RoundImageView
- (instancetype)init {

```text
    if (self = [super init]) {
        _maskView = [[UIImageView alloc] initWithFrame:CGRectZero];
        _maskView.image = [UIImage imageNamed:@"mask_image"];
        [self addSubview:_maskView];
    }
    return self;
}
```


- (void)layoutSubviews {

```text
    [super layoutSubviews];
    CGRect bounds = self.bounds;
    _maskView.frame = bounds;
}
```


@end`

4.4.方案四:

iOS上的 YYImage 的圆⻆处理

[](https://link.zhihu.com/?target=https%3A//github.com/ibireme/YYWebImage/blob/093193c67bfa2409af93e618a48e3208d63106a5/YYWebImage/Categories/UIImage%252BYYWebImage.m%23L356)

`- (UIImage *)yy_imageByRoundCornerRadius:(CGFloat)radius

```text
                                 corners:(UIRectCorner)corners
                             borderWidth:(CGFloat)borderWidth
                             borderColor:(UIColor *)borderColor
                          borderLineJoin:(CGLineJoin)borderLineJoin {

    if (corners != UIRectCornerAllCorners) {
        UIRectCorner tmp = 0;
        if (corners & UIRectCornerTopLeft) tmp |= UIRectCornerBottomLeft;
        if (corners & UIRectCornerTopRight) tmp |= UIRectCornerBottomRight;
        if (corners & UIRectCornerBottomLeft) tmp |= UIRectCornerTopLeft;
        if (corners & UIRectCornerBottomRight) tmp |= UIRectCornerTopRight;
        corners = tmp;
    }

    UIGraphicsBeginImageContextWithOptions(self.size, NO, self.scale);
    CGContextRef context = UIGraphicsGetCurrentContext();
    CGRect rect = CGRectMake(0, 0, self.size.width, self.size.height);
    CGContextScaleCTM(context, 1, -1);
    CGContextTranslateCTM(context, 0, -rect.size.height);

    CGFloat minSize = MIN(self.size.width, self.size.height);
    if (borderWidth  minSize / 2) {
        UIBezierPath *path = [UIBezierPath bezierPathWithRoundedRect:CGRectInset(rect, borderWidth, borderWidth) byRoundingCorners:corners cornerRadii:CGSizeMake(radius, borderWidth)];
        [path closePath];

        CGContextSaveGState(context);
        [path addClip];
        CGContextDrawImage(context, rect, self.CGImage);
        CGContextRestoreGState(context);
    }

    if (borderColor && borderWidth  minSize / 2 && borderWidth > 0) {
        CGFloat strokeInset = (floor(borderWidth * self.scale) + 0.5) / self.scale;
        CGRect strokeRect = CGRectInset(rect, strokeInset, strokeInset);
        CGFloat strokeRadius = radius > self.scale / 2 ? radius - self.scale / 2 : 0;
        UIBezierPath *path = [UIBezierPath bezierPathWithRoundedRect:strokeRect byRoundingCorners:corners cornerRadii:CGSizeMake(strokeRadius, borderWidth)];
        [path closePath];

        path.lineWidth = borderWidth;
        path.lineJoinStyle = borderLineJoin;
        [borderColor setStroke];
        [path stroke];
    }

    UIImage *image = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    return image;
```

}`

### 5.常见触发离屏渲染的几种情况

- 使用了mask的layer(layer.mask);
- 需要进行裁剪的layer(layer.maskToBounds / view.clipsToBounds);
- 设置了组透明度为YES，并且透明度不为1的layer(layer.allowGroupOpacity / layer.opacity);
- 添加了阴影layer(layer.shadow*);
- 采用路光栅化layer(layer.shouldRasterize);
- 绘制了文本layer(UILabel，CATextLaber，Core Text等)。

参考:

[](https://zhuanlan.zhihu.com/p/72653360)
