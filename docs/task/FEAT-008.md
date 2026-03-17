# FEAT-008 实现文本消息收发与 Markdown 渲染

- **status**: done
- **priority**: P1
- **owner**: claude-agent
- **createdAt**: 2026-03-16 17:30

## 描述

实现文本消息的发送和接收，支持 Markdown 渲染、HTML 格式内容显示、乐观更新（useOptimistic）、消息状态流转（sending → sent → delivered → read → failed）。

验收标准：
- 文本消息发送与接收
- Markdown 渲染（加粗、斜体、代码块、链接等）
- React 19 useOptimistic 乐观更新
- 消息状态指示器（发送中、已发送、已读、失败）
- 失败消息重发
- /me emote 消息支持

## 进行时描述

正在实现文本消息收发

## 依赖

- **blocked by**: FEAT-007
- **blocks**: FEAT-009, FEAT-010

## 笔记

- 参考 PLAN-001 第 7.1 节消息类型和 types.md TextMessage 定义
