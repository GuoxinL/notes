---
title: Shell查看端口号-lsof与netstat命令详解
date: 2026-08-19
tags: [Shell, Linux, 端口, lsof, netstat]
description: 本文详解 Linux 查看端口号的常用方法，包括按端口查占用、按 PID 查端口、按程序名查端口，并整理 netstat 参数、TCP 连接状态、ss 命令与完整排查流程。
---

来源：CSDN 博主「tiny@ant」《Shell 之 查看端口号》整理扩展版
原文链接：https://blog.csdn.net/gyxinguan/article/details/95103945

### 1. 查看端口号的三类方法

#### 1.1 根据端口号查占用（最常用）

```bash
# 方式一：lsof（推荐，信息最全）
lsof -i:端口号

# 方式二：netstat + grep
netstat -nltp | grep 端口号
```

示例：查看 8080 端口被谁占用

```bash
$ lsof -i:8080
COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
java    12345 root   32u  IPv6 123456      0t0  TCP *:8080 (LISTEN)

$ netstat -nltp | grep 8080
tcp6       0      0 8080                 *                    LISTEN      12345/java
```



解析：PID=12345，程序为 java —— 端口已被该进程监听。

#### 1.2 根据进程 PID 查端口

```bash
netstat -nap | grep pid
```

示例：查 PID 12345 监听了哪些端口

```bash
$ netstat -nap | grep 12345
tcp6       0      0 8080                 *                    LISTEN      12345/java
tcp6       0      0 9090                 *                    LISTEN      12345/java
```



同一进程可同时监听多个端口，此命令会全部列出。

#### 1.3 根据程序名查端口（补充）

```bash
# 按进程名定位 PID，再反查端口
lsof -i | grep java
```

### 2. netstat 常用参数详解

|||
|---|---|
|-a|显示本机所有连接和监听端口（all）|
|-n|以网络 IP 地址形式显示，不反解域名（显示有效连接和端口）|
|-r|显示路由表信息（route）|
|-s|显示按协议统计的信息（statistics）|
|-v|显示当前有效的连接（verbose）|
|-t|显示所有 TCP 协议连接|
|-u|显示所有 UDP 协议连接|
|-i|显示自动配置端口的状态（interface）|
|-l|仅显示状态为 listening（监听中） 的服务|
|-p|显示 PID / program name（需 root 权限）|


高频组合：

```bash
# 最常用：数字格式 + TCP + 监听 + 进程
netstat -nltp

# 全量 TCP 连接 + 进程
netstat -antp

# 统计各协议连接数
netstat -s
```

### 3. TCP 连接状态速查

|||
|---|---|
|ESTABLISHED|已建立（连接正常通信中）|
|CLOSED|已关闭|
|LISTENING|正在监听（服务端等待连接）|
|FIN-WAIT-2|等待连接关闭（主动方已发 FIN，等待被动方确认）|
|TIME-WAIT|等待足够时间，确保服务器正常关闭该连接|


补充：完整 TCP 状态机其余状态

|||
|---|---|
|SYN-SENT|主动连接方已发送 SYN，等待确认|
|SYN-RECEIVED|被动方收到 SYN 并回复 SYN+ACK|
|FIN-WAIT-1|主动方已发送 FIN|
|CLOSE-WAIT|被动方收到 FIN，等待应用层关闭|
|CLOSING|双方同时发起关闭，等待 ACK|
|LAST-ACK|被动方发送 FIN 后等待最终 ACK|


排查技巧（补充）：

- TIME-WAIT 大量堆积 → 常见于短连接高并发，可调整内核参数 net.ipv4.tcp_tw_reuse
- CLOSE-WAIT 大量堆积 → 程序未正常关闭 socket，属于应用层 bug，需查代码
- SYN_RECV 大量堆积 → 可能遭受 SYN Flood 攻击或 backlog 过小

### 4. 补充：ss 命令（netstat 的现代替代）



以下为整理者补充。ss 是 iproute2 自带命令，性能优于 netstat，功能兼容：

```bash
# 查看某端口监听情况（替代 netstat -nltp）
ss -nltp | grep 8080

# 查看所有 TCP 连接 + 进程
ss -antp

# 查看 UDP 监听
ss -nulp

# 按进程名过滤
ss -antp | grep java
```

netstat 与 ss 对比

||||
|---|---|---|
|所属包|net-tools|iproute2（现代系统默认）|
|性能|慢（读 /proc）|快（直接读内核 socket 信息）|
|输出格式|经典|更紧凑|
|建议|老系统兼容|优先使用|


### 5. 端口排查完整流程（补充）

```bash
# Step 1：确认端口被谁占用
lsof -i:8080
# 或
netstat -nltp | grep 8080

# Step 2：拿到 PID 后确认进程信息
ps -ef | grep 12345

# Step 3：必要时杀掉进程
kill -9 12345

# Step 4：确认端口已释放
netstat -nltp | grep 8080   # 无输出即已释放
```



⚠️ 注意：-p 参数需要 root 权限，非 root 用户可能看不到 PID 列。

### 6. 常见端口速查表（补充）

|||
|---|---|
|22|SSH|
|80|HTTP|
|443|HTTPS|
|3306|MySQL|
|6379|Redis|
|8080|Tomcat / 常见 Web 容器|
|9090|Prometheus / 部分管理台|
|9200|Elasticsearch|


整理版本：v1.0 · 2026-08-19
