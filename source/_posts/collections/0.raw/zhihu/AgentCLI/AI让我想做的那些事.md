---
title: "AI让我想做的那些事"
date: 2026-04-28
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/2032462395763856843
---

[上一篇文章](https://zhuanlan.zhihu.com/p/2012947554678096288)发出去2个月了。 终于摸到浅水区的边界了。

我有很多想法，但以前都没有实现。 因为摩擦太大。 一件事要做，脑子跑的太快，已经把后续的麻烦都想了一遍，就不做了。

AI把摩擦去掉了。现在不管什么想法就直接开始。 很难吗？不难。我需要学什么，马上能学会。 我需要做什么，AI可以帮我做。 AI水平不够，一起和AI做工具，让它水平够。

对于一个ADHD人来说，这是很可怕的一件事。 以前一堆停下来没做的事情，现在全部可以重启了。 以前觉得一生都做不了的事，现在可能一星期就能做完。 每天东西都做的停不下来。 一个月做到原来需要10年才能做到的事。那岂不是有效寿命被大大提高。 足够多就接近永生了。

我所接触的人的AI使用水平早就超过99%的人类了，甚至99%的从业者。 但连浅水区都没游熟练。 很多人还在说自己遇到瓶颈。 根本不是瓶颈——直接问AI接下来怎么做就好，不要给自己加限制。 只要思维方式转变了，瓶颈少很多，要做的就是“教我要做什么，我去做”。

AI做日常任务，省时间不用说。 最近报税等常见的烦心事项，都利用AI来做。但还是很多事需要自己执行。这种落差，是游到了浅水区边界的人才能感受到。

想了一些蛮有兴趣的方向，都适合开创业。

自己的分身
很多人对AI的一大要求，就是完全了解自己、帮自己处理杂事的工具。

所以应该分两条线：知识靠外部 RAG，行为靠 fine-tuning。 RAG + personal wiki：把关于自己的内容都存进去，让 AI 随时查。 利用 fine-tuning 改说话方式、思维 process、用工具的习惯。 都不便宜。第一个要用很多tokens。

知识这条线的数据来源本身也是个问题。就算是你的数字数据——聊天记录、邮件——也只是你人生context的一小部分。你每天看到、听到的东西，绝大多数没有被记录下来。真正了解你，最终可能需要某种形式的lifelogging：持续的音频图像记录，让AI看到你每天看到的，听到你每天听到的。

fine-tuning一般人做不了——需要自己可控的模型。 最好的模型是越来越贵。最近，如Claude强制降智，让你花同样的钱得不到相同的结果。 Claude $200的max plan现在连一个bug都没搞完就5个小时token用光了。 有自己可控的模型，才能做自己的分身。

强化学习（RL）与加速
[上一篇文章](https://zhuanlan.zhihu.com/p/2012947554678096288)也提到Sutton的The Bitter Lesson，核心意思是：人类想出来的各种rules，最终在数据和算力面前全部失效。

那看起来LLM就是终局。这不就是数据和算力堆积起来的结果？ 但Sutton认为这想法是错的。因为LLM本质上还是从人类产生的数据里学习的。 对比一下，在AI围棋时代，最终的版本是AlphaZero。它完全不了解任何人类棋谱，从零开始自我对弈，最终可以轻松击败任何版本的AlphaGo（学习了大量人类对弈的版本）。两者本质上不同：一个被困在人类知识的上限里，一个可以超越它。 所以终极版应该是不从人类数据里学习的AI。

AI4Math是我很关注的领域。上篇很多判断没跟上——东西发展太快了。 我最近也开始用Aristotle这类工具，越用越觉得时间线比想象中短得多。 听了[洪乐潼的采访](https://link.zhihu.com/?target=https%3A//www.youtube.com/watch%3Fv%3D78Vyy_dzWXA)，很推荐。 她没说具体怎么做，但推测是： 对llm模型做post training，获得输入输出全是Lean的会推理的AI。 即使它推理不完美，写出的Lean代码也可以自动check。Feedback loop就是完全闭合的。 AlphaZero式的数学自我进化。 但暂时还不完全一样——现在还是要靠人类写的Lean代码来训练。

RL还有个推论：别争论，做实验。

数学可以靠逻辑推导，但现实世界里有太多假设，只有跑过才知道。 人类对世界的很多预测，看起来很聪明，其实很多都是错的，因为有太多我们没意识到的假设夹在里面。 RL绕开了这个问题，让实验结果说话。

AI现在的核心瓶颈在工程上。我们都没把工程做到极限。就算AI的研究完全停止，只要把工程做好，产出可能就能达到千倍。很多看起来很厉害的技术，原理都很简单。没有哪家公司做出了其他人无法复刻的东西。

feedback loop越快，品味越没用。想出了一个好方案，测试一下还是想出1000个差不多的方案去测试找到其中最好？只要过程够高效，品味不再是瓶颈，execution才是。要尽量让feedback loop越来越快。

OpenAI大量收购tooling公司，道理就在这：faster tooling = faster feedback loop。 加速很重要，需要让所有的代码都加速。

Multi-Agent和人类合作的界面
用RL的视角会意识到自己是feedback loop最慢的那个环节。 只要你in the loop，整个系统的速度上限就是你的速度。

正确的模式是：系统自己不断进化，你只在方向彻底跑偏时出手。像RL里你只需要定义好奖励，不需要手把手告诉它每一步怎么走。

但现在做不到。 现在太多harness，本质上都是对话驱动的：你说一件事，它做一件事，结束。 一般用户为了效率，那就多开窗口，控制多agent。最后也要有agent帮自己控制多个agent。

可是整个系统还是无法scale上去。多agent本身就是没好好解决的问题。甚至LLM在处理有dependency的并发任务时表现很差: 这类问题需要的是推理和优化，这不是它天然擅长的。但这个问题将来可能有解。涩谷十字路口同时3000人通过，没有人会撞到对方，靠的不是有人统一指挥，而是每个人都在遵循某种隐性规则。所以也许将来真的可以一堆 autonomous agent 扔在一起，然后期望它自己运转。但暂时大多时候的解决方法，还是有个global orchestrator，把每个agent限制在一个局限的范围里，靠控制来维持稳定。

自己的尝试
问题本来很简单：有一堆issues，AI都能解决。设计个系统，告诉agent要什么，然后去睡觉，一堆agent异步处理。

第一代叫 orc，当时纯粹是为了解决写代码问题的。做的是 gitea issue → code → verify → merge 这个 workflow。之前就跑通了，但是感觉它各种state management设计的不够好，然后非常的git dependent。于是我想应该弄一个更general的做任何任务的工具。

第二代是 pai + shou，名字合起来是”拍手”，设计更认真一些。shou 是 durable state machine 框架，负责执行具体 workflow，每个 step 要么是有状态的 session（AI agent 就是这类），要么是无状态的 function。pai 是调度层，管优先级、依赖、冲突，有 event queue 和各种 source adapter。pai是用来控制每一个shou。

我的使用方式就是说一些问题，跟agent说，agent把这些写成issue，然后让pai根据输入来决定做哪一些，然后分发给shou，触发workflow。可以十几个互相无关的issue同时被十几个agent解决。

做出来之后，作为演示给人看不错。 发现一些问题，跟agent聊聊，之后问题就被解决了，而且还有一定的可见度：因为agent会发PR，会comment。 但很奇怪：增加了并行，最终速度却几乎没变，且token消耗大了很多。 直接在claude code里用skills并行解决，和一大堆agent一样快。 仔细研究发现是因为每开一个新任务单元就要丢掉之前积累的context，等于一直在重新学习。

我设计一开始就有问题，我做的是workflow execution framework，每个agent之间都是独立的。但真正缺的是多agent task + context management framework。

另一个教训是隔离。就算是只是做workflow execution，成功快速的隔离并不简单。整个执行过程里，出问题最多的来自于处理隔离问题，Docker都不够。 现在我理解了，需要一种随时能开出来的VM。这才是正确方向，快速create/destroy lightweight VM，才是让multi-agent系统真正可用的基础设施。

未来
因为AI的context可以共享，context management也应该是多agent系统的一等公民。 好的multi-agent系统，要管任务和agent团队的context生命周期。 而这里面，agent应该也包括人类。

用AI这么久，我还是一个人和agent沟通。就算是多个agent，人只有我一个。而我要任何其他人加入，我又成为了瓶颈。 我们需要的系统，应该是多agent多人的协作系统。

一个持续异步运行的系统，有自己的task inbox，懂得优先级和依赖，不绑定特定的agent，你偶尔看dashboard或给点方向，而不是每次坐在对话框前面推进。 这个系统里，人和AI没有特别的不同，人只是比较缓慢、权限更大的AI。

这东西市场上还没有成熟的方案。 就不算agent，人类本身来说，这样的好东西都用不好。 大厂有Slack + Linear + Notion一整套。 但因为大多数时候没人管理KB，整个团队context还是破碎不堪，新人学习还是找老人获得context。 有了AI，直接把AI接入，天天读所有context保证最新，教人该知道什么。

这些平台都在快速向AI native转型，如[Linear](https://link.zhihu.com/?target=https%3A//linear.app/next)。甚至感觉在整合。这几个工具看起来不一样，实际上都是shared context manager（包括人和机器）。所以这几种工具的最终整合应该距离不远。

光是写代码这一件事，Github Next的[Ace](https://link.zhihu.com/?target=https%3A//www.youtube.com/watch%3Fv%3DClWD8OEYgp8)已经非常接近了。Ace 解决了两个核心：一是 multiplayer——多人在同一个 context 里规划执行，agent 是共享的；二是 sandboxed micro VM——每个任务在独立的轻量 VM 里跑，可以随时 branch，随时销毁，隔离 问题真正解决了。

但Ace还是代码专属的。我想要的更夸张：不只是代码，而是任何 workflow——写论文、做决策、管项目——都能把 agent embed 进去。这才是真正的 agentic OS。人和 AI 的区别，只是速度和权限。

我的每日工作

研究
上一篇文章里特别提到了自己的研究问题GPT 5.2-Pro解决不了。不过那是上个时代的问题了，几天后GPT 5.4-Pro出来了，80分钟解决了它（答案：那个问题和Exact Matching是等价的，所以暂时确定性多项式时间算法较难获得）。GPT 5.5-Pro出来之后可以20分钟得到结果。

5.4最大的新闻：GPT 5.4-Pro终于完美解决了[Erdős primitive set conjecture](https://link.zhihu.com/?target=https%3A//www.erdosproblems.com/forum/thread/1196)。这个问题非常有名的，上一个improve这个结果的[Lichtman](https://link.zhihu.com/?target=https%3A//mathematics.stanford.edu/people/jared-duker-lichtman)，发了堪比数学四大的Forum of Mathematics, Pi——但那只是基本的上界，最优的 1+o(1) 版本当时还没做到。有兴趣的话看看[Lichtman的回复](https://link.zhihu.com/?target=https%3A//www.erdosproblems.com/forum/thread/1196%23post-5374)。

研究有两种：有意思的和重要的。我做有意思的那种。 自从5.4-Pro出来，我不再是从头到尾自己证明一切，而是我想一些猜想和可能的解法，让AI去探索。一小时之内可以做到以前要花十小时的事情。 以前灵机一动想到什么，自己花几个小时钻研，通过探索的过程发现错误，那个过程本身是好玩的。 现在AI直接告诉你答案，那种乐趣有点消失了。

我现在像个指导兼翻译：根据AI的发现，理解了之后给出指导，直到AI得出最终结果。 AI用的不是人类的思维方式，我拿到之后需要翻译成人话——但这件事谁都可以做。

我也怀疑自己的指导有没有用。现在可能有点用，未来可能意义也不大了。 我写文章的意义也越来越小了。

写作
这段时间刚提交了一批论文，大量在用AI写作。模式是让AI写出大部分内容，然后自己调整。 这过程很痛苦。

写作的feedback loop和coding有个本质区别：文字本身就是产品，你一看就能判断，想改直接改，自己动手的速度远快于给AI说”改一下这里”。AI反而是修改循环里最慢的环节。

这当然还是延迟和体验问题。迟早会解决的。

每次改动，都在教AI你的taste。我当然希望AI写出来，一看就差不多。 这件事很难：自己写的东西都需要改，不能指望AI一遍成功。但方向是对的，它可以通过你的修改的总结，来越来越了解你的风格。

但最终要完全符合自己的taste，纯context injection是不够的。还是要做点fine-tuning。

我以前就觉得改文章很痛苦。想过给数学家用的写作工具，算是写数学文档的Typora：[chickenglass](https://link.zhihu.com/?target=https%3A//hackmd.io/%40Oi4-wmorQSiPFwJYGI5tfw/rkaABCJg9)。而AI来了之后，我就真的把它写出来了（bug很多），也顺便改名了叫做[Coflat](https://link.zhihu.com/?target=https%3A//github.com/chaoxu/coflat)。下面是视频（视频是AI帮忙生成的）。

[
![](https://picx.zhimg.com/v2-029e82f47c33666a5eeaddc6ec33c809.jpg?source=382ee89a)https://www.zhihu.com/video/2032462524558356843](https://link.zhihu.com/?target=https%3A//www.zhihu.com/video/2032462524558356843)Coflat让修改过程顺畅一点。毕竟它本身不是为了从头到尾的写作，因为AI已经成为了第一个draft的创建者了。而是成为了一个修改的工具。

这几件事，每一件我都真的想做。有的已经开始动了，有的还停在脑子里。以前可能就放弃了——现在不会了。