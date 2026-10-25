---
title: Pytorch机制，源代码分析与内存管理调研
date: "2020-06-22 00:00:00"
updated: "2020-06-22 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/走向cs/Pytorch机制,源代码分析与内存管理调研/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/96879939
---


近期在完成一个关于Pytorch的内存管理相关的课程项目，之前也一直有想做一下关于Pytorch内部代码实现以及python和C/C++结合方式的研究，于是这次干脆就直接从Pytorch的release包到其GitHub源代码（这两者是不一样的请注意，前者已经编译好了C++相关代码到Lib目录下的dll文件和lib文件，主要用于Python端的调用；而后者则包含编译完成前的C/C++源码和Makefile等文件，适合研究其机理），一个个拆开看看其原理。

由于这次的研究对象主要是CPU端的内存问题，所以对于CUDA相关的内容并没有做进一步研究，不过文中也有大量内容可供参考。由于是需要提交的课程报告，所以正文是英语，还请轻喷英文表达hhh。另本文引用了一些博主的部分内容，所有引用源都在文末有注明，感谢你们！

另外，如果有需要，本文同时附带一个PPT，你可以在我的

个人网页www.miracleyoo.com//11/Pytorch-Core-Code-Research/

末尾找到它们。

### Pytorch Release Version Composition

The repository cloned from GitHub [pytorch/pytorch](https://link.zhihu.com/?target=https%3A//github.com/pytorch/pytorch) is different from the package we download using `pip install` or `conda install`. In fact, the former contains many C/C++ based files, which consist of the basics of Pytorch, while the latter is more concise and contains compiled libraries and dll files instead. 

Here, let's discuss the release version or the installed package at first. The package has a lot of components, Here I only pick out some most important parts to do the explanation.

**

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_36faf2bab129.jpg)

#### nn

All deep learning layers’ python entrance is located here. They mainly collect parameters from init input and do some modification to the input data. After that, it will send core computation operation together with parameters into `torch._C` based functions. 

#### autograd

It contains a series of base functions that serve for backpropagation. Also, if you dig in, the core implementation is still from C libraries. The variable wrap is also put here, but now it is just omitted because of the merge of tensor and Variable.

#### CUDA

Mainly these parts are contained in `cuda` folder: Stream, Event, Broadcast, and Random. 

- A CUDA stream is a linear sequence of execution that belongs to a specific device, independent from other streams. 
- CUDA events are synchronization markers that can be used to monitor the device's progress, to accurately measure timing, and to synchronize CUDA streams. 
- Broadcast-related functions mainly do the jobs to make sure operations run on different GPUs and gather correctly.

#### optim

`torch.optim` is a package implementing various optimization algorithms. Most commonly used methods are already supported, like `adam`, `sgd` and `adagrad`.

#### distributed

The `distributions` package contains parameterizable probability distributions and sampling functions. This allows the construction of stochastic computation graphs and stochastic gradient estimators for optimization.  

#### onnx

The `torch.onnx` module contains functions to export models into the ONNX IR format. These models can be loaded with the ONNX library and then converted to models that run on other deep learning frameworks.  

#### tensor

Most of the basic tensor classes defined here. It inherits a superclass from C lib, called `torch._C._TensorBase` . And it attaches a lot of methods like `register_hook`,`resize`, `norm` to tensor class. All these methods eventually call C based libraries.  

#### lib

The library where compiled C/C++ files located. There are `.dll` files as well as `.lib` files. According to the bug reports on google, I believe `.dll` files are specially compiled for the compatibility of windows and `.lib` can be used in Linux and some of them are also usable in Windows.(If you find a more accurate explanation, please tell me:) These files included: `_C.lib`, `c10.lib`, `torch.lib`, `c10_cuda.lib`. 

#### functional

Functions related to tensor operation are all located here. In fact, again, they are wrappers of functions from C libraries. You can find functions like `tensordot`, `unique`, `split` in this file.

#### utils

