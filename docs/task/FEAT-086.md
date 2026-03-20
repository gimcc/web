# FEAT-086 重构消息 UI 为 WhatsApp 风格气泡与对勾状态

- **状态**: 完成
- **优先级**: P1
- **创建日期**: 2026-03-20
- **owner**: —

## 描述

将消息 UI 从 Slack/Discord 风格（左侧头像 + 右侧内容，所有消息左对齐）重构为 WhatsApp 风格气泡布局，并用对勾图标替代圆形头像已读回执。

## 需求

### 消息气泡布局
- 自己的消息：右对齐，主色调浅色背景气泡
- 他人的消息：左对齐，白色/灰色背景气泡，显示发送者名称
- 气泡带圆角，时间戳和状态图标内嵌在气泡右下角

### 状态对勾（仅自己的消息）
- `sending` → 单个灰色时钟图标（发送中）
- `sent` → ✓ 单个灰色对勾（已送达服务器）
- 对方已收到 → ✓✓ 双灰色对勾（已送达）
- 对方已读 → ✓✓ 蓝色双对勾（已读）
- `failed` → ❌ 红色错误图标

### 清理
- 删除 `ReadReceipts` 圆形头像组件，用对勾替代

## 涉及文件

| 文件 | 改动 |
|------|------|
| `apps/web/src/components/message-bubble.tsx` | 重写布局为气泡风格，对勾状态 |
| `apps/web/src/components/read-receipts.tsx` | 删除 |
| `apps/web/src/components/message-timeline.tsx` | 移除 receipts 相关 prop |
| `apps/web/src/i18n/locales/en.json` | 更新状态相关文案 |

## 验收标准

- [ ] 自己消息右对齐气泡，他人消息左对齐气泡
- [ ] 时间戳和状态在气泡右下角
- [ ] 对勾状态正确显示（sending/sent/delivered/read）
- [ ] reactions、thread、reply 等子组件在气泡内正常显示
- [ ] 已删除消息、emote 消息正确渲染
