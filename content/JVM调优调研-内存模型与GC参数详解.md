---
title: JVM调优调研-内存模型与GC参数详解
date: 2026-08-18
tags: [JVM, Java, 调优, 内存模型, GC]
description: 本文调研 JVM 调优，涵盖 Java 8 内存模型（堆、Metaspace、线程私有区）、四类垃圾收集器选型，以及堆内存、元空间与 GC 日志等关键参数。
---

整理来源：JVM调优调研.md
主题：JVM 内存模型（Java 8） + 垃圾收集器选型 + 关键运行参数详解

### 一、JVM 内存模型（Java 8）

配图内容描述：JVM 运行时数据区分为「线程共享区」和「线程私有区」两大块。

线程共享区（所有线程共用）：

|||
|---|---|
|Heap（堆）|存放对象实例与数组，GC 主战场；可按 -Xms/-Xmx 调整|
|Metaspace（元空间）|Java 8 替代 PermGen，存放类元数据；本地内存（Native memory）|
|└ Compressed Class Space（类压缩空间）|64 位下压缩指针存放类元数据，受 -XX:CompressedClassSpaceSize 限制|
|Runtime Constant Pool（运行时常量池）|每个类一份，存放编译期生成的字面量与符号引用|
|代码缓存区（Code Cache）|JIT 编译后的本地代码，JVM 内部使用，受 -XX:ReservedCodeCacheSize 影响|


线程私有区（每个线程一份）：

|||
|---|---|
|VM Stack（虚拟机栈）|由 Stack Frame 组成，每个方法对应一个 Frame；Frame 含：①局部变量表（基本数据类型 + 对象引用）②操作数栈 ③方法出口 ④动态链接|
|Native Method Stack（本地方法栈）|为 Native 方法服务|
|Program Counter Register（程序计数器）|记录当前线程执行的字节码行号；Native 方法时为 undefined|


### 二、JVM 垃圾收集器选型

Java 8 中比较主流的 GC 算法有 Parallel GC、CMS、G1 三种（Serial 一般仅用于客户端或单核场景）。

#### 2.1 Serial（串行）收集器

- 类型：bool
- 声明方式：-XX:[+/-]UseSerialGC
- 说明：在 JDK 1.3.1 之前是唯一选择。单线程收集，GC 时必须 Stop-The-World（暂停所有工作线程）。简单高效，适合单 CPU 或客户端小应用。
#### 2.2 Parallel（并行）收集器

- 类型：bool
- 声明方式：-XX:[+/-]UseParallelGC、-XX:[+/-]UseParallelOldGC
- 说明：又称「吞吐量收集器」。使用多线程完成垃圾清理，能充分利用多核大幅降低 GC 时间。是 Java 8 的默认 GC。
#### 2.3 CMS（并发）收集器

- 类型：bool
- 声明方式：-XX:[+/-]UseParNewGC、-XX:[+/-]UseConcMarkSweepGC
- 说明：以「最短停顿时间」为目标。Minor GC 时暂停所有应用线程，多线程回收；Full GC 时用若干后台线程并发扫描老年代，不再整体暂停应用线程。JDK 9 起已标记废弃，JDK 14 移除。
#### 2.4 G1（并发）收集器

- 类型：bool
- 声明方式：-XX:[+/-]UseG1GC
- 说明：设计初衷是处理超大堆（>4GB），将堆划分为多个 Region 优先回收垃圾最多的区域。相对 CMS 的优势是内存碎片率显著降低，停顿时间可预测（-XX:MaxGCPauseMillis 控制目标）。
#### 2.5 选型总结

|||
|---|---|
|Java 8 默认|Parallel GC（吞吐量优先）|
|大堆（>4GB）、低延迟要求|切到 G1|
|一般不推荐自行换 GC|遇到问题再按场景定制|


### 三、JVM 参数详解

#### 3.1 堆内存相关参数

配图内容描述：堆由「Young Generation + Old Generation」组成，两端各有一段 reserved 保留区。

Young Generation（新生代）= eden + 2 个 Survivor（from / to），整体大小受 -XX:NewSize（初始） / -XX:MaxNewSize（最大，缩写 -Xmn）控制。

Old Generation（老年代）= tenured（对象晋升区），加上两端的 reserved 区。

整体堆范围受 -Xms（初始堆） / -Xmx（最大堆）控制。

