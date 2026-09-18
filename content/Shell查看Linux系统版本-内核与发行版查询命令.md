---
title: Shell查看Linux系统版本-内核与发行版查询命令
date: 2026-08-19
tags: [Shell, Linux, 系统版本, 内核, uname]
description: 本文整理查看 Linux 系统版本的常用命令，覆盖内核版本与发行版本两大类，包括 /proc/version、uname、lsb_release、hostnamectl 等，并附命令速查对比表。
---

来源：CSDN 博主「lovedingd」《Shell 之查看Linux系统版本》整理版
原文链接：https://blog.csdn.net/lovedingd/article/details/131249786

查看 Linux 系统版本分为两大类：内核版本 与 发行版本，本文整理全部常用命令。

### 一、查看 Linux 内核版本

#### 1.1 cat /proc/version

/proc 目录存储当前内核运行状态的特殊文件（内存、CPU、已安装文件系统等）。正在运行的内核信息存于 /proc/version 虚拟文件中。

```bash
$ cat /proc/version
Linux version 3.10.0-1062.18.1.el7.x86_64 (mockbuild@kbuilder.bsys.centos.org) (gcc version 4.8.5 20150623 (Red Hat 4.8.5-39) (GCC) ) #1 SMP Tue Mar 17 23:49:17 UTC 2020
```

#### 1.2 uname -a

uname 用于查看多个系统信息，包括内核体系结构、名称、版本和发行版。

```bash
$ uname -a
Linux VM_0_16_centos 3.10.0-1062.18.1.el7.x86_64 #1 SMP Tue Mar 17 23:49:17 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux
```

uname 常用参数（补充）

|||
|---|---|
|-a|全部信息|
|-r|仅内核版本（release）|
|-m|机器硬件架构（如 x86_64）|
|-s|内核名称（如 Linux）|


### 二、查看 Linux 发行版本

#### 2.1 lsb_release -a（通用）

查看完整版本信息：系统名称、版本号、代号。适用于所有发行版（Debian/Ubuntu/CentOS）。

```bash
$ lsb_release -a
LSB Version:    :core-4.1-amd64:core-4.1-noarch:cxx-4.1-amd64:cxx-4.1-noarch:desktop-4.1-amd64:desktop-4.1-noarch:languages-4.1-amd64:languages-4.1-noarch:printing-4.1-amd64:printing-4.1-noarch
Distributor ID: CentOS
Description:    CentOS Linux release 7.7.1908 (Core)
Release:        7.7.1908
Codename:       Core
```



注：CentOS 8+ / 新版本可能默认未安装 lsb_release，需 yum install redhat-lsb-core（补充）。

#### 2.2 cat /etc/issue（通用，简略）

仅显示系统名称和版本号。

```bash
$ cat /etc/issue
CentOS Linux release 7.7.1908 (Core)
Kernel \r on an \m
```

#### 2.3 cat /etc/redhat-release（RedHat 系）

```bash
$ cat /etc/redhat-release
CentOS Linux release 7.7.1908 (Core)
```

#### 2.4 rpm -q redhat-release（RedHat 系）

```bash
$ rpm -q redhat-release
redhat-release-4AS-3
```

#### 2.5 hostnamectl（systemd 系统）

systemd 的一部分，查询/更改主机名，同时显示发行版和内核版本。

```bash
$ hostnamectl
   Static hostname: VM_0_16_centos
         Icon name: computer-vm
           Chassis: vm
        Machine ID: f9d400c5e1e8c3a8209e990d887d4ac1
           Boot ID: ee7e8dec79274c90be37dfbae08e6b65
    Virtualization: kvm
  Operating System: CentOS Linux 7 (Core)
       CPE OS Name: cpe:/o:centos:centos:7
            Kernel: Linux 3.10.0-1062.18.1.el7.x86_64
      Architecture: x86-64
```

仅查内核版本：

```bash
$ hostnamectl | grep -i kernel
  Kernel: Linux 3.10.0-1062.18.1.el7.x86_64
```

### 三、命令速查对比表（补充）

|||||
|---|---|---|---|
|cat /proc/version|内核|所有发行版|详细（含编译信息）|
|uname -a|内核|所有发行版|详细|
|lsb_release -a|发行版|所有发行版|最详细（含代号）|
|cat /etc/issue|发行版|所有发行版|简略|
|cat /etc/redhat-release|发行版|仅 RedHat 系|简略|
|rpm -q redhat-release|发行版|仅 RedHat 系|简略|
|hostnamectl|发行版+内核|systemd 系统|详细（一键双查）|



⚠️ 推荐：日常排查首选 uname -r（内核）+ cat /etc/os-release（发行版，现代系统标准文件，补充）。

整理版本：v1.0 · 2026-08-19
