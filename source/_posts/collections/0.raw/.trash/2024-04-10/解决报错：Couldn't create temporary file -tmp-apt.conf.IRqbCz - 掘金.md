---
id: ae0accaf-6a97-4693-ab99-6689b9e80a35
---

# 解决报错：Couldn't create temporary file /tmp/apt.conf.IRqbCz - 掘金
#Omnivore

[Read on Omnivore](https://omnivore.app/me/couldn-t-create-temporary-file-tmp-apt-conf-i-rqb-cz-18ec6da2169)
[Read Original](https://juejin.cn/post/7026352148719861797)

## Highlights

> 但是，执行 apt-get install vim 命令时，提示没有仓库记录，因此，需要先更新包管理仓库列表，也就是执行 apt-getupdate 命令，但是遇到了如下报错信息：
> root@al-bj-boom-hb-backstage-01:/etc/nginx# apt-get update
> Get:1 http://security.debian.org/debian-security buster/updates InRelease [65.4 kB]
> Err:1 http://security.debian.org/debian-security buster/updates InRelease
>   Couldn't createtemporaryfile /tmp/apt.conf.IRqbCz forpassing config to apt-keyGet:2http://deb.debian.org/debian buster InRelease [122 kB]
> Err:2http://deb.debian.org/debian buster InRelease
>   Couldn't create temporary file /tmp/apt.conf.Afcu25 for passing config to apt-key
> Get:3 http://deb.debian.org/debian buster-updates InRelease [51.9 kB]
> Err:3 http://deb.debian.org/debian buster-updates InRelease
>   Couldn't createtemporaryfile /tmp/apt.conf.fztemY forpassing config to apt-key
> Reading package lists... Done
> W: GPG error: http://security.debian.org/debian-security buster/updates InRelease: Couldn't create temporary file /tmp/apt.conf.IRqbCz for passing config to apt-key
> E: The repository 'http://security.debian.org/debian-security buster/updates InRelease' is not signed.
> N: Updating from such a repository can't be done securely, andis therefore disabled by default.
> N: See apt-secure(8) manpage for repository creationanduser configuration details.
> W: GPG error: http://deb.debian.org/debian buster InRelease: Couldn't create temporary file /tmp/apt.conf.Afcu25 for passing config to apt-key
> E: The repository 'http://deb.debian.org/debian buster InRelease' is not signed.
> N: Updating from such a repository can't be done securely, andis therefore disabled by default.
> N: See apt-secure(8) manpage for repository creationanduser configuration details.
> W: GPG error: http://deb.debian.org/debian buster-updates InRelease: Couldn't create temporary file /tmp/apt.conf.fztemY for passing config to apt-key
> E: The repository 'http://deb.debian.org/debian buster-updates InRelease' is not signed.
> N: Updating from such a repository can't be done securely, andis therefore disabled by default.
> N: See apt-secure(8) manpage for repository creationanduser configuration details.
> 
> 解决
> 解决方法总结下来也非常简单，执行下面的命令就可以了：
> chmod 777 /tmp
> 执行后，再执行 apt-getupdate 命令，终于成功啦！ [⤴️](https://omnivore.app/me/couldn-t-create-temporary-file-tmp-apt-conf-i-rqb-cz-18ec6da2169#259590b1-59aa-4880-b380-d57ae9c45663)  ^259590b1

