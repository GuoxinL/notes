---
title: 红黑树-原理与Go实现
date: 2026-08-18
tags: [红黑树, Red-Black Tree, 数据结构, 自平衡, Go]
description: 红黑树（Red Black Tree）是一种自平衡二叉查找树，常用于实现关联数组（如 std::map），其查找、插入、删除时间复杂度均为 O(log n)。
---

整理来源：红黑树.md
主题：红黑树（Red-Black Tree）的定义、5 条性质、配图解读、平衡原理与 Go 语言实现

### 一、简介

红黑树（Red Black Tree）是一种自平衡二叉查找树，在计算机科学中用于实现关联数组（如 std::map / TreeMap）。

- 起源：1972 年由 Rudolf Bayer 发明，最初称「平衡二叉 B 树（symmetric binary B-trees）」；1978 年由 Leo J. Guibas 和 Robert Sedgewick 修改为现今的「红黑树」。
- 与 AVL 关系：红黑树是 AVL 树（严格平衡二叉树）的特化 —— 通过在插入/删除时做特定旋转和着色保持平衡。
- 复杂度：查找、插入、删除最坏时间均为 O(log n)（n = 节点数），是实践中高效的平衡树方案。
### 二、5 条性质

||||
|---|---|---|
|1|节点颜色|节点是红色或黑色|
|2|根节点|根节点是黑色|
|3|叶子|所有叶子（NIL 节点）都是黑色|
|4|红色节点的子节点|每个红色节点的两个子节点都是黑色（从任一叶子到根的路径上不能有两个连续的红色节点）|
|5|黑色高度|从任一节点到其每个叶子的所有路径包含相同数目的黑色节点|


关键推论：

- 由性质 4 + 5 可得：从根到叶子的最长可能路径 ≤ 最短可能路径的 2 倍
- 最短路径：全黑节点；最长路径：红黑交替
- 树大致平衡 → 查找/插入/删除的高度上限可控 → 最坏情况也高效


红黑树的只读操作（查找）与普通二叉查找树完全相同；插入和删除需要额外的旋转 + 着色来恢复性质。

### 三、配图与图解

图内容文字描述（节点 = 值(颜色)，NIL 视为黑色叶子）：

```
                13(B)
              /       \
           8(R)       17(R)
          /   \       /    \
        1(B) 11(B) 15(B)  25(B)
              /              \
           6(R)             22(R)
                              \
                             27(R)
```

层级与性质验证：

|||
|---|---|
|13 → 8 → 1 → NIL|3|
|13 → 8 → 1 → NIL|3|
|13 → 8 → 11 → NIL|3|
|13 → 8 → 11 → 6 → NIL|3|
|13 → 17 → 15 → NIL|3|
|13 → 17 → 25 → NIL|3|
|13 → 17 → 25 → 22 → NIL|3|
|13 → 17 → 25 → 22 → 27 → NIL|3|


所有路径黑色高度一致 = 3 ✓

### 四、平衡原理

保持平衡的两类操作：

||||
|---|---|---|
|旋转（左旋 / 右旋）|改变局部结构，转移子树归属|插入/删除后父子链方向不满足红黑性质|
|着色 / 变色|改变节点颜色，满足性质 4、5|父与叔都为红 → 父叔变黑、祖父变红，向上递归修复|


经典修复分支（删除时最复杂）：

- Case 1（兄弟为红）：父染红、兄染黑，旋转到兄弟侧 → 转 Case 4/5/6
- Case 2/3（父黑、兄黑、子全黑）：兄染红，修复点上移（黑高减一向上传递）
- Case 4（父红、兄黑、兄子全黑）：父染黑、兄染红，结束
- Case 5（兄黑、远侄红）：转为 Case 6
- Case 6（兄黑、远侄红）：旋转 + 重新染色，一轮结束


推荐阅读：红黑树是如何保持平衡的 — zzt-lovelinlin

### 五、Go 实现

以下实现转载自 freedbg — CSDN 博客，并修复了原文中两处 b.br() typo（应为 n.br()），保证代码可编译。整体结构如下：

|||
|---|---|
|node.l / r / p|左 / 右 / 父指针|
|node.v|节点值|
|node.c|颜色（false = 红，true = 黑）|
|Tree.root / last / size|树根、最近插入节点、节点数|
|rotateL / rotateR|左 / 右旋|
|Insert / insertB / inserCase|插入（BST 插入 + 插入后修复）|
|tdelete / deleteR / fix2|删除（替换为前驱/后继 + 删除后修复）|
|printT / printTree|控制台按层打印（带颜色）|


