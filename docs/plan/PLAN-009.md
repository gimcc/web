# PLAN-009 邀请通知系统

- **status**: completed
- **createdAt**: 2026-03-17
- **task**: FEAT-026

## 背景

当前房间列表将所有房间（包括被邀请但未加入的房间）混在一起显示，且没有接受/拒绝邀请的 UI。用户需要一个通知区域查看好友请求和聊天邀请，接受后才加入房间。

## 方案

### 1. 数据层

- `RoomSummary` 新增 `membership: 'join' | 'invite'` 字段
- `extractSingleRoomSummary()` 读取 `room.getMyMembership()`
- `extractRoomSummaryFromClient` 过滤仅保留 join/invite 状态房间
- `sync-bridge` 对 invite 状态使用 `upsertRoom` 替代全量同步

### 2. UI 层

- 新增 `invite-panel.tsx`：铃铛按钮 + 邀请面板 Popover
- 每条邀请显示房间头像、房间名、接受/拒绝按钮、错误反馈
- Sidebar header 新增 InviteBell 组件
- 房间列表过滤 invite 状态房间

### 3. 涉及文件

| 文件 | 操作 |
|------|------|
| `packages/matrix-client/src/stores/rooms-store.ts` | 修改 |
| `packages/matrix-client/src/client/client-manager.ts` | 修改 |
| `packages/matrix-client/src/sync/sync-bridge.ts` | 修改 |
| `packages/matrix-client/src/client/mock-client.ts` | 修改 |
| `apps/web/src/components/invite-panel.tsx` | 新增 |
| `apps/web/src/components/sidebar.tsx` | 修改 |
| `apps/web/src/components/room-list.tsx` | 修改 |
