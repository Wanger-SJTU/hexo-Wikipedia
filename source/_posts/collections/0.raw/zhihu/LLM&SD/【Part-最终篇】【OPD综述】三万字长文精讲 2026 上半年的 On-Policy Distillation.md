---
title: 【Part-最终篇】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation
date: "2026-06-23 00:00:00"
updated: "2026-06-23 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/【Part-最终篇】【OPD综述】三万字长文精讲-2026-上半年的-On-Policy-Distillation/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2052723229110820946
---


写在前面的前面的前面
经过6篇文章，终于是讲全了「OPD工作的六个分支」，感兴趣的同学可以点击下面的link挨个阅读；

这应该是【OPD综述】的最后一篇文章了，打算把「**建立OPD论文的坐标系**」、「**个人认为OPD还有的几个gap**」和「**总结**」一并写完；

写在前面的前面
本文是一篇个人整理的 OPD（On-Policy Distillation）方向 mini-survey，覆盖 2026-01 ~ 2026-05 上 arXiv 的大概40多篇OPD 相关论文（其中 14 篇是我之前一篇篇精读过的，并在了我的专栏中。另外 大概30篇是为这篇 survey 重新检索 + 粗读后总结的）。

**目标读者**：刚听说 OPD、想搞懂它在干嘛、想从这一波论文里找研究 gap 的同学。
**写作原则**：所有insight都尽可能挂原文原文；abstract 没说的细节不写。**综述的全部link见下面：**

