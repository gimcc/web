# PLAN-004 实现登录/注册页面与认证流程

- **status**: completed
- **createdAt**: 2026-03-16 20:00
- **approvedAt**: 2026-03-16 20:30
- **relatedTask**: FEAT-004

## 现状

项目尚无任何页面路由或认证逻辑。PLAN-001 规定：
- 路由：React Router 7（hash/history 双模式，由 config.json `routerMode` 控制）
- 状态管理：Zustand 5.0（客户端状态）
- UI：Tailwind CSS 4.2 + Base UI 原语
- 认证：matrix-js-sdk 的 `createClient` + `loginWithPassword`

FEAT-004 依赖 FEAT-003（config.json 中的 homeservers 配置和 Mock 支持）。

## 方案

### 1. 安装核心依赖

在 `apps/web`：
- `react-router`（v7）
- `zustand`（v5）

在 `packages/matrix-client`：
- `matrix-js-sdk`

### 2. 路由系统

`apps/web/src/router.tsx`：
- 根据 `config.routerMode` 创建 hash 或 browser router
- 路由表：`/login`、`/register`、`/`（主页，需认证）
- `AuthGuard` 组件：未登录重定向到 `/login`

### 3. 认证状态管理

`packages/matrix-client/src/auth/`：
- `auth-store.ts` — Zustand store：`{ isAuthenticated, userId, accessToken, homeserver, login(), logout(), restoreSession() }`
- `auth-service.ts` — 封装 matrix-js-sdk 认证 API：`login(homeserver, username, password)`、`register()`
- Session 持久化：登录成功后将 `accessToken`、`userId`、`homeserver`、`deviceId` 存入 localStorage

### 4. Mock 认证

`packages/matrix-client/src/auth/mock-auth-service.ts`：
- Mock 模式下：任意用户名密码均可登录，返回预设 session
- 与真实 `auth-service` 实现相同接口

### 5. 登录页面 UI

`apps/web/src/pages/login/`：
- `login-page.tsx` — 登录页面主组件
  - 服务器选择器（受 `showSelector`/`allowCustom` 控制）：下拉选择预置服务器，或输入自定义服务器地址
  - 用户名/密码输入框
  - 登录按钮（loading 状态）
  - 错误提示（网络错误、密码错误、服务器不可达）
  - 「注册」链接跳转
- `server-selector.tsx` — 服务器选择组件
  - `showSelector=false`：隐藏，使用默认服务器
  - `allowCustom=false`：仅显示预置列表
  - `allowCustom=true`：允许输入自定义地址

### 6. 注册页面 UI

`apps/web/src/pages/register/`：
- `register-page.tsx` — 注册页面
  - 服务器选择器（复用）
  - 用户名/密码/确认密码
  - 注册按钮
  - 错误提示
  - 「已有账号？登录」链接

### 7. 应用入口改造

`apps/web/src/app.tsx`：
- 包装 `RouterProvider`
- 添加 `ConfigProvider`（加载 config.json）
- 添加 session 恢复逻辑（启动时检查 localStorage）

### 8. 文件变更清单

| 文件 | 操作 |
|------|------|
| `apps/web/package.json` | 添加 react-router、zustand |
| `packages/matrix-client/package.json` | 添加 matrix-js-sdk |
| `apps/web/src/app.tsx` | 重构为路由入口 |
| `apps/web/src/router.tsx` | 新建 |
| `apps/web/src/pages/login/login-page.tsx` | 新建 |
| `apps/web/src/pages/login/server-selector.tsx` | 新建 |
| `apps/web/src/pages/register/register-page.tsx` | 新建 |
| `apps/web/src/components/auth-guard.tsx` | 新建 |
| `apps/web/src/providers/config-provider.tsx` | 新建 |
| `packages/matrix-client/src/auth/auth-store.ts` | 新建 |
| `packages/matrix-client/src/auth/auth-service.ts` | 新建 |
| `packages/matrix-client/src/auth/mock-auth-service.ts` | 新建 |
| `packages/matrix-client/src/index.ts` | 导出 auth 模块 |

## 风险

- matrix-js-sdk 包体积较大（~2MB）：使用 tree-shaking 和按需导入缓解。
- matrix-js-sdk 认证 API 可能因 homeserver 版本差异行为不同：做好错误处理和兜底。
- 注册流程可能需要 CAPTCHA 或 email 验证（取决于 homeserver 配置）：首期仅支持密码注册，后续迭代增强。

## 工作量

中大型变更。约 13 个文件新增/修改。涉及路由、状态管理、API 封装和 UI 组件。

## 备选方案

- 使用 TanStack Router 替代 React Router：API 更类型安全，但生态成熟度不如 React Router，且 PLAN-001 已确定使用 React Router 7。

## 批注

（待审批）
