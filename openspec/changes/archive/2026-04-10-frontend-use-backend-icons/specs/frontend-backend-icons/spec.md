## ADDED Requirements

### Requirement: 前端目录区与内容区卡片必须使用后端返回的图标地址
前端系统必须以 `GET /api/site-menu/getMenu` 返回节点中的 `icon` 字段作为目录区菜单图标、内容区分组图标和内容区卡片图标的来源，不得再将该字段重写为前端本地 `/site-icons/*` 路径。

#### Scenario: 目录区菜单图标使用后端 icon 字段
- **WHEN** 前端渲染目录区菜单项，且后端返回节点 `icon` 为 `/icons/tool.svg`
- **THEN** 前端必须以 `/icons/tool.svg` 作为该菜单项图标地址进行渲染
- **THEN** 前端不得再根据文件名推导 `/site-icons/tool.svg`

#### Scenario: 内容区卡片图标使用后端 icon 字段
- **WHEN** 前端渲染内容区卡片，且后端返回节点 `icon` 为 `https://cdn.example.com/icons/json.ico`
- **THEN** 前端必须直接使用该完整地址作为卡片图标

### Requirement: 前端图标解析只能做路径规范化与统一兜底
前端系统必须提供统一图标解析规则，对后端返回的 `icon` 字段仅做最小必要的路径规范化与空值兜底，不得引入新的本地图标文件名映射规则。

#### Scenario: 相对路径图标被规范化
- **WHEN** 后端返回节点 `icon` 为 `icons/pin.svg`
- **THEN** 前端必须将其规范化为 `/icons/pin.svg`

#### Scenario: 空图标使用统一兜底
- **WHEN** 后端返回节点 `icon` 为空字符串、空白字符串或占位值
- **THEN** 前端必须使用统一的兜底图标路径
- **THEN** 该兜底路径必须是后端静态资源可访问路径，而不是前端本地 `/site-icons/*` 路径

### Requirement: 目录区与内容区必须共享同一套图标解析行为
前端系统必须保证目录区菜单、内容区分组图标和内容区卡片图标使用同一套图标解析规则，确保相同 `icon` 输入在不同区域得到一致的渲染结果。

#### Scenario: 相同 icon 在不同区域渲染一致
- **WHEN** 同一个菜单分组图标同时出现在目录区与内容区标题
- **THEN** 两个区域必须得到相同的最终图标地址
