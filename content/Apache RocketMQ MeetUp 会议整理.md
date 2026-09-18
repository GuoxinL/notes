---
title: Apache RocketMQ MeetUp 会议整理
date: 2026-08-18
tags: [RocketMQ, Kafka, Pulsar, 消息队列, 会议记录]
description: 整理 RocketMQ MeetUp 的 7 场演讲：Pulsar 多租户、RocketMQ 5.0、OpenMessage、k8s 运维与 Kafka 实践。
---

来源：C:\node\学无止境\会议记录\Apache RocketMQ MeetUp 文件夹（7 篇演讲笔记）
主题：消息中间件生态（RocketMQ / Kafka / Pulsar）、数据融合、MQ 运维、数字化创新

### 演讲一览

|||||
|---|---|---|---|
|1|Apache Pulsar 多租户|Sijie Guo（StreamNative/源流科技）|多租户概念|
|2|DataPipeline 数据融合平台|刘翰林|数据源融合、Kafka Connect|
|3|RocketMQ 5.0 与社区|阿里（Rocket）|场景、OpenMessage、云 RocketMQ|
|4|RocketMQ 在 VIOKID 的应用|李虎（白老虎）|海量 Topic 实践、订阅一致性|
|5|RocketMQ 的生命是运维|王昕|k8s 运维 RocketMQ 集群|
|6|传统企业数字化转型|-|数字化商业模式、第二曲线|
|7|瓜子结构化数据流|彭超|Kafka 平台化、Avro/Schema、Connect|


### 1. Apache Pulsar · 多租户（Sijie Guo）

演讲者：Sijie Guo，StreamNative / 源流科技（Pulsar 商业化公司）

核心概念：多租户（Multi-tenancy）

计算与存储分离架构

租户 / 命名空间（Namespace）/ Topic 的三级隔离模型

- 

不同业务共享集群但逻辑隔离

### 2. DataPipeline 数据融合平台的探索与实践（刘翰林）

#### 2.1 平台定位

目标：融合多数据源 —— 消息队列、数据库等

- 

核心组件：Source（数据源接入）和 Sink（数据写出）

#### 2.2 关键问题

|||
|---|---|
|易购（繁琐）|数据源适配繁琐，每个数据源都要单独适配|
|动态|数据源结构随时发生变化|
|扩展|水平扩展能力|
|完整|数据一致性保障|


#### 2.3 消息队列在数据融合平台的作用

解耦：源与目标系统解耦

水平扩展：通过分区/分片扩展吞吐

- 

数据同步一致性：消息队列作为同步缓冲，保证最终一致性

#### 2.4 Kafka Connect 与挑战

借助 Kafka Connect 生态做数据源适配

Challenge / 问题：

停止数据写入（适配器变更/故障时的数据中断）

- 

OpenMessage 的动机：统一消息标准，降低适配成本（详见第 3 节）

### 3. RocketMQ 5.0 与社区生态（阿里）

#### 3.1 RocketMQ 场景定位

|||
|---|---|
|异步解耦、消息同步|核心消息场景|
|支撑亿万级消息洪峰|高吞吐削峰填谷|
|金融级消息及数据流中间件|高可靠、事务消息|
|Apache 顶级项目|开源社区成熟|


#### 3.2 消息中间件现状痛点

学习成本高：每个 MQ（Kafka/RabbitMQ/RocketMQ）概念不同

- 

迁移成本高：业务绑定具体 MQ API

#### 3.3 OpenMessage 标准（关键概念）

阿里提出 OpenMessage 消息标准，用于降低学习成本：

- 全语言多端支持：统一 API 覆盖各语言
- IOT Bridge 组件：IoT 设备接入桥接
- Rocket Streaming：流式处理能力
定位类比：OpenMessage 类似 JMS 标准，目标是让开发只需学一套 MQ 概念，无需被各 MQ 绑定。

#### 3.4 Cloud RocketMQ

- 

云托管版本，免运维的 RocketMQ 服务

#### 3.5 构建 Rocket 社区

|||
|---|---|
|项目制培养|以项目形式，由 master 带领小组|
|城市社区|发起人组织线下沙龙|
|孵化社区项目|通过牧羊人（mentor）孵化 → PMC 投票 → 项目毕业|


