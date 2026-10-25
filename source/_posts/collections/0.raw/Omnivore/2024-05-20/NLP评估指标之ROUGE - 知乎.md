---
title: "NLP评估指标之ROUGE - 知乎"
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: "post"
permalink: "/collections/0.raw/Omnivore/2024-05-20/NLP评估指标之ROUGE-知乎/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

---
id: d8bc6931-bcb8-4b8b-ac4c-2946c2330adf
---

# NLP评估指标之ROUGE - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/nlp-rouge-18f94fce61b)
[Read Original](https://zhuanlan.zhihu.com/p/504279252)



> ROUGE（Recall-Oriented Understudy for Gisting Evaluation）评估指标最早出自chin-yew lin在2003年的论文《ROUGE: Recall-oriented understudy for gisting evaluation》。
> 
> Chin-Yew Lin 微软亚洲研究院知识挖掘组(The Knowledge Mining group at Microsoft Research Asia)调研经理(research manager)

ROUGE指标是在机器翻译、自动摘要、问答生成等领域常见的评估指标。ROUGE通过将模型生成的摘要或者回答与参考答案（一般是人工生成的）进行比较计算，得到对应的得分。ROUGE指标与BLEU指标非常类似，均可用来衡量生成结果和标准结果的匹配程度，不同的是ROUGE基于召回率，BLEU更看重准确率。在论文中主要提到了4种方法，分别是Rouge−N、Rouge−L、Rouge−W、Rouge−SRouge\\small{-N}、Rouge\\small{-L}、Rouge\\small{-W}、Rouge\\small{-S}，下面具体介绍一下各个方法。

## ROUGE-N

Rouge-N实际上是将模型生成的结果和标准结果按N-gram拆分后，计算召回率。比如有2个句子（一般模型生成的成为hypothesis，简写hyp；标准结果称为reference，简写为ref）：

> 模型生成（hyp）：the cat was found under the bed 
> 
> 标准结果（ref）：the cat was under the bed

按1-gram和2-gram拆分后，可表示为一下表格：

| #     | hyp 1-gram | ref 1-gram | hyp 2-gram  | ref 2-gram |
| ----- | ---------- | ---------- | ----------- | ---------- |
| 1     | the        | the        | the cat     | the cat    |
| 2     | cat        | cat        | cat was     | cat was    |
| 3     | was        | was        | was found   | was under  |
| 4     | found      | under      | found under | under the  |
| 5     | under      | the        | under the   | the bed    |
| 6     | the        | bed        | the bed     |            |
| 7     | bed        |            |             |            |
| count | 7          | 6          | 6           | 5          |

在原论文中，ROUGE-N的公式为：

> 论文中第一个求和项条件中，Refermce应该是写错了，这里改成了Reference

Rouge−N\=∑S∈ReferenceSummaries∑gramn∈SCountmatch(gramn)∑S∈ReferenceSummaries∑gramn∈SCount(gramn)Rouge\\small{-N} = \\frac {\\sum \\limits\_{S \\in ReferenceSummaries}\\sum \\limits\_{gram\_n \\in S} Count\_{match}(gram\_n)} {\\sum \\limits\_{S \\in ReferenceSummaries}\\sum \\limits\_{gram\_n \\in S} Count(gram\_n)}

分子表示所有样本的标准结果按N-gram拆分后与生产结果按N-gram拆分后匹配上个数的和；分母表示所有样本的标准结果，按N-gram拆分后的和。这样很容易计算，Rouge−1\=66\=1.0Rouge\\!{-}\\!{1} = \\frac {6}{6}=1.0，同样Rouge−2\=45\=0.8Rouge\\small{-2} = \\frac {4}{5}=0.8。以此类推，一般来说N越大，分值容易越小。前面提到的都是单个reference的情况，对于多个reference的情况，论文中也有提到，两两计算取最大值。

## ROUGE-L

Rouge-L的L表示: Longest Common Subsequence，Rouge-L的计算利用了最长公共子序列（区别一下最长公共子串，这个是连续的，子序列不一定连续，但是二者都是有词的顺序的）。论文中Rouge-L的公式可以表示为：

Rlcs\=LCS(X,Y)mplcs\=LCS(X,Y)nFlcs\=(1+β2)RlcsPlcsRlcs+β2Plcs\\begin{gather\*} R\_{lcs} =\\frac {LCS(X,Y)}{m} \\\\ p\_{lcs} =\\frac {LCS(X,Y)}{n} \\\\ F\_{lcs} =\\frac {(1+\\beta^2)R\_{lcs}P\_{lcs}}{R\_{lcs}+\\beta^2P\_{lcs}} \\end{gather\*}

上面的公式中，X表示标准答案，也就是上面两个句子中的ref，Y表示生产答案，也就是上面两个句子中的hyp。m表示X的长度，n表示Y的长度。LCS(X,Y)LCS(X,Y)表示X和Y的最长公共子序列，β\\beta是一个超参数，需要自己设置，论文中提到这个值一般的比较大。沿用上面的例子则可以得到：

m\=6n\=7LCS(X,Y)\=6Rlcs\=LCS(X,Y)m\=66\=1.0plcs\=LCS(X,Y)n\=67≈0.86Flcs\=(1+β2)RlcsPlcsRlcs+β2Plcs\=(1+β2)×1.0×0.861.0+β2×0.86\\begin{gather\*} m = 6 \\\\ n = 7 \\\\ LCS(X,Y) = 6 \\\\ R\_{lcs} =\\frac {LCS(X,Y)}{m} = \\frac {6}{6} = 1.0 \\\\ p\_{lcs} =\\frac {LCS(X,Y)}{n} = \\frac {6}{7} \\approx 0.86 \\\\ F\_{lcs} =\\frac {(1+\\beta^2)R\_{lcs}P\_{lcs}}{R\_{lcs}+\\beta^2P\_{lcs}} = \\frac {(1+\\beta^2)\\times1.0\\times0.86}{1.0 + \\beta^2\\times0.86} \\end{gather\*}

公式中的FlcsF\_{lcs}就是ROUGE-L的得分，因为β\\beta设置的比较大，所以最终FlcsF\_{lcs}还是受召回率（RlcsR\_{lcs}）的影响更大，也符合ROUGE一开始的初衷。

## ROUGE-W

先举一个例子，下面三句话中，XX是reference，Y1，Y2Y\_1，Y\_2是hypothesis：

> XX：\[ _<strong>A</strong>_ _<strong>B</strong>_ _<strong>C</strong>_ _<strong>D</strong>_ E F G \] 
> 
> Y1Y\_1：\[ _<strong>A</strong>_ _<strong>B</strong>_ _<strong>C</strong>_ _<strong>D</strong>_ H I K \] 
> 
> Y2Y\_2：\[ _<strong>A</strong>_ H _<strong>B</strong>_ K _<strong>C</strong>_ I _<strong>D</strong>_ \]

我看可以看到三个例子，用Rouge-L去计算的时候，他们都有相同的最长公共子序列 _<strong>A</strong>_、_<strong>B</strong>_、_<strong>C</strong>_、_<strong>D</strong>_。这个例子中它们有相同的ROUGE—L分。但是这种情况下，应该是Y1Y\_1要好于Y2Y\_2的，因为Y1Y\_1有更多的连续匹配。Rouge-W就是所做的工作就是给连续的匹配给到更多的权重，让连续匹配的比非连续匹配的有更高的分数。论文中给出的计算公式是：

Rwlcs\=f−1(WLCS(X,Y)f(m))pwlcs\=f−1(WLCS(X,Y)f(n))Fwlcs\=(1+β2)RwlcsPwlcsRwlcs+β2Pwlcs\\begin{gather\*} R\_{wlcs} =f^{-1}\\Bigg(\\frac {WLCS(X,Y)}{f(m)}\\Bigg) \\\\ p\_{wlcs} =f^{-1}\\Bigg(\\frac {WLCS(X,Y)}{f(n)} \\Bigg)\\\\ F\_{wlcs} =\\frac {(1+\\beta^2)R\_{wlcs}P\_{wlcs}}{R\_{wlcs}+\\beta^2P\_{wlcs}} \\end{gather\*}

FwlcsF\_{wlcs}就是Rouge-w分数，上面公式中，WLCS(X,Y)WLCS(X,Y)是根据连续匹配情况加权后的最长公共子序列长度（叫分值更合适）。在论文中，这两个例子算出来的Rouge-w分数是不一样的：Rouge−WY1\=0.571Rouge\\small{-W}\_{Y\_1} = 0.571，Rouge−WY2\=0.286Rouge\\small{-W}\_{Y\_2} = 0.286。  
总的来说Rouge-W的实现比前面的要复杂，更多的细节可以参考原始论文[《ROUGE: A Package for Automatic Evaluation of Summaries》](https://aclanthology.org/W04-1013.pdf)。

## ROUGGE-S

Rouge-S的S表示：Skip-Bigram Co-Occurrence Statistics，这其实是Rouge-N的一种扩展，N-gram是连续的，Skip-bigram是允许跳过中间的某些词，同时结合了Rouge-L的计算方式。论文中给到的公式是：

Rskip2\=SKIP2(X,Y)C(m,2)pskip2\=SKIP2(X,Y)C(n,2)Fskip2\=(1+β2)Rskip2Pskip2Rskip2+β2Pskip2\\begin{gather\*} R\_{skip2} =\\frac {SKIP2(X,Y)}{C(m,2)} \\\\ p\_{skip2} =\\frac {SKIP2(X,Y)}{C(n,2)} \\\\ F\_{skip2} =\\frac {(1+\\beta^2)R\_{skip2}P\_{skip2}}{R\_{skip2}+\\beta^2P\_{skip2}} \\end{gather\*}

结合几个简单的句子作为例子说明一下：

> S1（ref）：police killed the gunman 
> 
> S2（hyp）：police kill the gunman 
> 
> S3（hyp）：the gunman kill police 
> 
> S4（hyp）：the gunman police killed 
> 
> S5（hyp）：gunman the killed police

其中C(m,2)C(m,2)、C(n,2)C(n,2)分别表示reference、hypothesis句子中，skip-bigram的组合的个数。对于S1，S2来说C(S1/2,2)C(S\_{1/2},2)，具体组合为：

> 【S1】：police killed、police the、police gunman、killed the、killed gunman、the gunman 
> 
> 【S2】：police kill、police the、police gunman、kill the 、kill gunman、the gunman

两句话的skip-bigram都是6个（C(4,2)\=6C(4,2) = 6），共同的部分为 _" police the", "police gunman", "the gunman"_，所以SKIP2(S1,S2)\=3SKIP2(S1,S2) = 3。所以当β\=1\\beta = 1时，代入上面的公式：

Rouge−SS1,S2\=Fskip2\=(1+β2)0.5∗0.50.5+β2∗0.5\=0.5Rouge\\small{-S}\_{S1,S2}=F\_{skip2} =\\frac {(1+\\beta^2)0.5\*0.5}{0.5+\\beta^2\*0.5} = 0.5

有一个比较特别的情况，可以看到S5，它与S1出现的单词是一样的，但由于顺序不同，其SKIP2(S1,S5)\=0SKIP2(S1,S5) = 0，为了区分S5这种情况和没有单个单词与S1共现的情况，提出了Rouge—SU。Rouge—SU，Extension of Rouge-s，在Rouge-S的基础上增加了unigram。

## 优缺点

缺点是这种方法只能在单词、短语的角度去衡量两个句子的形似度。并不能支持同义词、近义词等语意级别去衡量。比如：

> ref = "I'm very happy!" 
> 
> hyp = "I'm very sad!" 
> 
> hyp1 = "I'm very cheerful!"

hyp1和hyp2的rouge得分是一样的。但显然hyp1才是与ref更相近的。  
好处是这种方式计算高效，在忽略近义词等情况下，做到比较合理的判断。

在github上面，关于Rouge的实现有pyrouge,files2rouge,rouge,py-rouge，其中rouge，files2rouge是同一个人开发的，笔者使用了rouge，其开源地址是：<http://github.com/pltrdy/rouge>。作为一个python包提供给python开发者调用，安装和使用都比较友好。

### 安装

### 使用

举一个简单例子，更多可以去开源地址的README中查看。

```sql
from rouge import Rouge 

hypothesis = "the #### transcript is a written version of each day 's cnn student news program use this transcript to he    lp students with reading comprehension and vocabulary use the weekly newsquiz to test your knowledge of storie s you     saw on cnn student news"

reference = "this page includes the show transcript use the transcript to help students with reading comprehension and     vocabulary at the bottom of the page , comment for a chance to be mentioned on cnn student news . you must be a teac    her or a student age # # or older to request a mention on the cnn student news roll call . the weekly newsquiz tests     students ' knowledge of even ts in the news"

rouger = Rouge()
scores = rouger.get_scores(hypothesis, reference)

```

输出是json格式：

```json
[
  {
    "rouge-1": {
      "f": 0.4786324739396596,
      "p": 0.6363636363636364,
      "r": 0.3835616438356164
    },
    "rouge-2": {
      "f": ,
      "p": ,
      "r": 0.20833333333333334
    },
    "rouge-l": {
      "f": 0.44705881864636676,
      "p": 0.5277777777777778,
      "r": 
    }
  }
]


```

以上就是关于NLP领域中常用评估指标之一的ROUGE的介绍和实现的分享。后续有更多NLP领域的metric的介绍，力图简单明了，敬请关注～

## 参考引用

> 本文使用 [Zhihu On VSCode](https://zhuanlan.zhihu.com/p/106057556) 创作并发布

