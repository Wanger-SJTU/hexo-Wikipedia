---
title: PyTorch Internals 5：Autograd的实现
date: "2020-02-26 00:00:00"
updated: "2020-02-26 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/走向cs/PyTorch-Internals-5-Autograd的实现/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/109338369
---


神经网络的训练一般通过梯度下降的方法进行，其中最重要的一步就是通过链式法则计算网络中的参数相对于损失函数的梯度值。在PyTorch中，通过Autograd的方式自动的对梯度进行计算。在这篇文章中，我们将对PyTorch实现的自动微分引擎进行介绍，希望你看完这篇文章后，可以对PyTorch的Autograd实现有一个直观的理解。

### 计算图的引入

在平常的使用中，我们一般通过对PyTorch提供的算子进行组合即可完成我们期望的功能，对于这些提供的算子，PyTorch已经提供了前向和反向的计算方法，因此如果我们网络是通过PyTorch已有的算子搭建而成的，就不需要自己再实现其反向的过程，因为这一过程将由PyTorch的自动微分引擎替我们完成。为了实现上述的目的，PyTorch引入了计算图的概念。计算图是一个有向图，它的节点为已经实现的算子或者数据（叶子结点），箭头的方向表示数据流动的方向，从输入节点指向输出节点。假设我们想实现函数L(x)=mean(sin(x1*x2+x2))，翻译成计算图为：

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_ca6805ad0a3f.png)

从下往上即为前向传播的过程，如果想要计算L相对于x1和x2的梯度则可以从上往下进行求导，上述过程用PyTorch实现为：

`import torch

x1 = torch.rand((2,2), requires_grad=True)
x2 = torch.rand((2,2), requires_grad=True)

y=torch.mm(x1,x2)
z=torch.sin(y+x2)
L=z.mean()
L.backward()
print(x1.grad, x2.grad)`

下面我们将结合代码具体来分析`L.backward()`的实现。

### 计算图的组成

为了理解计算图的组成方式，首先需要介绍几个与之相关的数据结构：Variable、Node。Variable是承载数据的载体，在计算图中可以用来表示叶子结点，也可以用来表示计算时产生的中间变量。在早期的版本中，存储的数据分为tensor和variable两种数据结构，其中后者包含了与autograd的实现相关的属性。虽然目前在前端使用时tensor和variable已经合并了，但在后端的实现中两者还是有所差别，从代码中可以看到，variable继承自at::Tensor，同时对at::Tensor中与梯度计算相关的方法进行了重载。在at::Tensor中使用`std::unique_ptr autograd_meta_ = nullptr;`来作为与autograd相关的字段，而在variable中使用的是AutogradMeta类型，AutogradMeta是对接口c10::AutogradMetaInterface的实现，

`// pytorch/torch/csrc/autograd/variable.h

```cpp
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                            Variable::AutogradMeta
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/// Each `Variable` has one unique `AutogradMeta` struct, which stores autograd
/// metadata fields that are necessary for tracking the Variable's autograd history.

struct TORCH_API Variable::AutogradMeta : public c10::AutogradMetaInterface {
  std::string name;
```


  Variable grad_;   //存储梯度

```cpp
  std::shared_ptrNode> grad_fn_;   //中间节点梯度计算的方式
  std::weak_ptrNode> grad_accumulator_;    //叶子结点负责将梯度进行累加

  std::vectorstd::shared_ptrFunctionPreHook>> hooks_;
  std::shared_ptrhooks_list> cpp_hooks_list;

  // Only meaningful on leaf variables (must be false otherwise)
  bool requires_grad_;

  bool is_view_;

  // The "output number" of this variable; e.g., if this variable
  // was the second output of a function, then output_nr == 1.
  // We use this to make sure we can setup the backwards trace
  // correctly when this variable is passed to another function.
  uint32_t output_nr_;  //  Variable是某个函数的输出，output_nr_记录它是第几个输出

  // Mutex to ensure that concurrent read operations that modify internal
  // state are still thread-safe. Used by grad_fn() and
  // grad_accumulator().
  std::mutex mutex_;
```


  AutogradMeta(
    at::TensorImpl* self_impl,

```text
    bool requires_grad = false,
    Edge gradient_edge = Edge());
};
```

`

可以看到，AutogradMeta不仅存储了该节点的梯度值，还保存了数据通过该节点时梯度的计算function。当我们使用PyTorch构建神经网络时，直接定义的是其前向计算图，而反向计算图则是PyTorch在进行前向操作时帮我们偷偷构建的，以sin算子为例，当我们在python中使用`y=torch.sin(x)`时，实际执行的代码为

`// pytorch/torch/csrc/autograd/generated/VariableType_0.cpp

Tensor sin(const Tensor & self) {
  RECORD_FUNCTION("sin", std::vectorc10::IValue>({self}), Node::peek_at_next_sequence_nr());
  auto& self_ = unpack(self, "self", 0);

```cpp
  std::shared_ptrSinBackward> grad_fn;
  if (compute_requires_grad( self )) { //如果需要计算梯度，则在这里偷偷建立反向计算图
    grad_fn = std::shared_ptrSinBackward>(new SinBackward(), deleteNode);  //反向计算时使用的函数为SinBackward
    grad_fn->set_next_edges(collect_next_edges( self )); //这边放所有与输出值相关的输入variable
    grad_fn->self_ = SavedVariable(self, false);    //储存自身已备使用
  }
  torch::jit::Node* node = nullptr;
  std::shared_ptrjit::tracer::TracingState> tracer_state;
  if (jit::tracer::isTracing()) {
    tracer_state = jit::tracer::getTracingState();
    at::Symbol op_name;
    op_name = jit::Symbol::fromQualString("aten::sin");
    node = tracer_state->graph->create(op_name, /*num_outputs=*/0);
    jit::tracer::recordSourceLocation(node);
    jit::tracer::addInputs(node, "self", self);
    tracer_state->graph->insertNode(node);

    jit::tracer::setTracingState(nullptr);
  }
  #ifndef NDEBUG
  c10::optionalStorage> self__storage_saved =
    self_.has_storage() ? c10::optionalStorage>(self_.storage()) : c10::nullopt;
  c10::intrusive_ptrTensorImpl> self__impl_saved;
  if (self_.defined()) self__impl_saved = self_.getIntrusivePtr();
  #endif
  auto tmp = ([&]() {
    at::AutoNonVariableTypeMode non_var_type_mode(true);
    return at::sin(self_);  //前向计算
  })();
  auto result = as_variable(std::move(tmp));
  #ifndef NDEBUG
  if (self__storage_saved.has_value())
    AT_ASSERT(self__storage_saved.value().is_alias_of(self_.storage()));
  if (self__impl_saved) AT_ASSERT(self__impl_saved == self_.getIntrusivePtr());
  #endif
  if (grad_fn) {
      set_history(flatten_tensor_args( result ), grad_fn);  //将输出variable与grad_fn绑定，grad_fn中包含了计算梯度的function
  }
  if (tracer_state) {
    jit::tracer::setTracingState(std::move(tracer_state));
    jit::tracer::addOutput(node, result);
  }
  return result;
}

