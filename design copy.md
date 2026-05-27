---
version: alpha
name: Super Pro Frontend
description: super-pro monorepo 前端默认设计基线，适用于共享组件、前端应用和 AI 协作开发。
colors:
  background-light: "#FFFFFF"
  foreground-light: "#18181B"
  surface-light: "#FFFFFF"
  surface-muted-light: "#F5F5F5"
  border-light: "#E4E4E7"
  primary-light: "#27272A"
  primary-foreground-light: "#FAFAFA"
  secondary-light: "#F5F5F5"
  secondary-foreground-light: "#27272A"
  accent-light: "#F5F5F5"
  accent-foreground-light: "#27272A"
  muted-foreground-light: "#71717A"
  ring-light: "#A1A1AA"
  destructive-light: "#E5484D"
  background-dark: "#18181B"
  foreground-dark: "#FAFAFA"
  surface-dark: "#27272A"
  surface-muted-dark: "#3F3F46"
  border-dark: "#3F3F46"
  primary-dark: "#E4E4E7"
  primary-foreground-dark: "#27272A"
  secondary-dark: "#3F3F46"
  secondary-foreground-dark: "#FAFAFA"
  accent-dark: "#3F3F46"
  accent-foreground-dark: "#FAFAFA"
  muted-foreground-dark: "#A1A1AA"
  ring-dark: "#71717A"
  destructive-dark: "#F16D6F"
typography:
  display-lg:
    fontFamily: '"Geist Variable", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  title-lg:
    fontFamily: '"Geist Variable", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  title-md:
    fontFamily: '"Geist Variable", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
  body-md:
    fontFamily: '"Geist Variable", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: '"Geist Variable", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: '"Geist Variable", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  mono-sm:
    fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace'
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  xl: 14px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  header-height: 60px
  content-padding: 16px
components:
  app-shell:
    headerHeight: "{spacing.header-height}"
    contentPadding: "{spacing.content-padding}"
    borderColor: "{colors.border-light}"
  sidebar:
    backgroundColor: "{colors.surface-muted-light}"
    borderColor: "{colors.border-light}"
    borderRadius: "{rounded.xl}"
  card:
    backgroundColor: "{colors.surface-light}"
    borderColor: "{colors.border-light}"
    borderRadius: "{rounded.lg}"
  button-primary:
    backgroundColor: "{colors.primary-light}"
    color: "{colors.primary-foreground-light}"
    borderRadius: "{rounded.md}"
    typography: "{typography.label-md}"
  button-secondary:
    backgroundColor: "{colors.accent-light}"
    color: "{colors.accent-foreground-light}"
    borderColor: "{colors.border-light}"
    borderRadius: "{rounded.md}"
    typography: "{typography.label-md}"
  input:
    backgroundColor: "{colors.surface-light}"
    borderColor: "{colors.border-light}"
    borderRadius: "{rounded.md}"
    typography: "{typography.body-sm}"
---

# super-pro Frontend Design System

## Overview

这份文档定义 `super-pro` monorepo 的前端默认设计基线，用于约束共享组件、业务页面、展示页以及 AI 协作开发时的视觉决策。

整体气质应保持克制、专业、清晰和高效。界面应优先传达可信赖的商务感和稳定的信息层级，而不是追求强装饰性、玩具化或为了“设计感”额外堆叠容器与特效。

本规范描述的是默认基线，不是排他性的唯一主题。当用户或目标前端应用已经提供明确的 `shadcn` 主题、token 或 `theme.css` 时，应用级主题优先，但仍应遵守本文档关于层级、密度、响应式、可访问性和组件一致性的要求。

桌面端、平板和移动端都属于首要交付对象。任何新页面或组件都不能默认只服务桌面端体验。

## Colors

颜色必须通过语义化 token 管理，而不是在组件中散落十六进制色值。浅色与深色主题都应表达同一套产品气质，只允许亮度和对比关系变化，不允许切换主题后像两个不同产品。

默认色彩基线以中性色为主，强调色使用克制。主操作、选中态、焦点态和关键反馈可以使用 `primary` 与 `ring`，普通容器、分割线和弱化信息应使用 `surface`、`surface-muted`、`border` 与 `muted-foreground`。

- `background-light` / `background-dark`：页面背景。
- `surface-light` / `surface-dark`：卡片、面板、弹层等主要容器。
- `surface-muted-light` / `surface-muted-dark`：次级容器、侧边栏或弱化分区。
- `primary-*`：主操作、主强调和关键状态。
- `destructive-*`：危险操作和错误状态。

