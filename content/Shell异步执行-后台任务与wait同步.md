---
title: Shell异步执行-后台任务与wait同步
date: 2026-08-19
tags: [Shell, 异步, 后台任务, wait, 并行]
description: Shell 异步执行：在命令后加 & 将任务放到子 shell 后台运行，配合 wait 等待指定进程或全部子进程退出，实现脚本内的多线程同步。
---

来源：CSDN 博主「weixin_35852328」《Shell 之 异步执行》整理版
原文链接：https://blog.csdn.net/weixin_35852328/article/details/81508339

### 一、启动后台子任务

在命令后加 & 操作符，表示将命令放在子 shell 中异步执行，可达到多线程效果：

```bash
sleep 10      # 同步：等待 10 秒，再继续下一操作
sleep 10 &    # 异步：当前 shell 不等待，由后台子 shell 执行
```

### 二、wait 命令

```bash
wait [作业指示或进程号]
```

规则：

- 等待指定作业/进程退出，返回其退出状态；不指定参数则等待所有子进程退出，退出状态为 0
- shell 顶层使用 wait 不会等待函数中启动的子任务；在函数内部使用则只等待函数内启动的后台任务
- shell 中使用 wait 相当于高级语言里的多线程同步

### 三、示例

#### 3.1 等待所有子任务结束

```bash
#!/bin/bash
sleep 10 &
sleep 5&
wait   # 等待所有后台任务，约 10 秒后退出
```

#### 3.2 等待指定子进程

```bash
#!/bin/bash
sleep 10 &
sleep 5&
wait $!   # $! 表示上个子进程的进程号；此例等待 sleep 5，约 5 秒后退出
```

#### 3.3 在函数中使用 wait

```bash
#!/bin/bash
source ~/.bashrc

fun(){
    echo "fun is begin.timeNum:$timeNum"
    local timeNum=$1
    sleep $timeNum &
    wait    # 只等待本函数中 wait 前的 sleep
    echo "fun is end.timeNum:$timeNum"
}

fun 10 &
fun 20 &

wait   # 若 fun 内没有 wait，整个脚本立刻退出，不会等待 fun 里面的 sleep
echo "all is ending"
```

输出结果：

```bash
fun is begin.timeNum:10
fun is begin.timeNum:20
fun is end.timeNum:10
fun is end.timeNum:20
all is ending
```

两个函数并行执行，wait 使脚本等待所有子任务完成才退出。

### 四、关键变量速查（补充）

|||
|---|---|
|$!|最近一个后台进程的 PID|
|$$|当前 shell 的 PID|
|$?|上一条命令的退出状态|
|jobs|列出后台任务|
|fg / bg|将后台任务调到前台 / 继续后台运行|
|kill %1|按作业号杀后台任务|


整理版本：v1.0 · 2026-08-19
