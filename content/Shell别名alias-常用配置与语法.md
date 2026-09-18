---
title: Shell别名alias-常用配置与语法
date: 2026-08-19
tags: [Shell, alias, 别名, bash, 终端]
description: 本文整理 Shell 中 alias 别名的常用配置与语法速查，包含 ll、tailf 等别名示例、定义与删除别名的命令、永久生效写法及使用注意事项。
---

来源：个人笔记整理版（原文仅两条别名配置，以下为结构化整理）

### 常用别名配置

```bash
alias ll='ls -l'
alias tailf='tail -f'
```

- ll → ls -l：以长格式列出文件
- tailf → tail -f：持续跟踪文件尾部输出（实时查看日志）
### alias 语法速查（补充）

```bash
# 定义别名（临时生效，仅当前 shell）
alias 名称='命令'

# 查看所有别名
alias

# 查看指定别名
alias ll

# 删除别名
unalias ll

# 永久生效：写入 ~/.bashrc（或 ~/.zshrc）
echo "alias ll='ls -l'" >> ~/.bashrc
source ~/.bashrc
```

### 推荐的高频别名（补充）

```bash
alias ls='ls --color=auto'
alias ll='ls -alF'
alias la='ls -A'
alias grep='grep --color=auto'
alias rm='rm -i'          # 删除前确认，防止误删
alias cp='cp -i'
alias mv='mv -i'
```

### 注意事项（补充）

- 优先级：命令别名 > 内部命令 > PATH 中的外部命令；可用 \alias名 或 command 别名 临时绕过别名
- 引号：别名定义用单引号，避免 $ 变量被立即展开
- 不继承：非交互式 shell（脚本）默认不加载 alias，脚本中请直接写全命令

整理版本：v1.0 · 2026-08-19
