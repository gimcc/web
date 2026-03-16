# INFRA-003 配置 Storybook 组件开发环境

- **status**: superseded
- **priority**: P1
- **owner**: (未分配)
- **createdAt**: 2026-03-16 17:30

## 描述

在 packages/ui 中配置 Storybook，支持 Tailwind CSS 4.2 和 Base UI 组件的独立预览。为后续 chat 组件开发提供可视化调试环境。

验收标准：
- Storybook 启动成功，支持热更新
- Tailwind CSS 样式正常渲染
- 至少一个示例 story（如 Button）可正常预览
- 支持亮色/暗色主题切换预览

## 进行时描述

正在配置 Storybook 组件开发环境

## 依赖

- **blocked by**: INFRA-001, INFRA-002
- **blocks**: （无，但加速 UI 开发）

## 笔记

- 参考 PLAN-001 第 10.6 节
- **已废弃**：packages/ui 已移除，UI 组件直接在 apps/web 中管理，Storybook 配置待按需重新引入
