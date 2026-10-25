---
title: 基于 Elasticsearch BBQ 量化的距离计算详解
date: "2025-11-04 00:00:00"
updated: "2025-11-04 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/基于-Elasticsearch-BBQ-量化的距离计算详解/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1969089197756379225
---


基于 Elasticsearch BBQ 量化的距离计算详解

adderllyer

fighting~~~

收录于 · 数据库内核

2 人赞同了该文章

1. 概述
BBQ (Better Binary Quantization) 是 Elasticsearch 中实现的一种高级向量量化方法，用于大规模相似度搜索。BBQ 通过将 float32 向量压缩到 bit 级别（1-bit、2-bit、4-bit），在保持较高搜索精度的同时实现极致的存储压缩和计算效率。

核心优势：

- 极致压缩：将 float32（32位）压缩到 1-4 bit，压缩率高达 32x+
- 计算高效：使用 bit 级别计算，大幅减少计算成本
- 精度保持：通过优化的量化区间和纠正因子，保持较高的搜索相关性本文档重点：详细解析 BBQ 量化后的距离计算过程，包括量化向量点积计算、纠正因子应用和最终相似度分数计算。

2. BBQ 量化流程回顾

2.1 量化步骤
BBQ 量化过程包含以下关键步骤：

1. 向量中心化 (Centering)
   residual = vector - centroid
   ↓
2. 初始化量化区间 (Init Interval)
   使用 MSE 最优网格初始化 [a, b]
   ↓
3. 优化量化区间 (Optimize Intervals) ⭐
   使用坐标下降法最小化量化损失
   ↓
4. 向量量化 (Quantization)
   将 residual 量化到 [0, 2^bits-1] 区间
   ↓
5. 生成纠正因子 (Correction Factors)
   存储量化区间和额外纠正项

2.2 量化结果结构
代码位置：OptimizedScalarQuantizer.java

```cpp
public record QuantizationResult(
    float lowerInterval,      // 量化区间下界 a
    float upperInterval,       // 量化区间上界 b
    float additionalCorrection, // 额外纠正项（范数或点积相关）
    int quantizedComponentSum  // 量化值之和 sum(q_i)
```

) {}
存储的纠正因子：

- lowerInterval (ax 或 ay)：量化区间下界
- upperInterval (bx 或 by)：量化区间上界
- additionalCorrection：额外纠正项  
- 欧氏距离：存储 ||residual||²（平方范数）
- 点积/余弦：存储 residual · centroid（质心点积）

- quantizedComponentSum (x1 或 y1)：量化值之和
3. 向量打包格式

3.1 文档向量打包（1-bit）
代码位置：ESVectorUtil.packAsBinary()

```cpp
public static void packAsBinary(int[] vector, byte[] packed) {
    // 将每 8 个 0/1 值打包到一个字节中
    // 每个字节存储 8 个维度的量化值
    for (int i = 0; i   vector.length; i += 8) {
        byte result = (byte) (
            (vector[i]    7) |
            (vector[i+1]    6) |
            (vector[i+2]    5) |
            (vector[i+3]    4) |
            (vector[i+4]    3) |
            (vector[i+5]    2) |
            (vector[i+6]    1) |
            vector[i+7]
        );
        packed[i/8] = result;
    }
}
```

打包格式示例：

- 输入：[1, 0, 1, 1, 0, 0, 1, 0] (8个维度)
- 输出：[0b10110010] = 0xB2 (1个字节)存储大小：dimensions / 8 字节

3.2 查询向量打包（4-bit）
代码位置：ESVectorUtil.transposeHalfByte()

```cpp
public static void transposeHalfByte(int[] q, byte[] quantQueryByte) {
    // 将 4-bit 量化的查询向量进行转置打包
    // 将每个维度的 4 个 bit 分别提取到 4 个 stripe 中
    // stripe[0]: 所有维度的第 0 位
    // stripe[1]: 所有维度的第 1 位
    // stripe[2]: 所有维度的第 2 位
    // stripe[3]: 所有维度的第 3 位
}
```

转置打包原理：

假设有 8 个维度，每个维度 4-bit 量化值：

维度:  [d0, d1, d2, d3, d4, d5, d6, d7]
量化值: [5,  12, 3,  8,  15, 1,  9,  6]  (二进制: 0101, 1100, 0011, 1000, ...)

