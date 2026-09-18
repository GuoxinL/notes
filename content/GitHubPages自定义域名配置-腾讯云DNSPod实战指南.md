---
title: GitHubPages自定义域名配置-腾讯云DNSPod实战指南
date: 2026-08-24
tags:
  - GitHub Pages
  - 自定义域名
  - DNS
  - DNSPod
  - 腾讯云
description: 本文以 example.com 与 GitHub 用户名 username 为例，给出腾讯云 DNSPod 解析、GitHub 仓库绑定自定义域名、TXT 所有权验证与 Enforce HTTPS 签发的完整步骤、填写值与预期输出。
---
本文以示例域名 example.com、GitHub 用户名 username 为例(实际操作时请替换为你的真实域名和用户名),给出每一步的操作步骤 + 界面说明 + 填写值 + 预期输出,跟着做即可完成。

## 〇、配置前准备与参数速查

### 需要准备的东西

||||
|---|---|---|
|域名|example.com,已注册|✅ 已有|
|DNS 托管|腾讯云 DNSPod(权威 NS 以你的域名实际 NS 记录为准)|✅ 已有|
|GitHub 账号|username,已开通 Pages|✅ 已有|
|Pages 仓库|username.github.io(或项目仓库,发布源已配置)|✅ 已有|


### 全部配置参数速查表(本文所有需要填的值汇总)

| | | | | |
|---|---|---|---|---|
|顶级域解析|@|A|185.199.108.153|腾讯云 DNSPod|
|顶级域解析|@|A|185.199.109.153|腾讯云 DNSPod|
|顶级域解析|@|A|185.199.110.153|腾讯云 DNSPod|
|顶级域解析|@|A|185.199.111.153|腾讯云 DNSPod|
|www 解析|www|CNAME|username.github.io|腾讯云 DNSPod|
|域名所有权验证|_github-pages-challenge-username|TXT|4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d|腾讯云 DNSPod(GitHub 生成)|


### 配置完成后的目标状态

- 浏览器访问 https://example.com → 显示你的站点,地址栏出现 🔒 锁
- 访问 https://www.example.com → 自动重定向到 example.com
- curl -I https://example.com → 返回 HTTP/2 200
## 一、腾讯云 DNS 解析配置(带实际内容)

### 1.1 登录控制台

操作:浏览器打开 cloud.tencent.com,顶部搜索框输入 DNS 解析 DNSPod,回车,进入控制台。

界面:控制台首页是域名列表,每行一个域名,字段包括「域名 / 状态 / 到期时间」,右侧有「解析」「更多」按钮。

操作:找到 example.com 这一行 → 点击 解析,进入记录列表页。

记录列表页的样子(参考):

主机记录 | 记录类型 | 线路类型 | 记录值 | 权重 | 优先级 | TTL | 备注 | 最后操作时间 | 操作

右上角有蓝色 添加记录 按钮。后续所有记录都通过它添加。

### 1.2 添加顶级域名 A 记录(4 条)

为什么要配:顶级域名 example.com 必须解析到 GitHub Pages 的服务器 IP。GitHub Pages 在全球有 4 个 IP,配 4 条 A 记录可实现轮询负载均衡 + 容灾(某个 IP 故障时自动换下一个)。

注意:根域不能用 CNAME 指向 github.io(这需要 DNS 服务商支持 CNAME 拉平,腾讯云 DNSPod 不支持),所以必须用 A 记录。

操作:点击 添加记录,按下表填,共操作 4 次(每次只填一个 IP):

| | | | | |
|---|---|---|---|---|
|1|@|A|185.199.108.153|600|
|2|@|A|185.199.109.153|600|
|3|@|A|185.199.110.153|600|
|4|@|A|185.199.111.153|600|


表单字段说明:
- 主机记录:填 @ 表示根域本身(不带 example.com,控制台会自动拼接)
- 记录类型:下拉选 A(IPv4 地址)
- 记录值:填 IP,一次只填一个
- 线路类型、TTL:保持默认(默认线路 / 600)

完成后的列表样子:

```bash
@  A  默认  185.199.108.153  600  Github
@  A  默认  185.199.109.153  600  Github
@  A  默认  185.199.110.153  600  Github
@  A  默认  185.199.111.153  600  Github
```



✅ 判断标准:列表里出现 4 行主机记录都是 @ 的 A 记录即为正确。如果 @ 下原来有指向别处的旧 A 记录(比如指向旧服务器),先删除旧的再添加,避免冲突。

