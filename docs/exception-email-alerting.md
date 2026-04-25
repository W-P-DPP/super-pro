# 异常邮件告警

后端服务现在支持通过 SMTP 邮件发送运行时异常告警，沿用现有 `MAILER_*` 连接配置，并新增以下环境变量：

- `EXCEPTION_EMAIL_TO`
  告警接收人，支持逗号分隔多个邮箱。
- `EXCEPTION_EMAIL_FROM`
  发件人，未设置时默认回退到 `MAILER_FROM`，再回退到 `MAILER_USER`。
- `EXCEPTION_EMAIL_SUBJECT_PREFIX`
  邮件标题前缀，默认是 `[super-pro]`。
- `EXCEPTION_EMAIL_MIN_SEVERITY`
  邮件发送阈值，支持 `P0`、`P1`、`P2`。默认是 `P0`，只有最高优先级异常会发邮件。
- `EXCEPTION_EMAIL_EVENT_TYPES`
  可选的附加白名单，逗号分隔。只有同时满足“严重级别达到阈值”和“事件类型命中白名单”时才发邮件；留空表示不额外限制。

## 严重级别

- `P0`: `bootstrap_error`、`uncaught_exception`
- `P1`: `unhandled_rejection`、`shutdown_error`
- `P2`: `request_error`

## QQ 邮箱示例

```dotenv
MAILER_HOST=smtp.qq.com
MAILER_PORT=465
MAILER_SECURE=true
MAILER_USER=your_account@qq.com
MAILER_PASS=your_qq_smtp_auth_code
EXCEPTION_EMAIL_TO=your_account@qq.com
EXCEPTION_EMAIL_FROM=your_account@qq.com
EXCEPTION_EMAIL_SUBJECT_PREFIX=[super-pro-prod]
EXCEPTION_EMAIL_MIN_SEVERITY=P0
EXCEPTION_EMAIL_EVENT_TYPES=
```

说明：

- `MAILER_PASS` 需要填写 QQ 邮箱 SMTP 授权码，不是登录密码。
- 如果后续你希望放宽到 `P1`，把 `EXCEPTION_EMAIL_MIN_SEVERITY` 改成 `P1` 即可；这会让 `bootstrap_error`、`uncaught_exception`、`unhandled_rejection`、`shutdown_error` 都发邮件。
- `EXCEPTION_EMAIL_EVENT_TYPES` 留空即可；只有在你想进一步缩小范围时才需要填写。
- 邮件发送失败不会中断主流程，但会在服务日志里记录 `Exception reporter failed`。

## 开发环境测试

`general-server`、`agent-server`、`reimburse-server` 在开发环境下都会额外暴露一个测试接口：

```text
POST /api/__dev__/exception-email-test
```

请求体：

```json
{ "type": "uncaught_exception" }
```

或：

```json
{ "type": "request_error" }
```

说明：

- `uncaught_exception` 会按 `P0` 处理，当前默认会发邮件。
- `request_error` 会按 `P2` 处理，在当前 `EXCEPTION_EMAIL_MIN_SEVERITY=P0` 下不会发邮件。
- 这个接口只在 `NODE_ENV=development` 时挂载，不会出现在生产环境。

返回示例：

```json
{
  "code": 200,
  "msg": "测试异常事件已触发",
  "data": {
    "triggered": true,
    "type": "uncaught_exception",
    "typeLabel": "未捕获异常",
    "severity": "P0",
    "severityLabel": "P0 级",
    "shouldSendEmail": true,
    "emailBehavior": "会发送邮件"
  }
}
```
