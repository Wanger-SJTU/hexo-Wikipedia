---
title: "收藏转发，GPU、CPU、内存等150+游戏开发性能分析优化干货合集！"
date: "2023-10-23 00:00:00"
updated: "2023-10-23 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/收藏转发,GPU、CPU、内存等150-游戏开发性能分析优化干货合集/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/662926467"
---


*首发：[收藏转发，GPU、CPU、内存等150+游戏开发性能分析优化干货合集！](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/eeOXTHulGooYHz3G9Pdg2w)*

### 前面的话

大家好～承蒙厚爱，前面几次合集（见下方）很受大家欢迎，分享转发非常多，感谢大家一如既往的支持~

- [非广告！6年老号福利，描边、景深、泛光、投影等60+游戏后处理效果实现合集！](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247512555%26idx%3D1%26sn%3D8a98f83843a035ddc89b17e2cbeb6a1f%26chksm%3Df9010391ce768a87f4789be4c4b6e342a669edcadd33f14762535d67414341be1943368c6e69%26scene%3D21%23wechat_redirect)
- [收藏转发！原神、只狼、战神4等80+游戏渲染效果技术实现研究合集！免费！](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247511897%26idx%3D1%26sn%3D3f14b6405fe583a24f70169ae8863fd8%26chksm%3Df9011d23ce7694352cdbfe6b7fc45171410f7c2d4f1f3a0dc6745bd25e5b79137ee0cc191a30%26scene%3D21%23wechat_redirect)

- [Unity3D游戏开发中100+效果的实现和源码大全 - 收藏起来肯定用得着](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247487026%26idx%3D1%26sn%3D442efa67e68f323aaa2e2077f80ecce9%26chksm%3Df902bc48ce75355ed8fd99975c1964c3e38455ad6ba36086be7e8cb6ea2797e973b05cafda85%26scene%3D21%23wechat_redirect)

根据之前的计划，现在继续对我们6<strong>年多积累的技术干货文章进行收集归纳回顾总结，做成合集和文章，以便大家更好地阅读、收藏、分享和查阅。按照上次的投票结果，结合实际评估，今天给大家送上的合集是：[游戏开发性能分析和优化](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/mp/appmsgalbum%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26action%3Dgetalbum%26album_id%3D1792983677962911751%23wechat_redirect) ，欢迎大家继续收藏和点赞、分享~ 另外，特别感谢上次赞赏的朋友：</strong>DM<strong>、</strong>寂寞先生、F。**但赞赏确实没必要，之后的文章请大家莫要继续了，心意收到就好，感谢~话不多说，上干货！

### 渲染

- [对于NPR皮肤sss效果的低成本hack](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247501560%26idx%3D1%26sn%3D7a2ab89d33cf64e1e98b7584d46d4c05%26chksm%3Df9017482ce76fd943dc77144613fde1c70d08f5aea145ddf4f4ca1103f337cd7e1679c16ac33%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_429af6464d88.jpg)

- [浅谈Virtual Texture](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247487783%26idx%3D1%26sn%3D072441c6589f5eb8916dba8b343d0006%26chksm%3Df902a35dce752a4b708a7c0f0b87e2213cad9242742da3054288d5746d4a8598a5b8277f06ed%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_71d73dd7dd0e.jpg)

- [利用Stencil来优化局部后处理特效](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484107%26idx%3D1%26sn%3Dc2e062995d0ecc0cc832be714ab2dcf1%26chksm%3Df902b0b1ce7539a739f4fc1f929d56d2d46d7153fd28e64c8672ceeaf4b9fa9a38cf8d5f872e%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_f1f34421b87e.jpg)

- [Unity手游开发札记——使用Fast Shadow Receiver优化渲染效率](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484056%26idx%3D1%26sn%3D0a532bac113df5b06c7c9b4f3d3ad046%26chksm%3Df902b0e2ce7539f48f45918a37c235d5a714a65f2f9c6796ab05a49d0ae0db12343a8d04d7b0%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_df794109e4be.jpg)

- [游戏特效优化指南—贴图篇](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247497966%26idx%3D1%26sn%3D9d04aa83e86e4ab930ec7ae489276953%26chksm%3Df9014a94ce76c382c8fb0b85f5835ed196b15ed288a3955be7fdf9c681945db2affbd38043d9%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_e9b31f15405d.jpg)

- [光照最佳实践](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485628%26idx%3D1%26sn%3Dbf7f63cf7d08557839db6899b1e890c0%26chksm%3Df902bac6ce7533d0432a93e917ce295bed1878e264a18cbbafee86f2453d36bcf92db523a35c%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_2e7d30a2e7c0.jpg)

- [长阴影shadowmap精度优化](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247499796%26idx%3D1%26sn%3D5ab8d5c1504d6aa59c722250d12b9170%26chksm%3Df901726ece76fb7833df2fac621a3d672deee42e48279e305cb9b52089a991f04d24cc14bf8f%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c0fa9eb9293a.jpg)

- [SRP中水岸过度效果的性能优化](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247497796%26idx%3D2%26sn%3D43e4b03954be84085fab03cc6ccb945b%26chksm%3Df9014a3ece76c3284c671c6d0011aebf7430f0ca3babcb8f5416fd58f11936544a411314f330%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_f9f88b51cfa8.jpg)

- [常用渲染优化手段介绍](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247495642%26idx%3D1%26sn%3D4eaf7761bf4887aaf641b71d05fcc0f8%26chksm%3Df9015da0ce76d4b6192603cbd0e9c58cd01ec182a848b706dc4b6eb4f31234d77bb3dd8e5bc1%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_6396931b88cd.jpg)

- [理解Cluster Light Culling是什么？](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247494824%26idx%3D1%26sn%3D47375ef5a43f06bd155dcb055865ad88%26chksm%3Df9015ed2ce76d7c41b8bd69ccc7ab23a811635595ceeb2f32963434baeb38dac309a75ffdd9e%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_5d2811f7e9bd.jpg)

- [Unity大世界超多物体渲染---BatchRendererGroup](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247494263%26idx%3D1%26sn%3D1129b8f93a4df9856e0b3d155b7373db%26chksm%3Df901580dce76d11bc1c217ea3d479428430f368c87997fbb27fbb33ef031a59b4b5984086209%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_4ede89ffad69.jpg)

- [使用Unity 2018新特性深度优化渲染管线](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485456%26idx%3D1%26sn%3D575bc5f1244f6521744b04a3bdfccf1d%26chksm%3Df902ba6ace75337c20bfea64c1a505d30343173ca33da17b3195b3c4fa15259c4f40edb9dc43%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_64adac617bf2.jpg)

- [Render- 关于Unity渲染方面的优化（下）](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484652%26idx%3D1%26sn%3D1d800388bd01e2826370112a47aca1bc%26chksm%3Df902b696ce753f80354ecf7547a487db2d5e8d3885db0ffab04b7aef54a817c83b158fc6aa23%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_94557fa999a6.jpg)

- [移动端渲硬件特性提升游戏上限](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247505351%26idx%3D1%26sn%3D822769f1db1809277d29cb0aaaf962c7%26chksm%3Df90167bdce76eeaba6624985bfe84cac16443aa0d14bd44cb7aa9806643727a1ad0fcefc7f2d%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_65da600f0817.jpg)

- [基于clipmap的静态shadowmap](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247497462%26idx%3D1%26sn%3Df0178d08b063dcb33d65c60a1e27aab3%26chksm%3Df901448cce76cd9a633d21708c57483ad60dfc1332a5d0f6bfcdf2450b485e62cde6f2eff2ea%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_3dc4f2e1487c.jpg)

- [游戏中的阴影 ：基础](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247495888%26idx%3D1%26sn%3D7b607316216559f5730c9267232f9ec7%26chksm%3Df90142aace76cbbce527bd54d0c1c04b40226b23b629f077883358a473214a611d5695a90282%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a8eab41517b9.jpg)

