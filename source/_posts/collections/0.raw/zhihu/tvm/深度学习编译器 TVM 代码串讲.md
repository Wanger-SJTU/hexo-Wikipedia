---
title: "深度学习编译器 TVM 代码串讲"
date: "2022-11-01 00:00:00"
updated: "2022-11-01 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/tvm/深度学习编译器-TVM-代码串讲-27aab6/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/446976730"
---


深度学习编译器 TVM 代码串讲

Will Zhang

机器学习框架开发者

收录于 · MLSys

489 人赞同了该文章

​目录

随着深度学习应用的攻城略地，存在越来越多的需求需要将深度学习模型在各种各样的设备上高效运行起来。不同的设备上存在不同的内存结构以及计算原语，传统的做法是在图层面做一些优化，并配合专家实现的在特定设备上的高性能算子完成任务。这当中比较知名的就是Nvidia TensorRT，而即使是付出了大量工作的TensorRT，在面临用户自定义算子或者非常见的网络结构时，其图层面的优化也被迫打了折扣。深度学习编译器则是有别于传统方法的新思路，本文将会从比较基础的东西开始，深入代码层面解读 TVM 这一有着极大影响力的编译器。

## 1. Overview


TVM是一个End2End的方案，接收来自Tensorflow/Pytorch等框架的 High Level 模型，转换为一个同样High Level的Graph IR，并对Graph IR进行Graph Level的优化得到优化后的Graph IR. 在Graph IR中的每个Operator则使用 TVM 定义的名为Tensor Expression的DSL来描述。Tensor Expression源于Halide中compute/schedule分离的思想，通俗地说，compute定义了算子的数学公式，schedule定义了如何把这个数学公式映射到硬件设备上。由于对特定的compute来说，其可能的schedule多种多样，于是TVM还存在一个基于机器学习的优化器负责找到最优的schedule. 确定schedule后，TVM就可以依据schedule生成Low Level的LLVM IR，之后就可以复用传统编译器的工作了。

## 2. Runtime

在深入比较复杂的编译流程之前，我们先了解编译的产物是什么，为此我们先解读 TVM Runtime. 

### 2.1 Runtime API

TVM 给 Runtime 设计了极其精简且稳定的 C API （定义于 include/tvm/runtime/c_runtime_api.h ）, 为了保持 API 的稳定，在头文件中隐藏了具体的类型信息，如下

```text
typedef void* TVMModuleHandle;
typedef void* TVMFunctionHandle;
typedef void* TVMRetValueHandle;
typedef void* TVMStreamHandle;
typedef void* TVMObjectHandle;
```


我们以 Python API 展示 Runtime 的运行示例

```python
import tvm
mod = tvm.runtime.load_module("compiled_artifact.so") # tvm.runtime.Module
arr = tvm.nd.array([1, 2, 3], device=tvm.cuda(0)) # tvm.runtime.NDArray
fun = mod["addone"] # tvm.runtime.PackedFunc
fun(a)
print(a.numpy())
```

由上面的代码我们可以解释一些概念，编译的产物称为tvm.runtime.Module, 可以从tvm.runtime.Module中根据名字查询到一个类型为PackedFunc的函数。关于PackedFunc后面会细讲，暂时把其理解为一个函数即可。

我们可以简单过一下 C API，里面的接口可以大致分为以下类别

- 对 runtime.Module 的文件导入导出，从 runtime.Module中根据名字查询PackedFunc
- 执行PackedFunc相关
- 对全局 name, PackedFunc 注册表的操作，包括插入删除PackedFunc等
- TVM Array（多维数组）相关
- TVM Object相关
- 对不同设备的公共抽象，Stream/内存分配/数据传输等
### 2.2 Object

对于类似 IR 这样的数据结构，天然就对其有 serialize/format/reflection 的需求，以往我们可以借助protobuf自动实现这些需求。在 TVM 中，额外还有 python binding/hash 等需求，于是 TVM 要求所有这样的数据结构继承自 Object 基类，并注册其内部所有成员，比如下面这个例子

```cpp
class TensorNode : public Object {
public:
  /*! \brief The shape of the tensor */
  Array Expr  shape;
  /*! \brief data type in the content of the tensor */
  Type dtype;
  /*! \brief the source operation, can be None */
  Operation op;
  /*! \brief the output index from source operation */
  int value_index{0};
  /*! \brief constructor */
  TensorNode() {}

  void VisitAttrs(AttrVisitor* v) final {
    v- Visit("shape",  shape);
    v- Visit("dtype",  dtype);
    v- Visit("op",  op);
    v- Visit("value_index",  value_index);
  }
};
```


这种方式的好处主要在于，不需要为新增的 Class 实现单独的 serialize/format/reflection/python binding/hash 等功能。在 include/tvm/runtime/object.h 中定义了 Object和 ObjectRef 两个类型，ObjectRef可以视为 shared_ptr Object 。

此外，继承自 Object 的类型需要注意几个变量，一个例子如下（可查阅include/tvm/ir/tensor_type.h）

```text
class Object {
  static constexpr const char* _type_key = "runtime.Object";
  static constexpr uint32_t _type_index = TypeIndex::kDynamic;
  uint32_t type_index_;
};
class TensorTypeNode : public Object {
  static constexpr const char* _type_key = "relay.TensorType";
};
```


新类型如TensorTypeNode需要声明_type_key 作为其名字，当使用make_object创建这个类型的对象时，如果该类型的 _type_index值为 TypeIndex::kDynamic，则会为该_type_key分配一个固定的_type_index，此后该类型所有对象的type_index_都被设置为_type_index。

在 Python 端的类型则需要使用register_object注册

@tvm._ffi.register_object("relay.TensorType")

```text
class TensorType(Type):
    ...
```

通过同样的type_key就可以将 C++ 与 Python 的类型匹配上，而设计 type_index 则是为了性能考虑。具体的两边类型匹配可以在 python/tvm/_ffi/_cython/object.pxi 查阅。

额外的 serialize/format/reflection/python binding/hash 等功能则实现在 node 目录下，有兴趣可自行查阅。

### 2.3 PackedFunc

TVM 中另一个与 Object 同样底层的机制称为 FFI (Foreign Function Interface), 这个机制的目标是为了使得任意语言下定义的函数都可以被任意其他语言调用。而这个可以被任意语言调用的函数称为 PackedFunc. 一个示例如下

```cpp
#include <tvm/runtime/packed_func.h>

void MyAdd(TVMArgs args, TVMRetValue* rv) {
  // automatically convert arguments to desired type.
  int a = args[0];
  int b = args[1];
  // automatically assign value return to rv
  *rv = a + b;
}

void CallPacked() {
  PackedFunc myadd = PackedFunc(MyAdd);
  // get back 3
  int c = myadd(1, 2);
}
```


可以看到MyAdd的类型信息被擦除了，也就是不限制输入输出的类型。类型擦除后，由于C++强大的template tricks，与普通函数的使用方式差别不是特别大。类型擦除后，不需要写额外的处理类型的胶水代码也能很方便地在Python这种动态语言中调用。下面是一个在C++中注册然后在Python中调用的例子（反过来也是可以的）

# c++
TVM_REGISTER_GLOBAL("myadd").set_body(MyAdd);

# python

```python
import tvm
myadd = tvm.get_global_func("myadd")
print(myadd(1, 2))
```

显而易见地，TVMArgs 和 TVMRetValue 只接受限定的类型，比如基本类型和一些TVM自定义的类型（包括PackedFunc这个类型）。

在 TVM Python 代码中，经常可以看到一些文件内容近乎为空，比如 python/tvm/relay/_build_module.py, 仅有下面两行代码

import tvm._ffi
tvm._ffi._init_api("relay.build_module", __name__)
其作用是把所有注册到Global的且名字前缀为"relay.build_module"的PackedFunc注册到当前Python Module, 从而让其他 Python 代码调用。

### 2.4 Module

编译的产物就称为Runtime.Module, 可以简单将其视为 name, PackedFunc 的哈希表，接口定义在 include/tvm/runtime/module.h中。对应多种硬件设备有多种实现，我们就选取cuda实现仔细过一遍。

CudaModule 定义在 src/runtime/cuda/cuda_module.cc 中，CudaModule接口中返回的PackedFunc则是CUfunction的一层封装。我们看核心的GetFunction 

