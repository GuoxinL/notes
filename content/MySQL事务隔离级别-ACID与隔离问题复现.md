---
title: MySQL事务隔离级别-ACID与隔离问题复现
date: 2026-08-18
tags: [MySQL, 事务, 隔离级别, ACID, MVCC]
description: SQL 标准定义了 4 类隔离级别，包含一些具体规则，用来限定事务内外的哪些改变是可见的、哪些是不可见的。
---

来源：整理自 学无止境/DB/mysql/事物隔离级别.md（含完整 SQL 复现实验），已修复笔误（事物→事务、Drity→Dirty、不可重复度→不可重复读、"可重复读的问题"→"不可重复读的问题"等），结构化成章节。

### 一、概述

SQL 标准定义了 4 类隔离级别，包含一些具体规则，用来限定事务内外的哪些改变是可见的、哪些是不可见的。低级别的隔离级一般支持更高的并发处理，并拥有更低的系统开销。

### 二、事务的基本要素（ACID）

|||
|---|---|
|原子性（Atomicity）|事务开始后所有操作，要么全部做完，要么全部不做，不可能停滞在中间环节。事务执行过程中出错，会回滚到事务开始前的状态，所有的操作就像没有发生一样。事务是一个不可分割的整体，就像化学中的原子，是物质构成的基本单位|
|一致性（Consistency）|事务开始前和结束后，数据库的完整性约束没有被破坏。比如 A 向 B 转账，不可能 A 扣了钱，B 却没收到|
|隔离性（Isolation）|同一时间，只允许一个事务请求同一数据，不同的事务之间彼此没有任何干扰。比如 A 正在从一张银行卡中取钱，在 A 取钱的过程结束前，B 不能向这张卡转账|
|持久性（Durability）|事务完成后，事务对数据库的所有更新将被保存到数据库，不能回滚|


### 三、四个隔离级别

#### 3.1 Read Uncommitted（读取未提交内容）

在该隔离级别，所有事务都可以看到其他未提交事务的执行结果。本隔离级别很少用于实际应用，因为它的性能也不比其他级别好多少。读取未提交的数据，也被称之为脏读（Dirty Read）。

#### 3.2 Read Committed（读取提交内容）

这是大多数数据库系统的默认隔离级别（但不是 MySQL 默认的）。它满足了隔离的简单定义：一个事务只能看见已经提交事务所做的改变。这种隔离级别也支持所谓的不可重复读（Non-repeatable Read），因为同一事务的其他实例在该实例处理其间可能会有新的 commit，所以同一 select 可能返回不同结果。

#### 3.3 Repeatable Read（可重读）

这是 MySQL 的默认事务隔离级别，它确保同一事务的多个实例在并发读取数据时，会看到同样的数据行。不过理论上，这会导致另一个棘手的问题：幻读（Phantom Read）。简单地说，幻读指当用户读取某一范围的数据行时，另一个事务又在该范围内插入了新行，当用户再读取该范围的数据行时，会发现有新的"幻影"行。InnoDB 和 Falcon 存储引擎通过多版本并发控制（MVCC，Multiversion Concurrency Control）机制解决了该问题。

#### 3.4 Serializable（可串行化）

这是最高的隔离级别，它通过强制事务排序，使之不可能相互冲突，从而解决幻读问题。简言之，它是在每个读的数据行上加上共享锁。在这个级别，可能导致大量的超时现象和锁竞争。

### 四、隔离级别与问题对照

这四种隔离级别采取不同的锁类型来实现，若读取的是同一个数据的话，就容易发生问题：

#### 4.1 脏读（Dirty Read）

某个事务已更新一份数据，另一个事务在此时读取了同一份数据；由于某些原因，前一个事务 RollBack 了操作，则后一个事务所读取的数据就会是不正确的。

#### 4.2 不可重复读（Non-repeatable Read）

在一个事务的两次查询之中数据不一致，这可能是两次查询过程中间插入了一个事务更新了原有的数据。

#### 4.3 幻读（Phantom Read）

在一个事务的两次查询中数据笔数不一致，例如有一个事务查询了几行（Row）数据，而另一个事务却在此时插入了新的几行数据，先前的事务在接下来的查询中，就会发现有几行数据是它先前所没有的。

|||||
|---|---|---|---|
|READ UNCOMMITTED|√|√|√|
|READ COMMITTED|×|√|√|
|REPEATABLE READ|×|×|√|
|SERIALIZABLE|×|×|×|


### 五、脏读、不可重复读、幻读的复现实验

#### 5.1 准备工作

