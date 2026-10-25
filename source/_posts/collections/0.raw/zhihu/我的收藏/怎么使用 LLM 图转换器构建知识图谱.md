---
title: "(2 条消息) 怎么使用 LLM 图转换器构建知识图谱"
date: "2025-08-25 00:00:00"
updated: "2025-08-25 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/怎么使用-LLM-图转换器构建知识图谱/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1943429453502980274"
---


深入解析 LangChain 在图谱构建中的实现

### 从文本到知识图谱

从文本中构建图谱是一件既令人兴奋又充满挑战的事情。
其核心是<strong>将非结构化文本转化为结构化数据</strong>。

这种方法早已存在，但随着<strong>大语言模型（LLMs）</strong>的出现，它迅速进入主流并得到广泛应用。

在下图中：

•<strong>左侧</strong>展示了若干包含人物与公司关系的非结构化句子。•<strong>右侧</strong>则将这些信息抽取为知识图谱，展示了谁在哪些公司工作或创建了哪些组织。

### 为什么要构建知识图谱？

一个关键原因是为了支持<strong>检索增强生成（RAG, Retrieval-Augmented Generation）</strong>应用。

•仅仅依靠文本嵌入模型处理非结构化文本，虽然有用，但在以下情况下会受限：•复杂的<strong>多跳推理问题</strong>

> [1]

（需要跨多个实体进行推理）。•需要<strong>结构化操作</strong>（如过滤、排序、聚合）> [2]

的任务。•通过从文本中抽取结构化信息并构建知识图谱：•可以更有效地组织数据；•可以建立强大的框架来理解复杂关系。这种<strong>结构化方法</strong>不仅让检索和利用特定信息更加容易，还能显著提升准确性，并扩展可回答的问题范围。

### LLM 图转换器的出现

大约一年前，我开始尝试用 LLM 构建图谱。随着兴趣日益增长，我们决定将这一功能集成到<strong>LangChain</strong>中，推出了<strong>LLM Graph Transformer</strong>。

过去一年，我们积累了宝贵经验，并新增了多项功能。本文将逐步展示这些成果。

> 相关代码已在GitHub

[3]

开源。
### 搭建 Neo4j 环境

我们选择<strong>Neo4j</strong>作为底层图数据库，它内置图形可视化能力。

快速入门方式有两种：

1.使用<strong>Neo4j Aura 免费云实例</strong>

> <strong>[4]</strong>

（官方提供，开箱即用）。2.下载<strong>Neo4j Desktop 应用</strong>

> [5]

，在本地创建数据库实例。示例代码：

fromlangchain_community.graphs importNeo4jGraph
graph =Neo4jGraph(  url="bolt://54.87.130.140:7687",  username="neo4j",  password="cables-anchors-directories",  refresh_schema=False)
### LLM 图转换器

<strong>LLM Graph Transformer</strong>的设计目标，是提供一个灵活的框架，让我们可以利用任意大语言模型（LLM）来构建知识图谱。 由于当下有众多不同的模型和服务提供商，这项任务远非简单。

<strong>幸运的是，LangChain在标准化处理方面承担了大量工作。 至于 LLM 图转换器 本身，它就像是“两只猫套在风衣里” —— 具备两种完全独立的工作模式。</strong>

****

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f61933278b5c.jpg)


#### 两种工作模式

<strong>LLM 图转换器</strong>提供了两种模式，用于在不同场景下从文档中生成知识图谱：

## 1. 工具驱动模式（默认模式）•适用于 LLM 支持**结构化输出**或**函数调用**的情况。•此模式依赖LLM 内置的`with_structured_output`方法


> [6]

，结合工具规范来定义输出格式。•这样，实体与关系就能以<strong>结构化、预定义的形式</strong>被准确提取。•在原文插图的左侧，可以看到`Node`和`Relationship`类的代码示例。2. 提示驱动模式（回退模式）•当 LLM 不支持工具或函数调用时，系统会退回到纯<strong>Prompt 驱动</strong>的方式。•使用<strong>少样本提示（few-shot prompting）</strong>来定义输出格式，引导 LLM 以文本形式抽取实体和关系。•随后，结果会经过一个自定义函数解析，转化为<strong>JSON 格式</strong>，用于填充节点和关系。•本质上，与工具模式生成的结构一致，只是这里完全依赖 Prompt 进行引导。•在原文插图的右侧，可以看到提示示例及其对应的 JSON 输出。

#### 灵活性与兼容性

•这两种模式保证了<strong>LLM 图转换器</strong>能够适配不同的 LLM：•可以直接使用工具提取；•也可以通过解析 Prompt 输出的文本来构建图谱。•即使模型本身支持工具/函数调用，你也可以通过设置`ignore_tools_usage=True`来强制启用 Prompt 模式。

