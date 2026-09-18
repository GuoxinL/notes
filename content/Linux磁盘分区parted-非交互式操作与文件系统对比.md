---
title: Linux磁盘分区parted-非交互式操作与文件系统对比
date: 2026-08-19
tags: [Linux, parted, 磁盘分区, fdisk, lsblk]
description: 介绍 parted 非交互式磁盘分区的完整流程，含 GPT 分区表创建、格式化、fstab 开机自动挂载、一键脚本，以及 EXT3/EXT4/XFS 文件系统对比。
---

来源：CSDN 博主「zfw_666666」《Shell 之 partend 磁盘分区工具》整理版
原文链接：https://blog.csdn.net/zfw_666666/article/details/126744930

### 一、两种模式

|||
|---|---|
|交互式|直接运行 parted /dev/vdb 进入交互界面|
|非交互式|命令行直接带参数执行（脚本友好，推荐）|


### 二、非交互式分区流程

#### 2.1 创建分区表（GPT）

```bash
parted /dev/vdb mklabel gpt
```

#### 2.2 将硬盘所有容量分给主分区

```bash
parted /dev/vdb mkpart primary 0% 100%
```

#### 2.3 查询磁盘已有分区

```bash
parted /dev/vdb print
```

#### 2.4 查询硬盘分区（备选）

```bash
fdisk -l
# or
lsblk
```

#### 2.5 格式化分区

```bash
mkfs.ext4 /dev/vdb1
```

#### 2.6 创建分区标签

```bash
e2label /dev/vdb1 "DataPart"
# e2label /dev/vdb1 "LogPart"
```

#### 2.7 查询 /dev/vdb1 的 blkid（分区 UUID）

```bash
blkid /dev/vdb1
```

#### 2.8 修改 /etc/fstab 实现开机自动挂载

```bash
vi /etc/fstab
```

添加条目：

```ini
LABEL="DataPart"	/data	ext4	defaults	0	0
# LABEL="LogPart"	/log	ext4	defaults	0	0
```

#### 2.9 挂载文件系统并验证

```bash
mount -a
df -h
```

### 三、一键分区脚本（disk.sh）

```bash
#!/bin/bash
DiskPath=$1

parted ${DiskPath} mklabel gpt
echo "mklabel gpt"

parted ${DiskPath} mkpart primary 0% 100%
echo "mkpart primary"

parted ${DiskPath} print
echo "print"

fdisk -l
echo "fdisk -l"

mkfs.ext4 ${DiskPath}1
echo "mkfs.ext4"

e2label ${DiskPath}1 "DataPart"
echo "e2label"

blkid ${DiskPath}1
echo "blkid"

echo "LABEL=\"DataPart\"\t/data\text4\tdefaults,nodelalloc,noatime\t0\t2" >> /etc/fstab
echo "update /etc/fstab"

mkdir /data
mount -a
df -h
echo "success"
```

使用：

```bash
chmod 755 disk.sh
./disk.sh /dev/vdb
```



⚠️ 脚本以传入磁盘路径为 $1，执行前请确认磁盘盘符正确，避免误格式化。

### 四、文件系统对比（EXT3 / EXT4 / XFS）

#### EXT3

- 最多支持 32TB 文件系统、2TB 文件（实际只能容纳 2TB 文件系统、16GB 文件）
- 只支持 32000 个子目录
- 使用 32 位空间记录块数量和 i-节点数量
- 数据块分配器每次只能分配一个 4KB 的块
#### EXT4（EXT3 的后继版本）

- 文件系统容量达 1EB，文件容量达 16TB
- 理论上支持无限数量的子目录
- 使用 64 位空间记录块数量和 i-节点数量
- 多块分配器支持一次调用分配多个数据块
#### XFS

- 根据记录的日志可在很短时间内迅速恢复磁盘文件内容
- 采用优化算法，日志记录对整体文件操作影响非常小
- 全 64-bit 文件系统，支持上百万 TB 存储空间
- 能以接近裸设备 I/O 的性能存储数据

#### 对比速查表

|||||
|---|---|---|---|
|最大文件系统|32TB|1EB|上百万 TB|
|最大文件|2TB|16TB|极大|
|子目录数|32000|无限|无限|
|位宽|32 位|64 位|64 位|
|分配器|单块 4KB|多块分配|高性能延迟分配|
|日志恢复|慢|较快|极快|
|适用场景|老系统兼容|通用默认|大数据/高性能|



选型建议（补充）：CentOS 7+ 默认 XFS；通用数据盘推荐 EXT4；超大容量或高并发 I/O 推荐 XFS。

整理版本：v1.0 · 2026-08-19
