# Backend Conventions Reference

Use this file after `backend-dev-guard` triggers and the task touches backend structure, shared-server infrastructure, observability, alerting, runtime lifecycle, or test-entry behavior.

## Module Layout

Business domains should prefer:

```text
src/<domain>/
  <domain>.router.ts
  <domain>.controller.ts
  <domain>.service.ts
  <domain>.repository.ts
  <domain>.dto.ts
  <domain>.entity.ts
```

Legacy modules may keep current layout, but touched logic should still respect the same layer boundaries.

## Layer Responsibilities

`router`

- Declare routes and route-level middleware.
- Mount anonymous routes explicitly before auth middleware when needed.
- Do not contain business logic.

`controller`

- Parse HTTP inputs.
- Validate or normalize DTOs.
- Call services.
- Return shared response envelopes.
- Map domain errors to stable Chinese messages.

`service`

- Own business rules and orchestration.
- Coordinate repositories, cache, external clients, and transactions.
- Do not depend on Express `req` or `res`.

`repository`

- Own persistence access.
- Hide ORM or SQL details.
- Return typed entities or DTOs.

`dto`

- Define request, response, query, command, and view-model types.
- Avoid `any` and loose dictionaries.

## Shared Server Infrastructure

Check these first before writing app-local infrastructure:

- HTTP app factory: `createHttpApp`
- Response envelope: `createResponseMiddleware`
- Error middleware: `createErrorMiddleware`
- Request logger: `createRequestLoggerMiddleware`
- Runtime lifecycle: `createServiceRuntime`
- Request context: `createRequestContextMiddleware`, `getRequestContext`
- Exception email reporter: `createExceptionEmailReporterFromEnv`
- Development exception test router: `createDevExceptionTestRouter`
- Typed env loading: `loadProfileEnv`
- App config: `loadServerConfig`
- Database config: `getDatabaseConfig`
- Redis wrapper: `SharedRedisService`
- Axios wrapper: `SharedAxiosService`
- Async batching: `BatchProcessor`
- Log sanitization: `sanitizeLogValue`

App-local files such as `main.ts`, `app.ts`, `utils/Logger.ts`, and `utils/Redis.ts` should usually be thin adapters that wire local config into shared primitives.

## Runtime Lifecycle

Backend services should prefer the shared runtime for:

- process signal handling
- graceful shutdown
- shutdown task ordering
- request drain timeout
- process-level exception reporting
- dependency health checks
- metrics rendering

Rules:

- Load `.env.*` before creating runtime, reporters, or config-dependent adapters.
- Register shutdown tasks explicitly and keep release order deterministic.
- Keep readiness dependent on runtime state plus required dependency checks.
- `/live`, `/ready`, `/metrics` are internal probe endpoints by default, not public product APIs.

## Exception Reporting and Alerting

All exception reporting should flow through `runtime.reportException(...)`.

Canonical event types:

- `request_error`
- `bootstrap_error`
- `unhandled_rejection`
- `uncaught_exception`
- `shutdown_error`

Severity mapping:

- `P0`: `bootstrap_error`, `uncaught_exception`
- `P1`: `unhandled_rejection`, `shutdown_error`
- `P2`: `request_error`

Rules:

- Default email alert threshold is `P0`.
- Reporter failure must not break the main request or shutdown flow.
- Email subjects and bodies should be Chinese by default.
- Keep reporter registration centralized in the service bootstrap path.

## Development Exception Test Entry

When a development-only exception test route is needed:

- reuse `createDevExceptionTestRouter`
- mount it only when `NODE_ENV=development`
- keep the path explicit, e.g. `/api/__dev__/exception-email-test`
- if the service normally applies JWT to all API routes, bypass JWT only for this explicit dev path
- never mount dev test routes in production

The route may accept both machine codes and Chinese aliases, but should return a stable envelope plus localized display fields.

## Config

- Config loading order should be: safe defaults -> optional config file -> profile env file -> process env overrides.
- Config objects should be typed.
- Missing optional config files should not break tests.
- Secrets should come from protected config or environment variables.
- Do not scatter raw `process.env` reads across business code.

## Logging

Recommended structured fields:

- timestamp
- level
- service
- env
- requestId
- module
- operation
- method
- path
- statusCode
- durationMs

Never log:

- password
- password hash or ciphertext
- token
- authorization header
- cookie
- private key
- full large payloads

Use sanitization and truncation for request bodies, response bodies, audit params, and upstream response data.

## API Contract and Auth

Response body shape:

```ts
type ResultVO<T> = {
  code: number
  msg: string
  data?: T
  timestamp: number
}
```

Rules:

- `msg` should be Chinese by default.
- Do not leak stack traces, SQL errors, ORM internals, or upstream SDK internals.
- New APIs default to JWT protection.
- Anonymous endpoints must be explicit in router composition, not hidden in auth middleware internals.

## Validation Commands

Use the smallest relevant checks first:

```bash
pnpm --filter @super-pro/shared-server build
pnpm --filter @super-pro/shared-server exec vitest run <targeted-tests>
pnpm --filter @super-pro/server build
pnpm --filter @super-pro/agent-server build
pnpm --filter @super-pro/reimburse-server build
```

When touching service behavior, also run targeted Jest integration tests in that service.
