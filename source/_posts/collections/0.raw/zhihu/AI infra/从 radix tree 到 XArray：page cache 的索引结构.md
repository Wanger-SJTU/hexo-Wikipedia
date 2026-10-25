---
title: 从 radix tree 到 XArray：page cache 的索引结构
date: "2026-07-27 00:00:00"
updated: "2026-07-27 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/从-radix-tree-到-XArray-page-cache-的索引结构/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2064991908477277255
---


从 radix tree 到 XArray：page cache 的索引结构
[番外五](https://zhuanlan.zhihu.com/p/2064991658320585323)讲 writeback 时，有一句话容易被轻轻带过：

在 mapping->i_pages 的 xarray 上打 dirty 标记。
   以后 writeback 可以按 tag 快速找到这批脏页。
这里其实藏着一个很重要的数据结构问题：

mapping->i_pages 到底是什么？

   老内核为什么用 radix tree？

   新内核为什么换成 XArray？

   dirty tag / mark 为什么能让 writeback 快速找到脏页？
这一篇单独拆它。

先把结论放前面：

老内核：
      address_space->i_pages 是 radix tree。

   新内核：
      address_space->i_pages 是 XArray。

   两者解决的是同一类问题：
      用文件页偏移 index 快速找到 page cache 里的 page/folio。

   XArray 不是完全另起炉灶。
      它继承了 radix tree 按 index 分层寻址的思想，
      但提供了更现代的 API、更清晰的 mark 机制、
      更好的并发和特殊 entry 支持。
如果只从 page cache 角度记一句话：

mapping->i_pages 是文件 page cache 的稀疏索引树。

   key:
      文件页偏移 index。

   value:
      page / folio。

   tag / mark:
      dirty、writeback、towrite 等状态的快速过滤索引。
这里先把 `key`、`value`、`查询条件` 说得更精确一点。

mapping->i_pages` 不是全系统唯一的一棵树，而是某个 `address_space` 自己的 page cache 索引。对普通文件来说，这个 `address_space` 通常挂在 inode 下面。

所以查询不是：

拿 index 查全系统所有 page。
而是：

拿 mapping + index 查这个文件的 page cache entry。
换成更具体的问题就是：

哪个文件？
      mapping

   文件里的哪一页？
      index = file_offset >> PAGE_SHIFT

   内存里的缓存对象是谁？
      老内核通常是 struct page *
      新内核通常是 struct folio *
逻辑上可以写成：

老内核:
      mapping->i_pages[index] = struct page *

   新内核:
      mapping->i_pages[index] = struct folio *
例如页大小是 4 KiB：

file offset = 172032
   index       = 172032 / 4096 = 42

   查询就是:
      在这个文件的 mapping->i_pages 里查 index 42

   查到的是:
      这个文件 offset 172032 附近的 page cache page / folio
注意，`index=42` 不是全局唯一的。不同文件可以有同一个 index：

file A 的 mapping->i_pages[42] -> page X
   file B 的 mapping->i_pages[42] -> page Y
正常 page cache entry 还会反向记录自己属于谁：

page->mapping = mapping
   page->index   = index

   folio->mapping = mapping
   folio->index   = index
所以正常情况下，这两边能对上：

mapping->i_pages[index] -> page / folio

   page / folio -> mapping + index
最后，tag / mark 不是另一种 value。它只是过滤条件。

普通查找问的是：

给我 index=42 的 page / folio。
tag 查找问的是：

从 index=N 开始，
   给我下一个带 PAGECACHE_TAG_DIRTY 的 page / folio。
返回的对象仍然是 page / folio。tag / mark 只是让内核不用扫描所有 entry，就能快速筛出 dirty、writeback、towrite 这类候选对象。

严格说，树里的 slot 不永远只能放普通 page / folio。老内核 radix tree 和新内核 XArray 都支持一些特殊 entry，例如 workingset shadow entry、shmem/tmpfs swap entry、DAX exceptional entry 等。第一遍理解普通文件 page cache 时，可以先抓主线：

key:
      mapping + 文件页 index

   value:
      page cache page / folio

   tag / mark:
      对 value 的状态过滤索引
本文分四步：

先看老内核怎么用 radix tree。

   再把 radix tree 抽象成普通数据结构。

   然后过渡到 XArray。

   最后回到 Linux 内核里的 mapping->i_pages。
本文源码对照用两个版本：

- Linux stable `v4.19.325`：旧 `address_space->i_pages` 仍是 `radix_tree_root`。
- Linux stable `v6.12.65`：现代 `address_space->i_pages` 是 `struct xarray`。
一、page cache 为什么需要索引结构
一个普通文件可以很大，但进程通常只访问其中很小一部分。

假设一个文件大小是 1 TiB，页大小是 4 KiB：

1 TiB / 4 KiB = 268,435,456 个 page index
如果用普通数组按页号建表：

array[0]
   array[1]
   array[2]
   ...
   array[268435455]
问题很明显：

文件可能很大。
   真正进 page cache 的页可能很少。
   中间大量 index 是空洞。
例如只读了两个位置：

offset 0
   offset 1 TiB - 4 KiB
真正需要保存的只有两个缓存页：

index 0
   index 268435455
但是普通数组会为中间所有 index 留位置，这太浪费。

如果用链表呢？

page(index=0) -> page(index=268435455)
省空间，但查找慢：

read offset X
        │
        ▼
   需要判断 page cache 里有没有 index=X
        │
        ▼
   链表只能从头扫
如果用哈希表呢？

hash(index) -> page
精确查找可以，但 page cache 还需要很多“按 index 范围”工作的能力：

readahead:
      从某个 index 往后找连续页。

   truncate:
      删除某个 offset 之后的缓存页。

   writeback:
      在某个文件范围内找 dirty 页。

   fsync:
      对指定范围内的 dirty 页发起写回并等待。
哈希表不擅长按顺序找“下一个 index”，更不擅长按 tag 找“下一个 dirty index”。

所以 page cache 想要的数据结构大概是：

1. 稀疏。
      没缓存的 index 不占太多内存。

   2. 按 unsigned long index 快速查找。
      index -> page / folio。

   3. 支持顺序遍历。
      从 index=N 往后找下一个 present entry。

   4. 支持 tagged search。
      从 index=N 往后找下一个 dirty / writeback entry。

   5. 并发读写成本可控。
      page cache 是高频路径，不能太重。
老内核选择的是 radix tree。新内核选择的是 XArray。

二、老内核：`i_pages` 是 radix tree
在 Linux `v4.19.325` 里，`struct address_space` 的 page cache 索引字段可以抽象成：

```text
struct address_space
   ├─ host
   ├─ i_pages: radix_tree_root
   ├─ nrpages
   ├─ writeback_index
   └─ a_ops
```

它的意思是：

这个 address_space 的 page cache
        │
        ▼
   放在 i_pages 这棵 radix tree 里。
对普通文件来说：

文件 offset
        │
        ▼
   page index = offset >> PAGE_SHIFT
        │
        ▼
   mapping->i_pages[index]
        │
        ▼
   struct page *
举例：

offset = 0
      index = 0

   offset = 4096
      index = 1

   offset = 8192
      index = 2
也就是说，page cache 不是挂在进程 VMA 下面，而是挂在文件的 `address_space` 下面。

inode
     │
     └─ i_mapping / i_data
           │
           ▼
   address_space
     │
     └─ i_pages: radix tree
           ├─ index 0 -> page for file offset 0
           ├─ index 1 -> page for file offset 4096
           └─ index N -> page for file offset N * PAGE_SIZE
不同进程读同一个文件的同一段内容，最终通常碰到的是同一个 `address_space + index` 下的 page。

三、先脱离内核：radix tree 到底怎么找东西
先不要想 page cache、页、folio，也不要想内核结构体。

radix tree 解决的是一个很普通的问题：

给你一个编号 key。
   你要根据这个 key 找到对应的 value。
普通数组像这样：

value = array[key]
这很直接，但如果 key 很大、真正有 value 的 key 很少，数组会浪费很多空位。

radix tree 的想法是：

不把 key 当成一个整体比较。
   而是把 key 拆成一段一段。
   每一段决定下一步走哪条路。
先用十进制编号想象一下。

假设要保存三个编号：

123 -> A
   129 -> B
   305 -> C
可以按“百位、十位、个位”一层层走：

root
   ├─ 1
   │  └─ 2
   │     ├─ 3 -> A
   │     └─ 9 -> B
   │
   └─ 3
      └─ 0
         └─ 5 -> C
查 `129` 时，不需要和 `123`、`305` 一个个比较：

129
    │
    ├─ 看第一位：1  -> 走 root 的 1 号分支
    ├─ 看第二位：2  -> 走下一层的 2 号分支
    └─ 看第三位：9  -> 找到 B
这就是 radix tree 最朴素的思想。

radix = 基数 / 进制 / 每层有多少种分支。
从这个角度看，radix tree 和前缀树 trie 很像。

普通前缀树常用来存字符串：

cat
   car

   root
    └─ c
        └─ a
            ├─ t -> cat
            └─ r -> car
cat` 和 `car` 共享前缀 `ca`，所以前两层路径是一样的。

radix tree 也是这个思路，只是 key 不一定是字符串。对整数 key 来说，可以把它看成一串数字或一串 bit：

前缀树 trie:
      把字符串 key 拆成字符。
      每层消费一个字符。

   radix tree:
      把整数 key 拆成数字段或 bit 段。
      每层消费一段数字 / bit。
所以可以把 radix tree 理解成：

整数版前缀树。
区别是，很多教材里的 trie 用字符做分支，而这里后面会用 bit 段做分支。

如果按十进制数字拆：

每层 10 个方向：0..9
如果按二进制的 1 bit 拆：

每层 2 个方向：0 或 1
如果每次看 2 bit：

每层 4 个方向：00、01、10、11
所以 radix tree 不是固定只能二叉。它可以每层有很多分支。

二叉搜索树和 radix tree 的区别可以这样看：

二叉搜索树：
      每个节点通常保存一个完整 key。
      查找时反复比较：
         目标 key < 当前 key ? 走左边 : 走右边

   radix tree：
      节点不靠完整 key 大小比较来决定方向。
      查找时直接切 key 的一小段：
         这一段是多少，就走几号分支。
为了画图更简单，下面用“每次看 2 bit”的 4 叉树演示。

每层看 2 bit。

   2 bit 一共有 4 种值：
      00 -> slot 0
      01 -> slot 1
      10 -> slot 2
      11 -> slot 3
假设 key 最大只到 63，也就是只需要 6 bit：

key = 42

   42 的二进制是：
      101010

   每 2 bit 切一段：
      10 10 10

   换成 slot 编号：
      2  2  2
所以 key `42` 的查找路径是：

root
    └─ slot[2]
         └─ slot[2]
              └─ slot[2]
                   └─ value for key 42
再放几个 key：

key 5:
      binary 000101
      split  00 01 01
      path   0 -> 1 -> 1

   key 42:
      binary 101010
      split  10 10 10
      path   2 -> 2 -> 2

   key 47:
      binary 101111
      split  10 11 11
      path   2 -> 3 -> 3
画成树：

root
   ├─ slot[0]
   │    └─ slot[1]
   │         └─ slot[1] -> value for key 5
   │
   └─ slot[2]
        ├─ slot[2]
        │    └─ slot[2] -> value for key 42
        │
        └─ slot[3]
             └─ slot[3] -> value for key 47
这棵树有两个特点。

第一，它像数组：

get(42) 可以直接按 key 算路径。
第二，它又不是完整数组：

没有存 value 的路径不用展开。
下面用 Java 写一个最小版本，只实现 `put` 和 `get`。

为了代码短，它固定支持 `0..63` 的 key：

```cpp
public class SimpleRadixTreeDemo {
    private static final int BITS_PER_LEVEL = 2;
    private static final int SLOT_COUNT = 1 << BITS_PER_LEVEL;
    private static final int SLOT_MASK = SLOT_COUNT - 1;
    private static final int TOP_SHIFT = 4;

    private static final class Node {
        final Object[] slots = new Object[SLOT_COUNT];
    }

    private static final class SimpleRadixTree {
        private final Node root = new Node();

        void put(int key, String value) {
            Node node = root;

            for (int shift = TOP_SHIFT; shift > 0; shift -= BITS_PER_LEVEL) {
                int slot = slot(key, shift);

                if (node.slots[slot] == null) {
                    node.slots[slot] = new Node();
                }

                node = (Node) node.slots[slot];
            }

            node.slots[slot(key, 0)] = value;
        }

        String get(int key) {
            Node node = root;

            for (int shift = TOP_SHIFT; shift > 0; shift -= BITS_PER_LEVEL) {
                int slot = slot(key, shift);
                Object next = node.slots[slot];

                if (!(next instanceof Node)) {
                    return null;
                }

                node = (Node) next;
            }

            return (String) node.slots[slot(key, 0)];
        }

        String path(int key) {
            return slot(key, 4) + " -> " + slot(key, 2) + " -> " + slot(key, 0);
        }

        private static int slot(int key, int shift) {
            return (key >> shift) & SLOT_MASK;
        }
    }

    public static void main(String[] args) {
        SimpleRadixTree tree = new SimpleRadixTree();

        tree.put(5, "A");
        tree.put(42, "B");
        tree.put(47, "C");

        System.out.println("path(5)  = " + tree.path(5));
        System.out.println("path(42) = " + tree.path(42));
        System.out.println("path(47) = " + tree.path(47));

        System.out.println("get(42) = " + tree.get(42));
        System.out.println("get(6)  = " + tree.get(6));
    }
}
```

输出是：

path(5)  = 0 -> 1 -> 1
   path(42) = 2 -> 2 -> 2
   path(47) = 2 -> 3 -> 3
   get(42) = B
   get(6)  = null
这段代码里最关键的是这一句：

```text
return (key >> shift) & SLOT_MASK;
```

它的意思是：

从 key 里取出当前层要看的那一小段 bit。
   这段 bit 的值，就是当前层要走的 slot 编号。
所以 radix tree 的核心可以压缩成一句话：

<strong>把 key 切成多段，每一段决定一层分支；只为真实存在的 key 分配路径。</strong>

后面回到 page cache 时，只要把这里的 `key` 换成文件页偏移 `index`，把 `value` 换成 page / folio，就能理解 `mapping->i_pages` 为什么适合用这种结构。

四、为什么它适合稀疏文件缓存
继续用一个很稀疏的例子：

文件只缓存了三个页：

   index 0
   index 300
   index 1000000
普通数组要给 `0..1000000` 都留位置。

radix tree 只给真实存在的路径分配节点：

root
   ├─ path to index 0
   ├─ path to index 300
   └─ path to index 1000000
没有缓存页的大片 index 范围，不需要完整展开。

这也是它和普通数组最大的区别：

逻辑上像一个巨大数组：
      page = array[index]

   物理上是一棵按 bit 分层的稀疏树：
      没有 entry 的范围不展开。
所以内核可以同时得到两个好处：

查找时：
      按 index 分层定位，路径很短。

   存储时：
      只为存在 page cache 的 index 分配节点。

五、tag：radix tree 的关键增强
仅仅能 `index -> page` 还不够。

writeback 需要找 dirty 页：

这个文件的 page cache 里，
   哪些 page 是 dirty？
如果只有 page 自己的 dirty flag，那么 writeback 可能要这样做：

从 index 0 开始
      查 page 是否存在
      如果存在，再看 page dirty 不 dirty
      index++
这在大文件上很糟糕。

radix tree 的 tag 机制解决的就是这个问题。老内核 page cache 常见三种 tag：

PAGECACHE_TAG_DIRTY
      这个 index 下的 page 是脏页。

   PAGECACHE_TAG_WRITEBACK
      这个 index 下的 page 正在写回。

   PAGECACHE_TAG_TOWRITE
      本轮 writeback 已经选中的页。
每个 radix tree node 旁边都有 tag bitmap。

抽象成这样：

radix_tree_node
   ├─ slots[0]
   ├─ slots[1]
   ├─ ...
   ├─ slots[63]
   │
   └─ tags[PAGECACHE_TAG_DIRTY]
        bit 0  表示 slots[0] 下面有没有 dirty page
        bit 1  表示 slots[1] 下面有没有 dirty page
        ...
        bit 63 表示 slots[63] 下面有没有 dirty page
也就是说，tag / mark bitmap 是按 node 的 slot 数量开的：

一个 node 有多少个 slot，
   每一种 tag / mark 就至少需要多少个 bit。
常见 64 叉节点可以想成：

slots[64]

   DIRTY bitmap:
      64 bit，对应 slots[0..63]

   WRITEBACK bitmap:
      64 bit，对应 slots[0..63]

   TOWRITE bitmap:
      64 bit，对应 slots[0..63]
所以不是整棵树只有一个 dirty bitmap，而是：

每个 node 都有自己的 dirty bitmap。
   每个 bit 对应该 node 的一个 slot。
注意这个 bit 的语义不是“slot 自己是 dirty node”，而是：

这个 slot 指向的子树里，
   至少有一个 entry 带这个 tag。
比如 index 300 被标成 dirty：

root
    └─ slots[4]
          └─ child node
                └─ slots[44]
                      └─ page(index=300, dirty)
tag 会沿路径向上反映：

child.tags[DIRTY].bit44 = 1
   root.tags[DIRTY].bit4   = 1
于是查 dirty 页时：

root
   ├─ slots[0] DIRTY bit = 0
   │     这整棵子树都没有 dirty page，跳过。
   │
   ├─ slots[1] DIRTY bit = 0
   │     跳过。
   │
   ├─ slots[4] DIRTY bit = 1
   │     下面有 dirty page，进入。
   │
   └─ ...
进入 child 后再看下一层 bitmap：

child
   ├─ slots[0]  DIRTY bit = 0 -> 跳过
   ├─ slots[1]  DIRTY bit = 0 -> 跳过
   ├─ ...
   ├─ slots[44] DIRTY bit = 1 -> 找到 page(index=300)
   └─ ...
所以 tag 查找快的原因是：

没有目标 tag 的整段 index 范围可以直接跳过。
它不是把 dirty page 串成了一个链表，而是在索引树的每层节点上维护了“下面有没有 dirty”的摘要 bitmap。

这点非常重要。

六、回到老内核：page cache 怎么套用 radix tree 和 tag
现在再回到 Linux 老内核，就容易多了。

前面的 Java 小例子是：

put(5,  "A")
   put(42, "B")
   put(47, "C")

   get(42) -> "B"
换成老内核 page cache，就是：

mapping->i_pages[5]  = page for file offset 5  * PAGE_SIZE
   mapping->i_pages[42] = page for file offset 42 * PAGE_SIZE
   mapping->i_pages[47] = page for file offset 47 * PAGE_SIZE

   lookup index 42 -> page for file offset 42 * PAGE_SIZE
也就是把通用例子里的名字换一下：

SimpleRadixTreeDemo              Linux 老 page cache
   ----------------------------------------------------------
   key                              page index
   value                            struct page *
   put(key, value)                  把 page 插入 mapping->i_pages
   get(key)                         按 index 查 page cache
   mark DIRTY                       PAGECACHE_TAG_DIRTY
   findMarked(DIRTY)                找 dirty page 做 writeback
如果继续用前面的 `42`：

通用 radix tree:

      key 42
        path 2 -> 2 -> 2
        value = "B"

   老内核 page cache:

      index 42
        path 仍然由 index 的 bit 分段决定
        value = struct page *
所以 `mapping->i_pages` 并不是一个神秘结构。第一层理解就是：

一个文件自己的 radix tree。
   key 是文件页 index。
   value 是这个 index 对应的 page cache page。
举个更像内核现场的例子。

假设某个文件只缓存了这几个 page：

index 5   -> page A
   index 42  -> page B
   index 47  -> page C
为了图容易看，仍然假设这棵 radix tree 每层只看 2 bit，每个节点 4 个 slot。真实老内核常见配置是每层 6 bit、64 个 slot，但结构意思一样。

index 5 / 42 / 47` 的路径前面已经算过：

index 5:
      path 0 -> 1 -> 1

   index 42:
      path 2 -> 2 -> 2

   index 47:
      path 2 -> 3 -> 3
挂到一个文件的 `address_space` 下面，大致就是：

inode
     │
     └─ i_mapping
          │
          ▼
   address_space
     │
     └─ i_pages: radix tree
          │
          ▼
        root node
        ├─ slot[0]
        │    └─ node
        │         └─ slot[1]
        │              └─ node
        │                   └─ slot[1] -> page A

```text
        │                                  page->index = 5
        │                                  page->mapping = address_space
        │
        └─ slot[2]
             └─ node
                  ├─ slot[2]
                  │    └─ node
                  │         └─ slot[2] -> page B
                  │                        page->index = 42
                  │                        page->mapping = address_space
                  │
                  └─ slot[3]
                       └─ node
                            └─ slot[3] -> page C
                                           page->index = 47
                                           page->mapping = address_space
```

如果 page B 是脏页，page C 正在 writeback，可以把 tag 也画进去：

page B:

```text
      page->index = 42
      page dirty flag = 1
      radix tree PAGECACHE_TAG_DIRTY = 1
```


   page C:

```text
      page->index = 47
      page writeback flag = 1
      radix tree PAGECACHE_TAG_WRITEBACK = 1
```

树上的 tag bitmap 可以想象成这样：

root node
   ├─ DIRTY bits:
   │    slot[2] = 1     因为 slot[2] 子树下面有 page B 是 dirty
   │
   └─ WRITEBACK bits:
        slot[2] = 1     因为 slot[2] 子树下面有 page C 正在 writeback

   root.slot[2] 的 child node
   ├─ DIRTY bits:
   │    slot[2] = 1     page B 在这条分支下面
   │    slot[3] = 0
   │
   └─ WRITEBACK bits:

```text
        slot[2] = 0
        slot[3] = 1     page C 在这条分支下面
```

于是：

按 index 查 42:
      root.slot[2] -> child.slot[2] -> leaf.slot[2] -> page B

   按 DIRTY tag 找:

```text
      root 看到 DIRTY slot[2] = 1
      进入 slot[2] 子树
      child 看到 DIRTY slot[2] = 1
      继续进入
      最终找到 page B
```


   按 WRITEBACK tag 找:

```text
      root 看到 WRITEBACK slot[2] = 1
      进入 slot[2] 子树
      child 看到 WRITEBACK slot[3] = 1
      继续进入
      最终找到 page C
```

这个图就是老内核 `mapping->i_pages` 的第一层心智模型：

文件有一个 address_space。
   address_space 里有一棵 radix tree。
   radix tree 的叶子 slot 指向 page。
   radix tree 的 tag bitmap 记录哪些子树下面有 dirty/writeback page。
以 Linux `v4.19.325` 的 page cache 路径看，内核围绕这棵树做几类动作。

第一，把 page 加进 page cache。

当读文件缺页、readahead 或 buffered write 需要创建缓存页时，内核会分配一个 `struct page`，然后把它挂到这个文件的 `address_space` 里。

简化流程是：

分配 / 准备一个 page
        │

```text
        ├─ page->mapping = mapping
        ├─ page->index   = 文件页偏移 index
        │
        ▼
   锁住 mapping->i_pages
        │
        ▼
   page_cache_tree_insert(mapping, page, ...)
        │
        ├─ __radix_tree_create(&mapping->i_pages, page->index, ...)
        │      找到或创建 index 对应的 radix tree 路径和 slot
        │
        └─ __radix_tree_replace(..., page, ...)
               把 page 指针放进这个 slot
```

从数据结构角度看，插入就是：

mapping->i_pages[page->index] = page
只是底层不是普通数组，而是 radix tree。

第二，按 index 查 page cache 是否命中。

比如读文件时，内核要回答：

这个文件的 index=N 的 page 是否已经在内存里？
老内核会沿着 `mapping->i_pages` 查：

find_get_entry(mapping, index)
        │
        ▼
   radix_tree_lookup_slot(&mapping->i_pages, index)
        │
        ▼
   radix_tree_deref_slot(slot)
        │
        ├─ 有 page：page cache 命中
        └─ 没有 page：page cache 未命中，后续可能读盘创建 page
压缩成一句话：

read offset
        │
        ▼
   offset >> PAGE_SHIFT 得到 index
        │
        ▼
   radix tree lookup: index -> page
第三，按范围顺序找一批 page。

page cache 不只需要查一个 index，还经常要从某个 index 往后拿一批 page：

read 一段文件
   readahead
   writeback
   truncate
   invalidate
radix tree 支持从某个 index 开始继续往后遍历。这样内核可以做：

从 index=N 开始
      找当前存在的 page
      找下一个存在的 page
      找下一批存在的 page
这比哈希表更适合 page cache，因为文件缓存天然有“文件偏移顺序”。

第四，从 page cache 删除 page。

回收干净文件页、truncate 文件、invalidate page cache 时，内核要把 page 从 `mapping->i_pages` 中摘掉。

简化流程是：

page_cache_tree_delete(mapping, page, shadow)
        │
        ▼
   __radix_tree_lookup(&mapping->i_pages, page->index, &node, &slot)
        │

```text
        ├─ radix_tree_clear_tags(...)
        │      清掉这个 slot 上的 dirty/writeback/towrite 等 tag
        │
        └─ __radix_tree_replace(..., shadow 或 NULL, ...)
               把原来的 page 指针替换掉
```

如果是普通删除，可以理解成：

mapping->i_pages[page->index] = NULL
如果留下 workingset shadow entry，则 slot 里不再是 page，而是一个特殊 entry，用来帮助后续判断 refault。这是 page cache / workingset 的优化细节，第一遍知道“slot 不一定只能放 page”就够了。

第五，给 page cache entry 打 tag。

老内核的 `mapping->i_pages` 不只是 `index -> page` 的映射，它还能给某个 index 打状态 tag。

如果用前面的通用例子类比：

通用例子：

```text
      setMark(42, DIRTY)
      findMarked(DIRTY) -> key 42
```


   老内核：

```text
      radix_tree_tag_set(&mapping->i_pages, 42, PAGECACHE_TAG_DIRTY)
      find_get_pages_range_tag(..., PAGECACHE_TAG_DIRTY, ...)
         -> page(index=42)
```

page 第一次变脏时，路径里会做：

page dirty flag = 1
        │
        ▼
   radix_tree_tag_set(&mapping->i_pages,

```text
                      page_index(page),
                      PAGECACHE_TAG_DIRTY)
        │
        ▼
   inode 标记 I_DIRTY_PAGES
