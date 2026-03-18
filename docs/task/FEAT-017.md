# FEAT-017 实现语音消息录制与播放

- **status**: done
- **priority**: P2
- **owner**: (未分配)
- **createdAt**: 2026-03-16 17:30

## 描述

实现语音消息的录制（MediaRecorder API → Opus/WebM）和播放（Web Audio API），显示波形图和播放进度条。

验收标准：
- 长按/点击录音按钮开始录制
- 录制中显示时长和波形动画
- 录制完成发送 m.audio 消息
- 播放时显示波形图 + 进度条
- 支持暂停/继续播放

## 进行时描述

正在实现语音消息

## 依赖

- **blocked by**: FEAT-008
- **blocks**: （无）

## 笔记

- 参考 PLAN-001 第 7.5 节
