# PLAN-006 Phase 4 — E2EE 配置与本地安全

- **status**: approved
- **createdAt**: 2026-03-17
- **approvedAt**: 2026-03-17
- **relatedTask**: FEAT-012, FEAT-013, FEAT-014

---

## 1. 现状

- Matrix 客户端连接和 sync 桥接已实现（FEAT-005）
- 房间列表和侧边栏已完成（FEAT-006）
- 认证流程使用明文 localStorage 存储 session（auth-service.ts 注释标记待加密）
- 无任何 E2EE 或本地加密实现

## 2. 方案

### 2.1 FEAT-012: E2EE 配置与密钥管理 UI

**目标：** 集成 matrix-sdk-crypto-wasm，实现加密房间消息加解密和密钥管理 UI。

**实现步骤：**

1. **添加依赖**
   - `@matrix-org/matrix-sdk-crypto-wasm` 添加到 `packages/matrix-client`
   - Vite 配置 WASM 懒加载（代码分割）

2. **初始化 Rust Crypto**
   - `client-manager.ts` 中 `startMatrixClient()` 添加 `initRustCrypto()` 调用
   - IndexedDB 作为 crypto store（SDK 内置）
   - 错误处理：WASM 加载失败时降级（仅影响加密房间）

3. **Crypto Store（Zustand）**
   - `packages/matrix-client/src/stores/crypto-store.ts`
   - 状态：`isInitialized`, `crossSigningStatus`, `deviceVerificationStatus`, `keyBackupEnabled`, `keyBackupProgress`

4. **Sync Bridge 扩展**
   - 监听 `CryptoEvent.VerificationRequestReceived`
   - 监听 `CryptoEvent.KeyBackupStatus`
   - 推送到 crypto store

5. **UI 组件（apps/web）**
   - `components/crypto/encryption-badge.tsx` — 加密房间盾牌图标
   - `components/crypto/device-verification-dialog.tsx` — emoji 验证流程
   - `components/crypto/key-backup-setup.tsx` — 密钥备份设置
   - `components/crypto/unverified-device-warning.tsx` — 未验证设备警告

6. **房间列表集成**
   - `RoomSummary` 添加 `isEncrypted` 字段
   - `room-list-item.tsx` 显示加密徽章

### 2.2 FEAT-013: 锁屏密码与本地数据库加密

**目标：** 实现 DEK/KEK 两层密钥架构和锁屏 UI。

**实现步骤：**

1. **加密工具模块**
   - `packages/matrix-client/src/crypto/dek-manager.ts`
   - DEK 生成（`crypto.getRandomValues`）
   - AES-256-GCM 加密/解密
   - PBKDF2 密码派生 KEK
   - 密码 hash 验证

2. **存储键常量**
   - `matrix-web:dek` — DEK（明文或 KEK 加密）
   - `matrix-web:salt` — PBKDF2 salt
   - `matrix-web:password-hash` — 密码验证 hash
   - `matrix-web:has-password` — 布尔标记

3. **Lock Store（Zustand）**
   - `packages/matrix-client/src/stores/lock-store.ts`
   - 状态：`isLocked`, `hasPassword`, `idleTimeout`
   - 操作：`lock()`, `unlock()`, `setPassword()`, `changePassword()`, `removePassword()`

4. **锁屏 UI**
   - `apps/web/src/pages/lock/lock-screen.tsx` — 密码输入解锁
   - `apps/web/src/components/settings/password-settings.tsx` — 密码设置/修改/移除

5. **空闲检测**
   - `apps/web/src/hooks/use-idle-detector.ts`
   - 监听 mousemove, keydown, touchstart
   - 超时触发锁定

6. **启动流程集成**
   - `app.tsx` 路由守卫检查锁定状态
   - 锁定时清除内存 DEK
   - 解锁时重新派生 KEK → 解密 DEK

### 2.3 FEAT-014: 胁迫密码

**目标：** 实现胁迫密码静默擦除功能。

**实现步骤：**

1. **胁迫密码管理**
   - `packages/matrix-client/src/crypto/duress-manager.ts`
   - 独立 salt + hash 存储
   - 验证接口（先正常 → 再胁迫）

2. **静默擦除**
   - `packages/matrix-client/src/crypto/wipe-service.ts`
   - 清除：DEK, IndexedDB, localStorage, sessionStorage, SW 缓存
   - 伪装解锁动画 → 擦除完成 → "会话已过期"

3. **UI**
   - `apps/web/src/components/settings/duress-password-settings.tsx`
   - 仅在已设置锁屏密码时可见

## 3. 依赖链

```
FEAT-012 (E2EE) → FEAT-013 (锁屏) → FEAT-014 (胁迫)
```

## 4. 风险

| 风险 | 缓解 |
|------|------|
| WASM 包体积 ~800KB | 懒加载 + 代码分割 |
| Crypto API 浏览器兼容性 | Web Crypto API 已广泛支持，polyfill 备选 |
| IndexedDB 加密性能 | 仅加密存入数据，DEK 常驻内存（无密码时） |

## 5. 实现顺序

FEAT-012 → FEAT-013 → FEAT-014（串行依赖）
