retrieval augmented generation

# 澄清
RAG作为llm应用的一个范式，关注度很高。检索增强生成。这里需要说明的点在于，到底是检索增强还是在于生成。如果是前者，那么本质上流程是先搜索得到相关内容，但是粒度是粗的，未经归纳的

rag 问题在于llm跟embdeing之间的gap，业务llm并不适应这么粗粒度的输入或者说embdeing vec的压缩过于多了
所以当前需要多路召回



Arxiv
- 2403.18684