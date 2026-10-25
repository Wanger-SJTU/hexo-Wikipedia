---
title: 计算机是如何计算 log 函数的？
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/走向cs/计算机是如何计算-log-函数的/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/333371020/answer/1686069171
---


不要听什么歪门邪道，我们看标准方案，这套方案是 1993 年由 Sun Microsystems 正式写入 C 标准库的方案，函数为 `double ieee754log(double x)`（ieee754: IEEE二进制浮点数算术标准）。但这套方法为了性能的苛刻而写得过于复杂，我提核心的捡。

总体思路：所有的对数函数计算核心都是利用多项式展开（泰勒级数）然后多项式求和计算结果。为了性能或者精度的要求可能会对展开后的求和式子做进一步优化，最终会封装一个 ln" role="presentation">ln\ln 函数出来。其余的对数函数都是使用换底公式来套 ln" role="presentation">ln\ln 函数做的最底层实现，随着大量图形运算的需求提升， ln" role="presentation">ln\ln 函数实现得好不好直接决定你电脑快不快。

我们具体讲一下，感兴趣的小伙伴可以端碗白米饭。

首先，我们有换底公式：

$ab=m&#x21D2;eln&#x2061;ab=m&#x21D2;ebln&#x2061;a=m&#x21D2;ln&#x2061;ebln&#x2061;a=ln&#x2061;m&#x21D2;bln&#x2061;a=ln&#x2061;m&#x21D2;b=ln&#x2061;mln&#x2061;a" role="presentation">ab=m⇒eln⁡ab=m⇒ebln⁡a=m⇒ln⁡ebln⁡a=ln⁡m⇒bln⁡a=ln⁡m⇒b=ln⁡mln⁡a\begin{aligned} a^b &= m \\ \Rightarrow e^ {\ln {a^b}} &= m\\ \Rightarrow e^ {b\ln {a}} &= m\\ \Rightarrow \ln e^{b\ln {a}} &= \ln m\\ \Rightarrow {b\ln {a}} &= \ln m\\ \Rightarrow b &= {\ln m\over \ln a}\\ \end{aligned} $

所以我们知道所有的对数函数的计算都可化为两个 ln" role="presentation">ln\ln 函数相除，比如：

`double log10(double x) {
    return log(x) / log(10); // log == ln
}`

我们只需要解决如何求 ln" role="presentation">ln\ln 函数就可以了。

这才开篇进入正题！我们先看 ln" role="presentation">ln\ln 函数的实现源码（程序里面都是用 log" role="presentation">log\log 代替 ln" role="presentation">ln\ln 表示自然底数的对数函数）：

