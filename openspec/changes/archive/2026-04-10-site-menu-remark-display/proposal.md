## Why

当前前端首页的目录分组标题和内容区卡片都已经预留了 `remark` 展示位，但后端 `getMenu` 查询链路没有稳定返回菜单备注，导致前端只能退化显示路径或占位文案。这个问题直接影响目录说明的可读性，因此需要把菜单备注补齐为稳定的前后端契约。

## What Changes

- 调整 `siteMenu` 查询能力，确保 `GET /api/site-menu/getMenu` 和 `GET /api/site-menu/getMenu/:id` 返回菜单 `remark`
- 明确 `siteMenu` 列表与详情响应中的 `remark` 字段契约，保持中文返回和现有业务前缀不变
- 调整前端首页目录渲染逻辑，让内容区卡片描述优先展示后端返回的 `remark`
- 补充前后端测试，覆盖菜单备注透传和前端描述展示场景

## Capabilities

### New Capabilities
- `site-menu-remark-display`: 支持菜单查询接口返回 `remark`，并在前端内容区卡片中展示菜单备注说明

### Modified Capabilities

## Impact

- 影响代码：`general-server/src/siteMenu/*`、`general-server/__tests__/*`、`frontend-template/src/api/modules/site-menu.ts`、`frontend-template/src/pages/HomePage.tsx`
- 影响接口：`GET /api/site-menu/getMenu`、`GET /api/site-menu/getMenu/:id` 的响应字段补齐 `remark`
- 影响前端展示：目录分组说明和内容区卡片描述将优先使用后端菜单备注
- 影响验证：需要补充后端接口测试和前端渲染测试或等价验证
