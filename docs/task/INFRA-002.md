# INFRA-002 配置开发工具链

- **status**: pending
- **priority**: P0
- **owner**: (未分配)
- **createdAt**: 2026-03-16 17:30

## 描述

配置 TypeScript 5.9 strict、ESLint 10 + @antfu/eslint-config 7.7、Vite 8 构建。设置共享 tsconfig、eslint config 和 vitest config 在 packages/config 中。

验收标准：
- TypeScript strict 模式编译通过
- ESLint 检查通过（@antfu/eslint-config + @stylistic）
- Vite dev server 启动成功
- `pnpm lint` 和 `pnpm typecheck` 脚本可用
- packages/config 导出共享配置

## 进行时描述

正在配置开发工具链

## 依赖

- **blocked by**: INFRA-001
- **blocks**: INFRA-003, FEAT-003

## 笔记

- 参考 PLAN-001 第 2.1 节核心选型和第 2.4 节测试
- @antfu/eslint-config 替代 Prettier（@stylistic 格式化）