### 1.3 添加 www 子域名 CNAME 记录(1 条)

为什么要配:让 www.example.com 也能访问。GitHub Pages 会自动在 example.com 和 www.example.com 之间做重定向,用户输哪个都能进。

操作:点击 添加记录,填:

|||||
|---|---|---|---|
|www|CNAME|username.github.io|600|


表单字段说明:
- 主机记录填 www(同样不带域名后缀)
- 记录值填 username.github.io(你的 GitHub Pages 默认域名;DNS 解析不区分大小写)
- 末尾带不带点都行(控制台会自动规范化)

⚠️ 特别注意:添加时表单里如果出现 CNAME 加速 选项,不要勾选。CNAME 加速会把解析结果替换成加速节点 IP,GitHub 检测 DNS 时会认为记录不对,导致证书无法签发。



✅ 判断标准:列表里出现 www  CNAME  默认  username.github.io  600 一行。

### 1.4 添加 TXT 验证记录(仅域名提示"已被占用"时)

什么时候需要:在 GitHub 仓库填自定义域名时,如果提示 "The custom domain example.com is already taken",说明该域名在 GitHub 内部被登记占用,需要先验证所有权才能释放。

前置:验证码必须先由 GitHub 生成(见 2.1 的第 1~3 步),拿到后回来填。

操作:点击 添加记录,填:

| | | |
|---|---|---|
|_github-pages-challenge-username|TXT|4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d(以 GitHub 页面显示的为准)|


表单字段说明:
- 主机记录 = 下划线前缀 _github-pages-challenge- + 你的 GitHub 用户名,不要带 example.com 后缀(控制台自动拼接,带了会变成 .example.com.example.com 导致查不到)
- 记录值 = GitHub 显示的 32 位十六进制验证码,原样复制粘贴,一个字符都不能差



✅ 判断标准:列表里出现 _github-pages-challenge-username  TXT  默认  4a5b6c7d...  600 一行。
📌 验证成功后不要删除这条 TXT 记录,避免域名再次被标记占用。

### 1.5 验证 DNS 是否生效

为什么要验证:DNS 配置完成后,必须在解析层面确认记录真实存在,才能去 GitHub 点 Verify / 绑域名。这一步能区分"记录没配好"和"GitHub 那边的问题"。

操作:在 Ubuntu 终端执行(Windows 可把 dig 换成 nslookup):

```bash
## ① 验证 A 记录——预期输出 4 个 IP 中的若干
dig example.com +noall +answer -t A

## ② 验证 www CNAME——预期输出 username.github.io.
dig www.example.com +noall +answer -t CNAME

## ③ 验证 TXT 验证记录(直接查 DNSPod 权威服务器,不受缓存影响)
dig TXT _github-pages-challenge-username.example.com @<你的NS服务器> +short
```

示例输出:

```bash
$ dig TXT _github-pages-challenge-username.example.com @<你的NS服务器> +short
"4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d"
```

输出解读:

| | | |
|---|---|---|
|dig A|返回 4 个 185.199.* IP 中的若干|NXDOMAIN 或无输出 = 记录未生效|
|dig CNAME|返回 username.github.io.|NXDOMAIN = 记录未添加|
|dig TXT|返回 "4a5b6c7d..."(带引号)|无输出 = 记录没填对或还没生效|


生效时间:DNSPod 一般秒级~几分钟生效;全球 DNS 传播最长 24 小时。本地查不到但公共 DNS(8.8.8.8)能查到时,清本地缓存:sudo resolvectl flush-caches(Ubuntu)。

## 二、GitHub 配置(带实际内容)

### 2.1 验证域名所有权(释放"已占用"域名)

什么时候需要:只有遇到 "domain is already taken" 报错才做这步;没报错直接跳到 2.2。

操作步骤:

- 右上角头像 → Settings(个人设置,不是仓库设置)
- 左侧栏 Pages(在 "Code, planning, and automation" 分组下)
- 右侧 Verified domains 区域 → 点 Add a domain
- 输入框填 example.com → 点 Add domain
- GitHub 会显示一条 DNS TXT 记录要求,类似:

_github-pages-challenge-username   TXT   4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d


把这个值抄下来,去腾讯云按 1.4 添加记录。

