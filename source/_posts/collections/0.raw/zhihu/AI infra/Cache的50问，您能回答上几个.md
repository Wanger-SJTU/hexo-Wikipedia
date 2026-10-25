---
title: Cache的50问，您能回答上几个
date: "2025-01-07 00:00:00"
updated: "2025-01-07 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/Cache的50问,您能回答上几个-d9a201/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/16921952423
---


Cache的50问，您能回答上几个

Arm精选

专注Arm架构、TEE安全课程，绿泡泡 arm2023

152 人赞同了该文章

1、MMU关闭时cache的缓存策略是怎样的？

2、阐述一下mmu和cache有哪些关系，有哪些依赖

3、以下术语分别是什么含义：read allocation、write allocation、no-allocation、write-back、write-through、transient和Transient、outer shareable、inner shareable、shareablilty

4、Non-cacheable、device memory之间的区别是什么？

5、Non-cacheable、device GRE之间的区别是什么？

6、什么是伪共享？如何避免？

7、VIVT VIPT PIPT的区别？ 这是cache的硬件机制？ 还是软件的策略？

8、哪些cache是VIPT，哪些是PIPT，有没有VIVT？

9、VIPT是否也有同名、重名的问题？分别如何解决的？

10、L1、L2、L3分别都是多大？这是谁来配置的？配大了的优劣情况

11、全相联、直接相连、多路组相连的区别？优劣分别是什么？一般情况下，都是怎样用和设计的？

12、set、way、index、cache line、entry、cache tag、cache data的概念分别是什么？

13、cache　tag里都包括什么？

14、cache hit和cache hint的概念分别是什么？

15、inner、outer 的概念？ POC POU IS的概念？

16、轮询替换、随机替换、LRU的概念？ 真实情况下是怎样的？L1/L2/L3分别采用的那种方式？

17、strongly、weakly、inclusive、exclusive的概念，真实情况下是怎样的？

18、PTW CACHE、PTE CACHE、TLB 之间的关系？

19、L1、L2、L3 cache的替换策略是怎样的？

20、什么类型的内存永远不会进L3 cache？

21、L3 cache一般都是多大？

22、L3 cache的组织形式一般是怎样的？

23、什么是cache partitioning？

24、DSU、DSU-110、DSU-120有什么区别？

25、什么MPAM？ 有什么作用？

26、什么是Cache stashing？

27、什么是Cache slices？ 有什么好处？

28、L1 System memory和L1 Cache是什么关系？

29、L1指令cache禁用时，指令cache就真的不会缓存了吗？此时还会出现缓存不一致的情况吗？

30、L1 data cache禁用时，L1 data cache就真的不会缓存了吗？此时还会出现缓存不一致的情况吗？

31、在下电的时候，cache有什么自动的行为？

32、有没有invalidate the entire data cache的操作？那操作系统中的invalidate_all_cache是如何实现的？

33、什么是Branch Target Buffer (BTB)？

34、什么是Write streaming mode？ 软件怎样可以影响到Write streaming mode的行为？

35、有关cache的refill，如果L1 MISS，那么L1会发生refill吗

36、Armv9中的原子指令，和cache有啥关系？

37、Exclusive机制和cache有啥关系？

38、数据预取的作用是什么？ 数据预取有哪些指令？

39、执行memset()函数清空一大块内存的时候，这些地址数据都会进cache吗？

40、L1/L2/L3 cache到底在哪里？L1/L2/L3 cache分别都是多大？

41、L1/L2/L3 cache的组织形式都是怎样的？n路组相连？

42、你见过VIVT的cache吗？你为什么要学习VIVT的cache？ 非常干扰你对cache的理解，还不如不学呢.

43、那么cache是VIPT还是PIPT？ 还是在一个core中既有VIPT，也有PIPT？

44、你要学习MESI的原理吗？你能记得住吗？你是不懂MESI，还是不懂cache架构？

45、MOESI又是啥玩意？现在主流的core是MESI，还是MOESI？