除定义或维护 token 外，前端代码不应直接引入任意颜色值。

## Typography

主字体继续使用 `Geist Variable`，中文回退使用 `PingFang SC`、`Microsoft YaHei` 或同级系统字体。等宽信息使用 `JetBrains Mono` 体系。

排版目标是稳定、紧凑、易扫描。标题应简洁明确，正文应优先保证连续阅读体验，标签和操作文案应具备较高识别度但不能显得臃肿。

- `display-lg`：大标题和关键页面主标题。
- `title-lg` / `title-md`：区块标题、抽屉标题、详情页标题。
- `body-md` / `body-sm`：正文、表格单元格、表单说明、帮助信息。
- `label-md`：按钮、筛选项、标签、表头等操作与结构文本。
- `mono-sm`：代码片段、技术字段、时间戳或调试信息。

标题不要写成长段副标题。说明文案应尽量直接、可执行、低噪音。

## Layout

布局应强调结构、对齐、固定节奏和可预测的间距。默认使用以 `4px` 为最小步进、`8px` 为主节奏的间距体系，常用内容内边距和区块间距优先落在 `16px`、`24px`、`32px`。

页面默认不依赖横向滚动完成主内容浏览。只有表格、代码块或其他结构性强的局部区域，才允许受控横向滚动。

桌面端应支持高密度信息扫描，但不能牺牲清晰度。移动端必须主动处理以下变化：

- 多栏改为单列或折叠结构。
- 筛选、导航和次级操作改为抽屉、折叠面板或吸底操作区。
- 固定头部、吸顶筛选条和长表单分段的可点击区域保持充足。

应用壳层的头部高度、内容内边距和主要布局节奏应优先复用 frontmatter 中的 `spacing` 与 `components.app-shell` token。

## Elevation & Depth

默认视觉层级以边框、背景对比和轻量阴影为主，而不是厚重阴影、强模糊或大面积玻璃拟态。

当需要表现层级时，优先使用这些手段：

- 背景与容器之间的明度对比。
- 清晰但不过分突兀的描边。
- 小范围、低透明度阴影用于弹层、浮层和悬浮卡片。

如果一个区域只需要结构分组，就不要再额外叠加卡片、外描边、背景块和说明条。

## Shapes

整体形状语言应保持简洁、克制、工程化。圆角统一由 token 控制，不允许按页面随意发散。

- `rounded.sm` 到 `rounded.lg`：常规按钮、输入框、筛选器、卡片和列表项。
- `rounded.xl`：需要更强包裹感的较大容器。
- `rounded.full`：胶囊标签、头像、状态点或圆形操作按钮。

不允许为了“更现代”在同一页面混用多套截然不同的圆角风格。

## Components

当前仓库以前端共享能力为核心，UI 应优先复用 `shared-ui`、`shared-types`、`shared-styles`、`shared-web`，并保持现有 `shadcn` 体系作为基础组件语言。

组件和页面的职责边界应保持清晰：

- 页面负责路由状态、数据编排、加载态、空态和错误态。
- 共享组件负责稳定的交互模型和视觉复用。
- API 请求、鉴权跳转和浏览器能力不应散落在纯展示组件中。

对话框、抽屉、Tabs、表单、表格、筛选条和侧边导航必须定义明确的移动端形态，不能直接压缩桌面布局了事。

新增业务组件时，优先组合现有基础组件，而不是新造一套平行视觉语言。React Bits 等外部展示型组件接入时，也必须服从全站主题、间距和壳层布局约束。

## Do's and Don'ts

Do:

- 使用语义化 token 管理颜色、圆角、间距和关键组件属性。
- 在浅色和深色主题下都验证对比度、焦点态和层级一致性。
- 默认同时检查桌面端、平板端和移动端的可读性与可操作性。
- 保持标题简洁，说明文案直接，不写宣传式副标题、说明文案、提示语、辅助描述。
- 让关键操作在触屏场景下同样可见、可点、可达。

Don't:

- 不要引入第二套无关的 UI 风格。
- 不要在页面里零散写十六进制颜色、阴影、圆角和任意间距。
- 不要为了显得完整而堆叠无业务价值的卡片、统计块、标签和装饰文案。
- 不要把关键操作藏在仅 hover、右键或桌面专属交互里。
- 不要交付仅适配桌面端、在窄屏下溢出、遮挡或不可点击的页面。