```go
package main

import "fmt"

var data = []int{6, 5, 3, 1, 8, 7, 2, 4, 9, 0, 3}

func main() {
	fmt.Println("red-black-tree")
	tree := NewTree()
	for _, v := range data {
		tree.insertB(v)
	}
	tree.tdelete(tree.root, 2)
	printT(tree.root)
}

type node struct {
	l, r, p *node
	v       int
	c       bool // false = red, true = black
}

type Tree struct {
	root *node
	last *node
	size int
}

func NewTree() *Tree { return &Tree{} }

// ===== 辅助：祖父 / 叔父 / 兄弟 =====

func (n *node) getGp() *node {
	if n.p == nil {
		return nil
	}
	if n.p.p == nil {
		return nil
	}
	return n.p.p
}

func (n *node) getUn() *node {
	if n.getGp() == nil {
		return nil
	}
	if n.p == n.getGp().l {
		return n.getGp().r
	}
	return n.getGp().l
}

func (n *node) br() *node {
	if n.p.l == n {
		return n.r
	}
	return n.l
}

// ===== 旋转 =====

func (tree *Tree) rotateR(n *node) {
	gp := n.getGp()
	p := n.p
	r := n.r

	n.r = p
	n.p = gp

	if p != nil {
		p.p = n
		p.l = r
		if r != nil {
			r.p = p
		}
	}
	if tree.root == p {
		tree.root = n
	}
	if gp != nil {
		if gp.l == p {
			gp.l = n
		} else {
			gp.r = n
		}
	}
}

func (tree *Tree) rotateL(n *node) {
	gp := n.getGp()
	p := n.p
	l := n.l

	n.l = p
	n.p = gp

	if p != nil {
		p.p = n
		p.r = l
		if l != nil {
			l.p = p
		}
	}
	if tree.root == p {
		tree.root = n
	}
	if gp != nil {
		if gp.l == p {
			gp.l = n
		} else {
			gp.r = n
		}
	}
}

// ===== 插入 =====

func (tree *Tree) insertB(v int) {
	if tree.root == nil {
		tree.root = &node{v: v, c: true}
		tree.size++
		return
	}

	if v < tree.root.v {
		if tree.Insert(&tree.root.l, v, tree.root) {
			tree.size++
			tree.inserCase(tree.last)
		}
	}
	if v > tree.root.v {
		if tree.Insert(&tree.root.r, v, tree.root) {
			tree.size++
			tree.inserCase(tree.last)
		}
	}
	printT(tree.root)
}

func (tree *Tree) Insert(n **node, v int, fa *node) bool {
	pn := *n
	if pn == nil {
		*n = &node{v: v, p: fa}
		tree.last = *n
		return true
	}
	if v > pn.v {
		return tree.Insert(&pn.r, v, pn)
	}
	if v < pn.v {
		return tree.Insert(&pn.l, v, pn)
	}
	return false // equal: not inserted
}

func (tree *Tree) inserCase(n *node) {
	if n.p == nil { // 根节点染黑
		n.c = true
		tree.root = n
		return
	}
	if n.p.c == false { // 父为红才需要修复
		if n.getUn() != nil && n.getUn().c == false {
			// 叔为红：父叔染黑，祖父染红，向上递归
			n.p.c = true
			n.getUn().c = true
			n.getGp().c = false
			tree.inserCase(n.getGp())
			return
		}
		// 叔为黑或 NIL：通过旋转 + 染色修复
		if n == n.p.r && n.p == n.getGp().l {
			tree.rotateL(n)
			tree.rotateR(n)
			n.c = true
			n.l.c, n.r.c = false, false
		} else if n == n.p.l && n.p == n.getGp().r {
			tree.rotateR(n)
			tree.rotateL(n)
			n.c = true
			n.l.c, n.r.c = false, false
		} else if n == n.p.l && n.p == n.getGp().l {
			n.p.c = true
			n.getGp().c = false
			tree.rotateR(n.p)
		} else if n == n.p.r && n.p == n.getGp().r {
			n.p.c = true
			n.getGp().c = false
			tree.rotateL(n.p)
		}
	}
}

// ===== 删除 =====

func (tree *Tree) tdelete(n *node, v int) {
	if n == nil {
		return
	}
	if v < n.v {
		tree.tdelete(n.l, v)
		return
	}
	if v > n.v {
		tree.tdelete(n.r, v)
		return
	}
	// v == n.v
	if n.l != nil && n.r != nil {
		mn := tree.findMax(n.l) // 左子树最大节点作为替换
		n.v = mn.v
		if tree.deleteR(mn) {
			tree.size--
		}
		return
	}
	if tree.deleteR(n) {
		tree.size--
	}
}

func (tree *Tree) findMax(n *node) *node {
	for n.r != nil {
		n = n.r
	}
	return n
}

func (tree *Tree) deleteR(n *node) bool {
	red, black := false, true

	// case 1: 删除的是根（无父 + 无子）
	if n.l == nil && n.r == nil && n.p == nil {
		tree.root = nil
		return true
	}

	var child *node
	if n.l != nil {
		child = n.l
	} else {
		child = n.r
	}

	// case 2: 删除后 child 升为新根
	if n.p == nil {
		child.p = nil
		tree.root = child
		child.c = black
		return true
	}

	if n.p.l == n {
		n.p.l = child
	} else {
		n.p.r = child
	}
	if child != nil {
		child.p = n.p
	}

	// 删除黑色节点才需要修复（少了一个黑高）
	if n.c == black {
		if child != nil && child.c == red {
			child.c = black // case: 红孩子顶替黑色被删节点
		} else {
			tree.fix2(n) // n 作为「双重黑」位置继续修复
		}
	}
	_ = red
	return true
}

// n 作为「双重黑」位置（黑高不平衡）的修复
func (tree *Tree) fix2(n *node) {
	black := true

	// case 1: 已到根
	if n.p == nil {
		n.c = black
		return
	}

	// case 2: 兄弟为红（旋转后转为 case 4/5/6）
	if n.br().c == false && n.p.c == black {
		n.p.c = false
		n.br().c = black
		if n == n.p.l {
			tree.rotateL(n.br())
		} else {
			tree.rotateR(n.br())
		}
	}

	// case 3: 父黑 + 兄黑 + 兄子全黑（黑高上移）
	if n.p.c == black && n.br().c == black && n.br().l == nil && n.br().r == nil {
		n.br().c = false
		tree.fix2(n.p)
		return
	}

	// case 4: 父红 + 兄黑 + 兄子全黑
	if n.p.c == false && n.br().c == black && n.br().l == nil && n.br().r == nil {
		n.p.c = black
		n.br().c = false
		return
	}

	// case 5: 兄黑 + 「近侄」红（先转成 case 6）
	if n.br().c == black {
		if n.br().l != nil && n.br().r == nil && n == n.p.l {
			n.br().c = false
			n.br().l.c = black
			tree.rotateR(n.br().l)
		} else if n.br().r != nil && n.br().l == nil && n == n.p.r {
			n.br().c = false
			n.br().r.c = black
			tree.rotateL(n.br().r)
		}
	}

	// case 6: 兄黑 + 「远侄」红（一轮修复结束）
	if n.br().c == black && n.br().r != nil && n == n.p.l {
		n.br().c = n.p.c
		tree.rotateL(n.br())
		n.p.c = black
		n.getGp().r.c = black
		return
	}
	if n.br().c == black && n.br().l != nil && n == n.p.r {
		n.br().c = n.p.c
		tree.rotateR(n.br())
		n.p.c = black
		n.getGp().l.c = black
		return
	}
}

// ===== 打印（按层） =====

var fstr = make([]string, 8, 8)

func printT(tree *node) {
	if tree == nil {
		return
	}
	fstr = make([]string, 8, 8)
	printTree(tree, 0, "")
	for i, s := range fstr {
		fmt.Println("L", i, s)
	}
}

func printTree(tree *node, i int, n string) {
	i++
	str := " "
	for k := i; k < 9; k++ {
		str += "-"
	}
	color := "\033[41;37m" // 红底白字
	if tree.c {
		color = "\033[40;37m" // 黑底白字
	}
	tmp := fmt.Sprintf("%s [%d] %s%s%s", str, tree.v, color, n, "\033[0m")
	fstr[i] += tmp
	if tree.l != nil {
		printTree(tree.l, i, "L"+itoa(tree.v))
	}
	if tree.r != nil {
		printTree(tree.r, i, "R"+itoa(tree.v))
	}
}

func itoa(v int) string {
	return fmt.Sprintf("%d", v)
}
```



