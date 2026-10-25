---
title: 多模态大模型的位置编码：MRoPE
date: "2025-11-30 00:00:00"
updated: "2025-11-30 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/多模态大模型的位置编码-MRoPE/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1978600727963276994
---


多模态大模型的位置编码：MRoPE

居丽叶

公众号：居丽叶的大模型视界

29 人赞同了该文章

引言 
从纯文本迈向多模态，最大的挑战之一是如何在 Transformer 的线性序列中，保留图像的二维空间结构与视频的三维时序信息。若简单地沿用 1D 位置编码，图像 Patch 在展平后会丢失关键的空间关联（如垂直相邻关系），视频帧之间的时空逻辑也难以被单一维度捕捉。 

为此，Qwen2-VL 提出了 M-RoPE，一种通用的 3D 旋转位置编码方案。它将位置信息拆解为 Time、Height、Width 三个正交维度，让模型能同时感知序列的先后与空间的时空坐标。 

本文将以原理演进 + 源码拆解为主线，按以下逻辑展开解析：先从基础的 1D RoPE 切入，回顾文本位置编码的数学原理；再拓展至 2D RoPE，说明图像空间结构的编码方法；随后核心讲解 M-RoPE 如何通过新增时间维度实现多模态统一编码；而 position_ids 作为贯穿各类 RoPE 编码的关键输入，将在 1D、2D RoPE 原理铺垫后提前拆解，为后续 M-RoPE 的深入理解奠定基础，最终完整呈现这一让 LLM 精准捕捉多模态位置信息的核心机制。 

纯文字用1D RoPE 
在进入多模态之前，我们需要回顾一下 RoPE 的数学基础。它的核心思想是将位置信息通过“旋转角度”注入到向量中。 

数学原理 

RoPE 的灵感源于复数运算：将 token 的嵌入向量视为复数，通过旋转矩阵改变向量方向，旋转角度与 token 的位置正相关。位置越近的 token，旋转后的向量相似度越高，模型由此捕捉位置关系。 

简化案例（d=2 维度） 

假设某 token 的嵌入向量为\mathbf{x} = \begin{bmatrix} x_1   x_2 \end{bmatrix}，我们将其表示为复数x=x_1+i⋅x_2（i为虚数单位, i2=−1i^2 = -1）。 根据欧拉公式eimθ=cos⁡(mθ)+isin⁡(mθ)e^{im\theta} = \cos(m\theta) + i\sin(m\theta) ，对复数施加旋转操作： 

 \begin{aligned} x'  = x \cdot e^{\mathrm{i} m \theta_1} \\     = (x_1 + \mathrm{i}\, x_2)\bigl(\cos(m\theta_1) + \mathrm{i}\, \sin(m\theta_1)\bigr) \\     = x_1\cos(m\theta_1) + \mathrm{i}\,x_1\sin(m\theta_1)       + \mathrm{i}\,x_2\cos(m\theta_1) + \mathrm{i}^2 x_2\sin(m\theta_1) \\     = \bigl(x_1\cos(m\theta_1) - x_2\sin(m\theta_1)\bigr)       + \mathrm{i}\,\bigl(x_1\sin(m\theta_1) + x_2\cos(m\theta_1)\bigr) \end{aligned} 

 其中：

