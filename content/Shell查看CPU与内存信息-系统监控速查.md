---
title: Shell查看CPU与内存信息-系统监控速查
date: 2026-08-19
tags: [Shell, CPU, 内存, /proc, dmidecode]
description: 整理 Shell 查看 CPU 与内存的常用命令：从 /proc/cpuinfo 读型号与核心数，从 /proc/meminfo 读总内存，用 dmidecode 查内存条。
---

来源：个人笔记整理版

### 一、查看 CPU 信息

#### 命令

```bash
cat /proc/cpuinfo | grep "model name" && cat /proc/cpuinfo | grep "physical id"
```

#### 结果

```
model name	: Intel(R) Xeon(R) Gold 6148 CPU @ 2.40GHz
model name	: Intel(R) Xeon(R) Gold 6148 CPU @ 2.40GHz
model name	: Intel(R) Xeon(R) Gold 6148 CPU @ 2.40GHz
model name	: Intel(R) Xeon(R) Gold 6148 CPU @ 2.40GHz
physical id	: 0
physical id	: 1
physical id	: 2
physical id	: 3
```

- model name 行数 = 逻辑核心数（此处 4 核）
- physical id 去重数 = 物理 CPU 颗数（此处 4 颗）

### 二、查看内存信息

#### 命令

```bash
cat /proc/meminfo | grep MemTotal
```

#### 结果

```
MemTotal:        8173720 kB
```



8173720 kB ≈ 7.8 GB。

### 三、查看简要内存信息（内存条）

#### 命令

```bash
/usr/sbin/dmidecode | grep -A 16 "Memory Device" | grep -E "Size|Locator" | grep -v Bank
```

#### 结果

```
Size: 8192 MB
Locator: DIMM 0
```



需要 root 权限；Size 为单条内存容量，Locator 为插槽位置。

### 四、速查命令汇总（补充）

|||
|---|---|
|CPU 型号|cat /proc/cpuinfo \| grep "model name" \| uniq|
|逻辑核心数|nproc|
|物理 CPU 数|cat /proc/cpuinfo \| grep "physical id" \| sort -u \| wc -l|
|总内存|free -h|
|内存条信息|sudo dmidecode -t memory|
|内存使用率|free -h \| awk 'NR==2{print $3/$2*100"%"}'|
|综合概览|top / htop|



推荐：日常查 CPU/内存优先用 lscpu 和 free -h，比 /proc 直读更直观（补充）。

整理版本：v1.0 · 2026-08-19
