# PLAN-001 Matrix Web 聊天客户端技术栈与项目结构

- **status**: approved
- **createdAt**: 2026-03-16 14:30
- **approvedAt**: 2026-03-16
- **relatedTask**: FEAT-001

---

## 1. 现状

### 1.1 Matrix 协议 SDK 生态

- **matrix-js-sdk v41.x** — 唯一生产就绪的全功能 JS/TS SDK。原生 TypeScript，E2EE 通过 Rust/WASM（`matrix-sdk-crypto-wasm`）实现，支持 sync、OIDC、MatrixRTC。npm 周下载量约 65K。
- **matrix-rust-sdk-wasm** — 完整 Rust SDK 的 Web 版本，处于实验阶段，尚未生产就绪。
- **matrix-bot-sdk** — 仅适用于 bot，不适合客户端。

### 1.2 现有客户端架构对比

| 客户端 | 框架 | 状态管理 | 构建工具 | E2EE | 关键经验 |
|--------|------|----------|----------|------|----------|
| Element Web | React 18 | 自定义 Flux | Webpack 5 | Rust crypto | 功能最全但架构老旧，内存泄漏 |
| Hydrogen | 自定义 MVVM | 自定义 observables | Vite | libolm（已弃用） | 内存效率最优，功能不完整 |
| Cinny | React 18 | Jotai + TanStack Query | Vite | Rust crypto | 现代 DX，架构参考价值最高 |

**关键发现：**
1. React + matrix-js-sdk 是经过验证的模式
2. Vite 已成为新客户端标配
3. Rust crypto（vodozemac）是标准方案；libolm 已弃用

---

## 2. 技术栈

### 2.1 核心选型

| 关注点 | 选型 | 版本 | 理由 |
|--------|------|------|------|
| 框架 | React | 19.2 | `useOptimistic` 用于消息发送，concurrent 渲染适合实时更新 |
| Matrix SDK | matrix-js-sdk | 41.1 | 唯一生产就绪选项；原生 TS，Rust crypto |
| 构建工具 | Vite | 8.0 | 亚秒级 HMR，原生 ESM |
| 语言 | TypeScript strict | 5.9 | discriminated unions + Zod 运行时校验 |
| 包管理器 | pnpm workspaces | - | 严格提升，无需 Turborepo |
| 路由 | React Router | 7.13 | hash / history 双模式，运行时 config.json 切换 |
| Lint / 格式化 | ESLint + @antfu/eslint-config | 10 / 7.7 | Flat config，@stylistic 格式化（无需 Prettier） |

### 2.2 状态管理

| 层 | 工具 | 版本 | 用途 |
|----|------|------|------|
| 客户端状态 | Zustand | 5.0 | UI 状态、草稿缓冲、输入指示器 |
| 服务端状态 | TanStack Query | 5.90 | 消息历史分页、在线状态、联系人 |
| Matrix 同步 | matrix-js-sdk 内置 | - | 长轮询 sync，IndexedDB 持久化 |

桥接层：轻量适配器，将 SDK EventEmitter 事件推送到 Zustand store，并使 TanStack Query 缓存失效。

### 2.3 UI 层

| 关注点 | 选型 | 版本 | 理由 |
|--------|------|------|------|
| 组件库 | shadcn/ui（Base UI 原语） | @base-ui/react 1.3 | 源码可控，无障碍，组件覆盖广，render prop API |
| CSS | Tailwind CSS | 4.2 | JIT，包体积小，样式与标记共置 |
| 虚拟滚动 | TanStack Virtual | 3.13 | 可变高度、反向滚动 |
| 图标 | Lucide React | 0.577 | tree-shake，与 shadcn/ui 一致 |

### 2.4 测试

| 层 | 工具 | 版本 |
|----|------|------|
| 单元 / 集成测试 | Vitest | 4.1 |
| 组件测试 | Vitest Browser Mode + Testing Library | - |
| HTTP/WS Mock | MSW | 2.12 |
| 端到端测试 | Playwright | 1.58 |
| 覆盖率目标 | 80%+ | - |

