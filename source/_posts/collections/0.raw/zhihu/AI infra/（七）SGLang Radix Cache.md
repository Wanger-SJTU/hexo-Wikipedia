---
title: （七）SGLang Radix Cache
date: "2026-08-01 00:00:00"
updated: "2026-08-01 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/(七)SGLang-Radix-Cache/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2066173524881019817
---


目的

- 理解 Radix Cache 数据结构。
- 理解 Radix Cache 是如何参与运算的。
- 搞清楚为什么使用 Radix Cache 后，即便 temperature=0 输出依旧具有随机性。
背景
起因是我偶然在项目里发现即便设置 temperature=0，在不禁用 Radix Cache 时，结果依旧不会固定下来。为了让结果固定下来我尝试了[确定性输出（--enable-deterministic-inference）](https://zhuanlan.zhihu.com/p/2065441956180779576)，后来我发现把 Radix Cache 关了（--disable-radix-cache）就能够确定输出。这篇可以算作确定性输出的延伸，让我们挖出不确定性的根因。测试的 prompt 可能会影响不确定性的复现，测试代码我放在了下方的附录中。

Radix Tree 数据结构
有点像一个最长前缀匹配树，如下图所示，看样子是一个 prompt 进来就开始从根节点进行最长前缀匹配。

- 如果没匹配上就在根节点底下开一个新的节点，如（1）-> （2） 或 （5）-> （6）所示。
- 如果完全匹配上了就从节点向下走，用剩余的 prompt 在本节点下面开一个子节点，如（2）->（3）或（4）->（5）等。
- 如果空间满了就会释放（evict）子节点。感觉大概就是这么个意思，下面我们具体看看是如何实现的。代码位置在 `sglang/python/sglang/srt/mem_cache/radix_cache.py` 。我发现的一个好的文章 [KV-Cache复用：SGLang RadixCache源码解读](https://zhuanlan.zhihu.com/p/1981142131348350886)。这个文件里有三个类：RadixKey、TreeNode、RadixCache。我们从 TreeNode 开始讲起。

![](https://pic1.zhimg.com/v2-768fcd3904941f1a8bdffd53e17feaae_r.jpg)论文图 （https://arxiv.org/pdf/2312.07104）
TreeNode 
我们来看一下参数，身为一个树的节点有父节点（parent）和子节点（key）没什么好惊奇的。key 是节点对应的 token_ids，一个节点要从根节点一路走过来拼接上才是真正的 prompt，比如说上图（2）中 a 节点的 key 就是 "You are a helpful assistant.\nUser: Hello!\nAssistant: Hi!" 这段字符对应的 token ids。value 对应的是每个 token 对应的 device token slot（[不知道 slot 这个概念的看这里](https://zhuanlan.zhihu.com/p/2063186900777805603)）。

hit count 表示这个 node 命中测试，当淘汰策略时有用（比如说每一轮 step hit count --，hit count = 0 时进入淘汰队列）。host_ref_counter 表示当前有多少个异步存储（存到主机内存里）或搬运操作正在使用这份 host cache，暂时不能淘汰它；host_value 则是记录这个节点在  host kv cache 的 slot。hash_value 是对每一页 page 包括前面所有的 token 做hash，得到一个值，有点类似于 id，在不搞什么 offload、distribution 操作时没啥用。

```python
class TreeNode:
    counter = 0
    def __init__(self, id: Optional[int] = None, priority: int = 0):
        self.children = defaultdict(TreeNode)
        self.parent: TreeNode = None
        self.key: RadixKey = None
        self.value: Optional[torch.Tensor] = None

        self.hit_count = 0
        self.host_ref_counter = 0
        self.host_value: Optional[torch.Tensor] = None
        self.hash_value: Optional[List[str]] = None

        TreeNode.counter += 1
```


RadixKey 
token_ids 就是我们上面讲的：这一个节点对应的 token ids。extra_key 还包含了 Lora 等骚操作，有 extra key 的话，即便 token ids 都对上也不能复用 cache。is_bigram 的含义是：是否将 token 序列解释为相邻 token 对，在 EAGLE 模式（投机采样）时会用到。limit 提供一份视图，比如说当前的节点上存的 token ids 是 [22, 11, 4, 56]，但是 limit=3，所以对于这个节点来说只有 [22, 11, 4] 是有效的 token。但这并不会影响子节点的前缀是 [22, 11, 4, 56]。

page_aligned() 是把自己按照页面大小裁剪一下，毕竟只有完整的一页才能用做 cache。举个例子，当前的 token ids 是 [22, 11, 4, 56, 3]。paged size = 2，那么我们只取 [22, 11, 4, 56] 缓存。

<strong>match() 是核心的函数</strong>，它的作用是比较最长公共前缀。令 a=RadixKey([1, 2, 3, 4, 5])，b=RadixKey([1, 2, 3, 9])，则 a.match(b) = 3。使用“二分比较”的算法，比较的还是 O(n) 个 token，但是相较于循环查询 python 循环次数从 O(n) 变为了 O(log n)。

```python
child_key() 为了找路径用的。比如当前进入父节点 token 都对上了。现在要选进入到父节点的哪个子节点时，取出第一块（由 page size 决定块大小）和请求的第一块比较。

class RadixKey:
    """is_bigram=True: token_ids holds raw tokens (N+1 for N bigrams); slices share one boundary token."""

    __slots__ = ("token_ids", "extra_key", "is_bigram", "limit")

    def __init__(
        self,
        token_ids: array[int],
        extra_key: Optional[str] = None,
        is_bigram: bool = False,
        limit: Optional[int] = None,
    ):
        self.token_ids = token_ids
        self.extra_key = extra_key
        self.is_bigram = is_bigram
        self.limit = limit

    def page_aligned(self, page_size: int) -> RadixKey:
        if page_size == 1:
            return self
        aligned_len = len(self) // page_size * page_size
        return self[:aligned_len]

    def match(self, other: RadixKey, page_size: int = 1) -> int:
        self._check_compatible(other)
        t0, t1 = self.token_ids, other.token_ids
        assert type(t0) is type(t1), (type(t0), type(t1))
        n = min(len(t0), len(t1))

        matched_tokens = n
        lo = 0
        step = 1
        while lo < n:
            hi = lo + step if lo + step < n else n
            if t0[lo:hi] != t1[lo:hi]:
                while hi - lo > 1:
                    mid = (lo + hi) // 2
                    if t0[lo:mid] == t1[lo:mid]:
                        lo = mid
                    else:
                        hi = mid
                matched_tokens = lo
                break
            lo = hi
            step *= 2
```


        if self.is_bigram:

```python
            matched = max(0, min(matched_tokens - 1, len(self), len(other)))
            return (matched // page_size) * page_size if page_size > 1 else matched

        matched_tokens = min(matched_tokens, len(self), len(other))
        if page_size == 1:
            return matched_tokens
        return (matched_tokens // page_size) * page_size

    def child_key(self, page_size: int = 1):
        t = self.token_ids
        plain = t[0] if page_size == 1 else tuple(t[:page_size])
        return plain if self.extra_key is None else (self.extra_key, plain)
```


RadixCache
讲讲参数，disable 代表是否彻底关闭 Radix Cache。关闭时不查树、不插树，KV 用完直接释放。req_to_token_pool 是 token id -> KV slot 的映射表。token_to_kv_pool_allocator 分配和释放 KV slot 的分配器。disable_finished_insert 请求结束时是否禁止将其 KV 插入缓存；确定性相关场景可能使用。

```python
class RadixCache(SessionRadixCacheMixin, KVCacheEventMixin, BasePrefixCache):
    def __init__(self, params: CacheInitParams):
        self.disable = params.disable
        self.req_to_token_pool = params.req_to_token_pool
        self.token_to_kv_pool_allocator = params.token_to_kv_pool_allocator
        self.page_size = params.page_size
        self.is_eagle = params.is_eagle
        self.disable_finished_insert = params.disable_finished_insert
        self.eviction_policy = params.eviction_policy.lower()

        self.kv_event_queue = []

        self.eviction_strategy = get_eviction_strategy(self.eviction_policy)
        self.evictable_leaves = set()
```


匹配最长前缀 match_prefix()
它完成的事情是：输入请求 token⟶最长可复用前缀对应的 KV slot indices。输入 params（里面包含请求的 key）对现有的 Radix Cache 做匹配，如果最长前缀匹配点正好在节点内部，就把这个节点劈了。

```python
    def match_prefix(self, params: MatchPrefixParams) -> MatchResult:
        key = params.key
        key, _ = key.maybe_to_bigram_view(self.is_eagle)

        key = key.page_aligned(self.page_size)
        value, last_node = self._match_prefix_helper(self.root_node, key)
        if value:
            value = torch.cat(value)
        else:
            value = self._empty_match_result.device_indices
        return MatchResult(
            device_indices=value,
            last_device_node=last_node,
            last_host_node=last_node,
            best_match_node=last_node,
        )

    def _match_prefix_helper(self, node: TreeNode, key: RadixKey):
        child_key = key.child_key(self.page_size)                           # child key = 当前要匹配的第一块 token ids
        value = []                                                          # 能匹配到的 KV slot
        while len(key) > 0 and child_key in node.children.keys():
            child = node.children[child_key]                                # Radix Cache 里面能够进入的那个 node
            prefix_len = child.key.match(key, page_size=self.page_size)     # Radix Cache 里面找最长匹配的长度
            if prefix_len < len(child.key):                                 # 匹配到 Radix Cache 的一半
                new_node = self._split_node(child.key, child, prefix_len)   # 把 child 按照 prefix_len 进行 split。分成两份都加入到 parent.child 里面了
                value.append(new_node.value)                                
                node = new_node
                break
            else:                                                           # Radix Cache 全都匹配上了
                value.append(child.value)
                node = child
                key = key[prefix_len:]

                if len(key):
                    child_key = key.child_key(self.page_size)

        return value, node
```


插入节点 insert()
插入函数就是拿一串 key（token ids）和当前 Radix Tree 每个节点做匹配，看看能插到哪，能正好插的就插上。不行就把一个节点劈开，再插。

```python
    def insert(self, params: InsertParams) -> InsertResult:
        key = params.key
        value = params.value
        priority = params.priority
        chunked = params.chunked

        key, value = key.maybe_to_bigram_view(self.is_eagle, value)
        key = key.page_aligned(self.page_size)
        value = value[: len(key)]
        prefix_len, last_node = self._insert_helper(
            self.root_node, key, value, priority, chunked
        )
        return InsertResult(prefix_len=prefix_len, last_device_node=last_node)

    def _insert_helper(
        self,
        node: TreeNode,
        key: RadixKey,
        value,
        priority: int = 0,
        chunked: bool = False,
    ):
        child_key = key.child_key(self.page_size) # 把自己的头 ids 拿出来 

        total_prefix_length = 0
        while len(key) > 0 and child_key in node.children.keys():           # 找找看要进哪个 Radix Tree 的 child 分支
            node = node.children[child_key]                              
            prefix_len = node.key.match(key, page_size=self.page_size)
            total_prefix_length += prefix_len
            key = key[prefix_len:]
            value = value[prefix_len:]

            if prefix_len < len(node.key):                                 # 没完全匹配上
                new_node = self._split_node(node.key, node, prefix_len)    # 把当前 Radix Tree Node 劈开，返回前面匹配上的 node
                self._inc_hit_count(new_node, chunked)
                node = new_node
            else:                                                          # 完全匹配上了
                self._inc_hit_count(node, chunked)
            if len(key):
                child_key = key.child_key(self.page_size)

        if len(key):                                            # 匹配上的就复用，没匹配上的生成新的节点挂到树上
            new_node = TreeNode(priority=priority)
            new_node.parent = node
            new_node.key = key
            new_node.value = value.clone()
            self._inc_hit_count(new_node, chunked)
            node.children[child_key] = new_node
            self.evictable_size_ += len(key)
            self._update_leaf_status(node)
            self._update_leaf_status(new_node)
            node = new_node
        return total_prefix_length, node
```


驱逐叶节点 evict()
当 KV pool 空间不足时，从“当前安全可删的缓存叶节点”中，按配置的淘汰策略选择节点，释放其真实 GPU KV slot。它删的是整段 `TreeNode.value`，因此目标是“至少释放 `num_tokens` 个 slot”，不保证刚好等于该数。

```python
    def evict(self, params: EvictParams) -> EvictResult:
        num_tokens = params.num_tokens
        leaves = list(self.evictable_leaves)
        eviction_heap = [
            (self.eviction_strategy.get_priority(node), node) for node in leaves
        ]
        heapq.heapify(eviction_heap)

        num_evicted = 0
        while num_evicted < num_tokens and len(eviction_heap):
            _priority, x = heapq.heappop(eviction_heap)

            self.token_to_kv_pool_allocator.free(x.value)
            num_evicted += len(x.value)
            self._delete_leaf(x)

            if len(x.parent.children) == 0 and x.parent.lock_ref == 0:
                new_priority = self.eviction_strategy.get_priority(x.parent)
                heapq.heappush(eviction_heap, (new_priority, x.parent))

            self._record_remove_event(x)

        return EvictResult(num_tokens_evicted=num_evicted)
```


Cache 的请求与释放

```python
cache_unfinished_req() 在一个 prefill chunk 完成时调用。将当前已经完整计算的 page 提前交给 Radix Cache，并把请求的 token→KV slot 映射切换到树里的规范索引，然后让请求继续执行。请仔细看完下方代码注释后再回来看一遍这句话。

    def cache_unfinished_req(self, req: Req, chunked=False):
        token_ids = req.get_fill_ids()
        kv_indices = self.req_to_token_pool.req_to_token[
            req.req_pool_idx, : len(token_ids)
        ]

        radix_key = RadixKey(
            token_ids, req.extra_key, is_bigram=self.is_eagle
        ).page_aligned(self.page_size)
        values = kv_indices[: len(radix_key)].to(dtype=torch.int64, copy=True)
```


        # 把这个new key插入到 Radix Tree

```sql
        result = self.insert(
            InsertParams(
                key=radix_key,
                value=values,
                chunked=chunked,
                priority=getattr(req, "priority", 0) or 0,
            )
        )
        new_prefix_len = result.prefix_len
        # 如果请求一开始就命中了 Radix Cache，命中的那部分不会重新分配 KV slot，也不会被这行代码释放。
        # 这行 free() 处理的是：本请求开始执行之后，树里又出现了更长的相同前缀，导致本请求已经算出的某一段 KV 变成重复副本。
        # req.cache_protected_len 是调用 cache_unfinished_req() 之前，请求已经复用并保护的缓存前缀长度。
        # new_prefix_len是此次调用 insert() 时，发现树中原本就已经存在的公共前缀长度。
        self.token_to_kv_pool_allocator.free(
            kv_indices[req.cache_protected_len : new_prefix_len]
        )
```


        # 拿到的是 Radix Tree 中的自己的 KV slot 索引

```text
        match_result = self.match_prefix(MatchPrefixParams(key=radix_key))
        new_indices, new_last_node = (
            match_result.device_indices,
            match_result.last_device_node,
        )
        assert len(new_indices) == len(
            radix_key
        ), f"{len(new_indices)=}, {len(radix_key)=}"
```


        # 更新一下 req_to_token_pool 记录的 request 的 KV Slot 位置

```text
        self.req_to_token_pool.write(
            (req.req_pool_idx, slice(req.cache_protected_len, len(new_indices))),
            new_indices[req.cache_protected_len :],
        )

        # 更新保护长度，保护长度的概念在 self.token_to_kv_pool_allocator.free() 就已经讲了
        req.cache_protected_len = len(new_indices)

        self.dec_lock_ref(req.last_node)
        self.inc_lock_ref(new_last_node)
```


        # 更新一下 Request 内部管理的 KV slot 状态信息

```python
        if len(new_indices) < len(kv_indices):
            req.prefix_indices = torch.cat(
                [new_indices, kv_indices[len(new_indices) :]]
            )
        else:
            req.prefix_indices = new_indices

        req.last_node = new_last_node

        self._tag_session_leaf(req, radix_key, node=new_last_node)
cache_finished_req() 在请求彻底结束时调用。执行逻辑很简单：（1）如果没有启动 KV Cache 就在这里进行 KV slot 释放；（2）否则，如果开启了 is_insert 就最后再更新一下 Radix Tree，然后释放尾部不整齐的 KV slot；（3）如果关闭了 is_insert 就释放没有进 Radix Cache 的 KV slot。

    def cache_finished_req(self, req: Req, is_insert: bool = True):
        # 推测解码等场景可能生成过临时 token
        # 只有 commit 过的才是确定的 token
        kv_committed_len = req.pop_committed_kv_cache()         
        if self.disable:                                        # KV cache 释放在这里执行
            kv_indices = self.req_to_token_pool.req_to_token[
                req.req_pool_idx, :kv_committed_len
            ]
            self.token_to_kv_pool_allocator.free(kv_indices)
            return

        token_ids = (req.origin_input_ids + req.output_ids)[:kv_committed_len]
        kv_indices = self.req_to_token_pool.req_to_token[
            req.req_pool_idx, : len(token_ids)
        ]
        # 构建 RadixKey
        radix_key = RadixKey(
            token_ids, req.extra_key, is_bigram=self.is_eagle
        ).page_aligned(self.page_size)
        key_len = len(radix_key)
        values = kv_indices[:key_len].to(dtype=torch.int64, copy=True)
```


        # Radix Cache takes one ref in memory pool
        if is_insert:  # 树中没有的新后缀 KV 留给 Radix Cache，后续请求可复用。

```sql
            priority = getattr(req, "priority", 0) or 0
            result = self.insert(
                InsertParams(key=radix_key, value=values, priority=priority)
            )
            session_leaf = result.last_device_node
            # Free the duplicates that were already in the tree
            self.token_to_kv_pool_allocator.free(
                kv_indices[req.cache_protected_len : result.prefix_len]
            )
        else:  # 本请求新产生、未被已有缓存保护的 KV 全部释放。
            session_leaf = None
            self.token_to_kv_pool_allocator.free(
                kv_indices[req.cache_protected_len : key_len]
            )
```


        # free the unaligned tail

```text
        self.token_to_kv_pool_allocator.free(kv_indices[key_len:])

        self._tag_session_leaf(req, radix_key, node=session_leaf)
```


        # Remove req slot release the cache lock
        if req.last_node is not None:
            self.dec_lock_ref(req.last_node)

MambaRadixCache
我们的实验模型是 Qwen3.5-0.8B，里面不仅有 full attention 还包含了 linear attention —— GDNAttentionBackend，使用的是 MambaRadixCache。在混合模型中统一使用的是 MambaRadixCache。这个 cache node 里面有 kv value 也有 mamba value。代码位置在`sglang/python/sglang/srt/mem_cache/mamba_radix_cache.py` 里。[GDN 的 Cache 缓存逻辑跟 KV cache 不太一样，子节点并不依赖父节点](https://zhuanlan.zhihu.com/p/2063254556176291126)。 

mamba cache 是不可逆，所以当有 split node 操作时，Radix Cache 可能会变成下面的形式。（只有 kv cache 而 mamba cache 为空，需要重新算）存下来的 Mamba Cache 叫做 checkpoint。如果该 token 前缀仍在树中，Full KV 也仍可用，但该位置的 Mamba state checkpoint 已经被回收，不能从这里恢复递推，那么我们管这个点叫做 tombstone。

root
 └─ [1,2,3,4] → Full KV [KV1...KV4], Mamba=None        ← tombstone
      └─ [5,6,7,8] → Full KV [KV5...KV8], Mamba=S8
Mamba 前缀匹配只能选最后一个有效 checkpoint。假如：

root
 └─ [1,2] → Mamba=S2

```text
      └─ [3,4] → Mamba=None
           └─ [5,6] → Mamba=S6
```

那么对于请求 [1,2,3,4,9] 来说，最长 token 前缀匹配是 [1,2,3,4]。但最后一个可用 Mamba checkpoint 是[1,2]，状态 S2。而请求 [1,2,3,4,5,6,9] 则可直接从 S6 恢复。

传统 KV Cache 的已缓存 K/V 是只读的，多个请求可以共享。但 Mamba state 是“接下来还会被更新”的状态。若请求直接在缓存的 
$S_t$ 上执行下一个 token 
$S_{t+1} = F(S_t, x_{t+1})$ 会修改共享缓存，破坏其他请求。所以命中 checkpoint 后，代码会做 Copy-on-Write。当请求命中后，forward stream 会把 
$S_t$ 从缓存 slot 拷贝到 dst slot。后续的更新只更新 dst slot 而不影响缓存。

In Architecture
当前的 Qwen3.5-0.8B 模型使用的是 HybridLinearAttnBackend 的后端，内部 full attn 使用的是 FlashInferAttnBackend，linear attn 用的是 GDNAttnBackend。

当 Request 到来时存在等待队列里，[在 Scheduler 调度的 get_next_batch_to_run() 函数中从等待队列中被调度](https://zhuanlan.zhihu.com/p/2061009711907057681)。在其内部调用 get_new_batch_prefill -> _get_new_batch_prefill_raw -> req.init_next_round_input(self.tree_cache)。在 init_next_round_input() 里的`match_prefix`只是<strong>查询</strong>——它只负责在 Radix Tree 中找到已经缓存(已经被写入`token_to_kv_pool`且未被驱逐)的那部分前缀，并把命中的物理槽位号写入`req.prefix_indices`。 

```python
    def init_next_round_input(
        self,
        tree_cache: Optional[BasePrefixCache] = None,
        cow_mamba: Optional[bool] = None,
    ):
        if tree_cache is not None:
            if cow_mamba is None:
                cow_mamba = tree_cache.supports_mamba()

            match_result = tree_cache.match_prefix(
                MatchPrefixParams(
                    key=RadixKey(
                        token_ids=token_ids_to_match,
                        extra_key=self.extra_key,
                        limit=key_limit,
                    ),
                    req=self,
                    cow_mamba=cow_mamba,
                )
            )
            if envs.SGLANG_RADIX_FORCE_MISS.get():
                match_result = zero_match_result(tree_cache, match_result)
            (
                self.prefix_indices,
                self.last_node,
                self.last_host_node,
                self.best_match_node,
                self.host_hit_length,
                self.swa_host_hit_length,
                self.mamba_host_hit_length,
                self.mamba_branching_seqlen,
            ) = (
                match_result.device_indices,
                match_result.last_device_node,
                match_result.last_host_node,
                match_result.best_match_node,
                match_result.host_hit_length,
                match_result.swa_host_hit_length,
                match_result.mamba_host_hit_length,
                match_result.mamba_branching_seqlen,
            )
            if match_result.cache_protected_len is not None:
                self.cache_protected_len = match_result.cache_protected_len
            else:
                self.cache_protected_len = len(self.prefix_indices)
```

当 prefill batch 已经完成，[进入到 Scheduler.event_loop_overlap() 里面](https://zhuanlan.zhihu.com/p/2061009711907057681)处理 batch 结果的函数 process_batch_result 中。 在 SchedulerBatchResultProcessor 的 process_batch_result_prefill 方法中会调用 maybe_cache_unfinished_req 或 release_kv_cache（有些任务只进行 prefill）。

- 在 maybe_cache_unfinished_req()  方法中调用 tree_cache.cache_unfinished_req() 去更新 radix cache。
- 在 release_kv_cache() 方法中调用 tree_cache.cache_finished_req() 去更新或释放 radix cache。    @scheduler_nvtx_method("scheduler.process_batch_result")

```python
    def process_batch_result(
        self,
        batch: ScheduleBatch,
        result: Union[GenerationBatchResult, EmbeddingBatchResult],
    ):
        self.publish_load_snapshot(force=batch.forward_mode.is_extend())

        if batch.forward_mode.is_decode():
            self.batch_result_processor.process_batch_result_decode(batch, result)
        elif batch.forward_mode.is_extend():
            self.batch_result_processor.process_batch_result_prefill(batch, result)
```


实验
我们已经对 Radix Cache 有所了解了。现在回到我们之前的问题，为什么 disable radix cache 之后，在 temperature=0 时会发生同样的输入但输出不同的这种事呢？

我让 Codex 做了一系列的实验，最后找到了根因：第一个数值差异发生在第 0 层 GDN 的 `out_proj`。 `out_proj` 的输入和权重完全相同，但矩阵形状不同：

cold: [195, 2048] × [2048, 1024]
hit:  [  3, 2048] × [2048, 1024]

![](https://pic1.zhimg.com/v2-c7c060bac281dfb2641a5dcb7e39bf04_r.jpg)CUDA profile 证明 PyTorch/CUTLASS 选择了不同的 BF16 GEMM：

cold:
tensorop_bf16_s16816...64x64_32x6

```text
grid  = [32, 2, 2]
block = [128, 1, 1]
```


hit:
wmma_tensorop_bf16_s161616...16x16_128x2

```text
grid  = [8, 8, 1]
block = [32, 1, 1]
```

除此之外，CUDA profile 显示 FlashInfer 选择了不同的 FA2 kernel traits：

cold:
BatchPrefillWithPagedKVCacheKernel<...64u...4u,1u...>

```text
grid  = [26, 1, 2]
block = [32, 4, 1]
```


hit:
BatchPrefillWithPagedKVCacheKernel<...16u...1u,4u...>

```text
grid  = [2, 1, 2]
block = [32, 1, 4]
```

所以完整答案是：

- 默认路径最早由 `M=195` 与 `M=3` 选择不同 CUTLASS BF16 GEMM 而产生误差。
- 即使消除 linear 差异，FlashInfer 也会因为 `Q=195` 与 `Q=3 + cached prefix` 选择不同 attention tiling，产生第二个误差。ps: 最让我惊艳的是 codex 做实验的能力，它用了一个小时做了我三天的工作量。感谢 AI 时代的到来 T_T 可惜工作记录太长了，我没办法传到知乎上来，让大家都看看 codex 有多能干。

小结
理论上，不开启额外特性，只采用最基础功能的情况下 —— Radix Cache 缓存只有两次时机：prefill 完成、request 完成。进行 prefix 匹配只有一个时机：就是最开始在 waitting queue 被调度的时候进行 match_prefix。

- `temperature=0` 只表示使用 greedy argmax，并不保证不同执行路径产生完全相同的 logits。
- 默认高性能路径对 prefix/cache/物理 slot 布局并非数值完全不变。
- 这些细小误差在候选 token 接近平局时会改变 argmax：
- 原始复现中第 5 token 就发生分叉；
- cold 的 let 比 we 高 0.125；
- cache hit 后两者恰好同分，最终选择词表 ID 更小的 we；
- 后续自回归生成将差异不断放大。
附录一：测试不一致性的脚本
#!/usr/bin/env bash
set -euo pipefail

```text
MODEL_PATH=/home/zeke/sglearn/models/Qwen3.5-0.8B
PORT=30000
```


# 不添加 --disable-radix-cache，Radix Cache 默认开启。

```text
python3 -m sglang.launch_server \
  --model-path "$MODEL_PATH" \
  --host 127.0.0.1 \
  --port "$PORT" \
  --trust-remote-code \
  --mem-fraction-static 0.85 \
  --max-running-requests 4 \
  --chunked-prefill-size -1 \
  >sglang_radix_cache.log 2>&1 &

SERVER_PID=$!
cleanup() {
  echo "停止 SGLang Server……"
  kill -TERM "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}
```

trap cleanup EXIT

echo "等待 SGLang 服务启动……"
until curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    tail -n 50 sglang_radix_cache.log
    exit 1
  fi
  sleep 2
done

REQUEST_BODY=$(printf '%s' \
'{"model":"'"$MODEL_PATH"'","messages":[{"role":"user","content":"Solve the following MATH problem. Put the final answer in \\boxed{} and show your reasoning.\n\n$\\overline{BC}$ is parallel to the segment through $A$, and $AB = BC$. What is the number of degrees represented by $x$?\n\n[asy]\ndraw((0,0)--(10,0));\ndraw((0,3)--(10,3));\ndraw((2,3)--(8,0));\ndraw((2,3)--(4,0));\nlabel(\"$A$\",(2,3),N);\nlabel(\"$B$\",(4,0),S);\nlabel(\"$C$\",(8,0),S);\nlabel(\"$124^{\\circ}$\",(2,3),SW);\nlabel(\"$x^{\\circ}$\",(4.5,3),S);\n[/asy]"}],"temperature":0,"top_p":1,"seed":20260730,"max_tokens":1024,"stream":false}')

```bash
curl -fsS "http://127.0.0.1:${PORT}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer empty" \
  -d "$REQUEST_BODY" \
  >response1.json

curl -fsS "http://127.0.0.1:${PORT}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer empty" \
  -d "$REQUEST_BODY" \
  >response2.json

extract_output() {
  python3 -c 'import json,sys; m=json.load(open(sys.argv[1]))["choices"][0]["message"]; print(json.dumps({"reasoning_content":m.get("reasoning_content"),"content":m.get("content")},ensure_ascii=False,sort_keys=True))' "$1"
}

if diff -u \
  <(extract_output response1.json) \
  <(extract_output response2.json); then
  echo "两次模型输出一致"
else
  echo "两次模型输出不一致：开启 Radix Cache 时复现了不确定性"
```

fi