```

writeback 要找脏页时，就不是从头检查所有 page，而是按 tag 找：

find_get_pages_range_tag(mapping, &index, end,

```text
                            PAGECACHE_TAG_DIRTY, ...)
        │
        ▼
   radix_tree_for_each_tagged(...)
        │
        ▼
   只返回带 DIRTY tag 的 page
```

于是 writeback 的逻辑不是：

扫描文件所有 page index。
而是：

在这个 inode 的 address_space 里，
   从 writeback_index 开始，
   找带 PAGECACHE_TAG_DIRTY 的 page。
所以老内核对 radix tree 的使用可以压缩成一张图：

address_space->i_pages: radix tree
   │
   ├─ 插入:
   │    page->index -> page
   │
   ├─ 查找:
   │    index -> page cache hit / miss
   │
   ├─ 顺序遍历:
   │    从 index=N 往后找一批 page
   │
   ├─ 删除:
   │    index -> NULL / shadow entry
   │
   └─ tag 查询:
        找 DIRTY / WRITEBACK / TOWRITE page
这就是番外五里说的“按 tag 快速找到脏页”：

它不是全文件扫描。
   它是在 mapping->i_pages 这棵 radix tree 里，
   借助每层节点上的 tag bitmap 跳过无关子树。

七、为什么后来换成 XArray
radix tree 能工作，而且工作了很久。

但随着内核发展，它承担的职责越来越多：

page cache 要存 page。

   shadow entry / exceptional entry 也要塞进同一棵索引结构。

   DAX、swap、ID 分配等路径也有类似需求。

   并发读、RCU 遍历、批量查找、范围 entry 需要更统一的 API。

   旧 radix tree API 历史包袱越来越重。
XArray 就是在这个背景下出现的。

它的官方定位可以概括成：

XArray 是一个表现得像“巨大指针数组”的抽象数据类型。

   你用 unsigned long index 查 entry。

   内部仍然用树状结构避免真的分配巨大数组。
所以不要被名字里的 Array 误导。

XArray 的逻辑接口：

```text
      entry = xa_load(xa, index)
      xa_store(xa, index, entry)
