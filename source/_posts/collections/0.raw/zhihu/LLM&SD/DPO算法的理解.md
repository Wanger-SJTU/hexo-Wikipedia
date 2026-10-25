---
title: DPO算法的理解
date: "2023-12-01 00:00:00"
updated: "2023-12-01 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/DPO算法的理解/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/669825918
---


**原理：**

          将经过SFT后的模型本身作为奖励模型，但是参数不更新；

          policy模型也是本身，但是参数更新；

          然后经过下面的loss函数去更新policy模型：

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_ea95a1e74e8f.jpg)

DPO损失函数**loss函数理解：**

DPO算法的目的就是最大化奖励模型，使得奖励模型对chosen和rejected的差值最大，这样模型就可以学到人类偏好。反映到模型中就是：模型更新是最小化loss，根据以上公式，最小化loss等价于最大化以下部分。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_b5779e265977.jpg)

最大化部分根据对数函数运算，以上公式可以转化为a-b，a和b公式如下：

$a=log(&#x03C0;&#x03B8;(yw|x))&#x2212;log(&#x03C0;ref(yw|x))" role="presentation">a=log(πθ(yw|x))−log(πref(yw|x))a = log(\pi_{\theta}(y_{w}|x)) - log(\pi_{ref}(y_{w}|x))  $

$b=log(&#x03C0;&#x03B8;(yl|x))&#x2212;log(&#x03C0;ref(yl|x))" role="presentation">b=log(πθ(yl|x))−log(πref(yl|x))b = log(\pi_{\theta}(y_{l}|x)) - log(\pi_{ref}(y_{l}|x))  $

 其中，a代表经过训练之后的policy模型与之前的reference模型对于chosen的差值越来越大。对于rejected的差值越来越小。（参考：[DPO: Direct Preference Optimization 论文解读及代码实践 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/642569664)）

1）a变大，b变小，理想情况，chosen response概率提升，rejected response概率下降

模型训练结束后更倾向选择chosen的答案。

**代码：**

`    def dpo_loss(
        self,
        policy_chosen_logps: torch.FloatTensor,
        policy_rejected_logps: torch.FloatTensor,
        reference_chosen_logps: torch.FloatTensor,
        reference_rejected_logps: torch.FloatTensor,
        reference_free: bool = False,
    ) -> Tuple[torch.FloatTensor, torch.FloatTensor, torch.FloatTensor]:
        """Compute the DPO loss for a batch of policy and reference model log probabilities.

        Args:
            policy_chosen_logps: Log probabilities of the policy model for the chosen responses. Shape: (batch_size,)
            policy_rejected_logps: Log probabilities of the policy model for the rejected responses. Shape: (batch_size,)
            reference_chosen_logps: Log probabilities of the reference model for the chosen responses. Shape: (batch_size,)
            reference_rejected_logps: Log probabilities of the reference model for the rejected responses. Shape: (batch_size,)
            beta: Temperature parameter for the DPO loss, typically something in the range of 0.1 to 0.5. We ignore the reference model as beta -> 0.
            reference_free: If True, we ignore the _provided_ reference model and implicitly use a reference model that assigns equal probability to all responses.

        Returns:
            A tuple of three tensors: (losses, chosen_rewards, rejected_rewards).
            The losses tensor contains the DPO loss for each example in the batch.
            The chosen_rewards and rejected_rewards tensors contain the rewards for the chosen and rejected responses, respectively.
        """
        pi_logratios = policy_chosen_logps - policy_rejected_logps
        ref_logratios = reference_chosen_logps - reference_rejected_logps

        if reference_free:
            ref_logratios = 0

        logits = pi_logratios - ref_logratios

        losses = -F.logsigmoid(self.beta * logits)
        chosen_rewards = self.beta * (policy_chosen_logps - reference_chosen_logps).detach()
        rejected_rewards = self.beta * (policy_rejected_logps - reference_rejected_logps).detach()

        return losses, chosen_rewards, rejected_rewards`

**向量形状转化流转换：**

`policy_model = llama13b
ref_model = deepcopy(llama13b).eval()

model:
batch为4
input:([8, 101]) [(question+chosen),(question+chosen),(question+chosen),(question+chosen)，(question+rejected),(question+rejected)，(question+rejected),(question+rejected)]
将input送入policy_model得到all_logits：([8, 101, 39410])，39410是voc_size。
per_token_logps = torch.gather(logits.log_softmax(-1), dim=2, index=labels.unsqueeze(2)).squeeze(2)
对all_logits求softmax获得每个token在词表分布的概率per_token_logps为([8, 101])
return (per_token_logps * loss_mask).sum(-1)  ##([8])
返回的是每个句子中所有的token的概率之和
用此chosen概率shape:([4])和rejected概率shape:([4])，送入上面的dpo_loss函数中。用句子token的概率之和衡量模型对句子选择的概率。`

**缺点：**

1、由loss函数可知，其只是增加了chosen和rejected之间的差值，但是并未对其本身打分做loss，可能会导致chosen和rejected都很小甚至是负数，但是他们的差距很大。2、由于chosen的结果一般都比rejected的结果更长，所以经过dpo之后，可能会导致输出某些情况下的结果更长，不准确和重复的问题。

**参考文献：**

[消费级显卡搞定RLHF——DPO算法+QLora微调LLM拒绝有害问题回答实战 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/641620563)

[DPO: Direct Preference Optimization 论文解读及代码实践 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/642569664)
