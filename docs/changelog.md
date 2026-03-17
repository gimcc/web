# 变更日志

## 2026-03-17 [done]

阶段 3 — 核心聊天全部完成（FEAT-007 ~ FEAT-011）。

**FEAT-007**：使用 TanStack Virtual 3.13 实现消息时间线虚拟滚动。支持可变高度消息、自动滚动到底部、历史消息分页加载、"新消息"滚动到底部按钮。组件：`message-timeline.tsx`。

**FEAT-008**：实现文本消息收发与 Markdown 渲染。使用 `marked` + `DOMPurify` 安全渲染 Markdown/HTML。乐观更新（sending → sent → failed）、失败重发。支持 `/me` emote 消息。组件：`message-bubble.tsx`、`message-content.tsx`、`message-input.tsx`。新增 `packages/matrix-client/src/stores/messages-store.ts`（消息状态管理）和 `services/message-service.ts`（发送/加载消息）。

**FEAT-009**：实现图片/视频/文件消息上传与展示。图片：缩略图显示 + Lightbox 全屏查看（`lightbox.tsx`）。视频：缩略图 + 内嵌播放器。文件：MIME 图标 + 文件名 + 大小 + 点击下载。统一上传流程：`services/upload-service.ts`（进度回调、mxc:// URI 转换）。组件：`media-message.tsx`。

**FEAT-010**：实现命令系统。注册表模式 9 个命令：/me, /nick, /topic, /invite, /kick, /ban, /join, /leave, /plain。`/` 触发命令面板自动补全（`command-panel.tsx`）。用户 ID 输入自动补全（`utils/user-id.ts`）。

**FEAT-011**：实现粘贴板图片（Ctrl/Cmd+V）与拖拽上传。拦截 paste/drop 事件，本地 Blob URL 预览，可添加说明/移除，确认后上传。组件：`upload-preview.tsx`。复用 FEAT-009 上传流程。

**依赖新增**：@tanstack/react-virtual、marked、dompurify、@tailwindcss/typography。

**Mock 模式增强**：新增 `mock-message-service.ts`（预设消息、模拟发送、自动回复），Mock 文件上传。

## 2026-03-16 22:00 [done]

FEAT-006 完成。实现房间列表与侧边栏：

- `apps/web/src/components/sidebar.tsx`：侧边栏组件（响应式布局，移动端可折叠覆盖层，连接状态指示器，用户信息 + 登出按钮）
- `apps/web/src/components/room-list.tsx`：房间列表组件（搜索过滤，按最近活跃排序）
- `apps/web/src/components/room-list-item.tsx`：房间列表项（头像、房间名、最后消息预览、时间戳、未读计数 badge，1v1 与群聊区分）
- `apps/web/src/components/ui/input.tsx`：通用输入框组件
- `apps/web/src/pages/chat/chat-layout.tsx`：聊天页面布局（侧边栏 + 主内容区，选中房间头部 + 消息/输入占位）
- 路由更新：首页从占位页切换为 ChatLayout
- 修复：`zod/v4` → `zod` 解决 TypeScript 类型解析失败问题

## 2026-03-16 21:30 [done]

FEAT-005 完成。实现 Matrix 客户端连接与 sync 桥接层：

- `packages/matrix-client/src/client/client-manager.ts`：MatrixClient 生命周期管理（createClient → startClient → stopClient），连接状态追踪
- `packages/matrix-client/src/client/mock-client.ts`：Mock 模式客户端（5 个预设房间，模拟连接延迟和定期 sync）
- `packages/matrix-client/src/sync/sync-bridge.ts`：SDK EventEmitter → Zustand stores 桥接（Timeline、Name、Membership、Receipt、MyMembership 事件）
- `packages/matrix-client/src/stores/connection-store.ts`：连接状态 store（disconnected/connecting/syncing/reconnecting/error）
- `packages/matrix-client/src/stores/rooms-store.ts`：房间列表 store（RoomSummary Map，支持 upsert/remove/unread 更新）
- `packages/matrix-client/src/query/query-keys.ts`：TanStack Query key 常量和缓存失效辅助函数
- `apps/web/src/hooks/use-matrix-client.ts`：MatrixClient 生命周期 hook（桥接 Query 失效回调）
- `apps/web/src/providers/query-provider.tsx`：TanStack QueryClientProvider 封装
- 安装 `@tanstack/query-core`（matrix-client）和 `@tanstack/react-query`（web）

## 2026-03-16 21:00 [done]