---

## 3. Monorepo 结构

```
matrix-web/
├── apps/
│   └── web/                  # 主 React 聊天客户端
├── packages/
│   ├── ui/                   # shadcn/ui 定制组件
│   ├── matrix-client/        # matrix-js-sdk 封装、stores、sync 桥接
│   ├── types/                # 共享 TypeScript 类型
│   └── config/               # tsconfig、eslint、vitest、tailwind 配置
├── docs/
├── pnpm-workspace.yaml
├── eslint.config.mjs
├── package.json
└── CLAUDE.md
```

**依赖方向：** `config` ← `types` ← `matrix-client` / `ui` ← `web`

**关键分离：**
- `packages/matrix-client` — 无 React 导入，隔离所有 SDK 交互，可独立测试
- `packages/ui` — 纯展示组件，独立于 Matrix 逻辑
- `apps/web` — 薄应用层，仅做路由和组装

---

## 4. 运行时配置

`public/config.json` — 构建时原样复制，运行时 fetch 加载，修改无需重新构建。

```jsonc
{
  "routerMode": "hash",           // "hash" | "history"
  "basePath": "/",                // 子路径部署
  "homeservers": {
    "default": "im.apfu.w.ee",    // 默认选中的 server name（对应 servers[].name）
    "servers": [
      { "name": "im.apfu.w.ee", "url": "https://im.apfu.w.ee" },
      { "name": "matrix.org", "url": "https://matrix.org" }
    ],
    "allowCustom": true,          // 允许用户手动输入自定义服务器地址
    "showSelector": true           // 在登录页/设置页显示服务器切换 UI
  },
  "lockIdleTimeout": 300,         // 锁屏空闲超时（秒），0 禁用
  "hideServerName": true,         // 隐藏当前 homeserver 的 server name
  "mockMode": false               // 开发环境启用 mock（生产环境始终 false）
}
```

**服务器配置场景：**

| 场景 | `servers` | `allowCustom` | `showSelector` | 效果 |
|------|-----------|---------------|----------------|------|
| 开放部署 | 多个 | `true` | `true` | 用户可选预置列表或手动输入 |
| 企业锁定 | 1 个 | `false` | `false` | 固定单一服务器，无切换入口 |
| 半开放 | 多个 | `false` | `true` | 仅可选预置列表，不可自定义 |

**与 `hideServerName` 联动：** 隐藏规则基于当前连接的 homeserver 的 server name，与 `servers` 列表大小无关。

---

## 5. Mock 开发系统

在无真实 Matrix 服务器的情况下进行前端开发和调试。

### 5.1 激活方式

- `config.json` 中设置 `"mockMode": true`
- URL 参数 `?mock=1`（覆盖 config.json 设置）

### 5.2 Mock Provider 架构

```
MatrixClientProvider (接口)
├── RealMatrixClientProvider  — 连接真实 homeserver
└── MockMatrixClientProvider  — 返回预设数据，模拟 sync 事件
```

- 所有组件通过 `MatrixClientProvider` 接口获取数据，不直接依赖 matrix-js-sdk
- Mock 实现提供：预置房间列表、消息历史、用户信息、在线状态
- Mock 支持模拟事件流：新消息、输入指示器、在线状态变更

### 5.3 与 Storybook 集成

- Storybook story 中使用 `MockMatrixClientProvider` 包装组件
- 每个 story 可提供不同的 mock 数据集（空房间、大量消息、离线状态等）

### 5.4 Mock 认证

- Mock 模式下任意用户名密码均可登录
- 返回预设 session（userId: `@mock-user:localhost`, deviceId: `MOCK_DEVICE`）
- 跳过真实 homeserver 连接

---

## 6. 端到端加密 (E2EE)

