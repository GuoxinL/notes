---
title: Shell多分支case语句-语法与示例
date: 2026-08-19
tags: [Shell, case, 条件判断, 多分支, bash]
description: 介绍 Shell case in 多分支语句的语法结构、与多分支 if 的区别，并结合 yes/no 选择与 uname 系统判断给出完整示例。
---

来源：C 语言中文网（c.biancheng.net/view/1003.html）整理版

### 一、case 与多分支 if 的区别

case 语句和 if...elif...else 一样都是多分支条件语句。区别在于：

- case：只能判断一种条件关系（变量值等于什么），适合"单条件多分支"
- if：可以判断多种条件关系（大于/小于/组合等）
### 二、case 语法结构

```bash
case $变量名 in
"值 1")
    如果变量的值等于值1，则执行程序1
    ;;
"值 2")
    如果变量的值等于值2，则执行程序2
    ;;
…省略其他分支…
*)
    如果变量的值都不是以上的值，则执行此程序
    ;;
esac
```

语法要点：

- 以 case 开头，以 esac 结尾（case 倒写）
- 每个分支以 ;;（双分号）结尾，代表该程序段结束——千万不要忘记
- *) 为兜底分支，匹配所有其他值
- case 会取出变量值逐一与各分支比较，符合则执行对应程序

### 三、完整示例：选择 yes/no

```bash
#!/bin/bash
# 判断用户输入
read -p "Please choose yes/no: " -t 30 cho
# 在屏幕上输出"请选择yes/no"，然后把用户选择赋予变量cho
case $cho in
# 判断变量cho的值
    "yes")
    # 如果是yes
        echo "Your choose is yes!"
        # 则执行程序1
        ;;
    "no")
    # 如果是no
        echo "Your choose is no!"
        # 则执行程序2
        ;;
    *)
    # 如果既不是yes,也不是no
    echo "Your choose is error!"
    # 则执行此程序
    ;;
esac
```

### 四、经典用法：uname 分支判断

```bash
os400=false
case "`uname`" in
OS400*) os400=true;;
esac
```



该写法常见于跨平台脚本：通过 uname 输出判断当前系统类型（如 AIX 的 OS400），进而选择不同的命令分支。

### 五、适用场景总结（补充）

|||
|---|---|
|菜单选择（yes/no、1/2/3）|✅ 非常适合|
|fdisk 等交互式命令输出解析|✅ 适合|
|判断数字大小/范围|❌ 用 if|
|多条件组合判断|❌ 用 if|


整理版本：v1.0 · 2026-08-19