- [植被透光性算法测量与实践](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247495321%26idx%3D1%26sn%3Dc408b1c8eadf87876516093024fb1db4%26chksm%3Df9015ce3ce76d5f5cf5c191ea572c8679f4e93207c3005d41778afee40b17b6672f64aeffae6%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_9c8761406508.jpg)

- [图形学研究：《荒野大镖客2》](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247494884%26idx%3D1%26sn%3D7cd21539c3129a2b5121faa221be7b29%26chksm%3Df9015e9ece76d788388ab4225159ed49e6c7a2487f41704e312a2d86579ba41bf081ef0af831%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_0b6c30bfc8c1.jpg)

- [光线追踪](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247494691%26idx%3D1%26sn%3D982973d1639357f20e077c11bc11005d%26chksm%3Df9015e59ce76d74f7902fd35db19fdb7c47c7cfd0ee4a7031835ecdecf03c76cf5dfc886efc0%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_acb7019ccc7f.jpg)

- [卡通附魔描边效果](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247494102%26idx%3D1%26sn%3D865230f57597ddf9d64a3ca9dea5d1dc%26chksm%3Df9015bacce76d2bac5e810ac34263a904242b298e0ef21fd7e73cdca38bbdca476c48c025d76%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_020d7632be46.jpg)

- [游戏引擎中的渲染管线](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247486419%26idx%3D1%26sn%3D0455f6343a5611266a00c02c2f5eb6fc%26chksm%3Df902b9a9ce7530bf68893f10e183423decd1bb03f59b16162d5225d4dd27c0f4fab56198b175%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_d0eb6cdafe80.jpg)

- [Unity可编程渲染管线（SRP）教程：一、自定义管线](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247486111%26idx%3D1%26sn%3D3bbe0251cd8b4bb54b909185db60aa43%26chksm%3Df902b8e5ce7531f3b5dc687d9dcefb91330a4121835194a6e42dc6b8f7a0b61588caeb7f3890%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_4fe6e79eb5bd.jpg)

- [Unity SRP教程（翻译自Catlike Coding）一、自定义管线](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485954%26idx%3D2%26sn%3D2ec9dec32a18961a5cb8060fcc5f59e6%26chksm%3Df902b878ce75316e50c65422eab04099c48719205f01b7a20781e66c906da4e383cbee880eab%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_1fdf503f69db.jpg)

- [Unity3D水特效之雨天模拟](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485389%26idx%3D1%26sn%3Db5827fdcc754d402d498425578134cfe%26chksm%3Df902b5b7ce753ca1870616441382690a61119324cf8af6eff636cd09c2705028cf5d4e68512b%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_1d93e4db0495.jpg)

- [漫谈Unity渲染管线的流程化设计](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484888%26idx%3D1%26sn%3Dd7c209be98f849bac6bc2fc3e0eca1db%26chksm%3Df902b7a2ce753eb4e84fb6376866ccaeea20ec28ac48110921a14dff7cec7b6850e6dd142785%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_404292623512.jpg)

- [Render- 关于Unity渲染方面的优化（上）](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484646%26idx%3D1%26sn%3Df429b9fa5eda8487b6db9d9a0c8a6127%26chksm%3Df902b69cce753f8abed905cf345749805f044a75413624cfcb5c88275d84aa4cf10e44cf2eb9%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_44f738a437c5.jpg)

- [【Unity】粒子特效优化实践](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484330%26idx%3D1%26sn%3Df8c20f50fd91be2c64068fa9fa3c10c5%26chksm%3Df902b1d0ce7538c634544aa3a466f62c1fe4db9039b873ba92c8d4adcfccff8a55bbeffa1663%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_448785e51b86.jpg)

- [Real-Time Rendering 3rd提炼总结(12) 渲染管线优化方法论：从瓶颈定位到优化策略](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484119%26idx%3D1%26sn%3Da25fbc15bf169f994d04e2bde0f8b8a8%26chksm%3Df902b0adce7539bb94593a1833e45db068119dc8cd1cbe3b779aa97bd98601da43573be7375c%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_6484bf9c1cd6.jpg)

- [浅谈后处理技术中的各种坑](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484061%26idx%3D1%26sn%3D662360ca75c941c1594410c2635bf44e%26chksm%3Df902b0e7ce7539f18d4f067e51738c07c3f6e80066882990bb4ee118d61f7e8b343525587b10%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_1149251f270b.jpg)

- [【《Real-Time Rendering 3rd》 提炼总结】(七) 第七章续 · 延迟渲染的前生今世](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247483864%26idx%3D1%26sn%3Df09335c7ebb890c846b9f6d088578e69%26chksm%3Df902b3a2ce753ab4b03a3b1a6d2b9cffa60db3c9d59bd6f14a649ca5814f0faa6a8da8a06c29%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_fa1f4c07b513.jpg)

- [Unity粒子系统去GameObject化](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247499291%26idx%3D1%26sn%3D8bdb7ea58ba13c152dd5226f39615b06%26chksm%3Df9014c61ce76c5777a8257e1b7d65b80508e6a9a433e44e81b9a712d4993d99b9c2eec6cda19%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_8b00a594b6b6.jpg)

- [Unity下大量物体同屏渲染的性能优化思路](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247486797%26idx%3D1%26sn%3D9318d08a438cd5039d53812a7a692404%26chksm%3Df902bf37ce753621ef5f6dfd032f762bdaa21f1e1ae48b9564639728456c0ec936b87120e630%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_41bcd288a39c.jpg)

- [Unity 特效性能分析工具](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485859%26idx%3D1%26sn%3D7580549c68eee09ff310c00bb6e6568b%26chksm%3Df902bbd9ce7532cf736a2b096bb5d44356287f92dd170ff2377804a1cf420ce3cadb3050b507%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_bf4ab4d6daf0.jpg)

### 物理动画

- [Unity Animation优化](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247500440%26idx%3D2%26sn%3D4f1c88af18e3d68a475fca08b490ba57%26chksm%3Df90170e2ce76f9f40b582e458cddd691bafa20825559aed15208133655e4d73abbdde99de8d1%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_5669e74acf8b.jpg)

- [让顶点动画的性能更上一层楼](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247504727%26idx%3D2%26sn%3D5ff81a573f151c6cd58023fd708e0ef4%26chksm%3Df901612dce76e83b8c097b9e10b1c566b9d47aedb88588d6e5d49b866164a29ed80ef69e2107%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_acf17aef93c0.jpg)

- [动态骨骼Dynamic Bone优化](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485045%26idx%3D1%26sn%3D76bca666228de3a03c5c9356988c5d7e%26chksm%3Df902b40fce753d191cfd153ac92d5a57b96050c40cc04d36a02cdfdbe3de60f468424da49ad9%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_684502c6e536.jpg)

- [Gears of War 4中的高性能动画技术](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247494173%26idx%3D1%26sn%3D38e94458bc9be753a1945839e9c41700%26chksm%3Df9015867ce76d1711b02d72366d6922a7310ee42dada9fed86eb1b2c71567f924835919273bc%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_744de776c93d.jpg)

- [Unity-针对DynamicBone插件的迭代来实现布料模拟](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484207%26idx%3D1%26sn%3D1f87a588a9b2bc65807f2c14ec8c783f%26chksm%3Df902b155ce753843ca6fa4f9bb0872de92ecb4a20b7e294262857151c57058b4eb3a4e673d02%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_1ef6a5a2bc50.jpg)

- [Unity3D 骨骼动画原理学习笔记](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247483890%26idx%3D1%26sn%3D55b45ff00f62e20dd8493ad937ef2a93%26chksm%3Df902b388ce753a9ee3c852d8a1aeb1a86299d62c3a26a3a91c86271106d3ae8b74ee795b225b%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_2961762fca81.jpg)

### 遮挡剔除

- [UE预计算遮挡剔除（PVS）全解析](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247504577%26idx%3D1%26sn%3D8a4b33365f668fad0209e697b8bffe2d%26chksm%3Df90160bbce76e9ad29047fe6c42742c9c126fd32ee2cd96839bd04e8c3b38c3fd0bcf76e0b95%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_51ca96b21f10.jpg)