// pytorch/torch/csrc/autograd/functions/utils.h
```


inline void set_history(
    at::Tensor& variable,

```cpp
    const std::shared_ptrNode>& grad_fn) {
  AT_ASSERT(grad_fn);
  if (variable.defined()) {
    auto output_nr =
        grad_fn->add_input_metadata(variable);
    as_variable_ref(variable).set_gradient_edge({grad_fn, output_nr});  //将variable与grad_fn绑定
  } else {
    grad_fn->add_input_metadata(Node::undefined_input());
  }
}
```


inline void set_history(

```cpp
    std::vectorVariable>&& variables,
    const std::shared_ptrNode>& grad_fn) {
  for (auto& variable : variables) {
    set_history(variable, grad_fn);
  }
```

`

从上述代码可以看到，计算图中每个variable都拥有属于自己的grad_fn。而对于网络中预先定义的可学习参数（叶子结点），grad_fn_为空，使用grad_accumulator_作为其梯度处理的函数，负责将传入的梯度累加存储到其grad_变量中。

接下去我们再进一步看看grad_fn，对于上面的sin算子，它的grad_fn为SinBackward，继承自TraceableFunction，而TraceableFunction继承自Node，在早期的版本中，Node类的名字是Function，可能是为了更好的与计算图中的节点概念相对应所以后面的版本将其重新命名为Node。下面我们来看看Node的定义：

`// pytorch/torch/csrc/autograd/function.h

```cpp
struct TORCH_API Node : std::enable_shared_from_thisNode> {
 public:
  /// Construct a new `Node` with the given `next_edges`. `sequence_nr` is
  /// a (currently THE) hint to prioritization in the backward() pass, with
  /// higher sequence numbers prioritized before lower sequence numbers.

  // 构造函数
  explicit Node(
      uint64_t sequence_nr,
      edge_list&& next_edges = edge_list())
      : sequence_nr_(sequence_nr),
      next_edges_(std::move(next_edges)) {
    if (AnomalyMode::is_enabled()) {
      metadata()->store_stack();
    }
  }
```


  explicit Node(edge_list&& next_edges = edge_list())

```cpp
      : Node(get_next_sequence_nr()++, std::move(next_edges)) {}

  /// Nodes不可拷贝和移动
  Node(const Node& other) = delete;
  Node(Node&& other) = delete;
  Node& operator=(const Node& other) = delete;
  Node& operator=(Node&& other) = delete;
  virtual ~Node() = default;

  /// Evaluates the function on the given inputs and returns the result of the
  /// function call.
  // 对（）运算符进行重载
  variable_list operator()(variable_list&& inputs) {
    RECORD_FUNCTION(
        this, std::vectorc10::IValue>(inputs.begin(), inputs.end()));

#ifdef BUILD_NAMEDTENSOR
    // In the first iteration of named tensors, autograd ignores names and
    // operates on unnamed tensors. In the long term, autograd should
    // probably operate with names.
    at::NoNamesGuard no_names_guard;
#endif
    return apply(std::move(inputs));
  }

  // Graph Connectivity API 计算图相关API，略
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  // Inputs. NOTE: inputs of the grad_fn correspond to Tensor outputs of the
  // forward function.

  // Marker for expected undefined input
  struct undefined_input {};

  /// Adds the type and shape metadata for a new input. Returns the index of
  /// of the new input.
  uint32_t add_input_metadata(
    const at::DeprecatedTypeProperties& type
  , at::IntArrayRef shape
  , at::Device device) noexcept {
    uint32_t input_nr = input_metadata_.size();
    input_metadata_.emplace_back(type, shape, device);
    return input_nr;
  }
```


  uint32_t add_input_metadata(const at::Tensor& t) noexcept {

```text
    uint32_t input_nr = input_metadata_.size();
    input_metadata_.emplace_back(t);
    return input_nr;
  }

  /// Adds a placeholder for an input that will not be used.
  uint32_t add_input_metadata(undefined_input u) noexcept {
    uint32_t input_nr = input_metadata_.size();
    input_metadata_.emplace_back();
    return input_nr;
  }
```


  uint32_t num_inputs() const noexcept {

```cpp
    return input_metadata_.size();
  }

  const InputMetadata& input_metadata(size_t index) const {
    return input_metadata_[index];
  }

  /**
   * Note: Function Streams
   * A function's stream (for a given device type) is the stream of the first
   * element of its input buffer on a device of that type.
   *
   * If all elements are on the same device they MUST share a stream. If
   * elements are on different devices (across multiple GPUs, for example)
   * they may have different streams.
   */
  c10::optionalc10::Stream> stream(const c10::DeviceType device_type) {
    for (const auto& metadata : input_metadata_) {
      if (metadata.device().type() == device_type) return metadata.stream();
    }

    return c10::nullopt;
  }

  void clear_input_metadata() {
    input_metadata_.clear();
  }

  // Outputs ("Next Edges")
  // 下面的函数与next_edges相关，next_edges指向的是前向过程中的输入variable
  const Edge& next_edge(size_t index) const noexcept {
    return next_edges_[index];
  }

  void set_next_edge(size_t index, Edge edge) {
    next_edges_[index] = std::move(edge);
  }

  void add_next_edge(Edge edge) {
    next_edges_.push_back(std::move(edge));
  }

  void set_next_edges(edge_list&& next_edges) {
    next_edges_ = std::move(next_edges);
  }

  const edge_list& next_edges() const noexcept {
    return next_edges_;
  }
