# PLAN-014 实现 SSSS（安全秘密存储与共享）

- **status**: draft
- **createdAt**: 2026-03-21 10:00
- **approvedAt**: (待审批)
- **relatedTask**: FEAT-088

## 现状

### 已实现
- `initRustCrypto()` 初始化 Rust WASM 加密引擎 (`client-manager.ts:69`)
- `crypto-bridge.ts` 监听 `CryptoEvent.KeyBackupStatus/KeysChanged` 并更新 `crypto-store`
- `crypto-store.ts` 追踪 `isInitialized`、`crossSigningReady`、`keyBackupEnabled` 状态
- `key-backup-setup.tsx` 提供基础密钥备份创建/恢复 UI（`resetKeyBackup`/`checkKeyBackupAndEnable`）
- `recovery-key-display-dialog.tsx` 展示恢复密钥（复制/下载）
- `encryption-panel.tsx` 展示加密状态概览
- i18n 已有 `recovery_key.*` 翻译键（en.json 完整，zh-CN.json 缺失）

### 未实现
- `createClient()` 未传入 `cryptoCallbacks`（无 `getSecretStorageKey`/`cacheSecretStorageKey` 回调）
- 未调用 `crypto.bootstrapSecretStorage()` — SSSS 完全缺失
- 未调用 `crypto.bootstrapCrossSigning()` — 交叉签名密钥未主动创建
- 无 secret storage 服务层
- 无 secret storage 设置/重置 UI 流程
- `crypto-store` 无 `secretStorageReady` 状态

### 涉及文件

| 文件 | 改动类型 |
|------|---------|
| `packages/matrix-client/src/services/secret-storage-service.ts` | 新建 |
| `packages/matrix-client/src/client/client-manager.ts` | 修改 |
| `packages/matrix-client/src/stores/crypto-store.ts` | 修改 |
| `packages/matrix-client/src/sync/crypto-bridge.ts` | 修改 |
| `packages/matrix-client/src/index.ts` | 修改 |
| `apps/web/src/components/crypto/secret-storage-setup-dialog.tsx` | 新建 |
| `apps/web/src/components/crypto/key-backup-setup.tsx` | 修改 |
| `apps/web/src/components/settings/panels/encryption-panel.tsx` | 修改 |
| `apps/web/src/i18n/locales/en.json` | 修改 |
| `apps/web/src/i18n/locales/zh-CN.json` | 修改 |

## 方案

### 1. Secret Storage 服务 (`secret-storage-service.ts`)

核心服务层，封装 matrix-js-sdk 的 SSSS API：

```typescript
// 临时缓存 secret storage key（bootstrap 期间和后续 SDK 回调使用）
let cachedKey: { keyId: string, key: Uint8Array } | null = null

// CryptoCallbacks.cacheSecretStorageKey — SDK 创建新 key 时调用
export function cacheSecretStorageKey(keyId, keyInfo, key): void

// CryptoCallbacks.getSecretStorageKey — SDK 需要访问 secret storage 时调用
// 1. 先查缓存；2. 缓存未命中则通过 store resolver 弹出 UI 让用户输入
export async function getSecretStorageKey(opts, name): Promise<[string, Uint8Array] | null>

// 设置 secret storage（生成随机 recovery key）
export async function setupSecretStorage(opts?): Promise<string>

// 使用密码短语设置 secret storage
export async function setupSecretStorageWithPassphrase(passphrase, opts?): Promise<string>

// 重置 secret storage（强制新建，含新密钥备份）
export async function resetSecretStorage(): Promise<string>

// 检查 secret storage 是否就绪
export async function checkSecretStorageStatus(): Promise<boolean>
```

关键设计：`getSecretStorageKey` 回调通过 `useCryptoStore.requestSecretStorageKey()` 桥接 UI，将 `Promise resolve` 存入 store，UI 组件读取后让用户输入 key/passphrase，输入完成后 resolve。

