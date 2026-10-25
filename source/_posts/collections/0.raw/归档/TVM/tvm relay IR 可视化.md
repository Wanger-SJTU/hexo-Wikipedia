---
title: "tvm relay IR 可视化"
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: "post"
permalink: "/collections/0.raw/归档/TVM/tvm-relay-IR-可视化/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

#TVM 
发现最近relay 的可视化已经在tvm主线上支持了，这里有一个简单的demo代码记录一下

> 需要安装 graphviz

```python
  
import os
import numpy as np

from tvm  import relay
from typing import (
    Dict,
    Union,
    Tuple,
    List,
)

import tvm
from tvm import relay
from tvm.contrib import relay_viz
from tvm.contrib.relay_viz.interface import (
    VizEdge,
    VizNode,
    VizParser,
)

from tvm.contrib.relay_viz.terminal import (
    TermGraph,
    TermPlotter,
    TermVizParser,
)

x = relay.var("x", shape=[1, 512])
y = relay.var("y", shape=[1, 512])

tmp = relay.multiply(x, y)
weight1 = relay.var("w1", shape=[512, 2048])
bias1 = relay.var("b1", shape=[2048])
m1 = relay.nn.matmul(tmp, weight1)
m1 = relay.nn.bias_add(m1, bias1)
weight2 = relay.var("w2", shape=[512, 2048])
bias2 = relay.var("b2", shape=[2048])
m2 = relay.nn.matmul(tmp, weight2)
m2 = relay.nn.bias_add(m2, bias2)

res = m1 + m2

w1 = tvm.nd.array(np.random.random([512, 2048]).astype(np.float32))
w2 = tvm.nd.array(np.random.random([512, 2048]).astype(np.float32))
b1 = tvm.nd.array(np.random.random([2048]).astype(np.float32))
b2 = tvm.nd.array(np.random.random([2048]).astype(np.float32))
params = {"w1":w1, "w2":w2, "b1":b1, "b2":b2}

func = relay.Function([x, y, weight1, weight2, bias1, bias2], res)

mod = tvm.IRModule.from_expr(func)
mod = relay.transform.ToMixedPrecision("float16")(mod)
graph_attr = {"color": "red"}
node_attr = {"color": "blue"}
edge_attr = {"color": "black"}
get_node_attr = {"color": "green"}
dot_plotter = relay_viz.DotPlotter(
            graph_attr=graph_attr,
            node_attr=node_attr,
            edge_attr=edge_attr)
  
viz = relay_viz.RelayVisualizer(
    mod,
    relay_param=params,
    plotter=dot_plotter,
    parser=relay_viz.DotVizParser())
viz.render("eval")
```

可视化的图
![Pasted image 20221023223333.png](/images/collections/assets/Pasted%20image%2020221023223333.png)