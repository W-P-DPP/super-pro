# Single Page Layout

当任务是在 `admin-front` 这类后台单页面壳子里新增或改造“搜索区 + 主体区 + 分页区 + 弹窗/抽屉”页面时，先读本文件。

## 适用场景

- 后台 CRUD 页
- 后台树表、列表、报表、配置页
- 菜单驱动进入的单页模块
- 需要复用统一顶部搜索区和主内容区的页面

## 动作流

1. 先判断页面是“滚动页”还是“填充页”
   - 内容以说明、统计、多个信息区块为主：优先 `ADMIN_PAGE_SCROLL_LAYOUT_CLASS`
   - 内容以表格、树表、工作区为主：优先 `ADMIN_PAGE_FILL_LAYOUT_CLASS`
2. 根 `section` 默认占满内容区
   - 用 `w-full + min-w-0`
   - 不加额外外边距
   - 不再套居中窄容器
3. 页面主体默认分成两个大区
   - 搜索/筛选/操作区：`ADMIN_PAGE_TOOLBAR_CLASS`
   - 主列表/工作区：`ADMIN_PAGE_FILL_CARD_CLASS`
4. 搜索区只承载筛选和主操作
   - 用 `Input + ModuleSelect + Button`
   - 不用 `Card` 作为纯布局容器
   - 行高、列距、按钮高度保持稳定
5. 主体区负责滚动和分页
   - 表格/树表外层必须是 `min-h-0`
   - 数据区域放在 `overflow-auto` 容器中
   - 分页区贴在主体区底部，不与页面主滚动抢焦点
6. 状态反馈单独处理
   - 加载/错误/空态优先复用轻量状态区
   - 受保护页面的 `401 / 403` 路径要清晰分开
7. 只有在“信息分组本身成立”时才使用 `Card`
   - 例如指标块、说明块、详情块、快捷入口块
   - 搜索区、表格壳子、侧栏提示这类普通容器不用 `Card`
8. 完成后按页面细节清单收口
   - 间距
   - 对齐
   - 边界层级
   - 滚动职责
   - 窄屏表现

## 当前仓库推荐类名

- 根滚动页：`ADMIN_PAGE_SCROLL_LAYOUT_CLASS`
- 根填充页：`ADMIN_PAGE_FILL_LAYOUT_CLASS`
- 顶部工具栏：`ADMIN_PAGE_TOOLBAR_CLASS`
- 主内容区：`ADMIN_PAGE_FILL_CARD_CLASS`
- 状态提示区：`ADMIN_PAGE_STATUS_SECTION_CLASS`

这些类当前收口在 `admin-front/src/pages/admin/module-page-shared.tsx`，后续新增后台单页时优先复用，而不是每页重新拼一套。

## 禁止事项

- 不要给根 `main` 或根页面 `section` 额外加回圆角
- 不要把整页重新包进 `max-width` 窄容器
- 不要为了“像后台页面”而给搜索区和表格区重复套 `Card`
- 不要让分页区脱离主体区跑到页面外层
- 不要让横向滚动成为主要操作前提