#### 为什么选择工具驱动提取？

我们最初选择<strong>工具驱动模式</strong>作为默认方案，原因在于它可以：

•<strong>减少复杂的 Prompt 设计工作</strong>；•<strong>避免编写过多自定义解析函数</strong>。

在<strong>LangChain</strong>中，`with_structured_output`方法允许通过<strong>工具</strong>或<strong>函数</strong>来提取信息：

•输出可以定义为<strong>JSON 结构</strong>；•或者定义为<strong>Pydantic 对象</strong>。

> 就个人而言，我认为<strong>Pydantic 对象</strong>更加直观清晰，因此我们选择了这种方式。

以下是一个`Node`类的示例，用于描述知识图谱中的节点：

```text
classNode(BaseNode): id:str=Field(..., description="名称或人类可读的唯一标识符")  label:str=Field(..., description=f"可选项包括{enum_values}")  properties:Optional[List[Property]]`Node 类说明每个**节点（Node）**都包含以下部分：
```


•`id`：节点唯一标识符（要求是<strong>人类可读的唯一名称</strong>）。•说明：有些 LLM 会将 ID 理解为随机字符串或自增整数，但我们更希望 ID 能直接表示实体的名称。•`label`：节点标签（通过描述中列出可选项来限制标签类型）。•`properties`：可选的属性（用于存放节点的额外信息）。

此外，像<strong>OpenAI</strong>这样的模型支持`enum`参数，我们也利用这一特性来限制可用的标签范围。

Relationship 类定义接下来是<strong>关系（Relationship）</strong>的定义：

classRelationship(BaseRelationship):  source_node_id:str  source_node_label:str=Field(..., description=f"可选项包括{enum_values}")  target_node_id:str  target_node_label:str=Field(..., description=f"可选项包括{enum_values}") type:str=Field(..., description=f"可选项包括{enum_values}")  properties:Optional[List[Property]]`Relationship 类的改进（第二版）这是<strong>Relationship 类</strong>的第二个迭代版本。

在最初的实现中，我们为关系的<strong>起始节点（source）</strong>和<strong>目标节点（target）</strong>使用了嵌套的`Node`对象。
但实验发现：<strong>嵌套对象会降低提取的准确性和质量</strong>。

因此，我们将其<strong>扁平化</strong>，改为独立字段：

•`source_node_id`与`source_node_label`•`target_node_id`与`target_node_label`

另外，我们在<strong>节点标签（label）</strong>和<strong>关系类型（type）</strong>的描述中，明确限定了可选值，确保 LLM 严格遵守既定的图谱模式（schema）。

定义属性类（Property）在<strong>工具驱动提取</strong>模式下，我们可以为节点和关系都定义属性。
以下是用于定义属性的`Property`类：

