# packages/config — 基础配置

## 概述

Monorepo 共享的基础配置文件集合。各包通过继承/引用这些配置保持一致性。

## 职责

- TypeScript 基础配置（`tsconfig.base.json`）
- ESLint 共享配置（可选的包级覆盖）
- Vitest 基础配置
- Tailwind CSS 预设（设计 tokens）

## 技术栈

| 依赖 | 版本 | 用途 |
|------|------|------|
| typescript | 5.9 | 类型系统配置 |
| @antfu/eslint-config | 7.7 | ESLint 预设 |
| vitest | 4.1 | 测试框架配置 |
| tailwindcss | 4.2 | CSS 预设 |

## 内部依赖

无（此包为基础设施，被所有其他包依赖）

## 目录结构（规划）

```
packages/config/
├── tsconfig.base.json        # TS 基础配置（strict, paths, target）
├── tsconfig.react.json       # React 项目扩展（jsx, dom lib）
├── tsconfig.lib.json         # 库项目扩展（declaration, composite）
├── eslint.config.mjs         # ESLint 共享配置
├── vitest.config.ts          # Vitest 基础配置
├── tailwind.preset.ts        # Tailwind 预设（颜色、间距、字体 tokens）
└── package.json
```

## 配置说明

### TypeScript

```
tsconfig.base.json
├── strict: true
├── target: ES2022
├── module: ESNext
├── moduleResolution: bundler
├── skipLibCheck: true
└── isolatedModules: true

tsconfig.react.json (extends base)
├── jsx: react-jsx
└── lib: [DOM, DOM.Iterable, ES2022]

tsconfig.lib.json (extends base)
├── declaration: true
└── composite: true
```

### ESLint

基于 `@antfu/eslint-config`，启用：
- `react: true`
- `typescript: true`
- 自定义规则覆盖（如有需要）

### Vitest

- 测试环境：jsdom（组件测试）/ node（纯逻辑测试）
- 覆盖率：v8 provider，阈值 80%
- 测试文件模式：`**/*.test.ts(x)`、`**/*.spec.ts(x)`

### Tailwind 预设

- 设计 tokens：颜色系统、间距比例、字体配对
- 暗色模式：`class` 策略
- 动画：消息出现、面板切换等过渡效果
