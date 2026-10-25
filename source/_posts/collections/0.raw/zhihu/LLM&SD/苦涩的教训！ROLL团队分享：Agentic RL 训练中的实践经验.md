---
title: 苦涩的教训！ROLL团队分享：Agentic RL 训练中的实践经验
date: "2026-02-15 00:00:00"
updated: "2026-02-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/苦涩的教训-ROLL团队分享-Agentic-RL-训练中的实践经验/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2006389553703982040
---


** 作者：Yancheng He, Weixun Wang, and Xiaoyang Li | Project Leader:  Weixun Wang

- English Version：https://www.notion.so/The-Bitter-Lesson-Behind-Building-Agentic-RL-in-Terminal-Environments-2eaddd45837f80c9ad2ed6a15ef3c1a1?pvs=21
- 🚀ROLL TEAM：https://wwxfromtju.github.io/roll_team.html
- 📄 技术报告：[https://arxiv.org/pdf/2512.24873](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2512.24873)
- 🧠 模型:[https://huggingface.co/FutureLivingLab/iFlow-ROME](https://link.zhihu.com/?target=https%3A//huggingface.co/FutureLivingLab/iFlow-ROME)
- 🧩 框架:  

- RL训练框架: [https://github.com/alibaba/ROLL](https://link.zhihu.com/?target=https%3A//github.com/alibaba/ROLL)
- 沙盒环境管理: [https://github.com/alibaba/ROCK](https://link.zhihu.com/?target=https%3A//github.com/alibaba/ROCK)
- Agent框架:[https://github.com/iflow-ai/iflow-cli](https://link.zhihu.com/?target=https%3A//github.com/iflow-ai/iflow-cli)

- 📊 Benchmarks: [https://github.com/alibaba/terminal-bench-pro](https://link.zhihu.com/?target=https%3A//github.com/alibaba/terminal-bench-pro)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_c203a472393e.jpg)

### 两个 RLers 的故事

Alex 是一名二年级博士生，过去几个月一直在做 RLVR（Reinforcement Learning with Verifiable Rewards）。训练 LLM 解数学题、写代码的过程几乎都很立竿见影——模型生成回答，获得奖励，然后变得更好。干净、简单。

“RLVR 本质上就是一个单步骤的 bandit 问题。”Alex 常常这样和实验室同学开玩笑。

有一天，导师突然建议他去探索 agentic 任务：网页导航、工具调用、在真实环境中的多步推理。

“未来是 Agent。”导师意味深长地说。

Alex 信心满满地投入其中：“能有多难？我都懂 PPO 了，GRPO 论文也看过，RLVR pipeline 也上线过。”

两周后，Alex 盯着一条毫无起色的训练曲线发呆。

“怎么了？”正在悄悄做 agent 系统的高年级学生 Morgan 问。

“什么都不对！”Alex 抱怨道。“我的模型行为总是很怪异，环境还总是出现各种问题，结果什么都学不到。信用分配根本无从下手。训练速度贼慢。还有轨迹存储的问题——光是存 KV cache 就把 GPU 显存耗光了。”

Morgan 点了点头：“欢迎来到 agentic RL。它已经不是 bandit 了。”

“可我读过所有长时序 RL 的论文啊……”

“论文给你的是算法。它不会告诉你，轨迹跑到一半环境崩了该怎么办；每个 episode 长度不同怎么 batch rollout；或者怎么在训练时高效回放 50 步长的轨迹。”

Alex 无力地靠在椅背上：“那我该怎么办？”

Morgan 笑了笑：“幸运的是，我们把这些都记录下来了——基础设施、技巧、失败案例。稍有杂乱，但都是真实发生的。”

那一天，Alex 终于意识到：

RLVR 训练的是一个“会回答”的模型。 而 Agentic RL 训练的是一个“会行动”的模型——跨时间、跨状态、跨不确定性地行动。**

而这，改变了一切。

**

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_5a3fb2ca71ad.jpg)

RLVR 在数学、代码与通用推理任务上带来了显著提升。但在其成功背后，也隐藏着一种结构上的简化：传统的 RLVR 更像是一种 in-context bandit 问题**——模型生成一次完整回答，获得奖励，然后更新参数。过程中不存在多步交互式决策与环境状态转移。

Agentic RL 则更接近多步交互式 MDP 的设定：模型需要<strong>采取行动</strong>、<strong>观察环境反馈</strong>，并在<strong>稀疏且延迟的奖励信号下，对长程轨迹进行优化</strong>。

这意味着模型不再只是“给出一个答案”，而是要在不断变化的环境中持续决策和修正行为，并为最终结果负责。这也让应用场景从封闭、可验证的任务，扩展到诸如旅游规划、复杂数据分析等更为复杂的真实任务。

这种转变也对基础设施和算法设计提出了更高的要求：包括端到端异步的训练管线、更稳定的长时序信用分配机制、与真实环境的深度集成，以及能够支撑持续扩展的工程基础设施。本文记录了我们在这一方向上的探索经验。

我们将首先介绍我们如何构建的训练<strong>环境</strong>，随后分享我们如何<strong>筛选</strong> RL 训练实例，最后讨论我们在<strong>训练</strong> Agentic RL过程中积累的一系列实践经验。

对算法部分更感兴趣的读者，可以直接跳转至训练部分。

*<strong>Why this matters ?</strong>* *Agentic RL is not just about algorithms — it requires co-designing environments, infrastructure, and algorithms.*
### 环境管理器：从 0 到 1

为了在终端环境中使用强化学习训练智能体，我们首先在 <strong>ROLL</strong> 中构建了一套环境管理器，并清晰地划分了三个核心组件之间的交互边界：<strong>ROLL（训练框架）</strong>、<strong>iFlow CLI（Agent 框架）</strong> 和 <strong>ROCK（沙箱管理器）</strong>。

在实践中，我们支持了两种互补的模式：

- <strong>Roll-Managed Mode</strong>：由 ROLL 负责上下文管理与轨迹构建；主要通过工具调用接口与 iFlow CLI 交互。
- <strong>CLI-Native Mode</strong>：上下文、会话与历史信息完全由 iFlow CLI 维护；ROLL 仅作为调用方，不负责轨迹拼接。
在不同的训练阶段，我们会根据当前的优先目标在这两种模式之间切换。

#### <strong>Roll-Managed Mode</strong>

在这种模式下，终端环境以轻量级、step粒度的方式运行，而 ROLL 负责整个 rollout 循环、轨迹构建与上下文管理。

<strong>主要组件包括：</strong>

- <strong>TrajEnvManagerTB</strong>：驱动完整的 rollout 流程（重置→ 决策 → 执行 → 终止），并保存训练所需的轨迹数据。
- <strong>TerminalBenchEnv</strong>：加载终端任务数据，向沙箱提交执行请求，收集执行结果，并根据测试结果计算奖励。
- <strong>SandboxManager</strong>：管理沙箱会话的生命周期（创建会话、执行命令、上传文件等）。
- <strong>IFlowCLITool</strong>：解析工具调用格式及返回结果，并构造符合 iFlow CLI 协议的可执行命令。
这种模式的主要优势在于<strong>训练侧的高度灵活性</strong>：可以根据训练需求灵活组织上下文，<strong>引入更丰富的 prompt 模板和交互机制以提升鲁棒性(重要)</strong>。

但其缺点就是需要在 ROLL 内部维护额外的上下文处理逻辑，这不可避免地会与真实 iFlow CLI Agent 的行为存在一定差距。

#### <strong>CLI-Native Mode</strong>

**

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_1f4481975d93.jpg)

在许多 Agentic RL 训练管线中，训练阶段的 prompt 设计与上下文管理往往与生产环境中的真实 Agent 框架不同，这通常会导致部署后的模型能力下降。为了更好地与 Agent 侧的优化保持一致，我们也同时开发了 CLI-Native Mode**。

在 CLI-Native 模式下，我们相当于是直接在“iFlow CLI 上训练模型”。

- 在 RL 过程中，ROLL <strong>直接调用</strong> iFlow CLI  api 获取最新上下文，而不是手动拼接 prompt 或重实现 Agent 逻辑。
- iFlow CLI <strong>负责管理</strong>所有上下文、会话与历史信息，确保模型在训练时看到的输入分布与真实使用场景一致（包括动态上下文、工具列表、系统提示词、内部状态等），并将更新后的上下文返回给 ROLL。
- iFlow CLI 与 ROLL 通过一个轻量级的 <strong>ModelProxy Service</strong> 通信，该服务提供基于队列的异步消息机制，用于交换 LLM 请求与响应，支持高并发与非阻塞执行。
这种模式确保训练、评估与部署都完全一致，最大程度减少行为不一致的问题，但在训练侧上下文定制方面的灵活性相对较低。

在实践中，我们会在不同阶段使用这两种模式，它们相互补充。

#### 一些实现细节

#### 异步训练管线

Agentic RL 具有明显的<strong>长尾延迟（long-tail latency）特性：大多数 rollout 能够快速完成，但少数 rollout 由于生成文本较长或缓慢的环境交互而耗时较长</strong>。

<strong>在同步、批量式 rollout 管线</strong>中，这些长耗时任务极易成为<strong>拖尾瓶颈（straggler bottleneck）</strong>，导致 GPU 利用率下降、端到端延迟增加。

**

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_4028872494cc.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_d70525025468.jpg)

为了解决这一问题，我们在 ROLL 中构建了一套完全异步的训练管线**。具体包括：

- <strong>环境级异步 rollout</strong>：将 rollout 中的LLM 生成、环境交互与奖励计算拆解独立，互不阻塞，实现更细粒度的执行调度。
- <strong>冗余并行环境</strong>：通过增加环境组数量与组大小，避免 fail-slow 或 fail-stop 环境成为系统瓶颈。
- <strong>异步训练机制</strong>：在不同设备上解耦 rollout 与训练阶段，使其并行推进。
- <strong>Train–rollout 复用机制</strong>：通过时间分片（time-division multiplexing）动态划分 GPU 资源，使设备可以在 infer与train之间灵活切换。
这一设计使系统在面对各种长尾现象时依然保持鲁棒，并在高延迟波动下维持稳定吞吐。

如果你对底层设计与更多实现细节感兴趣，可以参考我们的 [ROLL Flash](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2510.11345) 论文和 [ROLLART](https://link.zhihu.com/?target=https%3A//www.arxiv.org/pdf/2512.22560) 论文。

**

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_db7ce449bd29.jpg)

#### 保持环境“干净”

在终端 RL 训练中，初始环境状态直接决定了 Agent 能够观察与利用的内容。即便是极小的残留痕迹——例如临时文件、缓存链接、未完成安装、或泄露的测试脚本——都可能会影响学习信号。

在早期实验中，我们发现了两个相关问题：

- 环境初始化与 Agent 安装过程往往会留下中间产物（如临时文件、缓存包、部分安装结果），这些信息可能间接提示模型。
- 在少量合成环境中，测试文件尽管经过目录隔离与权限控制，模型仍可能通过某些路径或命令被模型间接访问到。
尤其是第二种情况，模型会非常迅速地“偷懒”：与其认真推理任务，不如直接读取甚至修改测试脚本。图中展示了早期训练中最常见命令的分布情况。测试脚本调用次数（红色标注）显著上升，说明模型越来越依赖这种捷径，最终大量 rollout 退化为直接执行测试文件。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_5376fe8d563a.jpg)

为防止此类泄露与污染，我们会进行严格的环境清理：

- 在 rollout 前主动清理环境初始化或 Agent 安装过程中产生的中间文件。
- 测试文件仅在最终评估阶段上传**，与训练阶段严格隔离。
简而言之，我们确保环境保持干净，并严格隔离所有测试相关的文件，让 Agent 真正在沙箱中学习解决问题，而不是利用残留线索或测试脚本漏洞。

### RL训练实例

RL 训练实例的质量对于 agentic RL 至关重要。同时并非所有“高质量”的实例都适合用于 RL 训练。在我们的训练管线中，RL 实例主要来自两个来源：

- 大规模合成的实例：按照难度与标签采样，并由多个外部供应方进一步标注与筛选。
- 专家编写的实例：通常难度更高、构造更精细。
关于合成流程的详细介绍，可参考我们的技术报告：[Let It Flow](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2512.24873)这里就不重点介绍了

下面主要总结几个在实践中比较关键的问题。

#### 伪阳性问题

在早期阶段，我们发现大量合成实例存在 <strong>false positive（伪阳性）</strong> 问题：自动生成的测试用例要么不完整，要么本身存在问题。

当然这是自动化单测生成中的普遍存在的问题，但在 agentic RL 中尤为致命，因为模型可能会有各种办法“钻空子”。在我们早期的合成数据中，false positive 比例一度高达<strong>约 40%</strong>。

一个典型的例子：

<strong>Task Description</strong>

`Configure a git server so that I can run on my computer

git clone user@server:/git/server
echo "hello world" > hello.html

```bash
git add index.html
git commit -m "add index"
git push origin webserver
```


And have this data then be pushed to a webserver running on port 8080 so if I run

curl 

then I see the output "hello world"`

但测试脚本只检查：`curl ` 是否返回 `"hello world"`.

因此，Agent 完全可以在不真正构建 git → push → deploy 整个流水线的情况下通过测试——例如直接将 `hello.html` 写入 web 根目录。最终输出结果看似正确，但底层系统行为并不符合预期。

**

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_915a9cbad0d7.jpg)

为了解决这个问题，我们在数据合成流程中引入了一个完备的 LLM-as-judge 验证模块**。多个 LLM 协同审查每一组“指令–测试”对，识别具有高 false-positive 风险的实例。对于这些高风险样本，我们会强化测试用例或调整任务描述。只有通过验证的实例，才会进入 RL 训练池。

#### Ground-Truth 与 No-Op 验证

在将实例加入 RL 训练池之前，我们都会进行两个基础检查：

- <strong>Ground-truth 验证</strong>：如果golden solution无法通过全部测试，则丢弃该实例。
- <strong>No-op 验证</strong>：如果在不执行任何有效操作的情况下也能通过测试，则丢弃该实例。
这两个检查可以有效避免引入会产生误导性训练信号的实例。

#### 环境多样性与鲁棒性

借助 Roll-Managed Mode 的灵活性，我们会有意在初始环境中引入多样性，例如：

- 不同版本的软件包；
- 不同镜像源；
- 不同的环境配置细节。
这样做的目标是防止 Agent 过拟合于某一种“理想化”的环境配置，使其能应对更多样的环境。

除了上面提到的随机化之外，我们有时还会进一步<strong>有意扰动甚至部分破坏环境</strong>——例如移除某个预装依赖或切换到不可用的镜像源。这迫使模型学会检查、诊断与恢复，而不是默认一切环境条件都已准备就绪。

在实践中，这些操作相当于一种<strong>环境增强(environment augmentation)</strong>：它们帮助 Agent 处理不确定性，促使其在行动前主动检查环境状态，并提升其对不同环境配置的适应能力。

**

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_616bf0baf6e8.jpg)

