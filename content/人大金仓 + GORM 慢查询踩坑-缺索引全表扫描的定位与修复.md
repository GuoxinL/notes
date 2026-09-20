---
title: 人大金仓 + GORM 慢查询踩坑-缺索引全表扫描的定位与修复
date: 2026-09-18
description: KingbaseES（PG 兼容模式）+ GORM v1.31.1 的生产慢查询复盘：AutoMigrate 只建表结构与主键、不建业务查询索引，全表扫描让「查 1 行」耗时 16 秒；补建索引并 ANALYZE 后降到 10 毫秒，附夜莺 / Loki 慢日志排查语句。
tags: [KingbaseES, GORM, 索引, 查询优化, Loki]
category: 数据库
---

## 背景

环境：**KingbaseES（PG 兼容模式）+ GORM v1.31.1**。

现象：接口超时、单条 SQL 耗时 4~16 秒、`context canceled` 频发。

一句话结论：**GORM 的 `AutoMigrate` 只建表结构和主键，不会为业务查询字段建索引**。数据量一大，所有查询退化成全表扫描（Seq Scan），于是就有了「查 1 行耗时 16 秒」。

> [!info] 一句话根因
> GORM 模型只建了表，没建任何查询条件字段的索引。每个 `WHERE` 条件、`ORDER BY`、`JOIN` 字段都需要手动建。

## 问题现象

日志里频繁出现这类记录：

```text
Trace sql: SELECT * FROM "vc_issuer_log" WHERE "vc_id" = 'xxx' LIMIT 1
duration=7417.2ms  row: 1

Trace sql: UPDATE "vc_issuer_log" SET "revoked"=true WHERE "vc_id" = 'xxx'
duration=5423.5ms  row: 1

Trace sql: SELECT * FROM "did_document_record" WHERE "did" = 'xxx' ORDER BY version_id DESC, id LIMIT 1
duration=16338.7ms  row: 1
```

最离谱的一条：**16.3 秒只返回 1 行**。

| 表 | 缺失索引的字段 | 最慢耗时 |
| --- | --- | --- |
| `vc_issuer_log` | `vc_id`、`holder`、复合四字段 | SELECT 7.4s / UPDATE 5.4s |
| `did_document_record` | `did` | SELECT 16.3s |
| `identity_enterprise` | `uniscid`、`entname`（OR 条件 + 软删除） | SELECT 4.1s |

## 排查路径

从「接口超时」到「16 秒变 10 毫秒」的完整链路：

```mermaid
flowchart LR
  A[接口超时 / context canceled] --> B[夜莺 + Loki 捞慢日志]
  B --> C[日志出现 duration 4~16 秒]
  C --> D[EXPLAIN 看执行计划]
  D --> E{Seq Scan 全表扫描}
  E -->|确认缺索引| F[补建索引 + ANALYZE]
  F --> G[16 秒降到 10 毫秒]
```

## 修复：补建索引

### 核心索引（一次性执行）

```sql
-- ===== vc_issuer_log =====
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vc_issuer_log_vc_id
ON vc_issuer_log(vc_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vc_issuer_log_holder
ON vc_issuer_log(holder);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vc_issuer_log_composite
ON vc_issuer_log(holder, issuer, vc_id, template_id);

-- ===== did_document_record =====
-- 每个 did 一般只有 3 行，单列索引完全够用，不需要联合索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_did_document_record_did
ON did_document_record(did);

-- ===== identity_enterprise（部分索引，排除软删除）=====
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_identity_enterprise_uniscid_active
ON identity_enterprise(uniscid) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_identity_enterprise_entname_active
ON identity_enterprise(entname) WHERE deleted_at IS NULL;

-- ===== 更新统计信息 =====
ANALYZE vc_issuer_log;
ANALYZE did_document_record;
ANALYZE identity_enterprise;
```

> [!warning] 版本差异
> KingbaseES V8R6+ 支持 `CONCURRENTLY` 与部分索引（`WHERE deleted_at IS NULL`）；老版本去掉这两个关键字即可。

### 修复效果对比

