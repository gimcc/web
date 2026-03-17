# FEAT-013 实现锁屏密码与本地数据库加密（DEK + KEK）

- **status**: done
- **priority**: P1
- **owner**: (未分配)
- **createdAt**: 2026-03-16 17:30

## 描述

实现两层密钥架构（DEK + KEK）、IndexedDB 加密存储层、锁屏密码设置/修改/移除/忘记密码流程、锁定触发（空闲超时、手动锁定）。

验收标准：
- DEK 随机生成，用于 AES-256-GCM 加密 IndexedDB
- 无密码时 DEK 明文存 localStorage，有密码时 KEK 加密 DEK
- 锁屏密码设置/修改/移除 UI
- 空闲超时自动锁定（可配置 lockIdleTimeout）
- 手动锁定按钮/快捷键
- 锁屏页面密码输入与解锁
- 忘记密码 → 清除本地 → 重新登录

## 进行时描述

正在实现锁屏密码与本地加密

## 依赖

- **blocked by**: FEAT-012
- **blocks**: FEAT-014

## 笔记

- 参考 PLAN-001 第 6.1-6.4 节
- 密码变更只需重新加密 DEK（秒级），无需重新加密数据库