All kinds of utility codes are located here. This includes dataset related code `dataloader.py`, `dataset.py`, `sampler.py`, also include save and output related `checkpoint.py`. Some TensorBoard support can also be found here.

### How Pytorch manage its inner resource

#### What is Tensor

In mathematics, a tensor** is an algebraic object that describes a linear mapping from one set of algebraic objects to another. Objects that tensors may map between include, but are not limited to, vectors and scalars, and, recursively, even other tensors. The tensor is the central data structure in PyTorch.  It's an n-dimensional data structure containing some sort of scalar type, e.g., floats, ints, et cetera. We can think of a tensor as consisting of some data, and then some metadata describing the size of the tensor, the type of the elements in contains (dtype), what device the tensor lives on (CPU memory,  CUDA memory) 

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_708d8059507b.jpg)

What is tensorHow Tensor organizes

TH library is responsible for the computation, storage and memory management of Tensor. It divides the "Tensor" into two separate parts: Storage and Access/View. 

Storage: <strong>THStorage</strong>. It manages the way of storing the Tensor.

Access: <strong>THTensor</strong>. It provides access to the user.

**

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_24e855bbb861.jpg)

#### Data Storage

`typedef struct THStorage
{
 real *data;
 ptrdiff_t size;
 int refcount;
 char flag;
 THAllocator *allocator;
 void *allocatorContext;
 struct THStorage *view;
} THStorage;
`

- All of the "Tensor" in CPU is, in fact, a C pointer pointing to a data structure in memory like this. And it uses reference count to do memory management.
- refcount**: Here we apply the reference count method to do automatic garbage collection. When the reference number becomes 0, this struct will be freed automatically.

#### Data Access

`typedef struct THTensor
{
 long *size;
 long *stride;
 int nDimension;

 // Attention: storage->size might be bigger than the size of tensor.
 THStorage *storage;
 ptrdiff_t storageOffset;
 int refcount;

 char flag;

} THTensor;
`

- <strong>nDimension</strong>: The number of dimensions
- <strong>size</strong>: It contains the length information of all dimensions.
- <strong>refcount</strong>: Reference count 
- <strong>storage</strong>: Pointer of this data structure
- <strong>stride</strong>: The size of each dimension.

#### Memory Allocator

#### `/c10/core/Allocator.h`

`#include 

struct C10_API Allocator {
  virtual ~Allocator() = default;

  virtual DataPtr allocate(size_t n) const = 0;
  virtual DeleterFnPtr raw_deleter() const {
    return nullptr;
  }
  void* raw_allocate(size_t n) {
    auto dptr = allocate(n);
    AT_ASSERT(dptr.get() == dptr.get_context());
    return dptr.release_context();
  }
  void raw_deallocate(void* ptr) {
    auto d = raw_deleter();
    AT_ASSERT(d);
    d(ptr);
  }
};
`

The `allocate` function is directly included from head file `memory`.

#### `/aten/src/TH/THAllocator.cpp`

`at::DataPtr THMapAllocator::makeDataPtr(const char *filename, int flags, size_t size, size_t* actual_size_out) {
  auto* context = new THMapAllocator(filename, flags, size);
  if (actual_size_out) *actual_size_out = context->size();
  return {context->data(), context, &deleteTHMapAllocator, at::DeviceType::CPU};
}
`

** Default allocator is malloc/free allocator. malloc and realloc raise an error (using THError) on allocation failure.
 
#### Understand Parameters

It is hard and not straightforward enough to understand stride and storage offset, so let's borrow some images from ezyang, who is supposed to be an inner developer of Pytorch, to elaborate on this problem.

A tensor is a mathematical concept. But to represent it on our computers, we have to define some sort of physical representation for them. The most common representation is to lay out each element of the tensor contiguously in memory (that's where the term contiguous comes from), writing out each row to memory.

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_d80e0c0fbf78.jpg)

Please notice the relationship of sizes and strides. If we get a tensor with a size of (D,H,W) and this tensor is directly defined by users rather than a slice or result of some operation, the stride of it will be (H*W, W, 1). You can compare and draw a conclusion yourself. Each stride element in a certain dimension will be the product of all the following dimensions, and the stride of the last dimension will be 1. 

