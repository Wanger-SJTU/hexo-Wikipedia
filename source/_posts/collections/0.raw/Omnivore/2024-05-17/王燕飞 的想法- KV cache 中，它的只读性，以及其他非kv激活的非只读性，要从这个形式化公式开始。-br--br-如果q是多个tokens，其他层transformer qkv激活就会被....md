---
id: 1e8110e4-a37a-4cc9-8c5d-a33b25919ccb
---

# 王燕飞 的想法: KV cache 中，它的只读性，以及其他非kv激活的非只读性，要从这个形式化公式开始。<br><br>如果q是多个tokens，其他层transformer qkv激活就会被修改，但是推理阶段解码过程，q是一个token，其他层transformer kv不会被修改，而且只有它们具有不被修改，即只读性。<br><br>可以推演试试<br><br>理解它们存储读写特性、时空性、读写频率、访存颗粒度，是内存系统优化的开始。。。 - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/https-www-zhihu-com-pin-1774710434400174081-18f857dbaa5)
[Read Original](https://www.zhihu.com/pin/1774710434400174081)



KV cache 中，它的只读性，以及其他非kv激活的非只读性，要从这个形式化公式开始。

如果q是多个tokens，其他层transformer qkv激活就会被修改，但是推理阶段解码过程，q是一个token，其他层transformer kv不会被修改，而且只有它们具有不被修改，即只读性。

可以推演试试

理解它们存储读写特性、时空性、读写频率、访存颗粒度，是内存系统优化的开始。。。

​2 人喜欢

​分享

​收藏​ 举报

