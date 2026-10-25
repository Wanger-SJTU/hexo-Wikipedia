---
title: "苹果新论文发出惊人一问：What do your logits know?"
date: "2026-04-29 00:00:00"
updated: "2026-04-29 00:00:00"
layout: "post"
permalink: "/collections/0.raw/wechat/苹果新论文发出惊人一问-What-do-your-logits-know/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "wechat"
  - "AI"
source_url: "https://mp.weixin.qq.com/s/xi-wYsgd_bIdtRTSN-9oKg"
---



![image](https://mmbiz.qpic.cn/sz_mmbiz_png/KmXPKA19gW889cR13aBX42evqQIRibKlicoCrHPEpT0tQiceNphESCa2eJTqstP8G0yqMTkeMFrOGue6kOyCKdTkA/640?wx_fmt=png&from=appmsg)
编辑｜Panda
/>
近日，有个大新闻：执掌苹果超过 14 年的蒂姆・库克宣布将于 9 月正式卸任 CEO 职位，将接力棒交接给现任硬件工程高级副总裁约翰・特努斯。回顾库克时代，人们津津乐道于他极致的供应链管理艺术以及带领苹果市值一路飙升至 4 万亿美元的旅程。

/>
然而，在这个由生成式 AI 主导的全新十年里，特努斯接手的将是一个亟需在 AI 领域证明自己的苹果。

/>
苹果近年来在 AI 底层技术层面的投入正在不断加码。恰在此时，苹果 AI 研究团队提交了一篇极具探讨价值的论文《你的 logits 知道些什么？（答案可能会让你惊讶！）》

/>

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/5L8bhP5dIqHrjnsPvMXJB29cL70DRwVnPicMAoGzxqGU2tMibgh6XtNw5seQ0beaibSuALGpzS31wh0h9jptkSmVRMOgP2ibuKxk0BOKLxKziaAU/640?wx_fmt=png&from=appmsg)

/>
论文标题：What do your logits know? (The answer may surprise you!)
论文地址：https://arxiv.org/abs/2604.09885

/>
这项研究触及了大模型运作的最底层逻辑，也直接关乎苹果最为看重的核心价值：用户隐私与数据安全。

/>
接下来，我们就基于这篇论文，看看大模型在回答简单问题时，究竟在底层「偷偷」记住了多少你的秘密。

/>

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/5L8bhP5dIqEQabSk6FFxVTyBbGXY8IDaQibACuCdb9KW5HHEDkupOgOcq6MFH3wNQy0moY3UfKiaQ5j4zRH4bYRoyUHhoQul55ujLvjNsibcIE/640?wx_fmt=png&from=appmsg)

/>
核心概念：信息瓶颈原则

/>
要理解这篇论文，我们首先需要了解一个关键概念：信息瓶颈原则 (Information Bottleneck Principle)。

/>
打个比方，假设你是一家大型跨国公司的 CEO，你需要决定是否收购一家初创企业。你的基层调研团队会收集海量的信息，包括该公司的财务报表、员工的午餐喜好、办公室的装修风格等。

/>
但是，当这份报告层层递交，最终放到你的办公桌上时，它应该被大幅压缩，只保留那些对「收购」决策至关重要的财务和技术指标。保留多余的无效信息不仅会干扰你的判断，还可能导致决策失误。

/>
对于视觉-语言-模型 (VLM) 也是同理。

/>
举个例子，你有一张信息量很大的照片，并将其上传给模型，并询问「图片里有一只灰色的猫吗？请用一个词回答」。根据信息瓶颈原则，一个理想的模型在最终输出「Yes」或「No」时，应该早就把背景里的沙发颜色、窗外的天气等无关信息全部过滤掉了。

/>
但苹果这篇论文提出一个疑问：模型真的做到了彻底遗忘吗？

/>
为了找出答案，研究人员截取了模型处理信息的不同阶段进行测试。具体来说，他们主要考察了以下两个代表性的层级：

/>
残差流 (Residual Stream)：这相当于公司底层收集数据的庞大数据库。它包含了模型在处理过程中的所有隐藏状态。
最终的 Logits：Logits 是模型在输出最后一个词之前，针对词典里每一个词汇打出的原始概率得分。取排名前列的候选词得分，就是 top-k logits。这就好比呈递给 CEO 的最终选项清单。

/>
实验设计

/>
研究人员引入了一个名为「探针」(Probes) 的轻量级神经网络工具。探针的作用，就是专门盯着模型特定层级的数据，试图从中强行推测出图片的原始属性。

