---
title: Softmax性能提升400%，加速边缘设备LLM推理
date: "2026-01-21 00:00:00"
updated: "2026-01-21 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Softmax性能提升400-,加速边缘设备LLM推理/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1996636375152342490
---


Softmax性能提升400%，加速边缘设备LLM推理

阿龙aloong
​​​
 电子科技大学 电子科学与技术硕士

85 人赞同了该文章

随着大模型上下文窗口的爆发式增长，Attention 机制中的 Softmax 计算正逐渐成为推理延迟的“隐形杀手”。

我们通过一种高精度的近似算法，在严格保持 Top-1、Top-5、Top-10 结果 100% 一致，完美兼容 Top-k / Top-p 采样策略的前提下，将 Softmax 算子的吞吐量提升了 4.2 倍（峰值达 330 MElem/s）。其概率分布的 KL 散度低至 10−1210^{-12} 量级，累积误差几乎为零。这意味着在嵌入式端侧或高并发服务端，我们无需牺牲任何生成质量，即可用更低的算力成本跑通更大的模型。

Turbo-Softmaxgithub.com/LongWeihan/Turbo-Softmax
具体代码见我的Github，如果觉得有帮助的话可以点一下star

1. softmax 在 CPU 推理里常常是热点
softmax 的定义：

softmax(xi)=exi∑jexj
\mathrm{softmax}(x_i)=\frac{e^{x_i}}{\sum_j e^{x_j}} \\

工程里几乎一定用数值稳定写法：

\mathrm{softmax}(x_i)=\frac{e^{x_i-m}}{\sum_j e^{x_j-m}},\quad m=\max_j x_j \\

在 CPU 上，耗时主要来自：

- expf()：高延迟、实现复杂（特殊值、精度保证、范围处理等）
- 归一化：需要一次除法或求倒数如果模型里 softmax 很多（注意力、策略网络、排序、采样前概率计算），软硬件不变的情况下，softmax 优化往往立竿见影。

2. 灵感来源：雷神之锤的位级结构 + 低成本修正
Quake 的逆平方根之所以经典，是因为它利用 IEEE-754 的位级结构快速构造初值，再用 1~2 次 Newton 迭代修正。

在 softmax 里，我们同样希望：

- 让 exp 更便宜（不要直接调用 expf()）
- 让归一化更稳、更简单最终本文选用的组合是：

- exp：poly5（范围归约 + 五阶多项式近似）
- 1/sum：div（直接 1.0f/sum）它的特点是：误差已经接近 float32 的极限，同时仍能给出显著加速。

3. 核心推导：把 exp(x) 写成 2^i * exp(t)
关键等式：

e^x = 2^{x\log_2 e} \\

令：

y=x\log_2 e \\

把 y 拆成整数与小数：

y=i+f,\quad i\in\mathbb{Z},\ f\in[-0.5,0.5] \\

于是：

e^x = 2^{i+f}=2^i\cdot 2^f=2^i\cdot e^{f\ln 2} \\

令：

t=f\ln 2\in\left[-\frac{\ln2}{2},\frac{\ln2}{2}\right]\approx[-0.3466,0.3466] \\

现在问题变成两件事：

- 2^i 怎么算得快？
- exp(t) 在很小的区间怎么高精度近似？
4. 工程技巧：用 IEEE-754 位级构造 2^i
float32 的指数位有 bias=127。2^i 对应的 float 可以直接把指数位设为 i+127，尾数为 0：

float two_i = as_float((uint32_t)(i + 127)    23);
这一步没有真正的指数运算，成本非常低。

5. poly5 近似 exp(t)：在小区间里又快又准
因为 t 的范围很小，可以用五阶多项式近似：

e^t\approx 1+t+\frac{t^2}{2}+\frac{t^3}{6}+\frac{t^4}{24}+\frac{t^5}{120} \\

用 Horner 形式写出来：

float p = 1 + t*(1 + t*(0.5 + t*(1/6 + t*(1/24 + t*(1/120)))));
最终：

exp(x) ≈ two_i * p

6. 最终算法：poly5 + div softmax
两趟遍历：

- m = max(x)
- e_i = fast_exp_poly5(x_i - m)，累加 sum
- inv = 1.0f / sum
- out_i = e_i * inv为了避免极端输入导致下溢，我们对 (x_i - m) 做 clamp（默认 -80）：