```text
classProperty(BaseModel):"""由键值对组成的单个属性"""  key:str=Field(..., description=f"可选项包括{enum_values}")  value:str`属性（Property）的局限性每个**Property**都是以**键值对（key-value pair）**的形式定义。
```

这种方式虽然灵活，但也存在一些局限：

•无法为每个属性单独提供唯一的描述。•无法区分哪些属性是<strong>必填</strong>，哪些是<strong>可选</strong>—— 因此所有属性都被统一定义为可选。•属性并不是针对每种节点或关系类型分别定义的，而是<strong>在所有节点和关系之间共享</strong>。

系统提示（System Prompt）的作用为了引导信息抽取，我们实现了一个详细的<strong>系统提示</strong>

> [7]

。 不过根据经验，<strong>函数及参数的描述</strong>往往比系统提示对结果的影响更大。遗憾的是，目前在<strong>LLM Graph Transformer</strong>中，还没有简便的方法去定制函数或参数的描述。

#### 提示驱动模式（Prompt-based Extraction）

由于只有少数商用 LLM 和<strong>LLaMA 3</strong>支持原生工具，我们实现了一个<strong>回退方案</strong>—— 在模型不支持工具时，采用<strong>Prompt 驱动模式</strong>。

> 即便使用支持工具的模型，也可以通过设置`ignore_tool_usage=True`来强制使用 Prompt 模式。

提示驱动模式的大部分<strong>Prompt 工程</strong>和示例由<strong>Geraldus Wilsen</strong>

> <strong>[8]</strong>

提供。

在这种模式下，输出结构必须直接在 Prompt 中定义。完整的 Prompt

> [9]

可以在原始代码中找到，这里只展示概要。系统 Prompt 示例`You are a top-tier algorithm designedforextracting informationinstructured formats to build a knowledge graph.Your taskisto identify the entitiesandrelations specifiedinthe user promptfroma given textandproduce the outputinJSONformat.
This output should be alistof JSON objects,witheachobjectcontaining the following keys:
-"head":The text of the extracted entity, which mustmatchone of the types specifiedinthe user prompt.-"head_type":Thetypeof the extracted head entity, selectedfromthe specifiedlistof types.-"relation":Thetypeof relation between the"head"andthe"tail,"chosenfromthelistof allowed relations.-"tail":The text of the entity representing the tail of the relation.-"tail_type":Thetypeof the tail entity, also selectedfromthe providedlistof types.
Extractas many entitiesandrelationshipsaspossible.
EntityConsistency:Ensure consistencyinentity representation.If an entity, like"John Doe,"appears multiple timesinthe text under different namesorpronouns (e.g.,"Joe,""he"),use the most complete identifier consistently.This consistencyisessentialforcreating a coherentandeasily understandable knowledge graph.
ImportantNotes:-Donot addanyextra explanationsortext.`提示驱动模式的关键差异在<strong>提示驱动模式（Prompt-based approach）</strong>中，有一个重要区别：

•我们只要求 LLM<strong>抽取关系（relationships）</strong>，而不是单独抽取节点（nodes）。•这意味着输出中不会存在“孤立节点”，与<strong>工具驱动模式</strong>不同。•另外，由于缺乏原生工具支持的模型性能往往较差，我们在该模式下<strong>不允许抽取任何属性</strong>（无论是节点属性还是关系属性），以保持结果输出的简洁性。

少样本示例（Few-shot Examples）在 Prompt 中，我们会加入若干<strong>少样本示例</strong>，用来引导 LLM 学习所需的抽取格式。
下面是部分示例代码：

examples=[{"text":("Adam is a software engineer in Microsoft since 2009, ""and last year he got an award as the Best Talent"),"head":"Adam","head_type":"Person","relation":"WORKS_FOR","tail":"Microsoft","tail_type":"Company",},{"text":("Adam is a software engineer in Microsoft since 2009, ""and last year he got an award as the Best Talent"),"head":"Adam","head_type":"Person","relation":"HAS_AWARD","tail":"Best Talent","tail_type":"Award",},...]`自定义 Few-shot 示例的限制在<strong>提示驱动模式</strong>下，目前还<strong>不支持添加自定义的 few-shot 示例</strong>或额外的说明指令。
唯一的定制方式是通过`prompt`属性，直接修改整个 Prompt。

> 扩展自定义选项是我们正在积极考虑的方向。

### 定义图谱模式（Graph Schema）

在使用<strong>LLM Graph Transformer</strong>进行信息抽取时，<strong>定义图谱模式（schema）</strong>至关重要。
它可以：

•指定需要抽取的<strong>节点类型</strong>与<strong>关系类型</strong>；•明确每个节点或关系所关联的属性；•为模型提供一个蓝图（blueprint），确保 LLM 输出的内容始终与目标知识图谱的结构保持一致。

一个良好的图谱模式，能帮助模型稳定地抽取有意义的结构化信息，从而构建出清晰、可用的知识图谱。

示例：Marie Curie + Robin Williams在本篇博客的示例中，我们选取了<strong>玛丽·居里（Marie Curie）</strong>

> <strong>[10]</strong>

的维基百科开头段落，并在结尾加了一句关于<strong>罗宾·威廉姆斯（Robin Williams）</strong>的描述。

fromlangchain_core.documents importDocument
text ="""MarieCurie,7November1867–4July1934, was a Polishand naturalised-French physicist and chemist who conducted pioneering research on radioactivity.She was the first woman to win a NobelPrize, the first person to win a NobelPrize twice,and the only person to win a NobelPrizein two scientific fields.Her husband,PierreCurie, was a co-winner of her first NobelPrize, making them the first-ever married couple to win the NobelPrizeand launching the Curie family legacy of five NobelPrizes.She was,in1906, the first woman to become a professor at the University of Paris.Also,RobinWilliams."""documents =[Document(page_content=text)]`使用 GPT-4o 作为 LLM

在所有示例中，我们都使用 GPT-4o 作为底层 LLM：

fromlangchain_openai importChatOpenAIimportgetpassimportos
os.environ["OPENAI_API_KEY"]= getpass.getpass("OpenAI api key")
llm =ChatOpenAI(model='gpt-4o')`下面先看看在未定义任何图谱 schema 的情况下，抽取流程是如何工作的。

fromlangchain_experimental.graph_transformersimportLLMGraphTransformer