- [遮挡剔除的主流方案](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247500479%26idx%3D1%26sn%3Ddb938844a1f7e18bac8df47ccc05cba5%26chksm%3Df90170c5ce76f9d323087a0c3acc8d0c280c1f11d095bf8b910d2a50b35620a586d9f8d82406%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_4981ffdbe500.jpg)

- [图形学 遮挡剔除算法综述](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484079%26idx%3D1%26sn%3Dd9431b19940f50230beff8eed728b83a%26chksm%3Df902b0d5ce7539c35f57cd8bd3a9cd033c4ba2f3c6c67c7a1be9c6d52161d3c03f9118118965%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a9a86ca7bda0.jpg)

- [游戏中遮挡剔除方案总结](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485167%26idx%3D1%26sn%3D74870f303b9b77a97c1d3d03e0066028%26chksm%3Df902b495ce753d83c49f73691e94d8e772964f1946ad9f0dbc419e3006ba0fe7225fe41dd088%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_f708979fb219.jpg)

- [剔除：从软件到硬件](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485616%26idx%3D2%26sn%3D4954685ffde02c2f4a3b4a62f867e1c1%26chksm%3Df902bacace7533dc72dc39337fd0e42495ecd4056cc44f1a20790a6e7f96e0742517d7ccc416%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c26918e4aa42.jpg)

### 压缩

- [Shader内实现四叉树压缩贴图](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247506871%26idx%3D1%26sn%3Dfadbc1406a9920103019c55e419667e9%26chksm%3Df90169cdce76e0db1910c40d9869af2b451ff908b61d195356e9a7f017df629dd02706b5c8c6%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_6e1f312a6f7a.jpg)

- [你所需要了解的几种纹理压缩格式原理](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247501216%26idx%3D1%26sn%3D95fe46dc0f11ddaace83439ca8918d70%26chksm%3Df90177dace76feccf71573a828b17dbfff665e441c7021b43c7f84df5a3c609eca9cdb6e83da%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_d5902de4668e.jpg)

- [一种图块重排的无损纹理压缩](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247499732%26idx%3D2%26sn%3Def5b0a2082572030e171a57de9b65eed%26chksm%3Df9014daece76c4b86d7265e1ca84be4aafa46187abd0afdee924464dbe83c54f92f1a5a45ae0%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_614c33c7bfbc.jpg)

- [Unity使用ComputeShader实时压缩RT](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247495784%26idx%3D1%26sn%3D583ac21240c9ede1d34d1393400bf31f%26chksm%3Df9014212ce76cb04047dd51b91f3fb108513804b5e91a34fc5993c8c868dadc6ceb3384484f9%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_0b704202d5ca.jpg)

- [八叉树颜色压缩图解以及c++实现](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247494847%26idx%3D1%26sn%3D839a1dc699e748bec21d592294e47896%26chksm%3Df9015ec5ce76d7d3d53e5837f5327c1effd5062c63a33f293bccd9bc8d52a1595706cce0f047%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_acba958b7736.jpg)

- [光照探针的一种压缩方案](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247493445%26idx%3D2%26sn%3D9d1af3af95d6c76ad52f1b2ad39ac2b7%26chksm%3Df901553fce76dc29261822a839623e84678c3f4190d414583c00e9bdc15c75e2a4fc31deb0d4%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_35594b58fcc4.jpg)

- [法线贴图的压缩格式比较](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485899%26idx%3D2%26sn%3D1e83a7fff2b9e2114a6071c026df82dd%26chksm%3Df902bbb1ce7532a7f6e866d6f329c31014a2e1716efa3486e13acee58ecf6e47c8857ff0d41f%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_3393c50b62db.jpg)

- [[Unity3D]关于U3D贴图格式压缩](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247483899%26idx%3D1%26sn%3Db44e61375d0cdb36f49f05b81398883f%26chksm%3Df902b381ce753a97258fcd067f935b4b088a3a5a07c5caf1349b1c2c1a195040a37a2b6af0b3%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_03381592910b.jpg)

- [常用纹理和纹理压缩格式](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247483727%26idx%3D3%26sn%3Dd2b3321255d33bb4c62d6e21e46e34a0%26chksm%3Df902b335ce753a23c716fa0d3d78c615b450c70502c0f62617414826c82ef7f09c3a6902af5f%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_91caa37a0585.jpg)

- [移动平台纹理压缩知识总结](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485327%26idx%3D1%26sn%3D3afa48a741ed1cdd3a9fa98fe62129a8%26chksm%3Df902b5f5ce753ce30a16b5c23bda81f1485926f0c3cd52510ba004b1e3d17fafbc1379de5d9e%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_fbd6994b62f1.jpg)

- [Unity游戏开发图片纹理压缩方案](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484933%26idx%3D1%26sn%3Dbb2e679472cc595522da0fb855023b0b%26chksm%3Df902b47fce753d69ce147752e7aff47d221aa5bc3cb6d1aa86b17fba2d8454881420e6a8178f%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_260a065d8189.jpg)

- [图像压缩原理](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484041%26idx%3D1%26sn%3Dc0f2df9560cd9bdc7a12f11c08557c1c%26chksm%3Df902b0f3ce7539e5a1cd69268000d7490bf09ff802289e50cb556920cc9d2a167eff98af9821%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a211f7df13cd.jpg)

- [Spine的纹理压缩和半透显示](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247486054%26idx%3D1%26sn%3Dbcc277e0d4e339adc48e9fc4f896f83c%26chksm%3Df902b81cce75310a3069608b5a7dd36b6baed59be08e817d07572990151b94e43597a40c640d%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_b2905213de43.jpg)

### 网络

- [TCP与UDP差异对比分析](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247483978%26idx%3D1%26sn%3D7bc3580c3ecba01d9f3ff4ab7ba275e5%26chksm%3Df902b030ce753926a36c18995c72d37cb0d02551f74c7aec8121d0c4570afb29ea0e8017cd2f%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_f4a122d87638.jpg)

### 贴图

- [Mipmap详解(有无Mipmap区别、原理、优点、缺点、优化)](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247501289%26idx%3D1%26sn%3Dafa80850ef12cc84ea67ebd3ef1a4744%26chksm%3Df9017793ce76fe85a360fdb2d54c90df12b5ad05f979c44f2cb2bc12162fa1efe3c4ba324fa3%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_88ce24fa1967.jpg)

- [大地形的一种简化RVT](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247504342%26idx%3D1%26sn%3Dc82c9bcb9634fbdd44f69e7452ffca40%26chksm%3Df90163acce76eaba45cab95d1d89d3463e385ce02e29f07dfb5c3edc0ce25088ac0f307b8b80%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_9dc1f9a5b5d4.jpg)

### 算法

- [大世界稀疏八叉树GI](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247504659%26idx%3D1%26sn%3D5420a08613ff92067d17cbbea0dbd093%26chksm%3Df9016169ce76e87facce66e05e1ddac7948096fac6e76dd5afb798c5269906983efa51984c05%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c6aaa231ca0e.jpg)

- [递归与循环的效率迷思](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485794%26idx%3D2%26sn%3Dcb5daa5b40169dfaa54179077ef01e7f%26chksm%3Df902bb18ce75320e7a7108c57736a94323db510de8bbdcde73c9b4fefdccb1fb44ccaecfcd2e%26scene%3D21%23wechat_redirect)

http://weixin.qq.com/r/wyrZwebEULsvraKi93-R (二维码自动识别)

- [空间划分的数据结构(网格/四叉树/八叉树/BSP树/k-d树/BVH/自定义划分)](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485616%26idx%3D1%26sn%3Dc8f8076bbc3d420ff37c01fbdc7e1725%26chksm%3Df902bacace7533dce9d6ffe6708345430a257c8a08d6eb5599e294a8089bfd1e85b2f52c5011%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_9ef8e018825e.jpg)