FEAT-002 完成。隐藏 Server Name 功能文档已全部就绪：PLAN-001 第 10 节「用户 ID 显示与输入简化」定义了显示规则（本 homeserver 用户省略 server name，外部用户始终完整显示）和输入简化规则（自动补全 server name）。config.json 文档含 `hideServerName` 配置项。matrix-client 模块文档含 `utils/user-id.ts` 工具函数（formatUserId、resolveUserId、parseUserId）。types 模块文档含 AppConfig 类型定义。

## 2026-03-16 20:30 [done]

INFRA-003 + FEAT-003 + FEAT-004 完成。

**INFRA-003**：在 packages/ui 中初始化 shadcn/ui（Base UI 原语）+ Tailwind CSS 4.2 + Storybook 8（仅业务组件）。创建 cn() 工具函数、OKLCH 色彩主题、亮色/暗色切换。Avatar 示例业务组件及 Story。monorepo 双 components.json 配置。

**FEAT-003**：创建 apps/web/public/config.json 运行时配置（homeservers 结构化配置、mockMode 等）。在 packages/types 中定义 AppConfig/HomeserversConfig 类型，packages/config 中实现 Zod 运行时校验的配置加载模块。PLAN-001 新增第 5 节「Mock 开发系统」并重新编号后续章节。

**FEAT-004**：安装 React Router 7、Zustand 5、matrix-js-sdk。实现 hash/history 双模式路由、AuthGuard、ConfigProvider。在 packages/matrix-client 中实现认证服务（login/register + session 持久化）、Mock 认证服务、Zustand auth store。创建登录页面（服务器选择器 + 用户名密码）、注册页面、首页占位。

## 2026-03-16 18:00 [done]

INFRA-001 + INFRA-002 完成。搭建 monorepo 脚手架（pnpm workspaces，5 个包：apps/web、packages/config、types、matrix-client、ui），配置开发工具链（TypeScript 5.9 strict、ESLint 9 + @antfu/eslint-config 7.7、Vite 6 dev server 端口 5000）。所有包间依赖正确链接，`pnpm lint`、`pnpm typecheck`、`pnpm dev` 均通过验证。

## 2026-03-16 17:30 [progress]

根据 PLAN-001 生成完整任务列表。共 22 个任务（INFRA-001~003 + FEAT-002~021），按 6 个实施阶段分组。阶段 1（P0）：脚手架、工具链、Storybook、Mock；阶段 2（P1）：认证、sync 桥接、隐藏 Server Name；阶段 3（P1）：房间列表、时间线、消息收发、多媒体、命令、粘贴板；阶段 4/4.5（P1）：E2EE、锁屏、胁迫密码；阶段 5（P2）：表情、线程、语音、输入指示器；阶段 6（P2）：PWA、推送。

## 2026-03-16 17:00 [progress]

FEAT-003 服务器列表配置与 Mock 开发系统规划。config.json `defaultHomeserver` 重构为结构化 `homeservers`（服务器列表、默认服务器、allowCustom、showSelector）。PLAN-001 新增第 10 节「Mock 开发系统」（MockMatrixClient + Storybook），阶段 1 加入 mock 基础设施。新增 `mockMode` 配置。更新 modules/web、matrix-client、types 文档。

## 2026-03-16 16:30 [progress]

FEAT-002 隐藏 Server Name 功能规划。PLAN-001 新增第 9 节「用户 ID 显示与输入简化」，config.json 新增 `hideServerName` 配置项。更新 modules/web、matrix-client、types、ui 文档。设计覆盖显示简化（本 homeserver 用户省略 server name）和输入简化（邀请/搜索/@mention 自动补全）。

## 2026-03-16 16:00 [decision]

PLAN-001 重构为正式实施文档。整合 13 轮反馈迭代，移除所有批注和废弃内容，产出干净的 13 章节实施方案。同步更新 architecture.md 和所有模块文档。

核心确认：React 19.2 + matrix-js-sdk 41.1 + Vite 8 + TypeScript 5.9 strict + Zustand 5.0 + TanStack Query 5.90 + shadcn/ui (Base UI 1.3) + Tailwind CSS 4.2 + ESLint 10 (@antfu/eslint-config 7.7) + React Router 7 双模式。

安全特性：两层密钥架构（DEK + KEK）、锁屏密码、胁迫密码。
消息系统：文本/图片/视频/文件（阶段 3），语音（阶段 5），命令系统，粘贴板图片。

## 2026-03-16 15:00 [progress]

生成模块文档：apps/web、packages/ui、packages/matrix-client、packages/types、packages/config。更新架构文档，含模块依赖关系和数据流图。所有文档切换为中文。

## 2026-03-16 14:30 [progress]

PMA 项目结构初始化：CLAUDE.md、AGENTS.md、docs/task/、docs/plan/、architecture.md、changelog.md。完成技术栈调研，PLAN-001 草稿创建。