/>
实验使用了两个主要数据集。一个是完全由人造几何图形组成的 CLEVR 数据集，里面包含各种大小、颜色和材质的立方体或球体。另一个是包含复杂真实生活场景的 MSCOCO 数据集。

/>
研究人员对图片进行了各种干扰，比如加入高斯噪声、玻璃模糊或运动模糊。

/>

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqEfBzGeLPQqtmamiayRgBelaZuoRRXGovYAZ0BoJUU7Cv7VT8XINuFjtBdCBYwMlbfvHO9GgaeZDTbhx6P7dQZ9daYBbic7RQTQk/640?wx_fmt=png&from=appmsg)

/>
随后，他们向模型提问。在获得模型的内部数据后，他们训练探针，看看能不能从残差流或最终的 logits 中，反向推断出图片加入的噪声级别、目标物体的颜色，甚至是没有被提问到的背景物体的特征。

/>
在干扰测试中，研究人员还发现了一个有趣的现象。当施加最严重的高斯噪声时，Qwen3-VL 模型的准确率受到了极大的影响，倾向于将答案由「Yes」翻转为「No」，而 LLAMA 模型在面对高斯噪声时则展现出了相对更强的稳定性。这些不同的表现反映了各模型在提取决策相关信息时的内部差异。

/>
七大发现

/>
通过测试，苹果团队得出了一系列揭示模型底层机制的结论，完整展现了信息在模型内部的留存状态。

/>

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqGzqBe93Wdqfls0vCDibv3hHDYgiaSCryvQeiaf0o3qYQ21XULs3FiciayUj6O2AbCOeibN0wWKfbZOwaiaaoIcxO3glypicYa6wdTFQyI/640?wx_fmt=png&from=appmsg)

/>

![image](https://mmbiz.qpic.cn/sz_mmbiz_png/5L8bhP5dIqEyKY0bRhu2lRVzPlA1ntcniaBG1ric0ibWgExs3iabh98m4o9KxUiaz5vlF4NqW1sSR47LAz6GjuJibicvpUtF34JoUG2DWSCqdumycY/640?wx_fmt=png&from=appmsg)

/>
发现一：残差流是全知全能的 Oracle

/>
在处理视觉输入时，残差流几乎原封不动地保留了图片的一切细节。

/>
研究表明，无论是与最终决策直接相关的图像噪声类型，还是目标物体的形状和颜色，亦或是完全无关的背景物体数量与属性，探针都能从表现最好的隐藏层状态中以接近完美的准确率提取出来。在这一层，模型就像一个过目不忘的偷窥者，尚未执行任何有效的信息压缩。

/>
发现二：残差流的低维投影同样「藏不住秘密」

/>
为了观察信息如何向最终输出过渡，研究人员使用了 Tuned Lens 技术来提取残差流向 Logit 空间映射的演变轨迹。

/>
测试表明，即使仅仅观察排名前 2 的预测轨迹 (trajectory-2) ，探针不仅能提取出大量目标和决策相关的核心信息，依然会轻易读取出诸多背景物体的特征。这印证了此前业内关于语言模型隐藏状态易遭秘密提取的研究，证明这些深层轨迹并没有遵循理想的信息瓶颈原则进行有效的过滤。

/>
发现三：最终层 Logits 可靠地编码了决策与目标信息

/>
在模型即将生成回答的最后一层，信息压缩确实发生了，但远不够彻底。

/>
仅观察排名前 2 的最终 Logits （即对应「Yes」和「No」的得分），探针就能以极高的准确率预测出影响模型决策的图像噪声级别和类型。

/>
而当观察的候选词汇数量增加到包含所有大小写的 yes/no 变体（ k 约等于 10 至 13 ）时，目标物体的各类属性信息就开始变得清晰可解码，并在提取数量等同于模型层数（ 1L ，约 30 至 40 个候选词）时达到预测的准确率巅峰。

/>
发现四：最终 Logits 悄悄记住了提示词「未提及」的目标属性

/>
这是引发严重安全担忧的核心发现。

/>
假设我们向模型提问「图片里有一个蓝色的圆柱体吗？」，虽然提示词明确给出了颜色和形状，但完全没有提及该物体的材质和大小。然而，探针依然能从模型最终输出的前 0.5L 数量的候选项中，极其可靠地预测出这个圆柱体究竟是橡胶还是金属材质的，以及它的具体尺寸。

/>
这意味着模型为了得出最终结论，不仅调用了相关特征，还将冗余的目标特征作为伴生数据一并带到了极易暴露的表层。

/>
发现五：最终 Logits 甚至充当了环境的「录像机」

/>
除了紧盯目标物体，最终层的 Logits 还在暗中记录着周围的环境。

/>
虽然排名前 2 的 Logits 几乎不包含背景信息，但只要观察的候选词数量稍微增加，这些看似只有单个单词的表层输出分布，就能显著且高于随机水平地预测出场景中非目标物体（如背景中的其他几何体）的数量、颜色等属性。只需获取适量的输出分布数据，不相干的背景隐私便无处遁形。

/>

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqGiaFVJvGNKvohAQcKw6QRObNhXl2nzdSpPs7EyicBZUnvh68XSS5M5MoDbYxpOBIvKtYqwVElH0UD9dpbHOT7ngQqnocz1e5Yo4/640?wx_fmt=png&from=appmsg)

