---
title: lsof命令-查看端口占用与进程关联
date: 2026-08-19
tags: [lsof, 端口, 进程, Linux, Shell]
description: 介绍 lsof -i:端口 查看端口被哪个进程占用的用法与输出字段含义，并补充常用变体命令以及与 netstat 的对比。
---

来源：个人笔记整理版（原文仅一行命令，以下为结构化扩展）

### 核心用法

```bash
lsof -i:8888
```

查看 8888 端口被哪个进程占用。

### 输出示例（补充）

```
$ lsof -i:8888
COMMAND   PID  USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
java    12345 root   32u  IPv6 123456      0t0  TCP *:8888 (LISTEN)
```

|||
|---|---|
|COMMAND|进程名（java）|
|PID|进程号（12345）|
|USER|属主（root）|
|NAME|监听地址与状态（TCP *:8888 LISTEN）|


### 常用变体（补充）

```bash
# 查看某端口（TCP+UDP 都显示）
lsof -i:8888

# 仅查看 TCP
lsof -iTCP:8888

# 查看某个进程占用的所有端口
lsof -i -P | grep 12345

# 查看某个程序的所有打开文件
lsof -p 12345

# 指定用户名过滤
lsof -i -u root
```



使用建议：lsof -i:端口 是排查端口占用最直接的方式；-P 关闭端口名解析（如 8888 不显示为服务名），输出更快更清晰。

### lsof 与 netstat 对比（补充）

||||
|---|---|---|
|查看端口占用|lsof -i:端口|netstat -nltp \| grep 端口|
|查看进程打开的文件|✅ 强项|❌|
|需要 root|建议（否则 PID 可能隐藏）|需要（-p 参数）|


整理版本：v1.0 · 2026-08-19