- matrix-js-sdk 通过 `matrix-sdk-crypto-wasm`（Rust/WASM）处理所有加密
- 密钥存储在 IndexedDB
- 加密操作已由 WASM 层优化，不阻塞 JS 主线程
- 无需单独引入 libsodium.js

---

## 7. 本地安全

### 7.1 两层密钥架构（DEK + KEK）

IndexedDB 数据**始终加密存储**；锁屏密码提供额外的访问保护层。

```
首次登录 → 生成随机 DEK (crypto.getRandomValues)
              │
              ├─→ 用 DEK 加密 IndexedDB (AES-256-GCM)
              └─→ DEK 存入 localStorage
                   ├─ 无锁屏密码：明文存储
                   └─ 有锁屏密码：用 KEK 加密后存储

设置锁屏密码 → 用户密码 + salt → PBKDF2 → KEK → 加密 DEK → 替换明文 DEK
```

| 密钥 | 说明 |
|------|------|
| **DEK** (Data Encryption Key) | 随机生成，直接加密 IndexedDB。始终存在，不因密码变更而变化 |
| **KEK** (Key Encryption Key) | 从锁屏密码 + PBKDF2 派生，加密 DEK。仅在设置密码后存在 |

**存储布局：**

| 存储项 | 位置 | 无密码时 | 有密码时 |
|--------|------|----------|----------|
| DEK | localStorage | 明文 | 被 KEK 加密 |
| salt | localStorage | 不存在 | 明文 |
| password verify hash | localStorage | 不存在 | PBKDF2 派生 |
| 加密后的数据 | IndexedDB | 用 DEK 加密 | 用 DEK 加密（不变） |

**关键优势：**
- 数据库始终加密，即使无密码也非明文
- DEK 持久化，关闭浏览器后无需重新同步
- 密码变更只需重新加密 DEK（秒级），无需重新加密数据库
- 渐进式安全：可随时启用/禁用锁屏密码

### 7.2 启动流程

```
应用启动
   │
   ├─ localStorage 有 DEK？
   │   ├─ 有 + 无密码标记 → 读取明文 DEK → 解密数据库 → 恢复会话
   │   ├─ 有 + 有密码标记 → 锁屏 → 输入密码 → 派生 KEK → 解密 DEK → 解密数据库
   │   └─ 无 → 首次使用 → 登录页
   │
   ▼
  MatrixClient 初始化 → sync
```

### 7.3 锁定触发（仅在设置了锁屏密码时生效）

- 用户手动锁定（快捷键或按钮）
- 空闲超时（可配置，默认 5 分钟）
- 锁定时：清除内存中的 DEK 明文 → 显示锁屏

### 7.4 锁屏密码操作

**设置：** 生成 salt → 密码 + salt → PBKDF2 → KEK → 加密 DEK → 写入 localStorage

**修改：** 旧密码 → 旧 KEK → 解密 DEK → 新密码 + 新 salt → 新 KEK → 重新加密 DEK（数据库无需重新加密）

**移除：** 验证密码 → KEK → 解密 DEK → 明文 DEK 写回 localStorage → 清除 salt 和 hash

**忘记密码：** 清除 localStorage + IndexedDB → 重新登录 → 服务器同步 → E2EE 密钥通过 key backup 恢复

### 7.5 胁迫密码（Duress Password）

用户在被胁迫解锁时，输入预设的胁迫密码，表面正常解锁，实际静默擦除全部本地数据。

**工作流程：**

```
锁屏 → 输入密码
   │
   ├─ 正常密码 → KEK → 解密 DEK → 正常解锁
   ├─ 胁迫密码 → 静默擦除：
   │     1. 显示「解锁中...」动画（伪装）
   │     2. 后台：停止 sync → 清除 DEK → 清除 IndexedDB →
   │        清除 localStorage → 清除 sessionStorage → 注销 SW 缓存
   │     3. 显示「会话已过期，请重新登录」
   └─ 都不匹配 → 密码错误
```

