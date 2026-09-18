---
title: Linux用户管理-useradd-usermod-userdel详解
date: 2026-08-19
tags: [Linux, 用户管理, useradd, usermod, userdel]
description: 梳理 Linux 用户管理命令 useradd、userdel、usermod 的常用选项与操作示例，并附 users、usernetctl 及账号管理常用命令速查表。
---

来源：个人笔记整理版（基于 RHEL/CentOS 7 帮助输出）

### 1. useradd（创建用户）

useradd [选项] 登录

常用选项：

|||
|---|---|
|-b, --base-dir BASE_DIR|新账户主目录的基目录|
|-c, --comment COMMENT|新账户的 GECOS 字段（备注）|
|-d, --home-dir HOME_DIR|新账户的主目录|
|-D, --defaults|显示或更改默认的 useradd 配置|
|-e, --expiredate EXPIRE_DATE|新账户的过期日期|
|-f, --inactive INACTIVE|新账户的密码不活动期|
|-g, --gid GROUP|新账户主组的名称或 ID|
|-G, --groups GROUPS|新账户的附加组列表|
|-k, --skel SKEL_DIR|使用此目录作为骨架目录|
|-K, --key KEY=VALUE|不使用 /etc/login.defs 中的默认值|
|-m, --create-home|创建用户的主目录|
|-M, --no-create-home|不创建用户的主目录|
|-N, --no-user-group|不创建同名的组|
|-o, --non-unique|允许使用重复的 UID 创建用户|
|-p, --password PASSWORD|加密后的新账户密码|
|-r, --system|创建一个系统账户|
|-s, --shell SHELL|新账户的登录 shell|
|-u, --uid UID|新账户的用户 ID|
|-U, --user-group|创建与用户同名的组|
|-Z, --selinux-user SEUSER|为 SELinux 用户映射使用指定 SEUSER|


示例（补充）：

```bash
# 创建用户并建主目录、指定 shell、加入附加组
useradd -m -s /bin/bash -G docker,develop zhangsan
```

### 2. userdel（删除用户）

userdel [选项] 登录

|||
|---|---|
|-f, --force|强制删除（即使用户仍登录或有文件）|
|-r, --remove|同时删除主目录和邮件池|
|-R, --root CHROOT_DIR|chroot 到的目录|
|-Z, --selinux-user|为用户删除所有 SELinux 用户映射|


示例（补充）：

```bash
# 删除用户及主目录
userdel -r zhangsan
```

### 3. usermod（修改用户）

usermod [选项] 登录

|||
|---|---|
|-c, --comment 注释|GECOS 字段的新值|
|-d, --home HOME_DIR|用户的新主目录|
|-e, --expiredate EXPIRE_DATE|设定帐户过期日期|
|-f, --inactive INACTIVE|过期 INACTIVE 天数后密码失效|
|-g, --gid GROUP|强制使用 GROUP 为新主组|
|-G, --groups GROUPS|新的附加组列表|
|-a, --append GROUP|将用户追加到 -G 的附加组（不清除原有组）|
|-l, --login LOGIN|新的登录名称（改名）|
|-L, --lock|锁定用户帐号|
|-m, --move-home|将家目录内容移至新位置（与 -d 一起使用）|
|-o, --non-unique|允许使用重复的 UID|
|-p, --password PASSWORD|将加密密码设为新密码|
|-s, --shell SHELL|新登录 shell|
|-u, --uid UID|新 UID|
|-U, --unlock|解锁用户帐号|
|-Z, --selinux-user SEUSER|用户账户的新 SELinux 映射|


示例（补充）：

```bash
# 追加用户到 docker 组（不清除已有组）
usermod -aG docker zhangsan

# 锁定/解锁账号
usermod -L zhangsan
usermod -U zhangsan
```

### 4. users（查看登录用户）

users [选项]... [文件]

根据文件判断输出当前谁正登录在系统上。未指定文件时使用 /var/run/utmp；/var/log/wtmp 是通用相关文件。

### 5. usernetctl（网络接口管理）

usernetctl <interface-config> <up|down|report>



⚠️ 注意：此命令已基本废弃，现代系统推荐 ip link set dev eth0 up/down（补充）。

### 补充：常用管理命令速查

|||
|---|---|
|id 用户名|查看用户 UID/GID 及所属组|
|passwd 用户名|修改用户密码|
|chage -l 用户名|查看密码过期信息|
|groupadd / groupdel|创建 / 删除用户组|
|gpasswd -a 用户 组|将用户加入组|
|w / who|查看当前登录用户|


整理版本：v1.0 · 2026-08-19