```text
no_schema =LLMGraphTransformer(llm=llm)`接下来使用异步的`aconvert_to_graph_documents`来处理文档。 推荐在 LLM 抽取中使用 async：它可以并行处理多个文档，显著缩短等待时间、提升吞吐量，尤其适合批量场景。

data= await no_schema.aconvert_to_graph_documents(documents)`LLM Graph Transformer 的返回结果是一个图文档（graph document），其结构大致如下：
```


[GraphDocument(    nodes=[Node(id="Marie Curie",type="Person", properties={}),Node(id="Pierre Curie",type="Person", properties={}),Node(id="Nobel Prize",type="Award", properties={}),Node(id="University Of Paris",type="Organization", properties={}),Node(id="Robin Williams",type="Person", properties={}),],    relationships=[Relationship(       source=Node(id="Marie Curie",type="Person", properties={}),        target=Node(id="Nobel Prize",type="Award", properties={}),       type="WON",        properties={},),Relationship(       source=Node(id="Marie Curie",type="Person", properties={}),        target=Node(id="Nobel Prize",type="Award", properties={}),       type="WON",        properties={},),Relationship(       source=Node(id="Marie Curie",type="Person", properties={}),        target=Node(         id="University Of Paris",type="Organization", properties={}),       type="PROFESSOR",        properties={},),Relationship(       source=Node(id="Pierre Curie",type="Person", properties={}),        target=Node(id="Nobel Prize",type="Award", properties={}),       type="WON",        properties={},),],   source=Document(      metadata={"id":"de3c93515e135ac0e47ca82a4f9b82d8"},      page_content="\nMarie Curie, 7 November 1867 – 4 July 1934, was a Polish and naturalised-French physicist and chemist who conducted pioneering research on radioactivity.\nShe was the first woman to win a Nobel Prize, the first person to win a Nobel Prize twice, and the only person to win a Nobel Prize in two scientific fields.\nHer husband, Pierre Curie, was a co-winner of her first Nobel Prize, making them the first-ever married couple to win the Nobel Prize and launching the Curie family legacy of five Nobel Prizes.\nShe was, in 1906, the first woman to become a professor at the University of Paris.\nAlso, Robin Williams!\n",),)]`图文档与可视化图文档（graph document）中不仅描述了抽取出的**节点（nodes）**与**关系（relationships）**， 还会在`source`字段下附上<strong>抽取所依据的源文档</strong>，便于溯源与校验。

我们可以使用<strong>Neo4j Browser</strong>对结果进行可视化，从而获得更清晰、直观的理解。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_09853ae06cd5.jpg)

> 下图（原文示意）展示了<strong>在未定义图谱模式（schema）</strong>的情况下，对同一段玛丽·居里（Marie Curie）文本进行两次抽取的可视化对比。
本例使用<strong>GPT-4 的工具驱动抽取</strong>，因此可能出现“<strong>孤立节点</strong>”。

由于没有预先定义 schema，LLM 会在运行时自行决定抽取哪些信息：

•即便是同一段文本，<strong>不同次的输出也可能存在差异</strong>；•有的结果更详细，有的在结构上也会有所不同。
例如：左图把 Marie 表达为**Nobel Prize 的`WINNER`<strong>，右图则表达为</strong>Marie`WON`了 Nobel Prize**—— 语义相近，但关系类型与表述结构不同。

使用提示驱动模式（Prompt-based）进行同样的抽取对于<strong>支持工具</strong>的模型，也可以通过设置`ignore_tool_usage`参数来启用<strong>提示驱动模式</strong>：

no_schema_prompt=LLMGraphTransformer(llm=llm, ignore_tool_usage=True)data= await no_schema.aconvert_to_graph_documents(documents)`![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2f74925ad0d3.jpg)

使用提示驱动模式的效果与局限在<strong>提示驱动模式（prompt-based approach）</strong>下，不会出现“<strong>孤立节点</strong>”。
不过，与之前的抽取一样，由于未定义 schema，<strong>同一输入在不同运行之间的结构仍可能变化</strong>，从而得到不同的输出。

通过定义图谱模式获得更一致的结果接下来看看：<strong>定义图谱 schema</strong>如何帮助产出更一致的结果。

#### 限定允许的节点类型（Defining allowed nodes）

对抽取到的图结构进行约束非常有帮助，它能引导模型聚焦于<strong>特定且相关的实体与关系</strong>。 通过定义清晰的 schema，你可以显著提升多次抽取之间的<strong>一致性</strong>，让结果更<strong>可预测</strong>、更符合实际需求。
这将降低不同运行之间的波动，确保抽取数据遵循<strong>标准化结构</strong>，并捕获预期中的信息。
在一个良好定义的 schema 下，模型更不容易遗漏关键细节，也更不容易引入意外元素，最终得到<strong>更干净、可用性更强</strong>的图。

