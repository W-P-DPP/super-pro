# Theme Fallback

仅当目标前端项目没有自己的 `theme.css` 时读取本文件。

## 读取顺序

优先级从高到低：

1. 目标项目自己的 `theme.css`
2. `references/shadcn-default.css`
3. `references/shadcn-theme.css`
4. `references/shadcn-theme1.css`

## 使用原则

- 一旦目标项目已有 `theme.css`，不要回退到参考主题
- 参考主题只用于缺少项目主题源时建立实现基线，不代表必须整体替换项目视觉
- 使用参考主题时，仍然要优先遵守仓库根 `design.md`
- 如果用户已经给出明确主题方向，用户要求高于参考主题

## 实施要求

- 读取参考主题后，只继承 token、变量、圆角、阴影、字体和基础气质
- 不要把参考主题完整复制到业务项目中作为新的一套平行设计系统
- 如果后续项目需要长期使用这套主题，应落回目标项目自己的 `theme.css` 或共享样式包
