---
title: 【我与TVM二三事 中篇（1）】VirtualMachine
date: "2022-01-17 00:00:00"
updated: "2022-01-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/tvm/【我与TVM二三事-中篇(1)】VirtualMachine/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/457693496
---


除了使用GraphExecutor以外，VirtualMachine也可以作为runtime的选择，本篇梳理一下使用VirtualMachine的流程。测试代码为: [https://github.com/Archermmt/tvm_walk_through/blob/master/adv_virtualmachine/demo.py](https://link.zhihu.com/?target=https%3A//github.com/Archermmt/tvm_walk_through/blob/master/adv_virtualmachine/demo.py)

调用流程：
1 relay.frontend.from_pytorch(解析过程，略)
2 relay.vm.compile
  2.1 VMCompiler.lower

```sql
    2.1.1 VMCompiler::OptimizeModule(优化过程)
      2.1.1.1 ToANormalForm(使用let对var和操作进行绑定)
      2.1.1.2 InlinePrimitives(将let绑定的function解绑，并去除let节点)
      2.1.1.3 MemoryOpt(添加内存相关操作，把function包裹成tvm_op)
    2.1.2 AnalyzeContext(获取节点和设备的map)
    2.1.3 VMFunctionCompiler::Compile
      2.1.3.1 var_register_map_.insert(为入参分配内存)
      2.1.3.2 VisitExpr(遍历生成指令)
      2.1.3.2.1 VisitExpr_(CallNode) -> EmitInvokeTVMOp
        2.1.3.2.1.1 CompileEngineImpl::Lower(每个invoke_tvm_op生成Stmt结构)
        2.1.3.2.1.2 Instruction::InvokePacked(包装成PackedFunc指令)
      2.1.3.2.2 Emit(生成指令)
  2.2 VMCompiler.codegen
    2.2.1 tvm::build(构建llvm结构)
```

3 VirtualMachine
  3.1 VirtualMachine.__init__(构建 && 初始化)

```text
    3.1.1 VirtualMachine::LoadExecutable(填充packed_funcs_)
    3.1.2 VirtualMachine::Init(记录devices_ && allocators_)
  3.2 VirtualMachine.set_input
    3.2.1 Executable.get_function_params(获取入参参数)
    3.2.2 VirtualMachine._set_input(拷贝入参)
  3.3 VirtualMachine.run
    3.3.1 VirtualMachine::InvokeGlobal(准备当前指令集运行环境)
      3.3.1.1 VirtualMachine::PushFrame(当前指令信息入栈)
      3.3.1.2 VirtualMachine::WriteRegister(填充input信息)
      3.3.1.3 code_ = func.instructions.data()(更新指令信息)
    3.3.2 VirtualMachine::RunLoop(按顺序执行指令)
      3.3.2.1 InvokePacked/InvokeGlobal/ReadRegister/…(根据指令进行处理)
      3.3.2.2 pc++ && goto main_loop(指令记数++，处理下一条指令)
```


### Step1 解析

这部分不再梳理，见[【我与TVM二三事 前篇（1）】relay parse](https://zhuanlan.zhihu.com/p/457039705)

### Step2 relay.vm.compile

基本流程和relay.build过程类似，也包含了优化，lower，codegen过程。

@ tvm/python/tvm/relay/backend/vm.py

```python
def compile(mod, target=None, target_host=None, params=None):
    ...
    compiler = VMCompiler()
    if params:
        compiler.set_params(params)
    compiler.lower(mod, target)
    compiler.codegen()
    return compiler.get_exec()
```


和BuildRelya过程很相似（可以参考[【我与TVM二三事 前篇（3）】relay optimize](https://zhuanlan.zhihu.com/p/457134643)，[【我与TVM二三事 前篇（9）】relay codegen](https://zhuanlan.zhihu.com/p/457407600)，[【我与TVM二三事 前篇（11）】tvm build](https://zhuanlan.zhihu.com/p/457510267)），接下来按步骤梳理一下。

#### Step2.1 VMCompiler.lower

调用入口函数 @ tvm/src/relay/backend/vm/http://compiler.cc

```cpp
void VMCompiler::Lower(IRModule mod, const TargetsMap& targets, const tvm::Target& target_host) {
  exec_ = make_objectExecutable>();
  ...
  context_.module = OptimizeModule(mod, targets_, target_host_);
  ...
  exec_->functions.resize(context_.module->functions.size());
  ...
  ExprDeviceMap expr_device_map = AnalyzeContext();
  for (auto named_func : context_.module->functions) {
    auto gvar = named_func.first;
    if (auto* n = named_func.second.asFunctionNode>()) {
      auto func = GetRefFunction>(n);
      VMFunctionCompiler func_compiler(&context_, targets_, target_host_, expr_device_map);
      auto vm_func = func_compiler.Compile(gvar, func);
      size_t func_index = context_.global_map.at(gvar);
      ICHECK(func_index  exec_->functions.size());
      exec_->functions[func_index] = vm_func;
    }
  }
  ...
}
```


#### Step2.1.1 VMCompiler::OptimizeModule

首先进行的依然是优化过程： @ tvm/src/relay/backend/vm/http://compiler.cc

IRModule VMCompiler::OptimizeModule(IRModule mod, const TargetsMap& targets_arg, const Target& target_host_arg) {
  …
  ArrayPass> pass_seqs;

```text
  Arrayruntime::String> entry_functions{"main"};
  pass_seqs.push_back(transform::RemoveUnusedFunctions(entry_functions));
  pass_seqs.push_back(transform::ToBasicBlockNormalForm());
  …
  return seq(mod);
}
```


流程和relay.optimize一样，同样找几个有代表性的Pass进行梳理

#### Step2.1.1.1 ToANormalForm

这个Pass的调用流程在[【我与TVM二三事 前篇（3）】relay optimize](https://zhuanlan.zhihu.com/p/457134643) ： <strong>Step 3.2.2 ToANormalForm</strong>中梳理过，主要就是修改赋值格式。在relay中没有用作IR的优化所以没有可视化效果，在此填一下坑。

![](/images/collections/0.raw/zhihu/tvm/asset/img_6a9a51501a96.jpg)

使用前Relay部分结构Netron查看完整结构：[https://github.com/Archermmt/tvm_walk_through/blob/master/adv_virtualmachine/visualizes/raw_mod.prototxt](https://link.zhihu.com/?target=https%3A//github.com/Archermmt/tvm_walk_through/blob/master/adv_virtualmachine/visualizes/raw_mod.prototxt)

![](/images/collections/0.raw/zhihu/tvm/asset/img_ea55e82835b6.jpg)

使用后Relay对应结构Netron查看完整结构：[https://github.com/Archermmt/tvm_walk_through/blob/master/adv_virtualmachine/visualizes/to_a_normal_form.prototxt](https://link.zhihu.com/?target=https%3A//github.com/Archermmt/tvm_walk_through/blob/master/adv_virtualmachine/visualizes/to_a_normal_form.prototxt)

基本作用是把拓扑结构换成了类似assign的结构，将函数、入参和出参都使用var进行绑定，不改变计算逻辑。例如图中绿色和红色部分代表不同的function，可以发现function内部逻辑不变，只有functions之间的链接发生了改变。

#### Step2.1.1.2 InlinePrimitives

调用流程：
1 PrimitiveInliner::Inline()
  1.1 VisitExpr_(LetNode)(将var：value关系保存到var_map)
  1.2 VisitExpr_(CallNode)(去除var：value对，直接链接function)

![](/images/collections/0.raw/zhihu/tvm/asset/img_0c666bc76858.jpg)

优化前Relay部分结构Netron查看完整结构：[https://github.com/Archermmt/tvm_walk_through/blob/master/adv_virtualmachine/visualizes/to_a_normal_form.prototxt](https://link.zhihu.com/?target=https%3A//github.com/Archermmt/tvm_walk_through/blob/master/adv_virtualmachine/visualizes/to_a_normal_form.prototxt)

![](/images/collections/0.raw/zhihu/tvm/asset/img_acf8fb678169.jpg)

优化后Relay对应结构Netron查看完整结构：[https://github.com/Archermmt/tvm_walk_through/blob/master/adv_virtualmachine/visualizes/inline_primitives.prototxt](https://link.zhihu.com/?target=https%3A//github.com/Archermmt/tvm_walk_through/blob/master/adv_virtualmachine/visualizes/inline_primitives.prototxt)

对于由let链接的函数，去掉链接用的赋值对var:value，将函数直接嵌入，例如图中绿色和红色部分所示

@ tvm/src/relay/backend/vm/http://inline_primitives.cc

```cpp
Pass InlinePrimitives() {
  runtime::TypedPackedFuncIRModule(IRModule, PassContext)> pass_func =
      [=](IRModule m, PassContext pc) { return relay::vm::PrimitiveInliner(m).Inline(); };
  auto inline_pass = CreateModulePass(pass_func, 1, "Inline", {});
  // Eliminate dead code for each function after inlining.
  return Sequential({inline_pass, DeadCodeElimination()}, "InlinePrimitives");
}

struct PrimitiveInliner : ExprMutator {
  Expr VisitExpr_(const LetNode* let_node) {
    auto pre_visit = [this](const LetNode* op) {
      var_map.insert({op->var, this->VisitExpr(op->value)});
    };
    auto post_visit = [this](const LetNode* op) {
      ...
      auto expr = GetRefExpr>(op);
      this->memo_[expr] = Let(op->var, value, body);
    };
    ExpandANormalForm(let_node, pre_visit, post_visit);
    return memo_[GetRefExpr>(let_node)];
  }

  Expr VisitExpr_(const CallNode* call) {
    Expr op = call->op;
    ...
    while ((var_node = op.asVarNode>())) {
      auto var = GetRefVar>(var_node);
      auto it = var_map.find(GetRefVar>(var_node));
      if (it != var_map.end()) {
        op = it->second;
      } ...
    }
    ...
    if (auto func = op.asFunctionNode>()) {
      if (func->HasNonzeroAttr(attr::kPrimitive)) {
        tvm::ArrayExpr> call_args;
        for (auto arg : call->args) {
          auto new_arg = VisitExpr(arg);
          call_args.push_back(new_arg);
        }
        return Call(GetRefFunction>(func), call_args, call->attrs, call->type_args);
      }
    }
    ...
  }
};
```


访问到Let节点时会保存var:value的关系。访问Call节点时如果发现op是一个var节点，并且有保存在var_map中的信息，就直接删除var节点和value节点，链接function节点。

#### Step2.1.1.3 MemoryOpt

调用流程：
1 transform::ManifestAlloc
  1.1 ContextAnalysis(分析节点和设备的绑定情况)

```text
    1.1.1 ContextAnalyzer::VisitExpr(为每个节点申请device，并对齐device)
    1.1.2 ContextAnalyzer::Results(未决定的device换成default_device)
  1.2 DialectRewriter::Rewrite(添加相关节点)
    1.2.1 MakeStaticAllocation(对outputs添加AllocStorage和AllocTensor)
    1.2.2 InvokeTVMOp(包裹成InvokeTVMOp)
```

2 transform::FoldConstant
3 transform::FuseOps
4 重复1-3多次

![](/images/collections/0.raw/zhihu/tvm/asset/img_7050073b58b9.jpg)

优化前Relay部分结构Netron查看完整结构：[https://github.com/Archermmt/tvm_walk_through/blob/master/adv_virtualmachine/visualizes/inline_primitives.prototxt](https://link.zhihu.com/?target=https%3A//github.com/Archermmt/tvm_walk_through/blob/master/adv_virtualmachine/visualizes/inline_primitives.prototxt)

![](/images/collections/0.raw/zhihu/tvm/asset/img_d3b8c6db7cae.jpg)

优化后Relay对应结构Netron查看完整结构：[https://github.com/Archermmt/tvm_walk_through/blob/master/adv_virtualmachine/visualizes/memory_opt.prototxt](https://link.zhihu.com/?target=https%3A//github.com/Archermmt/tvm_walk_through/blob/master/adv_virtualmachine/visualizes/memory_opt.prototxt)

修改直观上很像GraphExecutor::CreateTVMOp过程（参考[【我与TVM二三事 前篇（12）】graph_executor](https://zhuanlan.zhihu.com/p/457515395)： <strong>Step2.1.2.2 CreateTVMOp</strong>），把每个function变成一个packed func，不过这个Pass核心是为了memeory的管理，增加的节点是为了更好的管理内存，而packed func刚好很适合把内存部分和function部分分开，所以效果上看起来很相似。

@ tvm/src/relay/backend/vm/http://compiler.cc

```text
transform::Sequential MemoryOpt(tvm::Target host_target, TargetsMap targets) {
  ArrayPass> pass_seqs;
  pass_seqs.push_back(transform::ManifestAlloc(host_target, targets));
  pass_seqs.push_back(transform::FoldConstant());
  ...
  return transform::Sequential(pass_seqs);
}
```


反复调用三个Pass，以确保修改完全。其中FoldConstant和FuseOps在[【我与TVM二三事 前篇（3）】relay optimize](https://zhuanlan.zhihu.com/p/457134643)中介绍过，不再说明，主要看ManifestAlloc这个Pass

@ tvm/src/relay/transforms/http://memory_alloc.cc

```cpp
Pass ManifestAlloc(Target target_host, Maptvm::Integer, tvm::Target> targets) {
  return tvm::transform::CreateModulePass(
      [=](IRModule mod, const PassContext& pass_ctx) {
        ...
        auto ca = ContextAnalysis(mod, fallback_dev);
        ...
        auto glob_funcs = mod->functions;
        for (const auto& it : glob_funcs) {
          if (auto* func_node = it.second.asFunctionNode>()) {
            auto func = GetRefFunction>(func_node);
            auto rewriter = DialectRewriter(target_host, ca);
            auto updated_func = rewriter.Rewrite(func);
            mod->Update(it.first, updated_func);
          }
        }
        mod = relay::transform::InferType()(mod);
        return mod;
      },
      0, "ManifestAlloc", {});
}
```


分成两部分，ContextAnalysis进行检查，DialectRewriter对func进行修改。

#### Step2.1.1.3.1 ContextAnalysis

首先通过ContextAnalysis判断节点和设备的绑定情况。

@ tvm/src/relay/analysis/http://context_analysis.cc

```cpp
AnalysisResultMap ContextAnalysis(const IRModule& mod, const Device& default_device) {
  auto entry = mod->GetGlobalVar("main");
  auto ca = analysis::ContextAnalyzer(mod, entry, default_device);
  auto expr = mod->Lookup(entry);
  ca.VisitExpr(expr);
  return ca.Results();
}

class ContextAnalyzer : public MixedModeVisitor {
  void VisitExpr_(const FunctionNode* fn) final {
    auto func = GetRefFunction>(fn);
    ...
    auto device = Unify(DeviceFor(func), DeviceFor(fn->body));
    for (const auto& it : fn->params) {
      DeviceFor(it);
    }
    MixedModeVisitor::VisitExpr(fn->body);
  }

  DeviceDomainPtr DeviceFor(const Expr& expr) {
    auto it = expr_to_device_.find(expr);
    if (it == expr_to_device_.end()) {
      auto bottom = Bottom();
      expr_to_device_[expr] = bottom;
      return bottom;
    } else {
      return it->second;
    }
  }

  DeviceDomainPtr Unify(DeviceDomainPtr lhs, DeviceDomainPtr rhs) {
    lhs = Lookup(lhs);
    rhs = Lookup(rhs);
    auto unified_device = Join(lhs, rhs);
    ...
    return unified_device;
  }
};
```


进行遍历访问，对每个节点的依赖元素都进行一遍DeviceFor。第一次调用DeviceFor都会在expr_to_device_填充Bottom，标明device未知，之后使用Unify比对所有的元素，如果有确定的unified_device，则所有的元素都设定device为unified_device。本demo中没有算子指定设备，所以遍历之后所有节点的device都是Bottom，然后在调用Results函数的时候全都设定为默认的

@ tvm/src/relay/analysis/http://context_analysis.cc

```x86asm
AnalysisResultMap ContextAnalysis(const IRModule& mod, const Device& default_device) {
  AnalysisResultMap Results() {
    AnalysisResultMap ret;
    for (const auto& it : expr_to_device_) {
      auto device = Lookup(it.second);
      if (device->IsEmptyDomain()) {
        ret[it.first] = default_device_;
      } ...
    }
    ...
  }
}
```


#### Step2.1.1.3.2 DialectRewriter::Rewrite

配合设备的绑定情况对整个计算图进行遍历修改

@ tvm/src/relay/transforms/http://memory_alloc.cc

```cpp
class DialectRewriter : public ExprMutator {
  Expr VisitExpr_(const CallNode* cn) final {
    if (IsPrimitive(cn)) {
      ...
      if (IsDeviceCopy(cn->op)) {
        ...
      } else if (IsDynamic(ret_type)) {
        ...
      } else {
        ArrayExpr> outs;
        for (size_t i = 0; i  out_types.size(); ++i) {
          Device dev = GetDevice(GetRefCall>(cn));
          auto out = MakeStaticAllocation(&scope, out_types[i], dev, std::to_string(i));
          outs.push_back(out);
        }
        Tuple output(outs);
        Expr invoke = InvokeTVMOp(cn->op, ins, output);
        scope.Push(invoke);
        return ToTupleType(ret_type, std::vectorExpr>(output->fields.begin(), output->fields.end()));
      }
    } ...
  }

  Var MakeStaticAllocation(LetList* scope, const TensorType& type, Device dev, String name_hint) {
    ...
    Var var("storage_" + name_hint, Type(nullptr));
    Expr value = AllocStorage(size, alignment, dev, type->dtype);
    auto sto = scope->Push(var, value);
    auto tensor = AllocTensor(sto, shape, type->dtype, type->shape);
    Var tensor_var("tensor_" + name_hint, Type(nullptr));
    return scope->Push(tensor_var, tensor);
  }
```

}；

MakeStaticAllocation对输出进行Malloc操作，添加AllocStorage和AllocTensor节点，inputs和outputs都被包裹成Tuple之后，连同op一起包裹成InvokeTVMOp。

#### Step2.1.2 VMCompiler::AnalyzeContext

@ tvm/src/relay/backend/vm/http://compiler.cc

ExprDeviceMap VMCompiler::AnalyzeContext() const {

```text
  Device default_device;
  ExprDeviceMap expr_device_map;
  if (targets_.size() > 1) {
    ...
  } else {
    const auto& tgt = targets_.begin();
    default_device.device_type = static_castDLDeviceType>((*tgt).first->value);
    if (default_device.device_type != kDLCPU) {
      default_device.device_id = 0;
      expr_device_map = ContextAnalysis(context_.module, default_device);
    }
  }
  return expr_device_map;
}
```


核心过程是AnalyzeContext，在Step2.1.1.3.1 ContextAnalysis中梳理过，得到的是每个计算节点和device的绑定关系，本demo使用了kDLCPU作为device，所以expr_device_map为空。

#### Step2.1.3 VMFunctionCompiler::Compile

对于每个function，使用VMFunctionCompiler进行编译

@ tvm/src/relay/backend/vm/http://compiler.cc

```cpp
class VMFunctionCompiler : ExprFunctorvoid(const Expr& expr)> {
  VMFunction Compile(const GlobalVar& var, const Function& func) {
    for (auto param : func->params) {
      auto arg_register = NewRegister();
      ICHECK_EQ(i, arg_register);
      var_register_map_.insert({param, arg_register});
      params_.push_back(param->name_hint());
      ++i;
    }
    if (IsClosure(func)) {
      ...
    } else {
      this->VisitExpr(func->body);
    }
    instructions_.push_back(Instruction::Ret(last_register_));
    ...
    return VMFunction(var->name_hint, params_, instructions_, registers_num_, params_device_type);
  }
}
```


首先使用var_register_map_保存入参，每个入参分配一个新的register数，然后遍历生成指令instructions_。基于上文的分析，用于计算的部分基本都是用Call包裹InvokeTVMOp的节点记录的，所以主要看对Call节点的处理

@ tvm/src/relay/backend/vm/http://compiler.cc

```cpp
class VMFunctionCompiler : ExprFunctorvoid(const Expr& expr)> {
  void VisitExpr_(const CallNode* call_node) {
    Expr op = call_node->op;
    if (op.asOpNode>()) {
      OpMatchvoid> matcher;
      matcher
        .Match("vm.invoke_tvm_op",
          [this](const ArrayExpr>& args, const Attrs& attrs, const ArrayType>& type_arg) {
            ICHECK_EQ(args.size(), 3);
            EmitInvokeTVMOp(DowncastFunction>(args[0]), args[1], args[2]);
          })
      ...
    }
    matcher(GetRefCall>(call_node));
    return;
  }
  ...
```

}；

```cpp
void EmitInvokeTVMOp(const Function& func, const Expr& inputs, const Expr& outputs) {
  ...
  CCacheKey key(func, target);
  auto cfunc = engine_->Lower(key);
  auto op_index = -1;
    if (func->GetAttrString>(attr::kCompiler).defined()) {
      ...
    } else {
      ...
      auto pfunc = Downcasttir::PrimFunc>((*cfunc->funcs->functions.begin()).second);
      if (context_->seen_funcs.find(pfunc) == context_->seen_funcs.end()) {
        op_index = context_->cached_funcs.size();
 context_->cached_funcs.push_back(cfunc);
        context_->seen_funcs[pfunc] = op_index;
      } ...
    }
    Emit(Instruction::InvokePacked(op_index, argument_registers.size(),
    output_tuple->fields.size(),argument_registers));
  }
}
```


到此，发现核心依然是调用engine_->lower生成Stmt结构，然后记录到context_中，即调用CompileEngineImpl::Lower，此过程梳理见[【我与TVM二三事 前篇（9）】relay codegen](https://zhuanlan.zhihu.com/p/457407600): <strong>Step 2.2.2 tvm::lower</strong>。VisitExpr每个过程需要和内存交互的地方都会使用Emit生成指令，并收集到instructions_中，形式如：

load_const $1 Const[0]
alloc_storage $2 $1 64 float32 1
load_const $3 Const[1]
alloc_tensor $4 $2 $3 [1, 1, 224, 224, 3] float32
invoke_packed PackedFunc[0] (in: $0, out: $4)

也就是指令集的一种抽象。最后通过VMFunction记录指令集，为后面的过程作准备

#### Step2.2 VMCompiler.codegen

Step2.1 VMCompiler.lower过程为每个全局函数生成了VMFunction，接下来使用得到的函数进行代码生成。

@ tvm/src/relay/backend/vm/http://compiler.cc

```cpp
void VMCompiler::Codegen() {
  ...
  auto compile_engine = CompileEngine::Global();
  auto ext_mods = compile_engine->LowerExternalFunctions();
  runtime::Module lib;
  if (funcs.size() > 0) {
    MapString, IRModule> build_funcs;
    for (const auto& i : funcs) {
      build_funcs.Set(i.first, i.second);
    }
    lib = tvm::build(build_funcs, target_host_);
  } ...
  lib = codegen::CreateMetadataModule(params_, lib, ext_mods, target_host_);
  exec_->SetLib(lib);
}
```


由于没有指定kCompiler处理的函数，所以ext_mods为空，lib为tvm::build得到的llvm结构，codegen::CreateMetadataModule没有任何操作。

### Step3 VirtualMachine

得到lowered代码之后，接下来构建VirtualMachine并进行推理，这部分可以分成初始化、绑定入参、执行三个部分。

#### Step3.1 VirtualMachine.__init__

@ tvm/python/tvm/runtime/vm.py

```python
class VirtualMachine(object):
    ...
    def __init__(self, exe, device, memory_cfg=None):
        ...
        self.module = exe.mod["vm_load_executable"]()
        self._exec = exe
        ...
        self._set_input = self.module["set_input"]
        self._setup_device(device, memory_cfg)
```


首先使用vm_load_executable函数构建_exec，然后调用_setup_device初始化设备。

#### Step3.1.1** **VirtualMachine::LoadExecutable

根据函数调用会调用到Executable::GetFunction

@ tvm/src/runtime/vm/http://executable.cc

PackedFunc Executable::GetFunction(const std::string& name, const ObjectPtrObject>& sptr_to_self) {
  ...} else if (name == "vm_load_executable") {

```text
    return PackedFunc([sptr_to_self, this](TVMArgs args, TVMRetValue* rv) {
      auto vm = make_objectVirtualMachine>();
      vm->LoadExecutable(this);
      *rv = Module(vm);
    });
  }
}
```


-> @ tvm/src/runtime/vm/http://vm.cc

```cpp
void VirtualMachine::LoadExecutable(const Executable* exec) {
  ...
  for (const auto& it : exec_->primitive_map) {
    const auto& packed_name = it.first;
    auto packed_index = static_castsize_t>(it.second);
    ...
    tvm::runtime::PackedFunc pf = lib.GetFunction(packed_name, true);
    ICHECK(pf != nullptr)  "Cannot find function in module: "  packed_name;
     packed_funcs_[packed_index] = pf;
  }
}
```


逻辑比较简洁，就是填充packed_funcs_。

#### Step3.1.2 VirtualMachine._setup_device

@ tvm/python/tvm/runtime/vm.py

```python
class VirtualMachine(object):
    ...
    def _setup_device(self, dev, memory_cfg):        …
        ...
        init_args = []
        for device in devs:
            init_args.append(device.device_type % RPC_SESS_MASK)
            init_args.append(device.device_id)
            alloc_type = memory_cfg[device] if device in memory_cfg else default_alloc_type
            init_args.append(alloc_type)
        self._init(*init_args)
```


打包init_args，每个设备表示为(device_type, device_id, alloc_type)三元组，会在调用init的时候拆开

@ tvm/src/runtime/vm/http://vm.cc

PackedFunc VirtualMachine::GetFunction(const std::string& name, const ObjectPtrObject>& sptr_to_self) {
  ... } else if (name == "init") {

```cpp
    return PackedFunc([sptr_to_self, this](TVMArgs args, TVMRetValue* rv) {
      ICHECK_EQ(args.size() % 3, 0);
      std::vectorDevice> devices;
      std::vectorAllocatorType> alloc_types;
      for (int i = 0; i  args.size() / 3; ++i) {
        Device dev;
        int device_type = args[i * 3];
        dev.device_type = DLDeviceType(device_type);
        dev.device_id = args[i * 3 + 1];
        int type = args[i * 3 + 2];
        devices.push_back(dev);
        alloc_types.push_back(AllocatorType(type));
      }
      this->Init(devices, alloc_types);
    });
  }
}

void VirtualMachine::Init(const std::vectorDevice>& devs, const std::vectorAllocatorType>& alloc_types) {
  ...
  for (size_t i = 0; i  devs.size(); i++) {
    auto dev_type = static_castsize_t>(devs[i].device_type);
    auto alloc = MemoryManager::GetOrCreateAllocator(devs[i], alloc_types[i]);
    ...
     devices_[dev_type] = devs[i];
    allocators_[dev_type] = alloc;
  }
}
```


初始化devices_和allocators_，用于记录每个device对应的设备类型和内存分配器。

#### Step3.2 VirtualMachine.set_input

@ tvm/python/tvm/runtime/vm.py

```python
class VirtualMachine(object):
    ...
    def set_input(self, func_name, *args, **kwargs):     …
        ...
        if kwargs:
            func_params = self._exec.get_function_params(func_name)
            new_args = [None] * len(func_params)
            cnt = 0
            for k in kwargs:
                if k in func_params:
                    idx = func_params.index(k)
                    new_args[idx] = kwargs[k]
                    cnt += 1
            ...
        self._set_input(func_name, *cargs)
```


#### Step3.2.1 Executable.get_function_params

@ tvm/python/tvm/runtime/vm.py

```python
class Executable(object):
    def get_function_params(self, func_name):
        if func_name in self._function_params:
            return self._function_params[func_name]
        arity = self._get_function_arity(func_name)
        assert arity >= 0
        params = []
        for i in range(arity):
            p = self._get_function_param_name(func_name, i)
            assert p
            params.append(p)
        self._function_params[func_name] = params
        return params
```


首先通过函数名func_name获取入参信息，调用了两个函数

@ tvm/src/runtime/vm/http://executable.cc

PackedFunc Executable::GetFunction(const std::string& name, const ObjectPtrObject>& sptr_to_self) {
  ... } else if (name == "get_function_arity") {

```cpp
    return PackedFunc([sptr_to_self, this](TVMArgs args, TVMRetValue* rv) {
      std::string func_name = args[0];
      *rv = this->GetFunctionArity(func_name);
    });
  } else if (name == "get_function_param_name") {
    return PackedFunc([sptr_to_self, this](TVMArgs args, TVMRetValue* rv) {
      std::string func_name = args[0];
      int index = args[1];
      *rv = this->GetFunctionParameterName(func_name, index);
    });
  } ...
}

int Executable::GetFunctionArity(std::string func_name) const {
  auto it = global_map.find(func_name);
  ...
  const auto& func = functions[it->second];
  return func.params.size();
}
std::string Executable::GetFunctionParameterName(std::string func_name, uint32_t index) const {
  auto it = global_map.find(func_name);
  ...
  const auto& func = functions[it->second];
  ...
  return func.params[index];
}
```


获取入参名字列表。

#### Step3.2.2 VirtualMachine._set_input

通过参数列表将kwargs和args变成list of tvm.ndarray，就得到了合适的入参数据，接下来进行参数的绑定。

@ tvm/src/runtime/vm/http://vm.cc

PackedFunc VirtualMachine::GetFunction(const std::string& name, const ObjectPtrObject>& sptr_to_self) {
  ... } else if (name == "set_input") {

```cpp
    return PackedFunc([sptr_to_self, this](TVMArgs args, TVMRetValue* rv) {
      ...
      std::vectorObjectRef> func_args(param_names.size());
      for (int i = 1; i  args.size(); ++i) {
        Index device_type = vm_func.params_device_type[i - 1];
        Device dev = GetDevice(device_type);
        if (args[i].type_code() == kTVMDLTensorHandle) {
          ...
        } else {
          ObjectRef obj = CopyTo(args[i], dev);
          func_args[i - 1] = obj;
        }
      }
      inputs_.erase(func_name);
      inputs_.emplace(func_name, func_args);
    });
  } ...
}
```


拷贝入参数据，填充inputs_

#### Step3.3 VirtualMachine.run

@ tvm/python/tvm/runtime/vm.py

```python
class VirtualMachine(object):
    def run(self, *args, **kwargs):
        return self.invoke("main", *args, **kwargs)
    def invoke(self, func_name, *args, **kwargs):
        ...
        return self._invoke(func_name)
```


-> @ tvm/src/runtime/vm/http://vm.cc

PackedFunc VirtualMachine::GetFunction(const std::string& name, const ObjectPtrObject>& sptr_to_self) {

```cpp
  if (name == "invoke") {
    return PackedFunc([sptr_to_self, this](TVMArgs args, TVMRetValue* rv) {
      ...
      if (func.params.empty()) {
        *rv = Invoke(func, {});
      } else {
        auto it = inputs_.find(func_name);
        ICHECK(it != inputs_.end())  "Input has not been set for function "  func_name;
        const std::vectorObjectRef>& func_args = it->second;
        *rv = Invoke(func, func_args);
      }
    });
  } ...
}
```


ObjectRef VirtualMachine::Invoke(const VMFunction& func, const std::vectorObjectRef>& args) {
  ...

```text
  InvokeGlobal(func, args);
  RunLoop();
  return return_register_;
}
```


分成两步，InvokeGlobal准备环境和RunLoop执行指令

#### Step3.3.1** **VirtualMachine::InvokeGlobal

@ tvm/src/runtime/vm/http://vm.cc

```cpp
void VirtualMachine::InvokeGlobal(const VMFunction& func, const std::vectorObjectRef>& args) {
  ...
  PushFrame(func.params.size(), this->pc_ + 1, func);
  for (size_t i = 0; i  args.size(); ++i) {
    WriteRegister(i, args[i]);
  }
  DLOG(INFO)  "func.params= "  func.params.size();
  code_ = func.instructions.data();
  pc_ = 0;
}

void VirtualMachine::PushFrame(Index arg_count, Index ret_pc, const VMFunction& vm_func) {
  auto frame = VMFrame(ret_pc, func_index_, arg_count, code_, vm_func.register_file_size);
  frames_.push_back(frame);
}
```


inline void VirtualMachine::WriteRegister(Index r, const ObjectRef& val) {

```text
  frames_.back().register_file[r] = val;
}
```


PushFrame用于将当前的code_入栈保存，WriteRegister则将inputs信息写入当前frame的register_file对应位置。注意此处一个frame中code_和register_file对应的不是一个func，code_对应的是上个func的指令信息，frame入栈之后才会更新code_为当前func的指令信息。

#### Step3.3.2 VirtualMachine::RunLoop

@ tvm/src/runtime/vm/http://vm.cc

```cpp
void VirtualMachine::RunLoop() {
  ICHECK(this->exec_);
  ICHECK(this->code_);
  pc_ = 0;
  Index frame_start = frames_.size();
  while (true) {
  main_loop:
    auto const& instr = code_[this->pc_];
    switch (instr.op) {
      ...
      case Opcode::InvokePacked: {
        ...
        const auto& func = packed_funcs_[instr.packed_index];
        const auto& arity = instr.arity;
        std::vectorObjectRef> args;
        for (Index i = 0; i  arity; ++i) {
          DLOG(INFO)  "arg"  i  " $"  instr.packed_args[i];
          auto arg = ReadRegister(instr.packed_args[i]);
          args.push_back(arg);
        }
        ...
        InvokePacked(instr.packed_index, func, arity, instr.output_size, args);
        pc_++;
        goto main_loop;
      }
      ...
      case Opcode::Ret: {
        ...
        return_register_ = ReadRegister(instr.result);
        auto caller_return_register = frames_.back().caller_return_register;
        if (PopFrame() == frame_start) {
          return;
          // Otherwise we are just returning from a local call.
        } else {
          WriteRegister(caller_return_register, return_register_);
          goto main_loop;
        }
      }
      ...
    }
  }
}

void VirtualMachine::InvokePacked(Index packed_index, const PackedFunc& func, Index arg_count, Index output_size, const std::vectorObjectRef>& args) {
  ...
  runtime::TVMArgsSetter setter(values.data(), codes.data());
  int idx = 0;
  bool is_empty_output = false;
  for (Index i = 0; i  arg_count; i++) {
    if (const auto* dt_cell = args[i].asADTObj>()) {
      ...
    } else {
      auto nd_array = DowncastNDArray>(args[i]);
      ...
      setter(idx++, nd_array);
    }
  }
  if (!is_empty_output) {
    TVMRetValue rv;
    func.CallPacked(TVMArgs(values.data(), codes.data(), arity), &rv);
  }
}
```


RunLoop的基本过程就是模拟寄存器处理数据的过程，再把结果写回寄存器的过程，逻辑和代码风格都十分像指令集书写的时候的格式，其中InvokePacked的处理依然是调用被包裹成PackedFunc的llvm结构。

### 总结

与GraphExecutor相比，VirtualMachine链路更短一些，对PackedFunc的包装在compile阶段就完成，运行阶段直接按照func生成的指令集顺序执行，不过计算内核的实现依然是tvm::build得到的可执行内核。VirtualMachine的使用过程如下

1.解析：正常流程，得到relay IR

2.vm.compile：首先进行relay IR的优化，优化结果是在FuseOp的基础上将func进行打包并拆分入参出参为存储结构，变成适合指令处理的方式。接下来codegen将函数执行过程生成对应的指令集

3.VirtualMachine：初始化的时候加载tvm::build得到的可执行函数内核，并设定入参数据。run的时候则直接通过RunLoop执行指令。
