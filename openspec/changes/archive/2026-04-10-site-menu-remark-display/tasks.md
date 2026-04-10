## 1. 后端菜单备注透传

- [x] 1.1 调整 `siteMenu.repository` 查询链路，确保菜单树和菜单详情都能查出 `remark`
- [x] 1.2 校验并补齐 `siteMenu` 的 DTO、service、controller 返回契约，确保 `getMenu` 与 `getMenu/:id` 稳定返回 `remark`

## 2. 前端目录描述展示

- [x] 2.1 调整前端菜单数据消费逻辑，保持 `remark` 作为首页目录数据的说明字段
- [x] 2.2 重构 `HomePage` 内容区卡片描述展示，优先显示 `remark`，无备注时显示中文占位说明，不再使用路径充当描述

## 3. 验证

- [x] 3.1 补充后端接口测试，覆盖菜单列表与详情接口返回 `remark`
- [x] 3.2 补充前端展示验证，覆盖卡片描述使用 `remark` 和无备注占位文案场景
