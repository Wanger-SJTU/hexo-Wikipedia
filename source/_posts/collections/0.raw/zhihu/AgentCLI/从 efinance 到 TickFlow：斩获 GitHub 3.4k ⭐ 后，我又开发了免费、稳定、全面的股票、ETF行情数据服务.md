---
title: "从 efinance 到 TickFlow：斩获 GitHub 3.4k ⭐ 后，我又开发了免费、稳定、全面的股票、ETF行情数据服务"
date: 2026-03-29
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/2015793350209450091
---

#### 📌 太长不看

- **官网**：https://tickflow.org
- **文档**：https://docs.tickflow.org
- **Github**：[https://github.com/tickflow-org/tickflow](https://link.zhihu.com/?target=https%3A//github.com/tickflow-org/tickflow)

#### 前言

2021 年，我发布了 **efinance**，一个专注从东方财富获取股票、ETF、期货、基金等数据的 Python 库。至今累计获得 3.4k ⭐。开发难度不大，但它的火爆说明了量化研究者对高质量数据的需求非常大。

当时接口没有严格限流，efinance 上手简单、数据齐全，受到广泛好评。可惜到 2025 年上半年，东方财富开始限制匿名接口调用，频繁访问会被阻断，需要验证或审核。通过后又可能被拉入“小黑屋”，反复循环。

AI 的快速发展降低了量化研究门槛，参与人数激增，导致数据提供方带宽成本上升，限流在所难免。但限流并不能阻挡大家的热情，自此，efinance 仓库收到越来越多关于数据稳定性的问题反馈。可见，一个稳定且价格合理的数据源，已经成为量化研究者的刚需。

#### TickFlow 的诞生

为了解决这一痛点，我和团队启动了新项目 **TickFlow**，提供覆盖 A 股行情、K 线、财务数据的 API。目标是：

- **低延迟、高可用**
- **让开发者专注策略本身，而非数据抓取**
开发过程中，有几十位 GitHub 网友作为早期用户，他们见证了 TickFlow 从 0 到 1 的成长。解决他们的需求，也能覆盖大部分量化研究者的需求。

#### 定价与服务

TickFlow 区分两类用户：

- **免费用户**：只需要日 K 级别历史数据
- **高级用户**：需要实时行情、分钟级 K 线及全市场覆盖
免费用户无需注册和 API key；高级用户需注册获取 API key，以保障流量和权限管理。

#### 产品对比

特性TickFlowTushareAkshare数据稳定性✅ 可靠✅ 可靠❌ 完全爬虫，易中断日K线全量历史，免费层支持不复权、等差/等比复权，可批量获取全量历史，免费层仅不复权全量历史，复权依赖数据源分钟K线近一年历史 + 当日实时部分高价付费仅近几天分钟级实时行情全量 A 股、ETF、指数需付费且昂贵❌ 无可靠实时行情接入门槛5 分钟上手，文档齐全，SDK + API 接入低低数据完整性历史 K 线、财务、除权因子免费版有限，高阶贵数据缺失多，零散开发体验免费套餐长期可用，按需升级免费版受限，高阶贵稳定性差，维护成本高** TickFlow 的优势：低门槛、稳定、免费套餐可长期使用、高阶功能按需升级。
#### 快速体验

TickFlow 提供官方 Python SDK**，支持 A 股、ETF、美股、港股、国内期货等。

**完整文档**：https://docs.tickflow.org
#### 安装

`# 安装完整版（支持 DataFrame 与进度条）
pip install "tickflow[all]" --upgrade

# 安装基础版
pip install tickflow`

** 支持 Python 3.9+，推荐 3.10+。
#### 初始化客户端

#### 免费服务（无需注册）

`from tickflow import TickFlow

tf = TickFlow.free()  # 免费服务

# 获取日K线
df = tf.klines.get("600000.SH", period="1d", count=100, as_dataframe=True)
print(df.tail())

# 获取标的信息
instruments = tf.instruments.batch(symbols=["600000.SH", "000001.SZ"])
print(instruments)`

特点**：

- ✅ 无需注册
- ✅ 提供历史日 K 线（1d、1w、1M、1Q、1Y）
- ✅ 标的信息、交易所、标的池查询
- ❌ 不提供实时行情
- ❌ 不提供分钟级 K 线

#### 完整服务（需注册 API key）

- **获取 API Key****登录 tickflow.org，在控制台生成 API key。
- 配置认证**
**方式一：直接传入**

`from tickflow import TickFlow

tf = TickFlow(api_key="your-api-key")`

**方式二：环境变量（Windows / Linux / Mac）**

`# Linux / Mac
export TICKFLOW_API_KEY="your-api-key"

# Windows CMD
set TICKFLOW_API_KEY=your-api-key
from tickflow import TickFlow

tf = TickFlow()  # 自动读取环境变量`

- **发起第一个请求**
`quotes = tf.quotes.get(symbols=["600000.SH", "000001.SZ"])
for q in quotes:
    print(f"{q['symbol']}: {q['last_price']}")`

**完整服务特点**：

- ✅ 实时行情数据
- ✅ 分钟级 K 线（5m、15m、30m、60m、4h）
- ✅ 日内分时数据
- ✅ 高调用频率支持

#### 标的代码与支持市场

统一格式：**`代码.市场后缀`**，示例：

- 股票：`600000.SH`（浦发银行）、`000001.SZ`（平安银行）
- ETF：`510300.SH`（沪深 300 ETF）
- 指数：`000001.SH`（上证指数）
- 期货：`au2604.SHF`（上期所黄金主力合约）
后缀市场说明SH上海证券交易所沪市 A 股、ETF、债券等SZ深圳证券交易所深市 A 股、创业板、ETF 等BJ北京证券交易所北交所股票SHF上海期货交易所上期所期货DCE大连商品交易所大商所期货ZCE郑州商品交易所郑商所期货CFX中国金融期货交易所股指/国债期货INE上海国际能源交易中心原油等期货GFE广州期货交易所广期所期货US美股美国证券市场HK港股香港联交所** 支持 A 股、国内期货，部分美股、港股接口已支持格式，但暂无数据。
#### 基础用法示例

#### K 线

`# 单标的获取日K线
klines = tf.klines.get("600000.SH", period="1d", count=10000, as_dataframe=True)
print(klines.tail(5))

# 批量获取多标的
symbols = ["600000.SH", "000001.SZ", "600519.SH"]
dfs = tf.klines.batch(symbols, period="1d", count=10000, as_dataframe=True, show_progress=True)
print(list(dfs.keys()))`

#### 日内分时 K 线

`# 单标的 1 分钟 K 线
df = tf.klines.intraday("600000.SH", period="1m", as_dataframe=True)
print(df.tail())

# 批量
dfs = tf.klines.intraday_batch(["600000.SH", "000001.SZ"], as_dataframe=True, show_progress=True)
print(dfs["600000.SH"].tail())`

#### 实时行情

`# 按标的查询
quotes = tf.quotes.get(symbols=["600000.SH", "000001.SZ"], as_dataframe=True)

# 按标的池查询
quotes_a = tf.quotes.get(universes=["CN_Equity_A"], as_dataframe=True)
quotes_etf = tf.quotes.get(universes=["CN_ETF"], as_dataframe=True)`

#### 异步使用

`import asyncio
from tickflow import AsyncTickFlow

async def main():
    async with AsyncTickFlow(api_key="your-api-key") as tf:
        df = await tf.klines.get("600000.SH", as_dataframe=True)
        print(df.tail())

        tasks = [tf.klines.get(s, as_dataframe=True) for s in ["600000.SH", "000001.SZ"]]
        results = await asyncio.gather(*tasks)

asyncio.run(main())`

#### 结语

TickFlow 提供低延迟、稳定、易用**的行情数据服务，适合量化研究者快速上手：

- 免费服务：历史日 K，直接用，无需注册
- 完整服务：实时行情、分钟级 K 线，高并发支持
无论你是初学者还是专业量化团队，TickFlow 都能帮助你专注策略开发，而非数据抓取。

> 官网：https://tickflow.org
文档：https://docs.tickflow.org
