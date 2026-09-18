---
title: Shell之xgrep-xargs命令速查
date: 2026-08-19
tags: [Shell, xargs, grep, 管道, Linux]
description: xargs 把标准输入转换成命令参数，解决管道只能传文本不能传参数的问题；整理 -n、-I、-0、-P 等常用参数与批量删除、压缩等场景示例。
---


来源：个人笔记整理版（原文为空占位，以下为补充整理）

⚠️ 说明：源文件 Shell 之 xargs.md 仅含标题（占位文档，无正文）。此处按目录主题整理 xargs 命令 速查，供参考。

### 一、xargs 是什么

xargs（execute arguments）将标准输入转换为命令参数，是管道命令的"参数传递器"，用于解决"管道只能传文本、不能传参数"的问题。

### 二、核心用法

```bash
# 基本用法：把 find 结果作为参数传给 rm
find . -name "*.tmp" | xargs rm -f

# 每行一个参数执行一次命令
ls *.tar.gz | xargs -n1 tar xzvf

# 指定分隔符（默认空白；文件名含空格时用 \0）
find . -name "*.log" -print0 | xargs -0 rm -f
```

### 三、常用参数

|||
|---|---|
|-n N|每次执行命令使用 N 个参数|
|-I {}|用 {} 占位符替换参数（命令中间位置）|
|-0|以 \0 分隔输入（配合 -print0 处理含空格文件名）|
|-P N|并行执行 N 个进程|
|-t|先打印命令再执行（调试）|
|-p|执行前交互确认|


### 四、典型场景（补充）

```bash
# 批量删除
find /tmp -name "core.*" | xargs rm -rf

# 批量压缩
find . -name "*.log" | xargs -I {} gzip {}

# 并行压缩（4 进程）
find . -name "*.log" | xargs -P4 -I {} gzip {}

# 统计文本行数
ls *.txt | xargs wc -l

# 多行转单行
cat list.txt | xargs
```

### 五、xgrep 说明（补充）

xgrep 并非标准命令（无此工具）；通常实现"递归 grep"用：

```bash
# 递归搜索当前目录
grep -r "关键字" .

# 按文件名过滤 + 内容搜索
find . -name "*.go" | xargs grep -l "func main"
```

整理版本：v1.0 · 2026-08-19
