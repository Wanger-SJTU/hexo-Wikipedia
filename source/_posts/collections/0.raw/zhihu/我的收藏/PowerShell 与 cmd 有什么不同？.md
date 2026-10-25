---
title: PowerShell 与 cmd 有什么不同？
date: "2026-04-17 00:00:00"
updated: "2026-04-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/PowerShell-与-cmd-有什么不同/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/22611859/answer/75054963209
---


2 人赞同了该回答

大家好！今天我要和大家分享一个实用的小技巧：如何为 PowerShell 设置代理。无论你是为了访问外网的资源，还是为了加速下载，这个方法都能派上用场。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_d2f906483639.jpg)

### **为什么需要设置代理？**

在某些网络环境下，直接访问某些网站或服务可能会很慢，甚至无法访问。设置代理可以帮助我们绕过这些限制，提高访问速度。

### **如何设置代理？**

我们将通过创建 PowerShell 函数来实现快速开启和关闭代理的功能。

#### **步骤 1：找到并编辑 PowerShell 配置文件**

首先，我们需要找到 PowerShell 的配置文件。如果你还没有创建过，可以用以下命令创建：

`if (!(Test-Path -Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force
}
notepad $PROFILE`

这会打开你的 PowerShell 配置文件。配置文件的默认路径通常是： `C:\Users\你的用户名\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`

#### **步骤 2：添加代理函数**

在打开的配置文件中，添加以下函数：

`function proxy {
    $env:http_proxy = "http://127.0.0.1:10809"
    $env:https_proxy = "http://127.0.0.1:10809"
    [System.Net.WebRequest]::DefaultWebProxy = New-Object System.Net.WebProxy("http://127.0.0.1:10809")
    Write-Host "Proxy enabled: http://127.0.0.1:10809" -ForegroundColor Green
}

function unproxy {
    $env:http_proxy = $null
    $env:https_proxy = $null
    [System.Net.WebRequest]::DefaultWebProxy = $null
    Write-Host "Proxy disabled" -ForegroundColor Yellow
}

function check-proxy {
    if ($env:http_proxy -or $env:https_proxy) {
        Write-Host "Current proxy settings:" -ForegroundColor Cyan
        Write-Host "HTTP Proxy: $env:http_proxy"
        Write-Host "HTTPS Proxy: $env:https_proxy"
    } else {
        Write-Host "No proxy is currently set." -ForegroundColor Cyan
    }
}`

#### **步骤 3：保存并重新加载配置**

保存文件，然后重新启动 PowerShell 或运行 `. $PROFILE` 来重新加载配置文件。

### **如何使用**

现在，你可以在 PowerShell 中使用以下命令：

- 输入 `proxy` 来启用代理
- 输入 `unproxy` 来禁用代理
- 输入 `check-proxy` 来查看当前的代理设置

### **注意事项**

- 这个设置只影响当前的 PowerShell 会话，不会影响其他应用程序或系统级的代理设置。
- 如果你的代理地址和端口不是 `127.0.0.1:10809`，请相应地修改函数中的 URL。
- 如果你的代理需要认证，你需要修改函数来包含用户名和密码。

### **结语**

通过这个简单的设置，你可以轻松地在 PowerShell 中切换代理。这不仅可以帮助你更好地管理网络连接，还能提高工作效率。希望这个小技巧能对大家有所帮助！如果你有任何问题或建议，欢迎在评论区留言。

祝大家使用愉快，网络畅通！

送礼物

还没有人送礼物，鼓励一下作者吧

[编辑于 2025-01-09 10:06](//www.zhihu.com/question/22611859/answer/75054963209)・广东

​添加评论​1 ​喜欢​分享

​​

收起​