- 小于 -80 的部分按 -80 处理（对应非常小的概率）干净实现见：qsoftmax_poly5_div/qsoftmax.c

7. Benchmark 
你只需要准备一个 bench.c，把 qsoftmax_poly5_div/qsoftmax.c 参与编译即可（完整示例在附录 A）。

7.1 跑基准，生成 CSV
Windows + MinGW gcc 示例：

gcc -O3 -std=c11 -Wall -Wextra -pedantic bench.c qsoftmax_poly5_div/qsoftmax.c -I qsoftmax_poly5_div -lm -o bench.exe
./bench.exe --out bench.csv

8. 结果

图 1：吞吐（MElem/s）对比
图 2：加速比（speedup）随 n 的变化
图 3：误差曲线（mean_abs / max_abs / max|sum-1|）
图 4：不同 scale / batch 的对比
9. 怎么把它用到你的工程里？
拎走 qsoftmax_poly5_div/ 这个干净文件夹即可：

- qsoftmax.h
- qsoftmax.c调用方式：

qsoftmax_params p = qsoftmax_default_params();
qsoftmax_poly5_div(x, n, out, p);
编译建议：

- -O3 必开
- 不建议默认开启 -ffast-math（除非你确认可接受更激进的浮点语义）
10. 还能怎么更快？（可选扩展）
如果你还想更快：

- 做 SIMD（AVX2/AVX-512/NEON）向量化：这套 2^i + poly 很适合向量化
- 把 softmax 融合进上游算子（fused），减少内存读写
- 如果你允许更多误差，可以改用更低阶多项式或分段近似
附录 A：最小可复现 benchmark（保存为 bench.c）
下面的 bench.c 会输出 bench.csv，每行对应一个 n，包含速度与精度指标。它只依赖：

- qsoftmax_poly5_div/qsoftmax.h
- qsoftmax_poly5_div/qsoftmax.c 提示：如果你有真实业务数据，最好把 fill_dataset() 换成“读真实 logits”，这样图更有说服力。
 编译运行示例：

gcc -O3 -std=c11 -Wall -Wextra -pedantic bench.c qsoftmax_poly5_div/qsoftmax.c -I qsoftmax_poly5_div -lm -o bench.exe
./bench.exe --out bench.csv
bench.c：

#include "qsoftmax.h"

#include  math.h 
#include  stdint.h 
#include  stdio.h 
#include  stdlib.h 
#include  string.h 

#ifdef _WIN32
#include  windows.h 
#endif

static volatile float g_sink = 0.0f;

static uint32_t xorshift32(uint32_t* s) {
  uint32_t x = *s;
  x ^= x    13;
  x ^= x    17;
  x ^= x    5;
  *s = x;
  return x;
}

static float rand_uniform01(uint32_t* s) {
  uint32_t u = xorshift32(s);
  return (float)((double)u / 4294967296.0);
}

static float rand_normalish(uint32_t* s) {
  float u1 = rand_uniform01(s);
  float u2 = rand_uniform01(s);
  float r = sqrtf(-2.0f * logf(fmaxf(u1, 1e-12f)));
  float t = 6.283185307179586f * u2;
  return r * cosf(t);
}

#ifdef _WIN32
static uint64_t qpc_freq(void) {
  static uint64_t freq = 0;
  if (!freq) {
    LARGE_INTEGER f;
    QueryPerformanceFrequency( f);
    freq = (uint64_t)f.QuadPart;
  }
  return freq;
}

static uint64_t now_ns(void) {
  LARGE_INTEGER c;
  QueryPerformanceCounter( c);
  uint64_t freq = qpc_freq();
  uint64_t counter = (uint64_t)c.QuadPart;
  uint64_t sec = counter / freq;
  uint64_t rem = counter % freq;
  return sec * 1000000000ull + (rem * 1000000000ull) / freq;
}
#else
#include  time.h 
static uint64_t now_ns(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC,  ts);
  return (uint64_t)ts.tv_sec * 1000000000ull + (uint64_t)ts.tv_nsec;
}
#endif

static void fill_dataset(float* x, int batch, int n, float scale, uint32_t* seed) {
  int total = batch * n;
  for (int i = 0; i   total; i++) {
    float u = rand_normalish(seed) * scale;
    x[i] = u;
  }
}

