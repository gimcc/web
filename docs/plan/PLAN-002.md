# PLAN-002 配置 Storybook 与 shadcn/ui 组件开发环境

- **status**: completed
- **createdAt**: 2026-03-16 20:00
- **approvedAt**: 2026-03-16 20:30
- **relatedTask**: INFRA-003

## 现状

`packages/ui` 目前仅有空的 `src/index.ts`，无任何 UI 组件或样式基础设施。PLAN-001 规定 UI 层使用 shadcn/ui（Base UI 原语）+ Tailwind CSS 4.2。

shadcn CLI v4 已支持：
- `--base base-ui` 选择 Base UI 作为原语层
- `--monorepo` monorepo 模式（自动检测 workspace）
- Tailwind CSS 4（`@theme inline` + OKLCH 色彩空间）

## 方案

### 1. 初始化 shadcn/ui

在 `packages/ui` 目录下运行 CLI 初始化：

```bash
cd packages/ui
pnpm dlx shadcn@latest init --base base-ui
```

CLI 自动生成：
- `components.json` — CLI 配置（style、aliases、Base UI 选择）
- `src/styles/globals.css` — Tailwind 导入 + CSS 变量主题（OKLCH）
- `src/lib/utils.ts` — `cn()` 工具函数（clsx + tailwind-merge）

在 `apps/web` 目录下也需要 `components.json`，指向 `packages/ui` 的样式和工具：

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "tsx": true,
  "rsc": false,
  "tailwind": {
    "config": "",
    "css": "../../packages/ui/src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "ui": "@matrix-web/ui/components",
    "utils": "@matrix-web/ui/lib/utils",
    "hooks": "@matrix-web/ui/hooks",
    "lib": "@matrix-web/ui/lib"
  }
}
```

### 2. 安装依赖

`packages/ui` 中安装：
- `tailwindcss`（v4.2）、`tw-animate-css`
- `@base-ui-components/react`
- `class-variance-authority`、`clsx`、`tailwind-merge`
- `lucide-react`
- `react`、`react-dom`（peerDependencies）

### 3. 更新 packages/ui 的 exports

```json
{
  "exports": {
    ".": { "types": "./src/index.ts", "import": "./src/index.ts" },
    "./components/*": "./src/components/*.tsx",
    "./lib/*": "./src/lib/*.ts",
    "./hooks/*": "./src/hooks/*.ts",
    "./styles/*": "./src/styles/*.css"
  }
}
```

### 4. apps/web 入口导入样式

在 `apps/web/src/main.tsx` 中添加：
```typescript
import '@matrix-web/ui/styles/globals.css'
```

### 5. Storybook 配置（仅业务组件）

在 `packages/ui` 中安装 devDependencies：
- `storybook`、`@storybook/react-vite`、`@storybook/addon-essentials`、`@storybook/addon-themes`

创建 `packages/ui/.storybook/`：
- `main.ts` — framework: react-vite，stories: `../src/**/*.stories.tsx`
- `preview.ts` — 导入 globals.css，配置亮色/暗色主题切换 decorator

> Storybook **不用于** shadcn/ui 基础组件。仅用于自定义业务组件（聊天气泡、消息时间线等）。

### 6. 示例业务组件 Story

创建 Avatar 业务组件验证 Storybook 环境：
- `src/components/avatar/avatar.tsx` — 用户头像（首字母/图片）
- `src/components/avatar/avatar.stories.tsx` — 不同尺寸、亮/暗主题

### 7. 脚本配置

`packages/ui/package.json`：
- `"storybook": "storybook dev -p 6006"`
- `"build-storybook": "storybook build"`

根 `package.json`：
- `"storybook": "pnpm --filter @matrix-web/ui storybook"`

### 8. 文件变更清单

| 文件 | 操作 |
|------|------|
| `packages/ui/package.json` | 添加依赖、脚本、更新 exports |
| `packages/ui/components.json` | shadcn CLI 生成 |
| `packages/ui/src/styles/globals.css` | shadcn CLI 生成 |
| `packages/ui/src/lib/utils.ts` | shadcn CLI 生成 |
| `packages/ui/.storybook/main.ts` | 新建 |
| `packages/ui/.storybook/preview.ts` | 新建 |
| `packages/ui/src/components/avatar/avatar.tsx` | 新建 |
| `packages/ui/src/components/avatar/avatar.stories.tsx` | 新建 |
| `packages/ui/src/index.ts` | 导出组件和工具 |
| `apps/web/components.json` | 新建（monorepo 配置） |
| `apps/web/src/main.tsx` | 导入全局样式 |
| `package.json`（根） | 添加 storybook 脚本 |

## 风险

- shadcn CLI 自动检测可能需要手动调整 monorepo 路径。低风险，手动补全即可。
- Storybook 8 + Tailwind CSS 4 兼容性已验证，低风险。

## 工作量

小型变更。约 12 个文件新增/修改，其中 3 个由 CLI 自动生成。

## 备选方案

- 完全手动配置不用 shadcn CLI：更可控但容易遗漏 CSS 变量和主题配置。
- 不用 Storybook：业务组件直接在应用中调试，缺少独立预览环境。

## 批注

（待审批）
