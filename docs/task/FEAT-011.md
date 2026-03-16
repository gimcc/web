# FEAT-011 实现粘贴板图片与拖拽上传

- **status**: pending
- **priority**: P1
- **owner**: (未分配)
- **createdAt**: 2026-03-16 17:30

## 描述

支持通过 Ctrl/Cmd+V 粘贴图片和拖拽文件到输入框进行上传。粘贴/拖拽后显示本地预览，可添加说明文字、移除或调整顺序，确认后上传发送。

验收标准：
- Ctrl/Cmd+V 拦截 paste 事件，提取 image/* 类型
- 拖拽文件到输入框，读取 DataTransfer.files
- 本地 Blob URL 预览
- 可添加说明文字、移除、批量发送
- 复用 FEAT-009 的统一上传流程

## 进行时描述

正在实现粘贴板图片与拖拽上传

## 依赖

- **blocked by**: FEAT-009
- **blocks**: （无）

## 笔记

- 参考 PLAN-001 第 8.2 节粘贴板图片