static void usage(const char* argv0) {
  fprintf(stderr,
          "Usage: %s [options] [sizes...]\\n"
          "  --out  path      CSV output path (default: bench.csv)\\n"
          "  --batch  int     Vectors per test (default: 256)\\n"
          "  --scale  float   Logits ~ N(0, scale^2) (default: 3)\\n"
          "  --min_ms  int    Min timing window per kernel (default: 200)\\n"
          "\\n"
          "If no sizes are given, defaults to: 16 32 64 128 256 512 1024\\n",
          argv0);
}

int main(int argc, char** argv) {
  const char* out_path = "bench.csv";
  int batch = 256;
  float scale = 3.0f;
  int min_ms = 200;
  int sizes[64];
  int size_count = 0;

  for (int i = 1; i   argc; i++) {
    if (strcmp(argv[i], "--out") == 0    i + 1   argc) {
      out_path = argv[++i];
    } else if (strcmp(argv[i], "--batch") == 0    i + 1   argc) {
      batch = atoi(argv[++i]);
    } else if (strcmp(argv[i], "--scale") == 0    i + 1   argc) {
      scale = (float)atof(argv[++i]);
    } else if (strcmp(argv[i], "--min_ms") == 0    i + 1   argc) {
      min_ms = atoi(argv[++i]);
    } else if (strcmp(argv[i], "--help") == 0 || strcmp(argv[i], "-h") == 0) {
      usage(argv[0]);
      return 0;
    } else if (argv[i][0] == '-') {
      fprintf(stderr, "Unknown option: %s\\n", argv[i]);
      usage(argv[0]);
      return 2;
    } else {
      sizes[size_count++] = atoi(argv[i]);
    }
  }

  if (size_count == 0) {
    int defaults[] = {16, 32, 64, 128, 256, 512, 1024};
    size_count = (int)(sizeof(defaults) / sizeof(defaults[0]));
    for (int i = 0; i   size_count; i++) {
      sizes[i] = defaults[i];
    }
  }

  FILE* f = fopen(out_path, "wb");
  if (!f) {
    perror("fopen");
    return 1;
  }

  fprintf(f,
          "n,batch,scale,min_ms,ref_ns_per_elem,q_ns_per_elem,speedup,ref_melems_s,q_melems_s,mean_abs,max_abs,max_sum_err,top1_mismatch\\n");

  qsoftmax_params p = qsoftmax_default_params();
  uint32_t seed = 1;

  for (int si = 0; si   size_count; si++) {
    int n = sizes[si];
    size_t bytes = (size_t)batch * (size_t)n * sizeof(float);
    float* x = (float*)malloc(bytes);
    float* r = (float*)malloc(bytes);
    float* q = (float*)malloc(bytes);
    if (!x || !r || !q) {
      return 1;
    }

    fill_dataset(x, batch, n, scale,  seed);

    // warmup
    for (int b = 0; b   batch; b++) {
      softmax_ref(x + (size_t)b * n, n, r + (size_t)b * n);
      qsoftmax_poly5_div(x + (size_t)b * n, n, q + (size_t)b * n, p);
    }

    // accuracy
    double mean_abs = 0.0;
    float max_abs = 0.0f;
    float max_sum_err = 0.0f;
    double top1_mismatch = 0.0;

    for (int b = 0; b   batch; b++) {
      float sum_q = 0.0f;
      int arg_r = 0, arg_q = 0;
      float best_r = r[(size_t)b * n], best_q = q[(size_t)b * n];

      for (int i = 0; i   n; i++) {
        float rv = r[(size_t)b * n + i];
        float qv = q[(size_t)b * n + i];
        float d = fabsf(qv - rv);
        mean_abs += (double)d;
        if (d   max_abs) {
          max_abs = d;
        }
        sum_q += qv;
        if (rv   best_r) {
          best_r = rv;
          arg_r = i;
        }
        if (qv   best_q) {
          best_q = qv;
          arg_q = i;
        }
      }

      float se = fabsf(sum_q - 1.0f);
      if (se   max_sum_err) {
        max_sum_err = se;
      }
      if (arg_r != arg_q) {
        top1_mismatch += 1.0;
      }
    }

    mean_abs /= (double)batch * (double)n;
    top1_mismatch /= (double)batch;

    // timing
    uint64_t target_ns = (uint64_t)min_ms * 1000000ull;
    uint64_t start = now_ns();
    uint64_t t;

    uint64_t it_ref = 0;
    do {
      float c = 0.0f;
      for (int b = 0; b   batch; b++) {
        softmax_ref(x + (size_t)b * n, n, r + (size_t)b * n);
        c += r[(size_t)b * n];
      }
      g_sink += c;
      it_ref++;
      t = now_ns() - start;
    } while (t   target_ns);

    double ref_s = (double)t * 1e-9;
    double ref_elems = (double)it_ref * (double)batch * (double)n;
    double ref_ns_per_elem = (double)t / ref_elems;
    double ref_melems_s = ref_elems / ref_s / 1e6;

    start = now_ns();
    uint64_t it_q = 0;
    do {
      float c = 0.0f;
      for (int b = 0; b   batch; b++) {
        qsoftmax_poly5_div(x + (size_t)b * n, n, q + (size_t)b * n, p);
        c += q[(size_t)b * n];
      }
      g_sink += c;
      it_q++;
      t = now_ns() - start;
    } while (t   target_ns);

    double q_s = (double)t * 1e-9;
    double q_elems = (double)it_q * (double)batch * (double)n;
    double q_ns_per_elem = (double)t / q_elems;
    double q_melems_s = q_elems / q_s / 1e6;

    double speedup = ref_ns_per_elem / q_ns_per_elem;

    fprintf(f, "%d,%d,%.9g,%d,%.6g,%.6g,%.6g,%.6g,%.6g,%.6g,%.6g,%.6g,%.6g\\n", n, batch, (double)scale, min_ms,
            ref_ns_per_elem, q_ns_per_elem, speedup, ref_melems_s, q_melems_s, mean_abs, (double)max_abs,
            (double)max_sum_err, top1_mismatch);

    free(x);
    free(r);
    free(q);
  }

  fclose(f);
  fprintf(stdout, "wrote %s (sink=%g)\\n", out_path, (double)g_sink);
  return 0;
}