我们先用`allowed_nodes`参数定义期望抽取的节点类型：

allowed_nodes=["Person","Organization","Location","Award","ResearchField"]nodes_defined=LLMGraphTransformer(llm=llm, allowed_nodes=allowed_nodes)data= await allowed_nodes.aconvert_to_graph_documents(documents)`在这里，我们规定 LLM 只能抽取五类节点，如`Person`、`Organization`、`Location`等。 随后，可以在 Neo4j Browser 中对两次独立执行的结果进行可视化对比。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_578c2150a024.jpg)

通过<strong>明确期望的节点类型</strong>，节点抽取的确会更一致；但仍可能出现差异。
例如：第一次运行中将 “radioactivity（放射性）” 抽取为`ResearchField`，而第二次运行则未抽取到。

由于我们尚未限定<strong>关系类型</strong>，不同运行间的关系抽取也会<strong>不一致</strong>；且有的结果信息更丰富。
比如：`MARRIED_TO`（已婚/配偶）这一关系（Marie 与 Pierre 之间）并非在两次抽取中都出现。

仅限定节点类型，关系抽取仍会波动。接下来我们<strong>同时限定关系类型</strong>，以进一步提升一致性。

#### 定义允许的关系类型（Defining allowed relationships）

第一种做法是以<strong>枚举列表</strong>的方式，指定允许的关系类型：

```text
allowed_nodes =["Person","Organization","Location","Award","ResearchField"]allowed_relationships =["SPOUSE","AWARD","FIELD_OF_RESEARCH","WORKS_AT","IN_LOCATION"]
rels_defined =LLMGraphTransformer( llm=llm, allowed_nodes=allowed_nodes, allowed_relationships=allowed_relationships)
data = await rels_defined.aconvert_to_graph_documents(documents)`随后，可以再次对两次独立抽取进行对比可视化，观察在限定了节点与关系之后，输出在结构与语义上的一致性是否显著提升。
```


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_be132623d740.jpg)

同时限定节点与关系后的效果当<strong>节点类型</strong>与<strong>关系类型</strong>都被限定后，输出的一致性显著提升。
例如：关于 Marie 的信息会稳定地包含：

•<strong>获得奖项</strong>（如诺贝尔奖）；•<strong>与 Pierre 为配偶关系</strong>；•<strong>就职/任教于巴黎大学</strong>。

不过，由于关系仅以<strong>通用列表</strong>的方式定义，且未限制可连接的节点类型，仍会出现一些差异：

•`FIELD_OF_RESEARCH`（研究领域）有时会在<strong>Person ↔ ResearchField</strong>之间建立，
但也可能错误地出现在<strong>Award ↔ ResearchField</strong>之间。•此外，我们没有定义<strong>关系方向</strong>，因此方向一致性也可能不稳定。

新增：关系的三元组约束（限定端点与方向）为了解决<strong>无法指定关系可连接的节点类型</strong>以及<strong>无法强制方向</strong>的问题，我们引入了新的关系定义方式，如下所示：