`#include "fdlibm.h"

#ifdef __STDC__
static const double
#else
static double
#endif
ln2_hi  =  6.93147180369123816490e-01,	/* 3fe62e42 fee00000 */
ln2_lo  =  1.90821492927058770002e-10,	/* 3dea39ef 35793c76 */
two54   =  1.80143985094819840000e+16,  /* 43500000 00000000 */
Lg1 = 6.666666666666735130e-01,  /* 3FE55555 55555593 */
Lg2 = 3.999999999940941908e-01,  /* 3FD99999 9997FA04 */
Lg3 = 2.857142874366239149e-01,  /* 3FD24924 94229359 */
Lg4 = 2.222219843214978396e-01,  /* 3FCC71C5 1D8E78AF */
Lg5 = 1.818357216161805012e-01,  /* 3FC74664 96CB03DE */
Lg6 = 1.531383769920937332e-01,  /* 3FC39A09 D078C69F */
Lg7 = 1.479819860511658591e-01;  /* 3FC2F112 DF3E5244 */

static double zero   =  0.0;

#ifdef __STDC__
	double __ieee754_log(double x)
#else
	double __ieee754_log(x)
	double x;
#endif
{
	double hfsq,f,s,z,R,w,t1,t2,dk;
	int k,hx,i,j;
	unsigned lx;

	hx = __HI(x);		/* high word of x */
	lx = __LO(x);		/* low  word of x */

	k=0;
	if (hx  0x00100000) {			/* x 
	    if (((hx&0x7fffffff)|lx)==0) 
		return -two54/zero;		/* log(+-0)=-inf */
	    if (hx0) return (x-x)/zero;	/* log(-#) = NaN */
	    k -= 54; x *= two54; /* subnormal number, scale up x */
	    hx = __HI(x);		/* high word of x */
	} 
	if (hx >= 0x7ff00000) return x+x;
	k += (hx>>20)-1023;
	hx &= 0x000fffff;
	i = (hx+0x95f64)&0x100000;
	__HI(x) = hx|(i^0x3ff00000);	/* normalize x or x/2 */
	k += (i>>20);
	f = x-1.0;
        //  到这，第一步标记，得出 k, f, s 的值了
	if((0x000fffff&(2+hx))3) {	/* |f| 
	    if(f==zero) if(k==0) return zero;  else {dk=(double)k;
				 return dk*ln2_hi+dk*ln2_lo;}
	    R = f*f*(0.5-0.33333333333333333*f);
	    if(k==0) return f-R; else {dk=(double)k;
	    	     return dk*ln2_hi-((R-dk*ln2_lo)-f);}
	}
 	s = f/(2.0+f); 
	dk = (double)k;
	z = s*s;
	i = hx-0x6147a;
	w = z*z;
	j = 0x6b851-hx;
	t1= w*(Lg2+w*(Lg4+w*Lg6)); 
	t2= z*(Lg1+w*(Lg3+w*(Lg5+w*Lg7))); 
	i |= j;
	R = t2+t1;
	if(i>0) {
	    hfsq=0.5*f*f;
	    if(k==0) return f-(hfsq-s*(hfsq+R)); else
		     return dk*ln2_hi-((hfsq-(s*(hfsq+R)+dk*ln2_lo))-f);
	} else {
	    if(k==0) return f-s*(f-R); else
		     return dk*ln2_hi-((s*(f-R)-dk*ln2_lo)-f);
	}
}`

这么艹的代码，是不是看一眼就不想看了。别急，咱个儿挑重点讲。

**

1. 参数约化（Argument Reduction）**

将输入的一个数字 x 重整化为这个形式 x= 2^k \times (1+f) ，其中 {\sqrt 2\over2} . 以确保 1+f 小到足够合适，要不然之后换元的泰勒展开精度会很差。

然后很容易发现规律： \ln x = \ln [2^k \times (1+f)] = k\ln 2 + \ln (1+f) ，其中 k\ln2 口算都能算出来，我们来进一步关注 \ln (1+f) 的计算。

<strong>2. 计算 1+f 的对数值</strong>

将第一步的 (1+f) 进行计算，其结果因范围控制得比较小，所以很容易近似到一个很精确的值。计算方法：

取中间代换变量 s = {f\over 2 + f} （为什么这么代换呢？因为泰勒对 \ln(x) 函数的展开在 x 接近 1 的时候最好），则有泰勒展开：

\begin{aligned} \ln (1+f) &= \ln(1+s) - \ln(1-s)\\ &=2s + {2\over3} s^3 + {2\over5} s^5 + \cdots\\ &=2s + s\cdot R(z) \end{aligned} 

我们用一个 Remez 算法来求解 R(z) （具体参考百科 Remez算法 ），逼近到 14 次方项，此时的精度可以到 2^{-58.45} 这个级别，完全足够满足 64 位浮点运算要求了，于是上式的 R 就可以等于：

R(z)\approx Lg1\cdot s +Lg2\cdot s +Lg3\cdot s +Lg4\cdot s +Lg5\cdot s  +Lg6\cdot s  +Lg7\cdot s 

其中每一项 s 都需要带对应指数，式子可满足精度 |(Lg1\cdot s + \cdots +Lg7\cdot s) - R(z)| ，且 Lgi,\ i = 1,2,...,7 都是常数，从上面的代码可以看到这些常数的值。

然后根据 s = {f\over 2 + f} ，我们有进一步的代换关系： 2s = {2f\over 2 + f} = f-sf 

于是有：

