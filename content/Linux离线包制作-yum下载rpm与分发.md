---
title: Linux离线包制作-yum下载rpm与分发
date: 2026-08-19
tags: [Linux, yum, rpm, 离线安装, 离线包]
description: 适用于内网离线环境：在联网机器上用 yum --downloadonly 下载 rpm 及依赖，打包拷贝到离线机器后用 yum localinstall 或本地 yum 源安装。
---

来源：个人笔记整理版

适用于内网/离线环境：在联网机器上用 yum 下载 rpm 包，再拷贝到离线机器安装。

### 一、查找包

```bash
yum search [pkg]
```

### 二、下载 rpm 包（仅下载，不安装）

```bash
yum install --downloadonly --downloaddir=/data/downloads irqbalance
yum install --downloadonly --downloaddir=/data/downloads mysql
yum install --downloadonly --downloaddir=/data/downloads numactl
yum install --downloadonly --downloaddir=/data/downloads java-1.8.0-openjdk

yum install --downloadonly --downloaddir=/data/downloads pcre-devel
yum install --downloadonly --downloaddir=/data/downloads zlib.x86_64
yum install --downloadonly --downloaddir=/data/downloads libnl/libnl-3

# 组件组下载（开发工具集）
yum groupinstall "Development Tools" --downloadonly --downloaddir=/data/downloads/gcc9

# gcc9 相关
yum install --downloadonly --downloaddir=/data/downloads/gcc9 gcc9
yum install -y --downloadonly --downloaddir=/data/downloads/gcc9 centos-release-scl
yum install devtoolset-7 -y
```



--downloadonly：只下载不安装；--downloaddir=：指定下载目录。需先安装 yum-plugin-downloadonly（老版本 yum，补充）。

### 三、找到下载的 rpm 包

```bash
find / -name [rpm_name]
```

### 四、离线机器安装（补充）

```bash
# 方式一：安装目录下所有 rpm（自动解决本地依赖）
yum localinstall /data/downloads/*.rpm
# 或
rpm -ivh /data/downloads/*.rpm

# 方式二：搭建本地 yum 源
# 1. 生成 repodata
createrepo /data/downloads
# 2. 配置 /etc/yum.repos.d/local.repo
# [local]
# name=local repo
# baseurl=file:///data/downloads
# enabled=1
# gpgcheck=0
```

### 五、离线包制作完整思路（流程总结）

|||
|---|---|
|1. 查找依赖|yum deplist 包名 列出依赖|
|2. 下载|yum install --downloadonly --downloaddir=目录 包名（含依赖自动下载）|
|3. 打包传输|tar czvf offline.tar.gz /data/downloads 拷贝到目标机器|
|4. 离线安装|yum localinstall *.rpm 或搭建本地 yum 源|
|5. 验证|rpm -qa \| grep 包名|



⚠️ 注意架构一致（x86_64 vs aarch64）、操作系统大版本一致（CentOS 7 vs 8 rpm 不通用）。

整理版本：v1.0 · 2026-08-19