```


  edge_list& next_edges() noexcept {

```text
    return next_edges_;
  }
```


  uint32_t num_outputs() const noexcept {

```cpp
    return next_edges_.size();
  }

  // Miscellaneous Methods
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  /// The sequence number of this `Node`.
  uint64_t sequence_nr() const noexcept {
    return sequence_nr_;
  }

  /// Returns the name of the dynamic type of the function, for debugging.
  virtual std::string name() const;

  /// Returns true if the particular output edge is active, and that particular
  /// output of this function should be computed.
  bool should_compute_output(size_t output_edge_index) const {
    TORCH_CHECK(output_edge_index  num_outputs(), "Index out of range");
    return next_edges_[output_edge_index].is_valid();
  }

  /// Returns true if any of the output edges in any of the ranges are active.
  bool should_compute_output(std::initializer_listIndexRange> idxs) const {
    return std::any_of(idxs.begin(), idxs.end(), [this](IndexRange range) {
      for (auto i = range.first; i  range.second; i++) {
        if (should_compute_output(i))
          return true;
      }
      return false;
    });
  }

  /// Returns the `PyObject` stored for this `Node` (for Python
  /// interaction).
  PyObject* pyobj() const noexcept {
    return pyobj_;
  }

  /// Sets the `PyObject` stored for this `Node` (for Python interaction).
  void set_pyobj(PyObject* pyobj) noexcept {
    pyobj_ = pyobj;
  }

  /// Returns the anomaly metadata stored for this `Node`.
  /// If none exist, creates a new empty one.
  AnomalyMetadata* metadata() noexcept;

  // Hook API，一些钩子方法，当该算子在计算时需要对variable进行预处理和后处理时
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```


  uintptr_t add_post_hook(std::unique_ptrFunctionPostHook>&& post_hook) {

```cpp
    post_hooks_.push_back(std::move(post_hook));
    // Use the raw pointer as the unique key to identify this hook. This key
    // can then be used in del_post_hook(key) to remove this hook.
    return reinterpret_caststd::uintptr_t>(post_hooks_.back().get());
  }

  const std::vectorstd::unique_ptrFunctionPostHook>>& post_hooks() const
      noexcept {
    return post_hooks_;
  }

  // delete a post hook matching the key
  bool del_post_hook(const uintptr_t& key) {
    for (auto it = post_hooks_.begin(); it != post_hooks_.end(); ++it) {
      if (key == reinterpret_caststd::uintptr_t>(it->get())) {
        post_hooks_.erase(it);
        return true;
      }
    }
    return false;
  }

  std::vectorstd::unique_ptrFunctionPostHook>>& post_hooks() noexcept {
    return post_hooks_;
  }

  void add_pre_hook(std::unique_ptrFunctionPreHook>&& pre_hook) {
    pre_hooks_.push_back(std::move(pre_hook));
  }

  const std::vectorstd::unique_ptrFunctionPreHook>>& pre_hooks() const
      noexcept {
    return pre_hooks_;
  }

  std::vectorstd::unique_ptrFunctionPreHook>>& pre_hooks() noexcept {
    return pre_hooks_;
  }

  // Customization Points for Subclasses
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  /// Releases saved variables if the operation won't be reused.
  virtual void release_variables() {}

  /// Called before an apply if `release_variables()` is going to be called.
  /// Allows larger ops like `InterpreterAutogradFunction` to incrementally
  /// release variables as they run.
  virtual void will_release_variables() {}

  /// Returns true if this function is traceable. An op is traceable if all
  /// operations happening within `apply()` are performed on autograd
  /// `Variables` (i.e. apply mostly instantiates and applies other functions).
  virtual bool is_traceable() {
    return false;
  }

  /// A `Node` is said to pass state transparently to backward, if the
  /// state consists only of (Saved)Variables and only non-variable objects
  /// that parameterize the operation in some way that defines the graph
  /// structure AND the backward function is traceable. In particular,
  /// parametrization MUST NOT depend on the data of any `Variable`.
  /// TODO: it might be possible to handle cases where backward is
  /// non-traceable but state passing could be considered transparent. This
  /// will probably depend on saved_variable_list being mutable.
  /// NOTE: this value matters only if is_traceable() returns false.
  virtual bool passes_state_transparently() {
    return false;
  }

  static uint64_t peek_at_next_sequence_nr();

 protected:
  static uint64_t& get_next_sequence_nr();

  /// Performs the `Node`'s actual operation. 每个继承Node的方法都需要对apply进行实现，因为apply实际包含了梯度计算的方法
  virtual variable_list apply(variable_list&& inputs) = 0;

  /// Calls `apply()`, but instruments it with tracing machinery.
  variable_list traced_apply(variable_list inputs);

  // Since `Node`s are neither copyable nor moveable, we can have const
  // fields.
  const uint64_t sequence_nr_;
```


  edge_list next_edges_;
  PyObject* pyobj_ = nullptr; // weak reference

```cpp
  std::unique_ptrAnomalyMetadata> anomaly_metadata_ = nullptr;
  std::vectorstd::unique_ptrFunctionPreHook>> pre_hooks_;
  std::vectorstd::unique_ptrFunctionPostHook>> post_hooks_;
  at::SmallVectorInputMetadata, 2> input_metadata_;
};
```

`

上述代码中有两点比较值得关注，第一个是所有继承它的方法都需要对apply进行实现，apply代表的是该算子梯度的计算方法，另一个则是next_edges_变量，next_edges_的类型为edge_list，它代表了一系列在前向过程中与该算子相关联的边。首先我们来看前者，对于SinBackward而言，其apply方法为：

`// pytorch/torch/csrc/autograd/generated/Functions.cpp

variable_list SinBackward::apply(variable_list&& grads) {

  IndexRangeGenerator gen;
  auto self_ix = gen.range(1);
  variable_list grad_inputs(gen.size());
  auto& grad = grads[0];
  auto self = self_.unpack();

```text
  if (should_compute_output({ self_ix })) {
    auto grad_result = grad * self.cos();
    copy_range(grad_inputs, self_ix, grad_result);
  }
  return grad_inputs;
}
```

`

