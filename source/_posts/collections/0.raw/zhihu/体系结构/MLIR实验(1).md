---
title: MLIR实验(1)
date: "2021-07-24 00:00:00"
updated: "2021-07-24 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/MLIR实验(1)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/392826624
---


最近MLIR更新了很多，整个AI的各层IR快齐了，做了一些实验。

### 单算子例子

module {
  func @test_matmul(%arg0: tensor1x14x19xf32>, %arg1: tensor1x19x28xf32>) -> tensor1x14x28xf32> {

```text
    %0 = "tosa.matmul"(%arg0, %arg1) : (tensor1x14x19xf32>, tensor1x19x28xf32>) -> tensor1x14x28xf32>
    return %0 : tensor1x14x28xf32>
  }
}
```


我们把它转化成linalg表示。

`bin/mlir-opt --tosa-to-linalg-on-tensors test.mlir`

output:

module  {
  func @test_matmul(%arg0: tensor1x14x19xf32>, %arg1: tensor1x19x28xf32>) -> tensor1x14x28xf32> {

```text
    %cst = constant 0.000000e+00 : f32
    %0 = linalg.init_tensor [1, 14, 28] : tensor1x14x28xf32>
    %1 = linalg.fill(%cst, %0) : f32, tensor1x14x28xf32> -> tensor1x14x28xf32>
    %2 = linalg.batch_matmul ins(%arg0, %arg1 : tensor1x14x19xf32>, tensor1x19x28xf32>) outs(%1 : tensor1x14x28xf32>) -> tensor1x14x28xf32>
    return %2 : tensor1x14x28xf32>
  }
}
```


这里的linalg算子是named op，我们把它转化成generic 表示。

`bin/mlir-opt --tosa-to-linalg-on-tensors --linalg-generalize-named-ops test.mlir`

output:

#map0 = affine_mapd0, d1, d2) -> ()>
#map1 = affine_mapd0, d1, d2) -> (d0, d1, d2)>
#map2 = affine_mapd0, d1, d2, d3) -> (d0, d1, d3)>
#map3 = affine_mapd0, d1, d2, d3) -> (d0, d3, d2)>
#map4 = affine_mapd0, d1, d2, d3) -> (d0, d1, d2)>
module  {
  func @test_matmul(%arg0: tensor1x14x19xf32>, %arg1: tensor1x19x28xf32>) -> tensor1x14x28xf32> {

```text
    %cst = constant 0.000000e+00 : f32
    %0 = linalg.init_tensor [1, 14, 28] : tensor1x14x28xf32>
    %1 = linalg.generic {indexing_maps = [#map0, #map1], iterator_types = ["parallel", "parallel", "parallel"]} ins(%cst : f32) outs(%0 : tensor1x14x28xf32>) {
    ^bb0(%arg2: f32, %arg3: f32):  // no predecessors
      linalg.yield %arg2 : f32
    } -> tensor1x14x28xf32>
    %2 = linalg.generic {indexing_maps = [#map2, #map3, #map4], iterator_types = ["parallel", "parallel", "parallel", "reduction"]} ins(%arg0, %arg1 : tensor1x14x19xf32>, tensor1x19x28xf32>) outs(%1 : tensor1x14x28xf32>) {
    ^bb0(%arg2: f32, %arg3: f32, %arg4: f32):  // no predecessors
      %3 = mulf %arg2, %arg3 : f32
      %4 = addf %arg4, %3 : f32
      linalg.yield %4 : f32
    } -> tensor1x14x28xf32>
    return %2 : tensor1x14x28xf32>
  }
}
```


这个时候已经很有趣了，这是一个接近halide DSL描述。map里的d3也就是reduce维度，其他维度都是并行维度。

接着我们来做一下tiling，我们针对d1做tiling，这是lhs的维度1。

`bin/mlir-opt --tosa-to-linalg-on-tensors --linalg-generalize-named-ops --linalg-tile=linalg-tile-sizes=1,4,1,1 test.mlir`

output:

#map0 = affine_mapd0) -> (4, -d0 + 14)>
#map1 = affine_mapd0, d1, d2) -> ()>
#map2 = affine_mapd0, d1, d2) -> (d0, d1, d2)>
#map3 = affine_mapd0, d1, d2, d3) -> (d0, d1, d3)>
#map4 = affine_mapd0, d1, d2, d3) -> (d0, d3, d2)>
#map5 = affine_mapd0, d1, d2, d3) -> (d0, d1, d2)>
module  {
  func @test_matmul(%arg0: tensor1x14x19xf32>, %arg1: tensor1x19x28xf32>) -> tensor1x14x28xf32> {

```text
    %cst = constant 0.000000e+00 : f32
    %c4 = constant 4 : index
    %c14 = constant 14 : index
    %c28 = constant 28 : index
    %c19 = constant 19 : index
    %c0 = constant 0 : index
    %c1 = constant 1 : index
    %0 = linalg.init_tensor [1, 14, 28] : tensor1x14x28xf32>
    %1 = scf.for %arg2 = %c0 to %c14 step %c4 iter_args(%arg3 = %0) -> (tensor1x14x28xf32>) {
      %3 = scf.for %arg4 = %c0 to %c28 step %c1 iter_args(%arg5 = %arg3) -> (tensor1x14x28xf32>) {
        %4 = affine.min #map0(%arg2)
        %5 = tensor.extract_slice %arg5[0, %arg2, %arg4] [1, %4, 1] [1, 1, 1] : tensor1x14x28xf32> to tensor1x?x1xf32>
        %6 = linalg.generic {indexing_maps = [#map1, #map2], iterator_types = ["parallel", "parallel", "parallel"]} ins(%cst : f32) outs(%5 : tensor1x?x1xf32>) {
        ^bb0(%arg6: f32, %arg7: f32):  // no predecessors
          linalg.yield %arg6 : f32
        } -> tensor1x?x1xf32>
        %7 = tensor.insert_slice %6 into %arg5[0, %arg2, %arg4] [1, %4, 1] [1, 1, 1] : tensor1x?x1xf32> into tensor1x14x28xf32>
        scf.yield %7 : tensor1x14x28xf32>
      }
      scf.yield %3 : tensor1x14x28xf32>
    }
    %2 = scf.for %arg2 = %c0 to %c14 step %c4 iter_args(%arg3 = %1) -> (tensor1x14x28xf32>) {
      %3 = scf.for %arg4 = %c0 to %c28 step %c1 iter_args(%arg5 = %arg3) -> (tensor1x14x28xf32>) {
        %4 = scf.for %arg6 = %c0 to %c19 step %c1 iter_args(%arg7 = %arg5) -> (tensor1x14x28xf32>) {
          %5 = affine.min #map0(%arg2)
          %6 = tensor.extract_slice %arg0[0, %arg2, %arg6] [1, %5, 1] [1, 1, 1] : tensor1x14x19xf32> to tensor1x?x1xf32>
          %7 = tensor.extract_slice %arg1[0, %arg6, %arg4] [1, 1, 1] [1, 1, 1] : tensor1x19x28xf32> to tensor1x1x1xf32>
          %8 = affine.min #map0(%arg2)
          %9 = tensor.extract_slice %arg7[0, %arg2, %arg4] [1, %8, 1] [1, 1, 1] : tensor1x14x28xf32> to tensor1x?x1xf32>
          %10 = linalg.generic {indexing_maps = [#map3, #map4, #map5], iterator_types = ["parallel", "parallel", "parallel", "reduction"]} ins(%6, %7 : tensor1x?x1xf32>, tensor1x1x1xf32>) outs(%9 : tensor1x?x1xf32>) {
          ^bb0(%arg8: f32, %arg9: f32, %arg10: f32):  // no predecessors
            %12 = mulf %arg8, %arg9 : f32
            %13 = addf %arg10, %12 : f32
            linalg.yield %13 : f32
          } -> tensor1x?x1xf32>
          %11 = tensor.insert_slice %10 into %arg7[0, %arg2, %arg4] [1, %8, 1] [1, 1, 1] : tensor1x?x1xf32> into tensor1x14x28xf32>
          scf.yield %11 : tensor1x14x28xf32>
        }
        scf.yield %4 : tensor1x14x28xf32>
      }
      scf.yield %3 : tensor1x14x28xf32>
    }
    return %2 : tensor1x14x28xf32>
  }
}
```


我们再把linalg整体转化成affine方言，但是首先做一下bufferize，把tensor转化成memref。

`bin/mlir-opt --tosa-to-linalg-on-tensors --linalg-generalize-named-ops --linalg-tile=linalg-tile-sizes=1,4,1,1 --linalg-comprehensive-module-bufferize test.mlir`

output:

#map0 = affine_mapd0, d1, d2)[s0, s1, s2, s3] -> (d0 * s1 + s0 + d1 * s2 + d2 * s3)>
#map1 = affine_mapd0) -> (4, -d0 + 14)>
#map2 = affine_mapd0, d1, d2)[s0] -> (d0 * 392 + s0 + d1 * 28 + d2)>
#map3 = affine_mapd0, d1, d2) -> ()>
#map4 = affine_mapd0, d1, d2) -> (d0, d1, d2)>
#map5 = affine_mapd0, d1, d2, d3) -> (d0, d1, d3)>
#map6 = affine_mapd0, d1, d2, d3) -> (d0, d3, d2)>
#map7 = affine_mapd0, d1, d2, d3) -> (d0, d1, d2)>
module  {
  func @test_matmul(%arg0: memref1x14x19xf32, #map0>, %arg1: memref1x19x28xf32, #map0>) -> memref1x14x28xf32> {

```text
    %c1 = constant 1 : index
    %c0 = constant 0 : index
    %c19 = constant 19 : index
    %c28 = constant 28 : index
    %c14 = constant 14 : index
    %c4 = constant 4 : index
    %cst = constant 0.000000e+00 : f32
    %0 = memref.alloc() : memref1x14x28xf32>
    scf.for %arg2 = %c0 to %c14 step %c4 {
      %1 = affine.min #map1(%arg2)
      scf.for %arg3 = %c0 to %c28 step %c1 {
        %2 = memref.subview %0[0, %arg2, %arg3] [1, %1, 1] [1, 1, 1] : memref1x14x28xf32> to memref1x?x1xf32, #map2>
        linalg.generic {indexing_maps = [#map3, #map4], iterator_types = ["parallel", "parallel", "parallel"]} ins(%cst : f32) outs(%2 : memref1x?x1xf32, #map2>) {
        ^bb0(%arg4: f32, %arg5: f32):  // no predecessors
          linalg.yield %arg4 : f32
        }
      }
    }
    scf.for %arg2 = %c0 to %c14 step %c4 {
      %1 = affine.min #map1(%arg2)
      scf.for %arg3 = %c0 to %c28 step %c1 {
        %2 = memref.subview %0[0, %arg2, %arg3] [1, %1, 1] [1, 1, 1] : memref1x14x28xf32> to memref1x?x1xf32, #map2>
        scf.for %arg4 = %c0 to %c19 step %c1 {
          %3 = memref.subview %arg0[0, %arg2, %arg4] [1, %1, 1] [1, 1, 1] : memref1x14x19xf32, #map0> to memref1x?x1xf32, #map0>
          %4 = memref.subview %arg1[0, %arg4, %arg3] [1, 1, 1] [1, 1, 1] : memref1x19x28xf32, #map0> to memref1x1x1xf32, #map0>
          linalg.generic {indexing_maps = [#map5, #map6, #map7], iterator_types = ["parallel", "parallel", "parallel", "reduction"]} ins(%3, %4 : memref1x?x1xf32, #map0>, memref1x1x1xf32, #map0>) outs(%2 : memref1x?x1xf32, #map2>) {
          ^bb0(%arg5: f32, %arg6: f32, %arg7: f32):  // no predecessors
            %5 = mulf %arg5, %arg6 : f32
            %6 = addf %arg7, %5 : f32
            linalg.yield %6 : f32
          }
        }
      }
    }
    memref.dealloc %0 : memref1x14x28xf32>
    return %0 : memref1x14x28xf32>
  }
}
```


不过到这里发现先做了tiling，转化到affine的时候有个问题。我们暂时把tiling去掉，后面可以在affine里面做tiling。

`bin/mlir-opt --tosa-to-linalg-on-tensors --linalg-generalize-named-ops --linalg-comprehensive-module-bufferize --convert-linalg-to-affine-loops test.mlir`

output:

#map = affine_mapd0, d1, d2)[s0, s1, s2, s3] -> (d0 * s1 + s0 + d1 * s2 + d2 * s3)>
module  {
  func @test_matmul(%arg0: memref1x14x19xf32, #map>, %arg1: memref1x19x28xf32, #map>) -> memref1x14x28xf32> {

```text
    %cst = constant 0.000000e+00 : f32
    %0 = memref.alloc() : memref1x14x28xf32>
    affine.for %arg2 = 0 to 1 {
      affine.for %arg3 = 0 to 14 {
        affine.for %arg4 = 0 to 28 {
          affine.store %cst, %0[%arg2, %arg3, %arg4] : memref1x14x28xf32>
        }
      }
    }
    affine.for %arg2 = 0 to 1 {
      affine.for %arg3 = 0 to 14 {
        affine.for %arg4 = 0 to 28 {
          affine.for %arg5 = 0 to 19 {
            %1 = affine.load %arg0[%arg2, %arg3, %arg5] : memref1x14x19xf32, #map>
            %2 = affine.load %arg1[%arg2, %arg5, %arg4] : memref1x19x28xf32, #map>
            %3 = affine.load %0[%arg2, %arg3, %arg4] : memref1x14x28xf32>
            %4 = mulf %1, %2 : f32
            %5 = addf %3, %4 : f32
            affine.store %5, %0[%arg2, %arg3, %arg4] : memref1x14x28xf32>
          }
        }
      }
    }
    memref.dealloc %0 : memref1x14x28xf32>
    return %0 : memref1x14x28xf32>
  }
}
```


我们把上下两个loop做一下fusion。

`bin/mlir-opt --tosa-to-linalg-on-tensors --linalg-generalize-named-ops --linalg-comprehensive-module-bufferize --convert-linalg-to-affine-loops --affine-loop-fusion test.mlir`

output:

#map = affine_mapd0, d1, d2)[s0, s1, s2, s3] -> (d0 * s1 + s0 + d1 * s2 + d2 * s3)>
module  {
  func @test_matmul(%arg0: memref1x14x19xf32, #map>, %arg1: memref1x19x28xf32, #map>) -> memref1x14x28xf32> {

```text
    %c0 = constant 0 : index
    %cst = constant 0.000000e+00 : f32
    %0 = memref.alloc() : memref1x14x28xf32>
    affine.for %arg2 = 0 to 1 {
      affine.for %arg3 = 0 to 14 {
        affine.for %arg4 = 0 to 28 {
          affine.store %cst, %0[%c0, %arg3, %arg4] : memref1x14x28xf32>
          affine.for %arg5 = 0 to 19 {
            %1 = affine.load %arg0[%arg2, %arg3, %arg5] : memref1x14x19xf32, #map>
            %2 = affine.load %arg1[%arg2, %arg5, %arg4] : memref1x19x28xf32, #map>
            %3 = affine.load %0[%arg2, %arg3, %arg4] : memref1x14x28xf32>
            %4 = mulf %1, %2 : f32
            %5 = addf %3, %4 : f32
            affine.store %5, %0[%arg2, %arg3, %arg4] : memref1x14x28xf32>
          }
        }
      }
    }
    memref.dealloc %0 : memref1x14x28xf32>
    return %0 : memref1x14x28xf32>
  }
}
```


我们对于loop做一些简化。

`bin/mlir-opt --tosa-to-linalg-on-tensors --linalg-generalize-named-ops --linalg-comprehensive-module-bufferize --convert-linalg-to-affine-loops --affine-loop-fusion --affine-loop-normalize test.mlir`

output:

#map0 = affine_mapd0, d1, d2)[s0, s1, s2, s3] -> (d0 * s1 + s0 + d1 * s2 + d2 * s3)>
#map1 = affine_mapd0) -> (d0)>
#map2 = affine_mapd0) -> (d0 + 4, 14)>
#map3 = affine_mapd0) -> (d0 + 4)>
module  {
  func @test_matmul(%arg0: memref1x14x19xf32, #map0>, %arg1: memref1x19x28xf32, #map0>) -> memref1x14x28xf32> {

```text
    %c0 = constant 0 : index
    %c0_0 = constant 0 : index
    %cst = constant 0.000000e+00 : f32
    %0 = memref.alloc() : memref1x14x28xf32>
    affine.for %arg2 = 0 to 14 step 4 {
      affine.for %arg3 = 0 to 28 step 4 {
        affine.for %arg4 = #map1(%arg2) to min #map2(%arg2) {
          affine.for %arg5 = #map1(%arg3) to #map3(%arg3) {
            affine.store %cst, %0[%c0_0, %arg4, %arg5] : memref1x14x28xf32>
            affine.for %arg6 = 0 to 19 {
              %1 = affine.load %arg0[%c0, %arg4, %arg6] : memref1x14x19xf32, #map0>
              %2 = affine.load %arg1[%c0, %arg6, %arg5] : memref1x19x28xf32, #map0>
              %3 = affine.load %0[%c0, %arg4, %arg5] : memref1x14x28xf32>
              %4 = mulf %1, %2 : f32
              %5 = addf %3, %4 : f32
              affine.store %5, %0[%c0, %arg4, %arg5] : memref1x14x28xf32>
            }
          }
        }
      }
    }
    memref.dealloc %0 : memref1x14x28xf32>
    return %0 : memref1x14x28xf32>
  }
}
```


再对于affine for重新做一个tiling，我们最对外层loop做tiling。

`bin/mlir-opt --tosa-to-linalg-on-tensors --linalg-generalize-named-ops --linalg-comprehensive-module-bufferize --convert-linalg-to-affine-loops --affine-loop-fusion --affine-loop-normalize --affine-loop-tile=tile-sizes=4 test.mlir`

output:

#map0 = affine_mapd0, d1, d2)[s0, s1, s2, s3] -> (d0 * s1 + s0 + d1 * s2 + d2 * s3)>
#map1 = affine_mapd0) -> (d0)>
#map2 = affine_mapd0) -> (d0 + 4, 14)>
#map3 = affine_mapd0) -> (d0 + 4)>
module  {
  func @test_matmul(%arg0: memref1x14x19xf32, #map0>, %arg1: memref1x19x28xf32, #map0>) -> memref1x14x28xf32> {

```text
    %c0 = constant 0 : index
    %c0_0 = constant 0 : index
    %cst = constant 0.000000e+00 : f32
    %0 = memref.alloc() : memref1x14x28xf32>
    affine.for %arg2 = 0 to 14 step 4 {
      affine.for %arg3 = 0 to 28 step 4 {
        affine.for %arg4 = #map1(%arg2) to min #map2(%arg2) {
          affine.for %arg5 = #map1(%arg3) to #map3(%arg3) {
            affine.store %cst, %0[%c0_0, %arg4, %arg5] : memref1x14x28xf32>
            affine.for %arg6 = 0 to 19 {
              %1 = affine.load %arg0[%c0, %arg4, %arg6] : memref1x14x19xf32, #map0>
              %2 = affine.load %arg1[%c0, %arg6, %arg5] : memref1x19x28xf32, #map0>
              %3 = affine.load %0[%c0, %arg4, %arg5] : memref1x14x28xf32>
              %4 = mulf %1, %2 : f32
              %5 = addf %3, %4 : f32
              affine.store %5, %0[%c0, %arg4, %arg5] : memref1x14x28xf32>
            }
          }
        }
      }
    }
    memref.dealloc %0 : memref1x14x28xf32>
    return %0 : memref1x14x28xf32>
  }
}
```


然后我们加入一级存储层次，然后做memory data copy。这里似乎有bug，我们必须把linalg-comprehensive-module-buffersize退回到linalg-bufferize。

`bin/mlir-opt --tosa-to-linalg-on-tensors --linalg-generalize-named-ops --linalg-bufferize --convert-linalg-to-affine-loops --affine-loop-fusion --affine-loop-normalize --affine-loop-tile=tile-sizes=4 --affine-data-copy-generate="fast-mem-capacity=1" --canonicalize test.mlir`

output:

#map0 = affine_mapd0) -> (d0)>
#map1 = affine_mapd0) -> (d0 + 4, 14)>
#map2 = affine_mapd0) -> (d0 + 4)>
module  {
  func @test_matmul(%arg0: tensor1x14x19xf32>, %arg1: tensor1x19x28xf32>) -> tensor1x14x28xf32> {

```text
    %cst = constant 0.000000e+00 : f32
    %c76 = constant 76 : index
    %c1 = constant 1 : index
    %c0 = constant 0 : index
    %c4 = constant 4 : index
    %c28 = constant 28 : index
    %c16 = constant 16 : index
    %0 = memref.alloc() : memref1x1x1xf32>
    %1 = memref.buffer_cast %arg0 : memref1x14x19xf32>
    %2 = memref.buffer_cast %arg1 : memref1x19x28xf32>
    %3 = memref.alloc() : memref1x14x28xf32>
    %4 = memref.alloc() : memref1x1x1xf32, 1>
    %5 = memref.alloc() : memref1xi32>
    affine.dma_start %0[%c0, %c0, %c0], %4[%c0, %c0, %c0], %5[%c0], %c1 : memref1x1x1xf32>, memref1x1x1xf32, 1>, memref1xi32>
    affine.dma_wait %5[%c0], %c1 : memref1xi32>
    %6 = memref.alloc() : memref1xi32>
    affine.for %arg2 = 0 to 14 step 4 {
      %8 = memref.alloc() : memref1x4x19xf32, 1>
      %9 = memref.alloc() : memref1xi32>
      affine.dma_start %1[0, %arg2, 0], %8[%c0, %c0, %c0], %9[%c0], %c76 : memref1x14x19xf32>, memref1x4x19xf32, 1>, memref1xi32>
      affine.dma_wait %9[%c0], %c76 : memref1xi32>
      affine.for %arg3 = 0 to 28 step 4 {
        %10 = memref.alloc() : memref1x19x4xf32, 1>
        %11 = memref.alloc() : memref1xi32>
        affine.dma_start %2[0, 0, %arg3], %10[%c0, %c0, %c0], %11[%c0], %c76, %c28, %c4 : memref1x19x28xf32>, memref1x19x4xf32, 1>, memref1xi32>
        affine.dma_wait %11[%c0], %c76 : memref1xi32>
        %12 = memref.alloc() : memref1x4x4xf32, 1>
        %13 = memref.alloc() : memref1xi32>
        affine.dma_start %3[0, %arg2, %arg3], %12[%c0, %c0, %c0], %13[%c0], %c16, %c28, %c4 : memref1x14x28xf32>, memref1x4x4xf32, 1>, memref1xi32>
        affine.dma_wait %13[%c0], %c16 : memref1xi32>
        %14 = memref.alloc() : memref1xi32>
        affine.for %arg4 = #map0(%arg2) to min #map1(%arg2) {
          affine.for %arg5 = #map0(%arg3) to #map2(%arg3) {
            affine.store %cst, %4[0, 0, 0] : memref1x1x1xf32, 1>
            %15 = affine.load %4[0, 0, 0] : memref1x1x1xf32, 1>
            affine.store %15, %12[0, -%arg2 + %arg4, -%arg3 + %arg5] : memref1x4x4xf32, 1>
            affine.for %arg6 = 0 to 19 {
              %16 = affine.load %8[0, -%arg2 + %arg4, %arg6] : memref1x4x19xf32, 1>
              %17 = affine.load %10[0, %arg6, -%arg3 + %arg5] : memref1x19x4xf32, 1>
              %18 = affine.load %12[0, -%arg2 + %arg4, -%arg3 + %arg5] : memref1x4x4xf32, 1>
              %19 = mulf %16, %17 : f32
              %20 = addf %18, %19 : f32
              affine.store %20, %12[0, -%arg2 + %arg4, -%arg3 + %arg5] : memref1x4x4xf32, 1>
            }
          }
        }
        affine.dma_start %12[%c0, %c0, %c0], %3[0, %arg2, %arg3], %14[%c0], %c16, %c28, %c4 : memref1x4x4xf32, 1>, memref1x14x28xf32>, memref1xi32>
        affine.dma_wait %14[%c0], %c16 : memref1xi32>
        memref.dealloc %14 : memref1xi32>
        memref.dealloc %13 : memref1xi32>
        memref.dealloc %12 : memref1x4x4xf32, 1>
        memref.dealloc %11 : memref1xi32>
        memref.dealloc %10 : memref1x19x4xf32, 1>
      }
      memref.dealloc %9 : memref1xi32>
      memref.dealloc %8 : memref1x4x19xf32, 1>
    }
    affine.dma_start %4[%c0, %c0, %c0], %0[%c0, %c0, %c0], %6[%c0], %c1 : memref1x1x1xf32, 1>, memref1x1x1xf32>, memref1xi32>
    affine.dma_wait %6[%c0], %c1 : memref1xi32>
    memref.dealloc %6 : memref1xi32>
    memref.dealloc %5 : memref1xi32>
    memref.dealloc %4 : memref1x1x1xf32, 1>
    %7 = memref.tensor_load %3 : memref1x14x28xf32>
    return %7 : tensor1x14x28xf32>
  }
}
```


我们再试着做下software pipeline。

`bin/mlir-opt --tosa-to-linalg-on-tensors --linalg-generalize-named-ops --linalg-bufferize --convert-linalg-to-affine-loops --affine-loop-fusion --affine-loop-normalize --affine-loop-tile=tile-sizes=4 --affine-data-copy-generate="fast-mem-capacity=1" --affine-pipeline-data-transfer -canonicalize test.mlir`

output:

#map0 = affine_mapd0) -> (d0 - 4)>
#map1 = affine_mapd0) -> (d0, 14)>
#map2 = affine_mapd0) -> (d0)>
module  {
  func @test_matmul(%arg0: tensor1x14x19xf32>, %arg1: tensor1x19x28xf32>) -> tensor1x14x28xf32> {

```text
    %c12 = constant 12 : index
    %c24 = constant 24 : index
    %cst = constant 0.000000e+00 : f32
    %c76 = constant 76 : index
    %c1 = constant 1 : index
    %c4 = constant 4 : index
    %c28 = constant 28 : index
    %c0 = constant 0 : index
    %c16 = constant 16 : index
    %0 = memref.alloc() : memref1x1x1xf32>
    %1 = memref.buffer_cast %arg0 : memref1x14x19xf32>
    %2 = memref.buffer_cast %arg1 : memref1x19x28xf32>
    %3 = memref.alloc() : memref1x14x28xf32>
    %4 = memref.alloc() : memref1x1x1xf32, 1>
    %5 = memref.alloc() : memref1xi32>
    affine.dma_start %0[%c0, %c0, %c0], %4[%c0, %c0, %c0], %5[%c0], %c1 : memref1x1x1xf32>, memref1x1x1xf32, 1>, memref1xi32>
    affine.dma_wait %5[%c0], %c1 : memref1xi32>
    %6 = memref.alloc() : memref1xi32>
    %7 = memref.alloc() : memref2x1x4x19xf32, 1>
    %8 = memref.alloc() : memref2x1xi32>
    affine.dma_start %1[0, %c0, 0], %7[(%c0 floordiv 4) mod 2, 0, 0, 0], %8[(%c0 floordiv 4) mod 2, 0], %c76 : memref1x14x19xf32>, memref2x1x4x19xf32, 1>, memref2x1xi32>
    affine.for %arg2 = 4 to 16 step 4 {
      affine.dma_start %1[0, %arg2, 0], %7[(%arg2 floordiv 4) mod 2, 0, 0, 0], %8[(%arg2 floordiv 4) mod 2, 0], %c76 : memref1x14x19xf32>, memref2x1x4x19xf32, 1>, memref2x1xi32>
      %15 = affine.apply #map0(%arg2)
      affine.dma_wait %8[(%15 floordiv 4) mod 2, 0], %c76 : memref2x1xi32>
      %16 = memref.alloc() : memref2x1x19x4xf32, 1>
      %17 = memref.alloc() : memref2x1xi32>
      affine.dma_start %2[0, 0, %c0], %16[(%c0 floordiv 4) mod 2, 0, 0, 0], %17[(%c0 floordiv 4) mod 2, 0], %c76, %c28, %c4 : memref1x19x28xf32>, memref2x1x19x4xf32, 1>, memref2x1xi32>
      affine.for %arg3 = 4 to 28 step 4 {
        affine.dma_start %2[0, 0, %arg3], %16[(%arg3 floordiv 4) mod 2, 0, 0, 0], %17[(%arg3 floordiv 4) mod 2, 0], %c76, %c28, %c4 : memref1x19x28xf32>, memref2x1x19x4xf32, 1>, memref2x1xi32>
        %21 = affine.apply #map0(%arg3)
        affine.dma_wait %17[(%21 floordiv 4) mod 2, 0], %c76 : memref2x1xi32>
        %22 = memref.alloc() : memref1x4x4xf32, 1>
        %23 = memref.alloc() : memref1xi32>
        affine.dma_start %3[0, %15, %21], %22[%c0, %c0, %c0], %23[%c0], %c16, %c28, %c4 : memref1x14x28xf32>, memref1x4x4xf32, 1>, memref1xi32>
        affine.dma_wait %23[%c0], %c16 : memref1xi32>
        %24 = memref.alloc() : memref1xi32>
        affine.for %arg4 = #map0(%arg2) to min #map1(%arg2) {
          affine.for %arg5 = #map0(%arg3) to #map2(%arg3) {
            affine.store %cst, %4[0, 0, 0] : memref1x1x1xf32, 1>
            %25 = affine.load %4[0, 0, 0] : memref1x1x1xf32, 1>
            affine.store %25, %22[0, %arg4 - %arg2 + 4, %arg5 - %arg3 + 4] : memref1x4x4xf32, 1>
            affine.for %arg6 = 0 to 19 {
              %26 = affine.load %7[%arg2 floordiv 4 - ((%arg2 floordiv 4 - 1) floordiv 2) * 2 - 1, 0, %arg4 - %arg2 + 4, %arg6] : memref2x1x4x19xf32, 1>
              %27 = affine.load %16[%arg3 floordiv 4 - ((%arg3 floordiv 4 - 1) floordiv 2) * 2 - 1, 0, %arg6, %arg5 - %arg3 + 4] : memref2x1x19x4xf32, 1>
              %28 = affine.load %22[0, %arg4 - %arg2 + 4, %arg5 - %arg3 + 4] : memref1x4x4xf32, 1>
              %29 = mulf %26, %27 : f32
              %30 = addf %28, %29 : f32
              affine.store %30, %22[0, %arg4 - %arg2 + 4, %arg5 - %arg3 + 4] : memref1x4x4xf32, 1>
            }
          }
        }
        affine.dma_start %22[%c0, %c0, %c0], %3[0, %15, %21], %24[%c0], %c16, %c28, %c4 : memref1x4x4xf32, 1>, memref1x14x28xf32>, memref1xi32>
        affine.dma_wait %24[%c0], %c16 : memref1xi32>
        memref.dealloc %24 : memref1xi32>
        memref.dealloc %23 : memref1xi32>
        memref.dealloc %22 : memref1x4x4xf32, 1>
      }
      affine.dma_wait %17[(%c24 floordiv 4) mod 2, 0], %c76 : memref2x1xi32>
      %18 = memref.alloc() : memref1x4x4xf32, 1>
      %19 = memref.alloc() : memref1xi32>
      affine.dma_start %3[0, %15, %c24], %18[%c0, %c0, %c0], %19[%c0], %c16, %c28, %c4 : memref1x14x28xf32>, memref1x4x4xf32, 1>, memref1xi32>
      affine.dma_wait %19[%c0], %c16 : memref1xi32>
      %20 = memref.alloc() : memref1xi32>
      affine.for %arg3 = #map0(%arg2) to min #map1(%arg2) {
        affine.for %arg4 = 24 to 28 {
          affine.store %cst, %4[0, 0, 0] : memref1x1x1xf32, 1>
          %21 = affine.load %4[0, 0, 0] : memref1x1x1xf32, 1>
          affine.store %21, %18[0, %arg3 - %arg2 + 4, %arg4 - 24] : memref1x4x4xf32, 1>
          affine.for %arg5 = 0 to 19 {
            %22 = affine.load %7[%arg2 floordiv 4 - ((%arg2 floordiv 4 - 1) floordiv 2) * 2 - 1, 0, %arg3 - %arg2 + 4, %arg5] : memref2x1x4x19xf32, 1>
            %23 = affine.load %16[0, 0, %arg5, %arg4 - 24] : memref2x1x19x4xf32, 1>
            %24 = affine.load %18[0, %arg3 - %arg2 + 4, %arg4 - 24] : memref1x4x4xf32, 1>
            %25 = mulf %22, %23 : f32
            %26 = addf %24, %25 : f32
            affine.store %26, %18[0, %arg3 - %arg2 + 4, %arg4 - 24] : memref1x4x4xf32, 1>
          }
        }
      }
      affine.dma_start %18[%c0, %c0, %c0], %3[0, %15, %c24], %20[%c0], %c16, %c28, %c4 : memref1x4x4xf32, 1>, memref1x14x28xf32>, memref1xi32>
      affine.dma_wait %20[%c0], %c16 : memref1xi32>
      memref.dealloc %20 : memref1xi32>
      memref.dealloc %19 : memref1xi32>
      memref.dealloc %18 : memref1x4x4xf32, 1>
      memref.dealloc %17 : memref2x1xi32>
      memref.dealloc %16 : memref2x1x19x4xf32, 1>
    }
    affine.dma_wait %8[(%c12 floordiv 4) mod 2, 0], %c76 : memref2x1xi32>
    %9 = memref.alloc() : memref2x1x19x4xf32, 1>
    %10 = memref.alloc() : memref2x1xi32>
    affine.dma_start %2[0, 0, %c0], %9[(%c0 floordiv 4) mod 2, 0, 0, 0], %10[(%c0 floordiv 4) mod 2, 0], %c76, %c28, %c4 : memref1x19x28xf32>, memref2x1x19x4xf32, 1>, memref2x1xi32>
    affine.for %arg2 = 4 to 28 step 4 {
      affine.dma_start %2[0, 0, %arg2], %9[(%arg2 floordiv 4) mod 2, 0, 0, 0], %10[(%arg2 floordiv 4) mod 2, 0], %c76, %c28, %c4 : memref1x19x28xf32>, memref2x1x19x4xf32, 1>, memref2x1xi32>
      %15 = affine.apply #map0(%arg2)
      affine.dma_wait %10[(%15 floordiv 4) mod 2, 0], %c76 : memref2x1xi32>
      %16 = memref.alloc() : memref1x4x4xf32, 1>
      %17 = memref.alloc() : memref1xi32>
      affine.dma_start %3[0, %c12, %15], %16[%c0, %c0, %c0], %17[%c0], %c16, %c28, %c4 : memref1x14x28xf32>, memref1x4x4xf32, 1>, memref1xi32>
      affine.dma_wait %17[%c0], %c16 : memref1xi32>
      %18 = memref.alloc() : memref1xi32>
      affine.for %arg3 = 12 to 14 {
        affine.for %arg4 = #map0(%arg2) to #map2(%arg2) {
          affine.store %cst, %4[0, 0, 0] : memref1x1x1xf32, 1>
          %19 = affine.load %4[0, 0, 0] : memref1x1x1xf32, 1>
          affine.store %19, %16[0, %arg3 - 12, %arg4 - %arg2 + 4] : memref1x4x4xf32, 1>
          affine.for %arg5 = 0 to 19 {
            %20 = affine.load %7[1, 0, %arg3 - 12, %arg5] : memref2x1x4x19xf32, 1>
            %21 = affine.load %9[%arg2 floordiv 4 - ((%arg2 floordiv 4 - 1) floordiv 2) * 2 - 1, 0, %arg5, %arg4 - %arg2 + 4] : memref2x1x19x4xf32, 1>
            %22 = affine.load %16[0, %arg3 - 12, %arg4 - %arg2 + 4] : memref1x4x4xf32, 1>
            %23 = mulf %20, %21 : f32
            %24 = addf %22, %23 : f32
            affine.store %24, %16[0, %arg3 - 12, %arg4 - %arg2 + 4] : memref1x4x4xf32, 1>
          }
        }
      }
      affine.dma_start %16[%c0, %c0, %c0], %3[0, %c12, %15], %18[%c0], %c16, %c28, %c4 : memref1x4x4xf32, 1>, memref1x14x28xf32>, memref1xi32>
      affine.dma_wait %18[%c0], %c16 : memref1xi32>
      memref.dealloc %18 : memref1xi32>
      memref.dealloc %17 : memref1xi32>
      memref.dealloc %16 : memref1x4x4xf32, 1>
    }
    affine.dma_wait %10[(%c24 floordiv 4) mod 2, 0], %c76 : memref2x1xi32>
    %11 = memref.alloc() : memref1x4x4xf32, 1>
    %12 = memref.alloc() : memref1xi32>
    affine.dma_start %3[0, %c12, %c24], %11[%c0, %c0, %c0], %12[%c0], %c16, %c28, %c4 : memref1x14x28xf32>, memref1x4x4xf32, 1>, memref1xi32>
    affine.dma_wait %12[%c0], %c16 : memref1xi32>
    %13 = memref.alloc() : memref1xi32>
    affine.for %arg2 = 12 to 14 {
      affine.for %arg3 = 24 to 28 {
        affine.store %cst, %4[0, 0, 0] : memref1x1x1xf32, 1>
        %15 = affine.load %4[0, 0, 0] : memref1x1x1xf32, 1>
        affine.store %15, %11[0, %arg2 - 12, %arg3 - 24] : memref1x4x4xf32, 1>
        affine.for %arg4 = 0 to 19 {
          %16 = affine.load %7[1, 0, %arg2 - 12, %arg4] : memref2x1x4x19xf32, 1>
          %17 = affine.load %9[0, 0, %arg4, %arg3 - 24] : memref2x1x19x4xf32, 1>
          %18 = affine.load %11[0, %arg2 - 12, %arg3 - 24] : memref1x4x4xf32, 1>
          %19 = mulf %16, %17 : f32
          %20 = addf %18, %19 : f32
          affine.store %20, %11[0, %arg2 - 12, %arg3 - 24] : memref1x4x4xf32, 1>
        }
      }
    }
    affine.dma_start %11[%c0, %c0, %c0], %3[0, %c12, %c24], %13[%c0], %c16, %c28, %c4 : memref1x4x4xf32, 1>, memref1x14x28xf32>, memref1xi32>
    affine.dma_wait %13[%c0], %c16 : memref1xi32>
    memref.dealloc %13 : memref1xi32>
    memref.dealloc %12 : memref1xi32>
    memref.dealloc %11 : memref1x4x4xf32, 1>
    memref.dealloc %10 : memref2x1xi32>
    memref.dealloc %9 : memref2x1x19x4xf32, 1>
    memref.dealloc %8 : memref2x1xi32>
    memref.dealloc %7 : memref2x1x4x19xf32, 1>
    affine.dma_start %4[%c0, %c0, %c0], %0[%c0, %c0, %c0], %6[%c0], %c1 : memref1x1x1xf32, 1>, memref1x1x1xf32>, memref1xi32>
    affine.dma_wait %6[%c0], %c1 : memref1xi32>
    memref.dealloc %6 : memref1xi32>
    memref.dealloc %5 : memref1xi32>
    memref.dealloc %4 : memref1x1x1xf32, 1>
    %14 = memref.tensor_load %3 : memref1x14x28xf32>
    return %14 : tensor1x14x28xf32>
  }
}
```


To be continued...
