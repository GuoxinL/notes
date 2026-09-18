---
title: CloudDM4.1.0发布-达梦与Cloudberry数据源支持
date: 2026-08-19
tags: [CloudDM, 数据库管理, 达梦, Cloudberry, 数据源]
description: CloudDM 4.1.0 发布，新增 Apache Cloudberry 与达梦数据源、MongoDB/Redis SSL 连接，SQL 工单支持文件上传，数据库 CI/CD 支持级联编排。
---

来源：微信公众号 CloudDM（2026-08-14 发布） · 整理版本：v1.0 · 2026-08-19

### 1. 产品简介

CloudDM 是一款免费且开源的团队化数据库管理工具，核心能力：

|||
|---|---|
|统一 Web 数据库访问|浏览器内一站式管理多类型数据库|
|权限控制|账号级资源权限精细化管理|
|数据脱敏|查询结果按列血缘自动脱敏|
|SQL 审核|安全规则检查 + 审批流|
|流程协同|工单化变更流程|
|数据库 CI/CD|发布流程自动化编排|


### 2. 版本亮点（3 项）

- SQL 工单支持上传 SQL 文件：分段预览分析、审批、分发与执行不同阶段的内容。
- 数据库 CI/CD 发布流程级联编排：通过父子流程批量编排数据库变更。
- 新增数据源：Apache Cloudberry、达梦；补充 MongoDB Atlas、MongoDB SSL 和 Redis SSL 连接能力。

### 3. 新增功能（11 项）

||||
|---|---|---|
|1|SQL 工单文件上传|支持 UTF-8 SQL 文件、可配置大小限制、按行分段预览|
|2|CI/CD 发布流程级联编排|父子流程、批量编排、变更传递、失败重试、触发权限控制|
|3|私有化 GitLab 发布源|HTTP/HTTPS、非标准端口、子路径部署；Push、Merge Request Webhook|
|4|Apache Cloudberry 数据源|连接配置、元数据浏览、SQL 查询、PostgreSQL 兼容表结构管理|
|5|达梦数据源完善|专用 SQL 引擎：SQL 拆分、行为与权限分析、安全规则、系统函数和系统对象识别|
|6|MongoDB Atlas SRV|新增 SRV 连接模式|
|7|MongoDB SSL|新增 SSL 连接能力|
|8|Redis SSL|支持 CA、TrustStore、KeyStore 和客户端证书等配置方式|
|9|账号批量授权/回收|一次为多个账号配置相同资源权限|
|10|常用数据库驱动|新增 11 种数据库驱动（安装包内置）|


### 4. 优化项（7 项）

||||
|---|---|---|
|1|大 SQL 流式处理|审批预分析、安全规则检查、CI/CD SQL 处理、任务打包、Sidecar 下载和执行报告均流式处理，减少重复加载|
|2|SQL 引擎架构统一|统一多数据库 SQL 拆分、行为和资源分析、执行授权及审计状态；MySQL 查询结果脱敏支持基于列血缘识别来源字段|
|3|工单/CI/CD 详情展示|展示 SQL 识别、行为分析、安全规则检查及执行阶段进度、统计、日志和失败原因|
|4|偏好设置重构|账号安全、CI/CD、数据查询和审批按页签组织，类型化控件、变更状态和服务端校验|
|5|MFA 登录安全|数据库一次性挑战替代 MFA 前置 JWT，支持跨 Console 节点原子重试次数限制、过期清理和一次性消费|
|6|SQL 工作台交互|数据源树、空结果页签、列宽交互；复制截断单元格读取完整内容；恢复 Monaco SQL 诊断信息|
|7|审计与日志体验|审计记录执行前创建、按稳定查询标识更新状态，提升异步执行和 Sidecar 回报场景状态一致性|


### 5. 问题修复（10 项）

#### 5.1 数据库兼容性

- ClickHouse 启动依赖冲突
- MariaDB INT UNSIGNED 读取
- MySQL TINYINT(1) 数值展示
- PostgreSQL CREATE TYPE 执行
- Doris BUCKETS AUTO 表结构解析
- PostgreSQL 临时 Schema 干扰对象浏览
- MariaDB 查询和 SSL 连接兼容性

#### 5.2 功能逻辑

- 不完整的非 MySQL 列血缘分析导致正常查询执行前失败（保留 SQL 行为分析、权限校验和安全规则检查）
- 初始化升级阶段加载安全规则插件时全局服务未注册导致初始化失败
- 并发结果脱敏时原子类型缓存可能抛出 ConcurrentModificationException
- 表结构强制刷新仍读取旧缓存、全局查询安全规则未生效、安全规则手动修改参数不生效、规则详情布局错位、环境备注无法清空、Doris 物化视图无法展开

#### 5.3 交互与数据

- SQL 审计时间筛选、时区转换、总数分页、自定义列渲染、空用户名写入失败
- 工单重复提交、执行状态不自动刷新、恢复的 SQL 页签无法输入
- 大 SQL 工单详情未继续分段加载、追加内容后阅读位置跳动
- 数据源删除确认信息不直观
- 数据源保存后临时上传的证书附件未清理

### 6. 社区贡献

- BetaCat0（中国上海）

### 7. 快速体验（Docker 部署）

#### 7.1 海外镜像

```bash
docker run -d --name cgdm-alone -p 8222:8222 \
  -v cgdm_alone_conf:/root/cgdm/alone/conf \
  -v cgdm_alone_logs:/root/cgdm/alone/logs \
  -v cgdm_alone_data:/root/cgdm/alone/data \
  -v cgdm_mysql_data:/var/lib/mysql \
  bladepipe/cgdm-alone:latest
```

#### 7.2 中国区镜像

```bash
docker run -d --name cgdm-alone -p 8222:8222 \
  -v cgdm_alone_conf:/root/cgdm/alone/conf \
  -v cgdm_alone_logs:/root/cgdm/alone/logs \
  -v cgdm_alone_data:/root/cgdm/alone/data \
  -v cgdm_mysql_data:/var/lib/mysql \
  cloudcanal-registry.cn-shanghai.cr.aliyuncs.com/clougence/cgdm-alone:latest
```

启动完成后，浏览器访问：http://localhost:8222

#### 7.3 相关链接

|||
|---|---|
|官网|https://www.cdmgr.com/|
|文档|https://www.cdmgr.com/docs/intro/product_intro|
|GitHub|https://github.com/ClouGence/open-cdm|
|Gitee|https://gitee.com/clougence/open-cdm|


### 8. 知识点延展（补充）

#### 8.1 Apache Cloudberry

- 开源云原生数据仓库，基于 Greenplum 演进，PostgreSQL 语法兼容，支持 MPP 大规模并行处理。

#### 8.2 达梦数据库（DM）

- 国产关系型数据库，兼容 Oracle/MySQL 语法，常用 SQL 引擎需支持：SQL 拆分、行为与权限分析、安全规则、系统函数与系统对象识别。

#### 8.3 数据库 CI/CD 级联编排

- 父子流程：父流程触发多个子流程，实现多库批量变更；
- 变更传递：一次定义变更，自动应用到多个环境/数据库；
- 失败重试 + 触发权限控制：保障发布链路的可靠性与合规性。

原文链接：https://mp.weixin.qq.com/s/_DR-TKhyi8MmQ85_i4hthQ
