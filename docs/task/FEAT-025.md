# FEAT-025 实现主题系统（自定义主题与主题包）

| 字段 | 值 |
|------|------|
| 状态 | 待办 |
| 优先级 | P2 |
| 创建日期 | 2026-03-17 |

## 背景

当前仅支持 light/dark/system 三种基础主题切换，通过 Tailwind CSS 的 `dark` class 实现。缺少自定义主题能力（如自定义配色、主题包导入/导出）。

## 目标

- 支持自定义 CSS 变量配色方案
- 支持主题包的导入/导出（JSON 格式）
- 在设置 UI 的外观面板中提供主题预览和切换
- 保持与现有 light/dark/system 切换的兼容性
- 主题配置持久化到 `localStorage`

## 当前状态

- 基础主题切换已实现（`use-theme.ts` hook）
- 使用 Tailwind CSS 4.2 的 CSS 变量系统
- `useThemeInit()` 在应用顶层初始化主题
- `useTheme()` 提供响应式主题读取
- shadcn/ui 组件已使用 CSS 变量（`--primary`、`--background` 等），便于扩展
