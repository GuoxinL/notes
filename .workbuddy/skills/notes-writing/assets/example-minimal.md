---
title: 一句话文章标题
date: 2026-09-15
description: 一句话摘要，显示在列表卡片上。
tags: [标签1, 标签2]
---

## 问题 / 背景

用两三句话说清这篇文章要解决什么。别铺垫，直接给结论或问题。

## 做法

正文分小节写，每节一个 `##`；需要再分层就用 `###`（**不要用 `#`**）。

- 要点一
- 要点二
- [ ] 待补的内容

> [!tip] 提示
> 有坑就写成 Callout，六种类型：note / tip / info / warning / danger / quote。

```bash
# 有命令就给命令，别只描述
npm run build && npm run validate
```

## 关联

另见 [[相关文章标题]]；要展开的部分也可以直接嵌入：![[相关文章标题]]

---

_提交前：`npm run build && npm run validate` 全绿，commit message 写人话（会进「更新历史」）。_
