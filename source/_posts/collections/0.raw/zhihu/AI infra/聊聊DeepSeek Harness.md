---
title: "聊聊DeepSeek Harness"
date: 2026-08-14
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/2071643452820001725

---

DeepSeek Harness

可以撤销的副作用
对于有副作用的函数 `f_impure: X → Y`，我们可以建模成一个纯函数 `f: (Γ × X) → (Γ × Y)`，这里的 `Γ` 是环境，在文献中也称为Context，任何副作用都可以表达为对`Γ`的变换。为了讨论恢复我们引入`Γ × (Γ → Γ)`这个类型，记作`∂Γ`，称为**Effect Context**。形象地说这是一个可以撤销的环境。可以理解为每个Effect Context是一对`(γ, φ)`，`γ`是当前的环境，`φ`是将当前环境恢复成初始环境的变换。

我们定义3个操作

- `id = lambda x : x`
- `recover = lambda γ, φ : (φ(γ), id)`
- `track = lambda f, g : lambda γ, φ : (f(γ), φ ∘ g)`其中 `track` 操作是把一个函数 `f` 作用到Effect Context `(γ, φ)` 上，得到新的Effect Context `(f(γ), φ ∘ g)`，其中`g`可以撤销`f`的作用，所以 `φ ∘ g (f(γ)) = φ(γ)`。

整个景象可以画成下图

