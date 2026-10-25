我来说几种方案怎样避免将密钥上传到 repo 吧。

1 终极方案：我推荐大家使用 awslabs 的 **git-secrets**，配合 git 钩子，可以在提交或者 push 前自动扫描代码，看看有没有问题，很方便。

github.com/awslabs/git-se…

Stars: 11.2K

2 使用**环境变量**，.env 文件放入到 .gitingore 最古老也最有效的方式，一般项目都用这个。

3 假如重度使用 Github， 可以使用 **Github Encrypted secrets**

docs.github.com/en/actions/sec…

Github Actions 中可以使用，可以直接在组织级别共享，很方便好用。

希望大家以后都能避免这个问题，密钥不再泄漏，钱包不会被盗。