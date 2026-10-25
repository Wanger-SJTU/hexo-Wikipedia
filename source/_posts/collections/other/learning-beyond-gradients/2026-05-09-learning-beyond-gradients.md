---
title: Learning Beyond Gradients
date: "2026-05-09 11:25:53"
updated: "2026-05-09 11:25:53"
layout: post
permalink: /collections/other/learning-beyond-gradients/2026-05-09-learning-beyond-gradients/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 博客
  - RL
  - Heuristic Learning
  - Continual Learning
source_url: https://trinkle23897.github.io/learning-beyond-gradients/
---


# Learning Beyond Gradients

> 原文：https://trinkle23897.github.io/learning-beyond-gradients/
> 作者：Jiayi Weng

![](/images/collections/other/learning-beyond-gradients/asset/ig_0c2dd0d2f07176560169fbc256930481969d3c6ba3316d5486.png)

## The Anomaly

While maintaining [EnvPool](https://github.com/sail-sg/envpool) in my spare time, I wanted a cheaper way to test whether game environments were behaving correctly. Running a neural network every time was too expensive for CI.

The initial question was:

> Can we write cheap, reproducible heuristics that are much stronger than a random policy, and use them to drive environments into informative states?

I tried using Codex (gpt-5.4) to write a rule-based version, with no neural network at all. After a few rounds, the results were far more surprising than I expected:

- In Atari Breakout, a programmatic policy went from 387 → 507 → 839 → 864, eventually reaching the theoretical maximum score.
- In MuJoCo Ant, a pure Python policy first learned a rhythmic gait, then added short-horizon model planning, and finally reached 6000+, in the range of common Deep RL results.
- In MuJoCo HalfCheetah, interpretable gait/posture rules plus online planning reached a five-episode evaluation mean of 11836.7, also in the range of common Deep RL results.
- Across Atari57, I ran 57 games x 2 observation modes x 3 repeats = 342 coding-agent search trajectories. The results were uneven, but under a fixed environment-step budget, median HNS around 1M environment steps was already far above PPO-style Deep RL baselines at the same step count.

The raw scores were surprising enough. But the more interesting part was: Codex was not training a neural network. It was maintaining a software system that could keep growing.

Breakout policy was far beyond "move left when the ball is on the left." The policy had grown action probes, state readers, ball and paddle detectors, landing prediction, stuck-loop detection, regression tests, video replays, and experiment logs. Ant policy was more than a gait formula too: it had rhythmic control, posture feedback, contact signals, and short-horizon model rollouts.

That is when I felt a new concept was needed. The thing being updated was no longer just a policy function. It was a software system with memory, feedback channels, and regression mechanisms.

## Heuristic Learning

After more iteration with Codex, I started calling this process **Heuristic Learning (HL)**:

- HL is built out of program code.
- Like Deep RL as commonly practiced today, it has a loop of state, action, feedback, and update; unlike that setup, the object being updated is software structure rather than neural-network parameters.
- Its feedback is consumed by a coding agent, and can come from environment reward, test cases, logs, videos, replays, or human feedback.
- Its updates do not use backpropagation. The coding agent directly edits policies, state detectors, tests, configuration, or memory.
- HL is the learning and update process. The object maintained by HL over time can be called a **Heuristic System (HS)**.
- An HS is more than an isolated `policy.py`. It contains at least a programmatic policy, state representation, feedback channels, experiment records, replays or tests, memory, and an update mechanism executed by a coding agent. A single rule is not enough. Rules, feedback, history, and the next update path all need to connect before it becomes an HS.

| Axis | Deep RL | HL |
|------|---------|-----|
| Policy | Neural network parameters | Code: rules, state machines, controllers, MPC, macro-actions |
| State | Usually explicit observations | Usually explicit variables, detectors, caches, and other readable representations |
| Action | Produced by a neural network forward pass | Produced by executing code logic |
| Feedback | Mainly fixed reward | Provided through coding-agent context: tests, environment feedback, logs, and replays all count |
| Update | Gradient-based updates to neural-network parameters in a Deep RL algorithm | Direct code edits by a coding agent |
| Memory | On-policy methods basically have none; off-policy methods have replay buffers | Can explicitly store trials, summaries, failure reasons, replays, and version diffs |

Heuristic Learning has several useful properties compared with Deep RL:

- **Explainability**: neural networks are hard to explain, while HL policies can often be translated into plain language.
- **Sample Efficiency**: one effective code update can jump directly to a new policy, rather than slowly climbing through learning-rate tuning.
- **Regression-testability**: old capabilities can become tests, replays, or golden cases.
- **Overfitting can be constrained**: code heuristics can still overfit to seeds, environment details, or test loopholes, but simplification, regression checks, and multi-seed evaluation provide an engineering form of regularization.
- **It can avoid part of catastrophic forgetting**: old capabilities do not have to live only inside model weights; they can be written into rule sets and tests.

The point is that a class of heuristics that used to be too expensive to maintain may now be worth owning.

## Why Heuristic Learning Did Not Take Off Earlier

If HL has ancestors, they are expert systems and rule systems. Before coding agents, their maintenance cost was brutal.

Human-maintained heuristics easily turn into this:

```
Add one rule today to fix case A.
Tomorrow, case B breaks.
Add another if-statement the day after.
The day after that, nobody dares delete anything.
```

The problem was not that heuristics were useless. The problem was that humans could not afford to keep maintaining them. Maintaining expert systems by hand was a bit like spinning thread before the Industrial Revolution: one person can do it, but once the scale grows, stability and maintenance cost become crushing. Spinning machines changed the production curve; coding agents change the maintenance curve for heuristics. They act like a channel that can continuously deliver intelligence into a Heuristic System and let it keep evolving.

The common agentic feedback loop today looks roughly like this:

```
feature request -> agent writes code -> tests pass -> human gives some feedback -> next patch
```

As models improve, human intervention should shrink. In systems with clear boundaries, this feedback loop can start to close automatically, allowing HL to produce Heuristic Systems in bulk:

```
environment feedback / test failure / log anomaly
-> coding agent reads context
-> edits policy / test / memory
-> reruns
-> writes results back into trials and summaries
-> continues to the next round
```

## How Heuristic Learning Does Continual Learning

In neural networks, catastrophic forgetting happens when new data pushes parameters toward a new task and old capabilities get overwritten. HL can forget too, just in a more engineering-shaped way:

- A new rule fixes one failure mode and breaks an old scenario.
- A new memory repeatedly steers the agent in the wrong direction.
- A test is too narrow, so the policy learns to exploit it.
- A patch changes a shared interface, and old callers quietly break.
- Rules keep piling up until even the agent can no longer maintain the system.

So HL does not automatically solve Continual Learning. It turns "avoiding forgetting" into a more engineering-oriented problem.

In HL, old capabilities can be fixed into:

- regression tests;
- fixed-seed replays;
- golden traces;
- failure videos;
- version diffs;
- explicitly written-down failed directions.

This is very different from compressing experience into neural network weights. HL history is explicit, readable, deletable, and refactorable. It is responsible for remembering, but also for compressing a pile of local patches into a simpler representation.

> An HS that only grows and never compresses will eventually become a big ball of mud. It may "remember" many things, but the form of memory is so poor that nobody dares touch it, and the system decays.

A healthy HS therefore needs at least two operations:

- **Absorb feedback**: write new failures, logs, and rewards back into the system.
- **Compress history**: fold local patches back into simpler, more maintainable representations.

That turns Continual Learning from "how do we update parameters?" into "how do we maintain a software system that keeps absorbing feedback?"

## The Complexity of Heuristic Systems

I define **coupling complexity** as the level of strategy complexity a coding agent can maintain in order to support HL. More concretely, it is how many interdependent states, rules, tests, feedback signals, and historical constraints an update has to account for at the same time.

This cannot be measured by lines of code. A 500-line policy with clean module boundaries, good tests, reproducible state, and clear logs may be easy to maintain. An 80-line policy where every line affects every other line, with no logs or replays, may be a time bomb.

On the code side, coupling complexity is bounded by module boundaries, interface stability, test coverage, observability, rollback cost, and state reproducibility. Good modularity cuts global coupling into local coupling, reducing the complexity an agent must hold in its head. Good tests let the coding agent avoid simulating the whole system mentally on every change.

On the coding-agent side, coupling complexity depends on model capability, context length, memory quality, tool quality, and iteration speed. A stronger model can handle more interactions at once. Longer context means fewer lost threads. Memory preserves experience across rounds. Search, localization, execution, and replay tools move part of the cognitive load outside the model.

Putting the two sides together gives a few working hypotheses:

- Clearer feedback increases the coupling complexity that a fixed amount of agent intelligence can maintain.
- With the same tools and feedback, stronger models can handle higher coupling complexity.
- Modularity, tests, and replays move part of the coupling complexity into the environment.
- Memory and tools increase the agent's effective context.
- An HS that only grows and never compresses will keep increasing coupling complexity until it exceeds maintenance capacity.

Breakout policy reaching the full 864 score is partly because the rules are simple, but also because failures can be replayed on video, locally reproduced, and regression-tested. Ant is much more complex, but it decomposes into rhythm, posture, contact, and residual MPC modules.

Montezuma is a useful counterexample. In Atari57, one unattended run reached 400 points, but the route consisted of 86 macro-actions and was basically open-loop execution. That example shows that some environments need stronger program forms: composable macro-actions, recoverable search state, and long-term memory. Plain if else cannot solve everything.

## The Next Paradigm?

The current paradigm shift has gone from pretraining to RLHF, and then to large-scale RL / RLVR. **Anything that can be verified starts to become solvable.**

Online Learning and Continual Learning can be partially addressed by agents produced by RLVR, through Heuristic Learning. From that perspective, I would call it a candidate for the next paradigm: **anything that can be continuously iterated on starts to become solvable.**

Why only partially? Because Heuristic Learning cannot do everything neural networks can do. It is bounded by what code can express, especially in complex perception and long-horizon generalization. With what I know today, I cannot imagine an agent writing pure Python code, without a neural network, to solve ImageNet.

The real question is how to combine neural networks and HL to address Online Learning and Continual Learning together. The most promising direction seems to be: use HL to process online data quickly, turn online experience into trainable, regression-testable, filterable data, and then periodically update the neural network.

Take robotics as an example. If we borrow the System 1 / System 2 language, one possible division of labor is:

- **Specialized shallow NNs**: part of System 1, fast and cheap, responsible for perception, classification, and object-state estimation.
- **HL**: also part of System 1, responsible for fresh data handling, rules, tests, replays, memory, safety boundaries, and local recovery.
- **LLM agent**: System 2, responsible for giving feedback to HL, improving data, and periodically extracting HL-generated data to update itself.

This can be further decomposed into a hierarchy:

```
joint-level HL -> limb-level HL -> whole-body balance HL -> task-level HL
```

Lower levels handle safety and low-latency control. Middle levels handle gait and contact. Higher levels handle tasks, recovery, and long-term memory. The coding agent does not necessarily "understand walking" directly. It is more like an update pipeline inserted into the system: continuously feeding failure videos, sensor streams, simulation results, and test results into the system, then rewriting the feedback into code, parameters, guard rules, and memory.

LLM agents can share what they learn, or they can learn inside robotics in isolated branches. The open problem is how the specific data distribution produced by HL can avoid destabilizing the LLM's periodic updates.

Agentic coding changes the speed of writing code. It also changes **which code is worth owning for the long term**.

Many heuristics looked hopeless because the real issue was maintenance cost. They were not necessarily too weak. Coding agents change that maintenance curve. Rules, tests, logs, memory, and patches used to be scattered engineering materials. Now they can become a continuously updated Heuristic System, one that can genuinely address problems Online Learning and Continual Learning have struggled to solve.

**Welcome to the next paradigm.**

## 实验数据

### Atari Breakout 样本效率

![](/images/collections/other/learning-beyond-gradients/asset/heuristic_breakout_sample_efficiency.png)

### MuJoCo Ant 样本效率

![](/images/collections/other/learning-beyond-gradients/asset/heuristic_ant_sample_efficiency.png)

### MuJoCo HalfCheetah 样本效率

![](/images/collections/other/learning-beyond-gradients/asset/heuristic_halfcheetah_sample_efficiency.png)

### Atari57 对比

![](/images/collections/other/learning-beyond-gradients/asset/atari57_openrl_sample_efficiency_context.png)

![](/images/collections/other/learning-beyond-gradients/asset/atari57_per_game_hns_comparison.png)

---

> 更多实验细节和代码见 GitHub 仓库：https://github.com/Trinkle23897/learning-beyond-gradients
