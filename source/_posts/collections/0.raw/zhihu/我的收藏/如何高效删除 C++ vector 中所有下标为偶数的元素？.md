---
title: 如何高效删除 C++ vector 中所有下标为偶数的元素？
date: "2023-03-01 00:00:00"
updated: "2023-03-01 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/如何高效删除-C-vector-中所有下标为偶数的元素/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/586781784/answer/2915965991
---


这个面试题非常好，其实考的是对stl算法的熟练度。

STL里面有上百个现成的算法，富丰程度超过其它任何一种编程语言，熟悉这些算法可以在日常写代码的时候如虎添翼。

如果把算法的熟悉程度总分100分，那么知道sort、copy只有10分，绝大部分人都是这个水平；熟悉几种二分查找可以算30分，然后到本题所需要用到的remove/erase，就有50分了。50分不高，但是绝大部人达不到。所以我觉得这个面试题非常好。

对于容器的批量删除一般用remove+erase，这里需要传入一个lambda来进行判断，所以用remove_if+erase，自从c++20开始，提供了std::erase_if，只要一步即可完成。如下：

```cpp
#include <vector>
#include <algorithm>
#include <iostream>

using namespace std;

int main() {
    vector v = {1, 2, 3, 4, 5, 6};
    erase_if(v, [&v](auto& num) { return (&num - &v[0] + 1) % 2 == 0; });
    for(auto i: v) {
        cout<<i<<&#34;, &#34;;
    }
}
```


这里面还有个注意事项，是auto& num而不是auto num，题目要删除的是偶数下标而不是偶数值，下标更难一些，这也是这个题目的一个考点。

面试官给出这样的题目，我觉得他们这个团队是很值得加入的。

评论区有人担心性能，STL算法的性能是很高的，std::erase_if的复杂度是O（N)，为解决此问题的最低复杂度。