#### 3.6 RocketMQ 5.0 特性

协议可插拔：支持多协议接入（gRPC 等）

- 

多副本（后期支持）：提升高可用

### 4. RocketMQ 在 VIOKID 的应用（李虎 / 白老虎）

#### 4.1 业务需求

|||
|---|---|
|性能|数据量大、消息量大|
|海量 Topic|3000 个 Topic|
|消费者规模|1 万个消费者|
|管理|统一管理平台|
|API|简单方便|


#### 4.2 选型对比：RocketMQ vs Kafka

|||
|---|---|
|RocketMQ|适合业务、消峰平谷（削峰填谷）|
|Kafka|性能好、单条消费体积小|
|海量 Topic 场景|Kafka 3000 Topic + 1w 消费者容易死掉 → 选 RocketMQ|


#### 4.3 最佳实践

订阅关系一致：一个消费者组消费的 Topic 必须一致

Docker 部署注意：broker 取本地 IP，导致不知道启动了多少消费实例

- 

多环境隔离：开发/稳定环境订阅关系不一致会出问题

#### 4.4 订阅关系不一致的问题

|||
|---|---|
|更换 Topic|删除 topic3 添加 topic4 后订阅关系不一致|
|不能跨环境消费|A1 环境的 Topic 必须由 A1 环境消费|
|启动失败|订阅关系不一致不能启动系统|
|消息堆积报警|订阅异常导致堆积|
|客户端 ID 冲突|客户端 id 由 ip@instanceName 组成，Docker 内启动获取的 IP 都一样 → 冲突|
|Tag 使用|Topic 中 tag 的正确使用|


#### 4.5 未来走向

租户隔离：多租户能力

- 

OpenMessage 标准：类似 JMS 的标准，解决"需要学习很多 MQ 概念"的痛点

### 5. RocketMQ 的生命是运维（王昕）— k8s 运维 RocketMQ

#### 5.1 动机

快速搭建 RocketMQ 集群：docker / k8s 两种方式

- 

CAP 理论：一致性和可用性是相悖的（分布式系统基础）

#### 5.2 k8s 核心组件速记

|||
|---|---|
|kubelet|节点上的 agent，监听节点 Pod 获取 spec 和 status|
|master 节点|也有 kubelet|
|etcd|保存所有数据；存储量不大，不存业务数据，适合存运维/状态数据|
|API Server|访问 k8s 的唯一入口|
|cloud controller manager|管理云节点（扩展、缩容）|
|kube controller manager|控制器管理|
|kube proxy|负载均衡|
|namespace|逻辑隔离能力，虚拟租户空间|


#### 5.3 声明式机制

|||
|---|---|
|Label|对 Pod 做标注，标签匹配选择机制|
|Annotation|结构化文件（json 等），不止字符串|
|Selector|标签匹配选择器|


#### 5.4 k8s 工作负载对象

|||
|---|---|
|Pod|最小调度单元|
|ReplicationController|自动管理/运维，声明式；对比对象 spec（目标）与 status（当前）|
|ReplicaSet|支持 Set 选择器|
|Deployment|ReplicaSet 的管理组件；单版本=RS，多版本=Deployment 管理多个 RS，支持自动升级|
|StatefulSet|管理有状态 Pod（适合 RocketMQ 这类有状态中间件）|
|DaemonSet|系统级，每个节点都运行（如日志采集）|
|Service|服务发现与暴露|


#### 5.5 RocketMQ 集群节点

```
RocketMQ Cluster
├── NameServer（类似 Zookeeper，服务注册发现）
└── Broker
    ├── Broker Master（主）
    └── Broker Slave（从，主从同步）
```

#### 5.6 实践参考

创建 NameServer cluster

- 

开源 operator：https://github.com/huanwei/rocketmq-operator

### 6. 传统企业数字化转型创新

#### 6.1 数字化本质

第一步：文字图片资料数字化

数据价值：去物质化、去货币化、去民主化

- 

案例：柯达被 Ins 打败 —— 基于数据的商业模式是指数型增长

#### 6.2 数字化五大方向

产品服务化

服务智能化

员工社会化

客户员工化

- 

资源共享化