编辑于 2026-01-21 01:49・中国香港
LLM推理

人工智能算法

边缘计算

​赞同 85​​3 条评论​153 ​喜欢​分享

​申请转载​​

未登录用户

3 条评论

默认
最新

JOJO的落痕

你这个精度都对不上
01-24 · 新加坡

​回复​喜欢

AI 终结者 fs

专用计算装置里都是查表来算exp的吧？

01-22 · 广东

​回复​喜欢

阿龙aloong

作者​

查表在Int8量化推理里是对的，输入只有 256 种可能。但在Float32里要是全查表，查表需要的内存太大，而且读取内存比直接算还要慢

01-22 · 中国香港

​回复​喜欢

关于作者

阿龙aloong​​
个人主页：longweihan.github.io/ai

​ 电子科技大学 电子科学与技术硕士

回答
3
文章
10
关注者
159

​关注他​发私信

大家都在搜
换一换

日本正式允许出口杀伤性武器504 万热
拼多多被罚 15.2 亿且暴力阻碍监管418 万热
19岁女孩挪用1700万当榜一大姐330 万热
为什么流行反向追剧330 万
女子产后被男友起诉退彩礼分娩费329 万热
伊朗最新局势314 万热
库克不再担任苹果 CEO299 万
卡尔南开大学二轮调剂被刷256 万
中将军衔很厉害吗247 万
「16 万年一遇」的彗星来了237 万

推荐阅读

LLM训练：GPU利用率与MFU计算方法
一、引言在进行大模型训练时，我们需要关注GPU资源的利用率，特别是GPU算力利用率通常可以作为大模型训练框架的性能指标，也直接影响训练大模型的成本。我们看到大家普遍使用 MFU（Model FL…

程勇

LLM infra（1）
最近因为deepseek和经常和多机多卡打交道的原因，我对于llm infra非常感兴趣，所以就先开始了这方面的research。 本次阅读是： DeepSeek-V3带火大模型infra，入门看这篇就够了！ 的前半部分…

东川路第一伊蕾娜

从可用到可规模化：LLM 性能部署优化与调试实战
大模型上线后，真正决定体验的往往不是“模型分数”，而是两件事：能不能稳定地快，以及出问题时能不能快速定位。本文聚焦两个工程核心：性能与部署优化、常见问题与调试要点。 一、性能与…

一包铁观音

普通电脑也能跑AI：10个8GB内存的小型本地LLM模型推荐
传统观念中，大语言模型（LLM）的部署通常需要大规模云计算资源和高昂的运营成本。随着模型量化技术和优化算法的快速发展，现在可以在配置有限的个人计算设备上部署强大的LLM系统，即使在RA…

deeph...发表于deeph...