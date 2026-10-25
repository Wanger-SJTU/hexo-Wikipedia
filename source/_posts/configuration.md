---
title: 主题配置
date: 2026-09-11 11:10:00
updated: 2026-10-15 10:30:00
summary: 汇总主题配置文件中的常用开关，包括站点副标题、目录行为与图谱选项。
subtitle: 配置项
navigation: 参考
nav_title: 主题配置
nav_order: 40
tags: [配置, 主题]
categories: [参考]
---

主题配置位于 `themes/hexowiki/_config.yml`，与站点配置相互独立。修改后需要重新生成站点才能生效，开发模式下会自动重建。

## 常用开关

| 配置项 | 类型 | 说明 |
|---|---|---|
| wiki_subtitle | 字符串 | 标题下的站点副标题 |
| sidebar_filter | 布尔 | 是否显示侧栏筛选框 |
| sidebar_badge | 布尔 | 是否显示反链数徽标 |
| graph_depth | 数字 | 局部图的展开跳数 |
| search_enabled | 布尔 | 是否启用搜索建议 |
| edit_url | 字符串 | 「编辑」标签的跳转地址 |

## 示例

```yaml
wiki_subtitle: 自由的知识库
sidebar_filter: true
sidebar_badge: true
graph_depth: 2
search_enabled: true
```

## 与页面属性的分工

主题配置控制全站行为，页面属性控制单篇条目。例如侧栏筛选框属于全站开关，而条目是否显示在侧栏由页面属性中的隐藏标记决定。页面字段的含义见 [[页面属性]]，目录的组织方式见 [[多级目录]]。

## 数据接口

图谱与统计依赖生成阶段产出的数据文件，其路径与字段见 [[数据格式]]。若修改了链接相关的配置，建议同时核对统计结果是否随之变化。