建表并插入测试数据：

```sql
create table test1
(
    id   int auto_increment primary key,
    name varchar(32) not null,
    age  int         not null
) ENGINE=InnoDB;

insert into test1 (name, age) values ('张三',20),('李四',22),('王五',24),('赵六',26),('赵六',26);

mysql> select * from test1;
+----+--------+-----+
| id | name   | age |
+----+--------+-----+
|  1 | 张三   |  20 |
|  2 | 李四   |  22 |
|  3 | 王五   |  24 |
|  4 | 赵六   |  26 |
|  5 | 赵六   |  26 |
+----+--------+-----+
5 rows in set (0.00 sec)
```

#### 5.2 默认事务隔离级别

```sql
mysql> select @@transaction_isolation;
+-------------------------+
| @@transaction_isolation |
+-------------------------+
| REPEATABLE-READ         |
+-------------------------+
1 row in set (0.00 sec)
```

transaction_isolation 是 MySQL system variables，其余 system variables 可通过官方文档查看。

#### 5.3 脏读复现（READ UNCOMMITTED）

- 开启两个 MySQL 连接，分别为 A 连接、B 连接
- A 连接中设置隔离级别：
```sql
mysql> set transaction_isolation = 'read-uncommitted';
Query OK, 0 rows affected (0.00 sec)
```

- 在 A、B 连接的窗口分别查询 test1 表的数据，表数据一致（同初始数据，略）
- 在 B 连接的命令窗口输入 start transaction;，并更新相应记录，但不提交：
```sql
update test1 set name='张三丰' where id = 1;
```

- 在 A 连接中查询表：
```sql
mysql> select * from test1;
+----+-----------+-----+
| id | name      | age |
+----+-----------+-----+
|  1 | 张三丰    |  20 |
|  2 | 李四      |  22 |
|  3 | 王五      |  24 |
|  4 | 赵六      |  26 |
|  5 | 赵六      |  26 |
+----+-----------+-----+
5 rows in set (0.00 sec)
```

结果：在 B 连接开始事务、更新数据、没有提交的情况下，A 连接可以在 read-uncommitted 模式下查询到 B 连接未提交的数据 —— 脏读复现。

- B 连接窗口输入 rollback 回滚数据，此时 A、B 连接所查询的数据，和初始时的数据是一样的。
#### 5.4 不可重复读复现（READ COMMITTED）

- 创建 A 连接，并设置当前事务模式为 Read Committed：
```sql
mysql> set transaction_isolation = 'read-committed';
Query OK, 0 rows affected (0.00 sec)
```

- A 连接查询表 test1 的所有记录（启动事务，查询到初始 5 行数据，输出同初始数据，略）
- B 连接启动事务，更新字段（不提交）：
```sql
mysql> start transaction;
Query OK, 0 rows affected (0.00 sec)

mysql> update test1 set name='张三丰' where id = 1;
Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0
```

- 回到 A 连接再次执行查询，并未查询到 B 连接没有提交的更新，解决了脏读的问题（输出同初始数据，略）
- B 连接提交事务：
```sql
mysql> commit;
Query OK, 0 rows affected (0.01 sec)
```

- 返回 A 连接查询，可以看到 B 连接已提交的更新，但结果与上一步不一致，即产生了不可重复读的问题：
```sql
mysql> select * from test1;
+----+--------+-----+
| id | name   | age |
+----+--------+-----+
|  1 | 张三丰 |  20 |
|  2 | 李四   |  22 |
|  3 | 王五   |  24 |
|  4 | 赵六   |  26 |
|  5 | 赵六   |  26 |
+----+--------+-----+
5 rows in set (0.00 sec)
```

#### 5.5 可重复读复现（REPEATABLE READ + MVCC）

- 打开 A 连接，设置当前事务模式为 repeatable-read，查询表 test1 的所有记录：
```sql
mysql> set transaction_isolation = 'repeatable-read';
Query OK, 0 rows affected (0.00 sec)

mysql> start transaction;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from test1;
+----+--------+-----+
| id | name   | age |
+----+--------+-----+
|  1 | 张三丰 |  20 |
|  2 | 李四   |  22 |
|  3 | 王五   |  24 |
|  4 | 赵六   |  26 |
|  5 | 赵六   |  26 |
+----+--------+-----+
5 rows in set (0.00 sec)
```

- 在客户端 A 的事务提交之前，打开另一个客户端 B，更新表 test1 并提交：
```sql
mysql> start transaction;
Query OK, 0 rows affected (0.00 sec)

mysql> update test1 set age = age + 3 where id = 1;
Query OK, 1 row affected (0.00 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> commit;
Query OK, 0 rows affected (0.00 sec)
```