sin的导数为cos，与我们的常识是相符的。接下去我们再来看看next_edges_，它的类型edge_list其实是std::vector的别名，代表一系列的Edge。Edge的定义则相对要简单不少：

`// pytorch/torch/csrc/autograd/edge.h

```text
struct Edge {
  Edge() noexcept : function(nullptr), input_nr(0) {}
```


  Edge(std::shared_ptrNode> function_, uint32_t input_nr_) noexcept

```cpp
      : function(std::move(function_)), input_nr(input_nr_) {}

  /// Convenience method to test if an edge is valid.
  bool is_valid() const noexcept {
    return function != nullptr;
  }

  // Required for use in associative containers.
  bool operator==(const Edge& other) const noexcept {
    return this->function == other.function && this->input_nr == other.input_nr;
  }

  bool operator!=(const Edge& other) const noexcept {
    return !(*this == other);
  }

  /// The function this `Edge` points to.
  std::shared_ptrNode> function;   //edge指向指向的函数(Node)

  /// The identifier of a particular input to the function.
  uint32_t input_nr;    //指定其是第几个输入
};
```

`

### Engine

目前我们已经介绍了Variable，AutogradMeta，Node，Edge几种建立计算图需要用到的数据结构。本节将正式介绍PyTorch的自动微分引擎是如何进行工作的。当我们在python中通过`L.backward()`进行反向传播时，在python中最后调用的方式是pytorch/torch/autograd/<strong>init</strong>.py中的`Variable._execution_engine.run_backward(tensors, grad_tensors, retain_graph, create_graph, allow_unreachable=True)`。`Variable._execution_engine.run_backward`在后端c++中对应的代码为pytorch/torch/csrc/autograd/python_engine.cpp中的THPEngine_run_backward。THPEngine_run_backward方法的代码比较长，为此我们将按照其功能分成几部分来讲解。首先代码的第一部分对输入的参数进行解析，初始化相关的变量：

`HANDLE_TH_ERRORS
  _maybe_reinitialize_engine_after_fork();
  PyObject *tensors = nullptr;
  PyObject *grad_tensors = nullptr;

```text
  unsigned char keep_graph = 0;
  unsigned char create_graph = 0;
  PyObject *inputs = nullptr;
  unsigned char allow_unreachable = 0;
  const char *accepted_kwargs[] = {
      "tensors", "grad_tensors", "keep_graph", "create_graph", "inputs",
      "allow_unreachable", nullptr
  };
  if (!PyArg_ParseTupleAndKeywords(args, kwargs, "OObb|Ob", (char**)accepted_kwargs,
        &tensors, &grad_tensors, &keep_graph, &create_graph, &inputs, &allow_unreachable))
    return nullptr;
```


  THPUtils_assert(PyTuple_Check(tensors), "tensors argument is expected to "

```text
      "be a tuple, but got %s", THPUtils_typename(tensors));
  THPUtils_assert(PyTuple_Check(grad_tensors), "grad_tensors argument is "
      "expected to be a tuple, but got %s", THPUtils_typename(grad_tensors));
```

`

第二部分为新建`edge_list roots`和`variable_list grads`，其实就是把网络最终输出节点的信息放入roots和grads作为后续反向求导的开始：

`Py_ssize_t num_tensors = PyTuple_GET_SIZE(tensors);
  Py_ssize_t num_gradients = PyTuple_GET_SIZE(grad_tensors);
  THPUtils_assert(num_tensors == num_gradients, "got %ld tensors and %ld "

```text
      "gradients", num_tensors, num_gradients);
```


  edge_list roots;
  roots.reserve(num_tensors);
  variable_list grads;
  grads.reserve(num_tensors);

```cpp
  for (int i = 0; i  num_tensors; i++) {
    PyObject *_tensor = PyTuple_GET_ITEM(tensors, i);
    THPUtils_assert(THPVariable_Check(_tensor), "element %d of tensors "
        "tuple is not a Tensor", i);
    auto& variable = ((THPVariable*)_tensor)->cdata;
    auto gradient_edge = variable.gradient_edge();
    THPUtils_assert(gradient_edge.function,
        "element %d of tensors does not require grad and does not have a grad_fn", i);
    roots.push_back(std::move(gradient_edge));

    PyObject *grad = PyTuple_GET_ITEM(grad_tensors, i);
    if (THPVariable_Check(grad)) {
      const Variable& grad_var = ((THPVariable*)grad)->cdata;
#ifdef BUILD_NAMEDTENSOR
      if (grad_var.has_names()) {
        TORCH_WARN(
            "Autograd was passed a named grad tensor with dims ", grad_var.names(),
            ". Autograd does not yet support named tensor semantics, so all names ",
            "will be ignored. In practice all computed gradients will still be correct "
            "according to regular tensor semantics.");
      }
#endif
      grads.push_back(grad_var);
    } else {
      THPUtils_assert(grad == Py_None,
          "element %d of gradients tuple is not a Tensor or None", i);
      THPUtils_assert(!variable.requires_grad(),
          "element %d of gradients tuple is None, but the corresponding Tensor requires grad");
    }
  }
```

`

接下去一部分代码用来初始化output_edges，output_edges的类型为std::vector，表示一系列与该节点相连的输出边：

`std::vectorEdge> output_edges;

```cpp
  if (inputs != nullptr) {
    int num_inputs = PyTuple_GET_SIZE(inputs);
    output_edges.reserve(num_inputs);
    for (int i = 0; i  num_inputs; ++i) {
      PyObject *input = PyTuple_GET_ITEM(inputs, i);
      THPUtils_assert(THPVariable_Check(input),
          "all inputs have to be Tensors, but got %s", THPUtils_typename(input));
      THPVariable *input_var = (THPVariable*)input;
      const auto output_nr = input_var->cdata.output_nr();
      auto grad_fn = input_var->cdata.grad_fn();
      if (!grad_fn) {
          grad_fn = input_var->cdata.try_get_grad_accumulator();
      }
      THPUtils_assert(input_var->cdata.requires_grad(),
          "One of the differentiated Tensors does not require grad");
      if (!grad_fn) {
        output_edges.emplace_back();
      } else {
        output_edges.emplace_back(grad_fn, output_nr);
      }
    }
  }
