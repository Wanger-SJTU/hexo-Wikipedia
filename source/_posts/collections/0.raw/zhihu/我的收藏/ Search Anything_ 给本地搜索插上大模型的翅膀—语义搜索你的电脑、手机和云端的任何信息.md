---
title: "(1 条消息) Search Anything: 给本地搜索插上大模型的翅膀—语义搜索你的电脑、手机和云端的任何信息"
date: "2023-09-07 00:00:00"
updated: "2023-09-07 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Search-Anything_-给本地搜索插上大模型的翅膀—语义搜索你的电脑、手机和云端的任何信息/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/641128049
---


<strong>哎？我前几天和同事讨论的关于「LLM的总结」</strong>放哪啦？我记得是放XXX文件夹的呀... <strong>该写论文了，想找出「所有关于LLM prompt的文献」</strong>，但有的没有打标签，该怎么寻找呢？ ‍ <strong>女朋友叫我做一个VLOG纪念三周年，要找出「我们的所有合照」</strong>，一张一张找好费时间呀... 你是否正为大量信息的检索而苦恼？我们的开源项目：<strong>「SearchAnything」</strong>，将成为你的解决方案。SearchAnything利用最尖端的AI大模型，采用<strong>「语义搜索」</strong>的方式，彻底改变处理和获取信息的方式！对于文本和图像的内容，SearchAnything基于其语义进行索引和搜索，而不仅仅是基于关键词。这一创新性的设计，使得无论你在寻找具体信息，还是在寻找含义相关的上下文，SearchAnything都能够提供准确而高效的结果。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0d0a6786ef45.jpg)

现在，SearchAnything支持的文件类型包括PDF、TXT、MD格式的文本，以及JPG、JPEG、PNG格式的图像。我们的目标是让SearchAnything成为处理任何类型文件的强大工具，未来我们将加入对PPTX，WORD以及音频的支持！我的SearchAnything可以帮助文字工作者、视频创作者快速的检阅想要的内容，更高效的进行创作。随着Windows Copilot等大模型集成于操作系统和专业的应用软件，我们相信，Search Anything所代表的大模型为核心的人机交互方式也会助力今后的新一代应用开发。

本项目旨在推动大模型相关的科研和开发工作，为“[大模型时代，普通人的科研何去何从](https://zhuanlan.zhihu.com/p/623690301)”中“基于大模型的人机交互”部分的相关扩展。也希望能给社区带来更多的启发。<strong>我们希望Search Anything项目可以驱动手机、电脑、以及云端的语义搜索。</strong>

- <strong>开源地址：</strong>[https://github.com/Immortalise/SearchAnything](https://link.zhihu.com/?target=https%3A//github.com/Immortalise/SearchAnything) 
- <strong>视频介绍：</strong>大模型：助力人机交互自由飞翔--《大模型时代的科研》之4_哔哩哔哩_bilibili
本开源项目的主要作者是中科院自动化所硕士生朱凯捷，其也是大模型[Prompt](https://zhuanlan.zhihu.com/p/631922240)鲁棒性评估基准 PromptBench 的主要作者（[PromptBench: 首个大语言模型提示鲁棒性的评测基准](https://zhuanlan.zhihu.com/p/637219127)）。其他参与作者包括微软应用科学家侯汶昕、新加坡国立大学博士生张储祺。微软亚洲研究院王晋东担任指导教师。

### <strong>DEMO 体验</strong>

- <strong>文本搜索：</strong>
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e2f21cd9a965.jpg)

搜索文本

- 图片搜索：
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ddd171a043ed.jpg)

图片搜索**

###   工作流程**

下图展示了Search Anything的工作流程。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b83b6bdc0639.jpg)

Search Anything主要涉及两个步骤：

#### <strong>嵌入(Embedding)</strong>

给定一个文本或图像，首先将它们处理成一个矢量（Embedding）。主要的AI模型基于setence-transformer库。

- 文本语义搜索：All-mpnet-base-v2
- 图像语义搜索： clip-ViT-B-32

#### <strong>保存</strong>

在为每个图像和文本生成Embedding之后，我们将Embedding与文件路径等一系列的元数据（Meta data）一起保存到数据库中。

#### <strong>检索</strong>

当给定一个查询q和一个搜索类型t 时，首先将查询q处理成一个Embedding e_q，然后检索数据库内关于类型t的所有Embeddings [e_1, e_2, ..., e_n]。最后计算查询e_q和每个e_i的余弦相似度，按降序排序，并返回结果。

#### <strong>隐私保护</strong>

SearchAnything将最先进的AI模型下载至本地运行，因此，无需担心您的隐私数据会被泄露！ 文字语义检索仅需要约400MB的内存空间，而图像语义检索需要4GB内存。未来我们将加入更多的模型以方便不同内存大小的用户都可以使用。

### <strong>️ 安装</strong>

本地计算机需要下载conda环境。

接着，通过github下载我们的代码仓库：`git clone git@github.com:Immortalise/SearchAnything.git`

然后使用如下的conda命令创建本地environment：

conda env create -f env.yaml
conda activate anything`

### <strong>使用方法</strong>

#### <strong>加载&处理文件</strong>

打开命令行，运行`python anything.py`来启动命令行应用程序。

运行后，你会看到以下说明：

[nltk_data] Downloading package punkt to /xxx/nltk_data...
[nltk_data] Package punkt is already up-to-date! 
Adding text embedding model 
Adding image embedding model 
SearchAnything v1.0 Type 'exit' to exit.   
Type 'insert' to parse file.   
Type 'search' to search file.   
Type 'delete' to delete file. 
Instruction:`

键入`insert`并回车，然后输入需要处理的文件地址/文件夹地址，如果给定的是一个文件夹地址，则该文件夹中所有支持的文件类型的文件都将被解析并保存到数据库中。

#### <strong>检索</strong>

我们推荐使用网页端的可视化来进行检索，在命令行中键入`streamlit run app.py`。然后，会在本地浏览器中打开一个界面。

### 相关工作

注意到最近的Github库：[Semantra](https://link.zhihu.com/?target=https%3A//github.com/freedmand/semantra) 和我们的SearchAnything类似，旨在促进文件的语义搜索。SearchAnything 与Semantra有以下几点不同：

1. 灵活的文件支持： SearchAnything不仅支持文本文件（PDF、TXT、MD），也支持图像（如JPG、JPEG、PNG）。我们正在不断努力扩大支持的文件类型的范围。

2. 不同的人工智能模型的整合： SearchAnything整合了基于Sentence Transformer库的不同人工智能模型。这种方法确保了对各种数据的强大和多功能的语义理解。

3. 用户友好的界面：SearchAnything配备了由Streamlit提供的本地界面，该界面设计对非技术用户十分友好。

### <strong>未来工作</strong>

当前，我们正在开发更多新功能，包括对小白用户更友好的界面、自动监测文件变化、语义搜索音频资源等。欢迎加入我们的旅程，共同见证和推动SearchAnything的发展！让我们共同探索信息技术的未来，开启高效工作的新篇章！

=============

更多大模型时代的科研，请关注[《大模型时代的科研》](https://zhuanlan.zhihu.com/p/631949492)系列。
