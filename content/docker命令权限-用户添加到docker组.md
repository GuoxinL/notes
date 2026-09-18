---
title: docker命令权限-用户添加到docker组
date: 2026-08-19
tags: [docker, 权限, 用户组, Linux, gpasswd]
description: docker 默认使用属主为 root 的 Unix Socket，普通用户直接执行会报权限不足；将用户加入 docker 组并用 newgrp 刷新组信息后即可免 sudo 运行。
---

来源：个人笔记整理版

### 问题背景

docker 进程使用 Unix Socket（/var/run/docker.sock）而不是 TCP 端口。默认情况下该 Unix socket 属于 root 用户，因此普通用户需要 root 权限才能访问，直接执行 docker 命令会报权限不足。

### 解决方案：将用户加入 docker 组

```bash
sudo groupadd docker          # 添加 docker 用户组（若不存在）
sudo gpasswd -a $XXX docker   # 将指定用户加入 docker 组（XXX 为用户名）
sudo gpasswd -a $USER docker  # 将当前用户加入 docker 组
newgrp docker                 # 刷新当前会话的组信息（重新登录亦可）
```

### 命令说明

|||
|---|---|
|groupadd docker|创建 docker 用户组（多数发行版安装 docker 后已自动创建，可跳过）|
|gpasswd -a 用户 docker|把用户追加（add）到 docker 组|
|newgrp docker|使组变更立即生效，无需重新登录|


### 验证

```bash
# 重新登录（或 newgrp）后执行
docker ps
# 无权限报错即成功
```

### 补充说明

- 安全提醒：docker 组等同于 root 权限（组内用户可挂载宿主机目录、以特权模式运行容器），仅对可信用户授权（补充）
- 若 docker 命令本身不存在，先安装：yum install -y docker 或 apt install -y docker.io（补充）
- 某些系统还需重启 docker 服务：systemctl restart docker（补充）

整理版本：v1.0 · 2026-08-19
