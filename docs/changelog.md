# 变更日志

## 2026-03-18 [Phase 7 & 8: FEAT-027~045]

**Phase 7 — Core Chat Completion:**

- FEAT-027: Message editing — `m.replace` relation, edit mode in message input, "(edited)" indicator
- FEAT-028: Message deletion/recall — `redactEvent` API, redacted message placeholder in timeline
- FEAT-029: Message reply/quote — `m.in_reply_to` relation, reply preview in bubble, reply mode in input
- FEAT-030: @mention autocomplete — member list integration in message input (via member panel)
- FEAT-032: Create rooms (public/private) — `createRoom` service, CreateRoomDialog with visibility toggle
- FEAT-033: Join rooms — `joinRoom` + `searchPublicRooms` services, JoinRoomDialog with address/directory tabs
- FEAT-034: Leave rooms — `leaveRoom` service, leave button in room header
- FEAT-035: Member management — `member-service` with invite/kick/ban, power level checks
- FEAT-036: Member list panel — right side panel with avatar, role badges, action buttons

**Phase 8 — UX Enhancements:**

- FEAT-040: Message search — `search-service` with `searchRoomEvents`, search panel with highlighted results
- FEAT-041: Input drafts — `drafts-store` with localStorage persistence, auto-save/restore on room switch
- FEAT-042: Room settings — RoomSettingsDialog for name/topic editing with permission checks
- FEAT-043: Permission editor — `permission-service` for power levels read/write
- FEAT-045: Member sorting/filtering — filter input, sort by role/name, grouped display (Admin/Mod/Member)

**Infrastructure:**

- New stores: `drafts-store.ts`
- New services: `member-service.ts`, `search-service.ts`, `permission-service.ts`
- Updated stores: `messages-store.ts` (added `edited`, `redacted`, `replyTo`, `updateMessage`, `redactMessage`)
- Updated services: `message-service.ts` (added `editMessage`, `deleteMessage`, `sendReply`)
- Updated `sync-bridge.ts`: handle `m.replace` edits, `m.room.redaction` for messages
- New components: `create-room-dialog`, `join-room-dialog`, `room-settings-dialog`, `member-list-panel`, `message-search`
- Updated components: `message-bubble`, `message-actions`, `message-input`, `message-timeline`, `chat-layout`, `sidebar`
- i18n: added `message`, `room`, `member`, `ux` namespaces to en.json and zh-CN.json

## 2026-03-18 [FEAT-016, FEAT-017, FEAT-019, FEAT-020, FEAT-021]

**FEAT-019 扩展命令：**
- 新增 `/spoiler` 命令：发送剧透消息（`data-mx-spoiler` 属性），点击可显示
- 新增 `/html` 命令：发送原始 HTML 格式消息
- `markdown.ts` 允许 `data-mx-spoiler` 属性通过 DOMPurify 白名单
- `globals.css` 新增 spoiler 样式（隐藏文本 + 点击显示过渡动画）
- `message-content.tsx` 新增点击事件处理 spoiler 切换

**FEAT-020 PWA 与离线支持：**
- 新增 `vite-plugin-pwa` 配置（`registerType: 'prompt'`）
- 生成 `manifest.json`（standalone 模式、主题色、图标）
- 配置 Workbox：静态资源预缓存、Matrix API NetworkFirst 策略、媒体 CacheFirst 策略
- 新增 `pwa-update-prompt.tsx`：检测新版本并提示更新
- `index.html` 新增 PWA meta 标签和图标链接
- 新增 placeholder PWA 图标（192px / 512px）

**FEAT-021 推送通知：**
- 新增 `notifications.ts`：通知权限管理、通知设置持久化（zustand/persist）、新消息浏览器通知
- 新增 `use-notifications.ts` hook：订阅消息 store，对新消息触发通知（排除自己的消息和当前活跃房间）
- 新增设置面板 Notifications Tab：启用/禁用开关、权限状态显示
- 支持按房间静音配置

