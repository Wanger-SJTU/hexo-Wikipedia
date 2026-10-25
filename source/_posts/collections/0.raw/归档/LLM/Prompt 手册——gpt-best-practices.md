---
title: 优质promt
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/归档/LLM/Prompt-手册——gpt-best-practices/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

#prompt


本文是 [OpenAI gpt-best-practices ](https://platform.openai.com/docs/guides/gpt-best-practices) 对如何使用GPT的Prompt指导。

文中一共提出了六类提示词优化策略：

• 在查询中<strong>包含详细信息</strong>以获得更相关的答案
• 为模型<strong>赋予特定的角色</strong>
• 使用<strong>定界符</strong>清楚地指示输入的不同部分
• 指定完成任务所需的<strong>步骤</strong>
• 提供<strong>例子</strong>
• 指定所需的<strong>输出长度</strong>


### 写清楚说明
GPT 无法读懂你想法。如果输出太长，要求简短的答复。如果输出太简单，请要求专家级的写作。如果你不喜欢这种格式，请展示你希望看到的格式。GPT 对你想要什么的猜测越少，获得好的结果的可能性就越大。

• [在你的查询中包含详细信息以获得更相关的答案  ](https://platform.openai.com/docs/guides/gpt-best-practices/tactic-include-details-in-your-query-to-get-more-relevant-answers)
• [给模型设定对应的角色  ](https://platform.openai.com/docs/guides/gpt-best-practices/tactic-ask-the-model-to-adopt-a-persona)
• [三重反引号、XML 标记、章节标题等分隔符可以帮助区分要区别对待的文本部分](https://platform.openai.com/docs/guides/gpt-best-practices/tactic-use-delimiters-to-clearly-indicate-distinct-parts-of-the-input) 
• [有些任务最好指定为一系列步骤。明确地写出步骤可以使模型更容易理解  ](https://platform.openai.com/docs/guides/gpt-best-practices/tactic-use-delimiters-to-clearly-indicate-distinct-parts-of-the-input)
• [提供适用于所有示例的一般说明通常比通过示例演示任务的所有排列更有效，但在某些情况下提供示例可能更容易  ](https://platform.openai.com/docs/guides/gpt-best-practices/tactic-provide-examples)
• [要求模型生成具有给定目标长度的输出。目标输出长度可以根据单词、句子、段落、要点等的计数来指定](https://platform.openai.com/docs/guides/gpt-best-practices/tactic-specify-the-desired-length-of-the-output)

## 提供参考文本
GPT 可以自信地编造假答案，尤其是当被问及深奥的话题或引用和 URL 时。就像一张笔记可以帮助学生在考试中取得更好的成绩一样，为 GPT 提供参考文本可以帮助以更少的捏造来回答。

-  如果我们可以为模型提供与当前查询相关的可信信息，那么我们可以指示模型使用提供的信息来编写其答案。[ref](https://platform.openai.com/docs/guides/gpt-best-practices/tactic-instruct-the-model-to-answer-using-a-reference-text)
- 如果输入已补充相关知识，则可以直接要求模型通过引用所提供文档中的段落来为其答案添加引文。[ref](https://platform.openai.com/docs/guides/gpt-best-practices/tactic-instruct-the-model-to-answer-with-citations-from-a-reference-text)

## 将复杂任务拆分为更简单的子任务
正如在软件工程中将复杂系统分解为一组模块化组件是一种很好的做法一样，提交给 GPT 的任务也是如此。复杂的任务往往比简单的任务有更高的错误率。此外，复杂的任务通常可以重新定义为更简单任务的工作流，其中早期任务的输出用于构建后续任务的输入。

-  对于需要大量独立指令集来处理不同情况的任务，首先对查询类型进行分类并使用该分类来确定需要哪些指令可能是有益的。

- 对于需要很长对话的对话应用，总结或过滤之前的对话。另一种解决方案是动态选择与当前查询最相关的对话的先前部分。

- 要总结一个很长的文档，比如一本书，我们可以使用一系列查询来总结文档的每个部分。节摘要可以被连接和总结生成摘要的摘要。这个过程可以递归地进行，直到总结了整个文档。


## 给 GPT 时间“思考”
如果要求将 17 乘以 28，你可能不会立即知道，但随着时间的推移仍然可以计算出来。同样，GPT 在试图立即回答而不是花时间找出答案时会犯更多的推理错误。在回答之前询问一系列推理可以帮助 GPT 更可靠地推理出正确答案。有时，当我们明确指示模型在得出结论之前根据第一原则进行推理时，我们会得到更好的结果。

- 内心独白的想法是指示模型将本应对用户隐藏的输出部分放入结构化格式中，以便于解析它们。然后在将输出呈现给用户之前，对输出进行解析并仅使部分输出可见。

-  通常可以通过使用后续查询提示模型来查找它在先前传递中遗漏的任何摘录来获得更好的性能。

## 使用外部工具
通过为 GPT 提供其他工具的输出来弥补它们的弱点。如果一项任务可以通过工具而不是 GPT 更可靠或更有效地完成，请卸载它以充分利用两者。

- 如果作为输入的一部分提供，模型可以利用外部信息源。这可以帮助模型生成更明智和最新的响应。嵌入可用于实现高效的知识检索，以便在运行时将相关信息动态添加到模型输入中。

- 不能依赖 GPT 自行准确地执行算术或长计算。在需要的情况下，可以指示模型编写和运行代码，而不是进行自己的计算。

## 系统地测试更改
如果可以衡量，提高绩效会更容易。在某些情况下，对提示的修改会在一些孤立的示例上获得更好的性能，但会导致在更具代表性的示例集上的整体性能变差。因此，为确保更改对性能产生积极影响，可能有必要定义一个综合测试套件（也称为“评估”）。

参考黄金标准答案评估模型输出：假设已知问题的正确答案应该参考一组特定的已知事实。然后我们可以使用模型查询来计算答案中包含了多少所需事实。
# 优质promt
要编写优质的prompt，从日常实践来看，用下述结构，并且提出非常具体的要求，则基本可以让LLM输出你想要的结果

✅ 角色、技能、个性
✅ 目标
✅ 具体的上下文、关键词、负面词
✅ 输入规则
✅ 输出规则
✅ 输入输出的例子

附图是两个优秀的Prompt：AutoGPT核心指令+小红书写手。都覆盖了框架的大部分


![20230620_003440.jpg](/images/collections/assets/20230620_003440.jpg)

![20230620_003610.jpg](/images/collections/assets/20230620_003610.jpg)
1️⃣ 角色、技能、个性
角色：该提示以声明AI的明确角色开始。这已经成为了标准的最佳实践。它会切换到那个角色来思考问题
技能：要告诉它能做什么事情，有哪些工具可以用
个性：输出的语调、个性（尤其是需要生成内容）、沟通方式等
2️⃣ 目标
告知让它完成一个什么目标。这是最核心的，必须非常清晰明确

3️⃣ 具体的上下文、关键词、负面词
上下文：这个尤其重要，要告知它已经发生了什么，有哪些具体信息。它才可以给出独特的结果

关键词列表：尽量的告诉它具体的关键词，尤其是对生成内容的时候，要有个性化的文案和创意，这是不可缺少的

负面词：让它避免输出不需要的内容。包括不要输出什么样的内容

4️⃣ 输入规则
明确输入的格式，有的时候最好用JSON格式给到它，这样就不会有歧义

5️⃣ 输出规则
这个非常重要，越详细越好。比如说明确格式，要JSON或者MD格式，要Bullet points，要长度，要表格，要emoji等。

比如说要确认要哪种内容，要忽略哪些 。

要遵循哪些策略等等


6️⃣ 输入输出的例子

在上面的输入输出规则基础上，最好的情况是给出一到多个例子。LLM在模仿例子方面非常的杰出，基本上给了3个典型的例子，后面类似的情况一定会严格按照例子来。

如果要一起学习更多AI产品，请加入社区：