/>
发现六：泄密往往只需要前 60 个左右的 Logits （呈 U 型曲线）

/>
研究团队观察到了一个有趣的预测能力 U 型曲线。

/>
仅看排名前 2 的候选词时，模型几乎只暴露噪声信息；增加观察数量后，探针的预测准确率会迅速攀升，并在截取 30 至 80 个 Logits （视具体模型深度 1L 或 2L 而定）时达到顶峰。如果继续扩大 Logits 集合到 4L 或 5L 以上，预测能力反而会因为高维噪声干扰而跌落回随机水平。

/>
这表明，恶意提取者根本不需要获取庞大的完整输出词表，极少量的头部候选词汇就是泄密的重灾区。

/>
发现七：在同等维度下，最终 Logits 的风险与深层破解无异

/>
过去的黑客或研究者想提取大模型底层的机密知识，往往需要采用白盒手段获取模型内部的参数轨迹，门槛极高。

/>
但这项研究揭示了一个残酷的现实：如果保持相同的观察维度，提取模型最表层且经常通过 API 对外开放的最终层 top-k Logits （通常只需要截取 2L 数量），其泄露无关信息的能力与需要极高权限的深层日志轨迹几乎完全相当。这打破了业内对于灰盒 API 访问具有天然安全屏障的传统幻想。

/>
技术背后的深远隐忧：隐私与大模型安全

/>
在大概理解了实验过程之后，我们不禁要问，这到底意味着什么？

/>
苹果团队敏锐地指出了这一现象背后的巨大安全隐患。

/>
在实际的商业应用中，许多 API 接口或服务提供商为了让开发者调整参数，会公开模型最终的 top-k 对数概率，这就是所谓的灰盒场景。

/>
这意味着，当用户上传一张包含隐私信息的照片，仅仅是让模型执行一个无关痛痒的视觉问答任务时，模型看似只输出了一个「Yes」或者一段简短的文字，但其背后附带的那几十个最高概率词汇的得分分布，已经悄悄把你照片里的背景信息、潜在的敏感属性泄露给了能够获取这些数据的服务端或恶意截获者。

/>
恶意攻击者完全可以通过反复抽样和探测，从这些看似无害的输出概率中还原出用户的隐私数据。

/>
此外，从模型自身的性能优化角度来看，这种信息压缩的失败也解释了为什么大模型经常会产生幻觉。那些徘徊在顶层 logits 中的无关信息，在非贪婪解码的生成过程中，随时可能对最终生成的文本产生干扰，导致模型输出带有偏见或虚假的内容。

/>
结语

/>
「What do your logits know?」这个论文标题中问题堪称悬在生成式 AI 头顶的一把达摩克利斯之剑。

/>
蒂姆・库克带领苹果建立起了世界上最高效的科技商业帝国，而当接力棒传到约翰 特努斯手中时，如何打造既高度智能又绝对保护隐私的下一代计算平台，将是苹果无法回避的新命题。

/>
这篇论文告诉我们，在大模型的黑盒子里，即使是看似无害的一组概率数字，也可能隐藏着你的秘密。

/>

![image](https://mmbiz.qpic.cn/mmbiz_png/5L8bhP5dIqHiaibvHIJSVXIV6lxXfaJyW4Z9zvXBxFrHMfkjibhhojVNAsvL3N0kYgLSTemtgUZZF6GusSCSRVibx2HbAaNKy120rMhnfzr9YgM/640?wx_fmt=png&from=appmsg)

/>
/>
© THE END
转载请联系本公众号获得授权
投稿或寻求报道：liyazhou@jiqizhixin.com

