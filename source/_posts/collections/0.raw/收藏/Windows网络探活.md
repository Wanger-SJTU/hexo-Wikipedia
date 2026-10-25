---
title: Windows网络探活
date: "2026-04-11 21:40:17"
updated: "2026-04-11 21:40:17"
layout: post
permalink: /collections/0.raw/收藏/Windows网络探活/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

原创 沈沉舟 青衣十三楼飞花堂 2023-06-10 21:03 发表于北京

#Windows

#Network 

```
创建: 2023-06-10 19:41https://scz.617.cn/network/202306101941.txt
```

Win10右下角托盘区域有时会出现个小地球，提示"无法连接到Internet"，即使你正欢快地上着公网，仍有一定几率看到这个提示。一般来说不用理会，也不影响啥。但是，出现该提示时，你的Microsoft Store就废了，无法下载安装应用、无法登录、提示0x800704cf错误码等等，微软的智障设计。其实还有其他影响，主要影响微软家的网络应用，比如Skype。

这个小地球的出现与下列注册表设置相关

```
Windows Registry Editor Version 5.00[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\NlaSvc\Parameters\Internet]"ActiveDnsProbeContent"="131.107.255.255""ActiveDnsProbeContentV6"="fd3e:4f5a:5b81::1""ActiveDnsProbeHost"="dns.msftncsi.com""ActiveDnsProbeHostV6"="dns.msftncsi.com""ActiveWebProbeContent"="Microsoft Connect Test""ActiveWebProbeContentV6"="Microsoft Connect Test""ActiveWebProbeHost"="www.msftconnecttest.com""ActiveWebProbeHostV6"="ipv6.msftconnecttest.com""ActiveWebProbePath"="connecttest.txt""ActiveWebProbePathV6"="connecttest.txt""CaptivePortalTimer"=dword:00000000"CaptivePortalTimerBackOffIncrementsInSeconds"=dword:00000005"CaptivePortalTimerMaxInSeconds"=dword:0000001e"EnableActiveProbing"=dword:00000001"PassivePollPeriod"=dword:0000000f"StaleThreshold"=dword:0000001e"WebTimeout"=dword:00000023
```

Windows有套神经病机制判断当前PC是否能上公网，不说IPv6，只说IPv4，至少包含如下操作

```
$ curl http://www.msftconnecttest.com/connecttest.txtMicrosoft Connect Test$ curl -s http://www.msftconnecttest.com/connecttest.txt | xxd -g 100000000: 4d 69 63 72 6f 73 6f 66 74 20 43 6f 6e 6e 65 63  Microsoft Connec00000010: 74 20 54 65 73 74                                t Test
```

定时访问上述URL，期待返回"Microsoft Connect Test"。仔细看注册表

```
"ActiveWebProbeContent"="Microsoft Connect Test""ActiveWebProbeHost"="www.msftconnecttest.com""ActiveWebProbePath"="connecttest.txt"
```

瞧见没，访问哪个FQDN的哪个文件，期待返回什么内容，都在注册表中指定好了。WWW探活用的是HTTP(80/TCP)，不是HTTPS(443/TCP)。

另一个探活操作类似这样

```
$ nslookup -type=A dns.msftncsi.com 8.8.8.8...Name:   dns.msftncsi.comAddress: 131.107.255.255$ dig +short A dns.msftncsi.com @8.8.8.8131.107.255.255
```

同样有注册表项对应

```
"ActiveDnsProbeContent"="131.107.255.255""ActiveDnsProbeHost"="dns.msftncsi.com"
```

明明能上公网，只是WWW/DNS探活检测失败，Microsoft Store仍受影响，这种智障设计的原始逻辑是什么？身在大陆地区，包括但不限于GFW在内的各种干扰因素很难不影响探活检测。当PC位于非透明Proxy后面时，比如Proxy需要身份认证、不转发UDP通信等等，探活检测更加神经病，会不停尝试。另一方面，探活检测事实上向微软服务器不停报告Windows系统的存在，有洁癖的可能不喜这种行为。当然，即便没有探活检测，仍有其他通信前往微软服务器，防不胜防，此处不展开。

将EnableActiveProbing从1改成0，会阻止"Microsoft Internet Connection Test"

```
Windows Registry Editor Version 5.00[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\NlaSvc\Parameters\Internet]"EnableActiveProbing"=dword:00000000
```

组策略另有一套机制阻止探活检测

```
本地计算机策略  计算机配置    管理模板      系统        Internet通信管理          Internet通信设置            关闭Windows网络连接状态指示器的活动测试              已启用
```

我测试过，彻底禁用探活检测后，不影响Microsoft Store使用。若不想彻底禁用探活检测，可通过注册表项修改WWW/DNS探活检测所用数据，比如将connecttest.txt放在自建服务器上，再比如将DNS探活检测所用FQDN及期待的解析结果改成其他值，这些都是我YY的，未实测。

这事儿也可通过组策略完成

```
本地计算机策略  计算机配置    管理模板      网络        网络连接状态指示器          指定企业网站探测URL          指定企业DNS探测主机地址          指定企业DNS探测主机名          指定全局DNS
```

NCSI默认情况下会将DNS探活局限于当前正在探测的接口。若启用"指定全局DNS"，则NCSI允许在任何接口上进行DNS探活，比如向127.0.0.1:53/UDP查询。

还可以尝试用hosts文件骗过DNS探活

```
$ notepad c:\windows\system32\drivers\etc\hosts131.107.255.255 dns.msftncsi.com
```

未研究WWW探活与DNS探活是AND还是OR的关系，我猜是AND。

NCSI (Network Connectivity Status Indicator)是从Vista开始引入的，当时的DNS探活数据延用至今，但WWW探活数据有变。

据说除了主动探活，还有被动探活。假设启用主动探活，但主动探活因故失败，此时被动探活继续这种自以为是的神经病行为。当进入本机的IP报文TTL小于8时，被动探活失败。相关注册表项是

```
Windows Registry Editor Version 5.00[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\NlaSvc\Parameters\Internet]"PassivePollPeriod"=dword:0000000f"MinimumInternetHopCount"=dword:00000008
```

若判断是被动探活惹的祸，尝试将MinimumInternetHopCount改成1，这是最小有效值。

可通过组策略禁用被动探活

```
本地计算机策略  计算机配置    管理模板      网络        网络连接状态指示器          指定被动轮询
```

有人见到过这样的注册表设置

```
Windows Registry Editor Version 5.00[HKEY_LOCAL_MACHINE\SYSTEM\ControlSet001\Services\NlaSvc\Parameters\Internet\ManualProxies]@="http=127.0.0.1:8080;https=127.0.0.1:8080"
```

我猜是为WWW探活指定相应Proxy吧，不过这种肯定解决不了DNS探活过Proxy的问题。若WWW探活与DNS探活是OR的关系，再设个靠谱的Proxy，确实能增加探活成功几率。

回到原始问题，假设能上公网，但Win10小地球误出现，非IT人士的最佳选择是重启，可能就解决了。专业人士的话，可手动进行WWW/DNS探活，确保不是主动探活失败。假设主动探活没问题，那被动探活惹祸的嫌疑大增。Wireshark抓包只是理论上可行，我都不知道被动探活具体检查何种入站报文的TTL值。

到目前为止，对专业人士做一个合理建议，全面禁用主动探活、被动探活，重启确保生效。之后真碰上网络故障时，用传统技能自行排障，一劳永逸避免智障小地球或黄色惊叹号的出现。

说实话，前面的技术部分我实施了，但没有进一步检验效果。有天我碰上这幺蛾子，想治一下时，它消失了，妈蛋。

收录于合集 #Windows