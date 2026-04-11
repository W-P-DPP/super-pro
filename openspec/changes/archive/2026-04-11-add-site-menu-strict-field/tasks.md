## 1. 数据模型与契约扩展

- [x] 1.1 扩展 `general-server/src/siteMenu/siteMenu.entity.ts`，为 `sys_site_menu` 和种子节点模型增加 `strict` 布尔字段
- [x] 1.2 扩展 `general-server/src/siteMenu/siteMenu.dto.ts`，让查询响应、创建请求、更新请求和导入节点契约包含 `strict`
- [x] 1.3 调整 `general-server/siteMenu.json` 示例数据与相关种子处理逻辑，兼容 `strict` 缺省为 `false`

## 2. CRUD 与导入链路实现

- [x] 2.1 扩展 `general-server/src/siteMenu/siteMenu.repository.ts`，让菜单查询、创建、更新和导入持久化读写 `strict`
- [x] 2.2 扩展 `general-server/src/siteMenu/siteMenu.service.ts`，实现 `strict` 的布尔校验、默认值处理和中文错误映射
- [x] 2.3 调整 `general-server/src/siteMenu/siteMenu.controller.ts`，确保现有 CRUD 与导入接口返回包含 `strict` 的响应结构

## 3. 测试与验证

- [x] 3.1 为 `general-server/__tests__/unit/siteMenu.service.test.ts` 补充 `strict` 的默认值、显式赋值和非法类型校验测试
- [x] 3.2 为 `general-server/__tests__/integration/api.test.ts` 补充 `siteMenu` CRUD 与文件导入中 `strict` 字段的集成测试断言
- [x] 3.3 执行 `siteMenu` 相关单元测试和集成测试，确认 `strict` 字段在查询、创建、更新和导入链路中一致
