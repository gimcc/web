# 架构

## 概述

Matrix Web —— 基于 Matrix 协议的浏览器端聊天 IM 客户端。采用 React 19 + matrix-js-sdk 技术栈，monorepo 结构。

## 技术栈总览

| 关注点 | 选型 |
|--------|------|
| 框架 | React 19.2 |
| Matrix SDK | matrix-js-sdk 41.1 |
| 构建工具 | Vite 8 |
| 语言 | TypeScript 5.9 strict |
| 包管理 | pnpm workspaces |
| 路由 | React Router 7（hash / history 双模式，config.json 配置） |
| Lint/格式化 | ESLint 10 + @antfu/eslint-config 7.7 |
| 客户端状态 | Zustand 5.0 |
| 服务端状态 | TanStack Query 5.90 |
| UI 组件 | shadcn/ui（Base UI 原语），内置于 apps/web |
| CSS | Tailwind CSS 4.2 |
| 虚拟滚动 | TanStack Virtual 3.13 |
| 测试 | Vitest 4.1 + Playwright 1.58 + MSW 2.12 |
| E2EE | matrix-sdk-crypto-wasm（Rust/WASM） |

## Monorepo 结构

```
matrix-web/
├── apps/
│   └── web/                  # 主 React 聊天客户端
├── packages/
│   ├── matrix-client/        # matrix-js-sdk 封装与状态
│   ├── types/                # 共享 TypeScript 类型
│   └── config/               # 基础配置
├── docs/                     # 文档
├── pnpm-workspace.yaml
├── eslint.config.mjs
├── package.json
└── CLAUDE.md
```

## 模块依赖关系

```
apps/web
├── @matrix-web/matrix-client
├── @matrix-web/types
└── @matrix-web/config

packages/matrix-client
├── @matrix-web/types
└── @matrix-web/config

packages/types
└── @matrix-web/config

packages/config
└── (无内部依赖)
```

**依赖方向：** `config` ← `types` ← `matrix-client` ← `web`

## 模块职责

| 模块 | 职责 | React 依赖 | 详细文档 |
|------|------|------------|----------|
| `apps/web` | 页面路由、组装、UI 组件、PWA | 是 | [modules/web.md](modules/web.md) |
| `packages/matrix-client` | SDK 封装、状态管理、事件桥接、本地加密 | 否 | [modules/matrix-client.md](modules/matrix-client.md) |
| `packages/types` | 共享类型、Zod schema | 否 | [modules/types.md](modules/types.md) |
| `packages/config` | tsconfig、eslint、vitest、tailwind 配置 | 否 | [modules/config.md](modules/config.md) |

## 数据流

```
┌─ 应用启动 ────────────────────────────────────┐
│                                                │
│  localStorage 有 DEK？                         │
│  ├─ 有 + 无密码 → 直接读取明文 DEK              │
│  ├─ 有 + 有密码 → 锁屏 → 输入密码               │
│  │   ├─ 正常密码 → PBKDF2 → KEK → 解密 DEK     │
│  │   └─ 胁迫密码 → 静默擦除全部本地数据          │
│  └─ 无 → 首次使用 → 登录页                      │
│       │                                        │
│       ▼                                        │
│  DEK → 解密 IndexedDB → 恢复会话               │
│                                                │
└────────────────────────────────────────────────┘
       │
       ▼
Matrix Homeserver
       │
       ▼
  matrix-js-sdk (sync 长轮询)
       │
       ▼
  桥接层 (bridge)
  ├──→ Zustand stores (实时状态)
  └──→ TanStack Query cache (失效通知)
       │
       ▼
  加密存储层 (AES-256-GCM + DEK)
  ├──→ IndexedDB (消息、密钥、会话均加密存储)
  └──→ localStorage (DEK: 明文或被 KEK 加密)
       │
       ▼
  React 组件树
  ├── useStore() ← Zustand (客户端状态)
  ├── useQuery() ← TanStack Query (服务端状态)
  └── useOptimistic() ← React 19 (乐观更新)
       │
       ▼
  用户操作 → mutation → matrix-js-sdk → Homeserver

  有锁屏密码时：空闲超时/手动锁定 → 清除内存 DEK → 显示锁屏
```

## 关键决策

详见 [PLAN-001](plan/PLAN-001.md) 第 12 节「关键工程决策」。

## 实施阶段

| 阶段 | 内容 |
|------|------|
| 1 | 项目脚手架搭建、monorepo 配置、开发工具链、Mock 系统、Storybook |
| 2 | 认证（登录/注册）、Matrix 客户端连接 |
| 3 | 房间列表、时间线、消息收发（命令系统、粘贴板图片、图片/文件/视频消息） |
| 4 | E2EE 配置、密钥管理 UI |
| 4.5 | 锁屏密码、本地数据库加密、胁迫密码 |
| 5 | 表情回复、线程、语音消息录制、输入指示器、更多命令扩展 |
| 6 | PWA、离线支持、推送通知 |
