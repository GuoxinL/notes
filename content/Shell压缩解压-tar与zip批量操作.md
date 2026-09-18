---
title: Shell压缩解压-tar与zip批量操作
date: 2026-08-19
tags: [Shell, tar, zip, 压缩, 解压]
description: Shell 压缩解压速查：用 ls *.tar.gz | xargs -n1 tar xzvf 批量解压，并整理 tar 的 czvf/cjvf/xzvf 与 zip、unzip 常用命令及指定目录解压。
---


来源：个人笔记整理版（原文仅批量解压一行，以下为结构化扩展）

### 一、批量解压缩

```bash
ls *.tar.gz | xargs -n1 tar xzvf
```

- ls *.tar.gz：列出当前目录所有 .tar.gz 文件
- xargs -n1：每次传 1 个文件名给 tar
- tar xzvf：解压（x 解包、z gzip、v 显示、f 指定文件）



适用于目录下有多个 tar.gz 包需逐个解压的场景。

### 二、tar 常用命令速查（补充）

#### 压缩

```bash
# 打包 + gzip 压缩
tar czvf archive.tar.gz /path/to/dir

# 打包 + bzip2 压缩（体积更小，更慢）
tar cjvf archive.tar.bz2 /path/to/dir

# 仅打包不压缩
tar cvf archive.tar /path/to/dir
```

#### 解压

```bash
# 解压 .tar.gz
tar xzvf archive.tar.gz

# 解压 .tar.bz2
tar xjvf archive.tar.bz2

# 解压 .tar（自动识别格式）
tar xvf archive.tar

# 解压到指定目录
tar xzvf archive.tar.gz -C /target/dir
```

#### 查看不解压

```bash
tar tzvf archive.tar.gz
```

### 三、zip 常用命令速查（补充）

```bash
# 压缩
zip -r archive.zip /path/to/dir

# 解压
unzip archive.zip

# 解压到指定目录
unzip archive.zip -d /target/dir

# 查看内容
unzip -l archive.zip
```

### 四、批量解压完整示例（补充）

```bash
# 批量解压所有 .tar.gz
for f in *.tar.gz; do tar xzvf "$f"; done

# 批量解压所有 .zip
for f in *.zip; do unzip -o "$f"; done
```



⚠️ -o 覆盖已存在文件；脚本中使用 "$f" 引号防止文件名含空格出错。

整理版本：v1.0 · 2026-08-19