PackedFunc CUDAModuleNode::GetFunction(const std::string  name,

```text
                                       const ObjectPtr Object   sptr_to_self) {
  ICHECK_EQ(sptr_to_self.get(), this);
  ICHECK_NE(name, symbol::tvm_module_main)    "Device function do not have main";
  if (name == symbol::tvm_prepare_global_barrier) {
    return PackedFunc(CUDAPrepGlobalBarrier(this, sptr_to_self));
  }
  auto it = fmap_.find(name);
  if (it == fmap_.end()) return PackedFunc();
  const FunctionInfo  info = it- second;
  CUDAWrappedFunc f;
  f.Init(this, sptr_to_self, name, info.arg_types.size(), info.launch_param_tags);
  return PackFuncVoidAddr(f, info.arg_types);
}
```


 逻辑比较简单，根据名字找到该CUfunction的描述信息FunctionInfo，而FunctionInfo中包含了launch_param_tags, 这里面含有kernel launch时需要的gridDim/blockDim/SharedMemorySize等信息，将上下文打包到CUDAWrappedFunc中。我们看一下CUDAWrappedFunc的执行

```cpp
  void operator()(TVMArgs args, TVMRetValue* rv, void** void_args) const {
    int device_id;
    CUDA_CALL(cudaGetDevice( device_id));
    if (fcache_[device_id] == nullptr) {
      fcache_[device_id] = m_- GetFunc(device_id, func_name_);
    }
    CUstream strm = static_cast CUstream (CUDAThreadEntry::ThreadLocal()- stream);
    ThreadWorkLoad wl = launch_param_config_.Extract(args);
    CUresult result = cuLaunchKernel(fcache_[device_id], wl.grid_dim(0), wl.grid_dim(1),
                                     wl.grid_dim(2), wl.block_dim(0), wl.block_dim(1),
                                     wl.block_dim(2), wl.dyn_shmem_size, strm, void_args, nullptr);
    if (result != CUDA_SUCCESS    result != CUDA_ERROR_DEINITIALIZED) {
      const char* msg;
      cuGetErrorName(result,  msg);
      std::ostringstream os;
      os    "CUDALaunch Error: "    msg    "\n"
            " grid=("    wl.grid_dim(0)    ","    wl.grid_dim(1)    ","    wl.grid_dim(2)    "), "
            " block=("    wl.block_dim(0)    ","    wl.block_dim(1)    ","    wl.block_dim(2)
            ")\n";
      std::string cuda = m_- GetSource("");
      if (cuda.length() != 0) {
        os    "// func_name="    func_name_    "\n"
              "// CUDA Source\n"
              "// -----------\n"
              cuda;
      }
      LOG(FATAL)    os.str();
    }
  }
```


可以看到CUDAWrappedFunc里面首先根据名字在CUDAModuleNode（内含CUmodule）中找到CUfunction然后根据launch_param_config_进行Launch.

## 3. Compilation Flow

在了解了 tvm runtime 之后，我们可以重新了解一下 TVM 的编译流程，大致步骤如下图

上图的最后一个环节即是我们已经充分了解过的 tvm runtime. TVM 中存在两种类型的 IR, 对应于图中的 high level 的 relay 和 low level 的 tir, 且两种 IR 都对应于同一个类型 IRModule. IRModule 与 relay.Function/tir.PrimFunc 的关系类似于 runtime.Module 与 PackedFunc 的关系，即 IRModule 会包含多个 relay.Function/tir.PrimFunc。统一的 IRModule 类型使得其可以同时含有 relay.Function 和 tir.PrimFunc, 为优化提供便利。

在这里可能有些同学会不了解 Graph 与 Function 的关系，实际上如果一个 IRModule 只有一个 Function，这个 Function 就对应于完整的 Graph, Function 中的每个语句对应于 Graph 的一个 Op. 如果有多个Function, 从一个入口的函数开始执行，中间可能有其他函数的调用，这样的过程也完整定义了一个Graph. 当然这样的说法并不严谨，但对于没有接触过 Function 概念的同学来说，暂时这样理解也没有问题。

## 4. IR

上一节中提到 relay 和 tir 都对应于 IRModule 这个统一的 Module 类型，自然也会有一套公共的 IR 基础设施。在 TVM 中这套基础设施实现在tvm/ir这个目录下，本节过一下这套基础设施的主要概念。

### 4.1 Type and Expr

如果将 IR 视为一种相对高级的编程语言，就会有两个关键的基础概念，类型 (Type) 和表达式 (Expr)。Type 包括基础的整型/浮点型等，也包括函数类型等相对复杂的类型。Expr 包括简单的定义一个字面值，也包括定义一个复杂的函数。先看 Type, 在include/tvm/type.h中定义了多个基础类型，其中，PrimType 是指可以直接映射到 low-level IR 的基本数据类型，代码如下

```text
/*!
 * \brief Primitive data types used in the low-level IR.
```

 *

```text
 * PrimType represents POD-values and handles that are
 * not automatically managed by the runtime.
```

 *
 * \sa PrimType
 */

```text
class PrimTypeNode : public TypeNode {
 public:
  /*!
   * \brief The corresponding dtype field.
   */
  runtime::DataType dtype;
```


再看 FuncType 也就是函数类型的代码实现

```text
/*!
 * \brief Function type.
```

 *

```text
 * We support polymorphic function type.
 * This can be roughly viewed as template function in C++.
```

 *
 * \sa FuncType, TypeVar, TypeConstraint
 */

```cpp
class FuncTypeNode : public TypeNode {
 public:
  /*! \brief type type of arguments */
  Array Type  arg_types;
  /*! \brief The type of return value. */
  Type ret_type;
  // The following fields are used in polymorphic(template) functions
  // For normal functions, the following two fields will be empty.
  /*! \brief The type parameters of the function */
  Array TypeVar  type_params;
  /*!
   * \brief potential constraint the type need to obey
   * \note this field is reserved for futher purposes.
   */
  Array TypeConstraint  type_constraints;
```


如代码所述，FuncType 类似于 C++ 中的模板函数类型，记录了函数参数类型/返回值类型/模板参数等信息。

了解了Type, 再看Expr, 而Expr 分为两类

- PrimExpr: 主要在 tir 模块中定义，可以相对直接地映射到 low-level code
- RelayExpr: 所有的非PrimExpr我们看一下 FloatImm 的代码实现来体会 Expr

```cpp
/*!
 * \brief Constant floating point literals in the program.
 * \sa FloatImm
```

 */

```text
class FloatImmNode : public PrimExprNode {
 public:
  /*! \brief The constant value content. */
  double value;
```


FloatImm 的意思是浮点数字面值表达式，所以其记录了一个 double 成员。

本节最后我们看一下 TensorType, 代码如下

```text
/*!
 * \brief This is the most commonly used type in relay.
 *  TensorType have a fixed dimension, data type.
```

 *

```text
 *  The elements of shape can be either IntImm(constant integer),
 *  or any symbolic integer expression.
 *  The symbolic integer allows generic shape inference in certain cases.
 * \sa TensorType
```

 */

```text
class TensorTypeNode : public BaseTensorTypeNode {
 public:
  /*!
   * \brief The shape of the tensor,
   *  represented by PrimExpr(tvm::Expr).
   */
  Array PrimExpr  shape;
  /*! \brief The content data type */
  DataType dtype;
```


需要注意，shape 也是类型的一部分，所以 TVM 中的类型推断的意思自然也包括了 shape 推断。

其他一些比较重要的 Type/Expr

- 函数表达式，也即relay.Function和tir.PrimFunc的共同基类 BaseFunc, 定义于include/tvm/ir/function.h 
- 量化相关的Type, 定义于 include/tvm/ir/affine_type.h 
- ADT 相关，定义于 include/tvm/ir/adt.h ，后文有专门章节深入，本节略过
### 4.2 Op

在 TVM 中，无论是 relay 还是 tir 的 op 都定义为一种 RelayExpr，如下

```text
/*!
 * \brief Primitive Op(builtin intrinsics)
```

 *

```text
 * This data structure stores the meta-data
 * about primitive operators that can be invoked via Call.
```

 *

```text
 * Low-level IR intrinsics(such as libc.expf) are also
 * implemented via Op.
```

 *
 * \sa Op
 */

```text
class OpNode : public RelayExprNode {
 public:
  /*! \brief name of the operator */
  String name;
  /*! \brief the type of the operator */
  mutable FuncType op_type;
  /*!
   * \brief detailed description of the operator
   *  This can be used to generate docstring automatically for the operator.
   */
  String description;
  /* \brief Information of input arguments to the operator */
  Array AttrFieldInfo  arguments;
  /*!
   * \brief The type key of the attribute field
   *  This can be empty, in which case it defaults to anything.
   */
  String attrs_type_key;
  /*!
   * \brief attribute type index,
   * this field varies in each run and is not exposed to frontend.
   */
  uint32_t attrs_type_index{0};
  /*!
   * \brief number of input arguments to the operator,
   * -1 means it is variable length
   */
  int32_t num_inputs = -1;
  /*!
   * \brief support level of the operator,
   *  The lower the more priority it contains.
   *  This is in analogies to BLAS levels.
   */
  int32_t support_level = 10;
```


代码中有些成员不太明白什么意思也没关系，接下来我们看个例子来加深理解。

首先我们看 Relay 中定义的 nn.bias_add, 第一步，先为其定义一个属性类型记录其所有属性，如下

```cpp
struct BiasAddAttrs : public tvm::AttrsNode BiasAddAttrs  {
  int axis;

  TVM_DECLARE_ATTRS(BiasAddAttrs, "relay.attrs.BiasAddAttrs") {
    TVM_ATTR_FIELD(axis).describe("The axis to add the bias").set_default(1);
  }
};
```


如代码所述，定义属性时还能规定默认值等，接着为其定义 type relation

```cpp
bool BiasAddRel(const Array Type   types, int num_inputs, const Attrs  attrs,
                const TypeReporter  reporter) {
  ICHECK_EQ(types.size(), 3);
  const auto* data = types[0].as TensorTypeNode ();
  if (data == nullptr) return false;

  const BiasAddAttrs* param = attrs.as BiasAddAttrs ();
  ICHECK(param != nullptr);
  int axis = param- axis;
  if (axis   0) {
    axis = data- shape.size() + axis;
  }
  if (axis  = static_cast int (data- shape.size()) || axis   0) {
    reporter- GetDiagCtx().EmitFatal(Diagnostic::Error(reporter- GetSpan())
                                        "The axis in bias_add must be in range for the shape; "
                                        "attempted to access index "    param- axis    " of "
                                        PrettyPrint(data- shape));
    return false;
  }

  // assign output type
  reporter- Assign(types[1], TensorType({data- shape[axis]}, data- dtype));
  reporter- Assign(types[2], types[0]);
  return true;
}
```


如代码所述，这是一个类型推断函数，根据0号Tensor输入和属性推断1号Tensor输入和2号输出的Type.

然后注册到全局表中

```text
RELAY_REGISTER_OP("nn.bias_add")
    .describe(R"code(Add bias to an axis of the input.
```


)code" TVM_ADD_FILELINE)

```text
    .set_attrs_type BiasAddAttrs ()
    .set_num_inputs(2)
    .add_argument("data", "nD Tensor", "Input data.")
    .add_argument("bias", "1D Tensor", "Bias.")
    .set_support_level(1)
    .add_type_rel("BiasAdd", BiasAddRel)
    .set_attr FTVMCompute ("FTVMCompute", [](const Attrs  attrs, const Array te::Tensor   inputs,
                                             const Type  out_type) {
      const auto* param = attrs.as BiasAddAttrs ();
      return tvm::Array tvm::te::Tensor {topi::nn::bias_add(inputs[0], inputs[1], param- axis)};
    });
```


此时我们可以与一开始的 OpNode 中的成员一一对应起来了，其中的name/description/num_inputs/arguments/support_level对应关系都比较直接，不再赘述。

这里要回忆起来 BiasAddAttrs 是一个 Object, 所以会有其 type key 和 type index，也就是 OpNode 中的成员 attrs_type_key 和 attrs_type_index 了。

此外对于 BiasAdd 还设置了一个名为 FTVMCompute 的额外属性描述其具体如何计算，这部分我们后面章节再深入，这里先略过。

注册完以后我们可以通过 FFI 机制暴露给 Python 端调用

```cpp
// Positional relay function to create dense operator used by frontend FFI.
Expr MakeBiasAdd(Expr data, Expr bias, int axis) {
  auto attrs = make_object BiasAddAttrs ();
  attrs- axis = axis;
  static const Op  op = Op::Get("nn.bias_add");
  return Call(op, {data, bias}, Attrs(attrs), {});
}
```


TVM_REGISTER_GLOBAL("relay.op.nn._make.bias_add").set_body_typed(MakeBiasAdd);

### 4.3 IRModule

IRModule 可以大致视为 BaseFunc 的集合，代码如下

```text
/*!
 * \brief IRModule that holds functions and type definitions.
```

 *
 *  IRModule is the basic unit for all IR transformations across the stack.
 *

```text
 *  Many operations require access to the global IRModule.
 *  We pass the IRModule by value in a functional style as an explicit argument,
 *  but we mutate the Module while optimizing programs.
 * \sa IRModule
```

 */

```text
class IRModuleNode : public Object {
 public:
  /*! \brief A map from ids to all global functions. */
  Map GlobalVar, BaseFunc  functions;
  /*! \brief A map from global type vars to ADT type data. */
  Map GlobalTypeVar, TypeData  type_definitions;
  /*! \brief The source map for the module. */
  parser::SourceMap source_map;
  /* \brief Additional attributes storing meta-data about the module. */
  DictAttrs attrs;
```


type_definitions 是 ADT 相关，我们在后文的 ADT 章节深入。

### 4.4 Pass

在2021年的今天，几乎所有人都知道 Pass 是什么，所以我也不多解释什么了。我们具体看看 TVM 相关的代码设计，首先看所有 Pass 的基类

```text
class PassNode : public Object {
 public:
  /*!
   * \brief Get the pass information/meta data. */
  virtual PassInfo Info() const = 0;

  /*!
   * \brief Transform mod using a functor under a given pass context.
   *
   * \param mod The module that an optimization pass runs on.
   * \param pass_ctx The pass context that can provide information for the optimization.
   *
   * \return The transformed module.
   */
  virtual IRModule operator()(IRModule mod, const PassContext  pass_ctx) const = 0;
```


可以看到，Pass主要做一个 IRModule to IRModule 的变换，符合一般意义上的 Pass 概念。我们需要注意两个类型，PassInfo与PassContext.

我们先看PassInfo, 每个具体的 Pass 实现都要提供 PassInfo 信息，如下

```cpp
class PassInfoNode : public Object {
 public:
  /*! \brief The minimal optimization level that this pass will be enabled. */
  int opt_level;

  /*! \brief The name of an optimization/analysis pass. */
  String name;

  /*! \brief The passes that are required to perform the current pass. */
  Array String  required;
```


可以看到，每个 Pass 实现需要使用字符串命名，并设定好依赖的前置 Pass，从而确定多个 Pass 的执行顺序。

再看 PassContext

```cpp
class PassContextNode : public Object {
 public:
  /*! \brief The default optimization level. */
  int opt_level{2};

  /*! \brief The list of required passes. */
  Array String  required_pass;
  /*! \brief The list of disabled passes. */
  Array String  disabled_pass;
  /*! \brief The diagnostic context. */
  mutable Optional DiagnosticContext  diag_ctx;
  /*! \brief Pass specific configurations. */
  Map String, ObjectRef  config;

  /*! \brief A list of pass instrument implementations. */
  Array instrument::PassInstrument  instruments;
```


顾名思义，是多个 Pass 执行过程中的共同上下文，大部分成员都很容易理解，关于PassInstrument我们后面再讲。

通过PassContext::Current()可以获得一个 thread local 的当前生效的 PassContext，也可以通过类似 Python With 的语法覆盖当前生效的 PassContext, 如下

```sql
auto new_ctx = PassContext::Create();
```

ctx- opt_level = 2;
With PassContext  scope(ctx);
// pass context in effect.

现在说回instruments，这是提供给开发者的一个工具，开发者可以实现一些函数运行在每个Pass的运行前后或者其他时机，这些函数打包到一起称为PassInstrument注册到PassContext中，如下

```cpp
class PassInstrumentNode : public Object {
 public:
  /*! \brief Name of this pass instrument object. */
  String name;

  /*! \brief Instrument when entering PassContext. Called once within a PassContext. */
  virtual void EnterPassContext() const = 0;

  /*! \brief Instrument when exiting PassContext. Called once within a PassContext. */
  virtual void ExitPassContext() const = 0;

  /*!
   * \brief Determine whether to run the pass or not. Called multiple times depend on number of
   *        passes.
   * \param mod The module that an optimization pass runs on.
   * \param info The pass information.
   *
   * \return true to run the pass; false to skip the pass.
   */
  virtual bool ShouldRun(const IRModule  mod, const transform::PassInfo  info) const = 0;

  /*!
   * \brief Instrument before pass run. Called multiple times depend on number of passes.
   * \param mod The module that an optimization pass runs on.
   * \param info The pass information.
   */
  virtual void RunBeforePass(const IRModule  mod, const transform::PassInfo  info) const = 0;

  /*!
   * \brief Instrument after pass run. Called multiple time depend on number of passes.
   * \param mod The module that an optimization pass runs on.
   * \param info The pass information.
   */
  virtual void RunAfterPass(const IRModule  mod, const transform::PassInfo  info) const = 0;
```


为了方便，TVM 中实现了三个类别的 Pass

首先看 Module-Level, 这个与原始 Pass 最接近，操作的就是 IRModule

```text
class ModulePassNode : PassNode {
  PassInfo pass_info;
  runtime::TypedPackedFunc Module(Module, PassContext)  pass_func;
  Module operator()(const Module  mod, const PassContext  pass_ctx) const final;
  // Other members/methods are omitted
};
```