46、MESI仅仅是一个协议，总得有硬件来执行这个协议，硬件是谁？

47、MESI这个协议有4个状态，这4个状态记录在哪里？

48、L1/L2/L3 cache中，或者说core cache/cluster cache中，哪些cache的维护遵守了MESI协议，哪些没有遵守？为什么这样设计？

49、cache line中的data是多少个字节？ 在分析问题时，你为什么总是按照条件分析，16bytes的cache line是怎样的，64bytes的cacheline是怎样的？难道你不知道，现在主流的arm core的cache line全部都是64bytes？

50、cache的TAG是什么玩意，里面都有什么？别说cache TAG是物理地址？

51、cache line中又都有什么? 为什么没有index？

52、L2 cache到底是在core中，还是在cluster中？

53、假设一块内存配置成了non-cacheable，为什么就不缓存到cache了？

54、页表entry的属性中定义了cache的缓存策略，那如果disable mmu后，那么cpu读写内存时候的缓存策略是什么？

55、做为一名软件工程师，对于L1/L2/L3 cache的缓存策略，哪些可以修改？哪些是硬件定死的不可以修改？而这些的替换策略又都是怎样的？

56、什么是inclusive cache？ 什么是exclusive cache？ Strictly和Weakly呢？

57、一些概念的理解，如CCI、SCU、DSU、ACE、CHI ？

58、如何配置一个页面的cacheable属性？ 如何配置页表的cacheable属性？

发布于 2025-01-07 17:13・辽宁
ARM

ARM 架构

​赞同 152​​9 条评论​655 ​8 ​分享

​申请转载​​

未登录用户

9 条评论

默认
最新

drbale

对深入做过cache的人不难，没做过的人当然不会。

1）对做过的东西深入理解才是最重要的；

2）体系结构靠的是实践，而不是死记硬背；

that's it~

2025-08-03 · 美国

​回复​2

碧海悠兰

蹲答案

2025-02-21 · 湖北

​回复​1

vivalavida

好像全知道。。 而且很arm
2025-12-02 · 广东

​回复​喜欢

seven

这里面好多问题的答案得是:得看具体芯片
2025-07-22 · 北京

​回复​喜欢

wenmingc

是的，很多根本就没有标准答案
2025-07-25 · 浙江

​回复​喜欢

夙随

玩球，学了个寂寞
2025-07-21 · 广东

​回复​喜欢

小风

270个收藏，没一个答案
2025-03-08 · 北京

​回复​喜欢

a2356668

同收答案
2025-02-20 · 山东

​回复​喜欢

张旭

我不要你们赞同文章，我要一份答案

2025-01-24 · 上海

​回复​喜欢

关于作者

Arm精选
专注Arm架构、TEE安全课程，绿泡泡 arm2023

回答
149
文章
424
关注者
1,327

​关注他​发私信

大家都在搜
换一换

伊朗局势466 万热
拼多多被罚 15.2 亿且暴力阻碍监管437 万热
李雨桐泄露薛之谦信息被行拘370 万热
中将军衔很厉害吗349 万
日本发生7.5级地震328 万热
建议低精力人群查维D326 万热
网传酒店打回访电话致住客离婚300 万
养什么花是四季都开的285 万
女子频繁表白后被确诊「桃花癫」270 万
2026 人形机器人半程马拉松赛259 万

推荐阅读

cache（三）：cache的读写分配策略
corey发表于IC_de...

Cache的一些基本概念
Allocation 在CACHE中发现一个位置，并把新的cache数据存到这个位置的过程。这个处理过程可能包括 evicting（驱逐）cache中已存在的数据，从而为新的数据腾出空间。 Associativity 指每个 S…

千古幽兰

Cache是怎么组织和工作的？
老狼

【cache】cache-16 cache的58问
1、MMU关闭时cache的缓存策略是怎样的？ 2、阐述一下mmu和cache有哪些关系，有哪些依赖 3、以下术语分别是什么含义：read allocation、write allocation、no-allocation、write-back、write…

Tiffa...发表于Tiffa...