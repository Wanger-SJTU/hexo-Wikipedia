---
title: Rust生命周期集大成者 PhantomData<T>
date: "2024-07-13 00:00:00"
updated: "2024-07-13 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/走向cs/Rust生命周期集大成者-PhantomData_T_/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/686143745
---


在Rust中PhantomData出现次数不算稀有，本来以为只是一个简单的占位结构体，没想到越深入越难懂，花了好几天时间才稍稍理解一点。因为我没有任何PL的学术背景(其实是没有任何学术背景，一个小小本科学历)，所以只能从语法规则上尝试理解，如果有错误欢迎大家指出，要是有学术大佬能高屋建瓴地阐述PhantomData的理念和作用就更好了~

<strong>阅读前置要求: 对Rust有基本了解，懂生命周期长短的比较，懂协变，逆变规则</strong><span class="wikilink wikilink--missing" title="未导入的页面">1</span>(#ref_1) 。

### 0. Variance<span class="wikilink wikilink--missing" title="未导入的页面">2</span>(#ref_2) 

Variance is a property that generic types have with respect to their arguments.默认大家都懂什么是*covariant, contravariant *和 *invariant，*这里就不详细解释了。简单回顾，就是讨论在类型 `T1` 是 `T2` 的子类型的情况下，带类型参数的类型(generic type) `SomeType` 是不是 `SomeType` 的子类型。 

比如假设 `T1` 是`Dog` 类型，`T2` 是 `Animal` 类型，`Dog` 是 `Animal` 的子类型(subtyping)。那么`Array` 还是不是 `Array` 的子类型呢？这里的`Array`类型就是上面的`SomeType` 的一个例子。至于`Array`到底是不是`Array` 的子类型呢，这个只和 `Array` 自己的性质有关 ，这个性质就是Variance。

但是Rust中让初学者很迷惑的一点是，Rust的类型不像Java/C++ 一样可以继承父类型，又哪里来的子类型呢？实际上，Rust有两种类型参数，一种是lifetime parameter，一种是type parameter(可以类比Java中的类型参数)。lifetime parameter是有子类型的，具体规则可以看死灵书 Subtyping and Variance

### 1. PhantomData是怎样出现的

PhantomData在2014年12月出现在RFC-0738提案<span class="wikilink wikilink--missing" title="未导入的页面">3</span>(#ref_3) 中，也就是很久很久以前。那个时候，Rust允许这样的语法

```text
struct AnimalT> {
    age: i32,
}

struct Item'a> {

}
```


看出来问题了吗？ `T` 或者 `'a` 都没有出现在 结构体定义中，这样会导致编译器有理由认为Animal 和 Animal 是可以互换的，毕竟 Animal 本身并没有真的使用 Dog 或者 Car(不是Cat， 用Car表示一个和动物完全没有关系的物品)，那它们不就是一样的吗？但是这种规则明显没有意义且可能出错，Dog 和 Car 类型之间没有任何联系，自然不能把 Animal 看成和 Animal 一样是可以互换使用的类型。但是在Rust早期，对于没有实际用到的生命周期参数，Rust确实是这么处理的，也造成了很多错误。

于是在这个RFC中，提议: make it an error to have a type or lifetime parameter whose variance is not constrained.

接着提出程序员消除这个错误的方法要么是直接删去没有使用的类型参数，要么是插入一个Marker Type，也就是本文讨论的PhantomData。

但是注意，<strong>提议原话说的的是variance is not constrained，并不仅仅是 type or lifetime parameters are not used in the body of the type</strong>。因此当我们用PhantomData来假装使用T的时候，还要考虑T的variance property！而不只是简单插入了一个占位 T 的成员属性。这也是为什么，我们不仅会看见有最常见的`PhantomData`比如像下面这种: 

```text
struct CovariantStructT> {
     _field: PhantomDataT>
}
```


也可能看见`PhantomData`，比如下面

```text
struct InvariantStructT> {
     _field: PhantomDatamut T>
}
```


虽然是在结构体中使用了PhantomData，但一个在 T 上是 covariant的，另一个在 T 上是invariant的，结构体关于 T 的variance property就是由PhantomData控制的。

实际上，在这个提案提出 PhantomData 之前，Rust有

- InvariantType
- ContravariantType
- CovariantType
- InvariantLifetime
- ContravariantLifetime
- CovariantLifetime
一共6种 Marker Type 来手动标注类型的variance property，它们的用法可以查看[当时的Rust源代码注释](https://link.zhihu.com/?target=https%3A//github.com/rust-lang/rust/blob/9f07d055f7823ac0e17e014f3effa2a0be0947e9/src/libcore/marker.rs%23L223)。而有了PhantomData之后，这6种类型全部被弃用，因为它们都可以通过PhantomData来表达。

提案前写法提案后写法InvariantTypePhantomData>ContravariantTypePhantomDataCovariantTypePhantomDataInvariantLifetimePhantomData>ContravariantLifetimePhantomDataCovariantLifetimePhantomData如果懂得variance，应该是能理解提案后写法的。

而上面所有内容就是PhantomData类型出现的初衷，强制规定了每一个类型参数的variance property，而不仅仅是占位。

### 2. OIBIT(auto trait)

OIBIT全称opt in builtin traits，之后的新名字是auto trait，常见auto trait比如有Send和Sync，不需要手写 impl 就可以由编译器自动推导是否满足。当然，我们也可以使用 unsafe impl 来指定实现这个trait，或者impl !TraitName 来排除这个trait，排除trait不是unsafe的，但是unstable的，需要用nightly版本编译。

目前有5个auto trait，分别是

- Send
- Sync
- Unpin
- UnwindSafe
- RefUnwindSafe
PhantomData的规则是，只要 T 实现了上面某个trait，那么 PhantomData 同样实现某个trait。比如如果 T 是满足 Send 的，那么PhantomData 也自动满足 Send。

有了这个特点，我们就可以通过PhantomData来排除一些我们不想要实现的trait，示例如下

```text
struct MyStruct {
    _field: PhantomDataRc()>>,
}
```


因为Rc 是 !Send的，所以导致MyStruct 最后也是 !Send，但是我们如果直接写 `impl !Send for MyStruct`， 目前则需要使用nightly编译器，如果使用stable编译器，编译器就会提示 `negative trait bounds are not yet fully implemented; use marker types for now ` 证实了PhantomData可以用来排除不需要的auto trait。这里我们再一次体会到，PhantomData不只是用来占位的，即使 `MyStruct` 本身没有任何类型参数，也可以包含有PhantomData。

### 3. Drop Check

Rust的特点是宣称无需GC的前提下保证内存安全，其中一种方式就是使用RAII，在创建结构体的时候获取资源，在析构(之后全部称drop)的时候释放资源。而在drop的时候，因为rust允许访问struct所有的成员，因此要保证不能访问到已经无效的数据，这就是drop check。

<strong>为了先体会drop check，可以简单认为，drop check只需要检查实现了drop方法，且其drop方法有类型参数的结构体</strong>(之后会形式化定义)

在rust中，类型参数不仅仅指其他语言中也常见的`T`，也包括生命周期参数，例子如下

```text
struct NodeT> {
    val: T,       //   T是类型参数, 称为 type parameter
}
struct Node'a> {  
    val: &'a i32, // 'a 也是类型参数，称为 lifetime parameter
} 
```


#### 3.1 带有生命周期标注的drop方法

```text
// 代码1
struct Node'a> {
    val: Option'a i32>, // 'a 也是类型参数
}
```


impl'a> Drop for Node'a> {

```js
    fn drop(&mut self) {
         println!("{}", self.val.unwrap());
    }
}

fn main() {

    let x = 123;
    let node = Node{val: Some(&x)}; // ok, 因为node比x先drop
}
```


上面这段代码是能正常编译的，因为按rust规则，在代码段中先声明的变量后drop，也就是说node比x先drop，那当node在执行自己的drop函数时，x一定还没有被释放，所以编译器编译成功。

如果只是调换一下x和node位置，则编译失败

```text
// 代码2
struct Node'a> {
    val: Option'a i32>, // 'a 也是类型参数
}
```


impl'a> Drop for Node'a> {

```js
    fn drop(&mut self) {
        // drop函数不再访问&i32, 但也不能编译成功
    }
}

fn main() {

    let mut node = Node{val: None};
    let x = 123;
    node.val = Some(&x);  // error, `x` does not live long enough
}
```


调换顺序后，编译器知道x比node先drop，也就是说x的生命周期比node更短，因此不满足Node的定义，因此编译失败。这也是drop check的成果，分析出drop函数中还存在资源引用，虽然实际上我们在drop函数中并没有访问i32的引用，但目前的rust编译器还没有智能到那一步，它只会预防我们访问所有可能的引用。

再补充一个概念<strong>，Strictly outlives</strong>

我们知道，生命周期之间可以判断是否有包含关系，当我们说'a : 'b 的时候，说明 'a 的范围是<strong>大于等于</strong>'b 的，我们不关心到底是大于还是等于。但是现在引入一个"strictly outlives"的概念，要求一定要大于而不能等于。

```js
{
    let a = 1;
    let (b, c);
    b = 2;
    c = 3;
}
```


在上面代码中，a的生命周期strictly outlives b和c的生命周期。而b和c的生命周期是相同的，不存在strictly outlives关系。因为rust规定，<strong>在一个let语句中的变量具有相同的生命周期。</strong>所以，同一个结构体中的变量也都有一样的生命周期。

而在drop check中，就要求这些类型参数Strictly outlives T，例子如下:

```text
struct Node'a> {
    val: Option'a i32>, 
    i: i32,
}
```


impl'a> Drop for Node'a> {

```text
    fn drop(&mut self) {

    }
}

fn main() {

    let mut node = Node{val: None, i: 1};
    node.val = Some(&node.i); // borrow may still be in use when destructor runs
}
```


在上面的代码中，按照drop order，变量val会先drop，然后才drop变量i，但这段代码仍然无法通过编译，原因就是没有Strictly outlives。

#### 3.2  **带有类型标注的drop方法

如果结构体drop函数不再有 'a 这样的生命周期标注，只有表示类型的 T，是否就不存在生命周期的问题了呢，答案显然是No，因为T本身可以是任何类型，包括带生命周期的结构体，所以可能会隐式地包含生命周期的问题。

```text
// 代码3
struct NodeT> {
    val: OptionT>, // 'a 也是类型参数
}
```


implT> Drop for NodeT> {

```js
    fn drop(&mut self) {
        // drop函数不访问T, 但也不能编译成功
    }
}

fn main() {

    let mut node = Node{val: None};
    let x = 123;
    node.val = Some(&x);  // error, `x` does not live long enough
}
```


我们把代码2中 `Node`  替换成 `Node` , `main` 函数中的内容不变，仍然编译失败。rust的drop check仍然检查出我们可能会访问到无效内存，即使这是个空的`drop`函数。

#### 3.3 不带任何类型参数的drop函数

如果drop函数不带任何类型参数，无论是`` 还是 `` ，那么这个drop函数一定是安全的。因为这个struct中的所有成员一定都属于这个struct。因为没有生命周期标注`` 意味着不会有任何引用，没有`` 也排除了隐含引用的可能。所以<strong>不会有drop check</strong>。

#### 3.4 没有drop函数的结构体

如果一个结构体没有drop函数，则能证明在释放它的时候，一定不会访问它的任何成员变量，也就<strong>不需要有drop check</strong>，且我们还能将它的生命周期提前结束，这样更符合直觉一点。比如下面的代码4

```text
// 代码4
struct Node'a> {
    val: Option'a mut i32>, // 'a 也是类型参数
}

// Node 没有了drop方法
fn main() {

    let mut node = Node{val: None};
    let mut x = 123;
    node.val = Some(&mut x);
    println!("{}", x); // ok, 输出123
}
```


 和代码3相比，我们不仅删除了Node的drop方法(其实这样就已经能编译成功了)，还修改Node的定义，要求传入一个可变引用，但最后能成功运行并打印出123，说明node的生命周期在打印 x 的值之前已经结束了。

#### 3.5 #[may_dangle]

在3.1节的代码2中，即使我们的drop函数是空的，但由于编译器保守认为我们可能在drop函数中访问成员变量，所以编译失败。

但是Rust也提供了一种 unstable 机制，让程序员显式告示编译器，保证在drop函数中不会访问跟类型参数有关的成员变量，于是3.1中的代码2可以改写为

#![feature(dropck_eyepatch)]

```text
struct Node'a> {
    val: Option'a i32>, // 'a 也是类型参数
}

// 在'a 前加#[may_dangle]，编译器不再检查关于'a 的任何访问，所以代码编译成功
```

unsafe impl#[may_dangle]'a> Drop for Node'a> {

```js
    fn drop(&mut self) {

    }
}

fn main() {

    let mut node = Node{val: None};
    let x = 123;
    node.val = Some(&x);  
}
```


上面的代码可以通过编译，因为在Drop trait的生命周期参数 `'a` 前加了 `#[may_dangle]`，告诉编译器我们保证代码里不会访问包含生命周期为 `'a` 的任何类型的值，所以编译器会忽略对 `'a` 的生命周期检查，无论是访问带 `'a` 的变量，还是drop 带`'a` 的变量。 

#### 3.6 形式化drop check

通过上面的例子，大概能体会到drop check的功能，直白说就是检查drop函数中是否可能合法访问结构体的所有成员变量，特别是引用变量。接下来形式化说明，drop check到底是怎么检查代码是否合法的。

但首先引入一个概念: <strong>drop glue</strong>

Drop glue is compiler generated and first calls::drop and then recursively calls the drop glue of any recursively <strong>owned values</strong>. 简单说就是编译器生成的，用于调用drop函数的代码。然而需要注意的是，原文用词是owned values，并不是调用每一个值的drop glue。比如如果 T 有成员 `t1: Vec`  ，那么drop glue会调用t1的 drop 函数。如果 T 有成员 `t2: &mut Vec`，drop glue 则不会调用 `t2.drop()`，因为按照规则 t2 不属于 T 的owned values。具体哪些算owned values，哪些不算，可以查阅rust dev-guide<span class="wikilink wikilink--missing" title="未导入的页面">4</span>(#ref_4)

接下来继续说明drop check的流程。这里引用Rust doc中drop check<span class="wikilink wikilink--missing" title="未导入的页面">5</span>(#ref_5) 的定义，而不是RFC-0769<span class="wikilink wikilink--missing" title="未导入的页面">6</span>(#ref_6) 中定义，因为 RFC-0769 写于2013年8月，过于古老，和现在的规则虽然精神内核一样，但具体规则已经有所不同。

rust doc关于drop check的检查过程是这样说的

- 如果类型 T 和它的所有 (recursive) fields 都没有实现 Drop trait的话（即 T 没有drop glue），不进行drop check。其中`PhantomData`and`ManuallyDrop`  都被认为是没有实现Drop trait的。
- 如果 T 实现了Drop trait，那么无论 T 的 type parameter 还是 lifetime parameter都要保证在drop 函数中是有效的(注: 但如果有 #[may_dangle] 修饰<span class="wikilink wikilink--missing" title="未导入的页面">7</span>(#ref_7)，会完全忽略)。
- 如果 T 有drop glue，那么对 T 递归<strong>包含(own)</strong>的所有的类型 U来说，要保证 U 在 drop 时，所有类型或生命周期都是有效的。(注意，这里和drop glue相同的是都要求包含关系，但drop glue关心的是value，这里关心的是类型)
接下来说明如何计算包含(own)关系，这里直接搬运一下(如果你能坚持看到这里，下面这段原文也一定能大概理解)

The set of owned types is determined by recursively traversing`T`:
## 1. Recursively descend through `PhantomData`, `Box`, tuples, and arrays (including arrays of length 0).

## 2. Stop at reference and raw pointer types as well as function pointers and function items; they do not own anything.

3. Stop at non-composite types (type parameters that remain generic in the current context and base types such as integers and `bool`); these types are owned.
## 4. When hitting an ADT with `impl Drop`, stop there; this type is owned.

5. When hitting an ADT without `impl Drop`, recursively descend to its fields. (For an `enum`, consider all fields of all variants.)简单说，就是定义了 T 的成员变量的这些类型，哪些算包含，哪些不算包含。

比如

```text
struct OwnedVec {
    v: Veci32> // OwnedVec 包含(own) Vec，需要对Vec进行检查
}

struct UnownedVec {
    v: &mut Veci32> // 因为只持有Vec的引用，根据上面第2条，Stop at reference，因此不拥有Vec
}
```


那么到目前为止，drop check和PhantomData到底又有什么关系呢？ 讲述一个Jon Gjengset 的例子<span class="wikilink wikilink--missing" title="未导入的页面">8</span>(#ref_8) 就明白了。

前面铺垫了那么多，现在思考一下，什么情况需要用到#[may_dangle]，一个例子是Box

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_093fb6232823.jpg)

Box<T> 的drop方法用到了#[may_dangle]   为什么呢？让我们尝试自己实现一个简单的MyBox

use std::ops::{Deref, DerefMut};

pub struct MyBoxT> {
    p: *mut T,

```text
}
```


implT> Drop for MyBoxT> {

```js
    fn drop(&mut self) {
        // 用指针p重装一个Box，Boxdrop时会自动释放p的内存
        let _ = unsafe {Box::from_raw(self.p)}; 
    }
}
```


implT> MyBoxT>{

```text
    pub fn new(t: T) -> Self {
        MyBox {
            p: Box::into_raw(Box::new(t)), // 用原来的Box来申请内存，获取指针
        }
    }
}
```


implT> Deref for MyBoxT> {

```text
    type Target = T;

    fn deref(&self) -> &Self::Target {
        unsafe {&*self.p}
    }
}
```


implT> DerefMut for MyBoxT> {

```js
    fn deref_mut(&mut self) -> &mut Self::Target {
        unsafe {&mut *self.p}
    }
}

fn main() {

    let x = 42;
    let b = MyBox::new(x);
    println!("{}", *b);
}
```


简易的MyBox如上所示，利用了原本的Box来管理内存。

看上去没有什么问题，但下面的代码会报错

```js
fn main() {

    let mut x = 42;
    let b = MyBox::new(&mut x);
    println!("{}", x); //cannot borrow `x` as immutable because it is also borrowed as mutable
}
```


因为MyBox有drop函数，会一直持有 x 的可变引用到其执行drop 函数，所以无法在中间用x的不可变引用打印值。但是，我们在MyBox的drop函数中并不会访问指针p的内容，只是将其drop掉了。这时候，就可以在MyBox的drop函数签名上加上 `#[may_dangle]`，编译器不再检查 `T` 。

unsafe impl#[may_dangle] T> Drop for MyBoxT> { // 开启#[may_dangle]，编译器不再检查T的生命周期问题

```js
    fn drop(&mut self) {
        let _ = unsafe {Box::from_raw(self.p)};
    }
}
```


然而，这样忽略 `T` 的所有行为，无论是访问`T`, 移动`T` 还是drop `T` ，编译器都不检查，又会产生新的如下问题 

```text
struct WrapperT: Debug>(T);
```


implT: Debug> Drop for WrapperT> {

```js
    fn drop(&mut self) {
        // Wrapper在drop时真的会访问 T 
        println!("wrapper access inner {:?}", self.0);
    }
}

fn main() {

    let mut x = 42;
    let wrapper = Wrapper(&mut x);
    let b = MyBox::new(wrapper);
    println!("{}", x);
}
```


在上面的代码中，我们新增了一个Wrapper结构，其在drop的时候真的会访问T，所以我们希望drop check能检查出 main 函数中的隐含错误: 变量 b 会在 main函数结束后执行MyBox::drop()，而MyBox又会隐式执行Wrapper::drop()，而在Wrapper::drop() 中会一直持有变量 x 的可变引用。因此我们希望 main 函数中不能成功打印 x 的值，否则违反borrow checker规则。但实际编译会发现，能编译成功，说明代码中还有问题。而这个问题就在于#[may_dangle]一下子把检查又放的太开了，我们只保证不会访问MyBox中的 T，并没有说不会drop T。(所以现在有关于修改#[may_dangle]的提案<span class="wikilink wikilink--missing" title="未导入的页面">9</span>(#ref_9))

现在如下的MyBox结构下

pub struct MyBoxT> {
    p: *mut T,

```text
}
```


unsafe impl#[may_dangle] T> Drop for MyBoxT> {

```js
    fn drop(&mut self) {
        let _ = unsafe {Box::from_raw(self.p)};
    }
}
```


根据drop checker规则，不会检查MyBox::drop() 中的T是否有效，同时，T不是其owned type，因为*mut T只是一个指针。但实际上，MyBox是包含 T 本身的，为了表达这个约定，本文的主角PhantomData终于又出场了，在MyBox中添加`_field: PhantomData` 即可让上面错误通过的代码编译失败。原因是根据drop checker规则， PhantomData 会让编译器认为 MyBox owns T，所以drop checker会检查T的drop 函数。

在这最后的场景，我们终于让 PhantomData 的作用就是和它的名字一样： 假装结构体有 T**。

### 4. 个人心得

语言是一步步发展的，在翻阅早期Rust RFC(2013年)的时候，会感叹那时候居然连xx都还没解决，但是回到现在看Rust已经完善非常多了，虽然现在对某些特征仍有争议，但相信Rust团队的智慧会让Rust越来越好.

另外，Rust的一些技巧确实要人教才行，最后关于PhantomData在drop check中的作用，除了Jon Gjengset的视频，在其他任何地方没有找到这么具体的例子，如果只看官方文档的规则说明一定是理解不了的。

### 参考

- [^](#ref_1_0)rust subtyping and variance https://doc.rust-lang.org/nomicon/subtyping.html
- [^](#ref_2_0)variance https://doc.rust-lang.org/reference/subtyping.html#variance
- [^](#ref_3_0)RFC-0738 https://rust-lang.github.io/rfcs/0738-variance.html
- [^](#ref_4_0)How values are dropped https://rustc-dev-guide.rust-lang.org/borrow_check/drop_check.html#how-values-are-dropped
- [^](#ref_5_0)drop check https://doc.rust-lang.org/std/ops/trait.Drop.html#drop-check
- [^](#ref_6_0)RFC-0769 https://rust-lang.github.io/rfcs/0769-sound-generic-drop.html
- [^](#ref_7_0)dropck_outlives https://rustc-dev-guide.rust-lang.org/borrow_check/drop_check.html#dropck_outlives
- [^](#ref_8_0)Crust of Rust: The Drop Check https://www.youtube.com/watch?v=TJOFSMpJdzg
- [^](#ref_9_0)improve #[may_dangle] for type parameters [https://github.com/rust-lang/rfcs/pull/3417](https://github.com/rust-lang/rfcs/pull/3417)