```text
allowed_nodes =["Person","Organization","Location","Award","ResearchField"]allowed_relationships =[("Person","SPOUSE","Person"),("Person","AWARD","Award"),("Person","WORKS_AT","Organization"),("Organization","IN_LOCATION","Location"),("Person","FIELD_OF_RESEARCH","ResearchField")]
rels_defined =LLMGraphTransformer( llm=llm, allowed_nodes=allowed_nodes, allowed_relationships=allowed_relationships)
data = await rels_defined.aconvert_to_graph_documents(documents)`使用三元组格式定义关系与之前用**字符串列表**定义关系不同，现在我们采用**三元组（tuple）**的格式来描述关系：
```


•<strong>第 1 个元素</strong>：源节点类型（Source Node）•<strong>第 2 个元素</strong>：关系类型（Relationship Type）•<strong>第 3 个元素</strong>：目标节点类型（Target Node）

这种方式的优势在于：

•明确规定了<strong>关系必须连接的节点类型</strong>；•保证了<strong>关系的方向性</strong>；•大幅提升了抽取结果的<strong>一致性与准确性</strong>。

可视化结果

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0c3721b8a2f3.jpg)

通过在<strong>Neo4j Browser</strong>中再次进行可视化，可以直观对比：

•使用<strong>字符串列表</strong>定义关系时的不确定性；•采用<strong>三元组格式</strong>后，关系结构更加稳定、语义更加清晰的效果。

### 三元组关系的稳定性与剩余差异

采用<strong>三元组（source, relation, target）</strong>的关系定义后，多次执行间的<strong>schema 一致性</strong>显著提升。
不过，由于 LLM 的固有特性，<strong>细节层面的差异</strong>仍可能存在：

•例如右侧结果中显示<strong>Pierre 获得了诺贝尔奖</strong>，而左侧结果则<strong>缺少</strong>这一信息。

### 定义属性（Properties）

改进图谱 schema 的最后一步，是为<strong>节点</strong>与<strong>关系</strong>定义属性。这里有两种思路：

#### 方案一：让模型自主决定提取哪些属性

将`node_properties`或`relationship_properties`设为`True`，允许 LLM<strong>自主判定</strong>要抽取的属性键值对。
优点是<strong>简便</strong>、能快速捕获更多细节；缺点是<strong>不够可控</strong>、不同运行间可能存在差异。

示例代码：

```text
allowed_nodes =["Person","Organization","Location","Award","ResearchField"]allowed_relationships =[("Person","SPOUSE","Person"),("Person","AWARD","Award"),("Person","WORKS_AT","Organization"),("Organization","IN_LOCATION","Location"),("Person","FIELD_OF_RESEARCH","ResearchField")]
node_properties =Truerelationship_properties =True
props_defined =LLMGraphTransformer( llm=llm, allowed_nodes=allowed_nodes, allowed_relationships=allowed_relationships, node_properties=node_properties, relationship_properties=relationship_properties)
data = await props_defined.aconvert_to_graph_documents(documents)graph.add_graph_documents(data)`接下来即可查看结果，评估在属性启用后，节点与关系是否携带了更丰富的上下文信息（如时间、职位、地点、获奖年份等）。
```


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6ebe340a171e.jpg)

> 注：方案二通常是<strong>显式列举允许的属性键</strong>并限制类型与必选/可选，但本文段落暂仅介绍“让模型自主决定”的做法。

在该方案中，我们允许 LLM<strong>自主决定</strong>为节点或关系添加它认为相关的属性。
例如，模型会补充：

•<strong>玛丽·居里（Marie Curie）</strong>的<strong>出生/逝世日期</strong>；•她在<strong>巴黎大学任教（Professor at the University of Paris）</strong>的角色信息；•她<strong>两次获得诺贝尔奖</strong>的事实。

这些附加属性显著<strong>丰富了抽取的信息密度</strong>，让图谱更具语义价值。

第二种做法是<strong>明确列出</strong>我们希望抽取的<strong>节点属性</strong>与<strong>关系属性</strong>，从而让输出<strong>更可控、更一致</strong>。

```text
allowed_nodes =["Person","Organization","Location","Award","ResearchField"]allowed_relationships =[("Person","SPOUSE","Person"),("Person","AWARD","Award"),("Person","WORKS_AT","Organization"),("Organization","IN_LOCATION","Location"),("Person","FIELD_OF_RESEARCH","ResearchField")]
node_properties =["birth_date","death_date"]relationship_properties =["start_date"]
props_defined =LLMGraphTransformer( llm=llm, allowed_nodes=allowed_nodes, allowed_relationships=allowed_relationships, node_properties=node_properties, relationship_properties=relationship_properties)
data = await props_defined.aconvert_to_graph_documents(documents)graph.add_graph_documents(data)`接下来即可查看 LLM 的抽取结果，验证是否正确填充了：
```


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6ad39d97332b.jpg)

与前一次抽取相比，<strong>出生日期</strong>与<strong>逝世日期</strong>保持一致。
此外，这一次模型还抽取出了<strong>玛丽在巴黎大学任教的起始日期</strong>（教授任期的开始时间）。

引入<strong>属性（Properties）</strong>的确能显著提升信息的深度与可用性，但当前实现仍存在一些限制：

1.<strong>只能在工具驱动模式下</strong>抽取属性（prompt 驱动模式不支持）。2.<strong>所有属性都以字符串（string）形式</strong>返回（缺少类型化，如日期/数字/布尔等）。3.属性只能<strong>全局定义</strong>，而<strong>不能按节点标签或关系类型分别指定</strong>。4.<strong>无法自定义属性的描述</strong>来进一步约束或引导 LLM 提取得更精确。

#### 严格模式（Strict Mode）

如果你以为我们已经找到了让 LLM 完美遵循 schema 的方法，那我需要澄清一下：
即便投入了大量的 Prompt 设计工作，要让 LLM（尤其是性能较弱的模型）<strong>百分之百</strong>严格遵循指令仍然很难。

为此，我们引入了一个后处理步骤——`strict_mode`：

•它会<strong>移除</strong>所有<strong>不符合已定义图谱 schema</strong>的信息，•以获得更<strong>干净</strong>、更<strong>一致</strong>的输出。

默认情况下，`strict_mode=True`。你也可以手动关闭：

LLMGraphTransformer( llm=llm, allowed_nodes=allowed_nodes, allowed_relationships=allowed_relationships, strict_mode=False)`关闭严格模式后，LLM 可能会输出 超出 schema 定义的节点或关系类型， 因为模型有时会“发挥创意”，产生不在约束内的结构。

