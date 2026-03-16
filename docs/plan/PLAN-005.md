# PLAN-005 Matrix 客户端连接与 sync 桥接

- **status**: approved
- **createdAt**: 2026-03-16 21:00
- **approvedAt**: 2026-03-16
- **relatedTask**: FEAT-005

---

## 1. 现状

- 已有认证流程（login/register + session 持久化 + mock 模式）
- `MatrixClient` 仅在登录时临时创建用于认证，登录后未保持连接
- 无 sync 循环、无 Zustand stores（除 auth store）、无 TanStack Query 集成

## 2. 方案

### 2.1 文件结构

```
packages/matrix-client/src/
├── auth/                   # （已有）
├── client/
│   ├── client-manager.ts   # MatrixClient 生命周期管理（创建、启动 sync、停止）
│   └── mock-client.ts      # Mock 模式客户端（预设数据、模拟 sync）
├── sync/
│   └── sync-bridge.ts      # SDK EventEmitter → Zustand stores 桥接
├── stores/
│   ├── connection-store.ts  # 连接状态（disconnected/connecting/syncing/reconnecting/error）
│   └── rooms-store.ts       # 房间列表状态（RoomSummary Map）
├── query/
│   └── query-keys.ts        # TanStack Query key 常量 + 缓存失效辅助函数
└── index.ts                 # 公共 API 导出

apps/web/src/
├── hooks/
│   └── use-matrix-client.ts # MatrixClient 生命周期 hook（连接 Query 失效）
├── providers/
│   └── query-provider.tsx   # TanStack QueryClientProvider 封装
```

### 2.2 连接状态机

```
disconnected → connecting → syncing ⇄ reconnecting
                    ↓           ↓
                  error       error
```

### 2.3 桥接事件映射

| SDK 事件 | Zustand store 更新 | Query 失效 |
|----------|-------------------|-----------|
| `ClientEvent.Sync(PREPARED)` | 初始化房间列表 | 全部失效 |
| `RoomEvent.Timeline` | 更新对应房间 | timeline + roomList |
| `RoomEvent.Name` | 更新房间名称 | roomList |
| `RoomMemberEvent.Membership` | 更新成员数 | roomMembers + roomDetail |
| `RoomEvent.Receipt` | 更新未读计数 | roomDetail |
| `RoomEvent.MyMembership(leave)` | 移除房间 | roomList |
| `ClientEvent.Room` | 全量刷新房间列表 | roomList |

### 2.4 Mock 模式

- 预设 5 个房间（2 群聊 + 2 私聊 + 1 开发频道）
- 模拟 500ms 连接延迟
- 30s 定时更新 lastSync 时间戳
- 与真实模式共享 store 接口

## 3. 风险

| 风险 | 严重度 | 缓解 |
|------|--------|------|
| matrix-js-sdk 事件类型签名复杂 | 低 | 使用具名函数避免泛型处理器类型问题 |
| 房间列表全量刷新性能 | 低 | 当前阶段房间数少；后续优化为增量更新 |
| E2EE 未集成 | 预期 | 阶段 4 处理 initRustCrypto |

## 4. 工作量

约 8 个新文件，预计 2-3 小时。

## 5. 备选

- **Web Worker sync**：SDK 对象不可序列化，阶段 3 再评估
- **直接用 SDK store**：不利于 UI 解耦，维护 Zustand 桥接层更灵活
