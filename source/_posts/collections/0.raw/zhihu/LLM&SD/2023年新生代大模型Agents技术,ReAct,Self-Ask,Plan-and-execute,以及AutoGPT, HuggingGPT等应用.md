---
title: 2023年新生代大模型Agents技术,ReAct,Self-Ask,Plan-and-execute,以及AutoGPT, HuggingGPT等应用
date: "2024-01-14 00:00:00"
updated: "2024-01-14 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/2023年新生代大模型Agents技术,ReAct,Self-Ask,Plan-and-execute,以及AutoGPT,-HuggingGPT等应用/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/642357544
---


先简单的说一下，最近研究了大模型Agents的技术，其实本质上就是写prompt，让模型仿照你的方式来进行执行的一种应用范式，prompt里面包含一些tools的描述，然后我们可以根据模型的输出使用一些外部tools(例如计算器，搜索API，数据库，程序接口，各种模型的API)，能使用外部的API，知识库，那大模型就厉害了，只要写好prompt，几乎能干游戏，机器人控制，RPA等所有的事情了。我们可以总结一下，一个包含Agents自主智能体的系统如下图所示，通过tools让大模型获取外部输入，通过prompts来驱动LLM得到我们想要的输出：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_13d268f643c6.jpg)

简而言之，Agent可以访问一套工具(Tool)，并根据用户输入确定要使用哪些工具。Agent可以使用多个工具，并使用一个工具的输出作为下一个工具的输入。目前有两种类型的Agents：

- Action agents: 在每个时间步长，使用所有先前操作的输出来决定下一个操作.
- Plan-and-execute agents：预先决定完整的行动顺序，然后在不更新计划的情况下全部执行。
Action Agents适合小型的任务，而plan-and-execute agents更适合需要保持长期目标的复杂任务，通常最好的方法是通过让plan-and-execute agent使用action agents来执行计划，将action agents的动态性与plan-and-execute agent的计划能力相结合。

### Agent 类型

#### ReAct

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_207645a49b43.jpg)

ReAct本质上就是把融合了Reasoning和Acting的一种范式，推理过程是浅显易懂，仅仅包含thought-action-observation步骤，很容易判断推理的过程的正确性，使用ReAct做决策甚至超过了强化学习，上图显示的是四种prompt方法的比较，（1）第一种是标准的，第二种是Chain-of-thought（仅推理），图c是仅执行。（d）是ReAct，解决了一个HotpotQA的问题；（2）比较了Act-only和ReAct的方法来解决AlfWorld游戏的问题。总之，chain-of-thought推理是一个静态的黑盒，它没有用到外部的知识，所以在推理过程中会出现事实幻想（fact hallucination）和错误传递（error  propagation）的问题。Act-only的方法很显然就是没有利用LLM的推理能力。ReAct克服了普遍存在的问题思维链推理中的幻觉和错误传播问题，通过与简单的维基百科API交互，生成类似于人的任务解决型轨迹，解释性进一步增强。

代码链接：

[](https://link.zhihu.com/?target=https%3A//github.com/ysymyth/ReAct)

论文链接：

[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.03629)

#### Self-ask

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_be10e03a8674.jpg)

Self-ask是一种follow-up的使用范式，仅仅包含follow-up, immediate answer步骤，至于follow-up多少个step，完全由它自己决定，估计这就是Self-ask的名字的由来。如上图，白色背景的是prompt，绿色背景的文本是LM的输出，下划线的是inference-time的问题。Self-ask需要一个或者少量的prompt来演示如何回答的提示问题。我们的提示从这些例子开始，之后我们附加inference-time question，然后在prompt的末尾插入短语“Are follow up questions needed here:"，因为我们发现这样做会略微改善结果。然后模型输出一个响应。在大多数情况下，它首先输出“Yes”，这意味着后续行动问题是必要的。然后LM输出第一个follow-up问题，回答它，然后继续询问并回答follow-up问题，直到它决定有足够的信息为止。最终会输出："So the final answer is:"，这使得最终答案可以很容易根据":"解析出来。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_2de6d1daf2e9.jpg)

上面是Self-ask和搜索引擎结合的例子，开始会添加few-shot prompt和问题，然后LM产生follow-up问题，把问题输入到搜索引擎，得到返回结果，插入到该prompt之后，继续重复上面的动作，直到找到最终的答案为止。

代码链接：

[](https://link.zhihu.com/?target=https%3A//github.com/ofirpress/self-ask)

论文链接：

[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.03350)

#### Plan-and-execute agents

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_9743815c1c9b.jpg)

