## ADDED Requirements

### Requirement: 后端必须托管 public 目录静态资源
系统启动后必须直接托管 `general-server/public` 目录下的静态资源文件，并允许客户端通过 HTTP 访问这些资源。

#### Scenario: 访问 public 目录中的图标资源
- **WHEN** 客户端请求 `public` 目录中已存在的静态文件，例如 `/icons/pin.svg`
- **THEN** 系统必须返回该文件内容
- **THEN** 请求不得进入 `/api` 业务接口链路

#### Scenario: 访问 public 根目录中的普通文件
- **WHEN** 客户端请求 `public` 根目录中已存在的普通文件，例如 `/1.txt`
- **THEN** 系统必须返回该文件内容

### Requirement: 静态资源访问不能被业务中间件拦截
系统必须确保静态资源请求不受 `/api` 路由上的 JWT、业务日志和统一业务响应包裹影响。

#### Scenario: 访问静态资源时不需要业务鉴权
- **WHEN** 客户端未携带 token 访问静态资源
- **THEN** 系统必须正常返回已存在的静态文件
- **THEN** 系统不得返回业务鉴权错误

#### Scenario: 请求不存在的静态资源
- **WHEN** 客户端请求 `public` 目录中不存在的文件
- **THEN** 系统必须返回标准 HTTP 404 语义
