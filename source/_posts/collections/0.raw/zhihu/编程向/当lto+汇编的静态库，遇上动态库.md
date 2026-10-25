---
title: "当lto+汇编的静态库，遇上动态库"
date: "2022-08-26 00:00:00"
updated: "2022-08-26 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/编程向/当lto-汇编的静态库,遇上动态库/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/557923508"
---


简单回答：

用llvm-ar、gcc-ar而不是直接ar在termux上编译自己项目时出了问题，提示无法链接到xxx symbol。

仔细一看，是动态库里有一个undefined的symbol，而这个符号应该是一个静态库产生的，然后会被一起编译进这个动态库。

Debug模式下没问题而Release模式下有问题，区别就在Release时我开了`lto`(link-time-optimization)。

既然如此，直接关掉lto？ 问题解决。但我不明白，为什么lto会导致这个问题，而且偏偏这个库出了问题？

$ nm -C ARM64/Release/libboost.context.a

nm: stack_traits.cpp.o: file format not recognized

jump_arm64_aapcs_elf_gas.S.o:
0000000000000000 T jump_fcontext

make_arm64_aapcs_elf_gas.S.o:
                 U _exit
0000000000000018 t finish
0000000000000000 T make_fcontext

ontop_arm64_aapcs_elf_gas.S.o:
0000000000000000 T ontop_fcontext

直接`nm -C`来看这个静态库，发现出现一个文件无法识别格式。原本以为是编译的结果损坏了，拿cutter一看，llvm在lto时产生的.o文件是`LLVM-IR-bytecode`。几经搜索，发现用llvm-nm就能看到详情：

$ llvm-nm -C ARM64/Release/libboost.context.a

stack_traits.cpp.o:
---------------- d guard variable for (anonymous namespace)::stacksize_limit()::limit
---------------- d guard variable for boost::context::stack_traits::page_size()::size
---------------- t (anonymous namespace)::pagesize()
---------------- T boost::context::stack_traits::default_size()
---------------- T boost::context::stack_traits::is_unbounded()
---------------- T boost::context::stack_traits::maximum_size()
---------------- T boost::context::stack_traits::minimum_size()
---------------- T boost::context::stack_traits::page_size()
                 U std::terminate()
---------------- d (anonymous namespace)::stacksize_limit()::limit
---------------- d boost::context::stack_traits::page_size()::size
---------------- W __clang_call_terminate
                 U __cxa_begin_catch
                 U __cxa_guard_acquire
                 U __cxa_guard_release
                 U __gxx_personality_v0
                 U getrlimit
                 U sysconf

jump_arm64_aapcs_elf_gas.S.o:
0000000000000000 T jump_fcontext

所以编译出的静态库里符号是切实存在的，只是没被链接进去**。这更奇怪了……

随着更多子项目被编译，我又发现`libpng`也出现了一模一样的情况，静态库里的符号全部没被动态库识别到。

仔细分析两个项目，`libpng`和`boost.context`的共同点是：<strong>项目里既有C/C++代码，又有单独的GAS汇编</strong>。

lto只对C/C++编译生效，汇编不受影响，难道是这混合的情况导致了问题？


又搜了一搜，很快找到了一篇回答：

跟着上面的说法换用`llvm-ar`来打包静态库**，果然就能正确链接上符号了。

值得一提的是去自己的脚本里改流程的时候，发现自己早就为gcc换了`gcc-ar`……这么说来，其实我已经解决过了一次这个问题？

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_ed7f8bb49b52.jpg)
