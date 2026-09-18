---
title: 网络压测-conntrack连接跟踪排查
date: 2026-08-19
tags: [conntrack, 网络, 压测, 连接跟踪, iptables]
description: 整理压测场景下用 conntrack -L 查看连接跟踪表的用法：排查连接数异常增长、连接来源与状态，以及 conntrack 表满丢包的处理方式。
---

来源：个人笔记整理版（原文仅一行命令，以下为结构化扩展）

### 核心命令

```bash
conntrack -L | grep 30003
```

在压测场景下，查看连接跟踪表中与端口 30003 相关的连接记录，用于排查：

- 连接数是否异常增长（如压测产生的连接未正常回收）
- 目标端口上的连接来源（源 IP、状态）
- 是否触发 conntrack 表满（nf_conntrack: table full 丢包）

### 输出示例（补充）

```bash
$ conntrack -L | grep 30003
tcp 6 431999 ESTABLISHED src=10.0.0.1 dst=10.0.0.2 sport=51234 dport=30003 src=10.0.0.2 dst=10.0.0.1 sport=30003 dport=51234 [ASSURED] mark=0 use=1
```

|||
|---|---|
|tcp 6|协议类型|
|431999|剩余存活时间（秒）|
|ESTABLISHED|连接状态|
|src/dst + sport/dport|五元组信息（前组为请求方向，后组为应答方向）|
|[ASSURED]|已被确认为有效连接|


### 常用变体（补充）

```bash
# 查看全部连接
conntrack -L

# 按状态统计
conntrack -S

# 查看表容量及使用率
cat /proc/sys/net/netfilter/nf_conntrack_count
cat /proc/sys/net/netfilter/nf_conntrack_max

# 实时监控新连接数
watch -n1 'conntrack -L | wc -l'
```

### 压测排障速查（补充）

||||
|---|---|---|
|table full 丢包|conntrack 表满|调大 nf_conntrack_max 或缩短超时|
|大量 TIME_WAIT|短连接过多|启用 tcp_tw_reuse|
|同 IP 连接被丢弃|触发连接数限制|检查 sysctl 连接跟踪限制|



⚠️ conntrack -L 需要 root 权限；内核需加载 nf_conntrack 模块（modprobe nf_conntrack）。

整理版本：v1.0 · 2026-08-19
