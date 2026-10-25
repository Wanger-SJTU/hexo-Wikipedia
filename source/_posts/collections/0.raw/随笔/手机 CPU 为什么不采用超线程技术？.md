#smt #cpu 

https://www.zhihu.com/question/350943889

我来补充一下 @重走此间路 大佬的回答。 SMT虽然能提高吞吐，但是这种多线程吞吐能力，在手机场景上的收益，只能说很低。 
举两个例子，某装机量过亿的爆款国民3D手游W，和另一款装机量过亿的爆款国民2D手游K，都做过多线程改造和优化，其中K由国内顶级软件公司开发，可以认为代表了国内手机应用第一梯队水平，但效果都很不理想。 对于这款3D手游W，Profiling的结果是两个关键线程承担了90%的工作量，意味着其实2个核就已经够用； 对于另一款国民2D手游K，第二个线程槽极少被唤起，统计指标里低到几乎不可见。 收益很低，但付出的代价却比较高。 手机CPU的设计就两个最重要的点，瞬时响应能力(主要靠单核能力支撑，时间尺度主要是100ms级别)，以及功耗。 引入SMT会导致手机的瞬时响应能力下降，因为单核内部的执行资源要分配给多个线程，势必会影响关键线程（特别是用户交互线程）的响应速度。 再加上 @重走此间路 大佬已经提到的功耗问题，可以说SMT在手机上的收益和代价是不成正比的，所以没有得到落地应用也就不奇怪了。 如果未来有一天，手机app的profiling结果发生显著变化，以及工业界找到了可以稳定控制SMT性能干扰的方法、以及可以削减功耗的方法，SMT才能有希望得到应用。


作者：重走此间路  
链接：https://www.zhihu.com/question/350943889/answer/865167248  
来源：知乎  
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。  
  

这事不用猜，Arm设计过超线程的小核，Cortex-A65，是Armv8.2A的指令集和微架构，网上可能数据不多。要看结论的话，那就是，可以，不过要有15-20%单线程性能牺牲。

要用A65替代A55，在手机上，最主要的是确定几件事：

运行在单线程的时候，漏电是不是一致，动态功耗是不是一致，能跑到多少频率，SPECINT2K性能如何。

运行在双线程的时候，多线程性能比单线程提升多少，面积密度是不是更小。

那比较结果如何？

答案是，A65比A55，频率低10%（SSG），动态功耗能效一样（功耗高30%，性能高30%），漏电高了50%。如果用些方法提升A65频率，可能漏电要高100%。

单看这些，A65其实就不太适合手机，手机芯片的漏电要求很高。但是反过来，如果可以接受A65频率低些，那漏电是可以做到一致的。

再看多线程，A65双线程整数性能除以面积，密度是A55的1.8倍，这很好，但是不能消除漏电大对手机的负面影响。当然，此时的漏电如果除以两个核，那是持平或者更小。从这个角度看，就需要统计手机到底有多少时间是一个小核在运行的。

A65用在哪？Arm给了明确的定义，一个是网络处理器数据面的小核，一个是汽车自动驾驶芯片的高能效比核，这两个场景对漏电都不敏感，且很多读写操作。此时，超线程能很好的隐藏访存延迟。

另外，Arm在V9的小核上，用了不同的‘多线程’策略。A65是加入一组寄存器给第二个线程，两个线程共享执行单元。而V9的小核是共享TLB/NEON等不常用的单元，只开启一个核的话，同样条件下，漏电基本不变。

——————————————

作者：QQ Chen  
链接：https://www.zhihu.com/question/350943889/answer/859798334  
来源：知乎  
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。  
  