```

`

在这个例子中，inputs为空，所以直接跳过了这部分代码。 接下去便是最重要的部分，即执行自动微分引擎进行计算。

`{

```text
    AutoNoGIL no_gil;
    outputs = engine.execute(roots, grads, keep_graph, create_graph, output_edges);
  }
```

`

下面我们来重点看看`engine.execute`。首先engine的类型为`torch::autograd::python::PythonEngine`，继承自`Engine`类。Engine类的定义为:

`// pytorch/torch/csrc/autograd/engine.h

```cpp
struct TORCH_API Engine {
  using ready_queue_type = std::dequestd::pairstd::shared_ptrNode>, InputBuffer>>;
  using dependencies_type = std::unordered_mapNode*, int>;

  // Given a list of (Node, input number) pairs computes the value of the graph
  // by following next_edge references.
  virtual variable_list execute(
      const edge_list& roots,
      const variable_list& inputs,
      bool keep_graph,
      bool create_graph,
      const edge_list& outputs = {});
  virtual std::unique_ptrAnomalyMetadata> make_anomaly_metadata() {
    return nullptr;
  }

protected:
  void compute_dependencies(Node* root, GraphTask& task);
  void evaluate_function(NodeTask& task);
  ReadyQueue& ready_queue(at::Device device);
  ReadyQueue& ready_queue_by_index(int device_index);
  void start_threads();
  virtual void thread_init(int device);
  virtual void thread_main(GraphTask *graph_task);
  virtual void thread_on_exception(NodeTask& task, std::exception& e);
  void reentrant_thread_init();
  void add_thread_pool_task(GraphTask *graph_task);
  void set_device(int device);
};
```

`

我们首先来看`execute`函数，它是整个Engine类的核心，接收的参数有需要进行反向传播的根节点(roots)，根节点的梯度(inputs)，计算图是否需要保留的标志（keep_graph），是否构建微分图以用来进行高阶求导（create_graph）以及需要输出梯度的节点(outputs)。

`// pytorch/torch/csrc/autograd/python_engine.cpp
variable_list PythonEngine::execute(

```text
    const edge_list& roots,
    const variable_list& inputs,
    bool keep_graph,
    bool create_graph,
    const edge_list& outputs) {
  try {
    return Engine::execute(roots, inputs, keep_graph, create_graph, outputs);
  } catch (python_error& e) {
    e.restore();
    throw;
  }
}

// pytorch/torch/csrc/autograd/engine.cpp
```

auto Engine::execute(const edge_list& roots,

```cpp
                     const variable_list& inputs,
                     bool keep_graph,
                     bool create_graph,
                     const edge_list& outputs) -> variable_list {
  std::call_once(start_threads_flag_, &Engine::start_threads, this);

  // NOLINTNEXTLINE(cppcoreguidelines-pro-type-const-cast)
  validate_outputs(roots, const_castvariable_list&>(inputs), [](const std::string& msg) {
    return msg;
  });

  // Callbacks are only valid for the duration of this run and should always be cleared
  // Lock post_callbacks_lock_ before clearing final_callbacks_
  ClearCallbacks _cb_guard(final_callbacks_, post_callbacks_lock_);
```


  GraphTask graph_task(keep_graph, create_graph, worker_device == NO_DEVICE ? 0 : total_depth+1);

```cpp
  // Lock mutex while GraphTask is being set up
  std::unique_lockstd::mutex> lock(graph_task.mutex_);

  // Now compute the dependencies for all executable functions and queue the root
  auto graph_root = std::make_sharedGraphRoot>(roots, inputs);
  compute_dependencies(graph_root.get(), graph_task);
  if (!outputs.empty()) {
    graph_task.init_to_execute(*graph_root, outputs);
  }
  ready_queue(at::kCPU).push(NodeTask(&graph_task, std::move(graph_root), InputBuffer(0)));

  // Not a worker
  if (worker_device == NO_DEVICE) {
    // Wait for all tasks to complete
    graph_task.not_done_.wait(lock, [&graph_task]{
      return graph_task.outstanding_tasks_.load() == 0;
    });
  } else {
    graph_task.owner_ = worker_device;
    ++total_depth;
    if(current_depth >= max_recursion_depth_){
      // See Note [Reentrant backwards]
      // If reached the max depth, switch to a different thread
      add_thread_pool_task(&graph_task);
      graph_task.not_done_.wait(lock, [&graph_task]{
        return graph_task.outstanding_tasks_.load() == 0;
      });
    } else {
      // Get back to work while we wait for our new graph_task to
      // complete!
      ++current_depth;
      lock.unlock();
      thread_main(&graph_task);
      --current_depth;
    }
    --total_depth;
  }

  // Check for an exception while running backwards
  if (graph_task.has_error_.load()) {
    std::rethrow_exception(graph_task.exception_);
  }

  if (!graph_task.not_ready_.empty()) {
    throw std::runtime_error("could not compute gradients for some functions");
  }

  // Lock mutex during each iteration for accessing final_callbacks.size()
  // Unlocking is necessary, because the callback can register
  // more callbacks (or they can be registered from other threads
  // while it's waiting.
  std::unique_lockstd::mutex> cb_lock(post_callbacks_lock_);
  // WARNING: Don't use a range-for loop here because more callbacks may be
  // added in between callback calls, so iterators may become invalidated.
  // NOLINTNEXTLINE(modernize-loop-convert)
  for (size_t i = 0; i  final_callbacks_.size(); ++i) {
    cb_lock.unlock();
    final_callbacks_[i]();
    cb_lock.lock();
  }

  // Syncs leaf streams with default streams (if necessary)
  // See note "Streaming backwards"
  for (const auto& leaf_stream : graph_task.leaf_streams) {
    const auto guard = c10::impl::VirtualGuardImpl{c10::DeviceType::CUDA};
    const auto default_stream = guard.getDefaultStream(leaf_stream.device());
    if (leaf_stream != default_stream) {
      auto event = c10::Event{c10::DeviceType::CUDA};
      event.record(leaf_stream);
      default_stream.wait(event);
    }
  }

  return graph_task.captured_vars_;
}
```

`

上面的函数比较长，我们将按照功能进行拆解讲解。