Physically, stride means how many blocks of memory computer need to skip to get to the starting position of the next corresponding dimension. And if we use a formula to compute the memory position of a $Tensor[i,j,k]$, it will be storageOffset + i * stride[0] + j * stride[1] + k * stride[2].

In the example image above, I've specified that the tensor contains 32-bit integers, so you can see that each integer lies in a physical address, each offset four bytes from each other. To remember what the actual dimensions of the tensor are, we have to also record what the sizes are as extra metadata. 

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_0077afd02dfa.jpg)

Then comes the memory offset. What does this mean? As we have mentioned before, tensor storage may support multiple tensor views, and if we sliced the first N elements, then we will start from the N+1 memory position. The following examples will give a further explanation.

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_e9f6b23482dc.jpg)

You can see in the left example, we start at the third element block, so that means we skip two-block, and here the offset is 2. Because of the slice, the two-dimensional tensor becomes one-dimensional tensor, and conjoint elements are continuous in physical storage, this means the strides is [1]. Size is the number of elements in this case and it is 2. 

In the right example, conjoint elements are not continuous, but they do start from the beginning, so the strides are [2] and offset is 0. There are still two elements in total so the sizes don't change.

What's more, if you still find it somehow difficult to understand, you may try this website to play with these parameters and see the dynamic process.

#### Tensor implementation dispatch

As we know, although in Python, you can use any type of data as you wish, as the interpreter will take care of the rest of the things. However, since the basic kernels are written in C/C++, functions from Python need to be dispatched into the same functions with different input and device types. To a C/C++ functions, a certain function cannot take in `int` and `float` Tensor as the same `X` at the same time, they need separate implementation.

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_b6c96f8ca79d.jpg)

#### How to dispatch

As we discussed above, the basic C/C++ implementation needs to dispatch according to data and device type. But in code, how to actually do this work?

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_853e060765bc.jpg)

There are basically three methods.

- Write these functions with different data and device types separately, and manually.
- Using a template function to build those dispatched functions in the compiling time. But this only works in C++, while many codes in Pytorch is still written in C.
- Apply the magic item -- Macro. By defining the function name as a Macro which takes in one or some parameters, like the data type name, we can compile this function in different types by `#define` and `#undef` multiple times, setting the variables in function name macro into various type name to compile the function into many copies which support different types.
Here's a simplified example:

#### File structure:

`.
├── add.c # Used to extend generic/add.c
├── add.h # Used to extend generic/add.h
├── general.h # Including other header files
└── generic
 ├── add.c # Definition of generic function add
 └── add.h # Definition of generic type Vector`

#### add.h

`// add.h
#include "general.h"
#define CONCAT_2_EXPAND(A, B) A ## B
#define CONCAT_2(A, B) CONCAT_2_EXPAND(A, B)
#define CONCAT_3_EXPAND(A, B, C) A ## B ## C
#define CONCAT_3(A, B, C) CONCAT_3_EXPAND(A, B, C)

#define Vector_(NAME) CONCAT_3(Num, Vector_, NAME)
#define Vector CONCAT_2(Num, Vector)

#define num float
#define Num Float
#include "generic/add.h"
#undef num
#undef Num

#define num double
#define Num Double
#include "generic/add.h"
#undef num
#undef Num`

#### add.c

`// add.c
#include "add.h"

#define num float
#define Num Float
#include "generic/add.c"
#undef num
#undef Num

#define num double
#define Num Double
#include "generic/add.c"
#undef num
#undef Num`

#### generic/add.h

`// generic/add.h

typedef struct Vector
{
num *data;
int n;
} Vector;

extern void Vector_(add)(Vector *C, Vector *A, Vector *B);`

#### generic/add.c

`// generic/add.c

void Vector_(add)(Vector *C, Vector *A, Vector *B)
{
int i, n;
n = C->n;
for(i=0;in;i++)
{
C->data[i] = A->data[i] + B->data[i];
}
}`

