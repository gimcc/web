# Agents

## 项目开发

本项目使用 **PMA（项目管理助手）** 工作流管理所有开发任务。

### 工作流

使用 `/pma` 管理任务。所有工作遵循三阶段工作流：

1. **调查** - 追踪代码、搜索相关文件、阅读变更日志、认领任务
2. **提案** - 呈现现状、方案、风险、工作量、备选方案；等待审批
3. **实现** - 审批后实现，验证，记录完成

### 任务与方案追踪

- 任务: `docs/task/index.md` -> `docs/task/PREFIX-NNN.md`
- 方案: `docs/plan/index.md` -> `docs/plan/PLAN-NNN.md`
- 变更日志: `docs/changelog.md`
- 架构: `docs/architecture.md`

### 认领工作（多 Agent 安全）

实现任何任务前，Agent 必须：
1. 阅读 `docs/task/index.md`，检查 `[-]` 项目
2. 如果其他 Agent 拥有进行中的任务，跳过
3. 原子性认领：更新索引 `[ ] -> [-]`，设置详情 `status -> in_progress` 和 `owner`
4. 仅在认领完全写入后开始实现
