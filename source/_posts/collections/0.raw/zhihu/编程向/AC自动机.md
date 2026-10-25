---
title: AC自动机
date: "2019-08-29 00:00:00"
updated: "2019-08-29 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/AC自动机/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/80325757
---


#### AC自动机

我们经常用的字符串方法<strong>indexOf</strong>，都是判定两个字符串的包含关系，底层使用类似KMP，BM， Sunday这样的算法。如果我们要判断一个长字符串是否包含多个短字符串呢？比如在一篇文章找几个敏感词，在DNA串中找几个指定的基因对pattern进行预处理，如果我们的模式串存在多个，则不适合了，我们就需要用到一种多模式匹配算法。

最著名的多模式匹配算法为AC自动机，它是由贝尔实验室的两位研究人员 `Alfred V. Aho` 和 `Margaret J.Corasick` 于1975年发明的，几乎与KMP算法同时问世，至今日仍然在模式匹配领域被广泛应用。 

AC自动机的核心算法仍然是寻找模式串内部规律，达到在每次失配时的高效跳转。这一点与单模式匹配KMP算法是一致的。不同的是，AC算法寻找的是模式串之间的相同前缀关系。 ** 
在KMP算法中，对于模式串”abcabcacab”，我们知道非前缀子串abc(abca)cab是模式串的一个前缀(abca)bcacab，而非前缀子串ab(cabca)cab不是模式串abcabcacab的前缀，根据此点，我们构造了next数组，实现在匹配失败时的跳转。

而在多模式环境中，AC自动是使用前缀树来存放所有模式串的前缀，然后通过失配指针来处理失配的情况。它大概分为三个步骤：构建前缀树（生成goto表），添加失配指针（生成fail表），模式匹配（构造output表）**。下面，我们拿模式集合[say, she, shr, he, her]为例，构建一个AC 自动机。

#### 构建前缀树

将模式串逐字符放进Trie树。 

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_fe6a83e27e31.jpg)

`class Trie {

```cpp
      constructor() {
          this.root = new Node("root");
      }
      insert(word) {
          var cur = this.root;
          for (var i = 0; i  word.length; i++) {
              var c = word[i];
              var node = cur.children[c];
              if (!node) {
                  node = cur.children[c] = new Node(word[i]);
              }
              cur = node;
          }
          cur.pattern = word; //防止最后收集整个字符串用
          cur.endCount++; //这个字符串重复添加的次数
      }
  }
  function createGoto(trie, patterns) {
      for (var i = 0; i  patterns.length; i++) {
          trie.insert(patterns[i]);
      }
  }
```

`

然后我们尝试用它处理字符串sher。理想情况下是这样：

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_43a5812735a2.jpg)

很遗憾，前缀树只会顺着某一路径往下查找，最多到叶子节点折回树节点，继续选择另一条路径。因此我们需要添加一些横向的路径，在失配时，跳到另一个分支上继续查找，保证搜索过的节点不会冗余搜索。

#### 添加失配指针

AC自动机的前缀树的节点都应该存在fail指针。下图中，红色的箭头就是失配指针。它表示文本串在当前节点失配后，我们应该到哪个节点去继续匹配。 

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_cb78f06d4ff7.jpg)

很显然，对于每个节点，其失配指针应该指向其他子树中的表示同一字符的那些节点，并且它与其子树能构成剩下的最长后缀。即，我们要匹配sher, 我们已经在某一子树中命中了sh，那么我们希望能在另一个子树中命中er。

到这里，你是不是发现fail指针和KMP中的next指针简直一毛一样？它们都被称为“失配指针”。将Trie树上的每一个点都加上fail指针，它就变成了AC自动机。AC自动机其实就是`Trie + KMP`。

因此根据补上一些失配指针，我们的AC自动机应该长成这样的。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_fab1f76aaa7a.jpg)

现在的问题是，如何求fail指针？联系KMP算法的next数组的意义，容易发现root的每个儿子的fail都指向root（前缀和后缀是不会包含整个串的）。也就是上图中root所连的`s`和`h`的fail都指向root。若已经求得`sh`所在点的fail，我们来考虑如何求`she`所在点的fail。根据`sh`所在点的fail得到`h`是`sh`的最长后缀，而`h`又有儿子`e`，因此`she`的最长后缀应该是`he`，其fail指针就指向`he`所在点。

概括AC自动机求fail指针的过程：

1.对整个字典树进行宽度优先遍历。 
2.若当前搜索到点x，那么对于x的第i个儿子(也就是代表字符i的儿子)，一直往x的fail跳，直到跳到某个点也有i这个儿子，x的第i个儿子的fail就指向这个点的儿子i。

`function createFail(ac) {

```cpp
    var root = ac.root;
    var queue = [root]; //root所在层为第0层
    while (queue.length) {
        //广度优先遍历
        var node = queue.shift();
        if (node) {
            //将其孩子逐个加入列队
            for (var i in node.children) {
                var child = node.children[i];
                if (node === root) {
                    child.fail = root; //第1层的节点的fail总是指向root
                } else {
                    var p = node.fail; //第2层以下的节点, 其fail是在另一个分支上
                    while (p) {
                        //遍历它的孩子，看它们有没与当前孩子相同字符的节点
                        if (p.children[i]) {
                            child.fail = p.children[i];
                            break;
                        }
                        p = p.fail;
                    }
                    if (!p) {
                        child.fail = root;
                    }
                }
                queue.push(child);
            }
        }
    }
}
```

`

#### 模式匹配

我们从根节点开始查找，如果它的孩子能命中目标串的第1个字符串，那么我们就从这个孩子的孩子中再尝试命中目标串的第2个字符串。否则，我们就顺着它的失配指针，跳到另一个分支，找其他节点。

如果都没有命中，就从根节点重头再来。

当我们节点存在表示有字符串在它这里结束的标识时（如endCound, isEnd），我们就可以确认这字符串已经命中某一个模式串，将它放到结果集中。如果这时长字符串还没有到尽头，我们继续收集其他模式串。

代码如下：

`function match(ac, text) {

```cpp
    var root = ac.root, p = root, ret = [], unique = {};
    for (var i = 0; i  text.length; i++) {
        var c = text[i];
        while (!p.children[c] && p != root) {
            p = p.fail; // 失配指针发挥作用 by 司徒正美
        }
        p = p.children[c];
        if (!p) {
            p = root; // 如果没有匹配的，从 root 开始重新匹配
        }
        var node = p;
        while (node != root) {
            //  收集出可以匹配的模式串
            if (node.endCount) {
                var pos = i - node.pattern.length + 1;
                console.log(`匹配模式串 ${node.pattern}其起始位置在${pos}`)
                if (!unique[node.pattern]) { //by 司徒正美
                    unique[node.pattern] = 1;
                    ret.push(node.pattern);
                }
            }
            node = node.fail;
        }
    }
    return ret;
}

var ac = new Trie();
```

createGoto(ac, ["she", "shr", "say", "he", "her"]);
createFail(ac);

```js
console.log(match(ac, "one day she say her has eaten many shrimps"));
```

`

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_e9bcca8ec70a.jpg)