### 如何保证终端环境中Agentic RL 的稳定性

在真实终端环境中进行 agentic RL训练，与在静态数据集上训练有很大的不同。训练的不稳定性不仅来自策略优化本身，还来自于实例质量、环境噪声、框架约束以及长程信用分配**等多方面因素。

下面我们分享一些我们认为在实践中比较关键的技巧和经验。

#### Mask and Filter

终端环境不可避免地会出现：

- 瞬时的网络故障；
- 沙箱启动失败；
- 工具调用偶发超时等问题。
如果将这些异常信号直接纳入策略更新，会向优化过程引入噪声。为此，我们采用了较为通用的 <strong>mask & filter 策略</strong>，就遵循一个简单原则：

<strong>当前对训练有害或无法提供有效学习信号的样本都可以采用mask或是filter</strong>

在高噪声、强环境依赖的 agentic RL 训练中，这往往是维持训练稳定性的基础保障。基于这一思路，我们将失败显式划分为两类：

<strong>不可恢复或大规模的错误</strong>（例如环境启动失败、沙箱不可用）：这类样本会被完全 <strong>mask 掉</strong>，并用占位样本替换，以保证能有 batch size大小的数据。

`def handle_rollout_with_mask(rollout, failure_type):
        """

```text
        rollout: one trajectory (episode-level)
        failure_type: describes what went wrong during rollout
        """
```


        # Unrecoverable or large-scale failures
        # e.g. env init failed, sandbox unavailable, reward computation broken

```sql
        if failure_type in {
            "env_init_failed",
            "sandbox_unavailable",
            "env_reset_failed",
            "reward_calculation_failed",
        }:
            # Create a placeholder rollout to keep batch shape stable
            placeholder = create_placeholder_rollout()
```


            # Mask all tokens so this sample contributes zero gradient

```text
            placeholder.response_mask[:] = 0
            placeholder.advantages[:] = 0
            placeholder.rewards[:] = 0

            placeholder.meta["masked"] = True
            return placeholder
```


        # Normal rollout: keep as-is
        return rollout`

<strong>偶发且可恢复错误</strong>（例如工具超时、网速延缓等）：这类样本会被 <strong>filter 掉</strong>，并在全局控制比例（例如 ≤50%）下丢弃，避免过度重试。

`class GroupFilterTB:

```python
        def __init__(self, config: AgenticConfig, env_manager_config: EnvManagerConfig, mode: str):
            self.config = config
            self.env_manager_config = env_manager_config
            self.mode = mode
            self.global_filter_stats = {"total": 0, "filtered": 0}

        def filter(self, group_id: int, episode_id: int, group: list[DataProto]):
            """
            Decide whether to filter out an entire group of rollouts.
            """

            self.global_filter_stats["total"] += 1
```


            # Step 1: Check whether this group contains any rollout
            # that explicitly requests to be dropped

```text
            # (e.g., due to tool timeout, transient execution error)
            should_drop = False
            for data in group:
                if data.meta_info.get("drop_flag", False):
                    should_drop = True
                    break
```


            # If no rollout indicates a drop condition, keep the group
            if not should_drop:
                return False

            # Step 2: Compute the current global filter ratio
            # This guards against pathological cases where
            # too many groups are dropped and training stalls

```text
            current_global_filter_ratio = (
                self.global_filter_stats["filtered"] / self.global_filter_stats["total"]
                if self.global_filter_stats["total"] > 0 else 0.0
            )
```


            # If we already filtered too much globally, stop filtering

```text
            if current_global_filter_ratio >= 0.5:
                return False
```


            # Also prevent the *next* filter from exceeding the limit

```text
            if (self.global_filter_stats["filtered"] + 1) / self.global_filter_stats["total"] > 0.5:
                return False
```


            # Step 3: Drop this group and update global stats

```text
            self.global_filter_stats["filtered"] += 1
            return True`
```


此外，我们在训练过程中还会根据需要引入其他类型的 mask 操作，例如 max-turn mask 等，以进一步约束异常轨迹对优化的影响。

如下图所示，不使用 mask & filter 时训练波动较大、准确率不稳定；而采用该策略后，训练曲线更加平滑，并收敛到显著更优的性能。

**

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_22579f52af78.jpg)

#### 保守起步：先从正样本轨迹学习

在早期阶段，RL 往往受限于数据质量，而不是优化算法本身**（当数据质量较差时，再好的优化方法也难以奏效）。

我们的观察是：<strong>在数据尚未完全可靠时，仅使用正样本轨迹进行训练明显更稳定</strong>。

当然也存在共识：数据足够可靠时，同时利用<strong>正负轨迹</strong>能够带来更好的泛化能力。

我们对两种训练策略进行了直接对比。在大规模合成数据上，同时使用正负轨迹进行更新往往频繁崩溃，而仅用正轨迹训练在各种设置下都保持稳定。

**

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_bdaab9216ffc.jpg)

当切换到小规模、高质量、经过专家验证的数据后，趋势发生变化：两种方法都能稳定训练，但加入负轨迹后，下游测试集上的性能提升更显著。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_e9bca16b5a82.jpg)

基于此，我们采用了一种简单的课程式策略：

- 早期阶段，仅使用正样本轨迹更新策略**，利用大规模实例数据构建稳定的策略流形。
- <strong>后期阶段</strong>，当拥有小规模但高质量的实例（通常为专家构建并多轮验证）后，才开始同时考虑<strong>正负轨迹训练</strong>。
这种课程式方法既避免了早期发散，又保留了后期性能提升空间。

*<strong>与 RFT 的区别：</strong>* 乍看之下，仅使用正样本进行更新可能类似 Reinforcement Fine-Tuning（RFT），但两者在形式与训练动力学上存在明显的差异：** 

- 前者损失函数仍然是标准的 RL 目标函数，而非完全的行为克隆式目标，因此通常具备更强的泛化能力。
- 前者策略更新仍遵循标准 RL 流程，包括 masking、clipping、normalization 等稳定机制，从而可以自然整合样本过滤、细粒度奖励以及训推不一致控制等策略——这些在噪声较大的终端环境中尤为重要。 需要强调的是，positive-only RL 并不是 RFT 的替代，而是一种更为保守的 RL 训练方式。

#### Chunked MDP

多轮 agentic 任务中：

- 大多数 token 并不会改变环境状态；
- 一条轨迹中可能包含多个决策节点；
- 在大多数情况下，每一次交互步骤都对应一个具体的决策或状态转移。
因此我们重新思考了 agentic RL 的最佳优化单元。

#### 核心思路

我们提出在 interaction chunk（交互片段）** 层面建模多轮 agentic 交互。所谓 interaction chunk，是指从一次环境交互到下一次环境交互之间的一段连续片段，通常以一次工具调用结束，构成一个完整的功能单元。

与其对单个 token 或整条轨迹进行优化，我们将每个 chunk 视为一个语义上的“动作单元”。

在此基础上，我们提出了 <strong>Interaction-Perceptive Agentic Policy Optimization（IPA）</strong>，其核心包括：

- 在 <strong>chunk 层级</strong> 而非 token 层级计算回报与重要性采样；
- 当推理策略与训练策略的偏差过大时，对 <strong>整个 chunk 进行 masking</strong>，而不是逐 token masking，从而更契合以结果为导向的粗粒度奖励结构；
- 引入 chunk 初始化重采样，以及 imitation learning + RL 的混合训练方式，扩大模型在困难任务上的有效学习范围。
总体而言，IPA 将信用分配、重要性采样与学习信号重新锚定在“<strong>interaction chunk”这一</strong>统一的交互单元上。

#### 收益

这种设计带来了两个实际收益：

- 在长程轨迹上获得更稳定的梯度；
- 提升模型可学习能力的上限。
从实验结果来看，IPA 在困难的长程任务上始终表现出更平滑的梯度与更强的性能表现。下图展示了 token 级优化与 chunk 级优化的直接对比：

**

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3085021335d6.jpg)

关于 Chunked MDP 的完整公式、masking 策略以及 chunk 初始化重采样方法，我们已在技术报告中进行了系统整理。对完整技术细节感兴趣的读者，可参考我们的技术报告。

下面展示的是采用最终 IPA 算法训练得到的模型训练曲线：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_cd7ad59b9f22.jpg)

#### 自适应地应用 RL 技巧

Agentic RL 为什么更难？**

在训练 agentic model时，有以下几个突出的问题：

<strong>重尾分布与极端负回报</strong>

少数失败轨迹可能异常长（例如无限重试、长循环、重复工具调用），从而产生极大幅度的负回报。这些重尾样本容易主导梯度，导致策略分布向次优区域偏移，引发训练不稳定。

<strong>带正向结果的浅层策略模式</strong>

模型可能并未真正理解任务，而是依赖重复试错、某些固定命令序列或某些捷径。由于 outcome reward 只检查最终结果，这类浅层模式可能被强化，逐渐收缩策略空间并形成固化的模板。

<strong>噪声型失败</strong>

失败往往多样且不明确，未必由都模型本身引起，可能是由环境随机性或系统级干扰引起。负样本的置信度通常低于正样本。

从宏观角度看，agentic RL 面临的问题与 RLVR 在 outcome reward 下的问题类似：信用分配、负样本不可靠、训练不平衡。但在终端环境中，这些问题更为严重：<strong>时序更长；工具交互更离散；改变环境的 token 占比极小；失败模式更多样，负样本方差更大等</strong>。

在 agentic 设置下，训练信号的信噪比显著下降，使得信用分配与样本可靠性问题更加敏感。

我们通常会根据当前的主导因素采取不同缓解策略，例如：

- selective trajectory masking
- selective token masking
- trajectory-level reweighting
- retry-loop penalties
- other light behavior shaping rewards or penalties, …
这些策略的核心目标一致：<strong>控制哪些轨迹、轨迹的哪些部分，以及以何种权重参与策略梯度更新</strong>。

需要强调的是，没有通用解法。不同数据条件下，同一策略可能产生相反效果。

如下图所示，在两种不同的数据设置下，我们观察到了截然相反的现象：在一种情况下，移除标准差（std）会迅速导致训练崩溃；而在另一种情况下，同样的操作却反而使训练更加稳定（这里主要是数据分布的差异导致）。

**

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_4fcc9f814d7c.jpg)

这一现象与我们此前在 RLVR 任务中对各类 RL 技巧的分析结果是一致的。感兴趣的读者可以参考我们的论文以了解更多细节：[RL Tricks](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2508.08221)

#### Crash 是常态，关键是如何Resume

由于上述各种不稳定因素的存在，agentic RL 在训练过程中会更容易发生崩溃。因此，我们首先需要建立一个简单的心态：

*在大规模终端 RL 训练中，崩溃是常态。*

#### 训练样例

如下图所示（红色曲线），训练分数在大约 step ~80 时开始急剧下降。但如果回看更早阶段，我们可以看到在开始崩溃之前，优势的平均值已经出现了明显的持续下滑趋势。

进一步分析发现：

- 从大约 step ~50 开始，失败轨迹的最大回复长度迅速上升**；
- <strong>但是失败轨迹的样本数基本保持不变</strong>。
这表明问题并非源于整体失败数量的增加，而主要是少量<strong>极端失败轨迹的影响</strong>。

为缓解这一问题，我们首先对响应长度超过 20k 的失败轨迹进行 masking来消除这些极端负样本的影响（以及其他目标一致的策略，例如<strong>降低权重</strong>）。从灰色曲线可以看到，优势的平均值开始回升，训练过程趋于稳定。

**

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_76e9c6424447.jpg)

但在大约 40 个 step 之后，不稳定再次出现。这一次，最早的信号是负样本数量逐渐增加**。针对这一现象，我们对负样本进行全局重加权，降低其在策略更新中的整体贡献。结果如橙色曲线所示。

**

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_c85a5ea4fede.jpg)

通过这一步调整，训练再次恢复稳定。这只是一个简单的示例——在整个训练过程中，我们经历了许多类似的时刻。

当训练出现不稳定时，我们通常优先检查以下几个信号：

- 是否有少量极端轨迹正在主导更新？** （典型特征：异常长的失败轨迹，伴随重尾分布的负回报） → 采用masking，降低这些轨迹的权重，并收紧 clipping。
- <strong>负样本是否在整体上占据主导？</strong> → 降低负样本权重，过滤低置信度失败样本，或采用课程式训练策略。
- <strong>模型是否在学习“坏模式”？</strong> → 引入行为惩罚、更多维的奖励设计等。
- …
另外有两条经验性原则：

- <strong>优先针对极端轨迹进行定向处理（如果极端轨迹能被某些特征定位到，例如 mask 掉超长负样本），如果仍然不稳定，再采用全局重加权。</strong>
- <strong>RL 梯度通常比监督学习噪声更大，因此更小的学习率，配合更强的约束、退火或自适应机制，往往更稳定。</strong>

#### 细粒度行为监控与惩罚

在 Agentic RL 中，reward hacking 往往更加隐蔽。由于智能体与真实环境交互，它们常常可以以“看似合理”的方式通过测试用例。

在实践中，我们观察到一些反复出现的模式：

- <strong>修改既定环境</strong>：智能体不是解决任务本身，而是直接修改初始环境设置。
- <strong>工具过度使用</strong>：反复调用工具完成一些简单或琐碎的操作，本质上是在进行暴力重试。
- <strong>滥用搜索</strong>：通过大量重复调用搜索引擎来弥补内部推理能力不足。
- <strong>不安全或破坏性操作</strong>：执行高风险命令，例如删除所有文件或终止所有进程。
- <strong>隐蔽的捷径</strong>：利用测试脚本或环境默认配置中的漏洞，在未真正解决任务的情况下通过测试。
这些现象主要是两点启示。

第一，测试用例的质量与鲁棒性至关重要——薄弱或描述不充分的测试可能在无意中奖励错误行为。

第二，并非所有实例都适合用于 RL 训练：某些任务本身难以通过测试准确评估，反而更容易诱导模型寻找捷径或形成不良模式，而不是学习真正的解决方案。

值得一提，我们在训练过程中对模型行为进行了很细粒度的监控。比如会跟踪如下信号：

- 不同任务的成功率趋势；
- 不同工具的成功 / 失败率；
- 重复或循环的工具调用模式；
- 不同工具使用频率；
- 不同命令使用频率。
通过这些信号，我们可以快速发现行为异常的任务，例如某个工具调用突然激增、出现大量重试循环，或频繁执行“kill process”类命令等等。一旦检测到类似模式，我们会回滚训练，或定位并移除引发问题的实例。

根据我们的经验，<strong>这种持续、细粒度的监控与动态调整，也是保证长期 agentic RL 训练稳定且有效运行的关键（尤其是在防止隐蔽 reward hacking 行为方面）</strong>。

- <strong>环境服务的可观测性</strong>
这里额外提一点沙盒环境服务的可视化观测也非常重要。

下面这张图，是我们某次大规模训练期间的沙盒并发监控。不同颜色代表不同环境组，在高峰阶段系统会同时维持数千级别的并发会话，图中的尖刺往往对应某些环境组瞬时的负载激增或回收延迟。

事实上，<strong>我们在多个阶段都遇到过因环境并发抖动导致的训练异常，这些问题在没有系统级服务观测的情况下会很难定位。</strong>

**

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_ba1b0567e15a.jpg)

我们的训练离不开ROCK工程团队的长期支持。所使用的沙盒管理系统[ROCK](https://link.zhihu.com/?target=https%3A//github.com/alibaba/ROCK)已经开源，欢迎了解

#### 总结

Agentic RL本身就是细节很多，这本质上也是一套高度耦合的系统：数据、环境、奖励、调度、优化……任何一个小环节出问题，都可能在几十个 step 之后放大成一次 crash。

所以早期阶段不可避免地会经历大量排查：看曲线、翻日志、做可视化、定位异常轨迹、回滚实验 （我们的家常便饭了）

但当这些关键环节被一一理顺、可视化监控体系搭起来之后， 后面的训练都会顺利起来，训练曲线基本都很稳定，异常模式可以被提前发现，crash也基本可溯源。

前期那些看似繁琐的检查，其实是在为后面的大规模稳定训练打基础。

而一旦把这些基础打牢，很多事情就会自然展开。

### Looking Forward

从建模角度看，终端环境其实更接近 部分可观测马尔可夫决策过程（POMDP）**。

Agent通常无法直接观察到完整的环境状态：例如完整的文件系统结构、已安装软件版本、先前修改过的配置以及过去的失败尝试，都很难完整呈现。

很多我们在训练中遇到的问题，本质上都可以归结为两个老问题：<strong>部分可观测性</strong> 与 <strong>长期信用分配</strong>。

这些问题并不新，但在 agentic 场景下会被进一步放大。我们认为 agentic RL 还有若干值得探索的方向：

<strong>挖掘更复杂的长时序任务与有效的 agentic 模式</strong>

一方面，我们确实需要更复杂、更贴近真实世界的长时序任务（现在terminal-bench里的大多任务并非真正的长序任务）

另一方面，我们认为：有些 agent 能力，至少在当前阶段，很难仅靠 RL 自发涌现（互联网上有大量记录“人如何思考”的文本，但很少有系统性记录“人如何完成复杂任务”的完整执行过程——因为这些任务往往跨平台、跨设备、跨时段展开，完整轨迹难以被收集）。

主动地挖掘并强化<strong>有效的 agentic 行为模式</strong>是一个值得思考的地方。

<strong>更真实的 Agent–Environment–Human闭环优化</strong>

在真实应用中，Agent 面对的并不是静态环境与固定工具接口，而是一个持续演化的包含Agent，Environment，Human<strong>的系统</strong> 。用户可能随时补充信息、修改需求、纠正错误，甚至直接改变环境本身。

面对这种动态场景，Agent 不能只是一味执行指令，而要学会主动获取信息、在不确定时及时确认，并在收到反馈后更新自己的判断，并将这些“提问—反馈—更新信念”的过程纳入训练与评估，从而建立更接近 human-in-the-loop 与 online RL 的优化框架。

<strong>更强大的基建与更开放的环境</strong>

Agentic RL 其实非常地吃工程能力，需要高并发、低阻塞、可扩展的环境执行能力；需要足够稳定且高度异步的训练框架来降低时间开销；更需要能够支撑模型持续 scaling 的工程基础。

与此同时，当前许多终端环境仍然高度依赖人工配置——例如固定的镜像源、权限边界控制、预安装软件，以及被限制在单机或 Docker 容器中的执行空间。

这些都会无形中限制模型的探索空间。如果我们希望 Agent 具备更强的泛化能力，很可能需要 <strong>更高层次、更开放、更可演化的环境体系</strong>，并结合<strong>依赖环境动态变化的奖励设计（而非静态奖励规则）</strong>。

<strong>更细粒度的信用分配与奖励建模</strong>

相较于 RLVR，agentic RL 有更多可被利用的中间信号，例如工具执行成功与否、子任务完成情况、环境状态一致性检查等。但我们并不认为依赖复杂的奖励规则设计（例如对工具失败固定施加 −0.5 惩罚）是一种可持续的解决方案。

### 其他有趣的发现

#### 并行函数调用

下图对比了 <strong>qwen3-coder-plus、glm-4.6、claude-sonnet-4.5 以及 ROME</strong> 在同一批任务上的轨迹表现，展示了在单个 assistant step 内进行 *并行函数调用* 的频率与分布情况。

我们观察到，<strong>claude-sonnet-4.5 的并行度显著更高</strong>，无论是在进行并行工具调用的频率上，还是在单步内同时调用的工具数量上，都明显领先。

**

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_316d51773392.jpg)

进一步的分析发现，claude-sonnet-4.5 往往更擅长在执行具体操作前识别当前真正需要的信息**。它通常不会立刻进入执行阶段，而是先识别环境中的关键不确定性，并在同一步骤中通过多个并行的“检查类调用”获取信息。

例如，当给出任务“Install Anaconda for me”时，claude-sonnet-4.5 会在单一步骤中进行多项检查，包括但不限于：

- 使用 `pwd`、`ls`、`cat`、`grep` 等命令检查目录结构与配置状态；
- 使用 `python -V` 和 `pip list` 识别现有 Python 环境与依赖情况；
- 使用 `read_file` 与 `search` 查找可行的安装方法及相关约束（如网络连通性、镜像可用性）。
从经验上看，这种并行调用主要集中在<strong>检查类工具</strong>上，而不是直接修改环境的执行或编辑类操作。

这种模式为 Agent 设计与训练提供了一个有价值的启示：在进行状态改变之前，显式鼓励一个“前置的、并行的信息收集阶段”可能是有益的。

#### 常见失败模式

在对一些轨迹分析中我们发现终端类 agentic 任务中最常见的两类失败模式是：<strong>无效循环（unproductive loops）</strong> 与 <strong>超时（timeouts）</strong>。

智能体往往在已有明确失败信号的情况下，仍然重复同一种策略，而不懂切换思路或重新审视假设，从而形成冗长而无效的交互链条。

另一方面，超时也是一个重要失败来源：归结到模型上往往是<strong>缺乏对长时间运行命令执行时长的可靠感知</strong>，容易被默认超时机制误导，从而产生误判或反复重试。

除了这两类主导模式之外，我们还观察到其他问题，例如幻觉、不恰当的工具选择，以及违反任务约束等。

下图展示了多个模型在 Terminal Bench 上的错误类型分布：

**

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_a80866aeb157.jpg)

### 总结

我们所遇到的核心挑战——长时序信用分配、部分可观测性、噪声失败以及脆弱的环境——在强化学习领域并非新问题。

真正的难点在于，如何构建稳定可靠的整个系统（训练框架、沙盒环境和agent框架等）。

当然Agentic RL 仍处于早期阶段，本文中提到的许多技术，可能并非最佳实践或最终方案，主要都是我们在实际实验过程中总结出的经验教训**。

<strong>展望未来，随着环境更加开放、任务更加复杂，我们相信真正的进步将来自于优化目标、环境、训练框架之间更加紧密的协同设计和整合</strong>。

我们希望这篇博客以及此前的技术报告，能够为那些在真实环境中训练 agentic model的研究者与工程师提供帮助，或许也能让他们少走一些我们曾经踩过的弯路。
