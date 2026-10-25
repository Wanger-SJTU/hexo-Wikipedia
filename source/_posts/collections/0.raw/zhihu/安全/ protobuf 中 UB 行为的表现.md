---
title: (1 封私信) protobuf 中 UB 行为的表现
date: "2022-06-09 00:00:00"
updated: "2022-06-09 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/安全/protobuf-中-UB-行为的表现/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/526558967
---


最近遇到一个奇怪的问题，protobuf 解包偶发性失败。通过进一步定位发现，由于 bool 值在某些情形下没有被初始化，导致了此问题。
下面写了一个最小的 POC 来模拟此行为。

看如下例子：
hello.proto

`syntax = "proto2";

package helloworld;

message HelloRequest {
    required string name = 1;
    optional bool test_a = 2;
}
`

http://main.cc

`#include "hello.pb.h"
#include 

int main() {
  helloworld::HelloRequest request, tmp_request;
  request.set_name("world");

  bool a;
 // Just emulate the uninitialized bool value.
  *(char *)&a = 0xff; 
  request.set_test_a(a);

  std::string value;
  if (!request.SerializeToString(&value)) {
    std::cerr 

编译命令如下：

`$ cat build.sh
protoc -I=. --cpp_out=. ./hello.proto
echo "-O2:"
g++ -I. main.cc hello.pb.cc  -lprotobuf -g -O2 -o o2
./o2
echo "-O0:"
g++ -I. main.cc hello.pb.cc  -lprotobuf -g -O0 -o o0
./o0

$ ./build.sh
-O2:
000000: 0a 05 77 6f 72 6c 64 10 ff                       ..world..
Failed to parse the request.
-O0:
000000: 0a 05 77 6f 72 6c 64 10 01                       ..world..
[AFTER PARSE] name: "world" test_a: true
`

可以看到，修改编译优化到 O0，可以解析完成。

这个问题跟 protobuf 社区讨论过，他们认为，bool 值未初始化就作为右值是一个未定义行为(UB)。
我们一般理解为 bool 至少占用一个字节空间，所以这里即使设置 bool 值为 0xff，也是会当做 true 来处理的。
然而，protobuf 并不能处理这样的 bool 值。

从汇编角度来看：
-O2

`   0x0000000000403520 :   mov    %rsp,%rsi
   0x0000000000403523 :   lea    0x40(%rsp),%rdi
   0x0000000000403528 :   orl    $0x2,0x50(%rsp)
   0x000000000040352d :   movb   $0xff,0x60(%rsp)  :   mov    %rax,(%rsp)
   0x0000000000403536 :   movq   $0x0,0x8(%rsp)
   0x000000000040353f :   movb   $0x0,0x10(%rsp)
   0x0000000000403544 :   call   0x4030f0 
`

-O0

`(gdb) disas _ZN10helloworld12HelloRequest20_internal_set_test_aEb
Dump of assembler code for function _ZN10helloworld12HelloRequest20_internal_set_test_aEb:
   0x0000000000403a3a :     push   %rbp
   0x0000000000403a3b :     mov    %rsp,%rbp
   0x0000000000403a3e :     sub    $0x10,%rsp
   0x0000000000403a42 :     mov    %rdi,-0x8(%rbp)
   0x0000000000403a46 :    mov    %esi,%eax
   0x0000000000403a48 :    mov    %al,-0xc(%rbp)
   0x0000000000403a4b :    mov    -0x8(%rbp),%rax
   0x0000000000403a4f :    add    $0x10,%rax
   0x0000000000403a53 :    mov    $0x0,%esi
   0x0000000000403a58 :    mov    %rax,%rdi
   0x0000000000403a5b :    call   0x403bc6 
   0x0000000000403a60 :    mov    (%rax),%edx
   0x0000000000403a62 :    or     $0x2,%edx
   0x0000000000403a65 :    mov    %edx,(%rax)
   0x0000000000403a67 :    mov    -0x8(%rbp),%rax
   0x0000000000403a6b :    movzbl -0xc(%rbp),%edx
   0x0000000000403a6f :    mov    %dl,0x20(%rax)  

总之，bool 被当做一个字节来处理是编译器正常操作。这里可能是 protobuf 有额外的检查（必须 00 or 01）所致。

> 本文使用 [Zhihu On VSCode](https://zhuanlan.zhihu.com/p/106057556) 创作并发布