**设计要点：**
- 必须先设置锁屏密码才能启用
- 胁迫密码不能与正常密码相同
- 仅存储验证 hash（独立 salt），不存明文
- 验证顺序：先正常密码 → 再胁迫密码（防误触发）
- 纯本地操作，离线可触发
- 与正常密码共享错误次数限制

**存储：**

| 存储项 | 位置 | 说明 |
|--------|------|------|
| duress verify hash | localStorage | PBKDF2 派生，仅启用后存在 |
| duress salt | localStorage | 与正常密码使用不同 salt |

### 7.6 与 Matrix E2EE 的关系

- Matrix E2EE（Megolm）— 保护**传输中**的消息
- DEK 加密 — 保护**本地存储**的密钥和消息（始终生效）
- 锁屏密码 — 保护 **DEK 本身**（可选）
- 胁迫密码 — **紧急销毁**本地数据（可选）

---

## 8. 消息系统

### 8.1 消息类型

| Matrix msgtype | 本项目类型 | 说明 | 阶段 |
|----------------|-----------|------|------|
| `m.text` | `TextMessage` | 纯文本 / Markdown / HTML | 3 |
| `m.image` | `ImageMessage` | 图片（缩略图 + 原图） | 3 |
| `m.file` | `FileMessage` | 通用文件 | 3 |
| `m.video` | `VideoMessage` | 视频（缩略图 + 流式播放） | 3 |
| `m.audio` | `VoiceMessage` | 语音/音频（波形 + 进度条） | 5 |
| `m.emote` | `TextMessage` (subtype) | `/me` 动作消息 | 3 |
| `m.notice` | `SystemMessage` | 系统通知 | 3 |

### 8.2 图片消息

| 功能 | 设计 |
|------|------|
| 缩略图 | SDK 提供 `info.thumbnail_url`（`mxc://`），气泡默认显示缩略图 |
| 原图查看 | 点击 → Lightbox 全屏查看，支持缩放/平移 |
| 懒加载 | `IntersectionObserver` + `loading="lazy"` |
| 尺寸约束 | 最大宽度 400px，`info.w`/`info.h` 预计算占位（防布局跳动） |
| GIF | 自动播放，悬停显示暂停按钮 |
| 批量发送 | 一次选择/粘贴多张，逐一上传 |
| E2EE | SDK 透明处理加密附件 |

### 8.3 视频消息

| 功能 | 设计 |
|------|------|
| 缩略图 | `info.thumbnail_url`，无则显示视频首帧 + 播放按钮 |
| 播放 | 内嵌 `<video>` 播放器，支持暂停/进度/音量/全屏 |
| 流式播放 | `mxc://` → HTTP URL，无需完整下载 |
| 格式 | `video/mp4`、`video/webm`、`video/ogg` |
| 大文件 | 上传进度条 + 可取消 |

### 8.4 文件消息

| 功能 | 设计 |
|------|------|
| 渲染 | 文件卡片：MIME 图标 + 文件名 + 大小 |
| 下载 | 点击卡片下载，显示进度 |
| 预览 | PDF 可 Lightbox 内嵌预览，其他仅下载 |
| 大小限制 | 遵循 Homeserver `m.upload.size` 限制 |

### 8.5 语音消息（阶段 5）

波形图 + 播放控件。录制：MediaRecorder API → Opus/WebM。播放：Web Audio API。

### 8.6 统一上传流程

```
选择文件（文件选择器 / 粘贴 / 拖拽）
   │
   ├─ 校验：文件大小 < homeserver 限制
   ├─ 校验：MIME 类型 → 选择 msgtype
   ▼
本地预览（图片/视频缩略图，文件卡片）
   ├─ 可取消、可添加文字说明
   ▼
上传到 Matrix media repo（/_matrix/media/v3/upload）
   ├─ 进度条（XMLHttpRequest.upload.onprogress）
   ├─ E2EE 房间：SDK 加密（AES-CTR）
   ├─ 可取消（AbortController）
   ▼
获取 mxc:// URI → 发送消息事件
   ├─ 乐观更新：上传即显示（带发送中状态）
   └─ 失败重试：保留本地 Blob，支持重发
```