### 将图文档导入图数据库

从<strong>LLM Graph Transformer</strong>抽取出的图文档，可以导入到图数据库（如<strong>Neo4j</strong>）中，
以便进行后续的分析与应用。
导入时可使用`add_graph_documents`方法，根据不同场景选择不同的导入策略。

#### 默认导入（Default Import）

最简单的方式是直接将节点与关系导入 Neo4j，示例代码如下：

graph.add_graph_documents(graph_documents)`此方法会直接导入传入的图文档中的所有节点与关系。 在本文的实验与演示中，我们一直采用这种方式来验证不同 LLM 与 schema 配置下的结果。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9679199fa221.jpg)

#### 基础实体标签（Base Entity Label）

大多数图数据库都支持<strong>索引（indexes）</strong>来优化数据的导入与检索。
在<strong>Neo4j</strong>中，索引只能设置在特定的<strong>节点标签（node labels）</strong>上。

然而，我们可能事先并不知道所有的节点标签。
为了解决这个问题，可以通过`baseEntityLabel`参数，
为每个节点添加一个<strong>次级的基础标签</strong>，以便统一建立索引。

示例代码：

graph.add_graph_documents(graph_documents, baseEntityLabel=True)`启用`baseEntityLabel`后，每个节点都会额外拥有一个`__Entity__`标签。 这样我们就能基于`__Entity__`建立索引，从而提升 导入效率 和 查询性能， 而无需为图中每个可能出现的节点标签单独设置索引。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_952faad17876.jpg)

导入源文档（Include Source Documents）最后一个可选项是<strong>同时导入源文档</strong>，以记录节点与关系的出处。
这种方式可以帮助我们追踪：<strong>某个实体或关系来源于哪些文档</strong>， 便于后续的溯源与分析。

启用方法：在导入时设置`include_source=True`。

graph.add_graph_documents(graph_documents, include_source=True)`在可视化结果中，<strong>源文档（source document）</strong>会以蓝色高亮显示，
并通过<strong>MENTIONS</strong>关系与从该文档中抽取出的所有实体相连。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0888a3ebd15c.jpg)

这种模式不仅能展示信息来源，还可以构建同时利用
<strong>结构化搜索</strong>与<strong>非结构化搜索</strong>的检索器（retrievers）

> [11]

， 从而提升检索增强生成（RAG）的能力。
### 总结

在这篇文章中，我们探索了<strong>LangChain 的 LLM Graph Transformer</strong>
以及它的两种构建知识图谱的模式：

•<strong>工具驱动模式（Tool-based mode）</strong>•我们的主要方法。•借助结构化输出与函数调用，减少了 Prompt 设计的复杂性。•支持属性（Properties）的抽取。•<strong>提示驱动模式（Prompt-based mode）</strong>•当工具不可用时的替代方案。•依赖少样本示例（few-shot examples）来引导 LLM 输出。•不支持属性抽取，且不会生成孤立节点。

图谱 Schema 的重要性实验表明，<strong>清晰的图谱 Schema 定义</strong>（包括允许的节点类型与关系类型）：

•能显著提升抽取结果的一致性与性能；•确保输出严格遵循目标结构；•让结果更可预测、更可靠，并便于应用在下游任务中。

应用价值无论是工具驱动还是提示驱动，
<strong>LLM Graph Transformer</strong>都能将非结构化文本转化为更有组织、更结构化的表示。
这对于：

•<strong>RAG 应用</strong>•<strong>多跳推理查询（multi-hop queries）</strong>

都具有重要价值。

获取与尝试•代码已在<strong>GitHub</strong>

> <strong>[12]</strong>

开源。•你也可以在<strong>Neo4j 提供的托管 LLM Graph Builder 应用</strong>中，
通过<strong>零代码环境（no-code environment）</strong>来尝试 LLM Graph Transformer。

`https://medium.com/data-science/building-knowledge-graphs-with-llm-graph-transformer-a91045c49b59`

#### References