```


   XArray 的内部形态：
      仍然是按 index bit 分层的稀疏树。
从 page cache 视角看，迁移前后主线是：

老内核：
      mapping->i_pages: radix_tree_root

```text
      pagevec_lookup_range_tag(...)
      radix_tree_tag_set(...)
```


   新内核：
      mapping->i_pages: xarray

```text
      filemap_get_folios_tag(...)
      xa_set_mark / xas_set_mark / __xa_set_mark(...)
```

概念没有变：

index -> page/folio
   tag/mark -> dirty/writeback/towrite 快速过滤
变的是实现和 API。

八、XArray 作为普通数据结构怎么理解
先完全脱离内核。

你可以把 XArray 想成一个支持 `long index` 的巨大稀疏数组：

XArray<String> xa

   xa[0]       = "A"
   xa[1000]    = "B"
   xa[9000000] = "C"
它看起来像数组：

xa.get(1000) -> "B"
但它不会真的分配：

Object[] array = new Object[9000001]
内部仍然是一棵按 index bit 分层的 radix-tree-like 稀疏树。也就是说，XArray 不是老的 `radix_tree` API，但它内部仍然继承了 radix tree 按 bit 分层寻址的结构思想。

xarray
     │
     ▼
   xa_node
   ├─ slots[0]
   ├─ slots[1]
   ├─ ...
   └─ slots[63]
常见配置下，XArray 每层也是 64 个 slot：

XA_CHUNK_SHIFT = 6
   XA_CHUNK_SIZE  = 64
每个 `xa_node` 可以抽象成：

xa_node
   ├─ shift
   │    当前层每个 slot 覆盖多大的 index 范围。
   │
   ├─ offset
   │    这个 node 在父节点的哪个 slot 下面。
   │
   ├─ parent
   │    父节点。
   │
   ├─ slots[64]
   │    子节点或最终 entry。
   │
   └─ marks[3][...]
        三组 mark bitmap。
查找 index 时，仍然是按 bit 切片：

index
     │
     ├─ 取某 6 bit -> 当前 node 的 offset
     ├─ 再取某 6 bit -> 下一级 offset
     └─ ...
mark 也和 radix tree tag 类似：

marks[mark_id].bitN = 1

   表示 slots[N] 这条路径下面，
   至少有一个 entry 带 mark_id。
每个 node 都有自己的 `marks` 数组。一个 node 有多少个 slot，每一种 mark 就有多少个 bit。这个 demo 里每个 node 有 4 个 slot，所以 `dirtyBits=[0 0 1 0]` 正好对应 `slot[0..3]`。

所以，XArray 可以理解成：

带 mark bitmap 的稀疏分层数组。
这句话比“它是数组”更接近真实结构。

九、用 Java 写一个迷你 XArray
下面用 Java 写一个极简版。

为了让输出容易看，这个 demo 不用 64 叉，而用 4 叉：

每层看 2 bit。
   每个 node 有 4 个 slot。
它只演示三件事：

1. put(index, value)
      按 index 分层存 entry。

   2. get(index)
      按 index 分层取 entry。

   3. setMark / findMarked
      用 mark bitmap 快速跳过没有目标 mark 的子树。
代码如下：

```cpp
import java.util.BitSet;

