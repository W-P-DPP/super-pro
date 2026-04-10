## ADDED Requirements

### Requirement: SiteMenu 查询接口必须返回菜单备注
系统在查询 `siteMenu` 树和菜单详情时，必须返回菜单节点的 `remark` 字段，供前端作为菜单说明展示。

#### Scenario: 获取菜单树时返回 remark
- **WHEN** 客户端调用 `GET /api/site-menu/getMenu`
- **THEN** 系统必须在每个菜单节点中返回 `remark` 字段
- **THEN** 当菜单已配置备注时，返回值必须为对应的中文备注内容

#### Scenario: 获取菜单详情时返回 remark
- **WHEN** 客户端调用 `GET /api/site-menu/getMenu/:id`
- **THEN** 系统必须在菜单详情响应中返回 `remark` 字段
- **THEN** 返回结构必须与菜单列表节点的 `remark` 契约保持一致

### Requirement: 前端内容区卡片描述必须展示菜单备注
前端首页内容区卡片描述必须使用后端返回的菜单 `remark` 作为说明文案，而不是用菜单路径替代备注。

#### Scenario: 菜单配置了备注
- **WHEN** 前端首页加载到包含 `remark` 的菜单项
- **THEN** 内容区卡片描述必须展示该菜单项的 `remark`
- **THEN** 卡片底部路径展示区域仍可继续展示菜单目标地址

#### Scenario: 菜单未配置备注
- **WHEN** 前端首页加载到未配置 `remark` 的菜单项
- **THEN** 内容区卡片描述必须展示明确的中文占位说明
- **THEN** 系统不得用菜单路径充当描述文案