提醒前面各位答主，ARM现在是有[超（双）线程核](https://www.zhihu.com/search?q=%E8%B6%85%EF%BC%88%E5%8F%8C%EF%BC%89%E7%BA%BF%E7%A8%8B%E6%A0%B8&search_source=Entity&hybrid_search_source=Entity&hybrid_search_extra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A859798334%7D)的，能效好过某款手机小核（嗯，没错，该[超线程核](https://www.zhihu.com/search?q=%E8%B6%85%E7%BA%BF%E7%A8%8B%E6%A0%B8&search_source=Entity&hybrid_search_source=Entity&hybrid_search_extra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A859798334%7D)是“可以”当手机小核来用的）。但是这个核不面向手机市场。

至于为什么，我也不知道为什么。

---

另外，实名反对

[@四眼井](//www.zhihu.com/people/9569fcbb5d7e692d159dac70d3614bc1)

的回答。我在他的回答下面说他在一本正经地胡说八道，结果被折叠了，那我在这里详细说下我为啥这么说。

---

他的观点：ARM的指令集和Intel截然不同，所以不需要超线程。

我的反驳：用不用超线程和指令集无关。只要制造/设计商愿意，多数（如果不是全部）[指令集](https://www.zhihu.com/search?q=%E6%8C%87%E4%BB%A4%E9%9B%86&search_source=Entity&hybrid_search_source=Entity&hybrid_search_extra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A859798334%7D)的CPU都可以搞成支持多线程的。

---

他的观点：ARM有提高硬件效率的手段，那就是[流水线机制](https://www.zhihu.com/search?q=%E6%B5%81%E6%B0%B4%E7%BA%BF%E6%9C%BA%E5%88%B6&search_source=Entity&hybrid_search_source=Entity&hybrid_search_extra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A859798334%7D)

我的反驳：流水线机制确实是提高硬件效率的手段，但是所有现代CPU都用了流水线，这是一个非常基础的手段/概念（讲[计算机架构](https://www.zhihu.com/search?q=%E8%AE%A1%E7%AE%97%E6%9C%BA%E6%9E%B6%E6%9E%84&search_source=Entity&hybrid_search_source=Entity&hybrid_search_extra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A859798334%7D)的书的头两章就会讲到）并不是只有ARM用流水线；ARM也不会只靠流水线提高硬件效率。

---

他的观点：ARM用的RISC，所以每条执行周期和指令体积是一样的。

我的反驳：指令体积一样“基本”没错，但是谁说执行周期是一样的？算术加和算术除的周期数可能一样么？整形运算和[浮点运算](https://www.zhihu.com/search?q=%E6%B5%AE%E7%82%B9%E8%BF%90%E7%AE%97&search_source=Entity&hybrid_search_source=Entity&hybrid_search_extra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A859798334%7D)周期数可能一样么？ALU指令和[访存指令](https://www.zhihu.com/search?q=%E8%AE%BF%E5%AD%98%E6%8C%87%E4%BB%A4&search_source=Entity&hybrid_search_source=Entity&hybrid_search_extra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A859798334%7D)的运算周期数可能一样么？每个指令运行周期一样的那个不是RISC，那是RIDICULOUS。

下面这张是M7（一款设计相对简单的CPU）的流水线图，你看看L/S和ALU #2[流水线级数](https://www.zhihu.com/search?q=%E6%B5%81%E6%B0%B4%E7%BA%BF%E7%BA%A7%E6%95%B0&search_source=Entity&hybrid_search_source=Entity&hybrid_search_extra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A859798334%7D)一样么？

![](https://picx.zhimg.com/80/v2-bdd978d3aa6c8722b42889c2a9d6989d_720w.webp?source=1def8aca)

下面这张是A75（一款设计相对复杂的CPU）的流水线图，你看到Int I0和Int I1的流水线级数是可变的了么？你注意到NEON/FP和Int/LD/ST的流水线流程完全不一样了么？

![](https://picx.zhimg.com/80/v2-76317181658938064ae5feb358bae524_720w.webp?source=1def8aca)

---

总得来说，基本就是甩出一堆业内名词，看着挺像样的，是为一本正经；但是一解释起来完全对不上，是为胡说八道。结合起来，就是一本正经地胡说八道。