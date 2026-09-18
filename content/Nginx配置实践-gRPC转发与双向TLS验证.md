---
title: Nginx配置实践-gRPC转发与双向TLS验证
date: 2026-08-18
tags: [Nginx, gRPC, TLS, 双向认证, mTLS]
description: 整理 Nginx 转发 gRPC 的两种方式（HTTP 层 grpcs 转 grpc、stream 按 SNI 分流），以及自签证书与双向 TLS 验证配置。
---

整理来源：Nginx转发gRPC.md、Nginx开启双向验证.md、错误.md
主题：Nginx 转发 gRPC 流量（HTTP 层 + SNI 分流）+ 双向 TLS 认证证书生成与配置

### 一、Nginx 转发 gRPC

gRPC 配置参考文档：https://www.54benniao.com/a/759.html
证书生成参考本文「二、Nginx 开启双向验证」。

#### 1.1 接收 grpcs 转发 grpc（HTTP 层）

监听 7100 端口（SSL + HTTP/2），客户端证书验证后通过 grpc_pass 转发到上游 gRPC 服务器集群。

```nginx
worker_processes auto;

events {
  worker_connections  1024;
}

http {
  # ===== 缓冲区（代理用户头信息）=====
  proxy_buffer_size 1024m;          # 保存用户头信息的缓冲区大小
  proxy_buffers 4 1024m;            # proxy_buffers 缓冲区
  proxy_busy_buffers_size 2048m;    # 繁忙缓冲区，建议为单块 proxy_buffers 的 2 倍，满则写磁盘临时文件

  # ===== 请求体/超时 =====
  client_max_body_size 4096m;       # 请求体大小上限，超过返回 413
  client_header_timeout 7d;         # 读取请求头超时，超过返回 408
  client_body_timeout 7d;           # 读取请求体超时

  # ===== 长连接 keepalive =====
  keepalive_timeout 7d;             # keep-alive 连接保持时长（默认 75s，0 禁用）
  keepalive_requests 4294967295;    # 单连接最大请求数（默认 100）

  upstream grpc_servers {
    server Proxy节点服务器1IP:7001;
    server Proxy节点服务器2IP:7001;
    keepalive 2000;                 # 每个 worker 进程缓存的上游空闲 keep-alive 连接数（超出按 LRU 关闭）
  }

  server {
    listen 7100 ssl http2;

    ssl_certificate      /data/app/nginx_certs/server.crt;   # 服务端证书
    ssl_certificate_key  /data/app/nginx_certs/server.key;   # 服务端私钥
    ssl_client_certificate /data/app/nginx_certs/root.crt;   # 根证书（验证客户端）
    ssl_verify_client on;                                    # 启用客户端证书验证

    location / {
      grpc_pass grpc://grpc_servers;                          # 转发给 upstream 中一个
      grpc_set_header Host $host;
      grpc_set_header X-Real-IP $remote_addr;
      grpc_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

      grpc_send_timeout 7d;         # 向 gRPC 服务器传输请求的超时（连续两次写之间）
      grpc_read_timeout 7d;         # 从 gRPC 服务器读取响应的超时（连续两次读之间）
      grpc_socket_keepalive on;     # 为 socket 打开 SO_KEEPALIVE
    }
  }
}
```

#### 1.2 根据 TLS Server Name（SNI）转发（stream 层）

不终止 TLS，基于 $ssl_preread_server_name 按域名把 grpcs 流量分流到不同上游（4 层转发，stream 模块）：

```nginx
worker_processes 1;

events {
    worker_connections  1024;
}

stream {
    map $ssl_preread_server_name $targetBackend {
         GT00BDCSSM.node1.org proxy1;
         GT00BDCSSM.node2.org proxy2;
    }

    server {
        listen 7100;
        ssl_preread on;             # 预读 SNI 但不终止 TLS
        proxy_pass $targetBackend;
    }

    upstream proxy1 {
        server 10.5.5.51:7001;
    }
    upstream proxy2 {
        server 10.5.5.61:7001;
    }
}
```

#### 1.3 常见错误排查

||||
|---|---|---|
|upstream prematurely closed connection while reading upstream|上游服务已关闭连接|检查上游 gRPC 服务是否存活、健康检查、keepalive/超时参数是否合理|


### 二、Nginx 开启双向验证（mTLS）

双向验证（mTLS）：服务端不仅要出示自己的证书，还要验证客户端证书（ssl_verify_client on）。

#### 2.1 生成自签名根证书（可选）