- [树形结构效率对比](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247487874%26idx%3D1%26sn%3D1404d03763ce66784fcb5b98bda9ed24%26chksm%3Df902a3f8ce752aeeeab7c8bfe86c5365637619ffb74c68778d70569d237874e16c1508c82c05%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_2bbaeb612e59.jpg)

- [大规模单位实时游戏寻路的构建](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485362%26idx%3D1%26sn%3D66d362c536612221b0ce9f65b236cf1b%26chksm%3Df902b5c8ce753cde45d31436da81cc662b864685a13cb4d8b0a56e23abe8710dc97886899f1a%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c7740a6f5168.jpg)

- [游戏与常用的五大算法---上篇](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484287%26idx%3D1%26sn%3D667d8b0e2f7fa0d7eff74cea154524b7%26chksm%3Df902b105ce7538131e1ba7ecf67d386f09533959fc96c62906e2f8044791cef09db1c53d2af6%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_b7d7edfd0689.jpg)

- [算法与数据结构中的位运算](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484151%26idx%3D1%26sn%3Df446833e2f4773ce1d3f73d81089cfb3%26chksm%3Df902b08dce75399b636bd27dee870dce8e774a2c2e0d2a9a11eb508aa8e5cf5da01354f4319f%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_0528281b070e.jpg)

### 内存

- [详解Unity Profiler内存分析问题](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247486363%26idx%3D1%26sn%3D6579e18f7351ef0bd206c7ee7e25b972%26chksm%3Df902b9e1ce7530f71e8c22944efb5923a499474f54bf63ccee1fb170aa57a88acea372b7661a%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_621d56265c97.jpg)

- [lua内存泄漏检测工具原理及设计](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484998%26idx%3D1%26sn%3D9bd0da257dc1c6a9a7640c129c1df8c4%26chksm%3Df902b43cce753d2a7e8b700bd799f7358ed723d68388007986e8751d26f614121300076bb0a7%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c687e07e69d4.jpg)

- [JSBinding + SharpKit / 原理篇：内存管理与垃圾回收](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247483957%26idx%3D2%26sn%3De6f8c8366d273870ecf5937e95aacf38%26chksm%3Df902b04fce753959cb2787725ede3350255b682116c58a65863786855afcf2dbd0ad0234c72f%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_163ded815fa1.jpg)

- [Unity3D 的大场景内存优化](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247483832%26idx%3D1%26sn%3D7d337a30cecedc3bddafeaaa477c0aa5%26chksm%3Df902b3c2ce753ad4fee53bff4339070f04e81b149f84f55c6b375450175c7133106604eb76ae%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_148122089686.jpg)

- [Unity网格内存优化（MeshStreaming）](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247506589%26idx%3D1%26sn%3D815b81be78397864be7dc5b5f1c949c8%26chksm%3Df90168e7ce76e1f184ec4c519e0266d6e4d9b64ced5f87761701d5fd2ec2aacb903b325a28dc%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_6e141145fe3e.jpg)

- [UE4 内存收集记录统计分析原理浅析](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247499146%26idx%3D4%26sn%3De745a273120815d356563915d8e461e5%26chksm%3Df9014ff0ce76c6e683ea730bb0162da2cea881740dafda05b94b7c358544e6fd560db6bd0551%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_701333d0f17b.jpg)

- [了解一下 Unity 自动内存管理](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485764%26idx%3D2%26sn%3D41f193583730d24e8dc51618263bdfaa%26chksm%3Df902bb3ece753228cc716a31bf53c46c10d3a837f4c01b2a82f0c5420d8ae00aaba15f1a5a16%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_fc9ee88d243b.jpg)

- [C++手写内存池](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247498068%26idx%3D2%26sn%3Dacfbcc2cb658489f905ae3664d253b03%26chksm%3Df9014b2ece76c238133e6ba1cf25ea63508c932fe193bf6ce8929293fb1e499340defb2c1e27%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_60ce2042e76c.jpg)

- [[笔记]关于Unity Mono内存优化的工具](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247486809%26idx%3D1%26sn%3D081f4fe38ccb21df2daa340c42ebd740%26chksm%3Df902bf23ce753635c7661d5f7cf124cc9c67191102f83e1d1edd72a855671a1b1f8f6bd79317%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a18ef8437371.jpg)

- [LuaProfiler：Lua内存优化工具教程](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485269%26idx%3D1%26sn%3D42896fe29e21302834049d92e69a15d2%26chksm%3Df902b52fce753c39198d426f9282dbb1db1303772e44a9d79006adfe594fb256a7aadb56b264%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_9867a0a5c433.jpg)

- [Unity移动平台内存限制相关-PSS/RSS/USS](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484303%26idx%3D1%26sn%3D027af3f40b2e7437f991054cb3f6ee2f%26chksm%3Df902b1f5ce7538e34aa6271746ace5aa317538f5d0c149fad3147e7cddd362039c571e1486a6%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_0f122d0a3810.jpg)

### 加卸载

- [[UE4]资源异步加载(Assets Asynchronous Loading)与内存释放(Free Memory)](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247497145%26idx%3D2%26sn%3D6557d2101c821ade66220b72e78f1832%26chksm%3Df90147c3ce76ced51bdde0e6f388b1040a9fc41710af2c800fcfa8d366b07fdafc2c48575764%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_108110a87998.jpg)

- [Unity开发实战探讨-资源的加载释放最佳策略](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485653%26idx%3D2%26sn%3Dad53a8b26efb09f90f523215cc767288%26chksm%3Df902baafce7533b962c1412263dffc1409b4271772e533edcaafedaca4839c8835bda1777401%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_7adc9ec17c50.jpg)

- [Unity手游开发札记-2.5D大世界动态加载实战](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484086%26idx%3D1%26sn%3D3116d6153c3b26dcccd9baf3cbdfcd14%26chksm%3Df902b0ccce7539dab05a0aad606855e045fadc648ee86bff5d7c041044613c2f4b696d2c8660%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_95d7dd4271f8.jpg)

### 分析

- [基于 VS Debug 的 UE4 打包问题调查方案](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247503527%26idx%3D2%26sn%3D312d308ca3e46236fa5e2c73ffa148ac%26chksm%3Df9017cddce76f5cbaa7ca7fcd3c9a8ee0b9234a8f3e298ad88cda9885d484495594145be9d0e%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_05c266835092.jpg)

- [性能分析工具的原理探究](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247499090%26idx%3D3%26sn%3D4c4c28dcf15204b35d58e4c2e9d8fe5a%26chksm%3Df9014f28ce76c63e144b7224aa0391304ba4b6013b4d5bb1a86d5ae9a7c84f21b4be1ca990ff%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_33f7160f8855.jpg)

- [UE4 Profiler 性能分析工具原理和实现机制](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247499089%26idx%3D1%26sn%3D8f267f520e0b07ef558aec4c6f8a9d92%26chksm%3Df9014f2bce76c63d68bbbfd79270a2ff56bc7023852faed2494039f291651d0a8d3d60407175%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_5b7388d9fee2.jpg)

- [CPU性能分析工具原理](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247498689%26idx%3D3%26sn%3Dc719a096ea9ccc4add2bc138d1b51faa%26chksm%3Df90149bbce76c0ad5cf9d6bf769761012eebfc5cc31b309997212ee77eace8269a5204be3189%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_84a8586d3cd9.jpg)

- [Profiling 与性能优化总结](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247497944%26idx%3D2%26sn%3Dd94b5ce2e1972b79e243cad57f652230%26chksm%3Df9014aa2ce76c3b4ab95cef424b0cd8aa75583d478b10ee58e62def8b17ac2e6f3f7cbe0410f%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_cd8637ef1937.jpg)

- [Performance and Profiling（UE4优化）](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247497797%26idx%3D1%26sn%3D1fdc05b932f580a34054cbb0342ce2b1%26chksm%3Df9014a3fce76c329e6b90ab7ebb66040f208bbf7325b177796d286e6fd72e378387f4067aa5d%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_fbeb598f0183.jpg)