- m是 token 的位置索引，即第mm 个token；
- θk=10000−2kd\theta_k = 10000^{\frac{-2k}{d}}（预定义频率参数，控制旋转角度的缩放，确保不同位置的旋转差异可区分）。 将复数运算展开为实数矩阵形式，可得： x′=(cos(mθ1)−sin(mθ1)sin(mθ1)cos(mθ1))(x1x2)\mathbf{x'} =  \begin{pmatrix} \cos(m\theta_1)   -\sin(m\theta_1) \\ \sin(m\theta_1)   \cos(m\theta_1) \end{pmatrix} \begin{pmatrix} x_1 \\ x_2 \end{pmatrix}
这个矩阵就是 1D RoPE 的核心 —— 通过旋转向量，将位置信息编码到向量的维度关系中。 

维度扩展：从 2 维子空间到任意维度 d 

实际应用中，token 的嵌入维度 d 远大于 2（如 128、256）。RoPE 的处理方式是：

- 将 d 维向量按顺序两两分组，形成 d/2个复数对（如 [x1,x2]、[x3,x4]、...、[x_{d-1},x_d]）；
- 对每个复数对应用上述旋转操作，使用不同的频率参数 \theta_k （k为分组索引）；
- 将旋转后的复数对重新拼接为 d 维向量，作为最终的位置编码嵌入。 这种分组旋转的设计，让 RoPE 既能适配任意维度，又能保持计算效率（旋转矩阵为对角矩阵，计算量低）: 

省略掉矩阵中的0，就能得到常见的1D RoPE的旋转矩阵: 

图像需要2D RoPE 
当场景从文本拓展到图像，1D RoPE 开始捉襟见肘：图像是 2D 平面结构（高度 H + 宽度 W），如果将图像 patch （按行或按列）展平为 1D 序列，会丢失相邻 patch 的空间关联性（比如同一列的两个 patch，展开成序列后可能相隔数十个 token）。 

2D RoPE 的核心思想是将位置编码拆分为两个独立维度，分别编码高度和宽度的空间信息。它不再试图用整个特征向量去编码一个单一的线性位置，而是将特征向量（Embedding Vector）切分为两个独立的子空间：

- X轴子空间： 使用向量的一半维度，专门编码宽度信息（Width）。
- Y轴子空间： 使用向量的另一半维度，专门编码高度信息（Height）假设特征维度为 d，则用于旋转的频率对数量为 d/2。在 2D RoPE 中，我们将这 d/2对频率一分为二：

- 前 d/4组复数对频率用于编码 x 坐标。
- 后  d/4组复数对频率用于编码 y 坐标。 （注：每组复数对占用 2 个维度，因此总维度为 d/4 \times 2 + d/4 \times 2 = d，与原向量维度一致） 

这意味着，对于同一个特征向量 \mathbf{x}，其位置编码计算公式如下：  R^{d}_{\Theta, x, y} \mathbf{x} = \begin{pmatrix} x_1 \\ x_2 \\ \vdots \\ x_{d/2-1} \\ x_{d/2} \\ x_{d/2+1} \\ x_{d/2+2} \\ \vdots \\ x_{d-1} \\ x_d \end{pmatrix} \otimes \begin{pmatrix} \cos x \theta_1 \\ \cos y \theta_1 \\ \vdots \\ \cos x \theta_{d/4} \\ \cos y \theta_{d/4} \\ \cos x \theta_1 \\ \cos y \theta_1 \\ \vdots \\ \cos x \theta_{d/4} \\ \cos y \theta_{d/4} \end{pmatrix} + \begin{pmatrix} -x_{d/2+1} \\ -x_{d/2+2} \\ \vdots \\ -x_{d-1} \\ -x_d \\ x_1 \\ x_2 \\ \vdots \\ x_{d/2-1} \\ x_{d/2} \end{pmatrix} \otimes \begin{pmatrix} \sin x \theta_1 \\ \sin y \theta_1 \\ \vdots \\ \sin x \theta_{d/4} \\ \sin y \theta_{d/4} \\ \sin x \theta_1 \\ \sin y \theta_1 \\ \vdots \\ \sin x \theta_{d/4} \\ \sin y \theta_{d/4} \end{pmatrix} 

- 可以看到，向量中的不同部分分别与 \cos x\theta(横向) 和 \cos y\theta(纵向) 相互作用。
- 通过这种方式，模型能够同时捕捉图像在 水平 和 垂直 两个方向上的相对距离信息，且能够原生支持任意分辨率的输入（无论图像是 224x224 还是 1024x1024，只需根据实际分辨率生成对应的（h_pos, w_pos）索引，即可动态计算旋转编码，完美适配多分辨率输入场景）。 

代码实现（结合 Qwen2.5-VL 源码）

- 步骤 1：生成 2D 位置索引 (pos_ids)： 这一步的目标是为每个 patch 生成 (height, width) 的坐标对。

- 首先建立高度和宽度两个维度的pos_id，然后将高度和宽度堆叠起来。
- 然后利用2DRoPE的旋转矩阵计算出每个patch在高度和宽度的旋转角度 def rot_pos_emb(self, grid_thw):
    pos_ids = []  # 存储所有位置ID的列表
    
    for t, h, w in grid_thw:
        # --------------------------------------------------------
        # A. 构建高度方向的 Grid (Height IDs)
        # --------------------------------------------------------
        # 初始形状: [h, w]，每行的值相同 (0, 1, ..., h-1),表示该行的高度位置
        hpos_ids = torch.arange(h).unsqueeze(1).expand(-1, w)
        
        # 处理 spatial_merge (窗口化/降采样)，根据空间合并大小重塑张量，将空间分成多个块
        # 形状变换: [h, w] -  [h//size, size, w//size, size]
        # 这相当于将 h×w 的空间分成多个 size × size 的块
        hpos_ids = hpos_ids.reshape(
            h // self.spatial_merge_size,      
            self.spatial_merge_size,           
            w // self.spatial_merge_size,     
            self.spatial_merge_size,           
        )
        
        # 维度置换并展平为一维向量，得到重新排列后的高度位置ID
        hpos_ids = hpos_ids.permute(0, 2, 1, 3)
        hpos_ids = hpos_ids.flatten()

        # --------------------------------------------------------
        # B. 构建宽度方向的 Grid (Width IDs)
        # --------------------------------------------------------
        # 初始形状: [h, w]，每列的值相同 (0, 1, ..., w-1)
        wpos_ids = torch.arange(w).unsqueeze(0).expand(h, -1)
        
        # 同样的 spatial_merge 处理逻辑
        wpos_ids = wpos_ids.reshape(
            h // self.spatial_merge_size,      
            self.spatial_merge_size,           
            w // self.spatial_merge_size,      
            self.spatial_merge_size,           
        )
        wpos_ids = wpos_ids.permute(0, 2, 1, 3)
        wpos_ids = wpos_ids.flatten()
        
        # --------------------------------------------------------
        # C. 堆叠生成坐标对
        # --------------------------------------------------------
        # 将高度和宽度 ID 堆叠，形成 [N, 2] 的坐标对，其中每行是 [h, w]
        # repeat(t, 1): 视频的每一帧共享相同的空间网格结构 (2D Grid)
        # 因此，我们将计算好的一帧空间坐标 (H, W) 在时间维度上复制 t 次
        # [注意]：此处仅处理空间坐标，时间维度 (Time ID) 会由 M-RoPE 的其他逻辑单独注入
        pos_ids.append(torch.stack([hpos_ids, wpos_ids], dim=-1).repeat(t, 1))
    
    # 拼接所有图像/视频的坐标，pos_ids 的形状: [t * h * w, 2]
    # 每行是 [h, w]，表示该 patch 在帧内的 2D 坐标 (不包含时间信息)
    pos_ids = torch.cat(pos_ids, dim=0)
    
    # --------------------------------------------------------
    # D.后续查表逻辑
    # --------------------------------------------------------
    # 找到所有网格中的最大空间尺寸（高度或宽度的最大值）
    max_grid_size = grid_thw[:, 1:].max()
    
    # 设head_dim为hidden_size / num_heads
    # self.rotary_pos_emb = Qwen2_5_VisionRotaryEmbedding(head_dim // 2)
    # rotary_pos_emb_full 的形状: [max_grid_size, head_dim//4]，存储每个patch在x和y的旋转角度
    rotary_pos_emb_full = self.rotary_pos_emb(max_grid_size)
    
    # 根据位置ID从完整的旋转位置编码中索引出对应的编码, 
    # 每一个patch具有两个position id, [t * h * w, 2, head_dim//4] -  [t * h * w, head_dim//2]
    rotary_pos_emb = rotary_pos_emb_full[pos_ids].flatten(1)
    return rotary_pos_emb
       

- 步骤 2：计算旋转频率 (freqs) 这一步实现了标准的 RoPE 频率计算公式 \theta_i = 10000^{-2i/d}，并生成对应的频率表。 class Qwen2_5_VisionRotaryEmbedding(nn.Module):
    inv_freq: torch.Tensor 

    def __init__(self, dim: int, theta: float = 10000.0) -  None:
        super().__init__()
        # 计算逆频率：1 / (10000^{2i/d})
        # 形状: [dim//2]
        inv_freq = 1.0 / (theta ** (torch.arange(0, dim, 2, dtype=torch.float) / dim))
        self.register_buffer("inv_freq", inv_freq, persistent=False)

    def forward(self, seqlen: int) -  torch.Tensor:
        """         
        生成频率表 freqs。         
        返回形状: [seqlen, dim//2]         
        """
        seq = torch.arange(seqlen, device=self.inv_freq.device, dtype=self.inv_freq.dtype)
        
        # 计算每个位置对应的频率：freqs[pos, i] = pos * inv_freq[i]
        # 每一行包含了一个位置 pos 在所有频率分量上的旋转角度
        freqs = torch.outer(seq, self.inv_freq)
        return freqs

- 步骤 3：应用旋转编码到 Q/K 矩阵 基于计算出的每个patch在高度和宽度的旋转角度，就可以计算出Cos 和 Sin。最后一步是将计算好的 Cos 和 Sin 注入到 Attention 的 Query 和 Key 中，完成位置信息的融合。

# 将输入向量的后半部分取负号并与前半部分交换位置，相当于对向量应用了90度的旋转操作。
def rotate_half(x):
    # 对于向量 x = [x1, x2]，其中 x1 是前半部分，x2 是后半部分
    # 旋转操作：rotate_half(x) = [-x2, x1]
    x1 = x[..., : x.shape[-1] // 2]  
    x2 = x[..., x.shape[-1] // 2 :]  
    return torch.cat((-x2, x1), dim=-1)
def apply_rotary_pos_emb_vision(
    q: torch.Tensor, k: torch.Tensor, cos: torch.Tensor, sin: torch.Tensor
) -  tuple[torch.Tensor, torch.Tensor]:
    orig_q_dtype = q.dtype
    orig_k_dtype = k.dtype
    #使用float32可以避免精度损失
    q, k = q.float(), k.float()
    cos, sin = cos.unsqueeze(-2).float(), sin.unsqueeze(-2).float()
    
    #将位置信息编码到query和key中，等价于应用旋转矩阵：
    # [cos(θ)  -sin(θ)]  [x1]   [cos(θ)*x1 - sin(θ)*x2]
    #                         = 
    #[sin(θ)   cos(θ)]  [x2]   [sin(θ)*x1 + cos(θ)*x2]
    q_embed = (q * cos) + (rotate_half(q) * sin)
    k_embed = (k * cos) + (rotate_half(k) * sin)
    
    # 将结果转换回原始数据类型，以保持与模型其他部分的一致性
    q_embed = q_embed.to(orig_q_dtype)
    k_embed = k_embed.to(orig_k_dtype)
    return q_embed, k_embed

计算position_ids 
position_ids 是 M-RoPE 编码的基础输入，用于定义每个 token 在时空维度的具体位置，是连接模态数据与旋转编码的关键桥梁。其核心逻辑是为文本、图像、视频 token 分配对应的三维（时间 T、高度 H、宽度 W）位置索引，最终输出维度为 [3, batch_size, sequence_length]。 

纯文本 embedding：旋转位置编码和 LLM 中的 1D 位置编码没有区别，三个维度的位置编码都一样：

- input_ids: [T T T T T], 其中T表示文本
- 时间维度（temporal position_ids）: [0, 1, 2, 3, 4]
- 高（height position_ids）: [0, 1, 2, 3, 4]
- 宽（width position_ids）: [0, 1, 2, 3, 4] 视觉和文本混合 embedding：对视觉部分计算 3D 旋转位置编码，对文本部分计算 1D 旋转位置编码：

- 假设有一个视频输入，包含3个temporal patches，2个height patches和2个width patches，共计12个视觉token。输入序列为[V V V V V V V V V V V V T T T T T]，V表示视觉token
- vision temporal position_ids: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2]
- vision height position_ids: [0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1]
- vision width position_ids: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]
- 文本的起始位置 = 视觉部分最大位置ID + 1
- text temporal position_ids: [3, 4, 5, 6, 7]
- text height position_ids: [3, 4, 5, 6, 7]
- text width position_ids: [3, 4, 5, 6, 7] 

接下来结合Qwen 2VL的源码，讲解怎么计算视觉和文本token的position_ids，最终输出的postion_ids维度是[3, batch_size, sequence_length]

- 初始化，input_ids表示输入的token序列。 input_tokens = input_ids.tolist()  
llm_pos_ids_list: list = []  # 存储每个片段（文本或视觉）的位置ID
st = 0  # 当前处理的起始位置
remain_images, remain_videos = image_nums, video_nums  

- 遍历所有图像和视频，按它们在序列中出现的顺序处理 for _ in range(image_nums + video_nums):
    # 查找下一个图像token的位置（从st开始）
    if image_token_id in input_tokens and remain_images   0:
        ed_image = input_tokens.index(image_token_id, st)
    else:
        ed_image = len(input_tokens) + 1  # 设为无效值（大于序列长度）
    
    # 查找下一个视频token的位置（从st开始）
    if video_token_id in input_tokens and remain_videos   0:
        ed_video = input_tokens.index(video_token_id, st)
    else:
        ed_video = len(input_tokens) + 1  # 设为无效值
    
    # 比较位置，谁先出现就处理谁（保持序列顺序）
    if ed_image   ed_video:
        # 处理图像：获取该图像的(时间, 高度, 宽度)网格信息
        t, h, w = (
            image_grid_thw[image_index][0],  # 时间维度
            image_grid_thw[image_index][1],  # 高度维度
            image_grid_thw[image_index][2],  # 宽度维度
        )
        image_index += 1
        remain_images -= 1
        ed = ed_image  # 设置结束位置为图像token位置
    else:
        # 处理视频：获取该视频的(时间, 高度, 宽度)网格信息
        t, h, w = (
            video_grid_thw[video_index][0],  # 时间维度
            video_grid_thw[video_index][1],  # 高度维度
            video_grid_thw[video_index][2],  # 宽度维度
        )
        video_index += 1
        remain_videos -= 1
        ed = ed_video  # 设置结束位置为视频token位置

- 计算LLM中的网格尺寸，即图像按照patch_size做切分llm_grid_t, llm_grid_h, llm_grid_w = (
    t.item(),  # 时间维度直接使用（通常是1，对于图像）
    h.item() // spatial_merge_size,  # 高度除以合并大小
    w.item() // spatial_merge_size,  # 宽度除以合并大小
)
text_len = ed - st  # 计算当前文本片段的长度（st到ed之间的文本token数）

- 计算文本片段的位置ID# 计算起始位置ID：如果已有位置列表，取最后一个的最大值+1，否则从0开始
# 这确保了文本和视觉片段之间的位置ID连续递增
st_idx = llm_pos_ids_list[-1].max() + 1 if len(llm_pos_ids_list)   0 else 0

# 为文本片段创建位置ID：三个维度（时间、高度、宽度）使用相同的1D位置编码
# 形状从(text_len,) -  (1, text_len) -  (3, text_len)，然后加上起始索引
llm_pos_ids_list.append(torch.arange(text_len).view(1, -1).expand(3, -1) + st_idx)

- 生成时间维度索引# 原理：对于每个时间步，所有空间位置共享相同的时间索引
# 例如：llm_grid_t=3, llm_grid_h=2, llm_grid_w=2
# torch.arange(3) -  [0, 1, 2]
# .view(-1, 1) -  [[0], [1], [2]]
# .expand(-1, 2*2) -  [[0,0,0,0], [1,1,1,1], [2,2,2,2]]  (每行重复4次)
# .flatten() -  [0,0,0,0, 1,1,1,1, 2,2,2,2]  (12个元素)
t_index = torch.arange(llm_grid_t).view(-1, 1).expand(-1, llm_grid_h * llm_grid_w).flatten()
 

- 生成高度和宽度维度索引# 原理：在每个时间步内，高度索引按照网格模式重复
# torch.arange(2) -  [0, 1]
# .view(1, -1, 1) -  [[[0], [1]]]
# .expand(3, -1, 2) -  [[[0,0], [1,1]], [[0,0], [1,1]], [[0,0], [1,1]]]
# .flatten() -  [0,0,1,1, 0,0,1,1, 0,0,1,1]  (每个时间步内：高度0重复2次，高度1重复2次)
h_index = torch.arange(llm_grid_h).view(1, -1, 1).expand(llm_grid_t, -1, llm_grid_w).flatten()
# 原理：在每个时间和高度组合内，宽度索引按照网格模式重复
# torch.arange(2) -  [0, 1]
# .view(1, 1, -1) -  [<span class="wikilink wikilink--missing" title="未导入的页面">0, 1</span>]
# .expand(3, 2, -1) -  [[[0,1], [0,1]], [[0,1], [0,1]], [[0,1], [0,1]]]
# .flatten() -  [0,1,0,1, 0,1,0,1, 0,1,0,1]  (每个空间位置：宽度0和1交替)
w_index = torch.arange(llm_grid_w).view(1, 1, -1).expand(llm_grid_t, llm_grid_h, -1).flatten()

- 组合三个维度的索引并加上偏移量# 将[t_index, h_index, w_index]堆叠成形状(3, num_patches)
# 加上text_len + st_idx确保视觉片段的位置ID紧跟在文本片段之后
# 最终形状：(3, llm_grid_t * llm_grid_h * llm_grid_w)
llm_pos_ids_list.append(torch.stack([t_index, h_index, w_index]) + text_len + st_idx)

# 更新起始位置：跳过当前视觉片段的所有token
# 包括：图像/视频token本身 + 视觉特征token（llm_grid_t * llm_grid_h * llm_grid_w个）
st = ed + llm_grid_t * llm_grid_h * llm_grid_w

时空统一M-RoPE—— 多模态场景的终极编码方案 
当模型需要同时处理视频（3D 时空）、图像（2D 空间）和文本（1D 序列）时，2D RoPE 仍有不足：缺少时间维度的编码。M-RoPE（Multimodal RoPE）在此基础上增加时间维度（T），实现时间 + 高度 + 宽度的三维统一编码，成为多模态融合的核心技术。 M-RoPE 的本质是维度拆分 + 协同编码，核心设计包括：

- 三维位置索引：为每个 token（文本 / 视觉）分配（T, H, W）三维位置 ID，分别对应时间、高度、宽度维度；
- 通道分区策略：将嵌入向量的通道按维度分区（如时间占 16 维、高度占 24 维、宽度占 24 维），每个分区应用对应维度的旋转编码；
- 跨模态兼容性：文本 token 的三维位置 ID 保持一致（T=H=W），确保与 LLM 原有的 1D 编码逻辑兼容，不破坏文本理解能力。 
图 1：M-RoPE 坐标分配示意图。左侧为视频帧的 3D 坐标扫描（T, H, W），中间展示了文本 Token 如何通过对角线方式（T=H=W）紧跟在视频之后。从图中我们可以清晰地看到两个策略：

- 视觉部分（左侧）： 采用真实的 3D 扫描。例如第 1 帧左上角是 (0,0,0)，第 3 帧右下角是 (2,2,3)。
- 文本部分（中间）： 紧接在视觉部分最大 ID 之后（图示为从 4 开始），并采用 (4,4,4), (5,5,5)… 这种三个维度数值相同的形式，以保持 Token 间的线性相对距离。 
三维位置 ID 计算规则（实例解析） 
以 “视频 + 文本” 输入为例，说明 M-RoPE 的位置 ID 分配逻辑：

- 视频输入：3 个时间帧（T=3），每帧切分为 2x2 网格（H=2, W=2），共 12 个视觉 token（V）；
- 文本输入：5 个文本 token（T）。 视觉 token 的三维位置 ID 

文本 token 的三维位置 ID

- 起始位置：文本的位置 ID 从视觉 token 的最大位置 ID+1 开始（视觉最大时间 ID=2 → 文本起始 ID=3）；
- 维度策略：文本无空间信息，因此三维位置 ID 完全一致，保持 1D 编码特性；
- 最终 ID：时间 ID=[3,4,5,6,7]，高度 ID=[3,4,5,6,7]，宽度 ID=[3,4,5,6,7]。 这种设计确保了：

- 视觉 token 的时空关系被精准编码；
- 文本与视觉的位置 ID 连续递增，无模态间冲突；
- 文本仍保持 1D 编码逻辑，兼容 LLM 的文本理解能力。 
Qwen2.5-VL 中 M-RoPE 的源码实现 
步骤1：旋转嵌入（cos/sin）的计算

- 首先基于位置 ID 和频率公式，计算出时间、高度、宽度三个维度各自的 cos/sin 信息。代码实现如下： class Qwen2_5_VLRotaryEmbedding(nn.Module):
    def forward(self, x, position_ids):
        # position_ids 形状：(3, batch_size, sequence_length) → 对应时间、高度、宽度3个维度的位置ID
        # 1. 扩展频率矩阵：self.inv_freq = 1/(10000^(2i/d))，扩展为 (3, batch_size, head_dim//2, 1)
        inv_freq_expanded = self.inv_freq[None, None, :, None].float().expand(3, position_ids.shape[1], -1, 1)
        
        # 2. 扩展位置ID矩阵：匹配频率矩阵形状 → (3, batch_size, 1, sequence_length)
        position_ids_expanded = position_ids[:, :, None, :].float()  

        device_type = x.device.type if isinstance(x.device.type, str) and x.device.type != "mps" else "cpu"
        
         # 3. 计算每个维度的旋转角度：freqs = 位置ID × 频率 → 形状 (3, batch_size, sequence_length, head_dim//2)
        with torch.autocast(device_type=device_type, enabled=False):  
            freqs = (inv_freq_expanded.float() @ position_ids_expanded.float()).transpose(2, 3)
            
          # 4. 拼接实部+虚部（旋转编码需要成对维度）→ 形状 (3, batch_size, sequence_length, head_dim)
            emb = torch.cat((freqs, freqs), dim=-1)
            
          # 5. 计算cos/sin，并应用缩放因子
          # (3, batch_size, sequence_length, head_dim)
            cos = emb.cos() * self.attention_scaling
            sin = emb.sin() * self.attention_scaling
        return cos.to(dtype=x.dtype), sin.to(dtype=x.dtype)

步骤2：将旋转嵌入应用到 Attention 的 Q/K 矩阵 

以 head_dim=128 为例：步骤 1 已得到 时间、高度、宽度3 个维度各自的嵌入 （形状为 [3, batch_size, sequence_length, 128]），但需将其 分通道拼接 为最终位置编码（区别于 2D RoPE 的拼接逻辑）。

与 2D RoPE 的核心差异在于：

- 2D RoPE：直接将 “高度、宽度” 两个维度的嵌入完整拼接，覆盖所有通道；
- M-RoPE：为 “时间、高度、宽度” 各分配部分通道，仅取每个维度的部分嵌入拼接（既保留多模态位置信息，又控制计算量）。R_{\Theta, t, x, y}^d \mathbf{x} =  \begin{pmatrix} x_1 \\ \vdots \\ x_{16} \\ x_{17} \\ \vdots \\ x_{40} \\ x_{41} \\ \vdots \\ x_{64} \\ x_{65} \\ \vdots \\ x_{80} \\ x_{81} \\ \vdots \\ x_{104} \\ x_{105} \\ \vdots \\ x_{128} \end{pmatrix} \otimes \begin{pmatrix} \cos t\theta_1 \\ \vdots \\ \cos t\theta_{16} \\ \cos x\theta_1 \\ \vdots \\ \cos x\theta_{24} \\ \cos y\theta_1 \\ \vdots \\ \cos y\theta_{24} \\ \cos t\theta_1 \\ \vdots \\ \cos t\theta_{16} \\ \cos x\theta_1 \\ \vdots \\ \cos x\theta_{24} \\ \cos y\theta_1 \\ \vdots \\ \cos y\theta_{24} \end{pmatrix} + \begin{pmatrix} -x_{65} \\ \vdots \\ -x_{80} \\ -x_{81} \\ \vdots \\ -x_{104} \\ -x_{105} \\ \vdots \\ -x_{128} \\ x_1 \\ \vdots \\ x_{16} \\ x_{17} \\ \vdots \\ x_{40} \\ x_{41} \\ \vdots \\ x_{64} \end{pmatrix} \otimes \begin{pmatrix} \sin t\theta_1 \\ \vdots \\ \sin t\theta_{16} \\ \sin x\theta_1 \\ \vdots \\ \sin x\theta_{24} \\ \sin y\theta_1 \\ \vdots \\ \sin y\theta_{24} \\ \sin t\theta_1 \\ \vdots \\ \sin t\theta_{16} \\ \sin x\theta_1 \\ \vdots \\ \sin x\theta_{24} \\ \sin y\theta_1 \\ \vdots \\ \sin y\theta_{24} \end{pmatrix}

def apply_multimodal_rotary_pos_emb(q, k, cos, sin, mrope_section, unsqueeze_dim=1):
    """对查询和键张量应用带多模态分区的旋转位置编码。
    参数:
        q (`torch.Tensor`): 查询张量，[batch_size,n_head,sequence_length,128]
        k (`torch.Tensor`): 键张量，[batch_size,n_head,sequence_length,128]
        cos (`torch.Tensor`): 旋转嵌入的余弦部分，[3, batch_size, sequence_length, 128]
        sin (`torch.Tensor`): 旋转嵌入的正弦部分，[3, batch_size, sequence_length, 128]
        mrope_section(`List(int)`): 
            多模态rope分区，用于rope计算中时间、高度和宽度的通道维度
            例如：[16, 24, 24] 表示时间维度16，高度维度24，宽度维度24
    """
    # 将mrope_section列表重复一次，因为每个位置编码需要成对的维度（实部和虚部）[16, 24, 24, 16, 24, 24]
    mrope_section = mrope_section * 2
    # 1. cos.split(mrope_section, dim=-1) 按照列表中的大小在最后一个维度上分割cos张量
    #    块0: [0:16] (时间维度1), 块1: [16:40] (高度维度1), 块2: [40:64] (宽度维度1),
    #    块3: [64:80] (时间维度2), 块4: [80:104] (高度维度2), 块5: [104:128] (宽度维度2)
    # 2. [m[i % 3] for i, m in enumerate(cos.split(mrope_section, dim=-1))]  
    #    为每个分割块分配索引i：i=0对应块0, i=1对应块1, ..., i=5对应块5
    #    这样每个块都使用对应维度的旋转位置编码，实现了多模态的旋转位置编码
    # 3. torch.cat(..., dim=-1) 将所有选中的块在最后一个维度上拼接，[batch_size, sequence_length, 128]
    # 4.unsqueeze(unsqueeze_dim) 在指定维度上增加一个维度，以便后续与q和k进行广播 [1, batch_size, sequence_length, 128]
    cos = torch.cat([m[i % 3] for i, m in enumerate(cos.split(mrope_section, dim=-1))], dim=-1).unsqueeze(
        unsqueeze_dim
    )
    sin = torch.cat([m[i % 3] for i, m in enumerate(sin.split(mrope_section, dim=-1))], dim=-1).unsqueeze(
        unsqueeze_dim
    )
    q_embed = (q * cos) + (rotate_half(q) * sin)
    k_embed = (k * cos) + (rotate_half(k) * sin)
    return q_embed, k_embed
代码来源：https://github.com/huggingface/transformers/blob/main/src/transformers/models/qwen2_5_vl/modeling_qwen2_5_vl.py

发布于 2025-11-30 23:38・北京
大模型

多模态

​赞同 29​​3 条评论​44 ​喜欢​分享

​申请转载​​

未登录用户

3 条评论

默认
最新

苟淡

大佬，我有一个问题，为什么128维的向量，做M-RoPE的时候，划分为时间、长度、宽度为什么是32、48、48，这几个值是怎么来的

03-10 · 广东

​回复​喜欢

迪天才

还有qwen3的Interleaved MRoPE

2025-12-05 · 新加坡

​回复​喜欢

居丽叶

作者

写在qwen3技术报告解读里面了，明天再发出来
2025-12-12 · 北京

​回复​喜欢

关于作者

居丽叶
公众号：居丽叶的大模型视界

回答
10
文章
32
关注者
773

​关注她​发私信

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

多模态大模型的尽头只是画图吗？LatentUM：干掉“像素中间商”，解锁跨模态推理
AI解析新纪元

图文多模态大模型相关经典技术解读
艾宏峰

多模态 RAG 的终极形态？Qwen3-VL-Embedding Reranker 模型架构与训练细节全解析
大家好，我是居丽叶。 过去我们做多模态 RAG，要么拿 VLM 给图片写个 Caption，然后当纯文本搜；要么就是用 CLIP 或者 SigLIP 这种模型去做端到端，虽然 SigLIP 作为 CLIP 的改进版，在 Zer…

居丽叶

图解大模型，第十二章：多模态大模型
️ 本章目标：2025年是多模态大模型真正 #34;爆发 #34;的一年——大模型不再只处理文字， #34;看图 #34;、 #34;听声 #34;、 #34;生成图像 #34;、 #34;创作视频 #34;全都成了主流模型的标配…

北方的郎