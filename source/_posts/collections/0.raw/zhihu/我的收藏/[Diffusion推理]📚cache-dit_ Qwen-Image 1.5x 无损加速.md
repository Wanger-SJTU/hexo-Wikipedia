---
title: "(2 条消息) [Diffusion推理]📚cache-dit: Qwen-Image 1.5x 无损加速"
date: 2025-08-20
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/1938547315221705644
---

#### 0x00 前言

![](asset/img_7d5739b9155f.jpg)

Qwen-Image本文主要展示了如何使用cache-dit给Qwen-Image进行cache加速。在cache-dit: DBCache F8B0 + TaylorSeer + Cache CFG的配置下，跑在NVIDIA L20上（要开cpu offload），大概能有**1.5x**的性能加速，**效果几乎无损**。完整代码链接：[cache-dit/examples/run_qwen_image.py](https://link.zhihu.com/?target=https%3A//github.com/vipshop/cache-dit/blob/main/examples/run_qwen_image.py)，cache-dit详细使用文档，请参考：

[](https://link.zhihu.com/?target=https%3A//github.com/vipshop/cache-dit/tree/main)

#### 0x01 Cache加速

安装cache-dit和dev版本diffusers:

`pip install git+https://github.com/huggingface/diffusers
pip install -U cache-dit`

废话少说，直接贴示例代码，欢迎尝试。cache-dit为Qwen-Image提供了**DBCache、TaylorSeer**和**cache CFG**的缓存加速支持。提示：**需要安装最新的cache-dit以及最新的diffusers.**

`import os
import time
import torch
import argparse
from diffusers import QwenImagePipeline
from cache_dit

def get_args() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    # General arguments
    parser.add_argument("--cache", action="store_true", default=False)
    parser.add_argument("--taylorseer", action="store_true", default=False)
    parser.add_argument("--taylorseer-order", "--order", type=int, default=4)
    parser.add_argument("--Fn-compute-blocks", "--Fn", type=int, default=8)
    parser.add_argument("--Bn-compute-blocks", "--Bn", type=int, default=0)
    parser.add_argument("--rdt", type=float, default=0.12)
    parser.add_argument("--warmup-steps", type=int, default=8)
    return parser.parse_args()

args = get_args()
print(args)

pipe = QwenImagePipeline.from_pretrained(
    os.environ.get(
        "QWEN_IMAGE_DIR",
        "Qwen/Qwen-Image",
    ),
    torch_dtype=torch.bfloat16,
)

if args.cache:
    cache_options = {
        "cache_type": CacheType.DBCache,
        "warmup_steps": args.warmup_steps,
        "max_cached_steps": -1,  # -1 means no limit
        "Fn_compute_blocks": args.Fn_compute_blocks,  # Fn, F8, etc.
        "Bn_compute_blocks": args.Bn_compute_blocks,  # Bn, B16, etc.
        "residual_diff_threshold": args.rdt,
        # CFG: classifier free guidance or not
        "do_separate_classifier_free_guidance": True,
        "cfg_compute_first": False,
        "enable_taylorseer": args.taylorseer,
        "enable_encoder_taylorseer": args.taylorseer,
        # Taylorseer cache type cache be hidden_states or residual
        "taylorseer_cache_type": "residual",
        "taylorseer_kwargs": {
            "n_derivatives": args.taylorseer_order,
        },
    }
    cache_type_str = "DBCACHE"
    cache_type_str = (
        f"{cache_type_str}_F{args.Fn_compute_blocks}"
        f"B{args.Bn_compute_blocks}W{args.warmup_steps}"
        f"T{int(args.taylorseer)}O{args.taylorseer_order}_"
        f"R{args.rdt}"
    )
    print(f"cache options:\n{cache_options}")

    cache_dit.enable_cache(pipe, **cache_options)
else:
    cache_type_str = "NONE"

# Enable memory savings
pipe.enable_model_cpu_offload()

positive_magic = {
    "en": "Ultra HD, 4K, cinematic composition.",  # for english prompt,
    "zh": "超清，4K，电影级构图",  # for chinese prompt,
}

# Generate image
prompt = """A coffee shop entrance features a chalkboard sign reading "Qwen Coffee   $2 per cup," with a neon light beside it displaying "通义千问". Next to it hangs a poster showing a beautiful Chinese woman, and beneath the poster is written "π≈3.1415926-53589793-23846264-33832795-02384197". Ultra HD, 4K, cinematic composition"""

negative_prompt = (
    " "  # using an empty string if you do not have specific concept to remove
)

# Generate with different aspect ratios
aspect_ratios = {
    "1:1": (1328, 1328),
    "16:9": (1664, 928),
    "9:16": (928, 1664),
    "4:3": (1472, 1140),
    "3:4": (1140, 1472),
    "3:2": (1584, 1056),
    "2:3": (1056, 1584),
}

width, height = aspect_ratios["16:9"]

start = time.time()

# do_true_cfg = true_cfg_scale > 1 and has_neg_prompt
image = pipe(
    prompt=prompt + positive_magic["en"],
    negative_prompt=negative_prompt,
    width=width,
    height=height,
    num_inference_steps=50,
    true_cfg_scale=4.0,
    generator=torch.Generator(device="cpu").manual_seed(42),
).images[0]

end = time.time()

if hasattr(pipe.transformer, "_cached_steps"):
    cached_steps = pipe.transformer._cached_steps
    residual_diffs = pipe.transformer._residual_diffs
    print(f"Cache Steps: {len(cached_steps)}, {cached_steps}")
    print(f"Residual Diffs: {len(residual_diffs)}, {residual_diffs}")
if hasattr(pipe.transformer, "_cfg_cached_steps"):
    cfg_cached_steps = pipe.transformer._cfg_cached_steps
    cfg_residual_diffs = pipe.transformer._cfg_residual_diffs
    print(f"CFG Cache Steps: {len(cfg_cached_steps)}, {cfg_cached_steps} ")
    print(
        f"CFG Residual Diffs: {len(cfg_residual_diffs)}, {cfg_residual_diffs}"
    )

time_cost = end - start
save_path = f"qwen-image.{cache_type_str}.png"
print(f"Time cost: {time_cost:.2f}s")
print(f"Saving image to {save_path}")
image.save(save_path)`

运行脚本：

`python3 run_qwen_image.py # baseline
python3 run_qwen_image.py --cache --Fn 8 --Bn 0 --rdt 0.12 --taylorseer --order 2
python3 run_qwen_image.py --cache --Fn 8 --Bn 0 --rdt 0.12 --taylorseer --order 4`

#### 0x02 加速效果

- Baseline 
![](asset/img_3c79570df209.jpg)

Baseline w/o cache-dit

- cache-dit: DBCache F8B0 + TaylorSeer **O(2)** + Cache CFG, 1.5x Speed Up
![](asset/img_3b0cb1437037.jpg)

cache-dit 1.5x Speed Up: TaylorSeer O(2)

- cache-dit: DBCache F8B0 + TaylorSeer **O(4)** + Cache CFG, 1.5x Speed Up
![](asset/img_87d00bdba201.jpg)

cache-dit 1.5x Speed Up: TaylorSeer O(4)我们能看到，TaylorSeer 阶数越高，精度越好。TaylorSeer O(4)的图片，在小黑板上方生成的内容和Baseline基本一致，而TaylorSeer O(2)会生成一个新的环绕灯管。

#### 0x03 warmup的影响

由于大部分扩散模型在去噪阶段的**前面的步数属于高噪声**的阶段，因此合理的cache逻辑是warmup一些前边的步数（即不做cache），**对后边低噪声的步数做cache**。实测下来，指定warmup_steps > 0可以极大地提高精度。比如，在Qwen-Image的示例中，我们可以使用warmup_steps=8，对加速比影响不大。从结果上看，“电线”的生成和Baseline更接近了。

![](asset/img_222d78a60bec.jpg)

DBCache F8B0 + TaylorSeer O(4) + Cache CFG + warmup_steps 8
#### 0x04 总结

本文主要展示了如何使用cache-dit给Qwen-Image进行cache加速。在cache-dit: DBCache F8B0 + TaylorSeer + Cache CFG的配置下，跑在NVIDIA L20上（要开cpu offload），大概能有**1.5x**的性能加速，效果几乎无损。完整代码链接：[https://github.com/vipshop/cache-dit/blob/main/examples/run_qwen_image.py](https://link.zhihu.com/?target=https%3A//github.com/vipshop/cache-dit/blob/main/examples/run_qwen_image.py)，cache-dit详细使用文档，请参考：

[](https://link.zhihu.com/?target=https%3A//github.com/vipshop/cache-dit/tree/main)