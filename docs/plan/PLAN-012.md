# PLAN-012 重构消息处理体系（参考 Cinny）

- **status**: draft
- **created**: 2026-03-20
- **task**: BUG-001

## 调查上下文

### 当前架构

```
SDK sync → RoomEvent.Timeline → sync-bridge.ts → messages-store (Zustand) → React 组件
                                    ↑                     ↑
                              手动事件分发            独立状态副本
```

- `messages-store.ts`: 维护 `Map<roomId, TimelineMessage[]>` 作为消息源
- `sync-bridge.ts`: 监听 SDK 事件，手动转换并写入 store
- `message-service.ts`: 负责消息转换、发送、历史加载
- `message-timeline.tsx`: 从 store 读取消息渲染 UI

### Cinny 架构

```
SDK sync → Room.EventTimeline 自动更新 → RoomEvent.Timeline → setState({...ct}) → 渲染时读取 SDK
                                                                                      ↑
                                                                              直接 timeline.getEvents()
```

- 无独立消息 store，SDK EventTimeline 即数据源
- 组件 state 只存 `{ linkedTimelines, range }` 控制可视范围
- 新消息到达时只调整 range，不复制数据

## 方案

### 方案概述：混合模式（SDK 为主 + 薄 UI 层）

保留 Zustand store 但改变其角色：**store 不再是数据源，仅为 UI 协调层**。

```
SDK sync → Room.EventTimeline（数据源）
                ↓
         RoomEvent.Timeline 触发
                ↓
         timeline-store（UI 协调层）: 存放 version counter + pending messages
                ↓
         React 组件: 渲染时从 SDK 读取事件 + 合并 pending
```

### 具体改动

#### Step 1: 重构 messages-store → timeline-store（UI 协调层）

**改变 store 的职责**，从"存储所有消息"变为"协调 UI 渲染"：

```typescript
// 新 timeline-store.ts
interface TimelineState {
  // 版本号 — 每次 SDK 事件到达时递增，触发组件重渲染
  versions: Map<string, number>
  // 仅存放尚未被 SDK 确认的乐观消息
  pendingMessages: Map<string, TimelineMessage[]>
  // 分页状态
  hasMore: Map<string, boolean>

  // 触发重渲染（仅递增版本号）
  invalidate: (roomId: string) => void
  // 乐观消息管理
  addPending: (msg: TimelineMessage) => void
  removePending: (roomId: string, tempId: string) => void
}
```

#### Step 2: 重构 message-service（读取层）

**`getTimeline(roomId)` 改为从 SDK 读取 + 合并 pending**：

```typescript
export function getTimelineMessages(roomId: string): TimelineMessage[] {
  const client = getMatrixClient()
  const room = client?.getRoom(roomId)
  if (!room) return []

  const timeline = room.getLiveTimeline()
  const events = timeline.getEvents()

  // 从 SDK 实时读取
  const sdkMessages = events
    .filter(e => e.getType() === 'm.room.message')
    .map(e => matrixEventToTimelineMessage(e, client!))

  // 合并 pending（乐观更新）
  const pending = useTimelineStore.getState().pendingMessages.get(roomId) ?? []
  return [...sdkMessages, ...pending].sort((a, b) => a.timestamp - b.timestamp)
}
```

#### Step 3: 简化 sync-bridge

**sync-bridge 不再做消息转换和存储**，只负责：
1. 触发 `invalidate(roomId)` 让组件重渲染
2. 处理乐观消息的确认（移除 pending）
3. 更新房间列表、未读计数等元数据

```typescript
function processTimelineEvent(event: MatrixEvent, room: Room): void {
  const type = event.getType()

  if (type === 'm.room.message') {
    const sender = event.getSender()
    const myUserId = client.getUserId()

    // 自己的消息：移除对应的 pending
    if (sender === myUserId) {
      const eventId = event.getId()
      if (eventId) {
        store.removePendingBySender(room.roomId, myUserId)
      }
    }
  }

  // 统一：触发 UI 重渲染
  store.invalidate(room.roomId)
}
```

#### Step 4: 重构 message-timeline 组件

- 订阅 `versions.get(roomId)` 触发重渲染
- 渲染时调用 `getTimelineMessages(roomId)` 从 SDK 实时读取
- 保留现有的 virtualizer 和滚动逻辑

#### Step 5: 适配 reaction / edit / redaction

- **Reactions**: SDK 内部通过 Relations API 管理，渲染时用 `room.getUnfilteredTimelineSet()` 查询
- **Edits**: SDK 自动通过 `m.replace` 关系应用，`event.getContent()` 返回最新内容
- **Redaction**: SDK 标记 `event.isRedacted()`，渲染时检查即可

#### Step 6: 处理加密消息

- `onTimeline` 检查 `m.room.encrypted`，等待 `MatrixEventEvent.Decrypted` 后再 `invalidate`
- 渲染时 SDK 已解密，直接读取明文

### 迁移策略

1. 先实现新的 `timeline-store` 和 `getTimelineMessages`
2. 修改 `message-timeline.tsx` 使用新数据源
3. 简化 `sync-bridge` 为 invalidation-only
4. 适配发送相关功能（sendTextMessage, sendReply 等）的乐观更新
5. 适配 reaction/edit/delete 功能
6. 移除旧 `messages-store` 中不再需要的方法
7. 测试验证

## 风险

1. **SDK EventTimeline 数据格式** — 需要确认 SDK 是否正确处理 edited/redacted 内容（matrix-js-sdk 可能需要额外配置）
2. **reaction 聚合** — 需确认 SDK Relations API 在我们的版本中是否可用且稳定
3. **性能** — 每次渲染从 SDK 读取并转换事件，需要确保 memo/缓存策略到位
4. **线程消息** — 线程 store 需要同步适配

## 工作量

- 涉及文件：~6-8 个核心文件
- 预计跨模块：`matrix-client` 包 + `web` 应用
- 重构范围：中等（核心数据流变化，UI 逻辑基本不变）

## 备选方案

### A: 仅修复已知 Bug（最小改动）

将当前未提交的修改合并即可修复大部分问题：
- 加密消息处理 ✓
- toStartOfTimeline 过滤 ✓
- echo 确认修复 ✓
- timeline 排序 ✓

**优点**: 改动最小
**缺点**: 架构问题仍在，未来可能复发

### B: 完全 Cinny 模式（最大改动）

完全移除 Zustand store，组件直接持有 SDK EventTimeline 引用，像 Cinny 一样用 `{ linkedTimelines, range }` 管理状态。

**优点**: 最彻底，数据源唯一
**缺点**: 改动极大，需要重写 virtualizer 逻辑，放弃乐观更新