Plan-and-execute agents这个方法本质上是先计划再执行，即先把用户的问题分解成一个个的子任务，然后再执行各个子任务，最后合并输出得到结果。做法也比较简单，prompt的形式需要改变一下，前面的论文使用的是“Let’s think step by step”，在这里使用新的prompt，“Let’s first understand the problem and devise a plan to solve the problem. Then, let’s carry out the plan and solve the problem step by step”，图a表示的是Zero-shot-Cot Prompting，图b使用的是Plan-and-Solve（PS）prompting,图（c）显示的是answer extracting prompting。Zero-shot-CoT鼓励LLM生成多步骤用“Let’s think step by step”进行推理，当问题复杂时，它仍然可能产生错误的推理步骤。与Zero-shot-CoT不同，PS提示首先要求LLM设计一个计划，通过生成一个步骤来解决问题计划和执行计划以找到答案。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_9f56b4f3ae42.jpg)

GPT-3的示例输入和输出（a）Plan-and-Solve (PS) Prompting和（b）Plan-and-Solveprompting with more detailed instructions (PS+ prompting)。PS+提示大大提高生成推理过程的质量。

论文链接：

[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.04091)

代码链接：

[](https://link.zhihu.com/?target=https%3A//github.com/AGI-Edgerunners/Plan-and-Solve-Prompting)

### 应用方向

Agents的应用可以分为simulations，自动化的Agents，跨模态Agents，下面就这几个方向介绍一下。

#### Agent simulations

Agent simulation包括一个或多个Agent相互作用。Agent模拟通常包括两个主要组件：

- 长期记忆
- 模拟环境
比较典型的应用是Generative Agents，CAMEL。Generative Agents讲的是在一个沙箱环境里，创建了25个Agents，用户可以作为Agents观察和干预他们的日常计划、分享新闻、建立关系和协调团队活动。Generative agents的结构如图所示，Agents感知他们的环境，所有感知都保存在Agents经验的综合记录中，成为memory stream。基于他们的感知，体系结构检索相关memory，然后使用这些检索到的动作来确定动作。这些检索到的记忆也被用来形成更长期的规划，并创建更高层次的反射（higher-level reflections），这两种反射都被输入到内存流中以供将来使用。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3e5fa91e0054.jpg)

CAMEL是一个Role-Playing框架，使多个智能体能够进行对话并合作解决分配的任务，比如论文的例子开发股票交易机器人，这个任务是一个人工智能助理Agent，他是一个python程序员，而人工智能用户Agent是一股票交易员。在人类用户输入结束后，任务加工器（Task Specifier）会把任务具体化，比如可以通过对社交网路平台上特定股票进行情感分析，然后根据情感分析的结果进行股票交易。当任务被具体化后，两个基于 ChatGPT 的 AI 智能体开始合作完成任务，比如进行工具的安装和导入。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b8ab8124e9fc.jpg)

#### 自动化的Agents

自动化Agents是设计为运行时间更长的代理。你给他们一个或多个长期目标，他们独立地执行这些目标。这些应用程序结合了工具使用和长期内存。典型的有AutoGPT，BabyAGI。AutoGPT以LLM 作为主控制器来建立 AI Agents ，AutoGPT 使用了许多代码来解析数据格式，以帮助 AI Agents 更好地理解和处理自然语言输入，目前还处于试验的阶段。AutoGPT 的核心逻辑是一个 Prompt Loop，步骤如下

- AutoGPT 会基于一定策略自动组装 Command Prompt，这些首次会包含用户输入的 Name, Role和Goals 
- Command Prompt 的目标不是为了拿到最终结果，而是通过 GPT Chat API(Thinking 的过程)返回下一步的 Command (包含name和arguments, 如`browser_website(url = "www.baidu.com")` )
- 这些 Command 都是可扩展的，每一种命令代表一种外部能力(比如爬虫、Google搜索，也包括GPT的能力)，通过这些 Command 调用返回的 Result 又会成为到 Command Prompt 的组成元素，
- 回到第 1 步往复循环，直到拿到最终结果结果（状态为“compelete”）
![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_ae43e1aa1ae7.jpg)

BabyAGI用于执行设定的task集合，另外，在执行过程中会产生新的task，它会重新进行优先级排序，然后继续进行执行。下面的图显示的是BabyAGI的steps的执行：

1.从任务列表中提取第一个任务。

2.将任务发送给执行agent，执行agent使用OpenAI的API根据上下文完成任务。

3.丰富结果，并存储在Chroma/Weaviate中。

4.创建新任务，并根据上一任务的目标和结果重新确定任务列表的优先级。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_d63fbadad394.jpg)

#### 跨模态Agents