#### 1. Engine::start_threads

顾名思义，`start_threads`方法用来启动新的线程，启动的线程数与设备数有关，而使用`std::call_once(start_threads_flag_, &Engine::start_threads, this);`的方式进行调用则保证了在进程的整个生命周期该初始化函数只能被调用一次。

`// pytorch/torch/csrc/autograd/engine.cpp

auto Engine::start_threads() -> void {

```cpp
  // See Note [Allocating GPUs to autograd threads]
  c10::DeviceIndex num_devices = 0;
  for (const auto& impl_atomic : c10::impl::device_guard_impl_registry) {
    auto* impl = impl_atomic.load();
    if (impl) {
      num_devices = std::max(num_devices, impl->deviceCount());
    }
  }

  // One for CPU, plus one for every GPU device (but colocate GPUs of different
  // types)
  int num_threads = num_devices + 1;
  ready_queues_ = std::vectorstd::shared_ptrReadyQueue>>(num_threads);
  for (auto& queue : ready_queues_)
    queue.reset(new ReadyQueue());
```


  thread_pool_shared_ = std::make_sharedThreadPoolShared>();

```cpp
  for (int i = 0; i  num_threads; ++i) {
    std::thread t(&Engine::thread_init, this, i - 1);
    t.detach();
  }
}
```

`

上述代码首先确定了需要新建的线程数num_threads，num_threads为设备数+1，假如设备上有8张显卡，则num_threads=9。第二步是为每个线程创建一个ReadyQueue实例，通过的ReadyQueue的vector ready_queues_来进行管理。ReadyQueue的结构如下，它使用了一个优先队列来管理NodeTask，

`// pytorch/torch/csrc/autograd/engine.cpp

```cpp
struct ReadyQueue {
  std::priority_queueNodeTask, std::vectorNodeTask>, CompareNodeTaskTime> heap_;
  // To notify threads waiting on the ReadyQueue of available tasks on the heap_
  std::condition_variable not_empty_;
  // To protect read and writes to heap_
  std::mutex mutex_;

  void push(NodeTask item);
  void pushShutdownTask();
  NodeTask pop();
};
```


auto ReadyQueue::push(NodeTask item) -> void {

```cpp
  {
    // 生产者
    // Lock mutex for writing to heap_
    std::lock_guardstd::mutex> lock(mutex_);
    ++item.base_->outstanding_tasks_;
    heap_.push(std::move(item));
  }
  not_empty_.notify_one();
}
```


auto ReadyQueue::pop() -> NodeTask {

```cpp
    // 消费者
  // Lock mutex for accesses to heap_
  std::unique_lockstd::mutex> lock(mutex_);
  not_empty_.wait(lock, [this]{ return !heap_.empty(); });
  // NOLINTNEXTLINE(cppcoreguidelines-pro-type-const-cast)
  auto task = std::move(const_castNodeTask&>(heap_.top())); heap_.pop();
  return task;
}
```

`

最后一部分代码在for循环中通过`std::thread`构造了num_threads个线程并通过`t.detach()`使它们刻意独立运行。此外，我们注意到在创建新线程时传入了this指针，this指针指代的就是当前的engine实例，由于所有的线程都共享同一个engine实例，这样就可以实现线程间的数据传递。

#### 2. Engine::compute_dependencies

compute_dependencies的作用是对微分图中每个node的依赖进行计算，通过给定根节点后利用bfs的方式进行。

`// pytorch/torch/csrc/autograd/engine.cpp

/* Computes the number of dependencies for each function which requires grad */
auto Engine::compute_dependencies(Node* root, GraphTask& task) -> void {

```cpp
  // Just to make sure that they will never be added to the queue again
  std::unordered_setNode*> seen;
  std::vectorNode*> queue { root };

  // Queue contains all nodes that will start propagating gradients.
  // We no longer have to expand functions that don't require grad.
  auto& dependencies = task.dependencies_;
  while (!queue.empty()) {
    auto fn = queue.back(); queue.pop_back();
    for (const auto& edge : fn->next_edges()) {
      if (auto next_ptr = edge.function.get()) {
        dependencies[next_ptr] += 1;
        const bool was_inserted = seen.insert(next_ptr).second;
        if (was_inserted) queue.push_back(next_ptr);
      }
    }
  }
  std::coutdependencies.size()std::endl;
}
```

`

依赖关系保存在dependencies中，dependencies是GraphTask中的一个成员变量，类型为std::unordered_map。执行完上述函数后，dependencies中key的数量和计算图中Node的数量是一样的，而每个key对应的value可以看做前向计算图中该Node的出度。

`// pytorch/torch/csrc/autograd/engine.cpp

```cpp
// GraphTask holds metadata needed for a single execution of backward()
struct GraphTask {
  std::exception_ptr exception_;
  // Indicates if an error occurred while executing any task.  When this is
  // true, it signals all threads to stop executing.
  std::atomic_bool has_error_;
  std::atomicuint64_t> outstanding_tasks_;
  // It is safe to read grad_mode_ and keep_graph_ without synchronization
  bool keep_graph_;
  bool grad_mode_;

  // To protect reads/writes to no_ready_, dependencies_ , captured_vars_ and
  // exception_
  std::mutex mutex_;
  // Notified when a task finishes executing.  Check outstanding_tasks_ to see
  // if all tasks are done.
  std::condition_variable not_done_;
  std::unordered_mapNode*, InputBuffer> not_ready_;
  std::unordered_mapNode*, int> dependencies_;
```

`

#### 3. NodeTask

接下去通过`ready_queue(at::kCPU).push(NodeTask(&graph_task, std::move(graph_root), InputBuffer(0)));`将向ready_queues_中加入NodeTask实例，这个类正是我们在queue中传输的对象。加入的NodeTask实例由graph_task、graph_root和0构建。

`// pytorch/torch/csrc/autograd/engine.cpp

```cpp
struct NodeTask {
  GraphTask* base_;
  std::shared_ptrNode> fn_;
  // This buffer serves as an implicit "addition" node for all of the
  // gradients flowing here.  Once all the dependencies are finished, we
  // use the contents of this buffer to run the function.
  InputBuffer inputs_;
  // When worker receives a task with isShutdownTask = true, it will immediately
  // exit. The engine sends a shutdown task to every queue upon its destruction.
  bool isShutdownTask_;