public class MiniXArrayDemo {
    private static final int CHUNK_SHIFT = 2;
    private static final int CHUNK_SIZE = 1 << CHUNK_SHIFT;
    private static final int CHUNK_MASK = CHUNK_SIZE - 1;

    private static final int DIRTY = 0;
    private static final int MARK_COUNT = 3;

    private static final class Node {
        final int shift;
        final Object[] slots = new Object[CHUNK_SIZE];
        final BitSet[] marks = new BitSet[MARK_COUNT];

        Node(int shift) {
            this.shift = shift;
            for (int i = 0; i < MARK_COUNT; i++) {
                marks[i] = new BitSet(CHUNK_SIZE);
            }
        }
    }

    private static final class MiniXArray {
        /*
         * This root covers index 0..63:
         *
         *   root shift 4  -> top 2 bits
         *   child shift 2 -> next 2 bits
         *   leaf shift 0  -> low 2 bits
         */
        private final Node root = new Node(4);

        void put(int index, String value) {
            Node node = root;

            while (true) {
                int offset = offset(index, node.shift);

                if (node.shift == 0) {
                    node.slots[offset] = value;
                    return;
                }

                Object child = node.slots[offset];
                if (!(child instanceof Node)) {
                    child = new Node(node.shift - CHUNK_SHIFT);
                    node.slots[offset] = child;
                }

                node = (Node) child;
            }
        }

