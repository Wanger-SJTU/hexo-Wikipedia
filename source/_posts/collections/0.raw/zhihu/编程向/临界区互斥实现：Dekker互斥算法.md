---
title: 临界区互斥实现：Dekker互斥算法
date: "2020-04-01 00:00:00"
updated: "2020-04-01 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/临界区互斥实现-Dekker互斥算法/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/122544351
---


在学习OS的过程中遇到了这个由荷兰数学家Dekker提出的互斥算法，觉得有必要记录总结一下。一些基本的概念如: *<strong>race conditin、mutual exclution、critical section</strong>* 就不在此赘述了。

<strong>Dekker互斥算法代码(简写版只举出一个进程）：</strong>

```cpp
bool flag[2]; //初始化为false
int turn; //轮转变量

void process(int me){
    other = 1 - me;
    do{
        flag[me] = true;  //举手，表明进入临界区意愿 

        while(flag[other] == true){ //检查对方是否举手 ，若举手检查是否礼让 
        	if(turn == other){ //目前对方的轮次，我方礼让 
        		flag[me] = false; //放手 
        		while(turn == other); //等待对方结束 
        		flag[me] = true; //举手 
        	}
        }

        /* enter critical section */

        turn = other; //把下一次竞争时的轮次交给对方 
        flag[me] = false;

	}while(true);  
}
```



可以看到Dekker算法是很简单易懂的，采用了双标志的思路，用了flag和turn变量，我们接下来讨论其各自的用处。

flag：这是一个互斥标志，用于进程间的状态交流。当有一个进程先设置为true并通过测试时，另一进程无论如何都无法通过测试

turn：用来避免死锁，也就是

```text
 while(flag[other] == true){ //检查对方是否举手 ，若举手检查是否礼让 
        	if(turn == other){ //目前对方的轮次，我方礼让 

        	}
   }`
```


决定了这样一个竞争时轮转的机制，如果没有这个turn变量，有可能两个进程同时步入while而出现死锁。它决定了当 flag[me] 与 flag[other] 同时为真时，即me和other同时被测试时，me的行为是放手礼让对方，还是等待对方放手。


理解

我的个人理解是，这是一种竞争时轮转的算法，flag保证互斥，通过turn变量解决了死锁以及无限等待的问题，当两个进程在同时竞争CPU资源时，不会导致假互斥，也不会说一方无限等待，另一方无限占用。可以理解成A与B两个人在门外想吃门内的蛋糕，while测试是一道门，flag是A与B当前意愿，当flag为true时表示想吃*<strong>（注意，并不是正在吃）</strong>*，false则是不吃，turn则表示刚刚吃完的对方（A刚刚吃过，则turn = B）。

那么我们就可以把算法理解为以下几种行为：

<strong>①A已进门后B准备进门：</strong>

p.如果A刚刚吃过一次了，B就站在门口等待，并且状态一直为想吃。等待A吃完出门且已将状态设置成不吃后直接进入开吃。

q.如果B刚刚吃过一次了，B就把状态设置为不吃，等A吃完后，重新设置成想吃，在门内重新接受测试*<strong>（可能又回到状态①，不过这次将步入p.）</strong>*

<strong>②A和B同时准备进门：假设这时turn == A，B刚刚吃过蛋糕</strong>

1.在接受测试时发现B刚吃过，于是A不礼让，状态一直为想吃，以此阻塞B。同时B在接受测试时发现自己刚刚吃过蛋糕，于是放手，状态设置为不吃并在测试里等待A。

2.A重新接受测试，这时B已经将状态设置为不吃，A进入吃蛋糕，吃好后出门，将状态设置为不吃，并且下一次若重新进入②，将会礼让B（turn == B）

从上面的讨论也可以看出来，轮转只会发生在同时接受测试时，其余情况下谁先拿到资格谁先进入临界区。记得区分状态p和状态q时A和B的行为。