  int getReentrantDepth() const;
```


  NodeTask(GraphTask* base, std::shared_ptrNode> fn, InputBuffer inputs, bool isShutdownTask = false)

```cpp
    : base_(base)
    , fn_(std::move(fn))
    , inputs_(std::move(inputs))
    , isShutdownTask_(isShutdownTask) {}
};
```

`

#### 4. Engine::thread_main

`// pytorch/torch/csrc/autograd/engine.cpp

auto Engine::thread_main(GraphTask *graph_task) -> void {
  auto queue = ready_queues_[worker_device + 1];

```cpp
  // Why the test on graph_task->outstanding_tasks_?  See
  // Note [Reentrant backwards]
  while (!graph_task || graph_task->outstanding_tasks_ > 0) {
    NodeTask task = queue->pop();
    // This will only work if the worker is running a non backward task
    // TODO Needs to be fixed this to work in all cases
    if (task.isShutdownTask_) {
      C10_LOG_API_USAGE_ONCE("torch.autograd.thread_shutdown");
      break;
    }
    if (task.fn_ && !task.base_->has_error_.load()) {
      GradMode::set_enabled(task.base_->grad_mode_);
      try {
        evaluate_function(task);    //执行反向函数
      } catch (std::exception& e) {
        thread_on_exception(task, e);
      }
    }
    // Notify downstream about the completion of tasks depending
    // on both where the task was executed, and who owned the overall
    // graph (in case of reentrant execution.)  See Note [Reentrant backwards].
    auto base_owner = task.base_->owner_;
    // Task from a non-worker thread. Easy case.
    if (base_owner == NO_DEVICE) {
      if (--task.base_->outstanding_tasks_ == 0) {
        // Lock mutex to notify the GraphTask waiting on not_done_
        std::lock_guardstd::mutex> lock(task.base_->mutex_);
        task.base_->not_done_.notify_all();
      }
    } else {
      // If it's a task initiated from this thread, decrease the counter, but
      // don't do anything - loop condition will do all checks for us next.
      if (base_owner == worker_device) {
        --task.base_->outstanding_tasks_;
      // Otherwise send a dummy function task to the owning thread just to
      // ensure that it's not sleeping. If it has work, it might see that
      // graph_task->outstanding_tasks_ == 0 before it gets to the task, but
      // it's a no-op anyway.
      } else if (base_owner != worker_device) {
        if (--task.base_->outstanding_tasks_ == 0) {
          // Synchronize outstanding_tasks_ with queue mutex
          std::atomic_thread_fence(std::memory_order_release);
          ready_queue_by_index(base_owner).push(NodeTask(task.base_, nullptr, InputBuffer(0)));
        }
      }
    }
  }

  // When current_depth is 0 this worker thread is done and we need to notify
  // the parent thread waiting on the graph_task
  // NOTE: An edge case for this is when reentrant calls are repeatedly made in
  // a thread which is at its maximum stack depth and they keep exiting right
  // after. We will always switch to a new thread for each call, so, we'll keep
  // oscillating between the two threads.
  if (graph_task && current_depth == 0) {
    graph_task->not_done_.notify_all();
  }
}
```

`

上述代码为线程的主函数，在while循环中不断从属于当前线程的queue中取出task并通过`evaluate_function(task)`执行该task，执行完task后：

- 如果当前task来自主线程，并且当前task的outstanding_tasks_为0，则通知主进程上的wait同步原语not_done_，准备结束反向计算
- 如果当前task来自工作线程，则outstanding_tasks_-1
- 如果当前task来自其他工作线程则outstanding_tasks_自减1，当outstanding_tasks_=0时，则向那个线程添加一个dummy function task以防止进入sleeping
下面来看`evaluate_function`函数，该函数接收NodeTask类型的输入，NodeTask中保存了该Node的导数计算函数fn_以及链式求导中到当前Node前的梯度。

`// pytorch/torch/csrc/autograd/engine.cpp

auto Engine::evaluate_function(NodeTask& task) -> void {

```cpp
  // If exec_info_ is not empty, we have to instrument the execution
  auto & exec_info_ = task.base_->exec_info_;
  if (!exec_info_.empty()) {
    auto & fn_info = exec_info_.at(task.fn_.get());
    if (auto *capture_vec = fn_info.captures_.get()) {
      // Lock mutex for writing to task.base_->captured_vars_
      std::lock_guardstd::mutex> lock(task.base_->mutex_);
      for (auto capture : *capture_vec) {
        task.base_->captured_vars_[capture.output_idx_] = task.inputs_[capture.input_idx_];
      }
    }
    if (!fn_info.needed_) return;
  }

  // Switches to a function's CUDA stream (if applicable) before calling it
  const auto opt_parent_stream = (*task.fn_).stream(c10::DeviceType::CUDA);
  c10::OptionalStreamGuard parent_stream_guard{opt_parent_stream};
