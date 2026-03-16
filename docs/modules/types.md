# packages/types — 共享类型定义

## 概述

跨包共享的 TypeScript 类型定义。所有模块的公共类型契约，确保类型一致性。

## 职责

- Matrix 事件和消息的类型定义（discriminated unions）
- 房间、用户、成员等领域模型类型
- API 请求/响应类型
- Zod schema 定义（运行时校验与类型推导）
- 常量和枚举

## 技术栈

| 依赖 | 版本 | 用途 |
|------|------|------|
| typescript | 5.9 | 类型系统 |
| zod | - | 运行时 schema 校验 + 类型推导 |

## 内部依赖

无（此包为叶子节点，不依赖其他内部包）

## 目录结构（规划）

```
packages/types/
├── src/
│   ├── message.ts            # 消息类型（discriminated union）
│   │                         # TextMessage | ImageMessage | FileMessage
│   │                         # | VoiceMessage | VideoMessage | SystemMessage
│   ├── room.ts               # 房间类型（Room, RoomSummary, RoomState）
│   ├── user.ts               # 用户类型（User, UserPresence）
│   ├── member.ts             # 房间成员类型（RoomMember, PowerLevel）
│   ├── event.ts              # Matrix 事件类型（MatrixEvent, EventContent）
│   ├── sync.ts               # 同步状态类型（SyncState, SyncResponse）
│   ├── crypto.ts             # 加密相关类型（DeviceInfo, KeyBackup）
│   ├── lock.ts               # 锁屏相关类型（LockState, LockConfig, PasswordPolicy）
│   ├── schemas/              # Zod schema 定义
│   │   ├── message.ts        # 消息内容校验
│   │   ├── event.ts          # 事件载荷校验
│   │   └── auth.ts           # 认证数据校验
│   ├── config.ts             # 运行时配置类型（AppConfig, 含 hideServerName 等）
│   ├── constants.ts          # 常量（事件类型字符串、消息状态等）
│   └── index.ts              # 公共 API 导出
├── tsconfig.json
└── package.json
```

## 设计原则

- **Discriminated unions**：消息类型使用 `type` 字段作为判别符，确保 switch 穷尽检查
- **Zod 优先**：在系统边界（SDK 数据进入 store 前）用 Zod schema 做运行时校验
- **`as const satisfies`**：消息状态等枚举使用字面量联合类型而非数字枚举
- **Branded types**：加密相关的敏感数据使用品牌类型区分明文与密文
- **零运行时开销**：纯类型导出在编译后消失；Zod schema 仅在需要校验时引入

## 类型示例

```typescript
// 消息类型 — discriminated union
type Message =
  | TextMessage
  | ImageMessage
  | FileMessage
  | VideoMessage
  | VoiceMessage
  | SystemMessage

// 消息基础字段
interface MessageBase {
  id: string
  roomId: string
  senderId: string
  timestamp: number
  status: MessageStatus
  replyTo?: string         // 回复的消息 ID
}

interface TextMessage extends MessageBase {
  type: 'text'
  content: string          // 纯文本内容
  formattedContent?: string // HTML 格式内容（Markdown 渲染后）
  isEmote?: boolean        // /me 动作消息
}

interface ImageMessage extends MessageBase {
  type: 'image'
  url: string              // mxc:// URI
  thumbnailUrl?: string    // mxc:// 缩略图 URI
  filename: string
  mimetype: string         // image/png, image/jpeg, image/gif, image/webp
  size: number             // 字节
  width?: number           // 像素（用于预计算占位）
  height?: number
  caption?: string         // 图片说明文字
}

interface FileMessage extends MessageBase {
  type: 'file'
  url: string              // mxc:// URI
  filename: string
  mimetype: string
  size: number             // 字节
}

interface VideoMessage extends MessageBase {
  type: 'video'
  url: string              // mxc:// URI
  thumbnailUrl?: string    // mxc:// 缩略图 URI
  filename: string
  mimetype: string         // video/mp4, video/webm, video/ogg
  size: number             // 字节
  width?: number
  height?: number
  duration?: number        // 秒
}

interface VoiceMessage extends MessageBase {
  type: 'voice'
  url: string              // mxc:// URI
  mimetype: string         // audio/ogg, audio/webm
  size: number             // 字节
  duration?: number        // 秒
  waveform?: number[]      // 波形数据
}

interface SystemMessage extends MessageBase {
  type: 'system'
  content: string
  systemType: SystemMessageType
}

// 消息状态 — 字面量联合
type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

// 系统消息类型
type SystemMessageType =
  | 'member_join' | 'member_leave' | 'member_invite'
  | 'member_kick' | 'member_ban'
  | 'room_name_change' | 'room_topic_change'
  | 'room_avatar_change' | 'encryption_enabled'

// 上传进度
interface UploadProgress {
  messageId: string
  loaded: number
  total: number
  percentage: number       // 0-100
  abortController: AbortController
}

// 服务器配置
interface HomeserverEntry {
  name: string             // 显示名 & server name（如 "gg.im"）
  url: string              // homeserver URL（如 "https://gg.im"）
}

interface HomeserversConfig {
  default: string          // 默认选中的 server name
  servers: HomeserverEntry[]
  allowCustom: boolean     // 允许手动输入自定义服务器
  showSelector: boolean    // 显示服务器切换 UI
}

// 运行时配置（public/config.json）
interface AppConfig {
  routerMode: 'hash' | 'history'
  basePath: string
  homeservers: HomeserversConfig
  lockIdleTimeout: number  // 秒，0 禁用
  hideServerName: boolean  // 隐藏当前 homeserver 的 server name
  mockMode: boolean        // 开发环境启用 mock
}
```
