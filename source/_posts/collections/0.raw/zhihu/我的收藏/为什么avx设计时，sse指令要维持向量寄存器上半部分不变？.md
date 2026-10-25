---
title: "为什么avx设计时，sse指令要维持向量寄存器上半部分不变？"
date: 2025-05-30
tags: [知乎]
source: https://www.zhihu.com/question/1911139500630980467/answer/1911820717328171672

---

有现成讨论的：

[performance - Why do SSE instructions preserve the upper 128-bit of the YMM registers?](https://link.zhihu.com/?target=https%3A//stackoverflow.com/questions/41819514/why-do-sse-instructions-preserve-the-upper-128-bit-of-the-ymm-registers)[Software consequences of extending XMM to YMM - Intel Community](https://link.zhihu.com/?target=https%3A//community.intel.com/t5/Intel-ISA-Extensions/Software-consequences-of-extending-XMM-to-YMM/td-p/872131)简单来说就是，微软的x64调用约定把xmm6~15设置为non-volatile，callee如果要用到就需要保存并恢复。

但在256bit引入前，没有指令能保存整个y(z)mm（鸡/蛋问题），保存高位的XSAVE是跟着AVX引入的，而之前的FXSAVE限定了128bit SIMD的宽度。

[FXSAVE - Save x87 FPU, MMX Technology, and SSE State](https://link.zhihu.com/?target=https%3A//www.felixcloutier.com/x86/fxsave)[XSAVE - Save Processor Extended States](https://link.zhihu.com/?target=https%3A//www.felixcloutier.com/x86/xsave)也就是说，AVX引入前的64位window二进制完全可能只保存了xmm6开始的寄存器的低位。

中断发生时ISR负责保存volatile的状态（充当caller），但ISR（特指第三方驱动）可能是AVX出现前编译的……

[x64 ABI conventions](https://link.zhihu.com/?target=https%3A//learn.microsoft.com/en-us/cpp/build/x64-software-conventions%3Fview%3Dmsvc-170%23register-volatility-and-preservation)x64调用约定后来说了高位是volatile的，即用了超过128bit的caller需要自行保存。

如果规定普通SSE指令直接清零高位，那等同于宣布这些老的二进制违反ABI了……

所以就只好规定老指令不清高位，让硬件去保存脏状态了。

理论上VEX还有其他好处（non-destructive、更大指令空间等），随着时间推移自然会替换掉non-VEX，那时候开销也就会消失。

但比较脑残的是……

- **并不是所有SSE旧格式指令都有VEX格式**——SHANI扩展就没有。
- **并不是所有后来出现的CPU都支持VEX**——atom线直到gracemont（12代的小核，21年底发布）才支持AVX（08年纸面宣布，11年初跟着sandybridge发布），**而VEX是绑死在AVX上**（也就是绑死256bit的），这10年间你不能完全抛弃旧时代的东西……
- **AVX512时代又半重演了这一幕**，EVEX和附带的特性（32寄存器、mask寄存器、广播/舍入等）也**绑死在AVX512（512bit）上**，而小核的不支持导致这些特性又不能顺利推广（AVX512在13年纸面发布，16年随着KNL发布，到现在也快10年了……最搞笑的是KNL还是从atom衍生出来的）……
- intel发现自己设计的EVEX真是太妙了，APX之类的扩展也可以用上，终于开始推动带EVEX的256bit——AVX10。当然后来跟各路ISV讨论后滑跪转向全线支持512bit就是后话了……
![](https://picx.zhimg.com/v2-b686c3a6ae708837eb7d6fd655b71403_r.jpg?source=2c26e567)