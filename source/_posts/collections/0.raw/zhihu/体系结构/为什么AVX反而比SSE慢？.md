---
title: "为什么AVX反而比SSE慢？"
date: 2026-04-21
tags: [知乎]
source: https://www.zhihu.com/question/37230675/answer/273654228
---

韦易笑
​
游戏开发等 4 个话题下的优秀答主

​ 关注

407 人赞同了该回答

混用 SSE 指令和 AVX 将会引发 transition penalty ：

- 如果你的测试代码里写了 avx指令，但是编译选项设置的是 SSE，你程序其他部分再跑着SSE代码，但是你写了的avx指令照样会被执行，这时每次状态切换将消耗 50-80 个时钟周期。
- 如果你的测试代码里写了 sse指令，但是编译选项设置的是 AVX，你程序其他部分再跑着avx代码，但是你写了的sse指令执行的时候一样会碰到这个状态切换。解决方法：

- 不要混用 SSE/AVX，要用就全用一种
- 实在不行要混用的话，记得用完 avx指令以后调用：VZEROUPPER / _mm256_zeroupper() 清除 ymm 寄存器高位。否则 CPU在不知道 YMM寄存器高位是否清零的情况下执行 SSE代码，会需要在内部保存和恢复 ymm寄存器的高位，一进一出耗费50-80个周期。

Intel® AVX State Transitions: Migrating SSE Code to AVX

阅读全文​
​赞同 407​​10 条评论​301 ​38 ​分享