![](https://pica.zhimg.com/v2-8b582438ddcf6ae0a40dc591c4f7f828_r.jpg)上文描述的是一个固定逆的模型，即对于任意`γ`，固定的`g`都可以撤销`f`的效果。更合理的建模是`g`取决于具体的`γ`，我们引入`Γ → ∂Γ`这个类型，记作`𝔈Γ`，`e(γ) = (γ&#39;, g)`表示一个作用施加在`γ`上可以得到新的环境`γ&#39;`，`g`可以撤销这个效果，对于不同的`γ`有不同的`g`。

这个设定下track可以升级为effect操作

track : (Γ → Γ) × (Γ → Γ) → (∂Γ → ∂Γ)
track (f, g)(γ, φ) = (f(γ), φ ∘ g)

effect : 𝔈Γ → (∂Γ → ∂²Γ)
effect (e)(γ, φ) = 
    let (δ, g) = e(γ) in
    ((δ, φ ∘ g), track(g, pr1 ∘ e))
其中的`∂²Γ`是`∂Γ × (∂Γ → ∂Γ)`，它表示一个Effect Context和恢复Effect Context的操作，形象地说就是可以撤销的环境（一个环境及其撤销操作），及其撤销撤销操作。这就是**Revertible Effect**的含义。

整个景象可以画成下图

![](https://picx.zhimg.com/v2-a527e2ca88164e1f6011e9ad0753d355_r.jpg)另外我们还关心，如果效果1,2,3分别施加了，那撤销的时候按照3,2,1是正确的，但是3,1,2可以吗？这需要两个性质

- 正向和逆向的效果需要是可交换的；
- 组件B的正向效果不影响组件A的逆函数.满足这两个性质的效果称为独立的，我们可以按照任意顺序撤销，都能回到初始状态。

 以上部分是手打的，剩下的不想打了，有ai生成内容）
组件需要什么：依赖即 Coeffect
可逆效果解决的是“组件做了什么”的问题，但组件还需要声明“组件需要什么”。在传统的依赖注入（Dependency Injection）框架中，一个组件通过接口声明它需要的服务，容器在初始化时将这些服务注入进来。然而，动态场景中，依赖的提供者可能来去自如——一个数据库连接可能在运行时断开，一个新服务可能在运行时上线。

我们把“组件需要什么”建模为 **Coeffect Context**。给定一个键类型集合 
![](https://www.zhihu.com/equation?tex=+K+) 和一个类型族 
![](https://www.zhihu.com/equation?tex=+%5Cnu%3A+K+%5Cto+%5Ctext%7BType%7D+)，Coeffect Context 是一个有限部分函数

![](https://www.zhihu.com/equation?tex=+%5CSigma+%3A%3D+%28k%3A+K%29+%5Cto+%5Cmathcal%7BV%7D_k+)

即 
![](https://www.zhihu.com/equation?tex=+%5Csigma%3A+%5CSigma+) 将每个键 
![](https://www.zhihu.com/equation?tex=+k+%5Cin+%5Ctext%7Bdom%7D%28%5Csigma%29+) 映射到一个类型为 
![](https://www.zhihu.com/equation?tex=+%5Cnu_k+) 的值。形象地说，
![](https://www.zhihu.com/equation?tex=+%5CSigma+) 是一个**类型安全的键值存储**——每个键都“知道”自己应该存什么类型的值。

基于这个上下文结构，我们定义两个核心操作：

get : (k : K) → Σ → 𝒱ₖ
get k σ = σ(k)         -- 前提：k ∈ dom(σ)

set : (k : K) × 𝒱ₖ → Σ → Σ × (Σ → Σ)
set (k, v) σ = (σ[k ↦ v], λσ&#39;. σ&#39; \ k)   -- 前提：k ∉ dom(σ)
值得注意的是，`set` 的类型正是 
![](https://www.zhihu.com/equation?tex=+%5Cmathfrak%7BE%7D_%5CSigma+) ——它是一个**可逆效果**！注册一个依赖与撤销它天然地配对在一起。

反应式规格说明
一个组件声明它需要的依赖为一个**规格说明** 
![](https://www.zhihu.com/equation?tex=+d+%5Csubseteq+K+)。给定当前上下文 
![](https://www.zhihu.com/equation?tex=+%5Csigma+)，我们说依赖被满足当且仅当

![](https://www.zhihu.com/equation?tex=+%5Csigma+%5CVdash+d+%3A%3D+%5Cforall+k+%5Cin+d%2C%5C%3B+k+%5Cin+%5Ctext%7Bdom%7D%28%5Csigma%29+)

当上下文发生变化时（一个 `set` 或它的逆被调用），系统对每个组件分类：

状态转换分类系统动作\sigma \not\Vdash d \to \sigma&#39; \Vdash d激活加载该组件\sigma \Vdash d \to \sigma&#39; \not\Vdash d停用卸载该组件其他中性无操作这意味着：**组件从轮询变为响应式**——依赖齐全时自动加载，依赖缺失时自动卸载，无需开发者编写任何重试或错误恢复代码。

隔离与拦截
在复杂系统中，同一个键在不同的上下文中可能需要绑定不同的值。例如，测试环境与生产环境使用不同的数据库。Coeffect Context 支持两层映射：

![](https://www.zhihu.com/equation?tex=+%5CSigma%5E%7B%5Ctext%7Biso%7D%7D+%3A%3D+%28K+%5Cto+R%29+%5Ctimes+%28%28r%3A+R%29+%5Cto+%5Cmathcal%7BV%7D_r%29+)

- 第一层 
![](https://www.zhihu.com/equation?tex=+%5Crho%3A+K+%5Cto+R+)：将键映射到**隔离域**（Realm）
- 第二层 
![](https://www.zhihu.com/equation?tex=+%5Csigma%3A+R+%5Cto+%5Cmathcal%7BV%7D_r+)：将隔离域映射到实际值访问流程：
![](https://www.zhihu.com/equation?tex=+k+%5Cto+%5Crho%28k%29+%5Cto+%5Csigma%28%5Crho%28k%29%29+)。通过 `isolate(k, r)` 操作，我们可以将键 `k` 重定向到隔离域 `r`。

更进一步，**拦截（Interception）** 允许在依赖访问时附加元数据：

![](https://www.zhihu.com/equation?tex=+%5CSigma%5E%7B%5Ctext%7Binter%7D%7D+%3A%3D+%28%28k%3A+K%29+%5Cto+%5Cmathcal%7BM%7D_k%29+%5Ctimes+%28%28k%3A+K%29+%5Cto+%28%5Cmathcal%7BM%7D_k+%5Cto+%5Cmathcal%7BV%7D_k%29%29+)

`intercept(k, metadata)` 将元数据合并到上下文中，后续对 `k` 的访问都会携带这份元数据。这构成了一个**能力式访问控制**系统：一个组件声明它需要什么，系统决定它能拿到什么版本、带什么权限。

统一上下文：将 Effect 和 Coeffect 放在一起
可逆效果（Revertible Effects）和反应式余效果（Reactive Coeffects）分别处理了“组件做了什么”和“组件需要什么”这两个维度。我们将它们统一为一个递归类型：

![](https://www.zhihu.com/equation?tex=+%5CGamma_%5Cinfty+%3A%3D+%5Cmu%5CGamma.%5C%3B+%5CGamma+%5Ctimes+%28%5CGamma+%5Cto+%5CGamma%29+%5Ctimes+%5CSigma+)

这个统一上下文 `ctx` 承载了三件事：

- **当前状态**（递归的环境）
- **恢复函数**（累积逆，撤销效果用）
- **Coeffect 上下文**（依赖表）所有组件交互都通过这个单一的 `ctx` 对象进行。这构成了我们架构的**核心编程模型**：

 组件通过 `ctx` 读写依赖（Coeffect），通过 `ctx` 执行可逆效果（Effect），系统自动追踪和恢复。
组件与生命周期
有了统一上下文之后，一个组件由三部分定义：

![](https://www.zhihu.com/equation?tex=+%5Cmathfrak%7BC%7D_%5CGamma+%3A%3D+%5Cmathfrak%7BD%7D_%5CGamma+%5Ctimes+%5Cmathfrak%7BP%7D_%5CGamma+%5Ctimes+%5Cmathfrak%7BE%7D_%5CGamma%5E%2A+)

- **
![](https://www.zhihu.com/equation?tex=+d+)**：依赖规格说明（需要什么）
- **
![](https://www.zhihu.com/equation?tex=+p+)**：提供声明（提供什么）
- **
![](https://www.zhihu.com/equation?tex=+e+)**：有见证的效果函数（激活时做什么）一个组件在运行时的实例称为**光纤（Fiber）**：

⟨d, p, e, π, σ, τ, θ⟩
其中：

- `π`：父光纤（谁创建了它）
- `σ`：该光纤贡献的依赖表
- `τ`：退役标记
- `θ`：生命周期状态光纤的生命周期是**惯性状态机**：

┌──────────┐
        │ Inactive │
        └────┬─────┘
             │ L-Begin (依赖满足)
             ▼
        ┌──────────┐       L-Iter (每次迭代)
        │Reloading │─────────────────────┐
        └────┬─────┘                     │
             │ L-Finish (完成)           │
             ▼                           │
        ┌──────────┐                     │
        │  Active  │◀────────────────────┘
        └────┬─────┘
             │ L-Leave (目标变化)
             ▼
        ┌──────────┐
        │Unloading │─── L-Unload (依赖方已清空) ──→ Inactive
        └──────────┘
关键设计：

- **Reloading** 状态将加载拆分为多个迭代，每次迭代后检查目标视图是否仍然匹配
- **Unloading** 状态带有一个守卫（Guard）：只有当所有依赖方都已经停用后，才真正执行逆函数
- **惯性**：一旦一个迭代开始（如异步 I/O），它必须完成，不能被中途取消`target_n(γ)` 是光纤的目标视图：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7Btarget%7D_n%28%5Cgamma%29+%3A%3D+%5Cbegin%7Bcases%7D+%5Cperp+%26+%5Ctext%7B%E5%A6%82%E6%9E%9C+%7D+%5Ctau_n+%5Ctext%7B+%E6%88%96+%7D+%5Cgamma+%5Cnot%5CVdash+d_n+%5C%5C+%28k+%5Cin+d_n%29+%5Cmapsto+%5Ctext%7Bprovider%7D_k%28%5Cgamma%29+%26+%5Ctext%7B%E5%90%A6%E5%88%99%7D+%5Cend%7Bcases%7D+)

系统持续驱动每个光纤向它的目标视图收敛，直到达到**静止状态**：每个 `Inactive` 光纤的目标是 `⊥`，每个 `Active` 光纤的目标等于它提交的视图 `ω`。

系统边界与补偿
有了上述机制后，一个自然的问题是：**什么事情可以被撤销？** 答案取决于系统边界。

- **边界内**：系统能够独占修改并恢复原状的操作，如内存分配、文件描述符、事件监听器注册。这些是 `track` 可跟踪的。
- **边界外**：系统无法撤销的操作，如已发出的网络包、写入共享文件的数据。对于边界外的操作，我们有两种策略：

- **延缓发射（Withhold）**：在确认状态持久之前不执行不可逆操作
- **补偿（Compensation）**：用业务语义上的反向操作近似恢复，如“退款”撤销“扣款”、“删除文件”撤销“创建文件”补偿动作按照与逆函数相同的 LIFO 顺序合成，因此论文中的组合性质可以直接迁移。

全局保障：可预测的最终状态
论文的核心结果之一可以用一句话概括：

**系统的最终静止状态只取决于最终的配置，与中间加载/卸载的顺序无关。**这称为**合流性（Confluence）**。这意味着：

- 你可以随时添加、移除、替换组件，系统最终会到达一个一致的状态
- 这个状态等价于“从零开始，按照依赖顺序一次性加载所有最终需要运行的组件”所得到的状态
- **热模块替换（HMR）** 是这一性质的直接应用：修改源文件后，系统将旧组件卸载、新组件加载，最终状态与重启后一致
Python 实现核心
有了上述理论，我们可以用 Python 实现这个架构。核心是 `Context` 类的属性拦截：

class Context:
    def __init__(self, parent=None, fiber=None):
        self._parent = parent          # 父上下文
        self._fiber = fiber            # 所属光纤
        self._store = {}               # 依赖表 Σ
        self._isolate = {}             # 隔离表 ρ
        self._dispose_stack = []       # 累积逆 (LIFO)
    
    def __getattr__(self, name):
        # 1. 检查当前 Fiber 的已提交视图
        if self._fiber and name in self._fiber.committed:
            return self._fiber.committed[name]
        # 2. 检查是否声明但未加载
        if self._fiber and name in self._fiber.inject:
            raise AttributeError(f&#34;依赖 {name} 未激活&#34;)
        # 3. 沿父链向上查找
        if self._parent:
            return getattr(self._parent, name)
        raise AttributeError(f&#34;依赖 {name} 未声明&#34;)
    
    def __setattr__(self, name, value):
        if name.startswith(&#39;_&#39;):
            object.__setattr__(self, name, value)
            return
        # 这是一个可逆效果：注册依赖
        async def _effect():
            realm = self._isolate.get(name, name)
            old = self._store.get(realm)
            self._store[realm] = value
            await self._notify(name)
            async def _inverse():
                if old is not None:
                    self._store[realm] = old
                else:
                    del self._store[realm]
                await self._notify(name)
            return _inverse
        inverse = await self._track(_effect)
        self._dispose_stack.append(inverse)
配套的 `Fiber` 类实现惯性状态机：

class Fiber:
    async def refresh(self):
        target = self._compute_target()
        if target is not None and self.state == INACTIVE:
            await self._load(target)
        elif target is None and self.state == ACTIVE:
            await self._unload()
    
    async def _unload(self):
        # 守卫：等待所有依赖方停用
        while self._has_dependents():
            await asyncio.sleep(0.01)
        # 执行 LIFO 恢复
        while self.ctx._dispose_stack:
            inverse = self.ctx._dispose_stack.pop()
            await inverse()
        self.state = INACTIVE

总结
DeepSeek Harness 是一个基于 **Revertible Effects** 和 **Reactive Coeffects** 的动态组件系统。其核心设计理念可以概括为：

- **可逆性**：每个副作用都配有显式的逆函数，系统自动组合和跟踪，卸载时自动恢复
- **反应性**：组件声明依赖，系统在依赖变化时自动激活/停用组件
- **惯性**：生命周期状态机支持异步、分步加载，并能在依赖变化时优雅地转向卸载
- **可预测性**：最终状态与调度顺序无关，等价于静态组装DeepSeek 正在将这个架构应用于 Agent Harness，支持插件在运行时动态加载、卸载、替换，而无需重启或手动管理资源清理。理论保证让开发者可以专注于业务逻辑，将复杂的生命周期管理交给系统。