### 8.7 mxc:// URI 处理

- 下载：`/_matrix/media/v3/download/{serverName}/{mediaId}`
- 缩略图：`/_matrix/media/v3/thumbnail/{serverName}/{mediaId}?width=W&height=H&method=scale`
- SDK 辅助：`getHttpUriForMxcUri()`

---

## 9. 消息输入框

### 9.1 命令系统

输入 `/` 触发命令面板，注册表模式可扩展。

| 命令 | 说明 | 阶段 |
|------|------|------|
| `/me <action>` | 第三人称动作消息 | 3 |
| `/nick <name>` | 修改房间显示名 | 3 |
| `/topic <text>` | 设置房间主题 | 3 |
| `/invite <user>` | 邀请用户 | 3 |
| `/kick <user>` | 踢出用户 | 3 |
| `/ban <user>` | 封禁用户 | 3 |
| `/join <room>` | 加入房间 | 3 |
| `/leave` | 离开房间 | 3 |
| `/plain <text>` | 纯文本（不解析 Markdown） | 3 |
| `/spoiler <text>` | 剧透消息 | 5 |
| `/html <html>` | HTML 格式消息 | 5 |

命令接口：`{ name, description, args, execute }`

### 9.2 粘贴板图片

| 场景 | 行为 |
|------|------|
| `Ctrl/Cmd+V` 粘贴 | 拦截 paste 事件，提取 `image/*` |
| 拖拽到输入框 | 拦截 drop 事件，读取 `DataTransfer.files` |

流程：检测 → 本地 Blob URL 预览 → 可添加说明/移除/调整顺序 → 上传 → 发送 `m.image`

### 9.3 其他能力

- 多行输入（Shift+Enter 换行，Enter 发送）
- Markdown 实时预览（可选）
- @mention 自动补全（`@` 触发成员列表）
- Emoji 快捷输入（`:emoji_name:` 自动补全）

---

## 10. 用户 ID 显示与输入简化

### 10.1 概述

Matrix 用户 ID 格式为 `@localpart:servername`（如 `@aa:gg.im`）。当客户端连接单一 homeserver 时，`:servername` 部分是冗余信息。通过 `hideServerName` 配置，UI 显示和用户输入两端均可省略 server name。

### 10.2 显示规则

当 `config.json` 中 `hideServerName: true` 时：

| 场景 | 完整 ID | 显示 | 条件 |
|------|---------|------|------|
| 本 homeserver 用户 | `@aa:gg.im` | `@aa` | server name 与当前连接的 homeserver 一致 |
| 外部 homeserver 用户 | `@bb:other.org` | `@bb:other.org` | server name 不一致，始终完整显示 |
| tooltip / 详情面板 | 任意 | 完整 ID | 悬停或点击时始终显示完整 ID |

**应用位置：**
- 消息气泡发送者名称
- 房间成员列表
- @mention 标签
- 成员头像 tooltip
- 在线状态面板

### 10.3 输入简化

| 场景 | 用户输入 | 系统行为 |
|------|----------|----------|
| `/invite @aa` | 无 `:` | 自动补全为 `@aa:当前serverName` |
| `/invite @bb:other.org` | 有 `:` | 视为完整 ID，不做补全 |
| 搜索框输入 `aa` | 文本 | 同时匹配 localpart 和 displayName |
| @mention 输入 `@aa` | `@` 前缀 | 匹配当前房间成员，优先 localpart |

**规则：**
- 无 `:` 的 `@` 输入 → 自动追加 `:当前serverName`
- 有 `:` 的输入 → 视为完整 ID，原样使用
- 搜索同时匹配 localpart 和 displayName，不区分大小写

### 10.4 工具函数

`packages/matrix-client` 提供统一格式化函数：