\begin{aligned} \ln (1+f) &= 2s + s\cdot R(z) \\ &= f-sf + s\cdot R(z) \\ &=f - s(f-R(z)) \end{aligned} 

则：

\ln(x) = k\ln 2 + \ln (1+f) = k\ln2 + f - s(f-R(z)) 

另外，如果要求更高精度的话，重复代换关系可得： 2s = f-sf = f - {ff\over2} + {sff\over2} 

于是有：

$$\begin{aligned} \ln (1+f) &= 2s + s\cdot R(z) \\ &= f - {ff\over2} + {sff\over2} + s\cdot R(z) \\ &=f - {ff\over2}  + s(\frac{ff}{2}+R(z)) \end{aligned} $$

则：

$$\ln(x) = k\ln 2 + \ln (1+f) = k\ln2 + f - {ff\over2}  + s(\frac{ff}{2}+R(z)) $$

总览一下：其中的 \ln2 是个常数， R(z) 项也是通过 7 个常数和 s 的值计算得到的，所以这个方法依赖了 8 个常数和 3 个变量 k,s,f ，变量关系为 x= 2^k \times (1+f) ， s = {f\over 2 + f} .

上面的代码看起来复杂，但核心也就这些，多的都是些边界判断，比如 x 是不是 0 ， f 算出来的 R 的精度符不符合要求这类。如果感兴趣的话建议抽时间自己再手动实现一遍以加深印象，指不定哪天就用上了呢。

======= updated: 2022-11-28 =======

一年多来这个回答收到了很多赞，看来大家对计算机+数学都是真爱，刚好前两天顺道看到 Go 的源码，发现里面的 `log` 实现得更“可读”，于是贴出来给大家参考参考：

`func log(x float64) float64 {
	const (
		Ln2Hi = 6.93147180369123816490e-01 /* 3fe62e42 fee00000 */
		Ln2Lo = 1.90821492927058770002e-10 /* 3dea39ef 35793c76 */
		L1    = 6.666666666666735130e-01   /* 3FE55555 55555593 */
		L2    = 3.999999999940941908e-01   /* 3FD99999 9997FA04 */
		L3    = 2.857142874366239149e-01   /* 3FD24924 94229359 */
		L4    = 2.222219843214978396e-01   /* 3FCC71C5 1D8E78AF */
		L5    = 1.818357216161805012e-01   /* 3FC74664 96CB03DE */
		L6    = 1.531383769920937332e-01   /* 3FC39A09 D078C69F */
		L7    = 1.479819860511658591e-01   /* 3FC2F112 DF3E5244 */
	)

	// special cases
	switch {
	case IsNaN(x) || IsInf(x, 1):
		return x
	case x  0:
		return NaN()
	case x == 0:
		return Inf(-1)
	}

	// reduce
	f1, ki := Frexp(x)
	if f1  Sqrt {
		f1 *= 2
		ki--
	}
	f := f1 - 1
	k := float64(ki)

	// compute
	s := f / (2 + f)
	s2 := s * s
	s4 := s2 * s2
	t1 := s2 * (L1 + s4*(L3+s4*(L5+s4*L7)))
	t2 := s4 * (L2 + s4*(L4+s4*L6))
	R := t1 + t2
	hfsq := 0.5 * f * f
	return k*Ln2Hi - ((hfsq - (s*(hfsq+R) + k*Ln2Lo)) - f)
} 
`

算法还是同C一样的，这次看完相信大家一定能手写了！

[所属专栏 · 2021-03-20 04:03 更新](https://zhuanlan.zhihu.com/suneo)[![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_c958578de470.jpg)小亦日記

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_5b1631aae11b.jpg)dadada

18 篇内容 · 8054 赞同

](https://zhuanlan.zhihu.com/suneo)订阅[最热内容 ·

数学家可以在指定任意位数后求 π 在这个位数上的数吗？

](https://zhuanlan.zhihu.com/suneo)[编辑于 2022-11-28 08:25](//www.zhihu.com/question/333371020/answer/1686069171)・广东

​​5944 ​718 ​分享

​​

收起​
