---
title: 从理解XGBoost到实现TGBoost
date: "2016-12-08 00:00:00"
updated: "2016-12-08 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/学习/从理解XGBoost到实现TGBoost/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/24247616
---


今年似乎在生活上学术上都没有什么大的进步，唯一欣慰的是打的几个比赛拿了奖，认识了一些牛人。如果需要发表获奖感言，那么最需要感谢的是机器学习圈里各种方便的开源工具，尤其是 

[XGBoost](https://link.zhihu.com/?target=https%3A//github.com/dmlc/xgboost) 。几个月前看了XGBoost的论文，在知乎上回答了这个问题： 

[机器学习算法中GBDT和XGBOOST的区别有哪些？ - 数据挖掘 - 知乎](https://www.zhihu.com/question/41354392) ， 算是对XGBoost有一定的了解，清楚地知道每个参数的含义，调起参来（机器学习搬砖）一点不费力。

<strong>前两天稍微有空，一时兴起，参考XGBoost原理码了一个TGBoost，T</strong>iny implement of <strong>G</strong>radient <strong>B</strong>oosting tree，在一个40000样本的数据库上做了实验，精度上接近XGBoost，但是由于没有做太多工程上的优化，内存消耗较高，速度较慢。 当然TGBoost不是为了超过XGBoost（不可能也没必要）， 只是为了帮助大家更好地理解GBM特别是XGBoost，过一阵子有空了再写详细的文档（计划写GBDT原理，XGBoost原理，TGBoost实现）。

个人感觉TGBoost代码写得应该还是比较容易看懂的，特别是在理解了XGBoost原理之后。

TGBoost代码在这：

[wepe/tgboost](https://link.zhihu.com/?target=https%3A//github.com/wepe/tgboost)