转置后：
stripe[0] (最低位): [1, 0, 1, 0, 1, 1, 1, 0]  → 字节: 0b10101110
stripe[1]:          [0, 0, 1, 0, 1, 0, 0, 1]  → 字节: 0b00101001
stripe[2]:          [1, 1, 0, 1, 1, 0, 0, 1]  → 字节: 0b11011001
stripe[3] (最高位): [0, 1, 0, 1, 1, 0, 1, 0]  → 字节: 0b01011010
存储大小：dimensions * 4 / 8 字节 = dimensions / 2 字节

为什么需要转置？：

- 转置后，每个 stripe 的所有位可以并行进行位运算
- 便于使用 bitwise AND 操作计算点积
- 支持高效的 SIMD 向量化计算
4. 量化向量点积计算

4.1 核心算法：ipByteBinByte
代码位置：ESVectorUtil.ipByteBinByte() → DefaultESVectorUtilSupport.ipByteBinByteImpl()

```cpp
public static long ipByteBinByteImpl(byte[] q, byte[] d) {
    long ret = 0;
    int size = d.length;  // 文档向量的字节数

    // q 是转置后的 4-bit 查询向量，包含 4 个 stripe
    // d 是 1-bit 文档向量，每个字节存储 8 个维度的 bit
    // q.length = d.length * 4 (因为 q 有 4 个 stripe)

    for (int s = 0; s   B_QUERY; s++) {  // B_QUERY = 4，遍历 4 个 stripe
        int r = 0;
        long stripeRet = 0;

        // 对每个 stripe，计算 q[stripe]   d 的 bit count
        // 使用 32 位整数批量处理以提高效率
        for (final int upperBound = d.length   -Integer.BYTES; 
             r   upperBound; 
             r += Integer.BYTES) {
            int qStripe = (int) BitUtil.VH_NATIVE_INT.get(q, s * size + r);
            int dValue = (int) BitUtil.VH_NATIVE_INT.get(d, r);
            stripeRet += Integer.bitCount(qStripe   dValue);
        }

        // 处理尾部字节
        for (; r   d.length; r++) {
            stripeRet += Integer.bitCount((q[s * size + r]   d[r])   0xFF);
        }

        // 将 stripe 结果左移 s 位并累加
        // 相当于：ret += stripeRet * (2^s)
        ret += stripeRet    s;
    }

    return ret;
}
```


4.2 算法原理详解

4.2.1 数学推导
对于量化向量，原始点积可以表示为：

设：
- q_quant[i] ∈ [0, 15] 是查询向量第 i 维的 4-bit 量化值
- d_quant[i] ∈ {0, 1} 是文档向量第 i 维的 1-bit 量化值
- ax, lx 是文档向量的量化区间参数
- ay, ly 是查询向量的量化区间参数

量化后的值可以重构为：
q_reconstructed[i] = ay + ly * q_quant[i] / 15
d_reconstructed[i] = ax + lx * d_quant[i]

原始点积近似为：
 q, d  ≈ Σ(ay + ly * q_quant[i]/15) * (ax + lx * d_quant[i])

```text
      = Σ(ay * ax + ay * lx * d_quant[i] + ax * ly * q_quant[i]/15 + lx * ly * q_quant[i] * d_quant[i] / 15)
      = ay * ax * dims + ay * lx * Σ(d_quant[i]) + ax * ly * Σ(q_quant[i])/15 + lx * ly * Σ(q_quant[i] * d_quant[i]) / 15
```


4.2.2 Bit 级别计算
关键观察：

- q_quant[i] * d_quant[i] 的计算可以通过位运算实现
- 由于 d_quant[i] ∈ {0, 1}，当 d_quant[i] = 0 时，乘积为 0；当 d_quant[i] = 1 时，乘积为 q_quant[i]
- 因此：Σ(q_quant[i] * d_quant[i]) = 选择 d_quant[i] = 1 的所有 q_quant[i] 并求和转置打包的作用：

- 查询向量被转置成 4 个 stripe，每个 stripe 存储所有维度的同一 bit 位
- 文档向量是 1-bit，每个字节存储 8 个维度的 bit
- 通过 q[stripe]   d 可以快速选择出 d = 1 的位置对应的查询向量 bit
- 使用 Integer.bitCount() 计算每个 stripe 中匹配的 bit 数量
- 最后通过位移和累加重构完整的量化值示例：