```


  auto outputs = call_function(task);   //进行反向计算

  auto& fn = *task.fn_;

```cpp
  if (!task.base_->keep_graph_) {
    fn.release_variables();
  }

  int num_outputs = outputs.size();
  if (num_outputs == 0) { // Note: doesn't acquire the mutex
    // Records leaf stream (if applicable)
    // See note "Streaming backwards"
    if (opt_parent_stream) {
      task.base_->leaf_streams.emplace(*opt_parent_stream);
    }
    return;
  }

  if (AnomalyMode::is_enabled()) {
    AutoGradMode grad_mode(false);
    for (int i = 0; i  num_outputs; ++i) {
      auto& output = outputs[i];
      at::OptionalDeviceGuard guard(device_of(output));
      if (output.defined() && output.ne(output).any().itemuint8_t>()) {
        std::stringstream ss;
        ss  "Function '"  fn.name()  "' returned nan values in its "  i  "th output.";
        throw std::runtime_error(ss.str());
      }
    }
  }

  // Lock mutex for the accesses to GraphTask dependencies_ and not_ready_ below
  std::lock_guardstd::mutex> lock(task.base_->mutex_);
  for (int i = 0; i  num_outputs; ++i) {
    auto& output = outputs[i];
    const auto& next = fn.next_edge(i); //指向前向图中该Node的输入节点

    if (!next.is_valid()) continue;

    // Check if the next function is ready to be computed
    bool is_ready = false;
    auto& dependencies = task.base_->dependencies_;
    auto it = dependencies.find(next.function.get());
    if (it == dependencies.end()) {
      auto name = next.function->name();
      throw std::runtime_error(std::string("dependency not found for ") + name);
    } else if (--it->second == 0) {
      dependencies.erase(it);
      is_ready = true;  //计算该节点梯度依赖的其他节点梯度都已经计算完成
    }

    auto& not_ready = task.base_->not_ready_;
    auto not_ready_it = not_ready.find(next.function.get());
    if (not_ready_it == not_ready.end()) {
    // 如果当前node的梯度还未进行任何计算
      // Skip functions that aren't supposed to be executed
      if (!exec_info_.empty()) {
        auto it = exec_info_.find(next.function.get());
        if (it == exec_info_.end() || !it->second.should_execute()) {
          continue;
        }
      }
      // No buffers have been allocated for the function
      InputBuffer input_buffer(next.function->num_inputs());    // 新建存储next节点前置梯度的buffer

      // Accumulates into buffer
      const auto opt_next_stream = next.function->stream(c10::DeviceType::CUDA);
      input_buffer.add(next.input_nr,
                       std::move(output),
                       opt_parent_stream,
                       opt_next_stream);

      if (is_ready) {
        auto& queue = ready_queue(input_buffer.device());
        queue.push(NodeTask(task.base_, next.function, std::move(input_buffer)));   //向ready_queue中加入下一个需要计算梯度的NodeTask
      } else {
        not_ready.emplace(next.function.get(), std::move(input_buffer));    //将已计算部分的buffer放入not_ready供后续使用
      }
    } else {
      // The function already has a buffer
      auto &input_buffer = not_ready_it->second;    //如果next节点的前置梯度已经部分计算，则取出相应的buffer，里面存储着已计算部分的梯度

      // Accumulates into buffer
      const auto opt_next_stream = next.function->stream(c10::DeviceType::CUDA);
      input_buffer.add(next.input_nr,
                       std::move(output),
                       opt_parent_stream,
                       opt_next_stream);
      if (is_ready) {
        auto& queue = ready_queue(input_buffer.device());
        queue.push(NodeTask(task.base_, next.function, std::move(input_buffer)));   //向ready_queue中加入下一个需要计算梯度的NodeTask
        not_ready.erase(not_ready_it);  //已经完成next节点前置梯度计算，从not_ready中移除相应的buffer
      }
    }
  }
}

static variable_list call_function(NodeTask& task) {
  bool prev_checkpoint_valid_state = checkpoint_valid;
  checkpoint_valid = task.base_->can_checkpoint() && prev_checkpoint_valid_state;
  auto& fn = *task.fn_;
  auto inputs = call_pre_hooks(fn, InputBuffer::variables(std::move(task.inputs_)));

  if(!task.base_->keep_graph_) {
    fn.will_release_variables();
  }

  const auto has_post_hooks = !fn.post_hooks().empty();
  variable_list outputs;

  {
    at::DebugInfoGuard guard(task.base_->debug_info_);
    if (has_post_hooks) {
      // In functions/accumulate_grad.cpp, there is some logic to check the
      // conditions under which the incoming gradient can be stolen directly
      // (which elides a deep copy) instead of cloned. One of these conditions
      // is that the incoming gradient's refcount must be 1 (nothing else is
      // referencing the same data).  Stashing inputs_copy here bumps the
      // refcount, so if post hooks are employed, it's actually still ok for
      // accumulate_grad.cpp to steal the gradient if the refcount is 2.
      //
      // "new_grad.use_count()       // accumulate_grad.cpp accounts for this, but also creates a silent
      // dependency between engine.cpp (ie, this particular engine
      // implementation) and accumulate_grad.cpp.
      //
      // If you change the logic here, make sure it's compatible with
      // accumulate_grad.cpp.
      auto inputs_copy = inputs;
      outputs = fn(std::move(inputs_copy));
    } else {
      outputs = fn(std::move(inputs));
    }
  }
```


  validate_outputs(fn.next_edges(), outputs, [&](const std::string& msg) {

```cpp
    std::ostringstream ss;
    ss  "Function "   fn.name()  " returned an "  msg;
    return ss.str();
  });
  checkpoint_valid = prev_checkpoint_valid_state;

  if(has_post_hooks){
    // NOLINTNEXTLINE(bugprone-use-after-move)
    return call_post_hooks(fn, std::move(outputs), inputs);
  }
  return outputs;
}
```

`

在`evaluate_function`中调用了`call_function(task)`，`call_function`返回的是该节点对应的导数，类型为std::vector。完成当前Node的导数计算后，`evaluate_function`的后半部分代码为对该节点在前向计算图中的入边连接的节点进行枚举，如果该前置节点计算梯度所依赖的其他节点梯度都已经完成计算（通过`--it->second == 0`进行判断，it指向dependencies中该节点对应的项，即`it = dependencies.find(next.function.get())`），则将is_ready置为true，后续的操作为计算next节点（前向计算图中与当前节点相连的前置节点）的前置梯度并在完成计算后将前置节点放入ready_queue中，具体的操作可以看上述代码中的注释。

### 总结

上面我们介绍了几个关键的函数以及数据结构的实现，本节将从整体层面给大家描述一下自动微分引擎的工作方式:

- 在python中通过`L.backward()`启动自动微分引擎
- 跳转到c++中的`THPEngine_run_backward`
- 构建开始求到的根节点
- 调用PythonEngine::execute
- 调用Engine::execute
- 执行`std::call_once(start_threads_flag_, &Engine::start_threads, this);`初始化，根据设备数初始化若干个线程，每个线程对应一个ReadyQueue，初始化完成子线程调用`thread_main(nullptr)`开始工作
- 在主线程中继续，为每个节点计算各自的依赖数，`compute_dependencies(graph_root.get(), graph_task)`
- 将根节点放入queue中，调用`thread_main`开始计算
- 在`thread_main`中反复调用`evaluate_function(task)`计算每个Node的梯度，直到所有节点的梯度都计算完成