### An Example finding THStorage

I try to find the definition of THStorage, since it will give us a brief understanding of the file management structure of PyTorch, and we can also grab a basic idea of how those macros and includes are forming this huge project. We start from `torch/csrc/Storage.cpp`, and check step by step to the file included.

`Storage.cpp                 ->
#include           ->
#include    ->
#include    ->
#include 
`

Find the macro definition in `TH/generic/THStorage.h`:

`#define THStorage at::StorageImpl
`

Find the structure definition in `c10/core/StorageImpl.h`:

`namespace c10 {
struct C10_API StorageImpl final : public c10::intrusive_ptr_target {
...
private:
  caffe2::TypeMeta  data_type_;  // Data type
  DataPtr data_ptr_;             // Data pointer
  int64_t numel_;                // Data number
  bool resizable_;
  bool received_cuda_;
  Allocator* allocator_;         // Data's allocator
};
}
`

Therefore, the hidden real type of `THWStorage` is `at::StorageImpl`, and it is the implementation of data storage. Let's look into the definition of `THPStorage_(pynew)` at first, when the value of  `cdata` is not provided, it needs to create an implementation of class `THWStorage` using function `THWStorage_(NAME)`,  and the value of NAME can possibly be:

`new                // New a THStorage, if size not specified, size=0, that means using default Allocator
free
size
get
set
data
newWithSize        // New THStorage，specify size but use default Allocator
newWithAllocator   // New THStorage，specify size and Allocator
copy_functions
copyByte
...
copyCudaByte
...
`

And also some macro definitions:

`#define THWStorage_(NAME) THStorage_(NAME)     // torch/csrc/THP.h
#define THStorage_(NAME) TH_CONCAT_4(TH,Real,Storage_,NAME)   // TH/THStorageFunctions.h
`

The declaration of function `THStorage_(NAME)` lives in `TH/generic/THStorage.h`, `TH/generic/THStorageCopy.h` and the implementation part lies in corresponding cpp files.

(BTW, if using Cuda, the declaration of  `#define THWStorage_(NAME) THCStorage_(NAME)`lie in `THC/generic/THCStorage.h` and `THC/generic/THCStorageCopy.h`)

Take THStorage_(newWithSize) function as an example, look into `TH/generic/THStorage.cpp` and we can find the definition:

`THStorage* THStorage_(newWithSize)(ptrdiff_t size)
{
  THStorage* storage = c10::make_instrusiveat::StorageImpl>(
#ifdef THQUANTIZED
    caffe2::TypeMeta::Makequantized_t>(),
#else
    caffe2::TypeMeta::Makescalar_t>(),        // New a scalar_t type
#endif
    size,
    getTHDefaultAllocator(),
    true).release();
  return storage;
}
`

It's not hard to infer from this code block that it new a `StorageImpl`, and add an intrusive pointer pointing to one of them, at last return a pointer pointing to `StorageImpl` and destroy the intrusive pointer. Macro THStorage is `at::StorageImpl`, so this method simply new a `StorageImpl and return a pointer pointing to it. According to the definition of`c10::make_instrusive`, this work will actually be done by the constructor of StorageImpl' and it is:

`StorageImpl(
    caffe2::TypeMeta data_type,
    int64_4 numel,
    at::Allocator* allocator,
    bool resizable)
...
`

We will only trace here and this shows a representative example of how PyTorch inner code call and implement that method.

### Autograd

Autograd is a method that supports automatic computation of gradient which will be used in the backpropagation. Autograd depends directly on the computational graph. The computational graph is used for defining the pipeline of a model. It combines functions with variables and shows how they connect to each other.

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_2b7999a1576b.jpg)

A directed graph with the following property:

- Edge: a function, or a function's dependency
- Points with input edges: a function (or operator)
- Points with output edges: a variable
The computational graph has two major types, they are dynamic and static computational graphs. TensorFlow applies a static graph, it has the following characteristics:

- First, define the structure of the graph, and then assign values to the leaf nodes (this is the origin of placeholder)
- Then forward according to the assignment of leaf nodes 
Pytorch, on the other hand, utilizes a dynamic graph. The structure of the graph is established at the same time as the forward, so there is no need to use a placeholder.

Here is an example of the inner code of autograd. 

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_b03642d27914.jpg)

Here we will elaborate on these parameters which get involved in this process.

- Data<strong>: It’s the data a variable is holding.</strong> 
- requires_grad<strong>: This member, if true starts tracking all the operation history and forms a backward graph for gradient calculation.</strong> 
- grad:<strong>grad holds the value of gradient. If requires_grad is False it will hold a None value. Even if requires_grad is True, it will hold a None value unless .backward() function is called from some other node.</strong> 
- grad_fn:<strong>This is the backward function used to calculate the gradient.</strong> 
- is_leaf<strong>: A node is leaf if :</strong> 
-  It was initialized explicitly by some function like x = torch.tensor(1.0) or x = torch.randn(1, 1) (basically all the tensor initializing methods discussed at the beginning of this post).
 
-  It is created after operations on tensors which all have requires_grad = False.
 
-  It is created by calling .detach() method on some tensor.
 

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_44522fdf6202.jpg)

### Pytorch Source Code Composition

Since different data type, different devices are supported, and python code call C/C++ based code, the source code structure is not easy to understand. Here is the most important parts in the root directory.

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_10c6dcda94d3.jpg)

And provide a more detailed directory comment as well as explanation below.

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_1ed45ec64332.jpg)

#### Explanation of crucial folders

#### C10

C<strong>affe</strong>Ten**sor Library: Most basic tensor library. Codes here can be deployed to mobile devices as well as servers. It contains the core abstractions of PyTorch, including the actual implementations of the Tensor and Storage data structures.

#### ATen

<strong>A</strong> <strong>TEN</strong>sor library for C++11, the C++ tensor library for Pytorch. It is a C++ library that implements the <strong>operations</strong> of Tensors. If you're looking for where some kernel code lives, chances are it's in ATen. ATen itself bifurcates into two neighborhoods of operators: the "native" operators, which are modern, C++ implementations of operators, and the "legacy" operators (TH, THC, THNN, THCUNN), which are legacy, C implementations. The legacy operators are the bad part of town; try not to spend too much time there if you can. 

#### Caffe2

This part is from the original Caffe2. After the merge of Pytorch and Caffe2, Caffe2 become a kind of backend in Pytorch.

#### Torch

This is the part normally called by the user when then use Pytorch to train or test their models. It contains what you are most familiar with: the actual Python modules that you import and use. 

#### Torch/csrc

The C++ code that implements what you might call the frontend of PyTorch. In more descriptive terms, it implements the binding code that translates between the Python and C++ universe, and also some pretty important pieces of PyTorch, like the autograd engine and the JIT compiler. It also contains the C++ frontend code. 

#### The mechanism inside a simple call

**

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_89009a0ebd6c.jpg)

### Basic Condition of Memory Management in Pytorch

- Every tensor will be assigned with an allocator when it is initialized. 
- `c10/core/Allocator.h`: Pytorch default allocator class defined here.
Some Policy in `c10/core/Allocator.h`:

-  A DataPtr is a unique pointer (with an attached deleter and some context for the deleter) to some memory, which also records what device is for its data. nullptr DataPtrs can still have a nontrivial device; this allows us to treat zero-size allocations uniformly with non-zero allocations.
 
-  The choice of CPU here is arbitrary; if there's an "undefined" device, we could use that too.
 
-  The deleter can be changed while running using function `compare_exchange_deleter`.
 
-  This context is used to generate DataPtr which has arbitrary `std::function` deleters associated with them.  In some user-facing functions, we give a (user-friendly) interface for constructing tensors from external data which take an arbitrary `std::function` deleter.  Grep for InefficientStdFunctionContext to find these occurrences.
 
This context is inefficient because we have to do a dynamic allocation `InefficientStdFunctionContext`, on top of the dynamic allocation which is implied by `std::function` itself.