**FEAT-016 消息线程：**
- `TimelineMessage` 新增 `threadRootId`、`threadReplyCount`、`isThreadRoot` 字段
- 新增 `threads-store.ts`：管理线程消息时间线和当前活跃线程
- 新增 `thread-service.ts`：发送线程消息（`m.thread` relation）、加载线程时间线、更新回复计数
- `sync-bridge.ts` 识别 `m.thread` 关系，分流线程消息到 threads store
- `message-actions.tsx` 新增"Reply in thread"按钮
- `message-bubble.tsx` 显示线程回复计数指示器
- 新增 `thread-panel.tsx`：线程侧边面板（消息列表 + 回复输入框）
- `chat-layout.tsx` 集成线程面板

**FEAT-017 语音消息录制与播放：**
- 新增 `voice-recorder.tsx`：MediaRecorder API 录制（Opus/WebM）、实时波形可视化（Web Audio AnalyserNode）、时长显示、录制/取消/发送控制
- 新增 `voice-player.tsx`：音频播放/暂停、进度条（可点击跳转）、时长显示
- `message-input.tsx` 新增麦克风按钮（输入为空时显示），切换录制模式
- `media-message.tsx` 新增 `m.audio` 类型支持，渲染 VoicePlayer
- `upload-service.ts` 新增 `msgtype` 和 `info` 覆盖参数（支持 duration 等音频元数据）

## 2026-03-17 [FEAT-024, FEAT-025]

**FEAT-024 i18n 国际化支持：**
- 新增 `i18next` + `react-i18next` 依赖
- 新增 `apps/web/src/i18n/index.ts`：i18n 初始化，语言持久化到 localStorage
- 新增 `apps/web/src/i18n/locales/en.json` 和 `zh-CN.json`：约 200 个翻译键，覆盖所有 UI 文本
- 全量替换约 26 个组件中的硬编码英文字符串为 `t()` 调用
- 外观设置面板新增语言选择器（English / 简体中文）

**FEAT-025 自定义主题系统：**
- 新增 `apps/web/src/themes/types.ts`：ThemePreset 接口定义
- 新增 `apps/web/src/themes/presets.ts`：4 个内置主题（Default, Blue, Green, Rose）
- 新增 `apps/web/src/themes/index.ts`：主题注册中心，支持应用/清除/导入/导出/删除主题
- 修改 `apps/web/src/hooks/use-theme.ts`：切换 light/dark 模式后自动重新应用活跃主题预设
- 外观设置面板新增颜色主题选择网格、主题导入/导出按钮

## 2026-03-17 [FEAT-026]

**FEAT-026 邀请通知系统：**
- `RoomSummary` 新增 `membership` 字段（`'join' | 'invite'`），`extractSingleRoomSummary()` 读取 `room.getMyMembership()`
- `extractRoomSummaryFromClient` 过滤仅保留 join/invite 状态房间
- `sync-bridge.ts` 对 `invite` 成员状态使用 `upsertRoom` 替代全量同步
- 新增 `invite-panel.tsx`：铃铛按钮 + 邀请面板，每条邀请显示房间信息及接受/拒绝按钮，失败时显示错误信息
- `sidebar.tsx` Header 区域新增 `InviteBell` 组件，有未处理邀请时显示数量徽章
- `room-list.tsx` 过滤 `membership === 'invite'` 的房间，仅显示已加入的房间
- Mock 房间数据补充 `membership: 'join'` 字段

## 2026-03-17 [FEAT-022]

**FEAT-022 直聊（Direct Chat）创建：**
- 新增 `packages/matrix-client/src/services/room-service.ts`：`findExistingDirectRoom()` 检查已有 DM（先查 `m.direct` account data，再回退到 rooms store），`createDirectRoom()` 创建 DM 房间（`is_direct: true`，`Preset.TrustedPrivateChat`），自动更新 `m.direct` account data
- 新增 `apps/web/src/components/new-direct-chat-dialog.tsx`：弹窗对话框输入 Matrix 用户 ID（`@user:server.com` 格式校验），支持 Enter 提交、Escape 关闭、加载状态和错误提示
- 侧边栏 header 新增"新建聊天"按钮（SquarePen 图标），打开 DM 创建对话框
- 房间列表分组显示：Direct Messages（私聊）和 Rooms（群组）两个折叠分区，各自按最近活跃排序，带数量徽章
- 活跃房间 header 对 DM 房间显示"Direct message"替代"X members"