| 操作 | 修复前 | 修复后 |
| --- | --- | --- |
| `SELECT * WHERE vc_id` | 7417ms | < 5ms |
| `UPDATE WHERE vc_id` | 5423ms | < 5ms |
| `SELECT * WHERE did` | 16338ms | < 10ms |
| `SELECT OR + 软删除` | 4139ms | < 20ms |

**16 秒 → 10 毫秒，三个数量级的提升。**

## 附带发现的问题

### context canceled 导致事务状态混乱

```text
err: context canceled; sql: transaction has already been committed or rolled back
```

上游设了超时（5s），SQL 还没跑完就被 cancel，但数据库端可能已经执行完了。Go 的 `database/sql` 检测到事务状态变了就报这个错。

影响：应用层认为失败可能重试，但实际已经成功——好在 `SET revoked=true` 是幂等操作，没有造成脏数据。

### OR 条件让索引更难被使用

`WHERE uniscid = ? OR entname = ?` 即使两个字段都有单列索引，优化器也可能选择全表扫描。部分索引 + 更新统计信息后改善；代码层面拆成 `UNION` 更稳妥。

### GORM 日志全是文本格式

字段靠正则提取，效率低。建议改成 JSON 输出，方便日志系统结构化查询。

## 夜莺 + Loki 慢日志查询备忘

这次排查全程靠夜莺看日志，常用的 LogQL 语句整理如下，以后直接抄。

### 基础：检索慢日志（≥ 1 秒）

```bash
{app="did-gateway"} |~ `duration=([1-9]\d{3,})\.?\d*ms`
```

正则拆解：`[1-9]\d{3,}` = 首位非零 + 至少 3 位数字 = ≥ 1000。

### 数值过滤（推荐，更精确）

```bash
{app="did-gateway"} |~ `duration=(?P<dur>\d+\.?\d*)ms` | duration > 3000
```

### 排除已知问题，只看新冒出来的

```bash
{app=~"did-gateway|did-admin-service"}
|~ `duration=(?P<dur>\d+\.?\d*)ms`
| duration > 1000
!~ `("vc_issuer_log"|"did_document_record"|"identity_enterprise"|issue-log/detail)`
```

### 专门找 context canceled 的

```bash
{app=~"did-gateway|did-admin-service"}
|= "Trace sql:"
|= "context canceled"
|~ `duration=([1-9]\d{3,})\.?\d*ms`
```

### 多服务聚合统计慢 SQL 数量

```bash
sum by (app) (
  count_over_time(
    {app=~"did-gateway|did-admin-service|vc-service"}
    |~ `Trace sql:.*duration=([1-9]\d{3,})\.?\d*ms` [5m]
  )
)
```

### 只看 HTTP 慢请求

```bash
{app="did-gateway"}
|= "[HTTP]"
|~ `duration=([1-9]\d{3,})\.?\d*ms`
!~ `issue-log/detail`
```

### 正则阈值速查

| 阈值 | 正则 |
| --- | --- |
| ≥ 1s | `duration=([1-9]\d{3,})\.?\d*ms` |
| ≥ 3s | `duration=([3-9]\d{3,})\.?\d*ms` |
| ≥ 5s | `duration=([5-9]\d{3,})\.?\d*ms` |
| ≥ 10s | `duration=([1-9]\d{4,})\.?\d*ms` |

## Checklist：以后建表必做

- [ ] 每个 GORM 模型的 `WHERE` 条件字段 → 建索引
- [ ] `ORDER BY` 字段如果数据量大 → 考虑联合索引
- [ ] `OR` 条件涉及的字段 → 分别建索引 + 考虑 `UNION` 改写
- [ ] 软删除表 → 建部分索引 `WHERE deleted_at IS NULL`
- [ ] 建完索引后 `ANALYZE` 更新统计信息
- [ ] GORM 配置 `SlowThreshold` + JSON 日志输出
- [ ] 夜莺配慢 SQL 告警（> 1s 触发）

## 关联

索引为什么能加速查询、B+Tree 为什么适合做数据库索引，见 [[MySQL索引与B+Tree底层实现好处]]。

> [!danger] 一句话总结
> 全表扫描 + 无索引 = 生产事故。GORM 不会帮你建索引，自己长点心。
