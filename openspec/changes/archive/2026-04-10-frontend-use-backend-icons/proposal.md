## Why

当前前端目录区与内容区卡片虽然已经接入后端 `GET /api/site-menu/getMenu`，但图标仍会被前端二次改写为本地 `/site-icons/*` 资源，导致图标真实来源仍是前端静态目录，而不是后端接口返回的数据。继续保留这层本地映射，会让前后端菜单配置看似统一、实际仍然分裂，后端更新图标时前端也无法立即生效。

## What Changes

- 移除前端对 `siteMenu.icon` 的本地 `/site-icons/*` 重写逻辑，目录区与内容区卡片直接使用后端接口返回的图标地址。
- 统一前端图标解析规则，兼容后端返回的根路径静态资源地址、完整 HTTP 地址，以及必要的空值兜底。
- 调整目录区与内容区卡片渲染逻辑，确保两个区域消费同一份后端图标数据，不再各自推导本地图标文件名。
- 补充前端验证，覆盖目录区图标与卡片图标都来自后端数据的场景。

## Capabilities

### New Capabilities
- `frontend-backend-icons`: 前端目录区与内容区卡片必须以 `siteMenu` 接口返回的 `icon` 字段作为图标来源进行渲染。

### Modified Capabilities

## Impact

- 影响代码：`frontend-template/src/data/tool-directory.ts`、`frontend-template/src/components/AppLayout.tsx`、`frontend-template/src/pages/HomePage.tsx`、相关前端测试文件。
- 影响接口依赖：前端将更严格依赖后端 `GET /api/site-menu/getMenu` 返回的 `icon` 字段质量与格式。
- 影响静态资源策略：前端目录区和卡片区将不再依赖本地 `/site-icons/*` 作为默认主路径，而是优先消费后端静态资源服务返回的图标路径。