## 2026-03-17 [done]

FEAT-023 完成。实现联系人列表、新建对话和搜索增强。

**room-service（packages/matrix-client）：**
- `services/room-service.ts`：getKnownUsers（从已加入房间提取去重用户）、createDmRoom（查找已有 DM 或创建）、createGroupRoom、searchUsers（Homeserver 目录搜索）、extractNewRoomSummary
- `services/mock-room-service.ts`：8 个 mock 用户、mock 搜索、mock 房间 ID 生成

**联系人列表对话框：**
- `apps/web/src/components/contacts/contacts-dialog.tsx`：已知用户列表 + 搜索 + 点击发起 DM
- 侧边栏底部添加联系人按钮（Users 图标）

**新建对话对话框：**
- `apps/web/src/components/compose/new-chat-dialog.tsx`：DM / 群聊双模式 Tab 切换
- DM 模式：搜索用户 → 点击直接创建（复用已有 DM 房间）
- 群聊模式：输入群名 + 多选成员（chips 标签显示）→ 创建按钮
- 用户搜索支持 300ms debounce，同时搜索已知用户和 Homeserver 目录
- 侧边栏标题栏添加「+」按钮

FEAT-022 完成。实现统一设置 UI。

**设置对话框**：侧边栏底部新增齿轮图标按钮，点击打开模态设置对话框。左侧 Tab 导航，右侧内容区域，支持 Escape 键关闭。

**5 个设置面板**：
- 账户：用户 ID、Homeserver、连接状态徽章、Mock 模式标记、登出按钮
- 安全：集成已有的锁屏密码设置（PasswordSettings）和胁迫密码设置（DuressPasswordSettings）
- 加密：E2EE 状态概览（Crypto Module、Cross-Signing、Key Backup）、集成密钥备份设置（KeyBackupSetup）
- 外观：亮色/暗色/跟随系统三种主题切换，持久化到 localStorage，监听系统偏好变化
- 关于：应用版本（从 package.json 注入）、协议、框架信息

**技术细节**：
- `apps/web/src/components/settings/settings-dialog.tsx`：对话框主框架
- `apps/web/src/components/settings/panels/`：5 个面板组件
- Vite `define` 注入 `__APP_VERSION__`，类型声明在 `vite-env.d.ts`
- 无额外路由，无新依赖

---

## 2026-03-17 [done]

阶段 3 — 核心聊天全部完成（FEAT-007 ~ FEAT-011）。

**FEAT-007**：使用 TanStack Virtual 3.13 实现消息时间线虚拟滚动。支持可变高度消息、自动滚动到底部、历史消息分页加载、"新消息"滚动到底部按钮。组件：`message-timeline.tsx`。

**FEAT-008**：实现文本消息收发与 Markdown 渲染。使用 `marked` + `DOMPurify` 安全渲染 Markdown/HTML。乐观更新（sending → sent → failed）、失败重发。支持 `/me` emote 消息。组件：`message-bubble.tsx`、`message-content.tsx`、`message-input.tsx`。新增 `packages/matrix-client/src/stores/messages-store.ts`（消息状态管理）和 `services/message-service.ts`（发送/加载消息）。

**FEAT-009**：实现图片/视频/文件消息上传与展示。图片：缩略图显示 + Lightbox 全屏查看（`lightbox.tsx`）。视频：缩略图 + 内嵌播放器。文件：MIME 图标 + 文件名 + 大小 + 点击下载。统一上传流程：`services/upload-service.ts`（进度回调、mxc:// URI 转换）。组件：`media-message.tsx`。

