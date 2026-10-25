# 一行配置，768 维记忆：OpenClaw 向量搜索升级实战

> 来源：https://caprompt.com/news/1399
> 作者：零重力瓦力
> 发布：2026-04-19

---

## 背景

用 OpenClaw 两个多月，跑在本地 Windows 上，通过 QQ 对话。记忆文件越来越多，但搜索越来越不准——问微博 API 参数，返回日常闲聊；问项目技术栈，返回微博热搜。信息都在文件里，就是搜不到。

## 问题根因

向量搜索配置了 `vector.enabled: true`，模型 `nomic-embed-text` 也拉取了，但 **OpenClaw 启动时 Ollama 没在跑**。向量搜索静默降级到纯文本搜索，没有任何报错。

## 升级前后对比

| 场景 | 关键词搜索 | 向量搜索 |
|------|-----------|---------|
| 查项目 API 端点 | 返回所有含"API"的记录，目标被淹没 | 第一条命中 |
| 回忆技术选型 | 返回所有含"技术栈"的条目 | 精准返回项目分析记录 |
| 中文搜英文内容 | 跨语言完全失效 | 中英混合也能命中 |

## 升级三步

### 1. 确保 Ollama 在线

```bash
curl http://localhost:11434/api/tags
ollama serve  # 如未启动
```

Windows 用户建议设为开机自启服务。

### 2. 拉取嵌入模型

```bash
ollama pull nomic-embed-text
```

274 MB，CPU 就能跑，不需要 GPU。

### 3. 配置 + 重启

```json
{
  "memorySearch": {
    "store": { "vector": { "enabled": true } },
    "provider": "ollama",
    "remote": { "baseUrl": "http://localhost:11434" },
    "model": "nomic-embed-text"
  }
}
```

三个关键点：
- `provider` 必须是 `"ollama"`
- `baseUrl` 指向本地 Ollama
- `model` 大小写敏感，必须跟 `ollama list` 输出一致

```bash
openclaw gateway restart
```

重启后 Gateway 自动重建向量索引。

## 验证

搜索结果的 debug 字段里应有：
```
"provider": "ollama"
"model": "nomic-embed-text"
```

## 为什么选 nomic-embed-text

- **隐私第一**：数据不离开本机
- **274 MB 零门槛**：不需要 GPU、不需要 Python
- **8K 上下文**：能处理整篇笔记
- **中英混合友好**：混合场景表现稳定

## 踩坑记录

| 坑 | 说明 |
|----|------|
| 静默降级 | 向量搜索不可用时不报错，退回文本搜索。用了一周残废版都不知道 |
| 模型名大小写 | `nomic-embed-text` ≠ `Nomic-Embed-Text` |
| Ollama 没启动 | 即使后来启动了，OpenClaw 也不会自动重连，必须重启 Gateway |
| Ollama 嵌入适配器 bug | 2026.4.14 修复，之前版本务必升级 |
| 重装后索引丢失 | 重启 Gateway 自动重建，但需要时间 |

## 升级清单

- [ ] 安装 Ollama：`winget install Ollama.Ollama`（Windows）/ `brew install ollama`（macOS）
- [ ] 拉取嵌入模型：`ollama pull nomic-embed-text`
- [ ] 确认 Ollama 在运行
- [ ] Ollama 设为开机自启
- [ ] 配置 `openclaw.json` 的 memorySearch
- [ ] 确保 OpenClaw ≥ 2026.4.14
- [ ] `openclaw gateway restart`
- [ ] 测试搜索，验证 provider 和 model 字段

## 结论

一行配置，一个 274MB 模型，一次重启。memory_search 从"逐字匹配"升级到"理解语义"。AI 的记忆终于从数据库查询变成了真正的回忆。
