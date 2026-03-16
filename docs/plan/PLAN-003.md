# PLAN-003 服务器列表配置与 Mock 开发系统

- **status**: completed
- **createdAt**: 2026-03-16 20:00
- **approvedAt**: 2026-03-16 20:30
- **relatedTask**: FEAT-003

## 现状

PLAN-001 第 6 节定义了 `public/config.json` 的运行时配置结构，已包含 `homeservers` 字段设计：

```json
{
  "homeservers": {
    "default": "matrix.org",
    "servers": [
      { "name": "matrix.org", "url": "https://matrix.org" }
    ],
    "allowCustom": true,
    "showSelector": true
  },
  "mockMode": false
}
```

FEAT-003 要求：
1. 在 `apps/web/public/` 创建 `config.json` 实现上述配置
2. 在 `packages/config` 中添加配置加载和类型定义
3. 在 `packages/types` 中添加配置相关类型
4. 在 PLAN-001 中补充 Mock 系统设计章节
5. 更新模块文档

## 方案

### 1. 创建运行时配置文件

`apps/web/public/config.json`：

```json
{
  "routerMode": "hash",
  "basePath": "/",
  "homeservers": {
    "default": "matrix.org",
    "servers": [
      {
        "name": "matrix.org",
        "url": "https://matrix.org"
      }
    ],
    "allowCustom": true,
    "showSelector": true
  },
  "hideServerName": false,
  "lockIdleTimeout": 300,
  "mockMode": false
}
```

### 2. 配置类型定义

在 `packages/types/src/config.ts` 中定义：

```typescript
export interface HomeserverEntry {
  name: string
  url: string
}

export interface HomeserversConfig {
  default: string
  servers: HomeserverEntry[]
  allowCustom: boolean
  showSelector: boolean
}

export interface AppConfig {
  routerMode: 'hash' | 'history'
  basePath: string
  homeservers: HomeserversConfig
  hideServerName: boolean
  lockIdleTimeout: number
  mockMode: boolean
}
```

### 3. 配置加载模块

在 `packages/config/src/runtime.ts` 中：
- `loadConfig()` — fetch `/config.json`，解析并校验，返回 `AppConfig`
- 使用 Zod schema 做运行时校验（需安装 zod 依赖）

### 4. Mock 系统设计文档

在 PLAN-001 中新增第 6.5 节「Mock 开发系统」：
- Mock Provider 接口：`MatrixClientProvider` 接口，生产实现连接真实服务器，Mock 实现返回预设数据
- Mock 数据：预置房间、消息、用户数据
- 激活方式：`config.json` 中 `mockMode: true` 或 URL 参数 `?mock=1`
- 与 Storybook 集成：Story 中使用 MockProvider 包装组件

### 5. 文件变更清单

| 文件 | 操作 |
|------|------|
| `apps/web/public/config.json` | 新建 |
| `packages/types/src/config.ts` | 新建 |
| `packages/types/src/index.ts` | 导出 config 类型 |
| `packages/config/src/runtime.ts` | 新建 |
| `packages/config/src/index.ts` | 导出 runtime |
| `packages/config/package.json` | 添加 zod 依赖，更新 exports |
| `docs/plan/PLAN-001.md` | 新增 Mock 系统章节 |
| `docs/modules/config.md` | 更新运行时配置文档 |
| `docs/modules/types.md` | 更新类型文档 |

## 风险

- Zod 引入额外依赖：约 14KB gzip，但提供强大的运行时校验。可接受。
- config.json 在运行时加载可能有短暂延迟：使用 loading 状态处理即可。

## 工作量

中型变更。约 9 个文件新增/修改，含文档更新。

## 备选方案

- 不用 Zod，手写校验：减少依赖但校验代码冗长且易出错。
- 编译时配置（环境变量）：不支持运行时切换，不符合 PLAN-001 设计。

## 批注

（待审批）
