# FEAT-023 实现联系人列表、新建对话和搜索增强

- **status**: done
- **priority**: P1
- **owner**: (未分配)
- **createdAt**: 2026-03-17

## 描述

实现通用 UI 功能：联系人列表、创建对话（DM / 群聊）、侧边栏交互增强。

验收标准：
- 联系人列表对话框：从已加入房间提取去重用户列表，支持搜索，可发起 DM
- 新建对话对话框：DM 模式（选择用户直接创建）和群聊模式（多选用户+群名创建）
- 支持搜索 Homeserver 用户目录（real 模式）和 mock 用户搜索
- 侧边栏标题栏添加「+」按钮（新建对话）、底部添加联系人按钮
- room-service 封装：createDmRoom、createGroupRoom、getKnownUsers、searchUsers
- 完整 mock 支持

## 进行时描述

正在实现联系人列表、新建对话和搜索增强

## 依赖

- **blocked by**: FEAT-005
- **blocks**: （无）

## 笔记

- DM 创建前检查已有 DM 房间，避免重复
- 用户搜索带 300ms debounce
- 群聊模式支持多选 + chips 显示
