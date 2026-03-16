# apps/web — 主聊天客户端

## 概述

基于 React 19 的 Matrix 协议 Web 聊天客户端主应用。负责将所有 packages 组装为完整的用户界面。

## 职责

- 页面路由与布局（React Router 7，支持 hash / history 双模式）
- 运行时配置加载（`public/config.json`）
- 页面级组件（登录、房间列表、聊天视图、设置等）
- 将 `packages/matrix-client` 的状态桥接到 React 组件
- TanStack Query Provider 配置
- Zustand store 消费
- PWA 配置（Service Worker、Web Push）

## 技术栈

| 依赖 | 版本 | 用途 |
|------|------|------|
| react | 19.2 | UI 框架 |
| react-dom | 19.2 | DOM 渲染 |
| react-router | 7.13 | 客户端路由（hash / history 双模式） |
| @tanstack/react-query | 5.90 | 服务端状态管理 |
| @tanstack/react-virtual | 3.13 | 消息列表虚拟滚动 |
| zustand | 5.0 | 客户端状态消费 |
| vite | 8.0 | 构建与开发服务器 |
| vite-plugin-pwa | - | PWA 支持 |

## 内部依赖

- `@matrix-web/ui` — 共享 UI 组件
- `@matrix-web/matrix-client` — Matrix SDK 封装与状态
- `@matrix-web/types` — 共享类型定义
- `@matrix-web/config` — 基础配置

## 目录结构（规划）

```
apps/web/
├── src/
│   ├── app/                  # 根组件、Provider 配置
│   ├── pages/                # 页面级组件
│   │   ├── lock/             # 锁屏（密码输入、首次设置、密码修改）
│   │   ├── login/            # 登录/注册
│   │   ├── rooms/            # 房间列表
│   │   ├── chat/             # 聊天视图
│   │   └── settings/         # 设置（含锁屏密码管理）
│   ├── hooks/                # 应用级自定义 hooks
│   ├── routes/               # 路由配置（双模式 router 工厂）
│   ├── config/               # 运行时配置加载
│   └── main.tsx              # 入口
├── public/
│   └── config.json           # 运行时配置文件
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### config.json 配置项

```jsonc
{
  // 路由模式："hash" | "history"
  // hash: createHashRouter，适合纯静态/CDN 部署
  // history: createBrowserRouter，需服务端 fallback
  "routerMode": "hash",

  // base 路径，用于子路径部署
  // hash 模式下影响资源加载路径
  // history 模式下同时影响路由前缀
  "basePath": "/",

  // 服务器配置
  "homeservers": {
    "default": "matrix.org",           // 默认选中（对应 servers[].name）
    "servers": [                        // 预置服务器列表
      { "name": "matrix.org", "url": "https://matrix.org" },
      { "name": "gg.im", "url": "https://gg.im" }
    ],
    "allowCustom": true,               // 允许手动输入自定义服务器
    "showSelector": true                // 显示服务器切换 UI（登录页 + 设置页）
  },

  // 锁屏空闲超时（秒），0 表示禁用自动锁定
  "lockIdleTimeout": 300,

  // 隐藏当前 homeserver 的 server name
  // true: @aa:gg.im 显示为 @aa（本 homeserver 用户）
  // 外部 homeserver 用户始终显示完整 ID
  "hideServerName": true,

  // 开发模式 mock（生产环境始终 false）
  "mockMode": false
}
```

此文件在 `public/` 目录下，构建时原样复制到产物中，**运行时通过 fetch 加载**，修改后无需重新构建。

## 设计原则

- **薄应用层**：业务逻辑在 `matrix-client`，UI 组件在 `ui`，应用层仅做组装和路由
- **懒加载**：页面级组件使用 `React.lazy` + `Suspense`
- **乐观更新**：消息发送使用 `useOptimistic` 实现即时响应
- **虚拟滚动**：消息列表使用 TanStack Virtual，支持反向滚动和可变高度