|||||
|---|---|---|---|
|Initial heap size|int [K/M/G]|-Xms（或 -XX:InitialHeapSize）|初始堆大小，默认物理内存的 1/64|
|Maximum heap size|int [K/M/G]|-Xmx（或 -XX:MaxHeapSize）|最大堆大小，默认物理内存的 1/4|
|Maximum new generation size|int [K/M/G]|-Xmn（或 -XX:MaxNewSize）|新生代最大大小；G1 GC 下建议不设此参数|
|Initial new generation size|int [K/M/G]|-XX:NewSize|新生代初始大小|
|New generation ratio|int|-XX:NewRatio|新生代 : 老年代 = 1 : N，默认 2。例：-XX:NewRatio=4 表示新生代占 1/5、老年代占 4/5|
|Survivor ratio|int|-XX:SurvivorRatio|2 个 Survivor : Eden = 2 : N，默认 8。例：-XX:SurvivorRatio=8 表示每个 Survivor 占新生代的 1/10|


#### 3.2 其他内存相关参数

|||||
|---|---|---|---|
|Thread Stack Size|[K/M/G]|-Xss（或 -XX:ThreadStackSize）|每线程栈大小，默认 1M。一般用不到 1M，建议设为 256K（按应用线程所需内存调整），可生成更多线程|
|Initial metaspace size|int [K/M/G]|-XX:MetaspaceSize|元空间初始大小，控制 Metaspace 触发 GC 的阈值；GC 后动态调整，默认在 12M ~ 20M 间浮动|
|Maximum metaspace size|int [K/M/G]|-XX:MaxMetaspaceSize|限制元空间增长上限，防止意外吃光本地内存影响其他程序（强烈建议设置）|
|Minimum metaspace free ratio|int|-XX:MinMetaspaceFreeRatio|Metaspace GC 后空闲比小于此值时扩容，默认 40|
|Maximum metaspace free ratio|int|-XX:MaxMetaspaceFreeRatio|Metaspace GC 后空闲比大于此值时释放，默认 70|


#### 3.3 日志相关参数

|||||
|---|---|---|---|
|GC Log path|strings|-Xloggc:/path/to/gc.log|GC 日志输出目录；支持相对/绝对路径|
|Print GC date stamps|bool|-XX:[+/-]PrintGCDateStamps|输出 GC 时间戳（日期格式，如 2019-05-15T11:11:32.260+0800）|
|Print GC time stamps|bool|-XX:[+/-]PrintGCTimeStamps|输出 GC 时间戳（相对 JVM 启动的秒数）|
|Print GC details|bool|-XX:[+/-]PrintGCDetails|打印详细 GC 日志，建议开启，线上影响很小|
|HeapDumpOnOutOfMemoryError|bool|-XX:[+/-]HeapDumpOnOutOfMemoryError|OOM 时自动 dump 堆到文件，便于事后分析；可通过 jinfo -flag HeapDumpOnOutOfMemoryError=<value> <pid> 动态设置|


#### 3.4 查看 JVM 默认参数

```bash
java -XX:+PrintFlagsFinal -version
```



该命令会输出 JVM 所有可调参数及其当前默认值（= 前为类型，:= 表示已被 JVM 或命令行修改过）。

### 四、关键调优实践建议

- 堆大小：-Xms 与 -Xmx 设为相同值，避免堆动态扩缩产生的性能波动
- 元空间：必须显式设置 -XX:MaxMetaspaceSize，避免本地内存被吃光
- 线程栈：根据线程数和内存总量反推，单线程 256K 起步
- GC 日志：生产环境务必开启 -Xloggc + -XX:+PrintGCDetails + -XX:+PrintGCDateStamps，便于事后分析
- 大堆场景：堆 > 4GB 优先考虑 G1；Java 11+ 可考虑 ZGC（停顿 < 10ms）
- GC 选择：Java 8 默认 Parallel 即可，不要为追求新而换 GC，遇到瓶颈再针对性调优
### 五、参考文献

- Java Platform, Standard Edition HotSpot Virtual Machine Garbage Collection Tuning Guide
- xxfox — JVM 参数在线查询
- Java 虚拟机运行时栈帧结构 — 深入理解 Java 虚拟机 学习笔记
- JDK8 垃圾收集器 — GoogleKitty
- Java 8 最快的垃圾收集器是什么？
- JVM 调优总结 — 李克华
- PermGen Elimination project is promoting
- Java 8: From PermGen to Metaspace
- Sizing the Generations — ORACLE DOC
- Other Considerations — ORACLE DOC
- Automatic Memory Management — Poonam Parhar

整理版本：v1.0 · 2026-08-18