然后看 Function-Level, 这个遍历 Module 中的Function进行处理

```text
class FunctionPassNode : PassNode {
  PassInfo pass_info;
  runtime::TypedPackedFunc Function(Function, Module, PassContext)  pass_func;
  Module operator()(const Module  mod, const PassContext  pass_ctx) const final;
  bool SkipFunction(const Function  func) const;
  // Other members/methods are omitted...
};
```


最后是 Sequential, 这个类似 pytorch 里面的 nn.Sequential, 包含了一堆可执行的Pass按照顺序执行

```text
class SequentialPassNode : PassNode {
  PassInfo pass_info;
  // Passes need to be executed.
  Array Pass  passes;
  bool PassEnabled(const PassInfo  info) const;
  Module operator()(const Module  mod, const PassContext  pass_ctx) const final;
};
```


声明：本文原创于知乎 Will Zhang , 未经本人同意，拒绝任何形式地转载。

## 5. Relay

在了解了 IR 的基础设计后，我们来看 TVM 中的 High Level IR, 也即 Relay 的细节。相比经典的基于 Graph 的 High Level IR, Relay 引入了不少函数式编程的概念，带来了强大的表达能力。

### 5.1 ADT

我们先了解 ADT 的概念, Algebraic data types (ADTs) 的概念来自函数式编程，简单来说，一个ADT定义含有多个构造函数，每个构造函数有不同的参数类型，每个ADT实例构造出来后只是简单地包含其构造时的所有参数值。下面是一个ADT定义的具体例子