        String get(int index) {
            Node node = root;

            while (true) {
                int offset = offset(index, node.shift);
                Object entry = node.slots[offset];

                if (node.shift == 0) {
                    return (String) entry;
                }

                if (!(entry instanceof Node)) {
                    return null;
                }

                node = (Node) entry;
            }
        }

        boolean setMark(int index, int mark) {
            Node[] path = new Node[8];
            int[] offsets = new int[8];
            int depth = 0;

            Node node = root;

            while (true) {
                int offset = offset(index, node.shift);
                path[depth] = node;
                offsets[depth] = offset;
                depth++;

                Object entry = node.slots[offset];

                if (node.shift == 0) {
                    if (entry == null) {
                        return false;
                    }

                    for (int i = 0; i < depth; i++) {
                        path[i].marks[mark].set(offsets[i]);
                    }

                    return true;
                }

                if (!(entry instanceof Node)) {
                    return false;
                }

                node = (Node) entry;
            }
        }

        Integer findMarked(int start, int mark) {
            return findMarked(root, 0, start, mark);
        }

        void dumpTree() {
            printNodeLine("", "root", root, 0);
            dumpChildren(root, 0, "");
        }

        private void dumpChildren(Node node, int base, String prefix) {
            int slotSpan = 1 << node.shift;
            int childCount = childCount(node);
            int seen = 0;

            for (int offset = 0; offset < CHUNK_SIZE; offset++) {
                Object entry = node.slots[offset];
                if (entry == null) {
                    continue;
                }

                boolean last = ++seen == childCount;
                String branch = last ? "└─ " : "├─ ";
                String nextPrefix = prefix + (last ? "   " : "│  ");
                int childBase = base + offset * slotSpan;
                String markText = node.marks[DIRTY].get(offset) ? " DIRTY" : "";
                String label = "slot[" + offset + "]" + markText;

                if (entry instanceof Node) {
                    Node child = (Node) entry;
                    printNodeLine(prefix + branch, label + " -> node", child, childBase);
                    dumpChildren(child, childBase, nextPrefix);
                } else {
                    System.out.println(prefix + branch + label
                            + " -> " + entry + " index=" + childBase);
                }
            }
        }

