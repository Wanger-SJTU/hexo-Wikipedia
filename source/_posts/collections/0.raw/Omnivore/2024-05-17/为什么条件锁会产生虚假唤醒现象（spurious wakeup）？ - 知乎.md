---
title: "为什么条件锁会产生虚假唤醒现象（spurious wakeup）？ - 知乎"
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: "post"
permalink: "/collections/0.raw/Omnivore/2024-05-17/为什么条件锁会产生虚假唤醒现象(spurious-wakeup)-知乎/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

---
id: 52106354-ec06-4b85-a252-dab9dab304ed
---

# 为什么条件锁会产生虚假唤醒现象（spurious wakeup）？ - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/spurious-wakeup-18f85efb643)
[Read Original](https://www.zhihu.com/question/271521213/answer/3478740086)



在不同的语言，甚至不同的操作系统上，条件锁都会产生虚假唤醒现象。所有语言的条件锁库都推荐用户 把wait()放进循环里：while (!cond) {…显示全部 ​

关注者

<strong>232</strong>

被浏览

<strong>167,695</strong>

他们也关注了该问题![很水](https://proxy-prod.omnivore-image-cache.app/0x0,sFlwq2y0BGw0dhXWUqbRz_SYcNFQFvRU5CMNzmQXAC8k/https://picx.zhimg.com/v2-622bb27f4634e19e47944de98f18bb17_l.jpg?source=c8b7c179)![XZiar](https://proxy-prod.omnivore-image-cache.app/0x0,suqb8gC1bXglQHxboFQGpT-PsOXZb_zwpXLooXoGGfwE/https://pica.zhimg.com/v2-3185693e980c2e65dd4848950d392ddf_l.jpg?source=c8b7c179)![饭小米](https://proxy-prod.omnivore-image-cache.app/0x0,sgEkvi2OTlN5lCvvO8St9qbmNc5X55siPXsexLy1aivs/https://picx.zhimg.com/v2-a4c47ec9e9aab0d2414eb1eb8815d76c_l.jpg?source=c8b7c179)

创建时间：2018-04-08 18:52:46

最后编辑：2020-01-12 09:48:17

[![程序喵大人](https://proxy-prod.omnivore-image-cache.app/0x0,s2ImUGXx9XxSia9iLq6ImImnLYErn77xDhCKG5U5CxBo/https://pica.zhimg.com/v2-2f0e242228bbb0445c6f6ce4cd18baba_l.jpg?source=2c26e567)](https://www.zhihu.com/people/chengxumiao)

[程序喵大人](https://www.zhihu.com/people/chengxumiao)

​![](https://proxy-prod.omnivore-image-cache.app/0x0,sEQaOWrSM4sYxMszrQ6lhsM51WgM5AvlqxCkeG6GJZz4/https://pic1.zhimg.com/v2-4812630bc27d642f7cafcd6cdeca3d7a.jpg?source=88ceefae)

学过C++

​ 关注

11 人赞同了该回答

[发布于 2024-04-25 23:24 ，编辑于 2024-04-26 07:28](https://www.zhihu.com/question/271521213/answer/3478740086)・IP 属地上海

<strong>来看代码，从代码角度来分析就可以知道为什么会出现虚假唤醒问题</strong>。

<strong>首先介绍下什么是虚假唤醒？</strong>

之所以称为虚假唤醒，顾名思义，因为线程似乎无缘无故地被唤醒了。当线程在等待一个已发出信号的条件变量时醒来了，却发现不满足它所等待的条件时，就会发生虚假唤醒。

<strong>为什么会出现虚假唤醒？</strong>

虚假唤醒不会无缘无故发生，通常是在多核处理器上才会导致这个问题。

多核处理器上，由于多线程数据竞争问题，会偶现一个pthread\_cond\_signal可唤醒多个wait的线程，产生了类似于广播的效果。

举例：有三个线程，一个线程A正在wait，一个线程B已经wait，一个线程C要signal通知。

```xl
pthread_cond_wait(mutex, cond):
    value = cond->value; /* 1 */
    pthread_mutex_unlock(mutex); /* 2 */
    pthread_mutex_lock(cond->mutex); /* 10 */
    if (value == cond->value) { /* 11 */
        me->next_cond = cond->waiter;
        cond->waiter = me;
        pthread_mutex_unlock(cond->mutex);
        unable_to_run(me);
    } else
        pthread_mutex_unlock(cond->mutex); /* 12 */
    pthread_mutex_lock(mutex); /* 13 */


pthread_cond_signal(cond):
    pthread_mutex_lock(cond->mutex); /* 3 */
    cond->value++; /* 4 */
    if (cond->waiter) { /* 5 */
        sleeper = cond->waiter; /* 6 */
        cond->waiter = sleeper->next_cond; /* 7 */
        able_to_run(sleeper); /* 8 */
    }
    pthread_mutex_unlock(cond->mutex); /* 9 */

```

<strong>A和C可能会有上面代码中的执行顺序。C本来要唤醒的是B线程，结果却误把A线程也唤醒了。这就是典型的虚假唤醒问题的产生原因。</strong>

虚假唤醒虽然会发生，但是只会在极端条件下才会发生。

<strong>虚假唤醒的问题虽然可以解决，但是会导致性能下降，为了规避只偶尔出现的边缘条件，而导致的效率损失不太能接受。所以系统实现层面还是做了取舍，优先考虑性能，需要用户在上层来规避虚假唤醒问题。</strong>

参考资料：

## 1. <https://pubs.opengroup.org/onlinepubs/009604599/functions/pthread%5Fcond%5Fsignal.html>

## 2. <https://en.m.wikipedia.org/wiki/Spurious%5Fwakeup>


<strong>我把相当多的C++文章都整理到了[程序喵/cpp-learning](https://gitee.com/chengxumiaodaren/cpp-learning)上，想了解更多C++技术可以到[程序喵/cpp-learning](https://gitee.com/chengxumiaodaren/cpp-learning)来看。</strong>

![](https://proxy-prod.omnivore-image-cache.app/702x476,sEUNWTfEpNlNcepOSnNliHGqDLV7XPA6xzDuIBLqoZPc/https://pica.zhimg.com/50/v2-c7d50ddb86614c73aeabc5c9f0dabda2_720w.jpg?source=2c26e567)

![](https://proxy-prod.omnivore-image-cache.app/641x337,sJmU9LXfsG56_TT_6l0b0PYrWzmumBy6XMxE1ulBIZos/https://picx.zhimg.com/50/v2-6439ff2b2eb1076c52f687feccfbc641_720w.jpg?source=2c26e567)

[发布于 2024-04-25 23:24 ，编辑于 2024-04-26 07:28](https://www.zhihu.com/question/271521213/answer/3478740086)・IP 属地上海

​赞同 11​​添加评论​收藏​喜欢

​

收起​

[![邱昊宇](https://proxy-prod.omnivore-image-cache.app/0x0,sVlpswjJ14MgX4EHrkhHUO74bpk90pz6sALesr8-NeRw/https://pica.zhimg.com/a83fd6d87b12a86fdb52457a0c098ae9_l.jpg?source=1def8aca)](https://www.zhihu.com/people/timothyqiu)

[邱昊宇](https://www.zhihu.com/people/timothyqiu)

[​](https://zhuanlan.zhihu.com/p/344234033)

知乎十年新知答主

[发布于 2018-04-10 18:09 ，编辑于 2018-04-18 11:08](https://www.zhihu.com/question/271521213/answer/363337814)

举个例子来说：

pthread 的条件变量等待 `pthread_cond_wait` 是使用阻塞的系统调用实现的（比如 Linux 上的 `futex`），这些阻塞的系统调用在进程被信号中断后，通常会中止阻塞、直接返回 EINTR 错误。

同样是阻塞系统调用，你从 `read` 拿到 EINTR 错误后可以直接决定重试，因为这通常不影响它本身的语义。而条件变量等待则不能，因为本线程拿到 EINTR 错误和重新调用 `futex` 等待之间，可能别的线程已经通过 `pthread_cond_signal` 或者 `pthread_cond_broadcast`发过通知了。 

所以，虚假唤醒的一个可能性是条件变量的等待被信号中断。

不过，把等待放到循环里的另一个原因是还可能有这样的情况（有人觉得它是虚假唤醒的一种，有人觉得不是）：明明有对应的唤醒，但条件不成立。这是因为可能由于线程调度的原因，被条件变量唤醒的线程在本线程内真正执行「加锁并返回」前，另一个线程插了进来，完整地进行了一套「拿锁、改条件、还锁」的操作。

比如 Windows 下 `SleepConditionVariableCS` 的文档中就明确指出了可能出现这种情况。（pthread 里的情况则有点区别，人家的 `pthread_cond_signal` 本来就可能唤醒多个正在等待的线程。）

[发布于 2018-04-10 18:09 ，编辑于 2018-04-18 11:08](https://www.zhihu.com/question/271521213/answer/363337814)

真诚赞赏，手留余香

赞赏

还没有人赞赏，快来当第一个赞赏的人吧！

​赞同 113​​9 条评论​收藏​喜欢

​

[![项昊凡](https://proxy-prod.omnivore-image-cache.app/0x0,sYPOst_vEAudSx_wTU8sqAW1P6hYvsnvtGO6ogPfY6n0/https://picx.zhimg.com/v2-abed1a8c04700ba7d72b45195223e0ff_l.jpg?source=1def8aca)](https://www.zhihu.com/people/xiang-hao-fan)

[项昊凡](https://www.zhihu.com/people/xiang-hao-fan)

[发布于 2018-04-10 23:37](https://www.zhihu.com/question/271521213/answer/363597139)

这个查一下 wikipedia 就好了，<https://en.m.wikipedia.org/wiki/Spurious%5Fwakeup> 按照里面的说法，异常唤醒和多核处理器有关系，是底层实现的问题，所以试图在应用层解释都是没有意义的

[发布于 2018-04-10 23:37](https://www.zhihu.com/question/271521213/answer/363597139)

​赞同 28​​1 条评论​收藏​喜欢

​

