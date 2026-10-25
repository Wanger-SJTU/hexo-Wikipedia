---
title: 作死向：修改TVM的底层数据结构
date: "2020-07-09 00:00:00"
updated: "2020-07-09 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/模型部署那些事/作死向-修改TVM的底层数据结构/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/151265644
---


> 本文使用 [Zhihu On VSCode](https://zhuanlan.zhihu.com/p/106057556) 创作并发布

[TOC]

### 前言

最近给某个新设备写TVM后端时，出于一些原因需要修改TVM底层的`DLDataType`的`lanes`的类型，将其从`uint16_t`改为`int32_t`（或者`uint32_t`），以支持较大长度的vectorization schedule。刚开始以为很简单，但改着改着发现很多地方都以一种非引用的方式牵涉到`DLDataType`，没改全的话运行时会出现莫名其妙的错误，结果这样不断调试不断修改，花了一天多时间才搞定。为纪念吾辈之努力（全部木大じゃない），谨以此文记录之。

### 作死过程

#### 简单的修改

首先把`3rdparty/dlpack/include/dlpack/dlpack.h`的`DLDataType::lanes`改为`int32_t`（顺便把code和bits也都改成`uint16_t`，这样可以构成一个64-bits的packed-struct，方便跨域的传输）。

```text
typedef struct {
  /*!
   * \brief Type code of base types.
   * We keep it uint8_t instead of DLDataTypeCode for minimal memory
   * footprint, but the value should be one of DLDataTypeCode enum values.
   * */
  uint16_t code; // MARK
  /*!
   * \brief Number of bits, common choices are 8, 16, 32.
   */
  uint16_t bits; // MARK
  /*! \brief Number of lanes in the type, used for vector types. */
  int32_t lanes; // MARK
```

} DLDataType;

然后编译一下，有几个涉及类型转换地方的会报错，修改之：

- `include/tvm/runtime/data_type.h:75`:

```cpp
DataType(int code, int bits, int lanes) {
    data_.code = static_castuint16_t>(code); // MARK
    data_.bits = static_castuint16_t>(bits); // MARK
    data_.lanes = static_castint32_t>(lanes); // MARK
    if (code == kBFloat) {
        CHECK_EQ(bits, 16);
    }
}
```


- `include/tvm/runtime/serializer.h:41,46`:

```cpp
inline static void Write(Stream* strm, const DLDataType& dtype) {
  Handleruint16_t>::Write(strm, dtype.code); // MARK
  Handleruint16_t>::Write(strm, dtype.bits); // MARK
  Handlerint32_t>::Write(strm, dtype.lanes); // MARK
}
inline static bool Read(Stream* strm, DLDataType* dtype) {
    if (!Handleruint16_t>::Read(strm, &(dtype->code))) return false; // MARK
    if (!Handleruint16_t>::Read(strm, &(dtype->bits))) return false; // MARK
    if (!Handlerint32_t>::Read(strm, &(dtype->lanes))) return false; // MARK
    return true;
}
```


#### Cython相关

之后编译就没问题了，但是运行时会出问题，原因在于python和C++的交互部分（主要是Cython代码）。在python部分用`grep`搜索一下`DLDataType`和`DataType`，发现以下几处需要修改的部分：

- `python/tvm/_ffi/_cython/base.pxi:47`:

ctypedef struct DLDataType:
    uint16_t code # MARK
    uint16_t bits # MARK
    int32_t lanes # MARK

- `python/tvm/_ffi/runtime_ctypes.py:64`:

```text
_fields_ = [("type_code", ctypes.c_uint16), # MARK
            ("bits", ctypes.c_uint16), # MARK
            ("lanes", ctypes.c_int32)] # MARK
```


#### LLVM生成的Host端代码

之后可以正常地进行代码生成了（`tvm.build`），但一旦部署运行就会出问题，比如运行下面的代码：

```text
A = te.placeholder((101,), dtype="float32", name="A")
B = te.compute((101,), lambda i: A[i] + 1, name="B")
s = te.create_schedule([B.op])

fun = tvm.build(s, [A, B])
ctx = tvm.cpu(0)
a_np = np.random.uniform(size=(101,)).astype(A.dtype)
a = tvm.nd.array(a_np, ctx)
b = tvm.nd.array(np.zeros((101,), dtype=B.dtype), ctx)
fun(a, b)
```


会报错：

TVMError: Check failed: ret == 0 (-1 vs. 0) : Assert fail: (((tvm_struct_get(arg0, 0, 5) == (uint8)2) && (tvm_struct_get(arg0, 0, 6) == (uint8)32)) && (tvm_struct_get(arg0, 0, 7) == (uint16)1)), arg0.dtype is expected to be float32

尴尬的是从traceback上来看该错误是一个Foreign-Function-Call造成的，仅靠调试很难进行溯源。

用`grep`搜索`dtype is expected to be`，发现了错误的可能来源：`src/tir/transforms/arg_binder.cc:170`，修改之：

  type_err_msg  arg_name  ".dtype is expected to be "  dtype;