```bash
openssl genrsa -out root.key 2048
openssl req -x509 -new -nodes -key root.key -sha256 -days 3650 -out root.crt -subj "/CN=chainamker.org"
```

#### 2.2 生成服务器私钥和证书

```bash
# 1. 生成服务器私钥 + CSR
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/CN=server.org"

# 2. 使用自签名根证书签署服务器证书
openssl x509 -req -in server.csr -CA root.crt -CAkey root.key -CAcreateserial -out server.crt -days 3650 -sha256
```

#### 2.3 生成客户端证书

```bash
# 1. 生成客户端私钥
openssl genrsa -out client.key 2048

# 2. 生成客户端 CSR
openssl req -new -key client.key -out client.csr -subj "/CN=client.org"

# 3a. 使用自签名根证书签署客户端证书
openssl x509 -req -in client.csr -CA root.crt -CAkey root.key -CAcreateserial -out client.crt -days 3650 -sha256

# 3b. 或使用受信任的 CA 签署客户端证书
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -out client.crt -days 3650 -sha256
```

#### 2.4 配置到 Nginx

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate      /path/to/server.crt;   # 服务器证书
    ssl_certificate_key  /path/to/server.key;   # 服务器私钥
    ssl_client_certificate /path/to/client.crt; # 客户端证书（验证客户端用）
    ssl_verify_client on;                       # 开启客户端证书验证

    # 其他 SSL 配置项（密码套件、协议等）
}
```



注意：/path/to/ 替换为实际证书路径。若使用受信 CA 签发的证书，ssl_client_certificate 应指向 CA 证书。

#### 2.5 传统交互式生成证书流程（备用）

生成带密码的密钥 → 去掉密码 → 生成 CSR → 交互填写信息 → 自签名：

```bash
# 1) 生成 RSA 密钥（需设置并记住密码）
openssl genrsa -des3 -out domain.key 1024

# 2) 拷贝一个不需要输入密码的密钥文件
openssl rsa -in domain.key -out domain_nopass.key

# 3) 生成证书请求
openssl req -new -key domain.key -out domain.csr
```

交互输入项（Common Name 必须与网站域名一致）：

|||
|---|---|
|Enter pass phrase for domain.key|之前设置的密码|
|Country Name (2 letter code)|CN|
|State or Province Name|Jilin|
|Locality Name|Changchun|
|Organization Name|Python|
|Organizational Unit Name|Python|
|Common Name|domain.com（必须与域名一致）|
|Email Address|123@domain.com|
|A challenge password|直接回车|
|An optional company name|直接回车|


自签名（不向 CA 申请，用密钥和 CSR 自行签发）：

```bash
openssl x509 -req -days 365 -in domain.csr -signkey domain.key -out domain.crt
```

### 三、速查与注意事项

#### 3.1 证书文件清单（本文件夹已生成的证书）

|||
|---|---|
|root.key / root.crt|自签名根 CA 私钥 / 根证书|
|root.srl|OpenSSL 序列号文件（-CAcreateserial 生成）|
|server.key / server.csr / server.crt|服务器私钥 / CSR / 签署后的服务器证书|
|client.key / client.csr / client.crt|客户端私钥 / CSR / 签署后的客户端证书|


#### 3.2 关键指令速查

|||
|---|---|
|grpc_pass grpc://upstream|转发 gRPC 请求到上游|
|grpc_send_timeout / grpc_read_timeout|gRPC 收发超时（连续读写间隔）|
|ssl_preread on + map $ssl_preread_server_name|4 层按 SNI 分流，不终止 TLS|
|ssl_certificate / ssl_certificate_key|服务器证书 / 私钥|
|ssl_client_certificate|客户端证书（验证用）|
|ssl_verify_client on|开启双向验证（mTLS）|
|keepalive 2000（upstream）|上游空闲 keep-alive 连接缓存数|


#### 3.3 注意事项

- 自签名证书仅适用于开发/测试环境，生产环境应从受信 CA 获取证书
- 双向验证下，客户端必须持有被 ssl_client_certificate 信任的证书，否则握手失败
- gRPC 必须走 HTTP/2（listen ... http2 或 h2c），普通 HTTP/1.1 无法转发
- 生产环境不建议把 proxy_buffer_size / client_max_body_size 等设成 GB 级，按实际业务压测确定
- upstream prematurely closed connection 通常表示上游服务已关闭，优先排查上游存活与健康检查

整理版本：v1.0 · 2026-08-18