整理说明：原文 fix2 中 b.br() / b 为未定义变量 typo，已修正为 n.br()；getMin/getMax 空函数与 inserCase 末尾冗余赋值已清理；其余旋转/修复逻辑保持原文思路。

### 六、复杂度与对比

||||
|---|---|---|
|查找|O(log n)|O(log n)|
|插入|O(log n)|O(log n)|
|删除|O(log n)|O(log n)|
|旋转次数（插入/删除）|≤ 2 / ≤ 3|较多|
|平衡严格度|大致平衡（黑高约束）|严格平衡（|h| ≤ 1）|
|适用场景|通用关联容器（Java TreeMap、C++ std::map、Linux CFS）|读多写少、对查询延迟极敏感|


选择建议：

- 读写都多：选红黑树（综合性能更稳定，旋转少）
- 查询极多、插入删除少：选 AVL 树（更严格的平衡 → 更短的查找路径）
### 七、参考文献

- 计算机 — 百度百科
- 关联数组 — 百度百科
- 红黑树 — 百度百科（性质与约束来源）
- 红黑树是如何保持平衡的 — zzt-lovelinlin
- 二叉查找树 / AVL / 红黑树 Go 实现 — freedbg
- 平衡二叉树 — 百度百科
- Rudolf Bayer — 百度百科

整理版本：v1.0 · 2026-08-18