- There is a fake allocator in Aten(`aten/src/ATen/CPUFixedAllocator.h`), which just throws exceptions if some CPU fixed operation is actually used, like `cpu_fixed_malloc`, `cpu_fixed_realloc`, `cpu_fixed_free`.
- `c10/core/CPUAllocator.cpp` contains functions: `alloc_cpu`, `free_cpu`, `memset_junk`,  `alloc_cpu` even has the code dealing with NUMA machine. And there is a class `MemoryAllocationReporter` which is used to report C10's memory allocation and deallocation status.
- `c10/core/Allocator.cpp`: Set and get the allocator for the different device types.
`DeviceType::CPU
DeviceType::CUDA
DeviceType::OPENGL
DeviceType::OPENCL
DeviceType::MKLDNN
DeviceType::IDEEP
DeviceType::HIP
DeviceType::FPGA
DeviceType::MSNPU
DeviceType::XLA
`

- `c10/core/StorageImpl.h` & `c10/core/Storage.h`: Mainly allocates memory buffer using a given allocator and creates storage with it. Mark.
 
- `c10/cuda/CUDACachingAllocator.cpp` is a caching allocator for CUDA. It has the following description:
 
`Yet another caching allocator for CUDA device allocations.

 - Allocations are associated with a stream. Once freed, blocks can be
   re-allocated on the same stream, but not on any other stream.
 - The allocator attempts to find the smallest cached block that will fit the
   requested size. If the block is larger than the requested size, it may be
   split. If no block is found, the allocator will delegate to cudaMalloc.
 - If the cudaMalloc fails, the allocator will free all cached blocks that
   are not split and retry the allocation.
 - Large (>1MB) and small allocations are stored in separate pools.
   Small requests are packed into 2MB buffers. Large requests will use the
   smallest available free block or allocate a new block using cudaMalloc.
   To reduce fragmentation, requests between 1MB and 10MB will allocate and
   split a 20MB block, if no free block of sufficient size is available.

 With this allocator, allocations and frees should logically be considered
 "usages" of the memory segment associated with streams, just like kernel
 launches. The programmer must insert the proper synchronization if memory
 segments are used from multiple streams.

 The library provides a recordStream() function to help insert the correct
 synchronization when allocations are used on multiple streams. This will
 ensure that the block is not reused before each recorded stream completes
 work.`

### How Python interact with C/C++

#### Compile C program to .so library and call it in python

#### Compile as a shared library

- Finish writing your C code.
- Compile it into a `*.so` file.
- Import `ctypes` in the python file.
- Load `*.so` file inside a python file.
- *Define the input type of a C function.
- Call function inside the `*.so` file.
function.c**

`int myFunction(int num)
{
    if (num == 0){
        return 0;
    }
    else{
      if ((num & (num - 1)) == 0)
          return 1;
      else
          return 0;
    }
}`

<strong>Compile</strong>

`gcc -fPIC -shared -o libfun.so function.c`

<strong>function.py</strong>

`import ctypes 
NUM = 16      
fun = ctypes.CDLL(libfun.so)   
fun.myFunction.argtypes=[ctypes.c_int] 
returnVale = fun.myFunction(NUM)`

#### Add wrapper in C++ file

If this is a C++ file, you need to expose the function you want to use in an `extern "C"` wrapper.

`#include 

class Foo{
    public:
        void bar(){
            std::cout  "Hello"  std::endl;
        }
};
// Since ctypes can only talk to C functions, you need 
// to provide those declaring them as extern "C"

extern "C" {
    Foo* Foo_new(){ return new Foo(); }
    void Foo_bar(Foo* foo){ foo->bar(); }
}
`

And then compile:

`g++ -c -fPIC foo.cpp -o foo.o
g++ -shared -Wl,-install_name,libfoo.so -o libfoo.so  foo.o`

Afterward, things in Python code are similar as those in C.

`from ctypes import cdll
lib = cdll.LoadLibrary('./libfoo.so')

class Foo(object):
    def __init__(self):
        self.obj = lib.Foo_new()

    def bar(self):
        lib.Foo_bar(self.obj)
# Once you have that you can call it like

f = Foo()
f.bar() #and you will see "Hello" on the screen`

