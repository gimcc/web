# FEAT-026 实现邀请通知系统

- **status**: done
- **priority**: P1
- **owner**: claude-agent
- **createdAt**: 2026-03-17 12:00

## 描述

实现邀请通知 UI，让用户可以查看并接受/拒绝好友请求和聊天邀请。接受后才加入房间。

验收标准：
- Sidebar header 增加通知铃铛按钮，有未处理邀请时显示数量徽章
- 点击铃铛弹出邀请列表面板（Popover），显示所有待处理邀请
- 每条邀请显示房间名/用户名、邀请人信息
- 每条邀请有"接受"和"拒绝"按钮
- 接受调用 `client.joinRoom()`，拒绝调用 `client.leave()`
- 邀请状态的房间不出现在主房间列表中
- `RoomSummary` 新增 `membership` 字段区分 invite/join 状态

## 进行时描述

正在实现邀请通知系统

## 依赖

- **blocked by**: FEAT-005, FEAT-006
- **blocks**: （无）

## 笔记

- Matrix 中房间邀请通过 `m.room.member` 事件的 `membership: "invite"` 状态传递
- `room.getMyMembership()` 返回当前用户在该房间的成员状态
- sync-bridge 中 `onMyMembership` 已监听成员状态变更，需扩展处理 invite 状态