```typescript
// user-id.ts
function formatUserId(userId: string, connectedServerName: string, hideServerName: boolean): string
// "@aa:gg.im" + "gg.im" + true  → "@aa"
// "@aa:gg.im" + "gg.im" + false → "@aa:gg.im"
// "@bb:other.org" + "gg.im" + true → "@bb:other.org"

function resolveUserId(input: string, connectedServerName: string): string
// "@aa"          + "gg.im" → "@aa:gg.im"
// "@bb:other.org" + "gg.im" → "@bb:other.org"
// "aa"           + "gg.im" → "@aa:gg.im"

function parseUserId(userId: string): { localpart: string; serverName: string }
// "@aa:gg.im" → { localpart: "aa", serverName: "gg.im" }
```

所有 UI 组件通过这些函数统一处理显示和输入，禁止组件内部直接拼接/截取 user ID。

### 10.5 实施阶段

归入**阶段 2**（登录后即可获取 server name）和**阶段 3**（消息展示和输入时生效）。

---

## 11. PWA 与离线

- `vite-plugin-pwa` + Workbox 管理 Service Worker
- Background Sync API 实现离线消息队列
- IndexedDB 本地消息缓存（通过 matrix-js-sdk）
- Web Push 推送通知

---

## 12. 关键工程决策

1. **matrix-js-sdk 而非自建 sync** — 免费获得 E2EE、房间状态和成员管理
2. **React 19 而非 SolidJS** — 生态优势，`useOptimistic` + concurrent 模式
3. **Zustand 而非 Jotai** — store slices 自然映射聊天领域，devtools 更简单
4. **Base UI 而非 Radix** — 组件覆盖更广，MUI 团队活跃维护，render prop API
5. **pnpm 不用 Turborepo** — 当前规模足够，需要时再引入
6. **React Router 7 双模式** — config.json 运行时切换，无需重新构建
7. **@antfu/eslint-config 而非 Biome** — 插件生态更可定制，@stylistic 替代 Prettier
8. **Sync 不放 Web Worker** — SDK 对象不可序列化、E2EE 耦合、IndexedDB 单实例约束。crypto 已 WASM 化，sync 轻量，瓶颈在渲染层。优化优先级：虚拟滚动 > concurrent 渲染 > requestIdleCallback > Worker（仅限部分计算卸载）

---

## 13. 风险

| 风险 | 严重度 | 缓解措施 |
|------|--------|----------|
| matrix-js-sdk API 不稳定 | 中 | 锁定主版本号，参照 Element Web 升级模式 |
| WASM 加密包体积（~800KB） | 中 | 懒加载加密模块，代码分割 |
| matrix-js-sdk sync 在主线程 | 低 | crypto 已 WASM 化；优化优先级见第 12 节 |
| TanStack Virtual 反向滚动 | 低 | 已有成熟方案和文档示例 |
| React 19 成熟度 | 低 | 自 2024年12月稳定发布 |

---

## 14. 实施阶段

| 阶段 | 内容 |
|------|------|
| **1** | 项目脚手架搭建、monorepo 配置、开发工具链、Mock 系统、Storybook |
| **2** | 认证（登录/注册）、Matrix 客户端连接 |
| **3** | 房间列表、时间线、消息收发（命令系统、粘贴板图片、图片/文件/视频消息） |
| **4** | E2EE 配置、密钥管理 UI |
| **4.5** | 锁屏密码、本地数据库加密、胁迫密码 |
| **5** | 表情回复、线程、语音消息录制、输入指示器、更多命令扩展 |
| **6** | PWA、离线支持、推送通知 |

---

## 15. 备选方案

### Vue 3 + Pinia
可行但 matrix-js-sdk 示例以 React 为主，聊天相关库更少，增加集成摩擦。

### SolidJS + 自定义状态
最佳原始性能，但生态薄弱，无 `useOptimistic` 等价物。

### Fork Cinny
省去基础工作，但继承 Cinny 的设计决策，难以大幅偏离。
