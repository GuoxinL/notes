---
title: SSH免密登录原理与批量多机互信配置
date: 2026-08-19
tags: [SSH, ssh-copy-id, 免密登录, 批量互信, expect]
description: 围绕 SSH 讲解 sshd 配置、ssh-keygen 生成密钥对与 ssh-copy-id 免密登录原理，并给出用 expect 脚本汇总公钥批量配置多机互信的完整方案。
---


来源：CSDN 整理版（原文含 GitHub 配套脚本）
脚本仓库：https://github.com/tobewithyou1996/ssh-batch-believe.git

本文围绕 SSH 服务，讲解如何通过 ssh-copy-id 实现无密码登录：① sshd 服务及配置；② ssh-copy-id 的使用与原理；③ 批量多机互相信任。

### 一、sshd 服务

SSH（Secure Shell）是当前远程管理 Linux 系统的首选协议（替代不安全的 FTP/Telnet——明文传输，易受中间人攻击）。

#### 1.1 两种安全验证方式

||||
|---|---|---|
|基于口令|账户 + 密码验证登录|较低|
|基于密钥|本地生成密钥对，公钥上传服务器比对|更高（推荐）|


#### 1.2 sshd 常用配置（/etc/ssh/sshd_config）

||||
|---|---|---|
|Port|22|sshd 服务端口|
|ListenAddress|0.0.0.0|sshd 监听 IP 地址|
|HostKey|/etc/ssh/ssh_host_rsa_key 等|RSA/ECDSA/ed25519 私钥存放位置|
|PermitRootLogin|yes|是否允许 root 直接登录|
|StrictModes|yes|远程用户私钥改变时拒绝连接|
|MaxAuthTries|6|最大密码尝试次数|
|MaxSessions|10|最大终端数|
|PasswordAuthentication|yes|是否允许密码验证|
|PermitEmptyPasswords|no|是否允许空密码登录（很不安全）|


#### 1.3 ssh 客户端常用选项

|||
|---|---|
|-p|指定远程主机端口|
|-i|指定认证文件（私钥）|
|-o ConnectionAttempts=NUM|连接失败后重试次数|
|-o ConnectTimeout=SEC|连接超时时间|
|-o StrictHostKeyChecking=no|自动拉取主机 key 文件（跳过首次确认）|
|-o PasswordAuthentication=no|禁止密码认证|


示例：

```bash
ssh root@ip -p 端口号
```

### 二、ssh-copy-id 命令的使用与原理

#### 2.1 生成密钥对：ssh-keygen

```bash
ssh-keygen -t ecdsa
# 常用参数：-t dsa | ecdsa | ed25519 | rsa | rsa1，指定加密方式
```

执行过程与产物：

```bash
[root@localhost .ssh]# ssh-keygen  -t ecdsa
Generating public/private ecdsa key pair.
Enter file in which to save the key (/root/.ssh/id_ecdsa): 按回车或设置存储路径
Enter passphrase (empty for no passphrase): 直接回车或设置密钥密码
...
Your identification has been saved in /root/.ssh/id_ecdsa.
Your public key has been saved in /root/.ssh/id_ecdsa.pub.
```

产物权限：私钥 -rw-------（600）、公钥 -rw-r--r--（644）。

#### 2.2 ssh-copy-id 将公钥上传到远程主机

```bash
ssh-copy-id -i /root/.ssh/id_ecdsa.pub root@192.168.123.218
```

执行过程：

```bash
/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "/root/.ssh/id_ecdsa.pub"
The authenticity of host '192.168.123.218 (192.168.123.218)' can't be established.
ECDSA key fingerprint is SHA256:Qh+4R5mpwlU6kK3bf0k53ngm+WpKKnfvL1ZJo+YM3ic.
Are you sure you want to continue connecting (yes/no)? yes   #输入yes
...
root@192.168.123.218's password:   #填入密码
Number of key(s) added: 1
```

#### 2.3 ssh-copy-id 到底做了什么？