- 添加并确认 DNS 生效(1.5 的命令)后,回到本页面,域名右侧会显示 Verify(或 Continue verifying)按钮 → 点击
- 显示 Verified 标记 = 验证成功,域名立即从占用方释放


✅ 判断标准:example.com 出现在 Verified domains 列表且状态为 Verified。

### 2.2 仓库绑定自定义域名

操作步骤:

- 进入你的 Pages 仓库(如 username/username.github.io)→ Settings → Pages
- 找到 Custom domain 输入框 → 填 example.com(不要带 www,绑定根域 GitHub 会自动处理 www 重定向)→ 点 Save
- 保存后 GitHub 会在仓库根目录自动生成 CNAME 文件,内容为一行 example.com
界面提示:保存后页面可能出现黄色提示 "DNS check successful"(说明 GitHub 已验证 DNS 正确),或 *"Site is available at https://example.com"*。





📌 仓库根目录的 CNAME 文件是 GitHub Pages 识别自定义域名的关键,不要删除,也不要手动改内容(应以 GitHub 设置页为准)。

✅ 判断标准:仓库根目录出现 CNAME 文件,内容为 example.com。

### 2.3 启用 Enforce HTTPS

操作步骤:

- 在仓库 Settings → Pages 页面,找到 Enforce HTTPS 勾选框,勾上
- GitHub 自动通过 Let's Encrypt 为 example.com 签发证书(含自动续期,无需任何操作)
关于灰色不可勾选:这是正常的。GitHub 需要先检测到正确 DNS 并完成证书签发,过程最长 24 小时,通常几分钟~半小时。不要急,等 DNS 生效和证书签发即可。

长时间灰色时的重试步骤:

- 清空 Custom domain 输入框 → 点 Save
- 重新填入 example.com → 点 Save
- 浏览器访问 https://example.com 看能否加载
- 刷新设置页,可勾选了就勾上
- 若仍提示 "Not yet available for your site because the certificate has not finished being issued" → 证书还在签发,继续等


✅ 判断标准:Enforce HTTPS 处于勾选状态,且页面不再显示证书错误提示。

### 2.4 最终验证

命令行验证:

curl -I https://example.com

预期输出(证书签发完成后):

```bash
HTTP/2 200
server: GitHub.com
...
```

证书签发中会出现(属正常,等待即可):

curl: (60) SSL: no alternative certificate subject name matches target host name 'example.com'



这句报错含义:HTTP 已通、但服务器证书里还没有 example.com 这个域名 —— 说明 GitHub 正在为它签发证书,等 5~30 分钟后再试。

浏览器验证:

- 地址栏输入 https://example.com → 站点正常显示 + 地址栏出现 🔒 锁 = 全部完成
- 输入 www.example.com → 自动跳到 example.com

## 三、常见问题速查

| | | |
|---|---|---|
|填域名提示 "already taken"|域名在 GitHub 内部有登记记录|走 2.1 TXT 验证释放;若域名已被其他账号验证过,验证会失败,需联系对方或 GitHub Support|
|dig 查 TXT 返回 NXDOMAIN|记录未添加 / 主机记录填错 / NS 不在腾讯云|核对 1.4 的字段;dig NS example.com +short 确认权威 NS 是 DNSPod|
|证书报 subject name 不匹配|证书签发中,或绑定的是 www 而非根域|等 5~30 分钟;确认 Custom domain 填的是 example.com|
|浏览器无 🔒 锁|混合内容:页面引用了 http 资源|把页面里图片/JS/CSS 的 http 链接全部改成 https|
|Enforce HTTPS 长期灰色|DNS 未生效或证书签发中|按 2.3 的重试步骤;先 dig 确认 DNS|
|根域能访问、www 404|少了 www 的 CNAME|补 1.3 的 CNAME 记录|


## 附:完整访问链路

```
浏览器输入 https://example.com
        ↓
腾讯云 DNSPod 解析(A 记录)→ GitHub Pages 四个 IP(185.199.108~111.153)
        ↓
GitHub Pages 用自动签发的 Let's Encrypt 证书完成 TLS 握手
        ↓
静态网站内容返回给用户(全程无需自己的服务器和 Certbot)
```



进阶提醒:后续若在中国大陆想更稳定,可在腾讯云接入 CDN/COS 加速,但那时 HTTPS 证书需在 CDN/COS 侧单独配置,不再由 GitHub Pages 管理。

整理版本:v1.0 · 2026-08-24
