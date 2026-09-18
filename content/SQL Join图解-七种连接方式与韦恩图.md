---
title: SQL Join图解-七种连接方式与韦恩图
date: 2026-08-18
tags: [SQL, MySQL, Join, 内连接, 韦恩图]
description: 假设有下面两张表（表 A 在左边、表 B 在右边，各四条记录），通过 name 字段用七种不同方式连接，看是否与韦恩图概念匹配。
---

来源：整理自 学无止境/DB/mysql/SQL Join.md（原文译 Join 为"联合"），已修复笔误（全外连接 SQL 误写为 LEFT OUTER JOIN、交叉连接标题格式），结果集统一转为表格，并为每张韦恩图补充配图内容描述。

### 预备：示例数据

假设有下面两张表。表 A 在左边，表 B 在右边，各四条记录：

|||||
|---|---|---|---|
|1|Pirate|1|Rutabaga|
|2|Monkey|2|Pirate|
|3|Nathan|3|Darth Vader|
|4|Sidney|4|Nathan|


我们通过 name 字段用几种不同方式把这些表连接起来，看能否得到和那些漂亮的韦恩图在概念上的匹配。

### 一、内连接（INNER JOIN）

内连接（inner join）只生成同时匹配表 A 和表 B 的记录集。

```sql
SELECT * FROM TableA INNER JOIN TableB ON TableA.name = TableB.name
```

|||||
|---|---|---|---|
|1|Pirate|2|Pirate|
|3|Nathan|4|Nathan|


配图内容描述：内连接韦恩图——两个圆相交，阴影部分为两圆交集（A ∩ B），即同时存在于表 A 和表 B 的记录（Pirate、Nathan 两行）。

### 二、全外连接（FULL OUTER JOIN）

全外连接（full outer join）生成表 A 和表 B 里的记录全集，包括两边都匹配的记录。如果有一边没有匹配的，缺失的这一边为 null。

```sql
SELECT * FROM TableA FULL OUTER JOIN TableB ON TableA.name = TableB.name
```



原文勘误：原文档此节 SQL 误写为 LEFT OUTER JOIN，与"记录全集"的语义及结果集不符，已更正为 FULL OUTER JOIN。

|||||
|---|---|---|---|
|1|Pirate|2|Pirate|
|2|Monkey|null|null|
|3|Nathan|4|Nathan|
|4|Sidney|null|null|
|null|null|1|Rutabaga|
|null|null|3|Darth Vader|


配图内容描述：全外连接韦恩图——两个圆整体全部被阴影覆盖，即并集（A ∪ B），包含表 A 独有、表 B 独有以及两表共有（Pirate、Nathan）的全部记录。

### 三、左外连接（LEFT OUTER JOIN）

左外连接（left outer join）生成表 A 的所有记录，包括在表 B 里匹配的记录。如果没有匹配的，右边将是 null。

```sql
SELECT * FROM TableA LEFT OUTER JOIN TableB ON TableA.name = TableB.name
```

|||||
|---|---|---|---|
|1|Pirate|2|Pirate|
|2|Monkey|null|null|
|3|Nathan|4|Nathan|
|4|Sidney|null|null|


配图内容描述：左外连接韦恩图——阴影覆盖左圆（表 A）全部区域，包含两圆交集；右圆（表 B）中未被阴影覆盖的部分为表 B 独有记录（Rutabaga、Darth Vader），不会出现在结果集中。

### 四、左外连接 + WHERE（仅在 A 中的记录）

为了生成只在表 A 里而不在表 B 里的记录集，用同样的左外连接，然后用 WHERE 语句排除我们不想要的记录：

```sql
SELECT * FROM TableA LEFT OUTER JOIN TableB ON TableA.name = TableB.name WHERE TableB.id IS null
```

|||||
|---|---|---|---|
|2|Monkey|null|null|
|4|Sidney|null|null|


配图内容描述：左外连接 + WHERE 韦恩图——阴影仅覆盖左圆中不与右圆相交的区域（A − B），即表 A 独有记录（Monkey、Sidney）。

### 五、全外连接 + WHERE（A、B 各自独有的记录）

为了生成对于表 A 和表 B 唯一的记录集，用同样的全外连接，然后用 WHERE 语句排除两边都匹配的记录：

```sql
SELECT * FROM TableA FULL OUTER JOIN TableB ON TableA.name = TableB.name WHERE TableA.id IS null OR TableB.id IS null
```

|||||
|---|---|---|---|
|2|Monkey|null|null|
|4|Sidney|null|null|
|null|null|1|Rutabaga|
|null|null|3|Darth Vader|


配图内容描述：全外连接 + WHERE 韦恩图——阴影覆盖两圆中不相交的部分（A △ B，对称差），即两表各自独有的记录（Monkey、Sidney、Rutabaga、Darth Vader），排除了共有的 Pirate、Nathan。

### 六、交叉连接（CROSS JOIN）

还有一种笛卡尔积或者交叉连接（cross join），据我所知不能用韦恩图表示：

```sql
SELECT * FROM TableA CROSS JOIN TableB
```

这个把"所有"联接到"所有"，产生 4 × 4 = 16 行，远多于原始的集合。如果你学过数学，你便知道为什么这个连接遇上大型的表很危险。

配图内容描述：交叉连接示意图——展示表 A 每一行与表 B 每一行两两组合的笛卡尔积，共 4 × 4 = 16 种组合（非韦恩图形式）。

### 七、七种连接方式速查

|||||
|---|---|---|---|
|INNER JOIN|A INNER JOIN B ON ...|两表都匹配的记录|交集 A ∩ B|
|FULL OUTER JOIN|A FULL OUTER JOIN B ON ...|全集，缺失侧补 null|并集 A ∪ B|
|LEFT OUTER JOIN|A LEFT OUTER JOIN B ON ...|A 全部 + B 匹配，未匹配补 null|左圆全集|
|LEFT OUTER JOIN + WHERE|上述 + WHERE B.id IS null|只在 A 中的记录|A − B|
|FULL OUTER JOIN + WHERE|上述 + WHERE A.id IS null OR B.id IS null|A、B 各自独有的记录|对称差 A △ B|
|CROSS JOIN|A CROSS JOIN B|笛卡尔积 m × n 行|无法用韦恩图表示|




注：MySQL 不支持 FULL OUTER JOIN 关键字，可用 LEFT JOIN ... UNION ... RIGHT JOIN ... 模拟；SQLite、PostgreSQL、SQL Server、Oracle 原生支持。

### 参考文献

- 原文（未署名）：SQL Join.md，学无止境/DB/mysql/（配图原文名如 08081154yt0o.jpg，整理版已语义化重命名）

整理版本：v1.0 · 2026-08-18
