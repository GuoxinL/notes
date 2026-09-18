---
title: dd测试磁盘读写速度-time计时与缓存参数
date: 2026-08-19
tags: [dd, 磁盘性能, 读写速度, time, fsync]
description: 用 time + dd 测磁盘读写速度：借 /dev/zero 与 /dev/null 消除单侧 IO，再用 conv=fsync、oflag=dsync 与 direct 参数绕开缓存，保证结果准确。
---


来源：CSDN 整理版
原文链接：https://blog.csdn.net/s1070/article/details/52860073

### 一、测试写速度

```bash
time dd if=/dev/zero of=test.dbf bs=8k count=300000
```

原理：/dev/zero 是伪设备，只产生空字符流，不会产生 IO；IO 全部集中在 of（写入）侧，因此等价于测试磁盘写能力。

输出示例：

```bash
300000+0 records in
300000+0 records out

real 0m36.669s
user 0m0.185s
sys 0m9.340s
```

速度计算：8 * 300000 / 1024 / 36.669 = 63.916 M/s

### 二、测试读速度

```bash
time dd if=/dev/sda1 of=/dev/null bs=8k
```

原理：/dev/sda1 是物理分区，读取产生 IO；/dev/null 是黑洞伪设备，写入不产生 IO。IO 只发生在源设备上，等价于测试磁盘读能力。

输出示例：

```bash
448494+0 records in
448494+0 records out

real 0m51.070s
user 0m0.054s
sys 0m10.028s
```

速度计算：8 * 448494 / 1024 / 51.070 = 68.61 M/s



提示：count 越大、测试时间越长，结果越准确。

### 三、dd 参数深入：conv=fsync vs oflag=dsync/sync

背景：普通 dd 写文件时数据先进缓存就返回了，命令结束时数据可能并未真正落盘——结果不准确。要测"真正写盘"的速度，需用同步参数。

#### 参数含义对照

||||
|---|---|---|
|oflag=dsync|Use synchronized I/O for data... forces a physical write of output data on each write|每次写都落盘才进行下一次写（模拟数据库插入，很慢）|
|oflag=sync|likewise, but also for metadata|每次写同步数据和元数据|
|conv=fsync|Synchronize output data and metadata just before finishing|命令结束前一次性同步数据+元数据到磁盘|


#### 关键差异

- oflag=dsync/sync：每写一次都同步一次 → 写 100 次就同步 100 次 → 最慢但最真实
- conv=fsync：结束时才同步 → 写 100 次只在最后同步一次 → 比 dsync 快很多
#### 实验验证

配图内容描述（原图为两张 dd 测试结果终端截图）：

- 图一（写 1 块）：oflag=sync 测得约 32.1 KB/s，conv=fsync 测得约 37.8 KB/s —— 只写一次时两者差别不大
- 图二（写 1000 块）：conv=fsync 明显比 oflag=dsync/sync 快很多 —— 印证了"dsync 每写必同步、fsync 最后一次性同步"的理解
#### 三种写法对比

```bash
# 不准确：数据还在缓存，命令结束可能未真正落盘
dd if=/dev/zero of=test bs=64k count=16k

# 比较准确：结束前同步到磁盘
dd if=/dev/zero of=test bs=64k count=16k conv=fsync

# 最真实（最慢）：每写一次就落盘一次（能听到磁盘"啪啪啪"响）
dd if=/dev/zero of=test bs=64k count=4k oflag=dsync
# 或 oflag=sync
```

### 四、dd 如何绕过缓存（direct I/O）

```bash
iflag=direct,nonblock
oflag=direct,nonblock
# 或
iflag=cio
oflag=cio
```

- direct 模式：写入请求直接封装成 IO 指令发到磁盘，绕过文件系统缓存
- 非 direct 模式：数据先写系统缓存，立即认为 IO 成功，由操作系统决定何时落盘



测裸盘性能用 direct；测文件系统+缓存整体表现用普通模式。

### 五、常见问题（补充）

|||
|---|---|
|Windows 下测试|安装 Cygwin 可使用 time 和 dd，但实测读写约 40 多 M/s，可能受平台机制影响|
|测试准确度|dd 只能测连续 IO，不能测随机 IO；文件规模越大越准，bs 越大测得性能越高|
|随机 IO 测试|推荐用 fio 工具（补充）|


整理版本：v1.0 · 2026-08-19
