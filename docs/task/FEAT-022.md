# FEAT-022 实现设置 UI

- **status**: done
- **priority**: P1
- **owner**: (未分配)
- **createdAt**: 2026-03-17

## 描述

实现统一的设置 UI，汇总所有用户可配置项到一个对话框中。

验收标准：
- 侧边栏底部添加设置齿轮图标按钮
- 点击打开设置对话框（Modal 模式，不新增路由）
- 设置分为 5 个 Tab：账户、安全、加密、外观、关于
- 账户 Tab：显示用户 ID、Homeserver、连接状态、登出按钮
- 安全 Tab：集成已有的锁屏密码和胁迫密码设置组件
- 加密 Tab：集成已有的密钥备份组件，显示 E2EE 状态
- 外观 Tab：亮色/暗色主题切换
- 关于 Tab：应用名称、版本、链接

## 进行时描述

正在实现设置 UI

## 依赖

- **blocked by**: （无）
- **blocks**: （无）

## 笔记

- 复用已有组件：PasswordSettings、DuressPasswordSettings、KeyBackupSetup
- 使用自建 Dialog 和 Tab 组件（不引入额外依赖）