- 回到 A 连接再次查询 test1 表，没有出现不可重复读的情况，结果与第一步一致（输出同第 1 步，略）
- 接着在 A 连接执行更新操作 update test1 set age = age + 2 where id = 1; 时，age 并没有更新为 20+2=22，而是根据第 2 步中已经提交的 23 + 2 = 25 来计算的：
```sql
mysql> update test1 set age = age + 2 where id = 1;
Query OK, 1 row affected (0.00 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> select * from test1;
+----+-----------+-----+
| id | name      | age |
+----+-----------+-----+
|  1 | 张三丰    |  25 |
|  2 | 李四      |  22 |
|  3 | 王五      |  24 |
|  4 | 赵六      |  26 |
|  5 | 赵六      |  26 |
+----+-----------+-----+
5 rows in set (0.00 sec)
```

原理：数据的一致性没有被破坏，是因为可重复读的隔离级别下使用了 MVCC 机制：

- select 操作不更新版本号，是快照读（历史版本）
- insert、update、delete 会更新版本号，是当前读（当前版本）
#### 5.6 幻读复现（REPEATABLE READ）与 Serializable 演示

- 打开 A 连接设置隔离级别为 repeatable-read，查询表 test1 的所有记录（此时已有 5 行，输出同 5.5 第 1 步，略）
- 打开 B 连接插入一条数据并提交：
```sql
mysql> start transaction;
Query OK, 0 rows affected (0.00 sec)

mysql> insert into test1 (name, age) values ('王二麻子',20);
Query OK, 1 row affected (0.00 sec)

mysql> commit;
Query OK, 0 rows affected (0.00 sec)
```

- 回到 A 连接中查询，却没有查询到新增的数据（快照读不受影响）；提交后再次查询才查询到新增的数据：
```sql
mysql> start transaction;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from test1;   -- 仍只有 5 行（略）
mysql> select * from test1;   -- 仍只有 5 行（略）

mysql> commit;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from test1;
+----+--------------+-----+
| id | name         | age |
+----+--------------+-----+
|  1 | 张三丰       |  25 |
|  2 | 李四         |  22 |
|  3 | 王五         |  24 |
|  4 | 赵六         |  26 |
|  5 | 赵六         |  26 |
|  6 | 王二麻子     |  20 |
+----+--------------+-----+
6 rows in set (0.00 sec)
```



补充说明：实验证明在 MySQL REPEATABLE READ 下，快照读（普通 select）通过 MVCC 看不到其他事务新插入的行，从而避免了幻读；但如果是当前读（如 select ... for update、update、insert），仍可能产生幻读，InnoDB 通过 next-key 锁（间隙锁） 来防御。MySQL 8.0 起还引入了 SELECT ... FOR UPDATE 配合 NOWAIT/SKIP LOCKED 等能力，详见官方文档。

- A 连接设置事务隔离级别为 serializable，启动事务并查询：
```sql
mysql> set transaction_isolation = 'serializable';
Query OK, 0 rows affected (0.00 sec)

mysql> start transaction;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from test1;
+----+--------------+-----+
| id | name         | age |
+----+--------------+-----+
|  1 | 张三丰       |  25 |
|  2 | 李四         |  22 |
|  3 | 王五         |  24 |
|  4 | 赵六         |  26 |
|  5 | 赵六         |  26 |
|  6 | 王二麻子     |  20 |
+----+--------------+-----+
6 rows in set (0.00 sec)
```

- B 连接启动事务新增一条数据，但执行时该命令已处于阻塞状态，直到 A 连接事务提交后，该条命令才解除阻塞：
```sql
mysql> start transaction;
Query OK, 0 rows affected (0.00 sec)

mysql> insert into test1 (name, age) values ('王三麻子',20);
-- 这里没有提示运行成功，保持阻塞状态
Query OK, 1 row affected (18.47 sec)
-- 直到 A 连接事务提交后该命令才执行成功，该命令运行了 18.47 秒
```

结论：因为 set transaction_isolation = 'serializable'; 让事务保持串行化，因此不会出现幻读的情况；但这种隔离级别并发性极低，开发中很少会用到。

### 参考文献

- MySQL 官方文档（5.7 Server System Variables）：http://dev.mysql.com/doc/refman/5.7/en/server-system-variables.html
- 原文（未署名）：事物隔离级别.md，学无止境/DB/mysql/

整理版本：v1.0 · 2026-08-18
