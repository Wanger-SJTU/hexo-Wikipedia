---
id: 0c9cbe4d-645c-425d-a916-d0da5626a782
---

# JamesAslan 的想法: 关于store-load消除 | 在本专栏太古的一篇文章里我曾经简单reverse并说明了苹果的处理器存在栈操作消除（我自己起的名字），<a href="https://zhuanlan.zhihu.com/p/595582920" data-insert-way="force" data-draft-node="inline" data-draft-type="text-link" class="internal" data-icon-type="link" data-original-url="https://zhuanlan.zhihu.com/p/595582920">苹果的黑魔法？Apple M1的栈操作消...</a> 当时文中提过一嘴x86两家做得更激进，以后详细probe了再写一篇文章。说来也巧，这次HPCA2024就有人帮干了哈：《Uncovering and Exploiting AMD Speculative Memory Access Predictors for Fun and Profit》，有兴趣的可以看看，肯定比我闲下来玩玩弄得细致得多得多。<br>AMD的话是在Zen3引入的这一机制，有什么作用的话可以自行体会一番(⊙v⊙) - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/https-www-zhihu-com-pin-1760674239508561920-native-1-scene-share-18ec3ba2b2b)
[Read Original](https://www.zhihu.com/pin/1760674239508561920?native=1&scene=share)



* [首页](https://www.zhihu.com/)
* [知乎知学堂](https://www.zhihu.com/education/learning)
* [发现](https://www.zhihu.com/explore)
* [等你来答](https://www.zhihu.com/question/waiting)

​

切换模式

登录/注册

[![JamesAslan](https://proxy-prod.omnivore-image-cache.app/0x0,sLxvfYAF29K_tUPoLDfO3DeKO1_PH5zOyyLCO7xay-E0/https://pic3.zhimg.com/50/v2-a4f04eb315b3d93d8b2b4717ebc7b6b2_l.jpg)](https://www.zhihu.com/people/jamesaslan)

[JamesAslan](https://www.zhihu.com/people/jamesaslan)

喜欢画画和摄影的硅工码农（滑稽）

关于store-load消除 | 在本专栏太古的一篇文章里我曾经简单reverse并说明了苹果的处理器存在栈操作消除（我自己起的名字），[苹果的黑魔法？Apple M1的栈操作消...](https://zhuanlan.zhihu.com/p/595582920) 当时文中提过一嘴x86两家做得更激进，以后详细probe了再写一篇文章。说来也巧，这次HPCA2024就有人帮干了哈：《Uncovering and Exploiting AMD Speculative Memory Access Predictors for Fun and Profit》，有兴趣的可以看看，肯定比我闲下来玩玩弄得细致得多得多。  
AMD的话是在Zen3引入的这一机制，有什么作用的话可以自行体会一番(⊙v⊙)

​19 人喜欢

​分享

​收藏​ 举报

写下你的评论...

8 条评论

默认

最新

[![JamesAslan](https://proxy-prod.omnivore-image-cache.app/0x0,srNRRbIruFWkHpq8sMj-2bkxbTSmovqTjxkFg4Ah2FFY/https://picx.zhimg.com/v2-a4f04eb315b3d93d8b2b4717ebc7b6b2_l.jpg?source=06d4cd63)](https://www.zhihu.com/people/4dec75daa89de36281eea2086c5deb73)

[JamesAslan](https://www.zhihu.com/people/4dec75daa89de36281eea2086c5deb73)

作者

[@Qianlong](http://www.zhihu.com/people/3a18660ac0844ef2612f1c5c3621477c)

![[可怜]](https://proxy-prod.omnivore-image-cache.app/0x0,sogefkIB7POraMxMZLRTxgZerGI5KJ-2u8pWDDVd5oA8/https://pic1.zhimg.com/v2-aa15ce4a2bfe1ca54c8bb6cc3ea6627b.png)

04-08 · IP 属地北京

​回复​喜欢

[![Kingfish404](https://proxy-prod.omnivore-image-cache.app/0x0,s_cqhBne2YP92dscGomgxsBDl0va6o9Ncx3ZqckWuEpo/https://picx.zhimg.com/v2-f645b9a6df22af375e78f790567dea11_l.jpg?source=06d4cd63)](https://www.zhihu.com/people/f8ae9c3fb4ced8ccb033276e28a61f2e)

[Kingfish404](https://www.zhihu.com/people/f8ae9c3fb4ced8ccb033276e28a61f2e)

[JamesAslan](https://www.zhihu.com/people/4dec75daa89de36281eea2086c5deb73)

这就去看看推测性前递，我们的工作应该和这个不相关

12 小时前 · IP 属地北京

​回复​喜欢

[![Kingfish404](https://proxy-prod.omnivore-image-cache.app/0x0,sFQ2XoM6J8Wk2_npcCU4xvAtSEx-bDe5If9hHj9l3YJ0/https://pic1.zhimg.com/v2-f645b9a6df22af375e78f790567dea11_l.jpg?source=06d4cd63)](https://www.zhihu.com/people/f8ae9c3fb4ced8ccb033276e28a61f2e)

[Kingfish404](https://www.zhihu.com/people/f8ae9c3fb4ced8ccb033276e28a61f2e)

zen2也有消歧呀，组里有同学在做呢

22 小时前 · IP 属地北京

​回复​喜欢

展开其他 3 条回复​

[![Freeman](https://proxy-prod.omnivore-image-cache.app/0x0,swNgRlqR2pxHrnMPMpF_3pqM94dq1IYBkz26NGqJ_Fx4/https://picx.zhimg.com/d91d4eb540f589780f37ca6cf434e85f_l.jpg?source=06d4cd63)](https://www.zhihu.com/people/e9b69b47a1f638bd9df726368866b7ea)

[Freeman](https://www.zhihu.com/people/e9b69b47a1f638bd9df726368866b7ea)

下载不了啊![[捂脸]](https://proxy-prod.omnivore-image-cache.app/0x0,s2vV3klXf3vprH4raEBnnzXOW3bKa7eTxEseG7iWuZos/https://pic1.zhimg.com/v2-b62e608e405aeb33cd52830218f561ea.png)

04-08 · IP 属地上海

​回复​喜欢

[![JamesAslan](https://proxy-prod.omnivore-image-cache.app/0x0,srNRRbIruFWkHpq8sMj-2bkxbTSmovqTjxkFg4Ah2FFY/https://picx.zhimg.com/v2-a4f04eb315b3d93d8b2b4717ebc7b6b2_l.jpg?source=06d4cd63)](https://www.zhihu.com/people/4dec75daa89de36281eea2086c5deb73)

[JamesAslan](https://www.zhihu.com/people/4dec75daa89de36281eea2086c5deb73)

作者

![[捂脸]](https://proxy-prod.omnivore-image-cache.app/0x0,s2vV3klXf3vprH4raEBnnzXOW3bKa7eTxEseG7iWuZos/https://pic1.zhimg.com/v2-b62e608e405aeb33cd52830218f561ea.png)只能八仙过海各显神通了，这些文章也是才上架

04-08 · IP 属地北京

​回复​喜欢

