# packages/matrix-client — Matrix SDK 封装

## 概述

封装 `matrix-js-sdk`，提供类型安全的 Matrix 协议交互层。包含 Zustand stores 定义和 SDK 事件到状态的桥接逻辑。**不依赖 React**，可独立测试。

## 职责

- 初始化和管理 `MatrixClient` 实例（登录、sync、登出）
- 封装 matrix-js-sdk API 为类型安全的函数
- 定义所有 Zustand stores（房间、消息、用户、UI 状态）
- SDK EventEmitter → Zustand store 的桥接适配器
- TanStack Query 的 query/mutation 工厂函数
- E2EE 生命周期管理（Rust crypto 初始化、设备验证）
- 锁屏密码管理与本地数据库加密（密钥派生、加解密、锁定/解锁生命周期）
- IndexedDB 持久化配置（加密存储层）

## 技术栈

| 依赖 | 版本 | 用途 |
|------|------|------|
| matrix-js-sdk | 41.1 | Matrix 协议 SDK |
| zustand | 5.0 | 客户端状态定义 |
| @tanstack/query-core | 5.90 | Query/Mutation 工厂（无 React 依赖） |
| zod | - | 运行时数据校验 |

## 内部依赖

- `@matrix-web/types` — 共享类型定义

## 目录结构（规划）

```
packages/matrix-client/
├── src/
│   ├── client/               # MatrixClient 初始化与生命周期
│   │   ├── create.ts         # 创建客户端实例
│   │   ├── auth.ts           # 登录/注册/登出
│   │   └── sync.ts           # sync 循环管理
│   ├── stores/               # Zustand store 定义
│   │   ├── rooms.ts          # 房间列表状态
│   │   ├── messages.ts       # 消息时间线状态
│   │   ├── members.ts        # 房间成员状态
│   │   ├── presence.ts       # 用户在线状态
│   │   └── ui.ts             # UI 状态（当前房间、面板开关等）
│   ├── bridge/               # SDK 事件 → store 桥接
│   │   ├── sync-bridge.ts    # sync 事件分发到 stores
│   │   └── query-invalidation.ts  # 事件驱动的 query 缓存失效
│   ├── queries/              # TanStack Query 工厂
│   │   ├── messages.ts       # 消息历史分页查询
│   │   ├── rooms.ts          # 房间详情查询
│   │   └── members.ts        # 成员列表查询
│   ├── crypto/               # E2EE 相关
│   │   ├── init.ts           # Rust crypto 初始化
│   │   └── verification.ts   # 设备验证流程
│   ├── lock/                 # 锁屏密码与本地加密
│   │   ├── dek.ts            # DEK 生成、localStorage 读写（明文/加密）
│   │   ├── kek.ts            # KEK 派生（PBKDF2 + WebCrypto）、DEK 加解密
│   │   ├── db-encryption.ts  # IndexedDB 加密存储层（AES-256-GCM + DEK）
│   │   ├── lock-manager.ts   # 锁定/解锁生命周期、空闲超时检测
│   │   ├── duress.ts         # 胁迫密码设置/验证/触发静默擦除
│   │   └── password.ts       # 密码设置/修改/移除/验证/重置
│   ├── utils/                # 通用工具函数
│   │   └── user-id.ts        # 用户 ID 格式化（显示简化、输入补全、解析）
│   ├── mock/                 # Mock 开发系统（mockMode 时替代真实 SDK）
│   │   ├── data/             # 预设数据（users、rooms、messages、media）
│   │   ├── mock-client.ts    # MockMatrixClient（与真实 client 共享接口）
│   │   ├── mock-sync.ts      # 模拟 sync 事件流
│   │   └── index.ts
│   └── index.ts              # 公共 API 导出
├── tsconfig.json
└── package.json
```

## 设计原则

- **无 React 依赖**：所有代码为纯 TypeScript，可在 Node.js 或 Web Worker 中运行
- **单一 MatrixClient 实例**：全局唯一，避免 IndexedDB 冲突导致 E2EE 状态损坏
- **事件驱动**：SDK 的 EventEmitter 事件通过桥接层推送到 Zustand，组件通过 store 订阅自动更新
- **初始化顺序**：读取/解锁 DEK → 解密存储 → `createClient()` → `initRustCrypto()` → `startClient()` → 监听 `PREPARED` 事件
- **两层密钥**：DEK（随机，加密数据库）持久化在 localStorage；KEK（从密码派生，加密 DEK）仅在设置锁屏密码时存在。密码变更只需重新加密 DEK，无需重新加密数据库
- **用户 ID 统一格式化**：所有用户 ID 的显示和输入通过 `utils/user-id.ts` 统一处理（`formatUserId` 显示简化、`resolveUserId` 输入补全、`parseUserId` 解析），组件不得直接操作 user ID 字符串