### 2. 注入 CryptoCallbacks (`client-manager.ts`)

在 `createClient()` 调用中添加：

```typescript
import { cacheSecretStorageKey, getSecretStorageKey } from '../services/secret-storage-service'

const client = createClient({
  // ... 现有参数
  cryptoCallbacks: {
    getSecretStorageKey,
    cacheSecretStorageKey,
  },
})
```

### 3. 扩展 Crypto Store (`crypto-store.ts`)

新增字段和方法：

```typescript
// 新增状态
secretStorageReady: boolean
secretStorageKeyRequest: {
  keys: Record<string, unknown>
  resolve: (result: [string, Uint8Array] | null) => void
} | null

// 新增方法
setSecretStorageReady: (ready: boolean) => void
requestSecretStorageKey: (keys, resolve) => void
clearSecretStorageKeyRequest: () => void
```

### 4. 更新 Crypto Bridge (`crypto-bridge.ts`)

- 初始化时调用 `crypto.isSecretStorageReady()` 更新 store
- `onKeysChanged` 中刷新 secret storage 状态

### 5. Secret Storage Setup Dialog (`secret-storage-setup-dialog.tsx`)

UI 流程：
1. 两个 Tab：「Recovery Key」和「Passphrase」
2. Recovery Key 模式：点击 → 调用 `setupSecretStorage()` → 弹出 `RecoveryKeyDisplayDialog`
3. Passphrase 模式：输入 + 确认（>= 8 字符）→ 调用 `setupSecretStorageWithPassphrase()` → 弹出 `RecoveryKeyDisplayDialog`
4. 重置模式（已设置时）：确认对话框 → 调用 `resetSecretStorage()` → 弹出新 recovery key

### 6. 更新 Encryption Panel

- 新增「Secret Storage」状态行（使用现有 `CryptoStatusRow`）
- 未设置时：显示「Set Up」按钮 → 打开 setup dialog
- 已设置时：显示「Reset」按钮

### 7. 更新 Key Backup Setup

- 当 SSSS 已就绪时，`handleCreateBackup` 改用带 SSSS 的流程
- 确保密钥备份恢复密钥存入 secret storage

### 8. i18n 更新

en.json 新增：
```json
"secret_storage": {
  "title": "Secret Storage",
  "description": "...",
  "ready": "Secret storage is set up...",
  "not_ready": "Secret storage is not configured...",
  "setup": "Set Up",
  "setting_up": "Setting up...",
  "reset": "Reset",
  "resetting": "Resetting...",
  "reset_confirm_title": "Reset Secret Storage?",
  "reset_confirm_message": "...",
  "error_setup": "Failed to set up secret storage",
  "error_reset": "Failed to reset secret storage"
}
```

zh-CN.json 补充 `secret_storage.*` + 缺失的 `recovery_key.*`。

## 风险

1. **UIA 挑战**：`bootstrapCrossSigning` 可能要求用户交互认证（输入密码）。当前方案先传空 `authUploadDeviceSigningKeys`，由 SDK 自动处理已认证会话。如失败可在后续迭代中集成 UIA 流程。
2. **回调时序**：`getSecretStorageKey` 是异步回调，通过 store + Promise resolver 桥接 UI。用户取消时需 resolve(null) 避免 Promise 悬挂。
3. **多次回调**：`bootstrapSecretStorage` 内部可能多次调用 `getSecretStorageKey`，需缓存避免重复弹窗。

## 工作量

- 新建文件：2 个（service + dialog）
- 修改文件：8 个
- 约 400-500 行新代码

## 备选方案

**方案 B：首次登录自动 bootstrap**
- 在 `startMatrixClient` 中自动调用 `bootstrapSecretStorage`
- 优点：无需用户手动操作
- 缺点：用户无法选择 passphrase，强制展示 recovery key 体验不佳
- **不采用**：用户应主动选择何时以及如何设置 secret storage

## 批注

（用户批注和回复。保留所有历史记录。）
