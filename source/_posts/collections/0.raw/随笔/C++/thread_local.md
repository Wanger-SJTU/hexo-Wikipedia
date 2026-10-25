#cpp

很少并不是没有，最近就在考虑C++ thread_local关键字的运行时开销，它对executable和对动态链接库开销差别很大，对dll中定义的thread_local每次访问都会有额外的函数调用以及间接跳转，对cpu的流水线也很不友好，而这些都是我看了很多GNU文档、博客，对着满屏的反汇编分析了一两天又上gdb追踪了两三天才确定下来的...


C C++中ThreadLocal的实现方式 

### ThreadLocal实现原理

上面我们了解了ThreadLocal的作用，就是要保存每个线程自己的变量副本，每个线程都有一个自己的线程运行栈（是用户空间还是内核空间呢？待考察–），堆空间是所有线程共有的进程的用户空间。  
  
如果我们创建线程时用_beginthreadex函数的话，这个函数内部会为我们创建一个 \_tiddata 
结构，如果是我们可以将需要作为线程独立的变量放在这个区域，这就可以使用TlsGetValue来获取threadlocal变量。

  
我们来看看_beginthreadex的伪代码，其实这个函数的源码是可以看到的，

在VC的crt/src/Threadex.c中，这里的伪代码更加的结构更加清晰

https://spockwangs.github.io/blog/2017/12/01/thread-local-storage/