[1]`复杂的<strong>多跳推理问题</strong>:*[https://medium.com/neo4j/knowledge-graphs-llms-multi-hop-question-answering-322113f53f51](https://link.zhihu.com/?target=https%3A//medium.com/neo4j/knowledge-graphs-llms-multi-hop-question-answering-322113f53f51)*
[2]`<strong>结构化操作</strong>（如过滤、排序、聚合）:*[https://medium.com/neo4j/limitations-of-text-embeddings-in-rag-applications-b060020b543b](https://link.zhihu.com/?target=https%3A//medium.com/neo4j/limitations-of-text-embeddings-in-rag-applications-b060020b543b)*
[3]`GitHub:*[https://github.com/tomasonjo/blogs/blob/master/llm/llm_graph_transformer_in_depth.ipynb](https://link.zhihu.com/?target=https%3A//github.com/tomasonjo/blogs/blob/master/llm/llm_graph_transformer_in_depth.ipynb)*
[4]`Neo4j Aura 免费云实例:*[https://neo4j.com/product/auradb/](https://link.zhihu.com/?target=https%3A//neo4j.com/product/auradb/)*
[5]`<strong>Neo4j Desktop 应用</strong>:*[https://neo4j.com/download/](https://link.zhihu.com/?target=https%3A//neo4j.com/download/)*
[6]`LLM 内置的`with_structured_output`方法:*[https://python.langchain.com/docs/how_to/structured_output/](https://link.zhihu.com/?target=https%3A//python.langchain.com/docs/how_to/structured_output/)*
[7]`详细的<strong>系统提示</strong>:*[https://github.com/langchain-ai/langchain-experimental/blob/main/libs/experimental/langchain_experimental/graph_transformers/llm.py#L72](https://link.zhihu.com/?target=https%3A//github.com/langchain-ai/langchain-experimental/blob/main/libs/experimental/langchain_experimental/graph_transformers/llm.py%23L72)*
[8]`Geraldus Wilsen:*[https://www.linkedin.com/authwall?trk=gf&trkInfo=AQH_yFWxJX627gAAAZjLlkooOt6rpoKSatPa7qfZx1cFXPm9tlmKcPRSI41ODMmJq-JUSUgTTFr8waiBG8A09WxOP3MhpmnOB_ohBHGFq_eHZZwHqmXq6KoKac8LvtogjADajZA=&original_referer=https://medium.com/data-science/building-knowledge-graphs-with-llm-graph-transformer-a91045c49b59&sessionRedirect=https://www.linkedin.com/in/geraldus-wilsen/](https://link.zhihu.com/?target=https%3A//www.linkedin.com/authwall%3Ftrk%3Dgf%26trkInfo%3DAQH_yFWxJX627gAAAZjLlkooOt6rpoKSatPa7qfZx1cFXPm9tlmKcPRSI41ODMmJq-JUSUgTTFr8waiBG8A09WxOP3MhpmnOB_ohBHGFq_eHZZwHqmXq6KoKac8LvtogjADajZA%3D%26original_referer%3Dhttps%3A//medium.com/data-science/building-knowledge-graphs-with-llm-graph-transformer-a91045c49b59%26sessionRedirect%3Dhttps%3A//www.linkedin.com/in/geraldus-wilsen/)*
[9]`完整的 Prompt:*[https://github.com/langchain-ai/langchain-experimental/blob/main/libs/experimental/langchain_experimental/graph_transformers/llm.py#L206](https://link.zhihu.com/?target=https%3A//github.com/langchain-ai/langchain-experimental/blob/main/libs/experimental/langchain_experimental/graph_transformers/llm.py%23L206)*
[10]`玛丽·居里（Marie Curie）:*[https://en.wikipedia.org/wiki/Marie_Curie](https://link.zhihu.com/?target=https%3A//en.wikipedia.org/wiki/Marie_Curie)*
[11]`<strong>结构化搜索</strong>与<strong>非结构化搜索</strong>的检索器（retrievers）:*[https://medium.com/neo4j/enhancing-the-accuracy-of-rag-applications-with-knowledge-graphs-ad5e2ffab663](https://link.zhihu.com/?target=https%3A//medium.com/neo4j/enhancing-the-accuracy-of-rag-applications-with-knowledge-graphs-ad5e2ffab663)*
[12]`GitHub:*[https://github.com/tomasonjo/blogs/blob/master/llm/llm_graph_transformer_in_depth.ipynb](https://link.zhihu.com/?target=https%3A//github.com/tomasonjo/blogs/blob/master/llm/llm_graph_transformer_in_depth.ipynb)*

深入解析 LangChain 在图谱构建中的实现