- [当我们谈优化时，我们谈些什么](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485689%26idx%3D1%26sn%3D85183aa3db0f7cea68d1749c58055338%26chksm%3Df902ba83ce753395c476f15cc6124d5d08ef8a6e9a0888c290bf5c3016c307d7a94b01bf256c%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_d5a3857bb1eb.jpg)

- [喵的Unity游戏开发之路 - 帧每秒：性能衡量](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247492200%26idx%3D1%26sn%3D32aefa7c8a8e2df025933467e5caf838%26chksm%3Df9015012ce76d904b488d7851c2f9b1bf032d8f59aaaf1d3948e99d71f2980f1275f8dc372c6%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_5c639fd61244.jpg)

- [Unity性能优化 – 设置篇](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485639%26idx%3D1%26sn%3Da4b2271a35983be3f83b4bc48f33fc30%26chksm%3Df902babdce7533abc987f5b24bd3a54c6c5444f84c669ce854b025be2804797623f196f9ba2e%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_e846c18dd135.jpg)

- [利用 Profiler(性能分析器)查看游戏在移动真机上的性能消耗数据](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484278%26idx%3D1%26sn%3D2d673b2e2c06d0733afa77a7cd14703a%26chksm%3Df902b10cce75381a09864a1bf9b20ee16fccbd23960d1fc42669c87e1dbbcad83bb4fb7347ab%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_aeebce1f83ae.jpg)

- [游戏性能优化（2）-budget （性能预算）](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484270%26idx%3D1%26sn%3D7e7bbb3de99e30186812cd32cf8cde64%26chksm%3Df902b114ce753802cd9e060ec3adfd7d55208b646afef1026252d44e5cc7f01fbc59a75c2adc%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_7a86ae2426e6.jpg)

- [游戏性能优化（1）-why & benchmark](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484267%26idx%3D1%26sn%3Da55207f0b264be8e0dcb355d22e311cd%26chksm%3Df902b111ce753807ef0f7ba1f520130d25f5b9e84d1b64700e42569839aaaff2e10a3da1ed23%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_b7f7e65acb57.jpg)

### 代码

- [什么是编译器优化？有哪些常见的编译器优化类代码优化技术？逐个举例说明](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247507173%26idx%3D3%26sn%3Df3584d38c07dd61c8ea3cdc808804162%26chksm%3Df9016e9fce76e789cfea24194583524bfc69850e40196787486baeac0860f743f7411be47f85%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_9fc27fd0bd27.jpg)

