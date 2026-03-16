# 方案格式参考

本文档定义 `docs/plan/` 目录的方案管理格式，包括 ID 规则和模板。

## 目录结构

```text
docs/plan/
├── index.md          # 方案索引（每个方案一行）
└── PLAN-NNN.md       # 方案详情文件（每个方案一个）
```

## 索引条目格式

`index.md` 中每个方案为单行链接，含创建日期，无子字段。

```markdown
- [ ] [**PLAN-001 简短方案标题**](PLAN-001.md) `YYYY-MM-DD`
```

所有详细信息写在对应的详情文件中。

## 详情文件格式

添加新方案行到 `index.md` 时，同时原子性创建详情文件。

```markdown
# PLAN-001 简短方案标题

- **status**: draft
- **createdAt**: YYYY-MM-DD HH:mm
- **approvedAt**: (待审批)
- **relatedTask**: PREFIX-NNN

## 现状

调查发现及现状：涉及哪些文件/模块，调用链，现有逻辑。

## 方案

具体改哪些文件、怎么改，含代码片段。

## 风险

副作用、可能的 Bug、是否需要迁移。

## 工作量

改动范围评估。

## 备选方案

（有多种方案时列出对比。）

## 批注

（用户批注和回复。保留所有历史记录。）
```

### 详情文件更新规则

- 允许的 `status` 值：`draft`、`implementing`、`completed`、`rejected`
- 批准：将 `status` 设为 `implementing`，将 `approvedAt` 设为当前时间戳
- 完成：将 `status` 设为 `completed`
- 否决：将 `status` 设为 `rejected`，在批注中添加原因
- 用户批注：追加到批注区，保留所有历史

## 方案 ID 规则

- 格式：`PLAN-NNN`（固定前缀 `PLAN` + 零填充 3 位序号）
- 序号从 `001` 开始，全局递增
- 一旦分配，不得复用或重新编号
- 每个 ID 对应唯一文件：`docs/plan/PLAN-NNN.md`

## 状态标记

| 标记 | 含义 | 详情文件 `status` |
|------|------|-------------------|
| `[ ]` | 草稿/待审批 | `draft` |
| `[-]` | 已批准/实现中 | `implementing` |
| `[x]` | 已完成 | `completed` |
| `[~]` | 否决/废弃 | `rejected` |

## 更新规则

- **`index.md`**：仅更新复选框标记（例如 `[ ]` -> `[-]`）。禁止删除方案行。
- **详情文件**：就地更新 status、approvedAt 和批注。禁止删除已有区段。
- 新方案追加到 `index.md` 末尾。
- 方案 ID 是永久的。
