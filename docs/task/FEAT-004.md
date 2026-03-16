# FEAT-004 实现登录/注册页面与认证流程

- **status**: pending
- **priority**: P1
- **owner**: (未分配)
- **createdAt**: 2026-03-16 17:30

## 描述

实现登录和注册页面 UI，对接 matrix-js-sdk 认证 API。支持服务器列表选择（根据 config.json homeservers 配置）、自定义服务器输入、用户名密码登录。

验收标准：
- 登录页面 UI 完成，支持服务器选择/切换（受 showSelector/allowCustom 控制）
- 用户名密码登录成功，session 持久化
- 注册流程（如 homeserver 支持）
- 登录错误提示（网络错误、密码错误、服务器不可达）
- Mock 模式下可直接登录

## 进行时描述

正在实现登录/注册页面

## 依赖

- **blocked by**: INFRA-001, INFRA-002, FEAT-003（mock 支持）
- **blocks**: FEAT-005

## 笔记

- 参考 PLAN-001 第 4 节服务器配置和第 14 节阶段 2
