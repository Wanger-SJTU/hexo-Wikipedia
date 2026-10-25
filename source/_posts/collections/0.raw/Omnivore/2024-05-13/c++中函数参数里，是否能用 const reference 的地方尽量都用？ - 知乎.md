---
title: "c++中函数参数里，是否能用 const reference 的地方尽量都用？ - 知乎"
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: "post"
permalink: "/collections/0.raw/Omnivore/2024-05-13/c-中函数参数里,是否能用-const-reference-的地方尽量都用-知乎/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

---
id: 6296b55f-25fc-4612-b14d-f58f8cc00cc6
---

# c++中函数参数里，是否能用 const reference 的地方尽量都用？ - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/c-const-reference-18f6fad9aca)
[Read Original](https://www.zhihu.com/question/594059514/answer/2973611125)



对于一个不会去修改A的函数，在所有地方都用 foo(const &A)， 相比于 foo(A)，这样做会有什么坑吗？显示全部 ​

关注者

<strong>186</strong>

被浏览

<strong>109,216</strong>

他们也关注了该问题![0.382](https://proxy-prod.omnivore-image-cache.app/0x0,s3GZkGXVvmUx8DJ0sIX48H-XCPsIMc6nuMRER6ASjQ8Q/https://picx.zhimg.com/v2-ea3874aaa51001bf8bc7debbcee51e38_l.jpg?source=c8b7c179)![吴咏炜](https://proxy-prod.omnivore-image-cache.app/0x0,swgbeq7Yr0dkTXqkoA8F1O-U1vVdNNzEfNuGWitER4b8/https://picx.zhimg.com/85eb412dc28d07bf8d46b44cacb002be_l.jpg?source=32738c0c)

创建时间：2023-04-06 19:59:34

最后编辑：2023-04-07 14:48:57

[![吴咏炜](https://proxy-prod.omnivore-image-cache.app/0x0,sjO5tqlb78Q-iS56tb606qUE3viMdvgootWXA_x0yLOg/https://pic1.zhimg.com/85eb412dc28d07bf8d46b44cacb002be_l.jpg?source=2c26e567)](https://www.zhihu.com/people/wu-yong-wei-99)

[吴咏炜](https://www.zhihu.com/people/wu-yong-wei-99)

​![](https://proxy-prod.omnivore-image-cache.app/0x0,sRpP1H2oa_TfsDLpATwsIt6ipVLRN7HlUZGTch2Ee4JQ/https://picx.zhimg.com/v2-4812630bc27d642f7cafcd6cdeca3d7a.jpg?source=88ceefae)

老程序员，C++顾问、培训师

已关注

Pecco 等 260 人赞同了该回答

[发布于 2023-04-08 08:20](https://www.zhihu.com/question/594059514/answer/2973611125)・IP 属地上海

这个问题，Herb Sutter 在 2014 年已经给出了非常权威的回答。我来简单翻译和汇总一下。

C++ 里传递对象，基本建议是如下方式：

![](https://proxy-prod.omnivore-image-cache.app/1148x374,sf8DWwRCctclU1bJvefJXzUTp15YP9dJMEOrS6WMJZKQ/https://picx.zhimg.com/50/v2-58816653893531522c4c1144ebb8360a_720w.jpg?source=2c26e567)

C++ 传递对象的基本方式

把这张表格里的移动换成复制，这就对 C++98 和 C++11/14/17/20 同样适用了。这里，代价低是指只需要复制几个整数的大小，代价中是指比低要高、但不超过约 1KB、且没有堆内存的申请和释放，此外就属于高了。“出”是指函数需要返回一个对象，因此可以用返回值或出参的方式；“入/出”参当然只能使用引用传参；“入”参使用简单的值传参或 const 引用传参。

注意这里区分了“入”和“入且保留一份”。后者指的是把传入的对象保存起来（在成员变量或全局变量里），可以利用移动语义来进一步优化：

![](https://proxy-prod.omnivore-image-cache.app/1140x362,sf20RsxAWXL2VDV7FiBRmWBx4NK72-lAtARZBqPWbJtg/https://picx.zhimg.com/50/v2-f8af91608c853c1a83e9dc9664c65af6_720w.jpg?source=2c26e567)

C++ 传递对象的优化方式

这里，我们针对移动代价低到中（或不知道）的场景作了优化，分成了使用 const 左值引用的重载和使用右值引用的重载。这样，当我们需要保留一份对象、同时调用方手里是一个右值对象的话，我们可以充分利用移动语义进行优化，达到较高的性能。

此外，在“入且保留一份”的场景下还可以考虑值传参和转发引用传参。在这里就不作讨论了。

延伸阅读：

Herb Sutter, “Back to the Basics! Essentials of Modern C++ Style” (CppCon 2014). <https://www.youtube.com/watch?v=xnqTKD8uD64>

吴咏炜，《现代 C++ 实战》极客时间专栏，第 41 讲“对象传参和返回”。<https://time.geekbang.org/column/256>

[发布于 2023-04-08 08:20](https://www.zhihu.com/question/594059514/answer/2973611125)・IP 属地上海

​赞同 260​​4 条评论​收藏​喜欢

​

收起​

[![pansz](https://proxy-prod.omnivore-image-cache.app/0x0,sQMqjgCBulmiEmnWyx22wAyAm2R5vA0MrV0orP1cC-XM/https://picx.zhimg.com/310d85e8d_l.jpg?source=1def8aca)](https://www.zhihu.com/people/pansz)

[pansz](https://www.zhihu.com/people/pansz)

[​](https://zhuanlan.zhihu.com/p/344234033)​![](https://proxy-prod.omnivore-image-cache.app/0x0,sEQaOWrSM4sYxMszrQ6lhsM51WgM5AvlqxCkeG6GJZz4/https://pic1.zhimg.com/v2-4812630bc27d642f7cafcd6cdeca3d7a.jpg?source=88ceefae)

知乎十年新知答主

​ 关注

[发布于 2023-04-07 09:27 ，编辑于 2023-04-07 09:33](https://www.zhihu.com/question/594059514/answer/2972162847)

在 const reference 替代值的情况下，如果不考虑性能，可以尽量都用。考虑性能的话，<strong>部分情况</strong>使用值传递性能更高。因此建议采用值传递。

为什么对于小数据来说，应该用值传递呢？因为值传递可以全部塞进寄存器，而引用传递意味着必然有一次无法优化掉的内存访问寻址，对于现代CPU以及现代编译器来说，能全进寄存器的操作肯定是最高效率。

具体多少数据算小数据呢？取决于你的编译器支持的CPU体系，以及目标CPU架构，总共支持放多少参数进寄存器。你需要对你的目标机器测试才知道。一般而言，如果所有参数的长度加起来在四个机器字长以内，可以算作小数据，建议值传递，反之则建议引用传递。

---

但如果你问的是 const reference 能不能取代非 const 的 reference ，那如果参数指定为 reference，则必须传递一个变量作为参数。但如果参数指定为 const reference，就可以允许使用常量或者文字量作为参数。因此 const reference 适用场景更广一些。

总的来说：

```text
* 如果你是在考虑用普通引用vs常量引用，那么只要可能，就应该用常量引用。
* 如果你是在考虑用值传递vs常量引用，那么只要数据尺寸够小，建议用值传递。
```


[发布于 2023-04-07 09:27 ，编辑于 2023-04-07 09:33](https://www.zhihu.com/question/594059514/answer/2972162847)

​赞同 123​​19 条评论​收藏​喜欢

​

[![江东某人](https://proxy-prod.omnivore-image-cache.app/0x0,sSTK7ehNvi3Nq4M2Bolu5EC-lev1R5kOGr5UCiS_i9Tk/https://pica.zhimg.com/v2-0ac994c2407d0d904492375ca1a9c2a9_l.jpg?source=1def8aca)](https://www.zhihu.com/people/jiang-dong-mou-ren)

[江东某人](https://www.zhihu.com/people/jiang-dong-mou-ren)

{"中科大", "学弱", "拖延症晚期"}

当参数类型可确定时，对于基本类型和拷贝成本很低的类型，按值传递应该是首选。基本类型不用多说，对于类似 `string_view` 的可平凡复制构造类型，在现代编译器中有一项重要的优化叫 Scalar Replacement of Aggregates (SRA / SROA)，这种优化可以直接把类的成员使用寄存器传入函数，这里如果按引用传参的话，编译器可能会因为受到 ABI 的约束，不进行类似的优化

```css
void foo_0(const string_view &x) {
    std::printf("%s\n", x.data());
}

void foo_1(const string_view x) {
    std::printf("%s\n", x.data());
}

```

对于以上代码，编译器产生汇编如下

```perl
foo_0:
	pushq	%rbp
	movq	%rsp, %rbp
	movq	(%rdi), %rdi
	popq	%rbp
	jmp	_puts

foo_1:
	pushq	%rbp
	movq	%rsp, %rbp
	popq	%rbp
        jmp     _puts
```

可以看出，对于值传递的 `foo_1`，全部操作都在寄存器中进行，但是对于 `foo_0`，还是需要去访问内存，取出 `x.data()`

值得注意的是，虽然这个优化名字叫 Scalar Replacement of Aggregates。但是此 Aggregate 并非 C++ 中的聚合类，这里的 Aggregate 要求要比聚合类松得多，不严谨的说就是可平凡复制构造类型 `std::is_trivially_copy_constructible` 

---

那么对于类型不能确定的模板函数呢？诚然，我们可以写出如下代码来区分需要值传递的参数和需要引用传递的参数

```cpp
template <typename T>
concept trivially_copy_constructible =
    std::is_trivially_copy_constructible_v<T>;

void foo(const trivially_copy_constructible auto x) { ... }
void foo(const auto &x) { ... }

```

但这种方法的缺点也非常明显，对于参数数量过多的函数，这样一个一个判断需要写大量重复代码。这时候还是得靠编译器的 Scalar Replacement of Aggregates 优化。

在现代编译器中，当函数满足一些条件时（基本约等于可以内联），Scalar Replacement of Aggregates 还可以把按引用传递的参数优化为按值传递，然后在后续的内联优化中直接把函数内联了

```cpp
void foo(const auto &x) {
    std::printf("%s\n", x.data());
}
int main(int argc, char **agrv) {
    std::string_view x{"fuck"};
    if (argc == 10)
        x = "shit";
    foo(x);
}

```

生成汇编为

```perl
_main:                                  ## @main
	.cfi_startproc
## %bb.0:
	pushq	%rbp
	.cfi_def_cfa_offset 16
	.cfi_offset %rbp, -16
	movq	%rsp, %rbp
	.cfi_def_cfa_register %rbp
	cmpl	$10, %edi
	leaq	L_.str.1(%rip), %rax
	leaq	L_.str(%rip), %rdi
	cmoveq	%rax, %rdi
	callq	_puts
	xorl	%eax, %eax
	popq	%rbp
	retq
	.cfi_endproc
                                        ## -- End function
	.section	__TEXT,__cstring,cstring_literals
L_.str:                                 ## @.str
	.asciz	"fuck"

L_.str.1:                               ## @.str.1
	.asciz	"shit"
```

直接内联优化了。

但是要注意的是，这种优化对函数要求比较多，比如上面的 `foo_0`函数，因为其默认具有外部链接，编译器为了遵循 ABI 要求，就没有对其做优化。

---

综上所述，当类型可以确定的时候，基本类型和拷贝成本很低的类型尽量还是使用按值传递；不能确定类型的时候不是对性能特别敏感的代码可以一律引用传参，实在需要优化再考虑使用 `concept` 或者 `SFINAE`分别处理。这里是因为不是所有的模板函数都是可以被内联的，比如有复杂递归的函数

```cpp
static inline int ack(const auto &x, const auto &y) {
  int m = x, n = y;
  while (m != 0) {
    if (n == 0)
      n = 1;
    else {
      n = ack(m, n - 1);
    }
    m--;
  }
  return n + 1;
}

int main(int argc, char **agrv) {
    int x = 42;
    if (argc == 10)
        x = 24;
    std::printf("%d\n", ack(x, x));
}

```

 生成汇编如下

```cos
ack:
	pushq	%rbp
	movq	%rsp, %rbp
	pushq	%r15
	pushq	%r14
	pushq	%rbx
	pushq	%rax
	movl	(%rdi), %ebx
	movl	%ebx, -28(%rbp)
	movl	(%rsi), %eax
	testl	%ebx, %ebx
	je	LBB1_6
//....

```

可以看出，对于这种复杂的递归函数，编译器是没法进行内联的，SROA 中的引用替换也没有办法进行。

---

还需特别提到的是，需要小心判断函数是否<strong>可以</strong>（不是<strong>适合</strong>）使用引用传参。经典的例子如下

```arduino
void foo() {
    auto x = std::make_shared<int>(114514);
    std::thread t{[](const auto &x) {
        using namespace std::chrono_literals;
        std::this_thread::sleep_for(10ms);
        std::printf("%d\n", *x);
    }, x};
    t.detach();
}

```

这里显然就不应该使用引用传参。

---

在上述的代码中其实还有一个有趣的优化，由于 `std::printf("%s\n", x.data())`和 `std::puts(x.data())` 的效果相同，编译器直接选择了 `std::puts`，省去了格式化串的开销。「编译器认为你很傻，并向你展示了更高效的实现」:-P 

展开阅读全文​

​赞同 24​​2 条评论​收藏​喜欢

​

