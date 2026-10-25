---
id: 84378245-f5dc-4af1-a23f-582287fbbba7
---

# 从长期记忆的角度谈Agent - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/agent-18f5b286adc)
[Read Original](https://zhuanlan.zhihu.com/p/682593028)



2.1 什么是Autonomous Agents？

4\. Autonomous Agents和Agent Simulations依赖LLM的能力

6.1 Retrieval Augmentation

## 1\. 为什么需要长期记忆？

在一个科幻故事中，有一个患有失忆症的角色，每天早上醒来对过去都没有任何回忆。 为了克服这个问题，这个角色设计了一个聪明的技巧：在床上方的引导图片每天更新新的任务和结果。  
类似地，LLM 由于受限于输入提示的大小，面临着同样的挑战。 为了解决这个问题，一种解决方案是在其输出中重复 LLM 需要记住的信息，从而有效地创建一个暂存器，它可以在其中存储数据以供将来使用。  
然而，创建这样一个提示便签本并不是一项简单的任务，可能面临如下问题：

* 受限于 token 数量；
* 缺少“Context”；
* hallucination 的问题。

  
此外，基于LLM native 应用有几个重要元素：**LLM + 交互 + 记忆（专有数据 + 个性化），故需要LLM的长期记忆能力，构建Autonomous Agents（自主智能体）和Agent Simulations（智能体模拟器）。**  

## 2\. Autonomous Agents

为了阅读的连续性，先简单地介绍一下Autonomous Agents以及流行的几个项目。如果对Autonomous Agents已经有认知了，可以直接本节进行阅读。

###   
2.1 什么是Autonomous Agents？

  
在这里，采用Matt Schlicht的[《The Complete Beginners Guide To Autonomous Agents》](https://www.mattprd.com/p/the-complete-beginners-guide-to-autonomous-agents)这篇文章里面的定义。

> Autonomous agents are programs, powered by AI, that when given an objective are able to create tasks for themselves, complete tasks, create new tasks, reprioritize their task list, complete the new top task, and loop until their objective is reached.

  
大概就是你给Autonomous Agents一个任务，比如发一个关于Autonomous Agents最新进展的twitter。他会先去理解分解这个任务目标，然后设定实施计划以及这几个计划的优先级，同时去辩证『冷静』的反思计划有没有漏洞，并将反思应用到执行过程中，然后就是自己不断的去换着关键词搜索总结最近的报道文章，然后是汇总、反思，看看有没有什么遗漏，最后组织成适合推文的语言自动发送。全过程人类的输入可能就只有最开始不到100字的一个命令。是不是想象空间很大？  
这边用一张BabyAGI的流程图来直观展现这个过程，具体如下。  

1. agent查看目标，使用 OpenAI 的 GPT-4 等LLM模型，使其能够理解正在阅读的内容，并提出第一个任务。 “任务：在谷歌上搜索与 Twitter 相关的新闻”。
2. 然后agent在谷歌上搜索 Twitter 新闻，找到热门文章，并返回一个链接列表。 第一个任务完成。
3. 现在agent回顾它的主要目标（找到关于 Twitter 的最新消息，然后发送摘要）和它刚刚完成的事情（得到一堆关于 Twitter 的新闻链接）并决定它的下一个任务需要是什么 .
4. agent提出了两个新任务。 1）写新闻摘要。 2) 阅读通过谷歌找到的新闻链接的内容。
5. 现在agent在继续之前停止了一秒钟，它需要确保这些任务的顺序正确。 真的应该先写摘要吗？ 不，它决定了最优先阅读通过google找到的新闻链接的内容。
6. agent从文章中读取内容，然后再次返回待办事项列表。 它想添加一个新任务来总结内容，但该任务已经在待办事项列表中，所以它没有添加它。
7. agent检查待办事项列表，唯一剩下的项目是总结它阅读的内容，所以它这样做了。 它会按照您的要求向您发送摘要。

![](https://proxy-prod.omnivore-image-cache.app/680x475,s8dDr9TLDarXoab8tAs2R0KOtDKmwFGuqjMQqxSGV1yM/https://pic2.zhimg.com/v2-bd2202ab50e0896742ccdcdd099266c5_b.jpg)

从上述的描述可以看出，Autonomous Agents核心技术点：**LLM + Long-term Memory + 递归的思想**。其中，LLM是其最核心的能力，无论推理还是问答以及后续的Prompt工程，都强依赖于LLM的能力。Long-term Memory是LLM固有的一个缺点，当然也是Autonomous Agents需要去克服的一个点，后续章节会详细介绍。

###   
2.2 流行的Autonomous Agents  

  
**2.2.1 [Langchain](https://github.com/hwchase17/langchain)**  
Langchain是Autonomous Agents的鼻祖，目标是辅助大家开发LLM应用，Agents、Tools、Plugin、Memory、Data Augmented早早地就提出开源了，为Autonomous Agents生态的爆发奠定了非常扎实的工作基础，值得给予最大的respect！

  
**2.2.2 [Visual-ChatGPT](https://github.com/microsoft/TaskMatrix)**   
Visual-ChatGPT实际上是最简单的一种Autonomous Agents的项目，现已和微软另一个工作TaskMatrix.AI合并成为TaskMatrix，范围仅限于Visual Foundation Models，这种形态的项目，虽然能力边界小，但是LLM的负担是最轻的，每一个步骤以及流程是更加的可控，可能总共就只需要十几二十个流程。未来这种形态的工具或者产品对于各种垂直领域来说可能是更为常见的。  

![](https://proxy-prod.omnivore-image-cache.app/946x742,spHUg0JJGA2Ge13uSMBuU_Il6RDiB6w2kYZiy8BqwjQ8/https://pic1.zhimg.com/v2-6a90acd5cbdafc6167d058f9bac38334_b.jpg)

  
**2.2.3 [HuggingGPT](https://github.com/microsoft/JARVIS)**  
微软联手HuggingFace构建HuggingGPT项目。它是微软一脉相承的工作，用LLM以及Prompt工程阶段性的解决多模态问题，核心思路是通过LLM的理解以及推理能力，分配相应的任务给对应的模型，比如：文生图的任务分配给Stable Diffusion模型、图生图分配给ControlNet、图文问答分配给Blip等等，不过只能算是初级的autonomous agents，还没有较为明显的continuous或者Autonomous的任务编排机制。  

![](https://proxy-prod.omnivore-image-cache.app/2020x902,sjTA2omBq_RmkUMfCZemxNry9dpTeBJizfyk57c5glSM/https://pic3.zhimg.com/v2-bc7593ef4bcdfe9adb64b7f817b3bc02_b.jpg)

  
从上图可以看出，实际上HuggingGPT的agent的范围是huggingface所有模型。HuggingGPT将LLM as Controller，整个过程总结为4步：

* 任务规划：利用ChatGPT分析用户的请求，了解用户的意图，通过提示分解成可能解决的任务。
* 模型选择：为解决计划任务，ChatGPT 根据模型描述选择托管在Hugging Face 上的专家模型。
* 任务执行：调用并执行每个选定的模型，并将结果返回给ChatGPT。
* 生成结果：最后，使用ChatGPT整合所有模型的预测，为用户生成答案。

HuggingGPT的模式可控性也比较高，而且模型都是放在HuggingFace上进行托管的，输入输出的形式上也是一致的，用户使用以及代码维护都更为方便一些。

  
**2.2.4 [AutoGPT](https://github.com/Significant-Gravitas/Auto-GPT)**  
Auto-GPT 是一个实验性开源应用程序，展示了 GPT-4 语言模型的功能。该程序由 GPT-4 驱动，将 LLM 的“思想”链接在一起，以自主实现你设定的任何目标。作为 GPT-4 完全自主运行的首批示例之一，Auto-GPT 突破了 AI 的可能性界限。  

![](https://proxy-prod.omnivore-image-cache.app/1440x744,sTXq-AjSnA1U_769181FqsbCyiYiY6VHmagxtEMJ_Pb8/https://pic3.zhimg.com/v2-2db7041bef9681cc1d7e8624cfaf5f6a_b.jpg)

  
从上图中可以看出，AutoGPT其实就是通过LLM反思input->plan->assign->collect->output整个过程，并且重新规划plan，从而产生一直迭代的auto效果。从外部的表现形式上来看，整个系统不断的交替进行plan和reflect，已经出现了自我思考自我迭代的过程。这实际上已经到了autonomous agents的范畴了。

  
**2.2.5 [BabyAGI](https://github.com/yoheinakajima/babyagi)**  
BabyAGI 是一种将 OpenAI 最新的大型语言模型 GPT-4 转换为能够在互联网上执行一系列任务的数字助理的软件。与其他简单地根据提示生成单词的语言模型不同，BabyAGI 可以完成特定的操作，例如计划和执行活动以增加用户的 Twitter 关注或创建和运行内容营销业务。它是更广泛的开源软件 AutoGPT 的一部分。  
如下图所示，通过执行以下步骤的无限循环来工作：

1. 从任务列表中提取第一个任务。
2. 将任务发送给执行智能体，执行智能体使用 OpenAI 的 API 根据上下文完成任务。
3. 丰富结果并将其存储在Vector DB（Chroma/Weaviate） 中。
4. 创建新任务并根据目标和先前任务的结果重新排列任务列表的优先级。

![](https://proxy-prod.omnivore-image-cache.app/2978x2205,siwR4OYWtZrofwhXPMORap26eXgdDBfNnkbQ_bZ3CvAU/https://pic4.zhimg.com/v2-d4c28ed908021a13211e61dafaffbda3_b.jpg)

**2.2.6 [NexusGPT](https://nexus.snikpic.io/)**  
最近，开发者沿着这个思路做了一个NexusGPT项目，简单理解就是每个Agent实际上可以认为是一个人，每个Agent擅长不同的事情，那么一个庞大的组织架构可以通过雇佣擅长各种能力的Agent来维持组织的正常运转。  
从各个方面来说，AI的发展需要或者会朝着AI平权(民主)、AI个性化的角度去发展，即让人人都可以享受AI的便利，人人都有一个自己的AI助理！而这个对应的就是Autonomous Agents。  
未来可能每个人或自己制作极度个性化的Autonomous Agents，当然也可以选择『雇佣』一些『专业』的Autonomous Agents来临时的完成自己或者公司需要的某些任务。  
NexusGPT——世界首个人工智能自由职业者平台！这里的自由职业者不是真人！其实背后都是一个个Autonomous Agents，不过他们在不同领域的数据集上进行了Finetune或者接入了不同的特殊能力的API，让他们成为了一个个充满个性的AI Agents！而这些Agents可以被雇佣成为你的助手！而你也可以将自己的AI助理派发到这个平台去进行『求职』！

![](https://proxy-prod.omnivore-image-cache.app/2246x1314,sj2ru6MVZz3ItHEDBG56EIzvfKeCXbKoGVaUHUBYvfDo/https://pic1.zhimg.com/v2-37e850061122612876bcbeedff2ac3f0_b.jpg)

  
**2.2.7 悟空**  
悟空是自主研发的Autonomous Agents。它除了具有LLM提供的基础语言能力，还具备长期记忆能力和接入第三方API能力以及基于文档的个性化数据理解能力。不过只能算是初级的autonomous agents，在之后的章节会详细介绍。

## **3\. Agent Simulations**

### 3.1 什么是Agent Simulations

  
Agent Simulations（智能体模拟器）是通过计算机模拟来理解复杂的智能体交互的问题。它涉及多个智能体之间相互交互。 智能体模拟器通常涉及两个主要部分：长期记忆和仿真环境。

###   
3.2 流行的Agent Simulations  

**3.2.1 [CAMEL](https://github.com/lightaime/camel)**  
CAMEL提出了一个名为 "角色扮演 "的新型交际智能体框架，它利用LLM的理解能力，促进智能体之间的自主合作，并提供对其 "认知 "过程进行洞察的能力。该方法包括使用概念提示来引导聊天智能体完成任务，同时保持与人类意图的一致性。并展示了角色扮演如何被用来产生对话数据，为研究对话语言模型提供了宝贵的资源。此外，它也为研究多智能体系统的合作行为和能力提供一个可扩展的方法。  

![](https://proxy-prod.omnivore-image-cache.app/2676x1528,sFIAMsJuB8-LaAGcxHRWhmDeGzOexnI5R74CCjjyyJq4/https://pic2.zhimg.com/v2-6add9bd94bd320d428162fd31713930d_b.jpg)

  
**3.2.2 [Generative Agents](https://arxiv.org/pdf/2304.03442)**  
Generative Agents是斯坦福和谷歌的研究者们利用人工智能创造出的生成式智能体。它是一种基于深度强化学习的方法，可以模拟人类在特定环境下的行为。该方法通过创建一个虚拟角色，并使用深度神经网络进行训练，使其能够模仿人类在某些任务上的决策过程。生成式智能体可以被看作是一种“虚拟人类”。生成式智能体的训练有两个阶段。在第一阶段中，生成式智能体会被赋予一个目标和一组任务，例如在游戏中获得最高分数或者完成特定任务。此时，生成式智能体不会立即开始执行任务，而是会观察并学习来自其他玩家的行为和策略，以便能够更好地适应任务要求。在第二阶段中，生成式智能体开始执行任务，并通过与环境互动来不断优化其行为。生成式智能体的决策是由一个深度神经网络产生的，这个神经网络接收环境信息并输出下一步的动作。在每次互动结束后，生成式智能体会根据任务的目标和奖励信号来更新其神经网络，以便更好地适应任务要求。  

![](https://proxy-prod.omnivore-image-cache.app/1440x771,sql8ALe45vgwO95eY5P8EISF2oAtI5bc7OKbuB7fao78/https://pic2.zhimg.com/v2-8784f305b7b0207ed46420fe65187ad5_b.jpg)

## 4\. Autonomous Agents和Agent Simulations依赖LLM的能力

![](https://proxy-prod.omnivore-image-cache.app/1556x1350,s86suwfS_5HxwPSQf-tzgRy3mavrywMzgkPNfzvhPpWc/https://pic4.zhimg.com/v2-f221cf87582c4e697be2f6660f77c0f7_b.jpg)

## 5\. 向量数据库

由于后续会大量涉及此概念，同时为了阅读的连续性，这里向大家推荐看一下[《大模型引发爆发增长的向量数据库》](https://mp.weixin.qq.com/s/Brmzkw9oH%5FmiPwwlODYeSw)文章。如果对向量数据库已经有认知了，可以直接跳过本节进行阅读。

## 6\. 悟空

悟空是自主研发的Autonomous Agents。它是使用了LLM来提供基础语言能力，VectorDB 来提供记忆能力，通过langchain等将其集成。它的整体流程图如下图所示。

![](https://proxy-prod.omnivore-image-cache.app/720x720,sQg4oZV4d2wh3Q3uzwayNe0DuyyyjAGXufdm6RWj7GOs/https://pic1.zhimg.com/v2-3d5968b0fd24f8aac748a7d3f346a0a4_b.jpg)

###   
6.1 Retrieval Augmentation

  
悟空采用的记忆方案是 Retrieval Augmentation，它通过外部储存来增强模型记忆。当模型需要记忆大量的聊天记录甚至一整个行业知识库时，将其储存在向量数据库中，后续按需去获取最相关的信息。每次用户输入 prompt 时，从外部记忆中找到最相关的内容和 prompt 一起输入给模型，得到的生成内容会更有针对性且减少了 **hallucination 的问题**。  
悟空的核心其实都是为了更好的管理记忆：**短期记忆（Memory）和 长期记忆（History）**。记忆的管理策略是按**最近的短期记忆（Memory）**和**最相关的长期记忆（History）**的方式来组织LLM的记忆，以达到Prompt Loop 在Token限制下也能按越来越趋近完成的方式来运转。 

  
**6.1.1 短期记忆（Memory）**

  
多轮对话的历史，我们常称为 **短期记忆**，它可以视为提示（prompt）的一部分。短期记忆可以帮我们塑造不同性格和能力的LLM。虽然大家使用的LLM的参数都是同样的，但不同的短期记忆能把 LLM「调教」成不同的性格，塑造成不同的工具。  

![](https://proxy-prod.omnivore-image-cache.app/1112x738,s3bsMV_aozZA9c4fbn-xJbskidorOsb-rEbOTrTN74uA/https://pic2.zhimg.com/v2-ef9d85277333e74f1e533874d003d82d_b.jpg)

  
短期记忆确实可以帮助我们打造不同性格和能力的LLM，但是存在两个问题：  

1. 每次与 LLM 的交互都会带上之前的对话内容（除非重新开启一次对话，此时 LLM 的短期记忆相当于被清空）。随着对话轮数的增加，所需的 token 数量会越来越多。因为输入的提示（即历史对话）也会占用 token 的消耗量，因为它们将进入神经网络参与计算。
2. 随着与LLM 的对话轮数增加，短期记忆的内容也会增加。然而，LLM 使用的神经网络结构的输入是有限的。目前，序列猴子最多只能包含 2048 个 token。

  
要解决短期记忆持续膨胀的问题，可以采取尽可能减少短期记忆 token 数量的方法。但是需要确保尽可能保留短期记忆的核心内容。悟空是按最近的Memory的方式来组织短期机制。具体是选择一个窗口，只保留最近 k 轮对话内容。  

![](https://proxy-prod.omnivore-image-cache.app/2040x834,s199Xm2Lx3AK4wc6-ss3I7faCOh0lQ6BBG7xLUkzHDw0/https://pic4.zhimg.com/v2-0b2b3057354d93113f3d30bb146c3fc3_b.jpg)

  
注意这个策略基于如下假设：过于久远的对话不太重要，而距离当前时间更近的对话则更加重要。

  
**6.1.2 长期记忆（History）**

  
长期记忆是短期记忆的相对概念。短期记忆的生命周期只存在于一次会话中，当会话完全结束后，短期记忆就不存在了。而长期记忆可以一直存储和访问。就像人类大脑会对一些重要信息进行长期记忆一样。  
实现长期记忆最好的方法是将整个LLM进行 finetune，将您想要它记住和理解的内容调整到模型的权重中。然而，finetune 会带来两个挑战。一方面，finetune 对数据量有一定的要求，数据量过小难以获得好的效果。另一方面，finetune 对算力的要求非常高。  
那么，除了 finetune，还有其他的方法来存储长期记忆吗？答案是有的。最简单的方法是将长期记忆存储在外部数据库中，当与LLM开始对话时，从数据库中提取长期记忆，并将其作为提示(prompt)输入到LLM中。这种方法理论上可以解决长期记忆的问题，本质上是通过上下文学习完全代替 finetune。  
下面以一个具体的案例介绍一下，悟空的做法。  

1. 假设我们希望LLM记住的长期记忆是一个文档，首先我们将文档进行分片，将文档拆分成一份份的，每一份的 token 数不会太大，以保证每一份都能完全塞入LLM中。
2. 紧接着我们利用Embeddings API 将每一份文档进行编码。这个Embeddings API 输入的是文档，输出的是一个向量编码。这个向量编码可以理解为神经网络对文档内容进行了高度的压缩。然后我们将编码的结果存储在向量数据库（Faiss）中。向量数据库是一种特殊的数据库，它的键是向量而不是一个数。在我们的场景下，这个向量数据库的键是文档的向量，对应的值是对应的文档。
3. 当用户向LLM提出一个问题时，我们先将他的提问文本塞入到之前的Embeddings API 中，该Embeddings API 将用户的提问编码成向量。然后将编码的向量去向量数据库中查询，查询的结果是和提问编码向量最相关的向量（这里的相关一般是指向量的余弦相似度或欧氏距离）。然后我们将查询到的向量对应的文档作为提示（prompt）给到LLM，至此我们完成了长期记忆的查询。

> **为什么使用Faiss作为向量数据库？**  
> 尽管 LLM native项目的创新带动了 Pinecone等用户数的大热，但这个使用场景对 Pinecone 等数据库的使用是略有浪费的。具体，对最近邻进行穷举搜索（也就是 256 维向量与 10000（索引大小） x 256 矩阵之间的点积）用时仅需不到一秒钟。与LLM动辄 10 秒钟的调用速度比起来，对向量搜索这 1 秒的一步，优化到上限也只有加速 10%。也难怪 Andrej Karpathy（前特斯拉总监，OpenAI 的创始成员和研究科学家） 会在 Twitter 上表示自己存储和检索向量，使用的是 Python Numpy 库中的 array 函数，并吐槽人们会过度追求新鲜的事物。  
> 从性能方面来看，Faiss、Pinecone、Milvus和Zilliz（Zilliz 拥有双重身份，它不仅仅是 Milvus 背后的商业公司，也拥有 Zilliz Cloud 这样的云原生向量数据库服务产品）都是高性能的向量检索引擎，可以满足大规模向量检索的需求。其中，Faiss和Milvus都有多年的开源历史，并在实践中得到了广泛应用。Pinecone和Zilliz则是相对较新的产品，但也得到了业界的关注和认可。因此，在性能方面，这四款产品的差异不大，可以根据具体应用场景选择。  
> Faiss是一款基于C++的库，可以直接嵌入到应用程序中使用，也可以通过Python的接口来使用，支持多种向量距离计算方法和索引算法，可以根据不同的数据类型和查询需求进行定制化配置。另外，Faiss还具有良好的文档和社区支持。

  
 **6.1.3 文档检索（Knowledge）**  
悟空能同时基于对话历史记录和用户上传的文档进行问答。当用户上传了文档后，会自动对该文档构建向量索引。具体流程如下：

* **切片**

由于文档内容可能会过长，因此需要先对文档进行切片，将其切分成多个chunk。每个chunk作为一条记录。为了在切分chunk时保证句子的完整性，首先使用分割符将文档内容切分成最小粒度的文本，分割符如下：

```json
["\n", "。", "？", "?", "；", ";", ",", "，", " "]
```

  
在切分时，遍历文档中的每个字符，当遇到如上所示分割符时，即将文本切开。然后依次将各个最小粒度的文本块拼接起来。每拼接一个块前，先计算拼接后的长度，如果长度没有超过预设的最大chunk大小，则执行拼接。否则，将拼接前的内容作为一个chunk，准备拼接的内容作为新chunk的开始部分。

* **构建向量索引**

当整个文档被切分成多个chunk后，即可构建向量索引。调用Embeddings API 编码成向量，然后将其插入到向量数据库中。 

 **6.1.4 Prompt的组成**

  
当用户输入query后，悟空会依次执行文档检索、获取短期对话记忆、获取长期对话记忆，并构建最终的context，和query一起组成prompt输入到模型中生成回复内容。

* **文档检索**

利用用户的query，在文档向量索引中进行检索，召回和用户query最相关的文档内容，为模型生成回答提供更多相关的信息。召回文本的数量可通过参数动态设置。

* **获取短期对话记忆**

短期对话记忆可直接从Memory中读取，该Memory保存了用户最新的k轮对话记忆，可提供最新的上下文对话信息。

* **获取长期对话记忆**

利用用户的query，在长期对话记忆向量索引中进行检索，查找长期对话记忆中和该query最相关的历史问答，以增强模型的记忆功能，实现对长期对话信息的检索。由于对话信息有时效性，时间越近，其可靠性越高，因此当召回条数大于1时，将召回结果按时间先后顺序排列，使越新的对话记录在prompt中离用户query越近。 

当获取到了以上信息，即可构建context，并和当前query一起构建最终的prompt，如下所示：

```awk
""" 
{role} 
从下文中提取有用的内容进行回答，如果不在下文提到的内容，可以生成相关的内容。 
{knowledge} 
{history} 
{memory} 
问题：{query} 
回答： 
"""
 
```

其中，role是角色描述，用来对系统进行角色设定，例如：“你现在扮演一个秘书。你的任务是：能帮我分析文章内容。你说话的风格：语句精炼，内容简洁。你能帮我记录我说过的话，在接下来的对话中我可以查询这些对话内容。”

* knowledge是从用户上传的文档中检索到的内容，默认返回4条，将其以"\\n"拼接起来。
* history是从长期对话记忆中检索到的和当前query最新相关的问答对，默认由两个问答对组成。按时间先后顺序排列。
* memory是当前session中最新的K轮对话，默认3轮，按时间先后顺序排列。
* query是用户当前轮的输入。

最终，模型的输入如下所示。该输入将多轮对话信息和文档检索结果融合在一起，以单轮问答的方式输入给模型。

```angelscript
你现在扮演一个秘书。你的任务是：能帮我分析文章内容。你说话的风格：语句精炼，内容简洁。你能帮我记录我说过的话，在接下来的对话中我可以查询这些对话内容。
从下文中提取有用的内容进行回答，如果不在下文提到的内容，可以生成相关的内容。
我一会儿要去买什么
您一会儿需要去买的东西是土豆、白菜和猪肉。
记一下端午节是6月3日
端午节是每年的农历五月初五，对应阳历的日期会有所不同，今年（2023年）的端午节是在6月3日。
帮我记一下一会要去超市
好的，请告诉我您需要去超市购买什么物品，我会帮您记录下来。
土豆白菜西红柿
您要去超市购买土豆、白菜和西红柿。
问题：一会儿去超市干嘛呀
回答：
```

  
 **6.1.5 Token控制**  
理论上在每次LLM调用时，我们会依次执行文档检索、获取短期对话记忆、获取长期对话记忆，将上述信息全部加入到上下文是最佳的，但实际上LLM是有 Token 调用上限的，以悟空内部使用的序列猴子为例，它就有2048的 Token 限制。

悟空采用的做法非常暴力，当prompt的长度超过了最大长度时，需要对其进行处理，具体策略如下：  

![](https://proxy-prod.omnivore-image-cache.app/720x1019,scTVhm2LN_D2wr_146dS2xJ4oaUAGTr90yZ2XK-ic52Q/https://pic2.zhimg.com/v2-adce4ae490285651eb4ffd7f6119a809_b.jpg)

1. 对文档的检索结果进行截断，只保留一条，同时计算prompt长度，如果仍然超长；
2. 对memory进行截断，只保留一轮对话内容，并计算prompt长度，如果仍然超长；
3. 对memory进行summary，注意这里summary是预先计算，起到加速作用，之后计算prompt长度，如果仍然超长；
4. 只保留history，因为history是基于所有的对话历史记录构建的，本身也包括最新的k轮对话，区别在于基于history只召回最相关的问答对，而memory不考虑相关性，只保留最近的k轮对话。如果此时长度还超过了最大长度限制，则history也会丢弃，只保留一条文档检索结果。

###   **6.2 重点**

**6.2.1 如何更好地解决短期记忆的问题**  

* **方案1：**

利用LLM强大的文本摘要能力，将对话历史和新增的互动内容进行摘要提取。  

![](https://proxy-prod.omnivore-image-cache.app/2124x578,sB_meH8fpVWWysFxq0T3A_hXRcMyCnzyOGezsnKf9u34/https://pic3.zhimg.com/v2-f601877f19d422ff2753a8b403142f86_b.jpg)

  
甚至我们在用LLM给对话历史做摘要的时候，还可以设定要求，要求它把生成的 token 数量控制在一定范围内，这样我们就能和 LLM永远对话下去。但需要注意的是，随着对话轮数的增多，必然有一部分信息会被过滤掉。  

* **方案2：**

已有的方案与方案1结合，只对最近 k 轮对话进行文本摘要的提取。这进一步的压缩了短期记忆的 token 数。 甚至设计一些更复杂的短期记忆压缩方案。例如通过实体抽取将对话中的重要实体和内容抽取出来，利用知识图谱将对话中的关系对组织出来等等。

**6.2.2 压缩prompt，更有效率地使用模型的context**

首先考虑经典的论文问答任务。prompt一般会包含问题和背景文章。而我们可以想象，对于LLM来说，背景文章中包含了许多的冗余内容：比如对论文背景的介绍，对论文相关工作的介绍等。这些内容往往是为了照顾不了解背景的读者而添加，不过由于LLM在训练的过程中很大概率已经见到过类似内容的文本，所以这些内容并没有带来新的信息。

目前，萨里大学的最新工作《[Unlocking Context Constraints of LLMs: Enhancing Context Efficiency of LLMs with Self-Information-Based Content Filtering](https://arxiv.org/pdf/2304.12102.pdf)》已经发现，即使相关内容被删掉，GPT仍然给出了几乎相同的答案。原因很简单，删去的内容GPT已经学习过，所以并没有新知识/内容的介入。即使删去也不会影响GPT给出正确答案。根据这一发现，他们采用self-information来确定需要压缩的内容。可以通过删去没有新内容（less informative）的方式来压缩prompt，从而在有限的context中放入尽可能多的内容。

  
**6.2.3 向量搜索与传统搜索融合**

  
向量搜索就是在海量存储的向量中找到最符合要求的 k 个目标。当我想从文本库中找出与“出门问问最新动态”最相关的 5 段文本时，首先会使用Embedding api 将出门问问的所有文章加工成向量，存入向量数据库中；然后把“出门问问最新动态”的向量与数据库中所有向量进行语义相似度的对比；比对后，对相似度排名返回 top 5 的文本，很可能来自之前的所见所闻。  
理解了这个过程，我们会发现向量搜索和传统搜索的查找最大区别在于：传统搜索是精确的索引，查找到的内容是有正确答案的。也就是说，数据库中的数据只有两类，一类是符合查询要求、返回给用户的数据，另一类就是不符合要求。而**向量搜索则是模糊的匹配，找到的是相对最符合需求的数据，并没有精确的标准答案。**在某些需要精准记录聊天内容的场景（“帮我记录一下下午两点和XXX开会的内容”），向量搜索暴露出不足。因此，我们正在尝试将两种搜索模式进行融合。此外，我们还考虑进一步改进，融合第三方search API（Bing Search、Google Search），解决向量召回不足和时效性的问题。

###   
6.3 一些思考

  
单次的记忆增强很好的发挥了LLM 的信息整合能力，通过领域知识避免了 Hallucination。但这种方式没有充分挖掘其高阶的逻辑链（Chain of Thought）能力，因此最近的学术论文 ReAct、Reflexion，和开源项目 AutoGPT、BabyAGI 就在这个能力和记忆的结合下功夫。我们下一步准备尝试下相关方案。  

## 7\. 写在最后

> “**AI agents will be everywhere. Billion-dollar companies will come from a small team that deploys ai agents.**”   
> Ben Tossell, Founders of Ben’s Bites AI Newsletter