#### 6.3 新商业思维与推荐书

推荐：《第二曲线》《刷新微软》

- 

从相邻领域切入寻找机会

#### 6.4 《刷新微软》三个刷新

|||
|---|---|
|刷新使命|移动互联网是微软的另一条曲线；裁掉诺基亚，与每一个人合作；通过帮助他人，成长自己|
|刷新文化|don't be a know-it-all, be a learn-it-all（向别人学习）；成长型思维；微软加速器帮助创业者|
|刷新战略|CEO 3C 法则|


#### 6.5 数字化增长公式

（教育 + 创新）× 数字化转型 = 第二曲线

### 7. 瓜子二手车 · 结构化数据流（彭超）

#### 7.1 为什么选择 Kafka

数据量大

分布式处理

- 

分布式存储

#### 7.2 Kafka 集群

- 

Mirror Maker：集群间数据同步

#### 7.3 使用痛点（平台化前的 7 大问题）

|||
|---|---|
|1|参数配置问题|
|2|开发测试不方便，消费不到数据|
|3|没有监控报警|
|4|Topic 申请不方便|
|5|结构化数据查询不方便|
|6|消费异常定位难，找不到消费异常数据|
|7|找不到下游消费服务|


#### 7.4 Kafka 监控平台能力

|||
|---|---|
|数据查看|根据时间查询|
|消费查看|被谁消费、lag（消费延迟）|
|监控报警|流入、流出、延迟、报警|


#### 7.5 使用场景

Tracking 埋点：客户端行为数据

MySQL 数据同步：业务数据同步到 MQ，多数据源同步

- 

App Metrics：结构化埋点

#### 7.6 Apache Avro 序列化

|||
|---|---|
|fast|高性能|
|跨语言|多语言支持|
|Json|与 JSON 结合|
|无需 code|schema 驱动，免写代码|
|版本兼容|关键需求，通过 Schema 演进|


#### 7.7 Schema Registry

Schema 中心（集中管理）

RESTful interface

- 

存储所有历史版本 schema

#### 7.8 Schema 管理方案演进

||||
|---|---|---|
|初版|git 管理 schema + CI 流程 + 管理员人工干预|上线流程太长|
|优化|申请校验 + 权限管理 + 版本管理|规范化流程|


#### 7.9 Kafka Connect 生态

- Old Times：Canal / Maxwell（MySQL binlog 同步）
- plugins - Maxwell：借鉴 Debezium 思想，支持 Avro；用 MySQL 做 meta 管理
- plugins - HDFS：数据落地 HDFS
- plugins - HBase：自定义 rowkey、支持 JSON
- plugins - Kudu：自适应流量控制、Fix Record 乱序、自动扩展线程消费、扩展 Kafka 时间
- plugins - JDBC：upsert 支持

#### 7.10 Avro 实战问题（踩坑记录）

|||
|---|---|
|Enum 类型|序列化兼容性问题|
|Go SDK|导致 topic offset 混乱|
|KafkaConnect 跳过脏数据|脏数据静默跳过|
|KafkaConnect task 抛 IOException 不 fail|异常不触发任务失败|
|内存增长|长时间运行内存泄漏|


#### 7.11 整体架构（孙强）

```
数据链路：MySQL → HBase → Hive → Kudu
            实时流      处理计算
           Kafka → Flink（流处理）
```

### 附录：跨演讲共性洞察

|||
|---|---|
|海量 Topic + 大规模消费者选 RocketMQ，高吞吐选 Kafka|第 4 节 VIOKID|
|MQ 的核心价值 = 解耦 + 削峰填谷 + 水平扩展 + 一致性缓冲|第 2、4 节|
|OpenMessage 是降低 MQ 学习/迁移成本的统一标准方向|第 3、4 节|
|有状态中间件（如 RocketMQ）在 k8s 上应使用 StatefulSet + Operator|第 5 节|
|MQ 平台化三件套：申请审批 + 监控报警 + Schema 管理|第 7 节瓜子|
|数据融合平台的核心挑战 = 数据源适配 + 动态结构 + 一致性|第 2 节 DataPipeline|


整理版本：v1.0 · 2026-08-18 · 基于 7 篇原始笔记整合