假设维度 0: q_quant[0] = 5 (二进制: 0101), d_quant[0] = 1
维度 1: q_quant[1] = 12 (二进制: 1100), d_quant[1] = 0

转置后的查询向量：
stripe[0]: [1, 0, ...]  (最低位)
stripe[1]: [0, 0, ...]
stripe[2]: [1, 1, ...]
stripe[3]: [0, 1, ...]  (最高位)

文档向量: [1, 0, ...] (打包为字节)

计算：
stripe[0]   d = [1, 0, ...]   [1, 0, ...] = [1, 0, ...]
  bitCount = 1 (只有维度 0 匹配)

stripe[1]   d = [0, 0, ...]   [1, 0, ...] = [0, 0, ...]
  bitCount = 0

stripe[2]   d = [1, 1, ...]   [1, 0, ...] = [1, 0, ...]
  bitCount = 1

stripe[3]   d = [0, 1, ...]   [1, 0, ...] = [0, 0, ...]
  bitCount = 0

结果 = 1 * 2^0 + 0 * 2^1 + 1 * 2^2 + 0 * 2^3 = 1 + 4 = 5

这正是 q_quant[0] * d_quant[0] = 5 * 1 = 5

4.3 性能优化
SIMD 向量化：

- 使用 Integer.BYTES (4字节) 和 Long.BYTES (8字节) 批量处理
- 利用 CPU 的 POPCNT (Population Count) 指令快速计算 bit count
- 在支持的平台上，可以使用 SIMD 指令并行处理多个字节时间复杂度：O(dimensions)，比传统点积计算快得多（因为只需要位运算）

5. 距离计算完整流程

5.1 核心函数：quantizedScore
代码位置：ES818BinaryFlatVectorsScorer.quantizedScore()

