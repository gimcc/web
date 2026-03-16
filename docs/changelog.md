# 变更日志

## 2026-03-16 17:30 [progress]

根据 PLAN-001 生成完整任务列表。共 22 个任务（INFRA-001~003 + FEAT-002~021），按 6 个实施阶段分组。阶段 1（P0）：脚手架、工具链、Storybook、Mock；阶段 2（P1）：认证、sync 桥接、隐藏 Server Name；阶段 3（P1）：房间列表、时间线、消息收发、多媒体、命令、粘贴板；阶段 4/4.5（P1）：E2EE、锁屏、胁迫密码；阶段 5（P2）：表情、线程、语音、输入指示器；阶段 6（P2）：PWA、推送。

## 2026-03-16 17:00 [progress]

FEAT-003 服务器列表配置与 Mock 开发系统规划。config.json `defaultHomeserver` 重构为结构化 `homeservers`（服务器列表、默认服务器、allowCustom、showSelector）。PLAN-001 新增第 10 节「Mock 开发系统」（MockMatrixClient + Storybook），阶段 1 加入 mock 基础设施。新增 `mockMode` 配置。更新 modules/web、matrix-client、types 文档。

## 2026-03-16 16:30 [progress]

FEAT-002 隐藏 Server Name 功能规划。PLAN-001 新增第 9 节「用户 ID 显示与输入简化」，config.json 新增 `hideServerName` 配置项。更新 modules/web、matrix-client、types、ui 文档。设计覆盖显示简化（本 homeserver 用户省略 server name）和输入简化（邀请/搜索/@mention 自动补全）。

## 2026-03-16 16:00 [decision]

PLAN-001 重构为正式实施文档。整合 13 轮反馈迭代，移除所有批注和废弃内容，产出干净的 13 章节实施方案。同步更新 architecture.md 和所有模块文档。

核心确认：React 19.2 + matrix-js-sdk 41.1 + Vite 8 + TypeScript 5.9 strict + Zustand 5.0 + TanStack Query 5.90 + shadcn/ui (Base UI 1.3) + Tailwind CSS 4.2 + ESLint 10 (@antfu/eslint-config 7.7) + React Router 7 双模式。

安全特性：两层密钥架构（DEK + KEK）、锁屏密码、胁迫密码。
消息系统：文本/图片/视频/文件（阶段 3），语音（阶段 5），命令系统，粘贴板图片。

## 2026-03-16 15:00 [progress]

生成模块文档：apps/web、packages/ui、packages/matrix-client、packages/types、packages/config。更新架构文档，含模块依赖关系和数据流图。所有文档切换为中文。

## 2026-03-16 14:30 [progress]

PMA 项目结构初始化：CLAUDE.md、AGENTS.md、docs/task/、docs/plan/、architecture.md、changelog.md。完成技术栈调研，PLAN-001 草稿创建。
