# FEAT-088 实现 SSSS（安全秘密存储与共享）

- **status**: in_progress
- **priority**: P1
- **owner**: claude
- **createdAt**: 2026-03-21 10:00

## 描述

实现 Matrix 协议的 SSSS（Secure Secret Storage and Sharing / 4S）支持：
- 使用 `crypto.bootstrapSecretStorage()` 创建/重置 secret storage
- 支持通过密码短语（passphrase）或恢复密钥（recovery key）设置
- 将交叉签名密钥和密钥备份恢复密钥存储在账户数据中（`m.secret_storage.*`）
- 向 `createClient()` 注入 `cryptoCallbacks`（`getSecretStorageKey` + `cacheSecretStorageKey`）
- 提供设置/重置 UI 和恢复流程

验收标准：
1. 用户可在加密设置面板中设置 secret storage（生成 recovery key 或输入 passphrase）
2. 交叉签名密钥和密钥备份密钥自动存入 secret storage
3. 新设备登录时可通过 recovery key 或 passphrase 恢复
4. `isSecretStorageReady()` 设置后返回 true
5. 加密面板显示 secret storage 状态

## 进行时描述

正在实现 SSSS 安全秘密存储与共享

## 依赖

- **blocked by**: FEAT-012 (E2EE 已完成)
- **blocks**: (无)

## 笔记

相关方案: PLAN-014
