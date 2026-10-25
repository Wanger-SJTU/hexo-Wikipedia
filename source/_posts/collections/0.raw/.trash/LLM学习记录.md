
最主流的开源模型？

ChatGLM-6B[1] prefix LM

LLaMA-7B[2] causal LM


llama 输入句子长度理论上可以无限长吗？

这里引用苏神（RoPE作者）在群里的回复。

>限制在训练数据。理论上rope的llama可以处理无限长度，但问题是太长了效果不好啊，没训练过的长度效果通常不好。而想办法让没训练过的长度效果好，这个问题就叫做“长度外推性”问题。

所以接受2k的长度限制吧。




RLHF部分
LoRA权重是否可以合入原模型？
可以，将训练好的低秩矩阵（B*A）+原模型权重合并（相加），计算出新的权重。

2. ChatGLM-6B LoRA后的权重多大？

rank 8 target_module query_key_value条件下，大约15M。

3. SFT（有监督微调）的数据集格式？

一问一答

4. RM（奖励模型）的数据格式？

一个问题 + 一条好回答样例 + 一条差回答样例

5. PPO（强化学习）的数据格式？

如何给LLM注入领域知识？
第一种办法，检索+LLM，先用问题在领域数据库里检索到候选答案，再用LLM对答案进行加工。

第二种方法，把领域知识构建成问答数据集，用SFT让LLM学习这部分知识。[7]

2. 为什么SFT之后感觉LLM傻了?

原版答案：

SFT的重点在于激发大模型的能力，SFT的数据量一般也就是万恶之源alpaca数据集的52k量级，相比于预训练的数据还是太少了。如果抱着灌注领域知识而不是激发能力的想法，去做SFT的话，可能确实容易把LLM弄傻。

新版答案：[3]

指令微调是为了增强（或解锁）大语言模型的能力。
其真正作用：

指令微调后，大语言模型展现出泛化到未见过任务的卓越能力，即使在多语言场景下也能有不错表现 。
微调数据集：

应该选择多个有代表性的任务，每个任务实例数量不应太多（比如：数百个）否则可能会潜在地导致过拟合问题并影响模型性能 。

同时，应该平衡不同任务的比例，并且限制整个数据集的容量（通常几千或几万），防止较大的数据集压倒整个分布。

3. 如果想要快速体验各种模型，该怎么办？

推荐fastchat[4]，集成了各路开源模型，从自己的vicuna到stable AI的stableLM。

4. 找数据集哪里找？

推荐Alpaca-COT[8]，数据集整理的非常全，眼花缭乱。



Top-k embedding lookup does not always return the most relevant context to a question. Adding a  reranking step (using LLM’s) can help!

To some of you, this is obvious. To others, let’s make this explicit with a simple but relevant example 👇

**Setup** 🧱

Let’s ask some questions about Covid-19 in the 2021 Lyft SEC 10-k 🚕📈. It’s 238 pages long, and a ctrl-f for “covid-19” returns 127 matches. We chunk up the text into 128-word chunks.

Question: “What initiatives are the company focusing on independently of COVID-19?” ❓

We try two approaches for retrieval 🔎:
1. (Baseline) We fetch the top-5 most similar results by embedding similarity.
2. We fetch the top-40 most similar nodes, then use the LLM to rerank and select the top-5 given the query.

**Results** 🧪

Results for the baseline are shown in the left image. We see that rows 0, 1, 3, 4, are all regarding measures directly in response to Covid-19 rather than independently of it, per the question. 

But if we widen the top-k to 40 (in approach 2), and then use an LLM to explicitly filter using query-response pairs, then we get more relevant results to the question: “expansion of Light Vehicles” (1), “incremental investments in brand/marketing” (2), international expansion (3), misc risks (4). 

**Analysis** 🔬

Embedding-based retrieval is imprecise; you’re basically praying to the dot-product gods that the context semantics align enough to be relevant to the question, without any function that explicitly takes into account both the question and context semantics. We widen the top-k to explicitly maximize recall and depend on the LLM to increase precision of the retrieved results.

Notebook: github.com/jerryjliu/llam…