[【Part-1】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation](https://zhuanlan.zhihu.com/p/2045918254108095918?share_code=nHnUZKGoVA0R&utm_psn=2046353002081132830)[【Part-2】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation](https://zhuanlan.zhihu.com/p/2046218506950160720?share_code=1fsaefi5DewE6&utm_psn=2046352737953226866)[【Part-3】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation](https://zhuanlan.zhihu.com/p/2047255993000759999/)[【Part-4】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation](https://zhuanlan.zhihu.com/p/2047628325200441696/)[【Part-5】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation](https://zhuanlan.zhihu.com/p/2048798811926050576/)[【Part-6】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation](https://zhuanlan.zhihu.com/p/2050162867513692354/)[【Part-7】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation](https://zhuanlan.zhihu.com/p/2052339171289839466/)[【Part-最终篇】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation](https://zhuanlan.zhihu.com/p/2052723229110820946/)针对26年上半年OPD工作的mini-survey 目前大体分为六个，分别是：

**第0章 - 第2章：已经写完了，在**[【Part-1】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation](https://zhuanlan.zhihu.com/p/2045918254108095918?share_code=nHnUZKGoVA0R&utm_psn=2046353002081132830)

**第3章：OPD工作的六个分支**（可能要分好多篇来讲了，**每篇讲一个分支**）

- 分支一：OPD的训练稳定化 [【Part-2】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation](https://zhuanlan.zhihu.com/p/2046218506950160720)
- 分支二：无teacher的自蒸馏OPD [【Part-3】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation](https://zhuanlan.zhihu.com/p/2047255993000759999)
- 分支三：输入信息非对称的OPD [【Part-4】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation](https://zhuanlan.zhihu.com/p/2047628325200441696)
- 分支四：黑盒/Rubric的OPD [【Part-5】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation](https://zhuanlan.zhihu.com/p/2048798811926050576/)
- 分支五：针对压缩/效率的OPD [【Part-6】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation](https://zhuanlan.zhihu.com/p/2050162867513692354/)
- 分支六：多模态的OPD [【Part-7】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation](https://zhuanlan.zhihu.com/p/2052339171289839466)**这一篇来写以下三章**

**第4章：建立OPD论文的坐标系**

毕竟OPD很火，论文每天怎么着也得出几篇。
写这章的目的，其实就是想让大家在读完任意一篇OPD的论文后，都能根据它核心设计的不同，将其咱们这个有四个正交轴的OPD坐标系中；**第5章：【个人看法】OPD还有的几个gap**

**第6章：总结**

4. 建立OPD论文的坐标系：把任意一篇 OPD 论文塞进坐标系
读完六个流派，你会发现不管哪篇论文，它的核心设计选择都可以投影到四条正交轴上。写这一章的目的也是，不管你读了哪一篇OPD论文，你都可以将它投影到下面这个坐标系中；

这个坐标系的**四个**正交轴分别是：

**Teacher 是谁**：

固定外部模型 / EMA / 同参不同 input / 周期硬拷贝 student / 黑盒 API / 多 teacher 辩论**上下文对称性**：

teacher 和 student 看到的输入是否相同？（完全对称 / teacher 多看 PI / teacher 多看 demo / teacher 多看 feedback）**散度选择**：

reverse KL / forward KL / JSD / entropy-gated 混合 / truncated RKL / 对抗式 / rubric reward**监督密度**：

full rollout 所有 token / prefix-only / entropy-gated mask / advantage-gated / error-span-only / trajectory-level下面这张大表把 18 篇各方向的**代表论文**填进这四个维度。**看全部40+篇论文如何填入对比表中的，请看附录「附录 A：全量四轴归类表」；**

4.1 主对比表（代表作，18 篇）
论文Teacher 是谁上下文对称性散度选择监督密度⭐ REOPOLD固定外部对称RKL + reward clippingentropy-gated mask⭐ EOPD固定外部对称RKL + entropy-gated FKLfull rollout（高熵处加 FKL）⭐ Many Faces固定 / RLVR对称TopK RKL（SG 修正）full rollout⭐ OPSD同参 + GT PI不对称（teacher 看 y^\star）JSD + clippingfull rollout⭐ SDFT同参 EMA + demo PI不对称（teacher 看 demo）reverse KLfull rollout⭐ π-Distill同参联合训练不对称（teacher 看 action trace）KL（联合目标）full rollout⭐ SDPO同参 + stopgrad不对称（teacher 看 feedback）reverse KLfull rollout⭐ Prefix-OPD固定外部对称reverse KLprefix-only + scheduling⭐ ROPD黑盒 API对称rubric 通过率（非 KL）sub-goal 级⭐ CRISP同参 + prompt 偏置不对称（teacher 看 &#34;concise&#34; 指令）reverse KLfull rollout⭐ Video-OPD固定外部 VLM对称token-level RKL（PG 形式）TVDF 课程选子集⭐ Medical Audit（审计对象，非方法）———DRKL固定外部对称修正 RKL（去上推梯度）full rolloutAOPD固定外部对称RKL + 局部散度（按 advantage 分支）advantage-gatedG-OPD可解耦（≠ teacher）对称RL + KL 正则（scaling factor）full rolloutOGLS-SD同参（self-distill）对称contrastive steering（非直接 KL）full rolloutOVD黑盒 verbal score对称trajectory-level rewardtrajectory 级Lightning OPD预计算 offline对称reverse KL（近似）full rollout（SFT rollout）
4.2 四轴的&#34;主流默认 + 缺乏探索&#34;分布
我对40+篇OPD论文进行统计后，统计出了OPD工作四轴的「**主流方案**」和「**非主流方案**」，**方便大家一眼就看出还有哪些技术点可以做**；

轴主流方案非主流方案（含不好归类的）Teacher同参 self-distill（含 EMA / frozen copy）20 篇（47%）；固定外部 14 篇（33%）黑盒 / verbal 2 篇（5%，ROPD/OVD）；多 teacher 辩论 1 篇（MAD-OPD）；大小模型协同 1 篇（CoDistill）；解耦 reference 1 篇（G-OPD）；对抗 discriminator 1 篇（PRISM）；未明确 2 篇 + 审计对象 1 篇对称性对称 25 篇（58%）；不对称（teacher 多看 PI）15 篇（35%）teacher 看更少信息 0 篇（0%，结构性空白）；未明确 2 篇（UniSD/Re-thinking）+ 审计对象 1 篇散度KL 家族 29 篇（67%），其中显式 reverse KL / RKL 17 篇（40%）、JSD 1 篇（OPSD）、其余 KL 变体 11 篇非 KL 类 8 篇（19%）= contrastive 2（OGLS-SD/CREDIT）+ SFT-CE 2（Self-Verified/Simple SSD）+ rubric 1（ROPD）+ error-localized 1（ROSD）+ verbal 1（OVD）+ 对抗 1（PRISM）；未明确 5 篇（12%）+ 审计对象 1 篇密度full rollout（含 token-level dense 变体）28 篇（65%）prefix-only 2 篇（5%，Prefix-OPD/Less-is-More）；非 token-level SFT 2 篇（5%，Self-Verified/Simple SSD）；entropy-gated 1（REOPOLD）；advantage-gated 1（AOPD）；correctness-gated 1（SCOPE）；error-span-only 1（ROSD）；sub-goal 级 1（ROPD）；trajectory 级 1（OVD）；token 级辩论 1（MAD-OPD）；response-level 1（PRISM）；课程选子集 1（Video-OPD）；未明确 1 篇 + 审计对象 1 篇

5. 【个人看法】OPD还有的几个gap
基于 [part2-7](https://www.zhihu.com/column/c_2042743199710671372) 中讲的仍然没解决的gap + 上面两张表的 分析，我提炼出三个我认为**还没人正面做**的研究方向：

5.1 gap-1：OPD 的&#34;推理忠实度&#34;监控 —— Medical CoT Audit 的推广
**现状**：Medical CoT Audit 证明了&#34;答案变好、推理变烂&#34;在医学领域是真实存在的。但整个 OPD 社区目前只有这一篇 audit。

**Gap**：我们需要一个**通用的 step-level faithfulness monitor 嵌进 OPD 训练 loop**。目前所有 OPD 方法（不管哪个流派）的 validation metric 都是 answer-level accuracy / pass@1 / reward score —— 没有一篇在训练过程中检查&#34;推理步是否 faithful&#34;。

5.2 gap-2：多种稳定化技巧的组合 / 自适应选择
**现状**：[【Part-1】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation](https://zhuanlan.zhihu.com/p/2045918254108095918)中训练稳定化的方法积累了至少 5 种互相正交的稳定化技巧：

- reward clipping（REOPOLD）
- entropy-gated FKL（EOPD）
- 非目标梯度修正（DRKL）
- advantage-gated 分支（AOPD）
- correctness-based 双路径（SCOPE）。它们各自 paper 里都声称显著提升稳定性，但**没有任何一篇把 2+ 种技巧放在同一个 setup 里跑过**。

**Gap**：(a) 它们能否叠加？叠加后是 additive gain 还是 diminishing return？(b) 不同数据集 / capacity gap 下哪种组合最优？(c) 能否做一个**自适应选择器**，在训练过程中动态切换稳定化策略？

5.3 gap-3：OPD 的 rollout 策略，好像被集体忽视的设计维度
**现状**：[【Part-1】【OPD综述】三万字长文精讲 2026 上半年的 On-Policy Distillation](https://zhuanlan.zhihu.com/p/2045918254108095918)观察到一个惊人的 group think，**10 篇训练稳定化工作里 0 篇尝试改&#34;rollout 来源&#34;**。所有人默认 student 用 temperature 采样 / greedy 做 rollout，然后在 loss 端 / mask 端动刀。但 rollout 策略本身（temperature / top-p / beam search / best-of-N / MCTS / 混合策略 / curriculum 从简到难的 prompt 排序）是一个完全没被探索的维度。

**Gap**：

- 如果 student 在 rollout 时用 MCTS / tree search 来保证 rollout 质量（只把&#34;高质量轨迹&#34;拿来做 OPD 训练），是否能同时缓解 reward outlier + zero-signal dilution？
- Rollout 的 temperature 是否应该随训练动态变化（类似 DAPO 在 RL 里做的 prompt-level dynamic sampling，但做到 token-level）？
- 能否用 §3.5 Sparse-to-Dense 的思路：前期用 off-policy rollout（teacher 生成）warmup，后期渐进切到 on-policy？

6. 一句话结论
**2026 上半年的 OPD 从&#34;知识蒸馏的一个变种&#34;变成了 LLM post-training 的主线工具：四条设计轴（teacher 是谁 / 对称性 / 散度 / 密度）可以把任何新论文定位到坐标系里。三个真空地带（推理忠实度监控 / 稳定化技巧组合 / rollout 策略探索）是我认为最值得下手的方向。**

**最后要大家一个点赞+关注，不过分吧！手动比心！**

附录 A：全量四轴归类表

- 本表是 §4.1「主对比表（代表作，18 篇）」的全量版，把 最近我看的论文逐篇投影到四条设计轴上，同时给 §4.2 的百分比统计提供可核验的底表。论文Teacher 是谁上下文对称性散度选择监督密度⭐ REOPOLD固定外部对称RKL + reward clippingentropy-gated mask⭐ EOPD固定外部对称RKL + entropy-gated FKLfull rollout（高熵处加 FKL）⭐ Many Faces固定 / RLVR对称TopK RKL（SG 修正）full rollout⭐ OPSD同参 + GT PI不对称（teacher 看 y^\star）JSD + clippingfull rollout⭐ SDFT同参 EMA + demo PI不对称（teacher 看 demo）reverse KLfull rollout⭐ π-Distill同参联合训练不对称（teacher 看 action trace）KL（联合目标）full rollout⭐ SDPO同参 + stopgrad不对称（teacher 看 feedback）reverse KLfull rollout⭐ Prefix-OPD固定外部对称reverse KLprefix-only + scheduling⭐ ROPD黑盒 API对称rubric 通过率（非 KL）sub-goal 级⭐ CRISP同参 + prompt 偏置不对称（teacher 看 &#34;concise&#34; 指令）reverse KLfull rollout⭐ Video-OPD固定外部 VLM对称token-level RKL（PG 形式）TVDF 课程选子集⭐ Medical CoT Audit（审计对象，非方法）———⭐ Vanilla OPD（基线笔记）固定外部对称reverse KLfull rollout⭐ Re-thinking OPD?（正文未展开）???DRKL固定外部对称修正 RKL（去非目标上推梯度）full rolloutRevisiting OPD Failures固定外部对称truncated RKL + top-K local supportfull rollout + 特殊 token 掩码AOPD固定外部对称RKL + 局部散度（按 advantage 分支）advantage-gatedSCOPE?（按 correctness 路由，teacher 未明说）对称纠错 KL / 低置信 MLE 双路径correctness-gated 双路径G-OPD可解耦（≠ teacher）对称RL + KL 正则（scaling factor）full rolloutOGLS-SD同参（self-distill）对称contrastive steering（非直接 KL）full rolloutCREDIT同参（self-distill）对称batch-contrastive baseline（非直接 KL）full rolloutSelf-Verified Distillation同参（self-verify 筛选）对称无（self-curated SFT CE）非 token-level（SFT）ROSD同参 + reflector 定位错误 span不对称（teacher 看 reference solution）error-localized distillationerror-span-onlyUniSD同参（多组件，含 EMA）?（视组件而定）含散度裁剪（多机制融合）token-level denseMAIGO同参 + history-cleaned 版本不对称（teacher 看 history-cleaned 参考）?（可靠性加权，散度未明说）token-level dense（可靠性加权）Embarrassingly Simple SSD同参（温度截断采样）对称无（SFT CE）非 token-level（SFT）OPCDcontext-conditioned teacher（同模型）不对称（teacher 看文档 / context）reverse KLfull rolloutHDPO同参（self-distill）不对称（teacher 看 GT answer）token-level 分布蒸馏（KL）full rollout（仅 cliff prompts）Search-E1同参（OPSD self-distill）不对称（OPSD privileged context）OPSD（reverse KL 类）full rollout（GRPO 轮间穿插）OPHSD同参（harness-augmented self）不对称（teacher 带推理 harness）self-distillation（KL）full rolloutCoDistill-GRPO大模型（≠ student，不共参）对称on-policy KD reward（KL）full rolloutBRTS固定外部（best-of-N 择优 teacher）对称?（辅助轨迹监督，散度未明说）full rollout（择优轨迹）OVD黑盒 verbal score对称trajectory-level reward（非 KL）trajectory 级（0-9 标量）MAD-OPD多黑盒辩论集体对称辩论后 token 加权（非单 KL）token 级（辩论后加权）Less-is-More ESR-OPD固定外部（?）对称reverse KL（OPD）prefix-only（first response tokens）Lightning OPD预计算 offline对称reverse KL（近似）full rollout（SFT rollout）Sparse-to-Dense最强 teacher（上游 RL 后）对称dense OPD（KL）full rollout（下游 dense 蒸馏）Vision-OPDcrop-conditioned teacher（同模型）不对称（teacher 看 crop 区域）token-level divergence（RKL）full rolloutPRISMMoE discriminator（对抗式）对称对抗式（非 KL）response-levelOPSDL同参（短 context self-teacher）不对称（teacher 读短/抽取 context，student 读长）?（self-distill，散度未明说）full rollout（OPD 默认）COPSD同参（crosslingual self-teacher）不对称（teacher 读英文 privileged context）token-level divergence（具体散度 ?）full rollout（OPD 默认）OPSA同参 frozen copy（privileged safety context）不对称（teacher 看 safety context）per-token KLfull rollout（dense per-token）VLA-OPD更强 VLA teacher（固定外部）对称OPD（KL）full rollout（物理世界 rollout）**读这张表的方法**：竖着看任一列就是一条设计轴的全谱（如「散度选择」列一眼能看到 reverse KL 占绝大多数、对抗式 / rubric / contrastive 各只有一两篇）；横着看任一行就是一篇论文的四维坐标。

§4.2 的「主流默认 vs 稀缺探索」百分比即由本表逐行归类统计得出。