# Defines an ADT named "Numbers"
data Numbers {
  Empty : () -  Numbers
  Single : (Tensor[(), int32]) -  Numbers
  Pair : (Tensor[(), int32], Tensor[(), int32]) -  Numbers

```text
}
```

# A Numbers value can be produced using an Empty, Single, or Pair
# constructor, each with a signature given above

```python
def @sum(%n : Numbers[]) -  Tensor[(), int32] {
   # The match expression branches on the constructor that was
   # used to produce %n. The variables in each case are bound
   # if the constructor matches that used for %n
   match(%n) {
     case Empty() { 0 }
     case Single(x) { x }
     case Pair(x, y) { x + y }
   }
}
```


@sum(Empty())    # evaluates to 0
@sum(Single(3))  # evaluates to 3
@sum(Pair(5, 6)) # evaluates to 11
因为特定的 ADT 通常有多个构造函数，所以经常需要根据构造函数来区分具体的 ADT 实例，于是就有对应的 Match 语法，如上面代码所示。

ADT 的定义可以带上类型参数，类似 C++ Template, 如下定义了一个类似 C++ std::optional 的 ADT

# a is a type parameter
data Optional a  {
  None : () -  Optional
  Some : (a) -  Optional

```text
}
```

Optional[type1] 和 Optional[Type2] 会被类型系统认为是两个类型，比如下面这个例子中，big 无法作为 inc_scalar 的参数。

# the signature for option indicates the type argument

```python
def @inc_scalar(%opt : Optional[Tensor[(), int32]]) -  Tensor[(), int32] {
  match(%opt) {
    case None() { 1 }
    case Some(%s) { %s + 1 }
  }
}

def @main() {
  let %one : Optional[Tensor[(), int32]] = Some(1);
  let %big : Optional[Tensor[(10, 10), float32]]
    = Some(Constant(1, (10, 10), float32));
  let %two = inc_scalar(%one);
  # let %bigger = inc_scalar(%big); # type system rejects
  # None does not take an argument so it can always implicitly
  # be given the correct type arguments
  let %z = inc_scalar(None());
  ()
}
```


类似上面代码中Optional[Tensor[(),int32]]这样传入一个类型参数返回一个类型的语法，称为 Type Call. 

ADT 支持递归定义，如下通过递归定义一个 List

data List T  {
   Nil : () -  List
   Cons : (T, List[T]) -  List

```text
}
```

我们可以很方便地对 List 进行求和，代码如下

```python
def @list_sum(%l : List[Tensor[(), int32]]) -  Tensor[(), int32] {
  match(%l) {
    case Nil() { 0 }
    # add the head of the list to the sum of the tail
    case Cons(%h, %t) { %h + @list_sum(%t) }
  }
}
```

从上面的代码可以看出，match 语法可以直接获得 ADT 实例的内容，也就是代码中的 %h 和 %t, 实际上，连 match 语法本身都是可以递归的，如下

```python
def @second_opt a (%ll : Optional[List[a]]) -  Optional[a] {
  match(%ll) {
    # we only need the second member of the list if there is one
    case Some(Cons(_, Cons(%s, _))) { Some(%s) }
    case _ { None() }
  }
}
```


# @second_opt(Some(Cons(1, Nil()))) evaluates to None()
# @second_opt(Some(Cons(1, Cons(2, Nil())))) evaluates to Some(2)
# @second_opt(Some(Nil())) evaluates to None()
# @second_opt(None()) evaluates to None()

关于 match 语法最后补充一点，match 语法会按照 case 顺序去匹配，匹配到第一个合法的case就会结束，后面的case不会再有匹配的机会。

接下来我们看 TVM 中与 ADT 对应的代码，首先看构造函数的 Expr

```text
/*!
 * \brief ADT constructor.
 * Constructors compare by pointer equality.
 * \sa Constructor
```

 */

```text
class ConstructorNode : public RelayExprNode {
 public:
  /*! \brief The name (only a hint) */
  String name_hint;
  /*! \brief Input to the constructor. */
  Array Type  inputs;
  /*! \brief The datatype the constructor will construct. */
  GlobalTypeVar belong_to;
  /*! \brief Index in the table of constructors (set when the type is registered). */
  mutable int32_t tag = -1;
```


belong_to 就对应于 List 这样的 ADT 定义的名字，具体的 ADT 类型如下

```text
/*! \brief TypeData container node */
class TypeDataNode : public TypeNode {
 public:
  /*!
   * \brief The header is simply the name of the ADT.
   * We adopt nominal typing for ADT definitions;
   * that is, differently-named ADT definitions with same constructors
   * have different types.
   */
  GlobalTypeVar header;
  /*! \brief The type variables (to allow for polymorphism). */
  Array TypeVar  type_vars;
  /*! \brief The constructors. */
  Array Constructor  constructors;
```


构造函数的 belong to 对应于这里的 header, 这里的 type vars就对应于前文提到的 ADT 的类型参数。在这里我们可以回忆 IRModule 的成员

```text
class IRModuleNode : public Object {
 public:
  /*! \brief A map from ids to all global functions. */
  Map GlobalVar, BaseFunc  functions;
  /*! \brief A map from global type vars to ADT type data. */
  Map GlobalTypeVar, TypeData  type_definitions;
  /*! \brief The source map for the module. */
  parser::SourceMap source_map;
  /* \brief Additional attributes storing meta-data about the module. */
  DictAttrs attrs;
```


注意所有的 ADT 定义（代码中的 type_definitions）都是作为 IRModule 的直接成员记录的。

前文提到的 type call 表达式，代码如下

```text
class TypeCallNode : public TypeNode {
 public:
  /*!
   * \brief The type-level function (ADT that takes type params).
   */
  Type func;
  /*! \brief The arguments. */
  Array Type  args;
```


接着我们过一下 Match 相关的 Expr, 首先我们看 Match 本身

```cpp
class MatchNode : public ExprNode {
 public:
  /*! \brief The input being deconstructed. */
  Expr data;

  /*! \brief The match node clauses. */
  tvm::Array Clause  clauses;

  /*! \brief Should this match be complete (cover all cases)?
   *  If yes, the type checker will generate an error if there are any missing cases.
   */
  bool complete;
```


Clause 就是前面的多个 Case, 我们看 Clause

```cpp
class ClauseNode : public Object {
 public:
  /*! \brief The pattern the clause matches. */
  Pattern lhs;
  /*! \brief The resulting value. */
  Expr rhs;
```


上面的例子中 Cons(%h,%t) 就对应 lhs, 例子中的 {%h + @list_sum(%t)} 就对应 rhs, 我们具体看 Pattern 

```text
/*! \brief Base type for declaring relay pattern. */
class PatternNode : public RelayNode {
 public:
  static constexpr const char* _type_key = "relay.Pattern";
  static constexpr const bool _type_has_method_sequal_reduce = true;
  static constexpr const bool _type_has_method_shash_reduce = true;
  TVM_DECLARE_BASE_OBJECT_INFO(PatternNode, Object);
};
```


可以看到 Pattern 本身只是一个基类，有多个具体实现 PatternWildcard/PatternVarNode/PatternConstructor/PatternTuple 对应不同的需求, 我们选取PatternConstructor来看

```text
class PatternConstructorNode : public PatternNode {
 public:
  /*! Constructor matched by the pattern. */
  Constructor constructor;
  /*! Sub-patterns to match against each input to the constructor. */
  tvm::Array Pattern  patterns;
```


可以看到里面又嵌套了其他 Pattern, 这也意味着对递归 Match 的支持。

最后，TVM 官方实现了一些 ADT 的常见操作作为标准库，实现在 python/tvm/relay/prelude.py, 有兴趣的同学可自行查阅。

### 5.2 Let Binding

Let Binding 这个概念也来自函数式编程，为了理解引入 Let Binding 的原因，我们先看下面这个例子

这是一个经典的计算图表达方式，唯一与传统不太一致的，就是使用 Function 来代替 Graph 的概念。在这个例子中，需要注意的是 add 的两个参数都是 1%，在 DAG 中出现了一个共享节点，我们假设 add 表达式的代码如下

```cpp
class Add : public Expr {
  Expr lhs;
  Expr rhs;
};
```


在上面的例子中，也就意味着 lhs 成员和 rhs 成员指向了同一个表达式。在传统的计算图模式中，我们会按照拓扑序求值，1% 只会计算一次。但是从做编译的角度来说，实现的 codegen 大概率是这样

auto Add::Codegen() {

```text
  auto lhs_val = lhs- Codegen();
  auto rhs_val = rhs- Codegen();
  return add(lhs_val, rhs_val);
}
```


也就意味着 log(%x)+log(%x) ，所以这里就出现了歧义，而为了能够保持和传统计算图的兼容，TVM 在打印 IR 到文本格式时，会为每个节点打印一行，并分配一个临时 id （也就是上面的%1, %2)，所以从文本格式看可能发现不了什么。为了解决歧义，TVM 引入了 Let Binding, 看下面这个例子

Let 表达式为 Let (var, value, body) , 其将value求值赋给var，然后返回body的求值结果，其对应的 IR/AST 称为 A-normal form，如上图，上面那个 Let 将 log(%x) 作为 value 求值赋给其 var（也就是 %v1），被 add 引用。通过这种方式，解决了歧义问题。

更简单地说，Let Binding 将表达式 Expr 绑定到局部的不可变 var 中。从代码实现角度，如果将传统计算图的方式称为 Graph Binding，与 Let Binding 对立的话。在 Graph Binding中，add 的 lhs 和 rhs 都直接指向了 log(%x) 这个计算表达式 Expr，而在 Let Binding 中，add 的 lhs 和 rhs 都指向了一个局部变量表达式，而这个局部变量表达式的值，由 Let 表达式负责赋值。我们可以看 Let 表达式的代码

```cpp
class LetNode : public ExprNode {
 protected:
  // LetNode uses own deleter to indirectly call non-recursive destructor
  Object::FDeleter saved_deleter_;
  static void Deleter_(Object* ptr);

 public:
  /*! \brief The variable we bind to */
  Var var;
  /*! \brief The value we bind var to */
  Expr value;
  /*! \brief The body of the let binding */
  Expr body;
```


事实上，Let Binding 的一个核心用途就是指定计算的Scope，我们看下面这个没有使用 Let Binding 的例子

如果看文本格式，我们会觉得 %1 应该在 if 表达式外计算，但看 AST/IR, 我们又迷惑了，在下面这个例子中，这个迷惑就更明显了

```x86asm
fn (%x) {
  %1 = log(%x)
  %2 = fn(%y) {
    add(%y, %1)
  }
  %2
}
```

我们应该在闭包的外面还是里面做 %1 的计算呢？而 Let Binding 解决了这个问题，我们只要加上 Let 就能解决这个歧义。

### 5.3 Expr

事实上，前面我们已经看了 ADT 和 Let Binding 相关的表达式，所以本小节简单过一下其他的表达式。首先我们明确 Relay 的基类 Expr 是 IR 公共模块的 RelayExpr

```text
namespace tvm {
namespace relay {

using Expr = tvm::RelayExpr;
```


对于 Constant/Tuple/TupleGetItem 这样比较简单的 Expr, 本文就不介绍了，有兴趣的同学可以阅读 include/tvm/relay/expr.h

首先我们看 var

```text
class VarNode : public ExprNode {
 public:
  /*!
   * \brief The unique identifier of the Var.
   *
   * vid will be preserved for the same Var during type inference
   * and other rewritings, while the VarNode might be recreated
   * to attach additional information.
   * This property can be used to keep track of parameter Var
   * information across passes.
   */
  Id vid;
  /*!
   * \brief type annotaion of the variable.
   * This field records user provided type annotation of the Var.
   * This field is optional and can be None.
   */
  Type type_annotation;
```


Id 可以简单理解为一个字符串，TVM 中的全局变量以 @ 开头，局部变量以 % 开头，这一点在前文也有体现。局部变量要么是函数参数，要么是 Let 表达式绑定的 immutable 变量。看下面这个例子，同样的名字可以创建两次，并且 IR 中会实际出现两个 Var 

```text
let %a = 1;
let %b = 2 * %a;  // %b = 2
let %a = %a + %a; // %a = 2. %a is shadowed
```

%a + %b           // has value 2 + 2 = 4

接下来我们看函数，这是前文提到的 BaseFunc 在 Relay 中的具体实现

```cpp
class FunctionNode : public BaseFuncNode {
 public:
  /*! \brief Function parameters */
  tvm::Array Var  params;
  /*!
   * \brief
   * The expression which represents the computation of the function,
   * the expression may reference the parameters, and the type of it
   * or sub-expressions may reference the type variables.
   */
  Expr body;
  /*! \brief User annotated return type of the function. */
  Type ret_type;
  /*!
   * \brief Type parameters of the function.
   *  Enables the function to vary its type based on these.
   *  This corresponds to template paramaters in c++'s terminology.
   *
   * \note This can be usually empty for non-polymorphic functions.
   */
  tvm::Array TypeVar  type_params;
```


再看Call，也就是调用

```cpp
class CallNode : public ExprNode {
 protected:
  // CallNode uses own deleter to indirectly call non-recursive destructor
  Object::FDeleter saved_deleter_;
  static void Deleter_(Object* ptr);

 public:
  /*!
   * \brief The operator(function) being invoked
   *
   *  - It can be tvm::Op which corresponds to the primitive operators.
   *  - It can also be user defined functions (Function, GlobalVar, Var).
   */
  Expr op;

  /*! \brief The arguments(inputs) of the call */
  tvm::Array relay::Expr  args;

  /*! \brief The additional attributes */
  Attrs attrs;

  /*!
   * \brief The type arguments passed to polymorphic(template) function.
   *
   * This is the advance feature that is only used when the function is
   * polymorphic. It is safe to be ignored in most cases. For example, in the
   * following code, the type_args of addone call is [int].
   *
   * \code
   *
   * template typename T 
   * T addone(T a) { return a + 1; }
   *
   * void main() {
   *   int x = addone int (10);
   * }
   *
   * \endcode
   */
  tvm::Array Type  type_args;
```


再看 if 语句表达式

```text
/*!
 * \brief Condition expression
```

 *

```text
 * Unlike traditional statement `if`s, the if evalutes
 * to the result of the branch taken.
```

 *

```js
 * let x = if (true) { 1 } else { 0 }; // x is 1
 * let y = if (false) { 1 } else { 0 }; // y is 0
```

 *
 * \note This is similar to C's ternary operator.
 */

```cpp
class If;
/*! \brief container of If */
class IfNode : public ExprNode {
 public:
  /*! \brief The condition */
  Expr cond;
  /*! \brief The expression evaluated when condition is true. */
  Expr true_branch;
  /*! \brief The expression evaluated when condition is false */
  Expr false_branch;
```


最后还有tempexpr, 这是为了给编写 Pass 提供方便

```text
/*!
 * \brief Base class of the temporary expression.
```

 *

```text
 * TempExprs are pass specific expression that can be
 * useful to define intermediate result in the
 * rewriting pass such as layout or type transformation.
```

 *

```text
 * Subclass TempExprNode allows us to pattern match on
 * specific kind of TempExpr and use them for expression rewriting.
```

 *
 * TempExpr should only be used within a pass,
 */

```text
class TempExprNode : public ExprNode {
 public:
  /*! \brief virtual destructor */
  virtual ~TempExprNode() {}
  /*!
   * \brief Convert the expression to a normal(non-temp) Expr.
   * \return The corresponding normal(non-temp) expression.
   */
  virtual Expr Realize() const = 0;
```


### 5.3 Op

Relay 的 Op 机制完全复用了前文提到的公共 IR 模块的 Op 机制，可以回顾一下，Op 就是一种 Expr. 在本节我们补充一些前文没有提到的细节。

我们知道 Relay Op 只是 High Level 表示，如何 Lower 呢，如前文所述需要定义其 compute/schedule. 暂时我们不去关心 compute/schedule 的内容，我们先看 TVM 中如何为每个 Relay Op 注册其 compute/schedule. 

TVM 中没有为每个 Relay Op 注册其 compute/schedule, 而是注册 fcompute/fschedule, 也就是根据 attr/inputs 等信息生成对应的 compute/schedule 的函数，这样的  fcompute + fschedule 组合称为 OpImplementation 如下

```cpp
class OpImplementationNode : public Object {
 public:
  /*! \brief Compute function */
  FTVMCompute fcompute;
  /*! \brief Schedule function */
  FTVMSchedule fschedule;
  /*! \brief Name of the implementation */
  String name;
  /*! \brief Priority level */
  int plevel;
```


由于特定的 OpImplementation 可能需要特定的条件，所以又按照条件进行了分组，每一组称为 OpSpecialization

```text
class OpSpecializationNode : public Object {
 public:
  /*! \brief List of implementations. */
  Array OpImplementation  implementations;
  /*! \brief Condition to enable the specialization.
   *    Could be undefined to represent generic case. */
  te::SpecializedCondition condition;
```


最后使用一个 OpStrategy 对象记录这个 Relay Op 的所有 OpImplementation 

```cpp
class OpStrategyNode : public Object {
 public:
  /*! \brief List of operator specializations. */
  Array OpSpecialization  specializations;

  void VisitAttrs(tvm::AttrVisitor* v) { v- Visit("specializations",  specializations); }

  static constexpr const char* _type_key = "relay.OpStrategy";
  TVM_DECLARE_FINAL_OBJECT_INFO(OpStrategyNode, ExprNode);
};

/*!
 * \brief Operator strategy class.
```

 */

```cpp
class OpStrategy : public ObjectRef {
 public:
  /*!
   * \brief Add an implementation.
   * \param fcompute Compute function
   * \param fschedule Schedule function
   * \param name Name of the implementation
   * \param plevel Priority level of the implementation
   */
  TVM_DLL void AddImplementation(FTVMCompute fcompute, FTVMSchedule fschedule, String name,
                                 int plevel);
```


AddImplementation 函数通过 FFI 机制暴露给 Python，Relay Op 大部分都是在 Python 端注册其 Strategy.

为了理解 Python 端的注册逻辑，我们先看一下 Python 端的一个机制如下

```python
      import tvm
      # wrap function as target generic
      @tvm.target.override_native_generic_func("my_func")
      def my_func(a):
          return a + 1
      # register specialization of my_func under target cuda
      @my_func.register("cuda")
      def my_func_cuda(a):
          return a + 2
      # displays 3, because my_func is called
      print(my_func(2))
      # displays 4, because my_func_cuda is called
      with tvm.target.cuda():
          print(my_func(2))
```

可以看到，相当于对不同设备可以使用这种方式选择生效的函数，于是我们能看到 softmax 的注册如下

@override_native_generic_func("softmax_strategy")

```python
def softmax_strategy(attrs, inputs, out_type, target):
    """softmax generic strategy"""
    strategy = _op.OpStrategy()
    strategy.add_implementation(
        wrap_compute_softmax(topi.nn.softmax),
        wrap_topi_schedule(topi.generic.schedule_softmax),
        name="softmax.generic",
    )
    return strategy
```


@softmax_strategy.register(["cuda", "gpu"])

```python
def softmax_strategy_cuda(attrs, inputs, out_type, target):
    """softmax cuda strategy"""
    strategy = _op.OpStrategy()
    strategy.add_implementation(
        wrap_compute_softmax(topi.nn.softmax),
        wrap_topi_schedule(topi.cuda.schedule_softmax),
        name="softmax.cuda",
    )
    if target.kind.name == "cuda" and "cudnn" in target.libs:
        strategy.add_implementation(
            wrap_compute_softmax(topi.cuda.softmax_cudnn),
            wrap_topi_schedule(topi.cuda.schedule_softmax_cudnn),
            name="softmax.cudnn",
            plevel=15,
        )
    return strategy

reg.register_strategy("nn.softmax", strategy.softmax_strategy)
reg.register_pattern("nn.softmax", OpPattern.OUT_ELEMWISE_FUSABLE)
```

从代码中可以看到，除了 Strategy 还会注册其他属性用于后续优化，其他的属性读者可自行查阅代码，本文不再细究。

### 5.4 Pattern Match

TVM 定义了一套匹配语法便于 Pass 的编写，本小节简单看一下这套语法。首先看一个简单的匹配两个算子的例子

```python
def test_match_op_or():
    is_add_or_sub = is_op('add') | is_op('subtract')
    assert is_add_or_sub.match(relay.op.op.get("add"))
    assert is_add_or_sub.match(relay.op.op.get("subtract"))
```

再比如匹配一个 NHWC 格式的 conv2d

```python
def test_match_data_layout():
    is_conv2d = is_op('nn.conv2d')(wildcard(), wildcard()).has_attr({"data_layout": "NHWC"})
    x = relay.var('x')
    y = relay.var('y')
    assert not is_conv2d.match(relay.op.nn.conv2d(x, y))
```

再比如匹配一个 conv2d + biasadd + relu || conv2d + biasadd

```python
def test_match_optional():
    conv_node = is_op('nn.conv2d')(wildcard(), wildcard())
    bias_node = is_op('nn.bias_add')(conv_node, wildcard())
    pat = bias_node.optional(lambda x: is_op('nn.relu')(x))

    x = relay.var('x')
    y = relay.var('y')
    z = relay.var('z')
    conv2d = relay.op.nn.conv2d(x, y)
    bias = relay.op.nn.bias_add(conv2d, z)
    assert pat.match(bias)
    relu = relay.op.nn.relu(bias)
    assert pat.match(relu)
```

接着看匹配一个菱形表达式

```python
def test_match_diamond():
    # Pattern
    is_conv2d = is_op('nn.conv2d')(is_var(), is_var())
    path1 = is_op('nn.relu')(is_conv2d)
    path2 = is_op('nn.leaky_relu')(is_conv2d)
    diamond = is_op('add')(path1, path2)
```


    # Expr

```text
    inp = relay.var('input')
    weight = relay.var('weight')
    conv2d = relay.op.nn.conv2d(inp, weight)
    relu = relay.op.nn.relu(conv2d)
    leaky_relu = relay.op.nn.leaky_relu(conv2d, alpha=0)
    out = relu + leaky_relu
```


    # Check
    assert diamond.match(out)
同样的菱形表达式也可以用支配关系来描述，如下

```python
def test_match_dom_diamond():
    # Pattern
    is_conv2d = is_op('nn.conv2d')(is_var(), is_var())
    reduction = is_op('add')(wildcard(), wildcard())
    diamond = dominates(is_conv2d, is_elemwise, reduction)
```


    # Expr

```text
    inp = relay.var('input')
    weight = relay.var('weight')
    conv2d = relay.op.nn.conv2d(inp, weight)
    relu = relay.op.nn.relu(conv2d)
    leaky_relu = relay.op.nn.leaky_relu(conv2d, alpha=0)
    out = relu + leaky_relu
```


    # Check
    assert diamond.match(out)
dominates 的三个参数分别是 Parent Path Child, 表示child 支配了 parent. 所谓支配的意思就是，从 Parent 出发任意路径都必定最终走到 Child, 并且路径中的所有 Op 都与 Path 的要求匹配. 

了解了基本的匹配语法后，我们可以将匹配语法和 rewrite 这个变换结合起来，比如匹配的部分换成一个单独的算子，如下

```python
class BatchnormCallback(DFPatternCallback):
    # A callback class to rewrite the matched pattern to a batch_norm op.
    def __init__(self, require_type=False):
        super().__init__(require_type)
        self.x = wildcard()
        self.var = wildcard()
        self.mean = wildcard()
        self.beta = wildcard()
        self.gamma = wildcard()
        self.eps = wildcard()

        self.pattern = self.gamma * (self.x - self.mean)/is_op("sqrt")(self.var + self.eps) + self.beta

    def callback(self, pre, post, node_map):
        x = node_map[self.x][0]
        var = node_map[self.var][0]
        mean = node_map[self.mean][0]
        beta = node_map[self.beta][0]
        gamma = node_map[self.gamma][0]
        eps = node_map[self.eps][0]
        return relay.op.nn.batch_norm(x, gamma, beta, mean, var, epsilon = eps.data.numpy().item())[0]
```


    # A graph of arithmetic operators that are functional equivalent to batch_norm.

```python
    x = relay.var('x')
    var = relay.var('var')
    mean = relay.var('mean')
    beta = relay.var('beta')
    gamma = relay.var('gamma')
    BN = gamma * (x - mean)/relay.op.sqrt(var + relay.const(1e-5)) + beta

    from tvm.relay.dataflow_pattern import rewrite
    out = rewrite(BatchnormCallback(), BN)
    assert tvm.ir.structural_equal(out, relay.op.nn.batch_norm(x, gamma, beta, mean, var, epsilon = 1e-5)[0])
```

上面这个例子，将多个加减乘除算子合并为一个 batch_norm 算子，这种将匹配和 rewrite 结合起来的用法称为 Pattern Rewriting. 如果想更复杂一些，把匹配结果替换为一个单独的 Function 进行后续的操作，称为 Pattern Partitioning, 如下

# A pattern matching conv2d+relu.
pattern = is_op("nn.relu")(is_op("nn.conv2d")(wildcard(), wildcard()))

# A graph.

```python
x = relay.var('input')
w = relay.var('weight')
conv2d = relay.op.nn.conv2d(x, w)
relu = relay.op.nn.relu(conv2d)
print('relu')
```

# free_var %x: Tensor[(1, 3, 224, 224), float32]
# free_var %w: Tensor[(3, 3, 3, 3), float32]
# %0 = nn.conv2d(%x, %w, padding=[0, 0, 0, 0]) /* ty=Tensor[(1, 3, 222, 222), float32] */;
# free_var %b: Tensor[(3), float32]
# nn.bias_add(%0, %b) /* ty=Tensor[(1, 3, 222, 222), float32] */

# After partition.
print(pattern.partition(relu))
# free_var %x: Tensor[(1, 3, 224, 224), float32]
# free_var %w: Tensor[(3, 3, 3, 3), float32]
# free_var %b: Tensor[(3), float32]
# %1 = fn (%FunctionVar_0_0, %FunctionVar_0_1,
#          %FunctionVar_0_2, PartitionedFromPattern="nn.conv2d_nn.bias_add_") {
#   %0 = nn.conv2d(%FunctionVar_0_0, %FunctionVar_0_1, padding=[0, 0, 0, 0]);
#   nn.bias_add(%0, %FunctionVar_0_2)
# };
# %1(%x, %w, %b)
更多关于 Pattern Match 的用法可以参考官方文档，本文只选择了代表性的例子进行阐述，接下来看具体的代码。

首先，所有 Pattern 的基类

```text
/*!
 * \brief Base type of all dataflow patterns.
 * \sa DFPattern
```

 */

```text
class DFPatternNode : public Object {
 public:
  static constexpr const char* _type_key = "DFPatternNode";
  TVM_DECLARE_BASE_OBJECT_INFO(DFPatternNode, Object);
};
```


可以看到纯粹作为一个接口基类而已，接下来看 Dominator 作为例子

```text
class DominatorPatternNode : public DFPatternNode {
 public:
  /*! \brief The parent. */
  DFPattern parent;
  /*! \brief The path. */
  DFPattern path;
  /*! \brief The child. */
  DFPattern child;
```


记录了前文提到的 parent path child. 

与 Match/Rewrite/Partition 相关的 C++ 接口定义在 include/tvm/relay/dataflow_matcher.h, 有兴趣的同学可自行查阅实现

```text
/*!
 * \brief Determine if a pattern matches an expression
```

 *

```text
 * \param pattern The pattern to match
 * \param expr The expression to match
```

 *
 * \return Return true if the pattern and the expression match, return false otherwise.
 */

```text
bool MatchPattern(DFPattern pattern, Expr expr);

/*!
 * \brief Rewrite an expression based on some number of DFPatternCallbacks
```

 *

```text
 * \param callbacks An array of DFPatternCallback Nodes
 * \param expr The expression to rewrite
 * \param mod The module that associates with the expr
```

 *

```text
 * \return Return An Expr with every match of the pattern inside the callbacks rewritten by the
 * functions inside the callbacks
```

 */

```cpp
Expr RewritePatterns(Array DFPatternCallback  callbacks, Expr expr, IRModule mod = IRModule());

/*!
 * \brief Partition all matches of a DFPattern inside an Expr into separate Function calls
```

 *

```text
 * \param pattern The pattern to match
 * \param expr The expression to patition
 * \param attrs A set of parameter names and values to apply to the partitioned function
 * \param check A callback function for checking more complicated properties of the matched
 * expressions, returns true if the match is accepted and false otherwise
```

 *
 * \return Return the paritioned Expr.
 */

```cpp
Expr PartitionPattern(DFPattern pattern, Expr expr, Map String, ObjectRef  attrs, PackedFunc check);
```


### 5.5 AST Traversers

编写 Pass 时最常做的操作就是遍历 AST/IR，TVM为此设计了专门的工具。我们首先看一个基类 ExprFunctor 如下

```cpp
template  typename R, typename... Args 
class ExprFunctor R(const Expr  n, Args...)  {
 private:
  using TSelf = ExprFunctor R(const Expr  n, Args...) ;
  using FType = tvm::NodeFunctor R(const ObjectRef  n, TSelf* self, Args...) ;

 public:
  /*!
   * \brief Same as call.
   * \param n The expression node.
   * \param args Additional arguments.
   * \return The result of the call
   */
  R operator()(const Expr  n, Args... args) { return VisitExpr(n, std::forward Args (args)...); }
  /*!
   * \brief The functor call.
   * \param n The expression node.
   * \param args Additional arguments.
   * \return The result of the call
   */
  virtual R VisitExpr(const Expr  n, Args... args) {
    ICHECK(n.defined())    "Found null pointer node while traversing AST. The previous pass may "
                           "have generated invalid data.";
    static FType vtable = InitVTable();
    return vtable(n, this, std::forward Args (args)...);
  }
  // Functions that can be overriden by subclass
  virtual R VisitExpr_(const VarNode* op, Args... args) EXPR_FUNCTOR_DEFAULT;
  virtual R VisitExpr_(const FunctionNode* op, Args... args) EXPR_FUNCTOR_DEFAULT;
  ...
  virtual R VisitExpr_(const CallNode* op, Args... args) EXPR_FUNCTOR_DEFAULT;
```


如代码所述，其主要提供了 VisitExpr 这个接口，并根据 Expr 的具体类型转发到对应的 VisitExpr_ 。VisitExpr_ 则由派生类负责实现，当然从代码也可以看出，VisitExpr 本身也可以被 override 。

有了 ExprFunctor 里的转发机制，可以很容易实现一个遍历所有 Expr 的功能，比如 ExprVisitor

```cpp
class ExprVisitor : public ::tvm::relay::ExprFunctor void(const Expr  n)  {
 public:
  void VisitExpr(const Expr  expr) override;
  void VisitExpr_(const VarNode* op) override;
  void VisitExpr_(const FunctionNode* op) override;
  ...
  void VisitExpr_(const CallNode* op) override;

 protected:
  // Internal visiting counter
  std::unordered_map const Object*, size_t  visit_counter_;
};
```


我们以 IfNode 为例

```text
void ExprVisitor::VisitExpr_(const IfNode* op) {
  this- VisitSpan(op- span);
  this- VisitExpr(op- cond);
  this- VisitExpr(op- true_branch);
  this- VisitExpr(op- false_branch);
}
```


可以看到 VisitExpr_ 的实现又调用了 VisitExpr 来访问所有的子表达式。通过这种方式，ExprVisitor 提供的 VisitExpr 就可以递归访问所有的子表达式。需要注意 ExprVisitor 的实现对每个表达式都只会访问一次，通过一个内部计数器实现如下

```sql
void ExprVisitor::VisitExpr(const Expr  expr) {
  auto it = visit_counter_.find(expr.get());
  if (it != visit_counter_.end()) {
    ++it- second;
  } else {
    using TParent = ExprFunctor void(const Expr ) ;
    TParent::VisitExpr(expr);
    visit_counter_.insert({expr.get(), 1});
  }
}
```


很容易想到，如果 Expr 比较复杂，那么如此递归很容易 Stack Overflow. 为了解决这个问题，TVM 提供了 MixedModeVisitor 来实现和 ExprVisitor 一样的功能，但是避免了 Stack Overflow.

通常来说，对于 IR，除了读取，也有修改的需求，为此 TVM 提供了 ExprMutator ，同样继承了 ExprFunctor

```cpp
class ExprMutator : public ::tvm::relay::ExprFunctor Expr(const Expr )  {
 public:
  Expr Mutate(const Expr  expr) { return this- VisitExpr(expr); }
  Expr VisitExpr(const Expr  expr) override;
  Expr VisitExpr_(const VarNode* op) override;
  Expr VisitExpr_(const FunctionNode* op) override;
  ...
  Expr VisitExpr_(const CallNode* call_node) override;

 protected:
  /*! \brief Internal map used for memoization. */
  std::unordered_map Expr, Expr, ObjectPtrHash, ObjectPtrEqual  memo_;
};
```


注意 Mutate 只是 VisitExpr 的别名。ExprMutator 的 VisitExpr 会返回一个修改后的新 Expr, 我们看一下 VisitExpr 的实现

```cpp
Expr ExprMutator::VisitExpr(const Expr  expr) {
  auto it = this- memo_.find(expr);
  if (it != this- memo_.end()) {
    return it- second;
  } else {
    Expr new_expr = ExprFunctor::VisitExpr(expr);
    memo_[expr] = new_expr;
    return new_expr;
  }
}
```


如代码所述，内部会保存一个原 Expr 到新 Expr 的映射，同时也避免了多次访问同一个 Expr, 我们还是以 If 作为例子来看

```cpp
Expr ExprMutator::VisitExpr_(const IfNode* if_node) {
  auto cond = this- Mutate(if_node- cond);
  auto true_b = this- Mutate(if_node- true_branch);
  auto false_b = this- Mutate(if_node- false_branch);

  return WithFields(GetRef If (if_node), std::move(cond), std::move(true_b), std::move(false_b));
}
```


可以看到同样会递归子表达式，且返回一个新的表达式。与 MixedModeVisitor 一样也存在一个 MixedModeMutator 作为 ExprMutator 的替代来避免 Stack Overflow.

### 5.6 Fuse

Fuse 作为对性能影响最关键的一个 Pass, 本文会仔细过一遍 Fuse 的代码实现。

在做 Fuse 之前，TVM 对每个 Relay Op 注册了一个称为 TOpPattern 的属性如下

/*! \brief operator pattern used in graph fusion */
enum OpPatternKind {

```text
  // Elementwise operation
  kElemWise = 0,
  // Broadcasting operator, can always map output axis to the input in order.
  // for example :code:`out[i, ax1, j, ax2] = input[i, j]`.
  // Note that the axis need to be in order so transpose is not a bcast operator.
  kBroadcast = 1,
  // Injective operator, can always injectively map output axis to a single input axis.
  // All injective operator can still be safely fused to injective and reduction.
  kInjective = 2,
  // Communicative reduction operator.
  kCommReduce = 3,
  // Complex operation, can still fuse elemwise operations into its output.
  // but cannot chain another complex op
  kOutEWiseFusable = 4,
  // The pattern for tuple nodes. Can fuse into subsequent injective ops,
  // but treated specially
  kTuple = 7,
  // Opaque operation, cannot fuse anything.
  kOpaque = 8
};
```


如注释所述，OpPattern 基本描述了 TVM 的 Fuse 规则，比如 kOutEWiseFusable Op 只能融合后续的 kElemWise Op 。

对于 TVM 的 Fuse 来说，最大的实现层面的麻烦在于识别并融合下面这样的模式

            conv2d

```text
            /  |  \
           /   |   \
         op    op   op
          \    |    /
           \   |   /
          elemwise add
               |
```


但是从前文可以知道，elemwise add 是 conv2d 的后序支配节点，所以 TVM 的融合步骤大致为

- 构建 DAG
- 构建后序支配树，可以从中得到每个节点的支配节点
- 根据后序支配树的信息融合接下来代码，首先 Fuse 是一个 Function Level Pass, 如下

```cpp
Expr FuseOps(const Expr  expr, int fuse_opt_level, size_t max_fuse_depth, const IRModule  module) {
  return FuseMutator().Transform(expr, fuse_opt_level, max_fuse_depth);
}

namespace transform {

Pass FuseOps(int fuse_opt_level) {
  runtime::TypedPackedFunc Function(Function, IRModule, PassContext)  pass_func =
      [=](Function f, IRModule m, PassContext pc) {
        int opt_level = fuse_opt_level == -1 ? pc- opt_level : fuse_opt_level;
        auto max_fuse_depth = pc- GetConfig("relay.FuseOps.max_depth", Integer(kMaxFusedOps));
        return Downcast Function (FuseOps(f, opt_level, max_fuse_depth.value(), m));
      };
  return CreateFunctionPass(pass_func, 0, "FuseOps", {"InferType"});
}
```


可以看到主要逻辑落在 FuseMutator 中，其继承自上一节提到的 MixedModeMutator, 我们来看 Transform

```cpp
  Expr Transform(const Expr  body, int fuse_opt_level, size_t max_fuse_depth) {
    // setup the group map.
    auto graph = IndexedForwardGraph::Create( arena_, body);
    auto groups = GraphPartitioner( arena_, fuse_opt_level, max_fuse_depth).Partition(graph);
    for (size_t nid = 0; nid   graph.post_dfs_order.size(); ++nid) {
      ICHECK(graph.post_dfs_order[nid]- ref != nullptr);
      gmap_[graph.post_dfs_order[nid]- ref] = groups[nid];
    }
    // The following line can be used for debug.
    // this- DebugDumpGroup(body);
    return this- Mutate(body);
  }
```


如代码所述

- 建立 IndexedForwardGraph
- 将 graph 划分出多个 groups, 并记录信息到 gmap_ 中
- 根据 gmap_ 遍历 body 返回新表达式跟踪一下建立 IndexedForwardGraph 的流程会走到 IndexedForwardGraph::Creator 内如下代码，注意 IndexedForwardGraph::Creator 继承自上一节提到的 ExprVisitor

```cpp
  IndexedForwardGraph Prepare(const Expr  body) {
    this- Update(body, nullptr, kOpaque);
    this- VisitExpr(body);
    return std::move(graph_);
  }
```


第一句 Update 可以理解为往 graph 插入第一个节点，第二句遍历所有的子表达式，并在遍历过程中往 graph 插入新的节点/边。

我们先看 Update 的实现，我插入了一些注释

```cpp
  void Update(const Expr  node, IndexedForwardGraph::Node* parent, OpPatternKind pattern) {
    // graph 内维护一个 Expr 到 Graph::Node 的映射关系，所以这里取 Expr 的实际地址
    const tvm::Object* key = node.get();
    // 根据 Expr 找到对应的 Graph::Node, 使用 current 标识
    IndexedForwardGraph::Node* current;
    auto it = graph_.node_map.find(key);
    if (it != graph_.node_map.end()) {
      current = it- second;
    } else {
      current = arena_- make IndexedForwardGraph::Node ();
      graph_.node_map[key] = current;
    }
    if (parent != nullptr) {
      // 建立一条从 current 到 parent 的边作为 current 输出
      auto* link = arena_- make LinkNode IndexedForwardGraph::Edge   ();
      link- value.node = parent;
      link- value.pattern = pattern;
      current- outputs.Push(link);
    } else {
      current- extern_ref = true;
    }
  }
```


这里面 current 和 parent 的关系可以如此理解，比如 tuple 表达式有多个 field 子表达式，所以 tuple 是 field 的parent. 同时数据又是从 field 解析流向 parent 进行下一步解析，所以 parent 是 field 的输出。我们看一下对 Tuple 表达式的 VisitExpr_ 实现

```cpp
  void VisitExpr_(const TupleNode* op) final {
    ICHECK(graph_.node_map.count(op));
    Node* tuple_node = graph_.node_map.at(op);
    tuple_node- pattern = kTuple;
    for (const Expr  field : op- fields) {
      if (field- checked_type().as TensorTypeNode ()) {
        this- Update(field, tuple_node, kInjective);
      } else {
        this- Update(field, nullptr, kOpaque);
      }
    }
    ExprVisitor::VisitExpr_(op);
    this- AddNode(op);
  }
```


注意是先遍历 field 最后访问自己，所以是Post DFS，最后的 AddNode 记录了自身在 Post DFS 中的顺序，如下

```cpp
  void AddNode(const tvm::Object* key) {
    auto it = graph_.node_map.find(key);
    ICHECK(it != graph_.node_map.end())    "Cannot find node "    GetRef ObjectRef (key);
    IndexedForwardGraph::Node* node = it- second;
    ICHECK(node- ref == nullptr);
    node- ref = key;
    node- index = graph_.post_dfs_order.size();
    graph_.post_dfs_order.push_back(node);
  }
```


通过 Post DFS，我们成功建立了一个 IndexedForwardGraph

```cpp
class IndexedForwardGraph {
 public:
  struct Node;
  /*!
   * The forward edge in the dataflow graph.
   */
  struct Edge {
    /*! \brief The corresponding node */
    Node* node{nullptr};
    /*! \brief The respective pattern of this op */
    OpPatternKind pattern{kOpaque};
  };
  /*! \brief A node in the graph. */
  struct Node {
    /*! \brief weak reference to the corresponding edge. */
    const tvm::Object* ref{nullptr};
    /*! \brief The index of the node in topological order. */
    size_t index{0};
    /*! \brief Whether this node is referenced by external source */
    bool extern_ref{false};
    /*! \brief The general pattern in the node */
    OpPatternKind pattern{kOpaque};
    /*! \brief The outputs of the node. */
    LinkedList Edge  outputs;
  };
  /*! \brief The node map that maps node to graph */
  std::unordered_map const tvm::Object*, Node*  node_map;
  /*! \brief All the nodes in post DFS order */
  std::vector Node*  post_dfs_order;
```


建立 Graph 之后是切 group, 我们跟踪 GraphPartitioner 的代码

```cpp
std::vector GraphPartitioner::Group*  GraphPartitioner::Partition(
    const IndexedForwardGraph  graph) {
  this- InitGroups(graph);
  if (opt_level_ == 0) return std::move(groups_);
  // get post dominator tree
  auto post_dom_tree = DominatorTree::PostDom(arena_, graph);
  // run fusion algorithm.
  for (int phase = 0; phase   3; ++phase) {
    this- RunFuse(graph, post_dom_tree, phase);
  }
  return std::move(groups_);
}
```


如代码所述

- 初始化groups
- 建立支配树
- 融合groups我们先看初始化groups

```cpp
  void InitGroups(const IndexedForwardGraph  graph) {
    groups_.resize(graph.post_dfs_order.size());
    for (size_t nid = 0; nid   groups_.size(); ++nid) {
      const auto* graph_node = graph.post_dfs_order[nid];
      auto* group_node = arena_- make Group ();
      group_node- pattern = graph_node- pattern;
      group_node- root_ref = graph_node- ref;
      // set anchor ref if necessary.
      if (group_node- pattern == kOutEWiseFusable) {
        group_node- anchor_ref = graph_node- ref;
      }
      groups_[nid] = group_node;
    }
  }
```


可以看到，简单地把每个Node初始化为一个Group, 接着是建立支配树，我添加了注释，从 PostDom 开始

```text
  Node* GetNode(support::Arena* arena, IndexedForwardGraph::Node* gnode) {
    Node* tnode = arena- make Node ();
    tnode- gnode = gnode; // 记录 Graph 中对应的 node
    if (gnode- extern_ref) { // 没有支配节点，比如根节点
      tnode- depth = 1;
      tnode- parent = nullptr;
      tnode- pattern = kOpaque;
    } else {
      // find the LCAs of all outputs.
      OpPatternKind pattern = kElemWise;
      Node* parent = LeastCommonAncestor(gnode- outputs,  pattern); // 无环，所以 LCA 节点就是支配节点
      tnode- depth = parent ? parent- depth + 1 : 1;
      tnode- parent = parent;
      tnode- pattern = pattern;
    }
    return tnode;
  }
};
```


DominatorTree DominatorTree::PostDom(support::Arena* arena, const IndexedForwardGraph  graph) {

```cpp
  // 支配树的核心成员就是 nodes
  DominatorTree tree;
  tree.nodes.resize(graph.post_dfs_order.size(), nullptr);
  // reverse topo order
  for (size_t i = graph.post_dfs_order.size(); i != 0; --i) {
    size_t index = i - 1;
    // 按照拓扑序遍历，支配树的 nodes 与 graph 的 nodes 一一对应
    tree.nodes[index] = tree.GetNode(arena, graph.post_dfs_order[index]);
  }
  return tree;
}
```


最后，来看 RunFuse, 回忆一下在 Partition 函数中调用了 phase=0,1,2 的 RunFuse, 接着看代码

```cpp
  void RunFuse(const IndexedForwardGraph  graph, const DominatorTree  post_dom_tree, int phase) {
    for (size_t nid = 0; nid   groups_.size(); ++nid) {
      // the group of current node has been specified already.
      auto* graph_node = graph.post_dfs_order[nid];
      auto* dom_node = post_dom_tree.nodes[nid];
      Group* group_node = groups_[nid];
      ICHECK(group_node != nullptr);
      // no actions for opaque nodes
      if (group_node- pattern == kOpaque) continue;
      // no actions needed if the current node have no dominator
      if (dom_node- parent == nullptr) continue;
      ICHECK(!graph_node- extern_ref);
      size_t dom_parent_gindex = dom_node- parent- gnode- index;

      // refuse the fusion if too many ops are going to be fused together
      if (CountFusedNodesWithNewChild(graph_node, dom_node- parent- gnode)   max_fuse_depth_)
        continue;

      if (phase == 2) {
        // Fuse injective ops into intermediate tuples, if any
        if (group_node- pattern   kInjective) continue;
        Group* dom_parent_group = groups_[dom_parent_gindex];
        Group* dom_root_group = dom_parent_group- FindRoot();
        // If dom node group has a tuple as its root, we do not fuse tuple fields into it
        if (dom_root_group- pattern == kTuple) continue;
        if (dom_parent_group- pattern == kTuple    dom_root_group- pattern  = kInjective) {
          // Now we know the tuple has been fused into subsequent injective ops
          auto fcond = [](OpPatternKind kind, bool is_sink) { return kind  = kInjective; };
          // dom_root_group can also be tuple, as in inception layers
          // CheckPath is needed to avoid fusing two intermediate tuples
          if (CheckPath(graph_node, dom_node- parent- gnode, fcond)) {
            CommitFuse(graph_node, dom_node- parent- gnode);
          }
        }
        continue;
      }

      // Skip if current node is already fused to the parent.
      if (groups_[dom_parent_gindex] != nullptr   
          group_node- FindRoot() == groups_[dom_parent_gindex]- FindRoot()) {
        continue;
      }
      // Do not fuse into tuple for now
      if (groups_[dom_parent_gindex]- pattern == kTuple) continue;
      // Try to fuse current node to its post-dominator.
      if (group_node- pattern == kOutEWiseFusable) {
        if (phase != 0) continue;
        // Path for OutEWiseFusable: conv2d
        // Check if the dominator relation is elemwise.
        if (dom_node- parent != nullptr    dom_node- pattern == kElemWise) {
          ICHECK(dom_node- parent- gnode != nullptr);
          // The fuse can be executed if all the intermediate ops are still broadcast.
          auto fcond = [](OpPatternKind kind, bool is_sink) { return kind  = kBroadcast; };
          if (CheckPath(graph_node, dom_node- parent- gnode, fcond)) {
            CommitFuse(graph_node, dom_node- parent- gnode);
          }
        }
      } else if (group_node- pattern  = kBroadcast) {
        // Pre-condition: can only be fused to parent which is injective or reduction.
        if (dom_node- parent != nullptr   
            (dom_node- pattern  = kInjective || dom_node- pattern == kCommReduce)) {
          // Check if all the intermediate ops are still broadcast.
          // The final terminal node can already be fused to a OutEWiseFusable group.
          auto fcond = [](OpPatternKind kind, bool is_sink) {
            if (!is_sink) {
              // Elemwise, broadcast, and injective ops on the parallel branches
              // are allowed be fused to the elemwise/broadcast anchor.
              return kind  = kInjective;
            } else {
              return (kind  = kBroadcast || kind == kCommReduce || kind == kInjective ||
                      kind == kOutEWiseFusable);
            }
          };
          if (CheckPath(graph_node, dom_node- parent- gnode, fcond)) {
            CommitFuse(graph_node, dom_node- parent- gnode);
          }
        }
      } else if (group_node- pattern == kInjective || group_node- pattern == kTuple) {
        // defer injective fusion to second phase.
        // so conv2d always finishes fusing.
        if (phase != 1) continue;
        // Check if all path are injective.
        auto fcond = [](OpPatternKind kind, bool is_sink) { return kind  = kInjective; };
        if (CheckPath(graph_node, dom_node- parent- gnode, fcond)) {
          CommitFuse(graph_node, dom_node- parent- gnode);
        }
      } else {
        // do nothing.
        ICHECK(group_node- pattern == kCommReduce);
      }
    }
  }
```


这是一段比较长的代码，因为融合的规则基本写在这个函数内。我们主要关注 CommitFuse, 因为融合结果由它产出

```cpp
  /*!
   * \brief Merge the child group to the parent.
   * \param child The child group.
   * \param parent The parent group.
   */
  void MergeFromTo(Group* child, Group* parent) {
    child = child- FindRoot();
    parent = parent- FindRoot();
    if (child == parent) return;
    // update the number of nodes of the parent group
    parent- num_nodes += child- num_nodes;
    child- parent = parent;
    // update anchor ref and pattern
    if (child- anchor_ref != nullptr) {
      ICHECK(parent- anchor_ref == nullptr);
      parent- anchor_ref = child- anchor_ref;
      parent- pattern = CombinePattern(child- pattern, parent- pattern);
    }
  }
  // Internal implelementation of CommitFuse
  void CommitFuse_(IndexedForwardGraph::Node* src, IndexedForwardGraph::Node* sink, Group* target) {
    if (src == sink) return;
    if (visited_.count(src)) return;
    visited_.insert(src);
    Group* gnode = groups_[src- index];
    ICHECK(gnode != nullptr);
    // merge the current group to the parent if possible.
    MergeFromTo(gnode, target);
    for (auto link = src- outputs.head; link != nullptr; link = link- next) {
      CommitFuse_(link- value.node, sink, target);
    }
  }
```


可以看到最终走到 MergeFromTo 函数，这个函数里取了两个 group 的 root，再把 root 合并，代表着两个 group 的合并。看到这里我想起来了，这是并查集算法，再看 Group 的定义

```cpp
struct Group {
    /*! \brief The parent in the union find data structure. */
    Group* parent{nullptr};
    /*! \brief The pattern of the group */
    OpPatternKind pattern;
    /*! \brief reference to the root node. */
    const tvm::Object* root_ref{nullptr};
    /*!
     * \brief Reference to the anchor node,
     * this field is not nullptr only if pattern is kOutEWiseFusable.
     */
    const tvm::Object* anchor_ref{nullptr};
    /*!
     * \brief Find the group root, perform path compression
     * \return The root type node.
     */
    Group* FindRoot() {
      // fast path
      if (this- parent == nullptr) return this;
      // slow path with path compression.
      Group* root = this;
      while (root- parent != nullptr) {
        root = root- parent;
      }
      for (Group* p = this; p != root;) {
        Group* parent = p- parent;
        p- parent = root;
        p = parent;
      }
      return root;
    }

    /*!
     * \brief The number of nodes belonging to this group
     */
    uint32_t num_nodes{1};
  };
```


这个路径压缩，确实是并查集。至此，我们切好了 groups, 走到最终的 FuseMutator::Mutate 来生成新表达式了。跟踪 Mutate 会来到 Rewrite

```cpp
  Expr Rewrite_(const CallNode* call, const Expr  post) {
    if (call- op.as OpNode ()) {
      static auto fnoncomputational = Op::GetAttrMap TNonComputational ("TNonComputational");

      if (fnoncomputational.get(Downcast Op (call- op), false)) {
        return ExprMutator::VisitExpr_(call);
      }

      // If it is a primitive op call
      // then we must have a group assignment for it already.
      ICHECK(gmap_.count(call));
      if (call- op == stop_fusion_op) {
        return ExprMutator::VisitExpr(call- args[0]);
      }
      auto* ret_group = gmap_.at(call)- FindRoot();
      Array Expr  new_args = GetNewArguments(call- args, ret_group);

      auto new_call = Call(call- op, new_args, call- attrs, call- type_args, call- span);

      if (ret_group- root_ref == call) {
        // This is the root of the group
        // create the new call node.
        return MakeNewFunction(ret_group, call- checked_type(), new_call);
      } else {
        // This is an intermediate node of a fused function
        // simply return the new call.
        return std::move(new_call);
      }
    } else {
      return ExprMutator::VisitExpr_(call);
    }
  }
```


我们注意到碰到每个 group 的 root 时，会调用 MakeNewFunction, 代码如下

```cpp
  Expr MakeNewFunction(GraphPartitioner::Group* group, Type ret_type, Expr body) {
    ...
    const GroupInfo  ginfo = ginfo_[group];
    auto func = Function(ginfo.params, body, ret_type, {});
    func = WithAttr(std::move(func), attr::kPrimitive, tvm::Integer(visitor.has_call));
    // TODO(mbs): "reshape" cleanup.
    if (visitor.has_call    visitor.reshape_only) {
      func = WithAttr(std::move(func), attr::kReshapeOnly, tvm::Integer(visitor.reshape_only));
    }
    return Call(func, ginfo.arguments, Attrs());
  }
```


如代码所述，每个 group 都会变成一个新的带上 kPrimitive 属性的 relay.Function, 至此 Fuse Pass 的使命完成

## 6. Lower

了解了 Relay 的 IRModule 后，我们跟踪一下编译 Relay IRModule 的流程，事实上这里面细节特别多，因此本文只关注最关键的路径。来到 python/tvm/relay/build_module.py ，忽略非关键代码

```python
def build(
    ir_mod,
    target=None,
    target_host=None,
    executor=Executor("graph"),
    runtime=Runtime("cpp"),
    params=None,
    mod_name="default",
```

):
    ...

```text
    # If current dispatch context is fallback context (the default root context),
    # then load pre-tuned parameters from TopHub
    if isinstance(autotvm.DispatchContext.current, autotvm.FallbackContext):
        tophub_context = autotvm.tophub.context(list(target.values()))
    else:
        tophub_context = autotvm.utils.EmptyContext()
```


    with tophub_context:

```text
        bld_mod = BuildModule()
        graph_json, runtime_mod, params = bld_mod.build(
            mod=ir_mod,
            target=target,
            params=params,
            executor=executor,
            runtime=runtime,
            mod_name=mod_name,
        )
        ...
```

我们在一开始提到，TVM 存在一个模块用于寻找最优的 Schedule, 更准确来说细分为两种方法，也就是 AutoTVM 和 Ansor. 关于 Ansor 我们可以另起一篇新文了，所以本文暂不涉及。AutoTVM 依赖于提前写好的 Schedule 模板，AutoTVM 通过 Tuning 寻找这个模板的最优参数。为了降低用户使用门槛，很容易想到将最优参数提前存储起来，需要的时候下载下来直接使用，也就对应于上述代码中的 tophub.

继续追踪 build 会走到 src/relay/backend/http://build_module.cc 的 RelayBuildModule::BuildRelay, 这个函数比较长，忽略非关键代码，并添加注释

```cpp
  void BuildRelay(IRModule relay_module, const String  mod_name) {
    // 应用 High Level Pass, 包括前文提到的 FuseOps
    relay_module = OptimizeImpl(std::move(relay_module));
```


    ...

```text
    // 从 Relay 下降到 TIR
    executor_codegen_ = MakeExecutorCodegen(executor_- name);
    executor_codegen_- Init(nullptr, config_- legacy_target_map);
    executor_codegen_- Codegen(func_module, func, mod_name);
    executor_codegen_- UpdateOutput( ret_);
    ret_.params = executor_codegen_- GetParams();

    auto lowered_funcs = executor_codegen_- GetIRModule();
```


    ...

```text
    if (lowered_funcs.size() == 0) {
      ...
    } else {
      // 编译 TIR 到 runtime.Module
      ret_.mod = tvm::build(lowered_funcs, host_target);
    }
```


    ...

```text
  }
```


Executor 有两种实现，本文关注默认的 GraphExecutor, 代码中主要通过 codegen 这个步骤完成 IR 下降。中间经过多次封装调用，核心的逻辑落在 GraphExecutorCodegen::Codegen ，这个函数比较长，忽略非关键代码

```text
  LoweredOutput Codegen(IRModule mod, relay::Function func, String mod_name) {
    ...

    IRModule lowered_mod = tec::LowerTEPass(
        mod_name_,
        [this](BaseFunc func) {
          // We need to maintain the constant map for external
          // functions so we pass this processing function which
          // allows us to process each function as we lower it.
          if (func- GetAttr String (attr::kCompiler).defined()) {
            UpdateConstants(func,  params_);
          }

          // TODO(@areusch, @jroesch): We should refactor this to
          // execute as a further pass, instead writing data to the
          // lowering process directly.
          tec::UpdateFunctionMetadata(func, this- function_metadata_);
        },
        config- host_virtual_device)(mod);
```


    ...

```cpp
    Function lowered_main_func = Downcast Function (lowered_mod- Lookup("main"));

    // Now that we have lowered all operators to TIR code, we can proceed with compilation.
    //
    // We need to unfortunately re-plan as the previous results have been invalidated by lowering
    // we will fix this in future refactors.
    memory_plan_ = GraphPlanMemory(lowered_main_func);

    // The graph planner also can not handle planning calls to global variables to we must remap

    // First we convert all the parameters into input nodes.
    for (auto param : lowered_main_func- params) {
      auto node_ptr = GraphInputNode::make_node_ptr(param- name_hint(), GraphAttrs());
      var_map_[param.get()] = AddNode(node_ptr, param);
    }

    heads_ = VisitExpr(lowered_main_func- body);
    ...
  }
```


代码主要有两个部分，一个是 LowerTEPass 下降到 TIR，一个是 MemoryPlan. 本文不关注 MemoryPlan ，继续追踪 LowerTEPass 走到 LowerTE

```cpp
IRModule LowerTE(const IRModule  module, const String  module_name, ProcessFn process_fn,
                 VirtualDevice host_virtual_device) {
  TECompiler compiler(module);

  // Lower all the callees in module:
  //  - Functions tagged with "Compiler" are unchanged (checked by CreateFunctionPass)
  //  - Functions tagged with "Primitive" are unchanged (checked by LowerTensorExprMutator)
  //  - Called functions tagged with "Compiler" are copied into the compiler cache with a fresh
  //    GlobalVar, and calls updated (sticking with regular Relay Call).
  //  - Calls to functions tagged with "Primitive" are compiled to PrimFuncs, and calls updated
  //    (using call_lowered convention).
  IRModule updated_module = LowerTensorExpr(module_name, compiler, std::move(process_fn),
                                            std::move(host_virtual_device))(module);

  // The Functions tagged with "Compiler" are now residing in the cache ready to be
  // compiled by LowerExternalFunctions. However we still need a record of them in the
  // IRModule so that the various executors can see which function names need to be
  // retrieved. They may, however, have been renamed.
  compiler- AddExterns(updated_module);

  // Add the lowered functions.
  IRModule lowered_module = compiler- GetLoweredFunctions();
  ...
  for (const auto  kv : lowered_module- functions) {
    ...
    updated_module- Add(kv.first, kv.second);
  }

  // Invoke external codegen for all Functions in the cache tagged with "Compiler", and
  // annotate the module with the resulting runtime modules.
  Array runtime::Module  external_mods =
      module- GetAttr Array runtime::Module  ("external_mods", Array runtime::Module ()).value();
  Array runtime::Module  new_external_mods = compiler- LowerExternalFunctions();
```


  ...

```cpp
  updated_module = WithAttrs(updated_module, {{"external_mods", std::move(external_mods)},
                                              {"device_contexts", std::move(device_contexts)}});
```


  ...

```text
  return updated_module;
}
```


主要为以下逻辑

- LowerTensorExpr 
- 把带 Compiler 标记且会被调用的 Function 记录到 Cache 中，使用新 GlobalVar 标识，并把对其的调用更新，注意更新后仍然是 Relay Call
- 把带 Primitive 标记且会被调用的 Function 编译为 tir.PrimFunc, 并更新对其的调用，注意更新后不再是 Relay Call
- LowerExternalFunctions 把 Cache 中带 Compiler 标记的 Function 使用外部工具编译本文不关注 Compiler 标记的函数，所以继续追踪 LowerTensorExpr

```text
Pass LowerTensorExpr(const String  module_name, TECompiler compiler, ProcessFn process_fn,
                     VirtualDevice host_virtual_device) {
  runtime::TypedPackedFunc Function(Function, IRModule, PassContext)  pass_func =
      [=](Function func, IRModule module, PassContext ctx) {
        LowerTensorExprMutator lower_te(module, process_fn, module_name, compiler,
                                        host_virtual_device);
        return Downcast Function (lower_te.Mutate(func));
      };
  return CreateFunctionPass(pass_func, 0, "LowerTensorExpr", {});
}
```


注意 LowerTensorExprMutator 是前文提到的 ExprMutator, 我们关注其对 Call 的修改，忽略非关键代码添加注释如下

```cpp
  Expr DeviceAwareVisitExpr_(const CallNode* call_node) override {
    // 1. 带 Primitive 标记的 Function, 将其 lower 为全局的 PrimFunc 再调用
    // 2. 带 Compiler 标记的 Function, 如前文所述，本文不展开
    // 3. 预定义的 PrimFunc, 将 Relay Call 替换为 call_lowered 即可
    // 4. 其他情况不做处理
    BaseFunc primitive_func = ResolveToPrimitive(call_node- op);
    if (!primitive_func.defined()) { // 对应情况4
      ...
      return DeviceAwareExprMutator::DeviceAwareVisitExpr_(call_node);
    }

    // Prepare the arguments.
    Array Expr  new_args;
    for (const auto  arg : call_node- args) {
      new_args.push_back(VisitExpr(arg));
    }
```


    ...

```cpp
    // Typical case: call to fused primitive Relay Function.
    // Find the desired target device.
    Target target;
    if (primitive_func- GetAttr String (attr::kCompiler).defined()) {
      ...
    } else {
      // The target corresponding to the call_node expression's annotation.
      VirtualDevice virtual_device = GetVirtualDevice(GetRef Call (call_node));
      ICHECK(!virtual_device- IsFullyUnconstrained());
      target = virtual_device- target;
      ICHECK(target.defined());
    }

    // Lower the primitive function for that target.
    Function function = Downcast Function (primitive_func);
    ...
    return MakeLoweredCall(function, std::move(new_args), call_node- span, target);
  }
```


Lower 发生在 MakeLoweredCall 中，继续追踪

```cpp
  Expr MakeLoweredCall(Function func, Array Expr  visited_args, Span span, Target target) {
    CCacheKey key = CCacheKey(func, target);
    CachedFunc cfunc = compiler_- Lower(key, module_name_);
```


    ...

```cpp
    return CallLowered(cfunc- prim_fn_var, std::move(visited_args), std::move(call_lowered_attrs),
                       std::move(span));
  }
```


可以看到首先 Lower 然后换为 CallLowered 表达式，继续追踪 Lower 会走到 LowerInternal 函数

```cpp
  CCacheValue LowerInternal(const CCacheKey  key, std::function String(String)  mangle_fn) {
    ...

    value- cached_func = PrimFuncFor(key- source_func, key- target, [ ](std::string name) {
      auto mangled = mangle_fn(name);
      return GetUniqueName(mangled,  name_map_);
    });

    if (value- cached_func- prim_func.defined()) {
      VLOG(1)    "already have PrimFunc";
      value- cached_func- funcs- Add(value- cached_func- prim_fn_var,
                                     value- cached_func- prim_func.value());
    } else {
      // NOTE: array will copy on write.
      Array te::Tensor  all_args = Array te::Tensor (value- cached_func- inputs);
      for (te::Tensor arg : value- cached_func- outputs) {
        all_args.push_back(arg);
      }
      // lower the function
      std::unordered_map te::Tensor, tir::Buffer  binds;
      auto func_name = value- cached_func- prim_fn_var- name_hint;
      VLOG(1)    "scheduling";
      IRModule scheduled_module =
          tvm::LowerSchedule(value- cached_func- schedule, all_args, func_name, binds);
      // Unfortunately the above machinery creates its own GlobalVars instead of using *the*
      // GlobalVar we established above. Fix this before the confusion spreads any further.
      // TODO(mbs): LowerSchedule should be given prim_fn_gvar instead of func_name.
      for (const auto  kv : scheduled_module- functions) {
        GlobalVar global_var = kv.first- name_hint == value- cached_func- prim_fn_var- name_hint
                                   ? value- cached_func- prim_fn_var
                                   : kv.first;
        value- cached_func- funcs- Add(global_var, kv.second);
      }
      ICHECK(value- cached_func- funcs- Lookup(value- cached_func- prim_fn_var)
                 .as tir::PrimFuncNode ());
    }
```


    ...

```text
    return value;
  }
```


PrimFuncFor 实际是 ScheduleBuilder::Create 负责生成 Schedule, 在一些情况下会直接生成 PrimFunc, 在更普遍的情况下则是由下面的 LowerSchedule 负责生成最终的 PrimFunc. 先追踪 ScheduleBuilder::Create, 需要注意 ScheduleBuilder 也继承自前文提到的 ExprFunctor

```cpp
  CachedFunc Create(const Function  relay_func, std::function std::string(std::string)  renamer) {
    ...
    auto outputs = this- VisitExpr(relay_func- body);
    ...

    // Fusion over tupled results may leave identity relationships
    // between inputs and outputs, and those should not be scheduled.
    // Hence schedule only non PlaceholderOp outputs.
    tvm::Array te::Tensor  tensor_outs;
    for (const auto  tensor : outputs) {
      if (!tensor- op.as te::PlaceholderOpNode ()) {
        tensor_outs.push_back(tensor);
      }
    }

    te::Schedule schedule{nullptr};
    tir::PrimFunc prim_func{nullptr};
    // No need to register schedule for device copy op.
    if (anchor_attrs_.as DeviceCopyAttrs () == nullptr    create_schedule_) {
      if (use_auto_scheduler_) { // 本文不关心 Ansor
        ...
      }
      if (use_meta_schedule_) { // 本文不关心 Meta
        ... 
      }

      // Use TOPI schdule if user specificed, or the function has no auto_scheduler schedule.
      if (!schedule.defined()    !prim_func.defined()) {
        ICHECK(anchor_implementation_.defined());
        schedule = anchor_implementation_.Schedule(anchor_attrs_, tensor_outs, target_);
      }
      ...
    }

    return CachedFunc(target_, prim_fn_var, fn_inputs, outputs, schedule, prim_func, {});
  }
```


需要注意上述代码中的 VisitExpr 与 anchor_implementation_.Schedule，我们先看后者

```text
te::Schedule OpImplementation::Schedule(const Attrs  attrs, const Array te::Tensor   outs,
                                        const Target  target) {
  return (*this)- fschedule(attrs, outs, target);
}
```


可以看到直接调用前文提到的 fschedule 生成 schedule, 所以关键是 anchor_implementation_ ，而其是在 VisitExpr 的过程中设置的，所以我们追踪 VisitExpr_

  Array te::Tensor  VisitExpr_(const CallNode* call_node) final {

```text
    static auto fpattern = Op::GetAttrMap TOpPattern ("TOpPattern");
    static auto flower_call = tvm::runtime::Registry::Get("relay.backend.lower_call");
```

    
    ...

```cpp
    Op op = Downcast Op (call_node- op);

    Array te::Tensor  outputs;
    OpImplementation impl;
    ...
    LoweredOutput lowered_out = (*flower_call)(GetRef Call (call_node), inputs, target_);
    outputs = lowered_out- outputs;
    impl = lowered_out- implementation;

    if (create_schedule_) {
      int op_pattern = fpattern[op];
      if (!use_auto_scheduler_    op_pattern  = kCommReduce) {
        ICHECK(!anchor_op_.defined() || anchor_op_pattern_   kCommReduce)
               "Cannot apply TOPI schedule to a primitive function with two complicated ops"
               " anchor="    anchor_op_    " current="    op;
      }
      if (op_pattern  = anchor_op_pattern_) { // 注意这里的覆盖规则
        anchor_op_ = op;
        anchor_attrs_ = call_node- attrs;
        anchor_op_pattern_ = op_pattern;
        anchor_implementation_ = impl;
      }
    }
    ...
    return outputs;
  }
```


可以看到 anchor_implementation_  由每个 Op 的 relay.backend.lower_call 结果决定，所以追踪 relay.backend.lower_call

@tvm._ffi.register_func("relay.backend.lower_call")

```python
def lower_call(call, inputs, target):
    """Lower the call expression to op implementation and tensor outputs."""
    assert isinstance(call.op, tvm.ir.Op)
    op = call.op
```


    ...

```text
    is_dyn = _ty.is_dynamic(call.checked_type)
    for arg in call.args:
        is_dyn = is_dyn or _ty.is_dynamic(arg.checked_type)
```


    # check if in the AutoTVM tracing mode, and disable if op is not in wanted list

```text
    env = autotvm.task.TaskExtractEnv.current
    reenable_tracing = False
    if env is not None and env.tracing:
        if env.wanted_relay_ops is not None and op not in env.wanted_relay_ops:
            env.tracing = False
            reenable_tracing = True
```


    if not is_dyn:

```text
        best_impl, outputs = select_implementation(op, call.attrs, inputs, ret_type, target)
    else:
        # TODO(@icemelon9): Allow tvm to generate multiple kernels for dynamic shapes.
        best_impl, outputs = select_implementation(
            op, call.attrs, inputs, ret_type, target, use_autotvm=False
        )
```


    # re-enable AutoTVM tracing
    if reenable_tracing:

```text
        env.tracing = True
    return LoweredOutput(outputs, best_impl)
```

可以看到 best_impl 由 select_implementation 决定，所以继续看 select_implementation

```python
def select_implementation(op, attrs, inputs, out_type, target, use_autotvm=True):
    all_impls = get_valid_implementations(op, attrs, inputs, out_type, target)
```


    ...

    for impl in all_impls:

```text
        outs = impl.compute(attrs, inputs, out_type)
        outputs[impl] = outs
        workload = autotvm.task.get_workload(outs)
        workloads[impl] = workload
        if workload is None:
            # Not an AutoTVM tunable implementation
            continue
        cfg = dispatch_ctx.query(target, workload)
        ...
        if best_cfg is None or best_cfg.cost   cfg.cost:
            best_autotvm_impl = impl
            best_cfg = cfg
    autotvm.GLOBAL_SCOPE.silent = old_silent
```


    if best_autotvm_impl:
        ...
        return best_autotvm_impl, outputs[best_autotvm_impl]

    ...
    return best_plevel_impl, outputs[best_plevel_impl]
先使用 get_valid_implementations 得到所有合法的实现，然后使用 autotvm 调优，我们继续看 get_valid_implementations

```x86asm
def get_valid_implementations(op, attrs, inputs, out_type, target):
    fstrategy = op.get_attr("FTVMStrategy")
    assert fstrategy is not None, (
        "%s doesn't have an FTVMStrategy registered. You can register "
        "one in python with `tvm.relay.op.register_strategy`." % op.name
    )
    with target:
        strategy = fstrategy(attrs, inputs, out_type, target)
    analyzer = tvm.arith.Analyzer()
    ret = []
    for spec in strategy.specializations:
        if spec.condition:
            # check if all the clauses in the specialized condition are true
            flag = True
            for clause in spec.condition.clauses:
                clause = analyzer.canonical_simplify(clause)
                if isinstance(clause, tvm.tir.IntImm) and clause.value:
                    continue
                flag = False
                break
            if flag:
                for impl in spec.implementations:
                    ret.append(impl)
        else:
            for impl in spec.implementations:
                ret.append(impl)
    return ret
```

如代码所述，直接由每个 Op 注册的 FTVMStrategy 来产生所有的 Implementations。

## 7. Future

文章写到这里，编辑器已经卡得不行了，但是 TVM 的细节还有很多。后面还是另起新文吧，比如以下话题都可以展开

- MemoryPlan
- LowerSchedule to TIR
- Lower TIR to Runtime
- AutoTVM
- Ansor
- Quantization
- Nimble

编辑于 2022-11-01 11:26
深度学习（Deep Learning）

TVM

编译器

​赞同 489​​35 条评论​997 ​91 ​分享

​申请转载​​

未登录用户

35 条评论

默认
最新

圈圈虫

​

你是如何办到的，一口气几万字
2022-01-03

​回复​6

Will Zhang

作者

肝帝
2022-01-03

​回复​4

圈圈虫

​

Will Zhang

优秀
2022-01-03

​回复​喜欢

莱博维兹小学徒

伟神，5.3 小标题重复了

2023-02-24

​回复​3

阳哥

大佬辛苦了，看ADT和Let Binding还是有点看不懂，示例语言是python么？看懂ADT和Let Binding概念需要提前补哪些知识呀？

2022-10-13

​回复​3

武小武

​https://tvm.apache.org/docs/arch/relay_intro.html
可以看这个，官方文档，没有C++的信息

2023-08-09

​回复​1

未来未来

留名。
2024-01-02

​回复​1

术高莫用

请教，关于Relay的相关语法使用，例如match之类的使用，是在哪里看到的呢？印象中文档里没看到类似内容，直接看代码的定义又感觉很抽象

2023-03-13

​回复​1

暮冬Z羡慕

大佬辛苦，求更后续

2024-06-04

​回复​1

Givant

作者是不是平时都是基于tvm来工作的
2022-03-10

​回复​1

LanTn

给我一年都写不出来这么多字
2022-01-05

​回复​1

王多鱼-加油

我有两个问题，咨询一下。
1）2025年的最新代码，感觉有部分和这个文章已经对不上了。
2）我发现无论是YouTube还是 知乎，大部分tvm的帖子和视频都是2022年前的，最新的资料从哪里获取呢？感觉官网文档也是2022年左右的。

2025-07-04

​回复​喜欢

展开其他 4 条回复​

武小武

大佬的let-binding讲的好简明扼要！

2023-08-09

​回复​喜欢

点击查看全部评论

未登录用户

关于作者

Will Zhang
机器学习框架开发者

回答
59
文章
14
关注者
10,831

​关注他​发私信

大家都在搜
换一换

伊朗局势464 万热
拼多多被罚 15.2 亿且暴力阻碍监管436 万热
李雨桐泄露薛之谦信息被行拘368 万热
日本发生7.5级地震326 万热
建议低精力人群查维D325 万热
网传酒店打回访电话致住客离婚300 万
女子频繁表白后被确诊「桃花癫」270 万
2026 人形机器人半程马拉松赛259 万
万达电影更名为儒意电影240 万
女子产后被男友起诉退彩礼分娩费225 万

推荐阅读

TVM深度学习编译器
关键特点和组成部分TVM（深度学习编译器栈）是一个开源的深度学习编译器框架，旨在提供高效、灵活的模型部署解决方案。它提供了端到端的编译器堆栈，支持从模型的前端描述到后端代码生成、…

小小强

【从零开始学深度学习编译器】十，TVM的整体把握
BBuf发表于Giant...

现在是不是编译器行业的风口时期？
科研败犬丶 EDA入门选手 记着CNN开始霸占各大CV/AI顶会的时候，就流传过这样一句话”站在风口，猪都能飞起来“。完全是因为caffe，pytorch，mxnet，tf这样成熟的framework能够帮助我们以超…

sunshinelala

一步一步解读神经网络编译器TVM(二)——利用TVM完成C++端的部署
OLDPAN