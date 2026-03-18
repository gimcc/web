# FEAT-015 实现表情回复

- **status**: done
- **priority**: P2
- **owner**: dev
- **createdAt**: 2026-03-16 17:30

## 描述

实现消息的表情回复（reaction）功能，包括 emoji 选择器、回复显示和计数。

验收标准：
- 消息悬停显示回复按钮
- Emoji 选择器弹出（reaction-picker 组件）
- 回复显示在消息下方（emoji + 计数）
- 点击已有回复可追加/撤销
- 支持 Unicode emoji

## 进行时描述

正在实现表情回复

## 依赖

- **blocked by**: FEAT-008
- **blocks**: （无）

## 笔记

- 参考 PLAN-001 第 14 节阶段 5