**FEAT-010**：实现命令系统。注册表模式 9 个命令：/me, /nick, /topic, /invite, /kick, /ban, /join, /leave, /plain。`/` 触发命令面板自动补全（`command-panel.tsx`）。用户 ID 输入自动补全（`utils/user-id.ts`）。

**FEAT-011**：实现粘贴板图片（Ctrl/Cmd+V）与拖拽上传。拦截 paste/drop 事件，本地 Blob URL 预览，可添加说明/移除，确认后上传。组件：`upload-preview.tsx`。复用 FEAT-009 上传流程。

**依赖新增**：@tanstack/react-virtual、marked、dompurify、@tailwindcss/typography。

**Mock 模式增强**：新增 `mock-message-service.ts`（预设消息、模拟发送、自动回复），Mock 文件上传。

FEAT-012 + FEAT-013 + FEAT-014 + FEAT-018 完成。实现阶段 4（E2EE）、阶段 4.5（本地安全）和部分阶段 5（输入指示器）。

**FEAT-012 E2EE 配置与密钥管理 UI：**
- 添加 `@matrix-org/matrix-sdk-crypto-wasm` 依赖，`client-manager.ts` 中初始化 `initRustCrypto()`（失败时优雅降级）
- `packages/matrix-client/src/stores/crypto-store.ts`：Zustand store 追踪加密状态（初始化、交叉签名、密钥备份）
- `packages/matrix-client/src/sync/crypto-bridge.ts`：CryptoEvent 事件桥接（验证请求、密钥备份状态、密钥变更）
- `apps/web/src/components/crypto/`：加密徽章、设备验证对话框、密钥备份设置、未验证设备警告
- `RoomSummary` 新增 `isEncrypted` 字段，房间列表显示加密盾牌图标
- Vite WASM 配置（`optimizeDeps.exclude`）

**FEAT-013 锁屏密码与本地数据库加密：**
- `packages/matrix-client/src/crypto/dek-manager.ts`：DEK/KEK 两层密钥架构，Web Crypto API（AES-256-GCM、PBKDF2 600K 迭代）
- `packages/matrix-client/src/stores/lock-store.ts`：锁定状态 Zustand store，可配置空闲锁定超时
- `apps/web/src/pages/lock/lock-screen.tsx`：锁屏密码输入 UI，3 次失败清除数据，忘记密码确认流程
- `apps/web/src/components/settings/password-settings.tsx`：密码设置/修改/移除面板，空闲超时选择器
- `apps/web/src/app.tsx`：启动流程集成（DEK 初始化、锁屏拦截、自动锁定）

**FEAT-014 胁迫密码：**
- `packages/matrix-client/src/crypto/duress-manager.ts`：胁迫密码管理（独立 salt/hash、常量时间比较）
- `packages/matrix-client/src/crypto/wipe-service.ts`：静默擦除服务（localStorage、sessionStorage、IndexedDB、Service Worker、Cache Storage）
- `packages/matrix-client/src/crypto/password-verifier.ts`：统一密码验证（先正常 → 再胁迫 → 无效）
- `apps/web/src/components/settings/duress-password-settings.tsx`：胁迫密码设置 UI

**FEAT-018 输入指示器与在线状态：**
- `packages/matrix-client/src/stores/typing-store.ts` + `presence-store.ts`：Zustand 状态
- `packages/matrix-client/src/sync/typing-bridge.ts` + `presence-bridge.ts`：SDK 事件桥接
- `packages/matrix-client/src/services/typing-service.ts` + `presence-service.ts`：发送端服务（debounce、自动停止）
- `apps/web/src/components/chat/typing-indicator.tsx`：输入指示器 UI（动画省略号）
- `apps/web/src/components/ui/presence-dot.tsx`：在线状态指示点（绿/黄/灰）
- `apps/web/src/hooks/use-idle-detector.ts`：空闲检测 hook（可配置超时）
- 房间列表 DM 头像显示在线状态，聊天区域显示输入指示器

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
