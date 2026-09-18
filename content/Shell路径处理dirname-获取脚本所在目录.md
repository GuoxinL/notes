---
title: Shell路径处理dirname-获取脚本所在目录
date: 2026-08-19
tags: [Shell, dirname, 路径, bash, 脚本]
description: 介绍 dirname 获取目录或文件上一层路径的用法，以及脚本中用 $(cd "$(dirname "$0")"; pwd) 获取脚本所在目录的经典写法与 basename 对比。
---

来源：个人笔记整理版

### 一、核心用途

dirname 用于获取某个目录或文件的上一层路径。

```bash
dirname /etc/hosts
# 输出：/etc（文件 hosts 的上一层路径）

dirname /usr/bin/
# 输出：/usr（目录的上一层路径）

dirname /etc
# 输出：.（当前正处于该目录下，返回点号）
```

### 二、脚本中获取当前路径（经典写法）

```bash
CURRENT_DIR="$(cd "$(dirname "$0")"; pwd)"
```

拆解：

|||
|---|---|
|$0|shell 脚本的第 0 个参数（脚本自身路径）|
|dirname "$0"|取脚本所在目录|
|cd ...|切换到该目录|
|pwd|输出当前（绝对）路径|
|$(...)|命令替换：括号中的命令新开一个 shell 顺序执行，分号分隔两条命令|


效果：无论脚本从哪里被调用（绝对/相对路径、软链接），都能拿到脚本文件所在目录的绝对路径——常用于脚本内引用同目录下的资源文件、配置文件。

### 三、补充：dirname 与 basename 对比

||||
|---|---|---|
|dirname|取路径部分|/etc|
|basename|取文件名部分|hosts|


```bash
# 组合使用：切换脚本所在目录
cd "$(dirname "$0")"
# 或获取脚本文件名
BASENAME="$(basename "$0")"
```

整理版本：v1.0 · 2026-08-19
