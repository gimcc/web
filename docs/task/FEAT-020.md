# FEAT-020 实现 PWA 与离线支持

- **status**: done
- **priority**: P2
- **owner**: (未分配)
- **createdAt**: 2026-03-16 17:30

## 描述

配置 vite-plugin-pwa + Workbox，实现 Service Worker 缓存、离线消息队列（Background Sync API）、IndexedDB 本地消息缓存。

验收标准：
- PWA 安装提示（manifest.json + Service Worker）
- 离线时可浏览已缓存消息
- 离线发送的消息在恢复网络后自动发送（Background Sync）
- 静态资源缓存策略配置
- 应用更新提示

## 进行时描述

正在实现 PWA 与离线支持

## 依赖

- **blocked by**: FEAT-008
- **blocks**: FEAT-021

## 笔记

- 参考 PLAN-001 第 11 节