```text
  PrimExpr cond = (TVMArrayGet(DataType::UInt(16), handle, intrinsic::kArrTypeCode) ==
                       IntImm(DataType::UInt(16), dtype.code()) && // MARK
                   TVMArrayGet(DataType::UInt(16), handle, intrinsic::kArrTypeBits) ==
                       IntImm(DataType::UInt(16), dtype.bits()) && // MARK
                   TVMArrayGet(DataType::Int(32), handle, intrinsic::kArrTypeLanes) ==
                       IntImm(DataType::Int(32), dtype.lanes())); // MARK
```


但是这样修改一下，甚至连`tvm.build`都运行不了了，在LLVM/CPU代码生成（Host端代码生成）时会出问题。这里困惑了我很久，之后我把`arg_binder.cc`的修改取消后，查看了一下生成的LLVM IR才发现问题：

; ModuleID = 'TVMMod'

```text
source_filename = "TVMMod"
target datalayout = "e-m:e-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-linux-gnu"
```


%0 = type { i8*, %1, i32, %2, i64*, i64*, i64 }
%1 = type { i32, i32 }
%2 = type { i8, i8, i16 } # MARK

原来TVM生成Host端代码时还会自己再构造一遍`DLTensor`、`DLContext`、`DLDataType`等底层结构（对应代码的`%0`、`%1`、`%2`）。

这样一来就很好找了，直接用`grep`搜索`StructType::create`，很快就发现了错误来源：`src/target/llvm/codegen_cpu.c:47`，修改之：

```sql
// TVM runtime types
t_tvm_shape_index_ = llvm::Type::getIntNTy(*ctx, DataType::ShapeIndex().bits());
t_tvm_context_ = llvm::StructType::create({t_int_, t_int_});
t_tvm_type_ = llvm::StructType::create({t_int16_, t_int16_, t_int32_}); // MARK
t_tvm_func_handle_ = t_void_p_;
t_tvm_array_ = llvm::StructType::create({t_void_p_, t_tvm_context_, t_int_, t_tvm_type_,
                                         t_tvm_shape_index_->getPointerTo(),
                                         t_tvm_shape_index_->getPointerTo(), t_int64_});
t_tvm_value_ = llvm::StructType::create({t_float64_});
t_tvm_parallel_group_env_ = llvm::StructType::create({t_int32_->getPointerTo(), t_int32_});
ftype_tvm_parallel_lambda_ = llvm::FunctionType::get(
    t_int_, {t_int_, t_tvm_parallel_group_env_->getPointerTo(), t_void_p_}, false);
md_tbaa_ctx_ptr_ = md_builder_->createTBAAScalarTypeNode("ctx_ptr", md_tbaa_root_);
```


改完之后就可以正常进行代码生成以及运行了。

#### RPC数据传输

过了一段时间，用autotvm的时候又出了问题，根据报错信息溯源，问题似乎出在tvm的RPC模块，想必是跟`DLDataType`的数据读写有关。在RPC部分（`src/runtime/rpc/`）搜索`DLDataType`和`kTVMDataType`，很快就发现了问题源头，在`src/runtime/rpc/rpc_protocol:225,344`：

```text
case kTVMDataType: {
    channel->Write(value.v_type);
    // padding
    int32_t padding = 0;
    channel->template Writeint32_t>(padding); // MARK
    break;
}

case kTVMDataType: {
    channel->Read(&(value.v_type));
    int32_t padding = 0;
    channel->template Readint32_t>(&padding); // MARK
    break;
}
```


这里tvm传输`TVMValue`需要凑齐8字节，而它“知道”`DLDataType`的大小为4字节（又是一处擅自假设`DLDataType`的结构与大小的代码），所以再额外读/写了4字节的padding。这里我们直接吧padding部分删掉就行了（因为之前把`DLDataType`改成了一个8字节的packed-struct）。

### 总结

修改`DLDataType`的`lanes`的类型至少需要修改以下几处：

- `3rdparty/dlpack/include/dlpack/dlpack.h:106`
- `include/tvm/runtime/data_type.h:75`
- `include/tvm/runtime/serializer.h:41,46`
- `python/tvm/_ffi/_cython/base.pxi:47`
- `python/tvm/_ffi/runtime_ctypes.py:64`
- `src/tir/transforms/arg_binder.cc:170`
以下几处也可以酌情修改：

`src/runtime/stackvm/stackvm.cc:532`
- `src/tir/transforms/lower_tvm_builtin.cc:194`

- `src/target/llvm/codegen_cpu.c:47`
- `src/runtime/rpc/rpc_protocol:225,344`
修改其他的底层类型所涉及到的地方也与之类似。

不得不说这应该算TVM设计不合理的地方（或者说设计时根本就没考虑到修改底层类型这种事）。个人认为，除了`DLDataType`定义的地方（以及python和cython部分的代码），其他地方应该直接引用`DLDataType`进行编码（比如利用`decltype`来获取field的类型，据此进行派发）。