        private static int childCount(Node node) {
            int count = 0;
            for (Object entry : node.slots) {
                if (entry != null) {
                    count++;
                }
            }
            return count;
        }

        private static void printNodeLine(String prefix, String label,
                                          Node node, int base) {
            int span = 1 << (node.shift + CHUNK_SHIFT);
            String treeText = prefix + label + " ["
                    + base + ".." + (base + span - 1)
                    + " shift=" + node.shift + "]";
            printWithRightColumn(treeText, "dirtyBits=" + bits(node.marks[DIRTY]));
        }

        private static void printWithRightColumn(String treeText, String rightText) {
            int column = 72;
            int spaces = Math.max(4, column - treeText.length());
            System.out.println(treeText + spaces(spaces) + rightText);
        }

        private static String spaces(int count) {
            StringBuilder builder = new StringBuilder();
            for (int i = 0; i < count; i++) {
                builder.append(' ');
            }
            return builder.toString();
        }

        private static String bits(BitSet bitSet) {
            StringBuilder builder = new StringBuilder("[");
            for (int i = 0; i < CHUNK_SIZE; i++) {
                builder.append(bitSet.get(i) ? '1' : '0');
                if (i + 1 < CHUNK_SIZE) {
                    builder.append(' ');
                }
            }
            return builder.append(']').toString();
        }

        private Integer findMarked(Node node, int base, int start, int mark) {
            int slotSpan = 1 << node.shift;
            int firstOffset = start <= base ? 0 : (start - base) / slotSpan;

            for (int offset = firstOffset; offset < CHUNK_SIZE; offset++) {
                if (!node.marks[mark].get(offset)) {
                    continue;
                }

                int childBase = base + offset * slotSpan;

                if (node.shift == 0) {
                    return childBase;
                }

                Object child = node.slots[offset];
                if (child instanceof Node) {
                    Integer found = findMarked((Node) child, childBase, start, mark);
                    if (found != null) {
                        return found;
                    }
                }
            }

            return null;
        }

        private static int offset(int index, int shift) {
            return (index >> shift) & CHUNK_MASK;
        }
    }

    public static void main(String[] args) {
        MiniXArray xa = new MiniXArray();

        xa.put(5, "page-5");
        xa.put(42, "page-42");
        xa.put(47, "page-47");

        xa.setMark(42, DIRTY);
        xa.setMark(47, DIRTY);

        xa.dumpTree();

        System.out.println("get 42 = " + xa.get(42));

        Integer index = xa.findMarked(0, DIRTY);
        while (index != null) {
            System.out.println("dirty at index " + index + " -> " + xa.get(index));
            index = xa.findMarked(index + 1, DIRTY);
        }
    }
}
```

输出类似：

root [0..63 shift=4]                                                 dirtyBits=[0 0 1 0]
   ├─ slot[0] -> node [0..15 shift=2]                                   dirtyBits=[0 0 0 0]
   │  └─ slot[1] -> node [4..7 shift=0]                                 dirtyBits=[0 0 0 0]
   │     └─ slot[1] -> page-5 index=5
   └─ slot[2] DIRTY -> node [32..47 shift=2]                            dirtyBits=[0 0 1 1]

```text
      ├─ slot[2] DIRTY -> node [40..43 shift=0]                         dirtyBits=[0 0 1 0]
      │  └─ slot[2] DIRTY -> page-42 index=42
      └─ slot[3] DIRTY -> node [44..47 shift=0]                         dirtyBits=[0 0 0 1]
         └─ slot[3] DIRTY -> page-47 index=47
   get 42 = page-42
   dirty at index 42 -> page-42
   dirty at index 47 -> page-47
```

这棵打印出来的树里，几个字段的含义是：

左侧:
      真正的树形结构。
      ├─ / └─ 表示这个 node 下面有哪些非空 slot。

   node [0..63 shift=4]:
      这个 node 覆盖 index 0..63。
      shift=4 表示这一层用 index >> 4 之后的低 2 bit 选 slot。

   slot[N] -> node:
      slot[N] 指向下一层 node。

   slot[N] -> page-X index=Y:
      slot[N] 是叶子 entry。
      value 是 page-X，对应的完整 index 是 Y。

   DIRTY:
      这个 slot 对应的 DIRTY bit 是 1。
      说明这个 slot 自己或它下面的子树里有 dirty entry。

   右侧 dirtyBits:
      只在 node 行显示，是这个 node 的 DIRTY mark bitmap。
      [0 0 1 0] 表示 slot[2] 下面有 dirty entry。
      叶子 value 行没有这一列，因为 dirtyBits 是 node 上的摘要信息。
这个 demo 里，`setMark(42, DIRTY)` 做了什么？

index 42 在 4 叉树里可以分成三段：

42 = binary 101010

   10 10 10
    │  │  │
    │  │  └─ leaf slot 2
    │  └──── child slot 2
    └─────── root slot 2
所以存储路径是：

root.slots[2]
        └─ child.slots[2]
              └─ leaf.slots[2] = "page-42"
所以设置 DIRTY mark 时，不是只在叶子 value 上记一下，而是把这条路径上每一层 node 的对应 bit 都置 1。

打 DIRTY mark 后：

root.marks[DIRTY].bit2  = 1
   child.marks[DIRTY].bit2 = 1
   leaf.marks[DIRTY].bit2  = 1
这三个 bit 的含义分别是：

root.marks[DIRTY].bit2 = 1
      root 的 slot[2] 子树下面有 dirty entry。

   child.marks[DIRTY].bit2 = 1
      child 的 slot[2] 子树下面有 dirty entry。

   leaf.marks[DIRTY].bit2 = 1
      leaf 的 slot[2] 这个 entry 自己就是 dirty entry。
这样从 root 开始找 dirty entry 时，才能一路只走带 DIRTY bit 的分支：

root:

```text
      DIRTY bit2 = 1
      说明 slot[2] 下面值得进去找。
