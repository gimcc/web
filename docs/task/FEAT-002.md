# FEAT-002 添加隐藏 Server Name 功能

- **status**: pending
- **priority**: P1
- **owner**: claude-agent
- **createdAt**: 2026-03-16 16:30

## 描述

在 UI 显示和用户输入两端支持隐藏 Matrix 用户 ID 中的 server name 部分。当 `hideServerName` 配置为 `true` 时，当前 homeserver 的用户 ID（如 `@aa:gg.im`）在 UI 中简化显示为 `@aa`；用户在邀请、搜索、@mention 等输入场景中也可省略 `:servername`，系统自动补全。

验收标准：
- PLAN-001 新增相关章节
- config.json 文档新增 `hideServerName` 配置项
- 各模块文档更新显示/输入简化规则
- 外部服务器用户始终显示完整 ID

## 进行时描述

正在更新规划文档，添加隐藏 Server Name 功能设计

## 依赖

- **blocked by**: FEAT-001（已完成）
- **blocks**: 阶段 2/3 实现

## 笔记

- 仅规划文档更新，不涉及代码实现
- 显示简化 + 输入简化双向设计