- [C#规范整理·多线程\异步\并行\任务](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485757%26idx%3D1%26sn%3D31935732ed42b69d5e44c2b499b05b59%26chksm%3Df902bb47ce7532518b2a6c71f19332351a4f05ca40d93a241b520da75c41bcf2a85a8b850a53%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a55f915e8e6c.jpg)

- [作为Unity3D的脚本而言，c#中for是否真的比foreach效率更高？](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484565%26idx%3D1%26sn%3Ddf4bf1e938feb5069d9d2b385559ed49%26chksm%3Df902b6efce753ff9c243cb5a48303012f15abaf4b0138c0032966f4eda846a7485883519d308%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_bcb06fe91da8.jpg)

- [C#的字符串优化-String.Intern、IsInterned](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247483983%26idx%3D2%26sn%3D897c3acb4640a05e4db0f0748528aebc%26chksm%3Df902b035ce753923b6254966c06d97c79606398f8044343219b3ec1bac87531833fb3ce7d977%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ac01b6ffd817.jpg)

- [什么是编译器优化？有哪些常见的编译器优化类代码优化技术？逐个举例说明](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247507267%26idx%3D3%26sn%3D1a1017870c3b505d9fcdf4e70e7c6514%26chksm%3Df9016f39ce76e62f355ca82998e7c20d97781e6da45109841faae5c4bb1761d465add0754498%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c5fb6815c190.jpg)

- [为什么多数游戏服务端是用 C++ 来写呢，是历史原因还是性能方面的考虑？](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485356%26idx%3D1%26sn%3D0e1f56b5696693155ebf93d36502bb3a%26chksm%3Df902b5d6ce753cc01da4abe2d3a4976f28d132ac1accd3b1dd44a472b7a2766a536b68083d40%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c270275d92e7.jpg)

- [理解Unity中的优化之字符串和文本](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485193%26idx%3D1%26sn%3D71f11c926de16a0135dd92abf2738237%26chksm%3Df902b573ce753c6585e1ed35e80b3817e4b243657fb3cd9a227ff7da1d9f941e77c52f2bec7a%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c1656cbe8b52.jpg)

- [腾讯研发类笔试面试试题及答案（C++方向）](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247495688%26idx%3D1%26sn%3D21c5b089e84078a34cd8d186e7cf7065%26chksm%3Df9014272ce76cb64b347afb8bc17e96922ef785de57f55a9a41111015d498767a3e8d1db3e2a%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_e991f7473bfc.jpg)

- [深入Lua：Table的实现](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247495213%26idx%3D1%26sn%3Dae1036721c55e45eecd58f118f37ddbd%26chksm%3Df9015c57ce76d5419904fafe939b04bb7e7de28dea674115650e71cc868f7b32dd4b7238c295%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_2b2dfca3fcd0.jpg)

- [10个用于C＃.NET开发的基本调试工具](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247486684%26idx%3D1%26sn%3De5ba678b024859fed1094b47271a0971%26chksm%3Df902bea6ce7537b0eeca5d18554698e761ff8f4df87bf3802272d7c6bdb9079eca038f72ccb9%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a773be1f272f.jpg)

- [接口默认方法的底层实现(翻译)](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247486671%26idx%3D1%26sn%3D3816dcc5cb2c74f06a9526c11ae8f0fb%26chksm%3Df902beb5ce7537a369e715253f08160a848ad734fb17f2071c192846fd8f1a246985f2cd3dcb%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_1062d641ba5b.jpg)

- [C# 异步编程](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247486513%26idx%3D1%26sn%3D2892d2dddcd43af71e70d896abde5c54%26chksm%3Df902be4bce75375d1c55817723301bd37a0a15962add279e584f8008b62dd06237463ccf210d%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ff316df3b879.jpg)

- [游戏引擎底层：Task系统](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247499796%26idx%3D2%26sn%3D99357c5f0c4664f00b2f89e98c4aff6c%26chksm%3Df901726ece76fb788ee5bea667553eb6a552600e92131b1345d7f31c4bbc5f9201c9079475ec%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_2065da7c13db.jpg)

- [C++ 标准库的各种容器的性能考虑](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247499590%26idx%3D3%26sn%3De4987f81aa522812332629bc6c380c20%26chksm%3Df9014d3cce76c42adf1e7860f66c217f2de987a6c2a1a5dfbbb64eea7bfdd65343c83cd0a91a%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c5fb6815c190.jpg)

- [C#跟Lua如何超高性能传递数据](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485836%26idx%3D2%26sn%3Dd0d3702376b2567de21f11d9688f033e%26chksm%3Df902bbf6ce7532e0b3e24ce316c68aba225301e108de337e30af92e4df758ba499ac1ba493c4%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_8f5daeecf362.jpg)

### 场景

- [Unity3D游戏场景优化之批处理](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484758%26idx%3D1%26sn%3D804177d867a5d47d715fbdf7b771ba89%26chksm%3Df902b72cce753e3a1b63af9788659fc8faca25364af8836228eb511e0a72c9d84e4bd39f28ca%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_41c9e08690d5.jpg)

### 编辑器

- [Unity分析Import耗时](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247495182%26idx%3D1%26sn%3D56e9b17f1dadf0b4989127028c1fe4b6%26chksm%3Df9015c74ce76d562108ca58dc40bef30891f425919aab0afff2bffc340d03ec549e0589ab44c%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a30c5c938282.jpg)

- [Unity3D 效率优化: 使用Asset Graph来构建资源工作流](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247497362%26idx%3D1%26sn%3D5c048a1cf6727168216741c1efdb9197%26chksm%3Df90144e8ce76cdfe75aa0f9bcbed174b403dbd4552f9c2bb089257d0e25e7812641ff7f22ace%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ec0b8bf0d717.jpg)

- [[Unite Talk]让INSIDE实现稳定60帧的工具，技巧和技术](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247510019%26idx%3D1%26sn%3D0232af8195bf91b1b9dad7a958241409%26chksm%3Df9011a79ce76936f6ceee7d0c38c806d26cca1a8dff971b6946f9ddc09fbaca32a58346d6944%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_bc49488916b3.jpg)

- [Unity手游开发札记——从Odin插件聊基于元数据的编辑器实现](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485784%26idx%3D1%26sn%3D586a4bb3f856f86eff3e3e8819586df1%26chksm%3Df902bb22ce753234b03bc08154131c4c86012c95fc525de7ecdc162d5ec54983522be24a3125%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_990a393889d9.jpg)

- [Unity项目中资源管理（续）](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484562%26idx%3D1%26sn%3D9c42021d6123914c8b30e7f37b12b7d4%26chksm%3Df902b6e8ce753ffedce141b568be1ec90cdf16559cf2231da463fe9e7bbbf1e58b6dc84249b2%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_0580ec85bdda.jpg)

### UI

- [NGUI战斗飘字及界面优化](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484835%26idx%3D1%26sn%3D26da276fde28a986a852db8b6f05ff2f%26chksm%3Df902b7d9ce753ecf74204c99e00287fe348bd1bb2241d1b5e5d296c2eb0f97ddf7f0447c860f%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_63cd6197b5bb.jpg)

- [Unity3d HUD UI高性能方案](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247507267%26idx%3D1%26sn%3D3df440f2a25c831b9f53722e448dc744%26chksm%3Df9016f39ce76e62f723dcd5c196df49772ca107389e56635b135e954f6aaaf4c776b8098c429%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_e106f16da910.jpg)

- [谁动了我的UI 批处理？！Unity UI优化](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247486360%26idx%3D2%26sn%3Dec41d2ea857307ff2537278282f27452%26chksm%3Df902b9e2ce7530f44f25108f48970963d0886869ffa754db1fd0e5bdf7e9fc3b8226afd4eebd%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_9b41c520a8cb.jpg)

- [NGUI开发优化技巧（下）](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484479%26idx%3D1%26sn%3D3af6ea1cad7d3af4beb55f3ad352a06e%26chksm%3Df902b645ce753f532aa76055d77707894ad8224a2a933c77bb231b8ec3616c5573a2a7b5a426%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_63900df51d57.jpg)

- [NGUI开发优化技巧（上）](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484476%26idx%3D1%26sn%3D4f98fd6f5738c0d7855eb613fa3faaee%26chksm%3Df902b646ce753f50fdf9e9826ccc65e91473297e61b2063018e7bbaea0811af4a6d49fcb0d3a%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_d6d044d61219.jpg)

- [TMP(TextMeshPro)优化篇 — 描边投影效果](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247498812%26idx%3D4%26sn%3Dbcbefe22815a038b974c322729e271b7%26chksm%3Df9014e46ce76c75096ac8fe7ff8ed32526dc5b741a0ded41d25386822fd2db97e205c928f5c7%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_69a357138a36.jpg)

- [Unity+NGUI性能优化方法总结](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484811%26idx%3D1%26sn%3D695b3b4f502aa1ad4941546c3bae1a97%26chksm%3Df902b7f1ce753ee7c3c9157ef71548c846a73278d8a44c42496693564b13e966ed232abe12ad%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_17d3c940973c.jpg)

### shader

- [Shader中为什么尽量不要写除法和逻辑判断](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247495356%26idx%3D1%26sn%3D733ed9b5c665858360d85a71499ca989%26chksm%3Df9015cc6ce76d5d0e68f22a584852fbf5c01a44f774e34427ebfbe7020fbc89346f6c99a8668%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_31c2d74635b5.jpg)

- [Shader优化--耗时数学函数的快速计算方式汇总](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247486838%26idx%3D1%26sn%3Db8f43a14970c69a854e47b7cb48a1846%26chksm%3Df902bf0cce75361a8b9d1d76f28e866b16d980b69688081aa37257dee46ac7d79cb1b0557257%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_4b1ad0ce8887.jpg)

- [Shader中if和for的效率问题以及使用策略](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484145%26idx%3D1%26sn%3D4628d4018a6a3787803e708195653665%26chksm%3Df902b08bce75399d00dcd7be7c2075d4b7c9f12685e8185feac7f61fdfc9b4fb214a60370c3f%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_886488d6ce97.jpg)

- [Shader中的if分支优化tips](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247503627%26idx%3D2%26sn%3D1e7b823e9edb3831df786297bb67b40e%26chksm%3Df9017d71ce76f467f13c66e0ab966ea38d4cb29c593abbf56709565c8e2369e3c2799b0a5073%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_77b8aaef7a3f.jpg)

- [Unity3D我目前采用的Shader优化方案](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247501616%26idx%3D1%26sn%3D6a88ebded428d7f9a19d87d0398691b8%26chksm%3Df901754ace76fc5cdef4e40e8eb2d306c516348c6d916e8724a6eba333bee067687b07e2564e%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_e824d37dc714.jpg)

- [虚幻4渲染编程（Shader篇）【第一卷：虚幻自身的延迟渲染管线】](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247499004%26idx%3D2%26sn%3D551107082f8e9ef29e63a21135572aa5%26chksm%3Df9014e86ce76c7901d484916099a4434570c43d46c5cac81ea4e4c18a044c29b64fd1a574235%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_e5db3eef82f2.jpg)

- [Unity Shader-渲染队列，ZTest，ZWrite，Early-Z](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484371%26idx%3D1%26sn%3Df76d2a30575f242e1468ce545046c449%26chksm%3Df902b1a9ce7538bf0b28070a39c9d634df8b5d7beff61042f66aafc5e63c86915acc59e5e9ff%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_8e2ef865c34d.jpg)

- [Unity Shader入门精要 PDF 完整版 百度网盘免费下载](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484251%26idx%3D1%26sn%3Dd7bea382baa076eacbf22f4dc50dc636%26chksm%3Df902b121ce753837a3e037cf8b09f0474c7e6aee50159eb176cb0b2e3515a7b3502245e9f4a5%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_4c4a77366fbf.jpg)

- [Unity手游开发札记-使用Shader进行UGUI的优化](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484156%26idx%3D1%26sn%3D56e8e6a77031688d405e20e90c1add06%26chksm%3Df902b086ce75399000f2342938d71e2d955e02d8fce32c8a363bc2a4ec95392d7582c082998c%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_78bb4bb92e4c.jpg)

- [使用Mali Compiler对Unity Shader进行优化](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247499850%26idx%3D2%26sn%3Dd7b27f8f731f3b43c0dbd8e5bc1bb7ea%26chksm%3Df9017230ce76fb261339987ec8ca27407a04555941f663c566c1bf333455c00d83e4a26b3f49%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_f1f7d56047b5.jpg)

### LOD

- [浅谈地表LOD减面](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485664%26idx%3D1%26sn%3Dbffc3bf6682597774e7cfe2c608432f6%26chksm%3Df902ba9ace75338cea71c562dc85fff4d19059936536ac74d013b3e169b487493fd49ef27569%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c567c3e8e87b.jpg)

- [Unity Lod和Occlusion Culling](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484410%26idx%3D1%26sn%3D1e1897eedc37828e43bf09d78d7d9423%26chksm%3Df902b180ce7538963bab820f904655e933321fae0a3caa9346162c225787fbdd47d865b07f6e%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_967e27ded740.jpg)

- [Unity中Shader LOD控制](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484382%26idx%3D1%26sn%3Ddf86f7cff7f36552844ef57570e3a24b%26chksm%3Df902b1a4ce7538b2cc985c29ec8c06a4ea82949daf48a219e505956c40fdfd6af71197f98bcf%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_e7569d745405.jpg)

- [网格简化与LOD(Level of Detail)](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485003%26idx%3D1%26sn%3Db36e0297a21843912a89631c3dcc9230%26chksm%3Df902b431ce753d27769f43d50c649f6691767047e7b8c672e76cceb961adb5ac92d10d72e808%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ff770801646b.jpg)

- [探索游戏中的LOD技术 - 网格简化](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485199%26idx%3D1%26sn%3D483c1a0497ed68e91f1c33181a1c50e2%26chksm%3Df902b575ce753c63d509c0ed89b178cf7497725e27e373dfc9ca12e1c2a982ae255a755b1273%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_62bcaa588744.jpg)

### GPU

- [定制高性能GPU粒子系统](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247505463%26idx%3D2%26sn%3D3c1f7f03aec215d923e1aca5e38e7588%26chksm%3Df901644dce76ed5baadb6107e3a47054630c8085754be4efa0da394c8608d02e5768b2e21314%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_3f95be1fae32.jpg)

- [研发日志技术篇（上）| 如何死磕GPU](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247505402%26idx%3D1%26sn%3D60bb2da3c3a4e9676e2edad892fdc901%26chksm%3Df9016780ce76ee966af3b6adb2b6c8e17ee9259b0b193abcdfa4c9d86381a4a91b0c4d244419%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ad911663a05f.jpg)

- [用GPU实现基于百万曲线的头发渲染](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247497674%26idx%3D1%26sn%3Dedf3e1e5e3042bd9ddbd5510257d8add%26chksm%3Df90145b0ce76cca6672db09ce134e93ac0300aa2814fc660056d3979f80c815713245f7505ca%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_fd23c1a4fbbe.jpg)

- [移动端高性能图形开发 - 移动端GPU架构探究](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247497221%26idx%3D1%26sn%3D48f75769b1f9e9fb9ad7a21d34e23388%26chksm%3Df901447fce76cd693f5637330d463ec931cc0423313c0d02d92cd1694a23f0bd343bbd078334%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_bd4ef0d4a4cc.jpg)

- [GPU中稀疏八叉树的构建求交与实时PathTracing的一种可能方向](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247494174%26idx%3D1%26sn%3Da9bce47ca1051c80bc88045d9b49441c%26chksm%3Df9015864ce76d1720b22cb3a6c4f471f5621baafdc9365417ce286d1ba6f25df58c2347763b5%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_fc7a1cf8e78c.jpg)

- [移动GPU体系结构](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247500111%26idx%3D3%26sn%3Dc585d6048c7c651f74363e7cfb7db25b%26chksm%3Df9017335ce76fa231c9f4c7fe77fead167d8bd72cc742009cb0b1b3031ccf327c3241850dc05%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_37b9acd9f111.jpg)

- [UE4 GPU 性能分析工具的实现原理探究](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247499146%26idx%3D3%26sn%3D8c3fc7bb4a9aab3969f0ad3b4102537c%26chksm%3Df9014ff0ce76c6e6f65ff11bc62432c5ed8ac34b9ec8ccda870e75080d3789180e4f500c5bd0%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_4dac1b68a033.jpg)

- [现代渲染引擎开发-GPU Driven Render Pipeline](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247498812%26idx%3D3%26sn%3D4db848fdd4fc10a099dcde206e07a422%26chksm%3Df9014e46ce76c750e04e50766b86469c012d11aaba02612aa29af298dbe34eb18c7795ca2e17%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_77ca2c62d9e8.jpg)

- [移动设备渲染架构以及GPU优化技巧](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247494723%26idx%3D1%26sn%3Dac8fba677cdf6b745bb2d65829eeac54%26chksm%3Df9015e39ce76d72f11bb96e090d6ed0bcc6791ffef99ca5bf30e201616157f8011372c173961%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_edd3294ed0f9.jpg)

- [一篇文章带你读完《GPU Gems 3》](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484919%26idx%3D1%26sn%3D61957419663221e4f184fd7363df4746%26chksm%3Df902b78dce753e9bc8e18284e03a144db6c6462a016ca662468df663a2ec7c345a1060b7b9e6%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_dc76685862b2.jpg)

### GC

- [从源码剖析 UE4 的垃圾回收机制](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247500885%26idx%3D1%26sn%3D6e661e0305ce649c0b2dc63579c754e5%26chksm%3Df901762fce76ff39cdbff33a2a3ab2bc21ae943d86a4767d9ca98d8e6b6b72de895eff5104c2%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_9928266eb389.jpg)

- [Unity GC优化](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247486736%26idx%3D1%26sn%3D1117bafe79831904fd5195eb02f6adcb%26chksm%3Df902bf6ace75367c47e7c5b1eed13e9b4892550af0dca63ad54032d99a5ad97b896860d6190e%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_be3225dd9ae6.jpg)

- [深入浅出聊Unity3D项目优化：从Draw Calls到GC](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485440%26idx%3D2%26sn%3Db994b64cd5899781b71c715dfe48a995%26chksm%3Df902ba7ace75336c2caf9818e365ea63c84c167ba9c4168b79c9abbb4cf2b36445f01f6749aa%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_df5ca58dc2b7.jpg)

- [【纯技术向】C#技术漫谈之垃圾回收机制(GC)](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484901%26idx%3D1%26sn%3D7ec24907f57003869422887b873efd4c%26chksm%3Df902b79fce753e896b10d232a877cd5243da520aed0bf52448be2402331e857efeddc680c48e%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_d61f46366d7b.jpg)

- [深入浅出聊Unity3D优化：从Draw Calls到GC](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484691%26idx%3D1%26sn%3Dfdc187bad61b0ad613b06e4c88f8ac90%26chksm%3Df902b769ce753e7fe5f08b2b7c8d6648147b54399e62b66bf86cea72ee6b360065b1878e9f34%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_01b85224c9d0.jpg)

### DrawCall

- [聊聊Batch的前世今生](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485829%26idx%3D2%26sn%3D1c70ba9c9e88d952ef8c3037a9e8770a%26chksm%3Df902bbffce7532e9a9fbb4787c1757b051254b0594a922cd4434616543494836f4ad4cf14324%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_6420dc987699.jpg)

- [[GDC16] Optimizing the Graphics Pipeline with Compute](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485211%26idx%3D1%26sn%3Db1f6302b7529fb90f176fcede5c6ed1f%26chksm%3Df902b561ce753c77e7ea52a0fb76b9812e24fe066000fa2f8309bab98937f83f58aa1b8706df%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_08249d97bc8e.jpg)

- [聊聊 Draw Call](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247499004%26idx%3D3%26sn%3Df10ac4c73d0efd633bc91c493d104bfa%26chksm%3Df9014e86ce76c79018ae0b54b5faa6e5b13178318c147d7de98421c86927d76152f8a6da8b24%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_2d7561fc3a7c.jpg)

- [Unity性能优化之DrawCall](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484343%26idx%3D2%26sn%3Df9fffe2ea89e14f1a9005a25f973a44d%26chksm%3Df902b1cdce7538db42ad057eb47de9bcf1a99d482ec14f3de00b16d17091c065458d72f1fac4%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_4719ef50c601.jpg)

- [Unity基础：DrawCall从入门到精通](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247495644%26idx%3D1%26sn%3Ddc9c02f52cc20b9516567c6c25a18f2d%26chksm%3Df9015da6ce76d4b0ed6964df953177b497c765a0d887ecec1411f52ce0fbd73144db22778ca4%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_64fe01cd0372.jpg)

### CPU

- [生存RTS《异星前哨》研发日志技术篇（下）| 燃烧你的CPU](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247505694%26idx%3D1%26sn%3D7089344496f4a4f6961471bcdefac9e8%26chksm%3Df9016564ce76ec72b291ced8af4d05a5007996aff224f0e1ba0315596d06b9304e3d741efd54%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_55dc4e480f4c.jpg)

- [UE4 GameThread优化总结笔记](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247497463%26idx%3D1%26sn%3D3ff3ed0fcd2376c16286f6c4ee03cdba%26chksm%3Df901448dce76cd9b8fd48ab4c0a7b9bbb50a20c8c70cf4f0324e8dabf6e75776bf18a6268b29%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_1cbf348b7dff.jpg)

- [性能优化，永无止境---CPU篇](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247483772%26idx%3D3%26sn%3Ddf38035d526fe9138370e06a1bcacdc2%26chksm%3Df902b306ce753a1056f3aeab3ea10e3f17b3a793e4a339f8546fa1c7d8c14a414ddd442ecd32%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_7f6b069a7ad7.jpg)

### 综合

- [[UE4]性能优化指南(程序向)](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247496996%26idx%3D2%26sn%3Dbe9563850e57ac5ce8009f2fe46956f3%26chksm%3Df901475ece76ce48def940680d329bee67a6374dafd7a728b56b7489c64d2d9227d995783460%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ecc8e201bb5a.jpg)

- [[UE4]性能优化指南(美术向)](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247496995%26idx%3D2%26sn%3D18c2a1510674582f1acc1c06996035f9%26chksm%3Df9014759ce76ce4f9af416fa005e53682a5d21ad6a71c2887b12e3326f05114f32b464b3cace%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_4e86b7df8953.jpg)

- [为什么电影24帧就算流畅，主机30帧就算流畅，而电脑游戏需要60帧流畅？](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485093%26idx%3D1%26sn%3D3766536c931950cf44134912cda22db1%26chksm%3Df902b4dfce753dc9542c6691ee284eb8418fbac923f43a117648aeae321de181024511e7b03b%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_2a0791708bc6.jpg)

- [Unity3D游戏高性能战争迷雾系统实现](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247483920%26idx%3D1%26sn%3D60f468a39c20cb431d4da7761a509bfe%26chksm%3Df902b06ace75397c7e850b527f2a1febc52d3c2a74d5fea709164276b4789db61e6189382b37%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ea88776e9c7b.jpg)

- [【游戏开发面经汇总】- 计算机基础篇](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247499146%26idx%3D1%26sn%3D3fc250d4503bcbf2d0572ed0db84c511%26chksm%3Df9014ff0ce76c6e6e321bd81444bb13faec5ff367bc3761c82206d811143ab9e5670bf0c40c6%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_21fc08648999.jpg)

- [UE5虚拟几何体Nanite优势和局限性](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247497675%26idx%3D2%26sn%3D54151b4e4ee72228c95f23cd7a93f285%26chksm%3Df90145b1ce76cca7b4111f643eebe2906417807b90c5b352dc75886d236e95c32d0ba7b69570%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_b8e96fd46204.jpg)

- [技术美术技能树](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485954%26idx%3D1%26sn%3Da603f23b065721cd75a40caf344dc2bc%26chksm%3Df902b878ce75316ef1efee833988058e0401b3313f3646d010e1102d32c9b13c91644f1a5f4e%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a462faac5789.jpg)

- [【翻译】如何成为一名技术美术](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485836%26idx%3D1%26sn%3Df0791abae9feb2feb860262bbfec3aa1%26chksm%3Df902bbf6ce7532e03d683a8ac87822f67921c9425ef342877dc805fee9111ada39e5bf8fb354%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_9194a4ab6280.jpg)

- [游戏引擎 Unity 的入门易精通难体现在哪？为什么？](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247485420%26idx%3D2%26sn%3D64d57f20529579be1671aedf738bdf5d%26chksm%3Df902b596ce753c80d017683fea60b473522208a43851ad430f82be7c94f02e650b09782f308d%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a01516836609.jpg)

- [开发时间长的游戏是怎么保证画面素质的？](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484977%26idx%3D1%26sn%3D63f04188c2588c0422a36123833e9b60%26chksm%3Df902b44bce753d5d7e1cd9b073e814b078fd343b58ca6a322a5dfcfa3506f7d740536f23a95e%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_fc4421e294a2.jpg)

- [在移动平台上打造60fps的3A游戏](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484964%26idx%3D1%26sn%3Db325270c232f5cc5aad240c1435d1fdd%26chksm%3Df902b45ece753d48d2715c49e119cc91e6aff0707ae8ccab3bdcd3434ccb9bce81c6f0d581bf%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_dbed3c74fbd3.jpg)

- [如何成为游戏行业的图形程序员](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484944%26idx%3D1%26sn%3D7aa4feb159bc4630ceb7e31ca0ecea26%26chksm%3Df902b46ace753d7c3233da4e50023e6b3f8ac1648e30aaf107e01642c00efa7d60c2d235a91f%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_0403049c8ccd.jpg)

- [一个游戏是如何被设计和开发出来的](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484892%26idx%3D1%26sn%3Da1a05703f48803f6dfda6b992f8b9469%26chksm%3Df902b7a6ce753eb018ff032ea6e0833bdb34e3e6eb7f5af7345f1478ddcdff22702d7a01d858%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_eafdcee6a6c0.jpg)

- [阿里P9资深架构师：支付宝和蚂蚁花呗的技术架构及双十一实践](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484349%26idx%3D1%26sn%3D9905826ae85612fa39506113c2634686%26chksm%3Df902b1c7ce7538d187ccc8cac845558758fead15961687515335898770f31cd6b2da5336186a%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_8abcaeb0d89c.jpg)

- [腾讯桌球：客户端全面总结-干货必读](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247484346%26idx%3D1%26sn%3Dc0c419bc9f23d6478dfacbcb680aeb14%26chksm%3Df902b1c0ce7538d62eb24ad529d6b59a2a18530fe4e131ad2c685051af079308fa6cfd7f8b09%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_fbe2b82d14e7.jpg)

- [Unity3D性能优化总结 完整版](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247483751%26idx%3D1%26sn%3Dd804014220937bac64fed0e04e3044d3%26chksm%3Df902b31dce753a0bda3b8fb89a09646938ab5c1e7de9a968f75289dc59ad170505423505a38f%26scene%3D21%23wechat_redirect)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_8821e07dc194.jpg)

最新最全的游戏开发性能分析和优化资料请见合集标签：[游戏开发性能分析和优化](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/mp/appmsgalbum%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26action%3Dgetalbum%26album_id%3D1792983677962911751%23wechat_redirect)，欢迎大家订阅~

[](https://zhuanlan.zhihu.com/p/661551564)

[](https://zhuanlan.zhihu.com/p/660262308)

[Unity3D游戏开发中100+效果的实现和源码大全 - 收藏起来肯定用得着](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247487026%26idx%3D1%26sn%3D442efa67e68f323aaa2e2077f80ecce9%26chksm%3Df902bc48ce75355ed8fd99975c1964c3e38455ad6ba36086be7e8cb6ea2797e973b05cafda85%26scene%3D21%23wechat_redirect)
[【原神】各角色Pixiv涩图统计(一). 最多的是谁? R18涩图谁最多?](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247506542%26idx%3D1%26sn%3Df8322d9ad4821ff9709be0ad8a4eb206%26chksm%3Df9016814ce76e102acdb37bd57017cb86d3732dfb430a0f03d1f64b59e16e7b231d9fc92e18d%26scene%3D21%23wechat_redirect)
[战神4角色绑定与过场动画制作](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzUxMDM3MTYwNQ%3D%3D%26mid%3D2247503967%26idx%3D1%26sn%3D1535132037c48015d6e7483a5524531e%26chksm%3Df9016225ce76eb33bca178a8260356fd0a99f4c555a38ce80df3cbc5ba2aef7091fb066fd075%26scene%3D21%23wechat_redirect)

声明：本文来自公众号：游戏开发技术教程（GameDevLearning），转载请附上原文链接（[https://mp.weixin.qq.com/s/eeOXTHulGooYHz3G9Pdg2w](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/eeOXTHulGooYHz3G9Pdg2w)）及本声明。
