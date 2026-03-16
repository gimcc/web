# 任务格式参考

本文档定义 `docs/task/` 目录的任务管理格式，包括 ID 规则和模板。

## 目录结构

```text
docs/task/
├── index.md          # 任务索引（每个任务一行）
└── PREFIX-NNN.md     # 任务详情文件（每个任务一个）
```

## 索引条目格式

`index.md` 中每个任务为单行链接，无子字段。

```markdown
- [ ] [**PREFIX-001 简短祈使句标题**](PREFIX-001.md) `P1`
```

所有详细信息写在对应的详情文件中。`index.md` 中不得包含描述、负责人或其他子字段。

## 详情文件格式

添加新任务行到 `index.md` 时，同时原子性创建详情文件。

```markdown
# PREFIX-001 简短祈使句标题

- **status**: pending
- **priority**: P1
- **owner**: (未分配)
- **createdAt**: YYYY-MM-DD HH:mm

## 描述

需要做什么，包含上下文和验收标准。

## 进行时描述

进行中的现在进行时描述（用于 spinner 显示）。

## 依赖

- **blocked by**: (无)
- **blocks**: (无)

## 笔记

（实现笔记、进度日志或相关链接。）
```

### 详情文件更新规则

- 允许的 `status` 值：`pending`、`in_progress`、`completed`、`closed`
- 认领：将 `status` 设为 `in_progress` 并设置 `owner`
- 完成：将 `status` 设为 `completed`，按需添加完成笔记
- 关闭：将 `status` 设为 `closed`，添加原因
- 进行中：在笔记区追加进度笔记

## 任务 ID 规则

- 格式：`PREFIX-NNN`（大写类别前缀 + 连字符 + 零填充 3 位序号）
- 前缀是简短的类别缩写，例如：`AUTH`、`UI`、`API`、`BUG`、`PERF`、`FEAT`、`REFACTOR`
- 序号按前缀独立编号，从 `001` 开始
- 一旦分配，不得复用或重新编号
- 每个 ID 对应唯一文件：`docs/task/PREFIX-NNN.md`

## 状态标记

| 标记 | 含义 | TaskUpdate status |
|------|------|-------------------|
| `[ ]` | 待办 | `pending` |
| `[-]` | 进行中 | `in_progress` |
| `[x]` | 已完成 | `completed` |
| `[~]` | 关闭/不做 | `deleted` |

## 优先级

| 标签 | 含义 |
|------|------|
| `P0` | 阻塞问题，立即处理 |
| `P1` | 高优先级，当前迭代 |
| `P2` | 中优先级，下次迭代 |
| `P3` | 低优先级，待规划 |

## 更新规则

- **`index.md`**：仅更新复选框标记（例如 `[ ]` -> `[x]`）。禁止删除任务行。
- **详情文件**：就地更新 status、owner 和笔记。禁止删除已有字段。
- 新任务追加到 `index.md` 末尾。
- 任务 ID 是永久的。
