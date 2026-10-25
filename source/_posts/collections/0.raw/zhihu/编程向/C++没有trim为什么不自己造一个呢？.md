---
title: C++没有trim为什么不自己造一个呢？
date: "2022-08-12 00:00:00"
updated: "2022-08-12 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/C-没有trim为什么不自己造一个呢/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/553071153
---


本文分享我自己造的trim，基于std ranges库，因为基于标准库开发，所以没有任何负担。

```cpp
#include 
#include 
#include 
#include 
#include 
#include 

// std = C++20 or C++23
```


enum class Direction {

```cpp
	Front = 0,
	Back,
	Both
};

namespace views = std::views;

auto drop(const std::string_view sand, const char droped_ch, const Direction direction) {
	std::string tower;
	auto is_the_char = [&](const char ch) { return ch == droped_ch; };

	switch (direction) {
	case Direction::Front:
		std::ranges::move(sand | views::drop_while(is_the_char), std::back_inserter(tower));
		break;
	case Direction::Back:
		std::ranges::move(sand | views::reverse | views::drop_while(is_the_char)
			| views::reverse, std::back_inserter(tower));
		break;
	case Direction::Both:
		std::ranges::move(sand | views::drop_while(is_the_char) | views::reverse
			| views::drop_while(is_the_char) | views::reverse, std::back_inserter(tower));
		break;
	default:
		break;
	}
	return tower;
}

auto trim(const std::string_view sand, const char droped_ch = ' ') {
	return drop(sand, droped_ch, Direction::Both);
}
auto filter(const std::string_view sand, const char droped_ch = ' ') {
	auto is_the_char = [&](const char ch) { return ch == droped_ch; };
        /*
	auto print_way = [](const auto& it) {
		hah::print("\"{}\"", std::string_view{ it.begin(), it.end() });
	};*/
	auto str = trim(sand, droped_ch);
	//hah::print("{}", str);
	//std::ranges::for_each(views::all(str), print_way);
	auto right_pos = std::ranges::find(str, droped_ch) - str.cbegin();
	//hah::print("right_pos={}", right_pos);
	std::vectorstd::string> vec_str{};
	std::string temp_str;
	if (right_pos != 0) {
		std::ranges::move(str | views::take(right_pos), std::back_inserter(temp_str));
		vec_str.emplace_back(temp_str);
	}
	// start
	while (str.cbegin() + right_pos  str.cend()) {
		auto left_pos = std::ranges::find_if_not(str.cbegin() + right_pos, str.cend(), is_the_char) - str.cbegin();
		//hah::print("left_pos={}", left_pos);

		right_pos = std::ranges::find_if(str.cbegin() + left_pos, str.cend(), is_the_char) - str.cbegin();
		//hah::print("right_pos={}", right_pos);
		temp_str = "";
		std::ranges::move(views::counted(str.cbegin() + left_pos, right_pos - left_pos), std::back_inserter(temp_str));
		//hah::print("temp_str={}", temp_str);
		vec_str.emplace_back(temp_str);
	}
	// show
	//std::ranges::for_each(vec_str, [](const auto& it) {
	//	hah::print("vec_str={}", it);
	//});
	return vec_str;
}
```


除了trim可以去除原串两边的特殊字符，还构造了一个filter函数用来去除字符串中出现的特殊字符，比如说你想去除一个字符串中的空格字符串，那么传一个参数给filter就可以返回一个vector string，里面就有你想要的“不含空格”的子串。

实现方法就是调用std ranges库里面drop方法，用它写一个trim函数轻而易举。ranges里的drop方法的本质就是去除头部的特殊字符，如果你想去除尾巴的特殊字符，那么就用reverse翻转一下执行drop，再翻转回来。

我定义了一个枚举，可以轻松调用3种drop方法，其中一种Both direction drop被我封装为 trim 函数。

接下来就是filter函数，这函数稍微有点长但也简单，首先先用trim方法保证前后的特殊字符都去除干净了，然后就用ranges algorithm里面的find方法，它可以找到第一个特殊字符的位置，然后用返回值减去begin迭代器就得到了下标。然后调用ranges库里的take方法，可以选择最前面的几个字符，用move方法把它们送到容器中。

为什么这里要确定right_pos不等于0？因为right_pos等于0就代表没找到目标。

然后就到while循环，同样条件不变，这时候就是找两个位置，第一个位置是左边的位置，第二个位置是右边的位置。

- 左边的位置就找第一个不是特殊字符的位置，所以用了find_if_not，从哪里开始找？从上次找过的“右边的位置”的下一个位置开始找，一直找到结束，这样就确定了left_pos。
2. 右边的位置就找第一个是特殊字符的位置，所以用了find_if，从哪里开始找？从上次找过的“左边的位置”的下一个位置开始找，一直找到结束，这样就确定了right_pos。

再把temp_str置空，move函数写入从左到右的字符串，注意这里使用了ranges counted函数，这个函数是用来写入从哪里开始，并且需要确定计数的字符个数，right_pos - left_pos就是“最终字符串”的长度。

比如对于"##hello###"而言，left_pos就是第一个不是特殊字符的位置，那就是2；right_pos是后面的第一个是特殊字符的位置，那就是7。 7-2 == 5, 这刚好就是hello字符串的长度。

所以从字符'h'开始往后数 right_pos - left_pos 个长度，就得到了我们想要的字符串"hello"。

这就是以下代码的作用。

views::counted(str.cbegin()+ left_pos, right_pos - left_pos)

代码的最后，我们用move函数已经把满足要求的字符插入到vector string, 最后返回这个容器，就可以方便后续其他人处理了。

这就是一个很常用的方法能够把包含许多空格 or 特殊字符的 非标准命令，进行标准化的一个步骤。

Input:  "####ls###-l###/home####"

Output:  {"ls", "-l", "/home"};
