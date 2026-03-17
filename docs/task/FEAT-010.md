# FEAT-010 实现命令系统

- **status**: done
- **priority**: P1
- **owner**: claude-agent
- **createdAt**: 2026-03-16 17:30

## 描述

实现消息输入框的 `/` 命令系统，注册表模式可扩展。输入 `/` 触发命令面板自动补全。

验收标准：
- `/` 触发命令面板（自动补全列表）
- 阶段 3 命令：/me, /nick, /topic, /invite, /kick, /ban, /join, /leave, /plain
- 命令接口：`{ name, description, args, execute }`
- 命令参数中的用户 ID 支持简化输入（resolveUserId 自动补全）
- 未知命令友好提示

## 进行时描述

正在实现命令系统

## 依赖

- **blocked by**: FEAT-008
- **blocks**: （无）

## 笔记

- 参考 PLAN-001 第 8.1 节命令系统
- 阶段 5 扩展命令：/spoiler, /html