Agents不仅可以处理纯文本的信息，还可以拓展到多模态来完成图像，语音，视频的交互。典型的应用有Visual ChatGPT，AssistGPT，HuggingGPT。 Visual ChatGPT的思路是使用chatGPT调用视觉模型来迭代的完成图像编辑的任务。如下图，用户上传了一张黄色的向日葵的图片，输入了一个复杂的语言说明（language instruction）:“please generate a red flower conditioned on the predicted depth of this image and then make it like a cartoon, step by step",在Prompt Manager的作用下，visual ChatGPT开始了一个与视觉基础模型相关的链式执行操作。在这个例子是先做深度估计，然后使用dept-to-image模型生成一个红色的花，然后根据扩散模型做风格转换，把图片转换成一个卡通风格的图片。在这个过程中Prompt Manager作为一个调度器来使用，提供视觉输入的类型和记录信息转换的操作。最终，Visual ChatGPT得到'cartoon'的提示，它会终止执行pipeline，然后得到结果。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_ebf36a924a80.jpg)

AssistGPT的思路是使用ReAct的方式，调用视觉的tools来理解多模态的内容，AssistGPT系统包含四部分，Planner：控制整个推理过程；Executor：执行外部工具，并把反馈返回给Planner；Inspector：管理输入和中间结果；Learner：评估系统性能并记录成功的试验，如上下文示例所示。AssistGPT可以使用交错语言和代码格式（可能不太好懂，可以看看下图Action里面的长的像代码的部分，类似这样的）进行推理，给定查询输入和视觉输入，AssistGPT在中规划解决问题的路径，使用结构化代码调用各种强大的工具。inspector可以管理可视化输入和中间结果，帮助Planner调用工具。同时Learner可以评估推理过程并收集上下文中的例子。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_8888278a3e5a.jpg)

上面的例子偏向于讲解，我们再看看几个例子，把这几个例子看懂，就知道AssistGPT的工作原理了。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_2fdbbcf0e9aa.jpg)

HuggingGPT把LLM作为一个控制器，用于管理和组织这些专家模型（HuggingFace的文生图，图生文，目标检测等模型），LLM首先会根据用户的请求规划一个任务清单，然后给每个任务指派一个专家模型，专家模型执行完毕以后，LLM收集结果并返回给用户。HuggingGPT.的总体架构图如下图所示，LLM作为核心的控制器，模型作为执行器，HuggingGPT的执行分为四个阶段：1）任务规划（Task Planning）：LLM把用户的请求分解成任务集合，决定执行的顺序和任务之间的资源依赖；2）模型选择(Model Selection)：根据HuggingFace的模型的描述，LLM把合适的模型安排给任务；3）任务执行（Task Execution）：模型执行指派的任务；4）响应生成（Response Generation）：LLM集合专家的结果，生成一个workflow日志的摘要返回给用户。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_14ff88db14ec.jpg)

### 热门开源项目

关于Agents项目中最典型的就是langchain，AutoGPT，BabyAGI，HuggingGPT了，其中langchain是功能最全的应用框架，其他的可以认为是LangChain的一个衍生品，即用LangChain就可以实现，接下来我们就介绍一下LangChain。

#### LangChain

LangChain是一个用于开发基于语言模型的应用程序开发框架，依赖于LLM，但是只是调用，并不会集成LLMs，它的核心理念是为各种LLMs实现通用的接口，把LLMs相关的组件“链接”在一起，简化LLMs应用的开发难度，方便开发者快速地开发复杂的LLMs应用。简单的理解，就是一个空壳，把LLM放进去就能运转了。

一个LangChain应用是通过很多个组件实现的，LangChain主要支持6种组件：

- Models：模型，各种类型的模型和模型集成，比如GPT-4
- Prompts：提示，包括提示管理、提示优化和提示序列化
- Memory：记忆，用来保存和模型交互时的上下文状态
- Indexes：索引，用来结构化文档，以便和模型交互
- Chains：链，一系列对各种组件的调用
- Agents：代理，决定模型采取哪些行动，执行并且观察流程，直到完成为止
AutoGPT，BabyAGI这些衍生的项目，都可以认为是LangChain的Agents一个泛化。

### 局限性

#### 1.依赖于LLM

Agent的所有的衍生技术都严重依赖于LLM的能力，所以一个Agents的好坏，也要看这个LLM优化的是否到位。

#### 2.效率

一般Agent作为一个Controller，需要多次运行和与外界进行交互，本身LLM的模型消耗资源就很大，因此一般Agents的系统运行效率都不会太高。

#### 3.Token Lengths长度限制

另一个通用的问题就是LLM的输入会有长度限制，一般是2048，4096等等，总之都是有限的，我们在做Agent的轮次就不会太长，这会限制Agents来解决更复杂问题的能力。

#### 4.不稳定性

总体上，LLM的输出还是不可控的，会在有时候不遵循instruction，然后开始胡说八道的情况，这会导致Agents的运行出现异常。