```cpp
private static float quantizedScore(
    int dims,                                    // 向量维度
    VectorSimilarityFunction similarityFunction, // 相似度函数
    float centroidDp,                            // 质心点积  c, c 
    byte[] q,                                    // 量化查询向量（转置打包）
    OptimizedScalarQuantizer.QuantizationResult queryCorrections,   // 查询向量纠正因子
    byte[] d,                                    // 量化文档向量（二进制打包）
    OptimizedScalarQuantizer.QuantizationResult indexCorrections   // 文档向量纠正因子
```

) {

```text
    // 步骤 1: 计算量化向量的点积（bit 级别计算）
    float qcDist = ESVectorUtil.ipByteBinByte(q, d);

    // 步骤 2: 提取纠正因子
    float x1 = indexCorrections.quantizedComponentSum();  // 文档向量量化值之和
    float ax = indexCorrections.lowerInterval();          // 文档向量量化区间下界
    float lx = indexCorrections.upperInterval() - ax;     // 文档向量量化区间宽度
    float ay = queryCorrections.lowerInterval();          // 查询向量量化区间下界
    float ly = (queryCorrections.upperInterval() - ay) * FOUR_BIT_SCALE;  // 查询向量量化区间宽度（归一化）
    float y1 = queryCorrections.quantizedComponentSum();   // 查询向量量化值之和

    // 步骤 3: 重构原始点积
    // score =  q_reconstructed, d_reconstructed 
    float score = ax * ay * dims + ay * lx * x1 + ax * ly * y1 + lx * ly * qcDist;

    // 步骤 4: 根据相似度函数应用纠正
    if (similarityFunction == EUCLIDEAN) {
        // 欧氏距离：需要反转并应用平方范数纠正
        score = queryCorrections.additionalCorrection() 
              + indexCorrections.additionalCorrection() 
              - 2 * score;
        return Math.max(1 / (1f + score), 0);
    } else {
        // 点积/余弦：应用点积纠正
        score += queryCorrections.additionalCorrection() 
               + indexCorrections.additionalCorrection() 
               - centroidDp;
        if (similarityFunction == MAXIMUM_INNER_PRODUCT) {
            return VectorUtil.scaleMaxInnerProductScore(score);
        }
        return Math.max((1f + score) / 2f, 0);
    }
}
```


5.2 点积重构公式推导

5.2.1 量化值重构
对于量化后的向量，可以重构为：

查询向量重构：
q_reconstructed[i] = ay + ly * (q_quant[i] / 15)
                   = ay + ly * (q_quant[i] * FOUR_BIT_SCALE)
                   
文档向量重构：
d_reconstructed[i] = ax + lx * d_quant[i]

5.2.2 点积展开
 q, d  = Σ(q_reconstructed[i] * d_reconstructed[i])

```text
       = Σ((ay + ly * q_quant[i]/15) * (ax + lx * d_quant[i]))
       = Σ(ay * ax + ay * lx * d_quant[i] + ax * ly * q_quant[i]/15 + lx * ly * q_quant[i] * d_quant[i]/15)
```

       
展开各项：
1. Σ(ay * ax) = ay * ax * dims
2. Σ(ay * lx * d_quant[i]) = ay * lx * Σ(d_quant[i]) = ay * lx * x1
3. Σ(ax * ly * q_quant[i]/15) = ax * ly * Σ(q_quant[i])/15 = ax * ly * y1 * FOUR_BIT_SCALE
4. Σ(lx * ly * q_quant[i] * d_quant[i]/15) = lx * ly * Σ(q_quant[i] * d_quant[i]) * FOUR_BIT_SCALE
                                             = lx * ly * qcDist * FOUR_BIT_SCALE

其中：
- x1 = Σ(d_quant[i])  (文档向量量化值之和)
- y1 = Σ(q_quant[i])  (查询向量量化值之和)
- qcDist = Σ(q_quant[i] * d_quant[i])  (通过 ipByteBinByte 计算)
注意：在代码中，ly 已经包含了 FOUR_BIT_SCALE：

```text
float ly = (queryCorrections.upperInterval() - ay) * FOUR_BIT_SCALE;
```

因此最终公式为：

score = ax * ay * dims + ay * lx * x1 + ax * ly * y1 + lx * ly * qcDist

5.3 纠正因子应用

5.3.1 中心化纠正
由于量化是在中心化后的 residual 上进行的，需要纠正回原始向量：

原始向量：
q = centroid + q_residual
d = centroid + d_residual

原始点积：
 q, d  =  centroid + q_residual, centroid + d_residual 

```text
       =  centroid, centroid  +  centroid, d_residual  +  q_residual, centroid  +  q_residual, d_residual 
       = centroidDp +  centroid, d_residual  +  q_residual, centroid  +  q_residual, d_residual 
```


5.3.2 量化误差纠正
量化后的点积是  q_residual_quantized, d_residual_quantized ，需要纠正为  q_residual, d_residual 。

纠正项：

- queryCorrections.additionalCorrection()：查询向量的量化误差相关项
- indexCorrections.additionalCorrection()：文档向量的量化误差相关项对于不同相似度函数：

点积/余弦相似度：

score += queryCorrections.additionalCorrection() 

```text
       + indexCorrections.additionalCorrection() 
       - centroidDp;
```

这里的 additionalCorrection 存储的是 residual · centroid，用于纠正中心化带来的误差。

欧氏距离：

score = queryCorrections.additionalCorrection() 

```text
      + indexCorrections.additionalCorrection() 
      - 2 * score;
```

这里的 additionalCorrection 存储的是 ||residual||²，用于计算平方距离：

||q - d||² = ||(centroid + q_residual) - (centroid + d_residual)||²

```text
           = ||q_residual - d_residual||²
           = ||q_residual||² + ||d_residual||² - 2 *  q_residual, d_residual 
           = queryCorrections.additionalCorrection() 
           + indexCorrections.additionalCorrection() 
           - 2 * score
```


6. 不同相似度函数的处理

6.1 欧氏距离 (EUCLIDEAN)
计算流程：

```text
if (similarityFunction == EUCLIDEAN) {
    // 1. 计算量化点积
    float score = ax * ay * dims + ay * lx * x1 + ax * ly * y1 + lx * ly * qcDist;

    // 2. 转换为平方距离
    score = queryCorrections.additionalCorrection()  // ||q_residual||²
          + indexCorrections.additionalCorrection()  // ||d_residual||²
          - 2 * score;                                // -2 *  q_residual, d_residual 

    // 3. 转换为相似度分数（距离越小，分数越高）
    return Math.max(1 / (1f + score), 0);
}
```

数学推导：

distance² = ||q - d||²

```text
          = ||(centroid + q_residual) - (centroid + d_residual)||²
          = ||q_residual - d_residual||²
          = ||q_residual||² + ||d_residual||² - 2 *  q_residual, d_residual 
          ≈ additionalCorrection_q + additionalCorrection_d - 2 * quantized_score
```


similarity = 1 / (1 + distance²)

6.2 点积 (DOT_PRODUCT)
计算流程：

```text
else {
    // 1. 计算量化点积
    float score = ax * ay * dims + ay * lx * x1 + ax * ly * y1 + lx * ly * qcDist;

    // 2. 应用纠正因子
    score += queryCorrections.additionalCorrection() 
           + indexCorrections.additionalCorrection() 
           - centroidDp;

    // 3. 归一化到 [0, 1]
    return Math.max((1f + score) / 2f, 0);
}
```

数学推导：

dot_product =  q, d 

```text
            =  centroid + q_residual, centroid + d_residual 
            ≈ quantized_score + corrections - centroidDp
```


similarity = (1 + dot_product) / 2  (归一化到 [0, 1])

6.3 最大内积 (MAXIMUM_INNER_PRODUCT)
计算流程：

```text
if (similarityFunction == MAXIMUM_INNER_PRODUCT) {
    float score = ...;  // 同点积计算
    return VectorUtil.scaleMaxInnerProductScore(score);
}
```

特点：使用 scaleMaxInnerProductScore 进行额外的缩放处理，确保分数范围合理。

6.4 余弦相似度 (COSINE)
计算流程：

```text
// 同点积计算，但向量需要预先归一化
// 余弦相似度 = 归一化向量的点积
```

注意：余弦相似度要求向量已经归一化，因此在量化前向量必须是单位向量。

7. 批量评分优化

7.1 批量评分函数
代码位置：ESNextOSQVectorsScorer.scoreBulk()

```cpp
public float scoreBulk(
    byte[] q,                                    // 量化查询向量
    float queryLowerInterval,
    float queryUpperInterval,
    int queryComponentSum,
    float queryAdditionalCorrection,
    VectorSimilarityFunction similarityFunction,
    float centroidDp,
    float[] scores                              // 输出：批量评分结果
```

) throws IOException {

```cpp
    // 1. 批量计算量化点积
    quantizeScoreBulk(q, BULK_SIZE, scores);

    // 2. 批量读取纠正因子
    in.readFloats(lowerIntervals, 0, BULK_SIZE);
    in.readFloats(upperIntervals, 0, BULK_SIZE);
    for (int i = 0; i   BULK_SIZE; i++) {
        targetComponentSums[i] = Short.toUnsignedInt(in.readShort());
    }
    in.readFloats(additionalCorrections, 0, BULK_SIZE);

    // 3. 批量应用纠正因子并计算最终分数
    float maxScore = Float.NEGATIVE_INFINITY;
    for (int i = 0; i   BULK_SIZE; i++) {
        scores[i] = score(
            queryLowerInterval, queryUpperInterval, queryComponentSum, queryAdditionalCorrection,
            similarityFunction, centroidDp,
            lowerIntervals[i], upperIntervals[i], 
            targetComponentSums[i], additionalCorrections[i],
            scores[i]  // 量化点积结果
        );
        if (scores[i]   maxScore) {
            maxScore = scores[i];
        }
    }
    return maxScore;
}
```


7.2 性能优化策略

- 批量 I/O：一次性读取多个向量的纠正因子，减少 I/O 开销
- SIMD 优化：使用向量化指令并行计算多个量化点积
- 缓存友好：纠正因子按顺序存储，提高缓存命中率
- 批量大小：BULK_SIZE = 16，平衡内存使用和性能
8. 不同量化编码策略

8.1 ONE_BIT_4BIT_QUERY (默认)

- 文档向量：1-bit 量化
- 查询向量：4-bit 量化
- 打包：  
- 文档：packAsBinary() - 每个字节 8 个维度
- 查询：transposeHalfByte() - 4 个 stripe

- 适用场景：内存极度受限，优先考虑存储压缩
8.2 TWO_BIT_4BIT_QUERY

- 文档向量：2-bit 量化
- 查询向量：4-bit 量化
- 打包：使用 packDibit 打包文档向量
- 适用场景：平衡存储和精度
8.3 FOUR_BIT_SYMMETRIC

- 文档向量：4-bit 量化
- 查询向量：4-bit 量化
- 打包：对称编码，都使用 transposeHalfByte
- 适用场景：对精度要求较高
8.4 距离计算的统一性
无论使用哪种量化编码策略，距离计算的核心流程都是一致的：

- 计算量化向量的点积（使用 bit 级别操作）
- 提取纠正因子
- 重构原始点积
- 根据相似度函数应用纠正并计算最终分数不同策略的区别主要在于：

- 量化 bit 数不同，影响 qcDist 的计算方式
- 打包格式不同，但最终都通过 ipByteBinByte 或类似函数计算点积
- 纠正因子的计算方式相同
9. 实现细节与优化

9.1 Bit 级别计算的 SIMD 优化
代码位置：PanamaESVectorUtilSupport.ipByteBinByteImpl() (Java 21+)

在支持的平台上，可以使用 SIMD 指令优化：

```text
// 使用 SIMD 指令并行处理多个字节
// 利用 CPU 的 POPCNT 指令快速计算 bit count
// 支持 AVX2、AVX-512 等指令集
```


9.2 内存布局优化
纠正因子存储顺序：

[量化向量] [lowerInterval] [upperInterval] [quantizedComponentSum] [additionalCorrection]
这种顺序有利于：

- 批量读取多个向量的纠正因子
- 提高缓存命中率
- 减少内存碎片
9.3 精度与性能权衡
量化 bit 数选择：

- 1-bit：最高压缩率，但精度损失较大，需要更精确的纠正因子
- 2-bit：平衡压缩率和精度
- 4-bit：较高精度，但压缩率较低查询向量使用更高精度：

- 查询向量数量少，使用 4-bit 可以显著提高搜索精度
- 文档向量数量大，使用 1-bit 可以最大化压缩率
- 通过不对称量化策略实现最佳性能
10. 总结
BBQ 量化的距离计算通过以下关键技术实现高效且精确的相似度搜索：

- 量化向量打包：
 
- 文档向量：1-bit 二进制打包，每个字节 8 个维度
- 查询向量：4-bit 转置打包，4 个 stripe 便于并行计算

- Bit 级别点积计算：
 
- 使用 ipByteBinByte 通过位运算快速计算量化点积
- 利用转置打包格式实现高效的 bit-wise AND 操作
- 支持 SIMD 向量化优化

- 纠正因子应用：
 
- 通过量化区间参数重构原始点积
- 使用 additionalCorrection 纠正中心化和量化误差
- 根据相似度函数类型应用不同的纠正策略

- 性能优化：
 
- 批量评分减少 I/O 开销
- SIMD 指令加速计算
- 缓存友好的内存布局

通过这些优化，BBQ 量化在保持较高搜索精度的同时，实现了极致的存储压缩和计算效率，使得大规模向量相似度搜索成为可能。

编辑于 2025-11-04 17:11・广东
​赞同 2​​添加评论​4 ​喜欢​分享

​申请转载​​

未登录用户

还没有评论，发表第一个评论吧

关于作者

adderllyer
fighting~~~

回答
50
文章
210
关注者
311

​关注他​发私信

大家都在搜
换一换

日本正式允许出口杀伤性武器510 万热
拼多多被罚 15.2 亿且暴力阻碍监管418 万热
19岁女孩挪用1700万当榜一大姐330 万热
为什么流行反向追剧330 万
女子产后被男友起诉退彩礼分娩费330 万热
伊朗最新局势315 万热
库克不再担任苹果 CEO299 万
卡尔南开大学二轮调剂被刷257 万
法庭上有什么趣事247 万
「16 万年一遇」的彗星来了237 万

推荐阅读

arxiv论文速递|AlgoXpert Alpha研究框架：一种严格的IS-WFA-OOS协议用于缓解量化策略过拟合
arxiv论文速递|AlgoXpert Alpha研究框架：一种严格的IS-WFA-OOS协议用于缓解量化策略过拟合作者：The Anh Pham, Bao Chan Nguyen, Nguyet Nguyen ThiarXiv 链接：http://arxiv.org/abs/2603…

质壁分离

推荐系统(一)  FINT：基于特征域交叉的CTR模型
缄默笔记

 论文笔记 GENI-节点重要性评估模型（KDD2019）
Fanis...发表于论文笔记

论文笔记：rStar-Math，如何通过MCTS实现self- evolution
秋茗