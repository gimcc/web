# PLAN-007 Phase 5 — 增强功能（输入指示器与在线状态）

- **status**: approved
- **createdAt**: 2026-03-17
- **approvedAt**: 2026-03-17
- **relatedTask**: FEAT-018

---

## 1. 现状

- Matrix 客户端连接和 sync 桥接已实现（FEAT-005）
- 房间列表显示成员数和在线信息
- 无输入指示器和在线状态实现

## 2. 可实现任务分析

阶段 5 共 5 个任务，当前依赖满足情况：

| 任务 | 依赖 | 状态 | 可否启动 |
|------|------|------|----------|
| FEAT-015 表情回复 | FEAT-008 | 未完成 | ❌ |
| FEAT-016 消息线程 | FEAT-008 | 未完成 | ❌ |
| FEAT-017 语音消息 | FEAT-008 | 未完成 | ❌ |
| **FEAT-018 输入指示器** | **FEAT-005** | **已完成** | **✅** |
| FEAT-019 扩展命令 | FEAT-010 | 未完成 | ❌ |

本方案仅覆盖 FEAT-018，其余待阶段 3 完成后启动。

## 3. FEAT-018: 输入指示器与在线状态

### 3.1 Typing Indicators

**发送端：**
- 输入框 `onChange` 时调用 `client.sendTyping(roomId, true, 30000)`
- 停止输入 3 秒后发送 `client.sendTyping(roomId, false)`
- 使用 debounce 防止频繁发送

**接收端：**
- 监听 `RoomMemberEvent.Typing` 事件
- Zustand store 维护每房间的 typing 用户列表
- UI 在消息区域底部显示 "XXX is typing..." 或 "XXX, YYY are typing..."

**实现文件：**
- `packages/matrix-client/src/stores/typing-store.ts` — typing 状态
- `packages/matrix-client/src/sync/typing-bridge.ts` — SDK 事件桥接
- `apps/web/src/components/chat/typing-indicator.tsx` — UI 组件

### 3.2 Presence Status

**状态类型：** `online` | `offline` | `unavailable`

**发送：**
- 客户端启动时设置 `online`
- 空闲超时后设置 `unavailable`
- 窗口关闭/logout 时设置 `offline`

**接收：**
- 监听 SDK `User.presence` 事件
- Zustand store 维护用户在线状态 Map

**实现文件：**
- `packages/matrix-client/src/stores/presence-store.ts` — 在线状态
- `packages/matrix-client/src/sync/presence-bridge.ts` — SDK 事件桥接
- `apps/web/src/components/ui/presence-dot.tsx` — 状态指示点

### 3.3 UI 集成

- 房间列表成员头像旁显示在线状态点（绿色 online / 黄色 unavailable / 灰色 offline）
- 聊天区域底部显示 typing indicator（动画省略号）
- 房间头部显示当前房间成员在线数

## 4. 风险

| 风险 | 缓解 |
|------|------|
| Typing 事件频率过高 | debounce 300ms，SDK 内置限流 |
| Presence 大量用户内存占用 | 仅缓存当前可见房间成员状态 |