```


   child:

```text
      DIRTY bit2 = 1
      说明 slot[2] 下面继续值得进去找。
```


   leaf:

```text
      DIRTY bit2 = 1
      找到 page-42。
```

查找 dirty entry 时，如果某个 slot 的 DIRTY bit 是 0，就跳过它覆盖的整段范围。

这就是 Linux radix tree tag / XArray mark 的核心模型。

真实内核还要处理：

并发修改。
   RCU 读侧遍历。
   内部 entry。
   exceptional entry。
   multi-index entry。
   节点释放和内存分配失败。
但第一层理解，抓住上面这个模型就够了：

slots 保存路径。
   marks 保存“下面有没有目标状态”的摘要。

十、XArray 和 radix tree 的关系
现在可以把二者放在一起看。

老 radix tree：

radix_tree_root
     │
     ▼
   radix_tree_node
   ├─ shift
   ├─ slots[64]
   └─ tags[3][...]
新 XArray：

xarray
     │
     ▼
   xa_node
   ├─ shift
   ├─ slots[64]
   └─ marks[3][...]
从这个角度看，XArray 当然还是 radix tree 思想的一种现代应用。

但不能简单说它只是“改名”。

XArray 更像是：

把 radix tree 的核心结构保留下来，
   重新整理成一个更通用、更明确、更适合现代内核的索引抽象。
它至少带来这些语义上的整理：

1. API 更像数组。
      xa_load、xa_store、xa_erase、xa_find。

   2. tag 改成 mark 概念。
      xa_set_mark、xa_clear_mark、xa_get_mark。

   3. 支持更丰富的 entry 类型。
      普通指针、value entry、internal entry、multi-index entry。

   4. 提供 xa_state / xas_* 高级遍历接口。
      高频路径可以减少重复从 root 开始走树。

   5. 并发和 RCU 语义更系统。
      普通 API 和高级 API 的锁语义分得更清楚。
对普通读者来说，最重要的不是背 API，而是理解这层抽象：

XArray 是一个稀疏、可遍历、可打 mark 的 index -> entry 映射。

十一、新内核里的 `mapping->i_pages`
到了 Linux `v6.12.65`，`struct address_space` 里已经是：

```text
struct address_space
   ├─ host
   ├─ i_pages: xarray
   ├─ nrpages
   ├─ writeback_index
   └─ a_ops
```

page cache 的 value 也从老文章常说的 `struct page` 逐渐过渡到 `struct folio` 视角：

mapping->i_pages[index] -> folio
普通 4 KiB folio 时：

index=N
      对应文件 offset = N * PAGE_SIZE
如果是大 folio，一个 folio 可以覆盖多个连续 index。这个细节先不影响主线：

i_pages 仍然按文件 offset index 组织 page cache。
新内核里 page cache tags 直接定义成 XArray marks：

PAGECACHE_TAG_DIRTY    -> XA_MARK_0
   PAGECACHE_TAG_WRITEBACK -> XA_MARK_1
   PAGECACHE_TAG_TOWRITE   -> XA_MARK_2
所以番外五里的这句话：

在 mapping->i_pages 的 xarray 上打 PAGECACHE_TAG_DIRTY
换成 XArray 语言就是：

在 mapping->i_pages 这棵 XArray 上，
   给 folio_index(folio) 对应的 entry 设置 XA_MARK_0。
更直观地画：

address_space
     │
     └─ i_pages: XArray
           │
           ├─ index 0  -> folio A
           ├─ index 1  -> folio B
           ├─ index 2  -> folio C
           └─ ...
当 `folio B` 被写脏：

folio B dirty flag = 1

   i_pages[index 1] 的 PAGECACHE_TAG_DIRTY mark = 1

   inode I_DIRTY_PAGES = 1
writeback 后续找脏 folio：

filemap_get_folios_tag(mapping, &index, end,

```text
                          PAGECACHE_TAG_DIRTY, &fbatch)
        │
        ▼
   XArray 按 mark 找 folio
        │
        ▼
   文件系统 writepages/writepage 提交 I/O
```


十二、为什么不能只看 folio dirty flag
如果只在 folio 上有 dirty flag：

folio->flags 里有 dirty
那 writeback 要找 dirty folio 时，需要先知道哪些 folio 存在。

这会退化成：

遍历 page cache 里的很多 folio
   对每个 folio 检查 dirty flag
而 XArray mark 把“状态过滤”提升到了索引结构里：

XArray node 的 mark bitmap 告诉你：
      这个 slot 下面有没有 dirty folio。
所以可以跳过整个子树：

slot 覆盖 index 0..4095
   DIRTY mark = 0

   说明这 4096 个 index 范围里没有 dirty folio。
   不需要进去看。
这就是为什么 dirty 状态要存在多层：

folio dirty flag:
      说明这个具体 folio 是脏的。

   XArray PAGECACHE_TAG_DIRTY mark:
      让 writeback 在这个文件的 page cache 里快速找脏 folio。

   inode I_DIRTY_PAGES:
      让 writeback 系统知道这个 inode 值得处理。

   wb / vmstat dirty accounting:
      让内核知道全局和 backing device 的脏页压力。
它们不是重复劳动，而是面向不同查询问题的索引和账本。

十三、和 `writeback_index` 的关系
address_space` 里还有一个字段：

writeback_index
它不是 XArray 的内部字段，而是 writeback 用的扫描起点。

大致语义是：

这次不要总从文件开头找 dirty folio。
   从上次写到的位置附近继续往后找。
于是组合起来：

mapping->writeback_index
        │
        ▼
   作为 XArray tagged search 的起点
        │
        ▼
   找下一个 PAGECACHE_TAG_DIRTY / TOWRITE folio
第一层模型可以这样记：

writeback_index 决定从哪里开始找。

   XArray mark 决定哪些子树值得进去找。

十四、XArray 不是 VMA 的树
这里容易和另一个结构混淆。

文件相关的 `address_space` 里，常见有两个树状结构：

i_pages:
      文件 page cache 的 index -> folio 索引。

   i_mmap:
      映射这个文件的 VMA 区间树。
它们解决的问题不同。

i_pages 回答：

```text
      文件 offset=N 的缓存页在不在？
      如果在，对应哪个 folio？
      哪些 folio 是 dirty / writeback？
```


   i_mmap 回答：
      哪些进程/VMA 映射了这个文件的哪些范围？
      truncate、unmap、文件页反向映射要通知谁？
所以：