- 将本地主机的公钥添加到远程主机的 ~/.ssh/authorized_keys 文件里
- 在本机 ~/.ssh/ 下新建 known_hosts 文件（记录远程主机连接信息）

解除信任实验：清除远程主机 authorized_keys 里本地密钥后，再次登录需要密码；但因本地 known_hosts 仍存有远程主机信息，无需再输 yes。若清除 known_hosts 中的对应记录，则需重新 yes + 密码。

#### 2.4 跳过首次主机确认

修改 /etc/ssh/ssh_config：

```ini
# 找到：
# StrictHostKeyChecking ask
# 修改为：
StrictHostKeyChecking no
```

### 三、批量多机互相信任

思路：每台主机生成密钥后，把所有主机的公钥汇总到一台主机的 authorized_keys，再将该文件分发到所有主机，即可实现全互信。

核心文件：believe.sh、sshcopy.exp、sshkeygen.exp、hosts

#### 3.1 hosts 文件（IP:密码，冒号分隔）

```
149.28.244.75:*p8V1xG{7)%sQV!
149.28.245.101:K(1q@jsvM@UVZtk
```

#### 3.2 believe.sh（主脚本）

```bash
#!/bin/bash
# 检查本地是否有密钥文件，没有则添加。
./sshkeygen.exp
# 循环取出ip和密码
for i in $(cat ./hosts )
do
    # 取出ip和密码
    IP=$(echo "${i}" |awk -F":" '{print $1}')
    PW=$(echo "${i}" |awk -F":" '{print $2}')
    # 将本地的公钥复制到远程主机
    ./sshcopy.exp $IP  $PW
    # 将脚本sshkeygen.exp复制到远程主机
    scp -p ./sshkeygen.exp   $IP:/root/
    # 远程主机安装expect
    ssh root@$IP "yum install expect -y "
    # 远程主机创建密钥文件
    ssh root@$IP "/root/sshkeygen.exp&"
    # 将远程主机的公钥添加到本地authorized_keys文件
    ssh root@$IP "cat ~/.ssh/*.pub" >>./authorized_keys
done
# 将本地的公钥复制到远程主机
for i in $(cat ./hosts)
do
     IP=$(echo "${i}" |awk -F":" '{print $1}')
     # 将本地主机的公钥文件添加到authorized_keys文件
     cat ~/.ssh/*.pub >>./authorized_keys
     scp ./authorized_keys $IP:~/.ssh/authorized_keys
done
```

#### 3.3 sshcopy.exp（将本地公钥上传到远程主机，需可执行权限）

```bash
#!/usr/bin/expect -d
set ip [lindex $argv 0]
set pw [lindex $argv 1]
set timeout 60
spawn ssh-copy-id $ip
expect {
#"*yes/no" {send "yes\r"; exp_continue}
# 若注释上面这行，需在 /etc/ssh/ssh_config 将 # StrictHostKeyChecking ask 改为 StrictHostKeyChecking no
"password:" {send "$pw\r"}
}
expect eof
```

#### 3.4 sshkeygen.exp（判断是否有密钥，无则创建，权限 755）

```bash
#!/usr/bin/expect -d
set timeout 90
spawn ssh-keygen
expect {
".ssh/id_rsa" {send "\r";exp_continue}
"Overwrite (y/n)?" exit
"Enter passphrase" {send "\r";exp_continue}
"Enter same passphrase again:" {send "\r"}
}
expect eof
```

#### 3.5 使用流程

```bash
# 脚本放同目录，赋予执行权限
chmod 755 believe.sh sshcopy.exp sshkeygen.exp
./believe.sh
```



⚠️ 依赖 expect：yum install expect -y。执行后所有主机即可互相免密登录。

### 四、两种批量方案对比（补充）

|||||
|---|---|---|---|
|统一密钥分发|一台生成密钥后分发到所有主机|简单|私钥泄露 = 全军覆没，不推荐|
|汇总 authorized_keys（本文）|各机独立密钥 + 汇总公钥分发|每机密钥独立，安全|配置步骤多，依赖 expect|


整理版本：v1.0 · 2026-08-19
