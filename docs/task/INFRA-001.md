# INFRA-001 搭建 Monorepo 脚手架与 pnpm workspaces

- **status**: pending
- **priority**: P0
- **owner**: (未分配)
- **createdAt**: 2026-03-16 17:30

## 描述

初始化 monorepo 项目结构，配置 pnpm workspaces。创建 `apps/web` 和 `packages/{ui, matrix-client, types, config}` 五个包，设置包间依赖关系。

验收标准：
- pnpm-workspace.yaml 配置完成
- 所有 5 个包的 package.json 创建，内部依赖声明正确
- `pnpm install` 成功，依赖方向 `config ← types ← matrix-client / ui ← web`
- 每个包有空的 src/index.ts 入口

## 进行时描述

正在搭建 Monorepo 脚手架

## 依赖

- **blocked by**: （无）
- **blocks**: INFRA-002, INFRA-003, FEAT-003, 所有后续任务

## 笔记

- 参考 PLAN-001 第 3 节 Monorepo 结构