#### C++ file includes module and Expose

Include  the function in BOOST_PYTHON_MODULE

A C++ Function can be exposed to Python by writing a Boost.Python wrapper:

`#include **

char const* greet()
{
   return "hello, world";
}

BOOST_PYTHON_MODULE(hello_ext)
{
    using namespace boost::python;
    def("greet", greet);
}`

That's it. We're done. We can now build this as a shared library. The resulting DLL is now visible to Python. Here's a sample Python session:

`>>> import hello_ext
>>> print hello_ext.greet()
hello, world`

### Integrating a C++/CUDA Operation with PyTorch

When we want to build a customized method or module, we can choose whether to build it in python or C++. The former is easier but the C++ version is faster and more efficient, especially when we want to build a frequently used or time-consuming module. Here comes the explanation.

#### CPU Integration

Besides integrate the C++ file in python and use it in Pytorch, Pytorch itself provides us with two quite straightforward ways to finish this job. They are Building with `setuptools` and JIT Compiling Extensions.

For the “ahead of time” flavor, we build our C++ extension by writing a `setup.py` script that uses setuptools to compile our C++ code. For the LLTM, it looks as simple as this:

`from setuptools import setup, Extension
from torch.utils import cpp_extension

setup(name='lltm_cpp',
      ext_modules=[cpp_extension.CppExtension('lltm_cpp', ['lltm.cpp'])],
      cmdclass={'build_ext': cpp_extension.BuildExtension})`

The JIT compilation mechanism provides you with a way of compiling and loading your extensions on the fly by calling a simple function in PyTorch’s API called `torch.utils.cpp_extension.load()`. For the LLTM, this would look as simple as this:

`from torch.utils.cpp_extension import load

lltm_cpp = load(name="lltm_cpp", sources=["lltm.cpp"])`

#### CUDA Integration

The integration of our CUDA-enabled op with PyTorch is again very straightforward. If you want to write a `setup.py` script, it could look like this:

`from setuptools import setup
from torch.utils.cpp_extension import BuildExtension, CUDAExtension

setup(
    name='lltm',
    ext_modules=[
        CUDAExtension('lltm_cuda', [
            'lltm_cuda.cpp',
            'lltm_cuda_kernel.cu',
        ])
    ],
    cmdclass={
        'build_ext': BuildExtension
    })`

Instead of `CppExtension()`, we now use `CUDAExtension()`. We can just specify the `.cu` file along with the `.cpp` files – the library takes care of all the hassle this entails for you. The JIT mechanism is even simpler:

`from torch.utils.cpp_extension import load

lltm = load(name='lltm', sources=['lltm_cuda.cpp', 'lltm_cuda_kernel.cu'])`

### Conclusion

- Pytorch’s python part doesn’t have special care on memory management, which means it just works in the way standard python programs work.
- Current Pytorch source codes contain codes from multiple sources, some of them are pure legacy, some come from caffe2, some serves as basic code, some are packed into dlls to serve python. Also, codes are different for those in CPU and CUDA, we need to focus on the right part if any optimization wants to be made.
- Almost all Pytorch core modules and functions are implemented in C++ based code and that will be much more efficient. 
- Every tensor is attached with a memory allocator, which can not only do the work of allocating and free but also record the device on which it is located. Different kinds of allocators for different data types can be delivered as input parameter, this makes the code more compatible.
- Pytorch combines multiple code dispatch method and they work well for C and C++ code.
- Python can call compiled C file using ctypes, but Pytorch provides a toolset which makes it even easier.

### Reference

- PyTorch internals
- PyTorch Autograd
- PYTORCH DOCUMENTATION
- [PyTorch源码浅析](https://zhuanlan.zhihu.com/p/34629243)
- [Pytorch GitHub Repo](https://link.zhihu.com/?target=https%3A//github.com/pytorch/pytorch)
Zhongyang Zhang**
