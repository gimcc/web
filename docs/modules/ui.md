# packages/ui — 共享 UI 组件

## 概述

基于 shadcn/ui + Base UI 的可复用 UI 组件库。提供聊天界面所需的所有基础和业务组件。独立于 Matrix 逻辑，仅关注展示。

## 职责

- shadcn/ui 组件的定制与扩展（基于 Base UI 原语）
- 聊天特有的 UI 组件（消息气泡、输入框、房间列表项等）
- 设计系统 tokens（颜色、间距、字体）
- 主题配置（亮色/暗色）
- 无障碍（a11y）保障

## 技术栈

| 依赖 | 版本 | 用途 |
|------|------|------|
| react | 19.2 | UI 框架（peer dependency） |
| @base-ui/react | 1.3 | 无障碍原语组件 |
| tailwindcss | 4.2 | 样式 |
| lucide-react | 0.577 | 图标 |
| class-variance-authority | - | 组件变体管理 |
| clsx / tailwind-merge | - | 类名合并 |

## 内部依赖

- `@matrix-web/types` — 共享类型定义（消息类型用于组件 props）

## 目录结构（规划）

```
packages/ui/
├── src/
│   ├── components/           # shadcn/ui 基础组件
│   │   ├── button/
│   │   ├── dialog/
│   │   ├── dropdown-menu/
│   │   ├── input/
│   │   ├── popover/
│   │   ├── tooltip/
│   │   ├── avatar/
│   │   └── ...
│   ├── chat/                 # 聊天特有组件
│   │   ├── message-bubble/   # 消息气泡（根据类型分发渲染）
│   │   │   ├── text-bubble    # 文本消息（Markdown / HTML / emote）
│   │   │   ├── image-bubble   # 图片消息（缩略图 + 点击查看原图）
│   │   │   ├── video-bubble   # 视频消息（缩略图 + 内嵌播放器）
│   │   │   ├── file-bubble    # 文件消息（图标 + 文件名 + 大小 + 下载）
│   │   │   ├── voice-bubble   # 语音消息（波形图 + 播放控件）
│   │   │   └── system-bubble  # 系统消息（居中、灰色文字）
│   │   ├── message-input/    # 消息输入框（含命令和粘贴板图片支持）
│   │   ├── command-palette/  # 命令面板（/ 触发，自动补全）
│   │   ├── media-preview/    # 媒体预览（发送前确认：图片/视频/文件）
│   │   ├── lightbox/         # 全屏图片/视频查看器（缩放、平移、切换）
│   │   ├── upload-progress/  # 上传进度条（可取消）
│   │   ├── file-icon/        # 文件类型图标（按 MIME 类型匹配）
│   │   ├── room-list-item/   # 房间列表项
│   │   ├── member-avatar/    # 成员头像（含在线状态指示）
│   │   ├── typing-indicator/ # 输入指示器
│   │   ├── reaction-picker/  # 表情回复选择器
│   │   └── timestamp/        # 时间戳显示
│   ├── layout/               # 布局组件
│   │   ├── sidebar/          # 侧边栏
│   │   ├── panel/            # 面板容器
│   │   └── split-view/       # 分栏视图
│   ├── lib/                  # 工具函数（cn, 主题辅助等）
│   └── index.ts              # 公共 API 导出
├── tailwind.config.ts        # Tailwind 配置（设计 tokens）
├── tsconfig.json
└── package.json
```

## 设计原则

- **无业务逻辑**：组件仅接收 props 渲染，不直接调用 Matrix API 或读取 store
- **源码可控**：shadcn/ui 模式，组件源码在仓库中，可自由定制
- **组合优先**：小而专注的组件，通过组合构建复杂界面
- **Base UI 原语**：Dialog、Tooltip、DropdownMenu、Popover 等使用 Base UI 的 render prop API
- **暗色模式**：所有组件支持亮色/暗色主题切换
- **用户 ID 显示**：所有显示用户 ID 的组件（message-bubble 发送者、member-avatar、room-list-item、@mention 标签）接收已格式化的 `displayUserId` prop，不直接处理 server name 截取逻辑。tooltip 始终显示完整 ID
