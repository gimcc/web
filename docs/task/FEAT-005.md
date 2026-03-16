# FEAT-005 实现 Matrix 客户端连接与 sync 桥接

- **status**: pending
- **priority**: P1
- **owner**: (未分配)
- **createdAt**: 2026-03-16 17:30

## 描述

初始化 MatrixClient 实例，启动 sync 长轮询，实现 SDK EventEmitter → Zustand stores 的桥接层和 TanStack Query 缓存失效机制。

验收标准：
- MatrixClient 创建、initRustCrypto、startClient 完成
- sync 事件正确分发到 Zustand stores（rooms, messages, members, presence）
- TanStack Query 缓存在 sync 事件触发时正确失效
- 断线重连逻辑正常
- Mock 模式下 MockMatrixClient 正常工作

## 进行时描述

正在实现 Matrix 客户端连接与 sync 桥接

## 依赖

- **blocked by**: FEAT-004
- **blocks**: FEAT-006, FEAT-007, FEAT-008

## 笔记

- 参考 PLAN-001 第 2.2 节状态管理和 architecture.md 数据流图
- 初始化顺序：DEK → 解密存储 → createClient → initRustCrypto → startClient → PREPARED
