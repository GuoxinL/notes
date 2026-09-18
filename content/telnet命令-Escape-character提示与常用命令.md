---
title: telnet命令-Escape-character提示与常用命令
date: 2026-08-19
tags: [telnet, Linux, 网络, Escape, 调试]
description: telnet 连接后提示 Escape character is '^]'，表示按 Ctrl+] 可呼出 telnet 命令行；本文解释其含义并列出 close、quit、status 等常用内部命令。
---


来源：个人笔记整理版

### 一、问题现象

Linux/Unix 下使用 telnet ip 端口号 连接主机时，出现提示：

```bash
telnet 180.76.172.97 12345
Trying 180.76.172.97...
Connected to 180.76.172.97.
Escape character is '^]'.
```

### 二、含义解读

^ 是 Ctrl 键的意思！

- 按 Ctrl + ] 会呼出 telnet 命令行（提示符 telnet>）
- 进入 telnet 命令行后，可以执行 telnet 内部命令
- 退出 telnet 命令行用 quit

示例：

```bash
telnet 180.76.172.97 12345
Trying 180.76.172.97...
Connected to 180.76.172.97.
Escape character is '^]'.
^]                      ← 按 Ctrl + ]
telnet>                 ← 进入 telnet 命令行窗口
```

### 三、常用 telnet 命令

|||
|---|---|
|close|关闭当前连接|
|logout|强制退出远程用户并关闭连接|
|display|显示当前操作的参数|
|mode|试图进入命令行方式或字符方式|
|open|连接到某一站点|
|quit|退出|
|send|发送特殊字符|
|set|设置当前操作的参数|
|unset|复位当前操作参数|
|status|打印状态信息|
|toggle|对操作参数进行开关转换|
|slc|改变特殊字符的状态|
|auth|打开/关闭确认功能，z 挂起|
|environ|更改环境变量，? 显示帮助信息|


### 四、总结

Escape character is '^]'. 只是一个提示——告诉你按 Ctrl+] 键可以呼出 telnet 的命令行。日常端口连通性测试时可直接忽略。



补充：telnet 常用于测试 TCP 端口是否可达（如 telnet 192.168.1.1 3306）；但因其明文传输，现代生产环境已用 ssh/nc（netcat）替代远程管理，端口测试也可用 nc -zv ip port 或 timeout 3 bash -c "</dev/tcp/ip/port"。

整理版本：v1.0 · 2026-08-19