page cache 查找：
      mapping->i_pages

   文件映射 VMA 查找：
      mapping->i_mmap
这两棵树都挂在 `address_space` 附近，但不是一件事。

十五、常见误解
<strong>误解一：XArray 就是普通数组。</strong>

不是。它的 API 看起来像巨大数组，但内部是稀疏树。没有 entry 的 index 范围不会真的分配数组槽位。

<strong>误解二：XArray 和 radix tree 完全无关。</strong>

不是。XArray 继承了 radix tree 按 index bit 分层寻址的核心思想，只是 API、entry 类型、mark、并发语义都重新整理过。

<strong>误解三：dirty tag 是挂在 folio 里的。</strong>

不准确。folio 自己有 dirty flag；`PAGECACHE_TAG_DIRTY` 是挂在 `mapping->i_pages` 这个索引结构里的 mark。

<strong>误解四：有 dirty tag 就不需要 folio dirty flag。</strong>

不是。tag/mark 是为了快速找到候选 entry；具体状态和并发校验仍然要看 folio 自己的状态。

<strong>误解五：writeback 会扫描所有文件页。</strong>

通常不是。writeback 先从 wb/inode 层面找到有脏页的 inode，再在该 inode 的 `mapping->i_pages` 里按 dirty/towrite mark 找 folio。

十六、收束
这篇需要记住的主线：

page cache 需要一个稀疏索引：
      file offset -> page index -> page/folio。

   老内核用 radix tree：
      address_space->i_pages: radix_tree_root。

   radix tree 按 index 的 bit 分层：
      常见每层 6 bit，每个 node 64 个 slot。

   radix tree tag 是每层节点上的 bitmap：
      可以跳过没有 dirty/writeback 的整棵子树。

   新内核用 XArray：
      address_space->i_pages: struct xarray。

   XArray 逻辑上像巨大数组：
      xa_load(index), xa_store(index)。

   XArray 物理上仍然是稀疏索引树：
      xa_node -> slots[64] + marks[3]。

   page cache 的 dirty/writeback/towrite：
      在 XArray 里就是 XA_MARK_0/1/2。
最后用一张图把关系压缩起来：

inode
     │
     └─ address_space
          │
          ├─ i_pages: XArray
          │    │
          │    ├─ index -> folio
          │    │
          │    └─ marks
          │         ├─ PAGECACHE_TAG_DIRTY
          │         ├─ PAGECACHE_TAG_WRITEBACK
          │         └─ PAGECACHE_TAG_TOWRITE
          │
          ├─ i_mmap: file-mapping VMA tree
          │
          └─ writeback_index
               下一轮 writeback 的扫描起点
所以前一篇 writeback 里的那句话，现在可以展开成：

folio 被写脏
        │

```text
        ├─ folio dirty flag = 1
        │
        ├─ mapping->i_pages[index] 设置 PAGECACHE_TAG_DIRTY
        │      本质是在 XArray 路径上的 mark bitmap 置位
        │
        ├─ inode 标记 I_DIRTY_PAGES
        │
        └─ wb/vmstat dirty 统计增加
```


   后台 writeback
        │
        ├─ 找到 dirty inode
        ├─ 从 inode->i_mapping 进入 address_space
        ├─ 在 mapping->i_pages 里按 PAGECACHE_TAG_DIRTY/TOWRITE 找 folio
        └─ 调文件系统 writepages/writepage 写回
一句话：

<strong>XArray 是 Linux 现代 page cache 的稀疏索引树；mark 是这棵树上的状态过滤索引。</strong>

参考源码
本文源码判断主要基于：

- Linux `v4.19.325`: `[struct address_space 中的 radix_tree_root i_pages](https://link.zhihu.com/?target=https%3A//git%3C/code%3E.ker%3Ccode%3Enel.org/pub/scm/linux/k%3C/code%3Eernel/git/stable/linux.git/tree/include/linux/fs.h%3Fh%3Dv4.19.325%23n417)`
- `Linux v4.19.325`: `[struct radix_tree_node、slots、tags](https://link.zhihu.com/?target=https%3A//git.k%3C/code%3Ee%3Ccode%3Ernel.%3C/code%3Eo%3Ccode%3Erg/p%3C/code%3Eub/scm/linux/kernel/git/stable/linux.git/tree/include/linux/radix-tree.h%3Fh%3Dv4.19.325%23n68)`
- `Linux v4.19.325`: `[page_cache_tree_insert() / page_cache_tree_delete()](https://link.zhihu.com/?target=https%3A//git.ker%3C/code%3Enel%3Ccode%3E.org/pub/scm/linux/kerne%3C/code%3El/git/stable/linux.git/tree/mm/filemap.c%3Fh%3Dv4.19.325%23n114)`
- `Linux v4.19.325`: `[find_get_entry() / radix_tree_lookup_slot()](https:/</code>/gi<code>t.kernel.org/pub/scm/lin</code>ux/kernel/git/stable/linux.git/tree/mm/filemap.c?h=v4.19.325#n1405)`
- `Linux v4.19.325`: `[find_get_pages_range_tag() / radix_tree_for_each_tagged()](https://link.zhihu.com/?target=https%3A//git.kerne%3C/code%3El.o%3Ccode%3Erg/pub/scm/linux/kernel/git/%3C/code%3Estable/linux.git/tree/mm/filemap.c%3Fh%3Dv4.19.325%23n1878)`
- `Linux v4.19.325`: `[radix_tree_tag_set() / PAGECACHE_TAG_DIRTY 相关 writeback 路径](https://link.zhihu.com/?target=https%3A//git%3C/code%3E.ke%3Ccode%3Ernel.org/pub/scm/li%3C/code%3Enux/kernel/git/stable/linux.git/tree/mm/page-writeback.c%3Fh%3Dv4.19.325%23n2500)`
- `Linux v6.12.65`: `[struct address_space 中的 struct xarray i_pages](https://link.zhihu.com/?target=https%3A//git%3C/code%3E.ker%3Ccode%3Enel.org/pub/scm/linux%3C/code%3E/kernel/git/stable/linux.git/tree/include/linux/fs.h%3Fh%3Dv6.12.65%23n444)`
- `Linux v6.12.65`: `[struct xa_node、slots、marks](https</code>:<code>//git</code>.<code>kerne</code>l.org/pub/scm/linux/kernel/git/stable/linux.git/tree/include/linux/xarray.h?h=v6.12.65#n1147)`
- `Linux v6.12.65`: `[filemap_get_folios_tag()](https://link.zhihu.com/?target=https%3A//git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git/tree/mm/filemap.c%3Fh%3Dv6.12.65%23n2249)`
- `Linux kernel docs: [XArray](https://link.zhihu.com/?target=https%3A//docs.kernel.org/core-api/xarray.html)`
- `Linux kernel docs: [Generic radix trees/sparse arrays](https://link.zhihu.com/?target=https%3A//docs.kernel.org/core-api/generic-radix-tree.html)`