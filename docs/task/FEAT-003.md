# FEAT-003 服务器列表配置与 Mock 开发系统

- **status**: pending
- **priority**: P1
- **owner**: claude-agent
- **createdAt**: 2026-03-16 17:00

## 描述

1. 重构 config.json 服务器配置：支持预置服务器列表、默认服务器、是否允许自定义服务器、是否显示服务器切换 UI。
2. 设计 Mock 开发系统：Mock Provider 层 + Storybook，让前端在无真实 Matrix 服务器的情况下快速开发和调试 UI。

验收标准：
- PLAN-001 config.json 从 `defaultHomeserver` 重构为 `homeservers` 结构化配置
- PLAN-001 新增 Mock 系统章节
- 各模块文档同步更新
- 实施阶段表更新（阶段 1 加入 mock）

## 进行时描述

正在更新规划文档，添加服务器列表配置和 Mock 系统设计

## 依赖

- **blocked by**: FEAT-001（已完成）
- **blocks**: 阶段 1/2 实现

## 笔记

- 仅规划文档更新，不涉及代码实现
- 服务器配置与 hideServerName 联动
- Mock 系统采用 Mock Provider + Storybook 组合方案
