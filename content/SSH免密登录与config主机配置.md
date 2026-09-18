---
title: SSH免密登录与config主机配置
date: 2026-08-19
tags: [SSH, ssh-keygen, ssh-copy-id, 免密登录, Linux]
description: 整理 SSH 密钥生成、ssh-copy-id 推送公钥实现免密登录，以及 ~/.ssh/config 多主机别名配置的完整步骤与常用参数说明。
---

来源：个人笔记整理版

### 一、生成密钥

```bash
ssh-keygen -t rsa
```

生成 RSA 密钥对：~/.ssh/id_rsa（私钥）+ ~/.ssh/id_rsa.pub（公钥）。现代系统也常用 -t ed25519（补充）。

### 二、免密登录

```bash
ssh-copy-id user@ip
```

将本地公钥推送到远程主机 ~/.ssh/authorized_keys，之后 ssh user@ip 免密登录（需先输入一次密码完成推送）。

### 三、config 文件：为多台主机配置快捷登录

打开配置文件：

```bash
vim ~/.ssh/config
```

示例配置：

```ini
Host wotoken
    HostName 192.168.2.18
    IdentityFile ~/.ssh/id_rsa
    User root
    Port 22
    IdentitiesOnly yes

Host bobaotest
    HostName 192.168.2.1
    IdentityFile ~/.ssh/id_rsa
    User root
    Port 22
    IdentitiesOnly yes

Host dev02
    HostName dev02.senses-ai.com
    Port        22
    User        yangqing
```

登录（直接用别名）：

```bash
ssh wotoken
ssh bobaotest
ssh dev02
```

### config 常用参数说明（补充）

|||
|---|---|
|Host|别名（后续 ssh 别名 使用）|
|HostName|实际主机名或 IP|
|User|登录用户名|
|Port|SSH 端口（默认 22）|
|IdentityFile|指定私钥文件|
|IdentitiesOnly yes|只使用指定的私钥，不尝试其他密钥|
|ProxyJump|跳板机配置（补充）|


技巧（补充）：多个配置可用 Host * 写公共默认项，如 IdentityFile、User，减少重复。

整理版本：v1.0 · 2026-08-19
