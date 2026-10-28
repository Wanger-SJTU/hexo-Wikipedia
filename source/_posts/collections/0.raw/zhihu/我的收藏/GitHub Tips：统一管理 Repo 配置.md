---
title: "GitHub Tips：统一管理 Repo 配置"
date: "2022-12-18 00:00:00"
updated: "2022-12-18 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/GitHub-Tips-统一管理-Repo-配置/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/592708303"
---


### 背景

对于我们这些经常建库的开源者来说，有不少配置都需要重复操作，如：

- 合并 PR时不允许 merge，只能 squash merge
- 主分支改为 master 而不是 main
- 保护 master 分支
- 配置 GitHub Actions
- 配置 Issue Template
- 等等...

### `${owner}/.github` 仓库

GitHub 有一些特殊的仓库规则，如你的账号名下，可以创建一个 `.github` 的仓库，可以作为该账号的全局配置使用，具体仓库也可以单个配置进行覆盖。详见 [官方文档](https://link.zhihu.com/?target=https%3A//docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file)，示例：[https://github.com/artusjs/.github](https://link.zhihu.com/?target=https%3A//github.com/artusjs/.github)

### Profile 介绍

- <strong>个人账号</strong>
- 新建同名仓库，如 [sindresorhus/sindresorhus](https://link.zhihu.com/?target=https%3A//github.com/sindresorhus/sindresorhus) 即可。
- 详见[官方文档](https://link.zhihu.com/?target=https%3A//docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/managing-your-profile-readme)。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6f3dfc2233e6.jpg)

image.png

- 组织账号
- `${owner}/.github/README.md` 是公开的介绍
- `${owner}/.github-private/README.md` 是仅成员可见的介绍
- 详见[官方文档](https://link.zhihu.com/?target=https%3A//docs.github.com/en/organizations/collaborating-with-groups-in-organizations/customizing-your-organizations-profile%23adding-a-member-only-organization-profile-readme)。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_65bacf889ddc.jpg)

image.png

### Issue 和 PR 模版

让开发者在提交 Issue 或 PR 的时候，必须按你要求的格式填写内容，如下图：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_766198ee2152.jpg)

image.png

配置方式：

- 配置描述文件为：`.github/ISSUE_TEMPLATE/*.yml`
- 支持全局默认配置和单个仓库配置
- 相关配置定义方式参见：[官方文档](https://link.zhihu.com/?target=https%3A//docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository)

### 仓库配置 ⭐️⭐️⭐️

如前文提到的，仓库的一些配置开关，这个能力官方并没有支持，仅提供了对应的 API，不过我们可以使用社区开发的 GitHub App 来享受该拓展能力。

- 首先，安装 [https://github.com/apps/settings](https://link.zhihu.com/?target=https%3A//github.com/apps/settings) 这个 GitHub App，选择你需要的账号。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fc8a7aacd802.jpg)

image.png

- 其次，定义 `.github/settings.yml` 文件
- 同样是可以在全局的 `.github`仓库或具体仓库中。
- 你可以直接 Fork 我们的配置，见文末。
- 详细的配置看该 GitHub App [文档](https://link.zhihu.com/?target=https%3A//github.com/apps/settings)。
repository:
    homepage: https://artusjs.github.io/
    topics: node.js, framework

    # 默认分支
    default_branch: master

    # 合并方式
    allow_squash_merge: true
    allow_merge_commit: false

    # 合并后自动删除分支
    delete_branch_on_merge: true

>  PS：周末体验了下，用 Probot + Vercel 来写一个 GitHub App 非常的简单，就几行代码，自动化部署又免费，可以用来做一些自动化操作。

### Workflow 模版

- 在 `.github`仓库新建 `workflow-templates` 目录，配置对应的 yml 和 json 。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_912232a4e5a0.jpg)

image.png

- 然后在你的其他仓库的 Action 页即可直接配置。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_10da3bf87a41.jpg)

image.png

详见[官方文档](https://link.zhihu.com/?target=https%3A//docs.github.com/en/actions/using-workflows/creating-starter-workflows-for-your-organization)。

### 其他文件

详见[官方文档](https://link.zhihu.com/?target=https%3A//docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file%23supported-file-types)，常用如下：

- `CONTRIBUTING.md`： 贡献说明
- `CODE_OF_CONDUCT.md`：行为准则声明
- `FUNDING.yml`：捐献配置
- `SECURITY.md`：提供安全问题反馈的操作指引
- `SUPPORT.md`：技术支持指引

### 如何抄作业？

直接 Fork 我们的 [github.com/artusjs/.github](https://link.zhihu.com/?target=https%3A//github.com/artusjs/.github)，然后定时 Sync 下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ab3a02d17b19.jpg)

image.png> 这个仓库也刚刚建立，如 issue template 这些还没搞，可以先 Watch 后续 Sync 更新。

### 写在最后

不知不觉，GitHub 已经陪伴我十几年了，深深的影响了我的职业生涯。

GitHub 自从被 M$ 收购后，推出了越来越多对开发者很友好的功能，如 Codespace、Copilot、Actions 等等。

但其实远不止这些聚光灯下的 Feature，不过正如每日陪伴你的人很容易被你忽略一样，笔者也是这次在重新整理开源项目的运作规则时，才发现本文中提到的这些小特性。后续本专栏会不定期更新类似的 GitHub Tips。
