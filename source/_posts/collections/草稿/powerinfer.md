
# 背景
1. 在transformer block中，主要的权重参数集中在FFN层，以llama结构为例，
	1. attention部分的权重为 QKVO 变换的，大小约为 $2 * hidden * hidden = 4 * 4096 * 4096$
	2. FFN 层为 up、gate、 down三部分为 $hidden * intermediate * 3 = 4096 * 11008 * 3$
	3. 比例大概为 1 ：2。 粗略估计 FFN权重约 65 %。

3. DejaVu 
    - 高达 85% 的模型参数在推理阶段是上下文稀疏的，对于特定的输入，只有一小部分注意力头和前馈网络中的参数对模型输出有显著影响
    - MLP 层上的平均稀疏性则发现超过95%的MLP参数都可以不参与推理
    ![alt text](assets/image-3.png)
3. LLM in a Flash 的论文通过实验表明，激活函数由 Silu 转换为 Relu时， 实际中间的激活稀疏度很高 **大于 90%** 
	> Using active neurons of predictor would require about 10% of the DRAM memory capacity on average
	
    - FFN部分，只有**非稀疏段**根据需要动态加载到RAM中
    - ReLU激活函数自然会在FFN的中间输出中引起 **超过90%** 的稀疏性
    - low rank predictor 来识别由ReLU 输出为零的元素；预测器只需要当前层的注意力模块输出，而不需要前一层的FFN模块
    - 滑动窗口技术来管理冷热神经元，出发点时相近的神经元具有相似的激活分布。
    - predictor 在OPT 6.7B模型中平均实现 5% 的假阴性 和 7% 的假阳性，但是对最终结果影响不那么大，各种参数几乎不下降（如果准确率更低一点影响多大）
    - 滑动窗口和稀疏性预测可以仅需要Flash加载2%的FFN层。
    ![alt text](assets/image-2.png)

4. Powerinfer
    - 幂律分布的神经元被类似的预测器分为 hot/cold 等类型，hot 神经元在 GPU 上算，cold 神经元在 CPU 上算
    - 数据分配到 GPU/CPU 是靠一个 offline 的 predictor 来完成
    ![alt text](assets/image-4.png)

4. Flash memory到DRAM的带宽较低，且Flash 的功耗要比DDR高，频繁的换入换出需要极高的稀释比例
![throughput random](assets/image-1.png)
![ddr bandwidth](assets/image.png)

# 问题

- 如何快速识别出哪些模型参数是**必要的**
- 如何加快由Flash memory到DRAM的传输效率

# 介绍
powerinfer2 可以说是为了
## 总体框架

![alt text](assets/image-5.png)

## Prefill

Prefill 的处理比较简单，是大多数都会考虑到的思路，降低内存占用就要逐层计算，逐层加载。
![[assets/Pasted image 20240730221237.png]]
这里有一个CPU的大核负责加载，四个线程负责反量化，NPU负责计算。
## Decoding
下面来到本文的重头戏，Decode优化。
![[assets/Pasted image 20240802221541.png]]



## 总结



## 数据对比




