---
title: "app如何判断手机设备已参加过优惠活动？"
date: 2026-04-15
tags: [知乎]
source: https://www.zhihu.com/question/31256995/answer/205081698
---

识别一台手机是否参加过优惠，本质上是：怎么获取、识别一台终端的唯一识别号。

**1、iOS平台**

iOS 7.0以前，可以通过获取MAC、UDID、UUID、OPEN UDID等方式来唯一标识一台终端。

iOS 7.0以后，苹果禁止了UDID及剪贴板共享权限，无法通过获取MAC、UDID等方式来得到iOS设备的唯一识别号，继续采用OPEN UDID的意义也不大。

**

苹果官方解决方案：

IDFA：Identifier for Advertisers

IDFV：Identifier for Vendors

但IDFA、IDFV也存在问题：用户可以重置终端唯一标识。

a、对IDFA：

用户可通过以下步骤重置

设置-->隐私---->广告-->还原或限制

设置--->设置--->通用--->还原--->还原位置与隐私

b、对IDFV

用户把属于此Vender的App卸载掉，重新安装此APP后IDFV的值和之前不同。

解决办法：通过IDFV+keychain的方案，例如： [mushank/ZKUDID](https://link.zhihu.com/?target=https%3A//github.com/mushank/ZKUDID)

Use IDFV(identifierForVendor) + keychain to make sure UDID consistency, even if the App has been removed or reinstalled.

当然可以采用：CFUUID、NSUUID+keychain的方案

2、Android**

可以通过如下途径获取终端唯一识别号（不同手机厂商权限要求不同，有些需要用户授权）

唯一编号（IMEI、MEID、ESN、IMSI）

MAC地址

序列号

ANDROID_ID

只不过以上信息，在android虚拟机/模拟器上都可以伪造，因此Android平台上还涉及虚拟机/模拟器反欺诈问题。建议采用首次安装判断+用户注册绑定手机号等手段。**

关于android虚拟机和模拟器以前的一个回答 [https://www.zhihu.com/question/33537532/answer/64966375](https://www.zhihu.com/question/33537532/answer/64966375)  ，供参考。

3、如果不是原生app，而是采用HTML5（例如在微信公众号、小程序中）**

可以考虑采用一些web 指纹识别的解决方案，但存在用户重置唯一标识问题。

FingerprintJS http://valve.github.io/fingerprintjs/、

Canvas fingerprinting https://browserleaks.com/canvas#how-does-it-work

ETAG  http://lucb1e.com/rp/cookielesscookies/ 

[发布于 2017-07-28 17:07](//www.zhihu.com/question/31256995/answer/205081698)

​​128 ​17 ​分享

​​

收起​
