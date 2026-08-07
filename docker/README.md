# Docker Deployment

Docker deployment is driven by an explicit project manifest at
`docker/deployment.config.json`. The root deployment command reads that manifest
and writes:

- `docker/.generated/docker-compose.yml`
- `docker/.generated/nginx/default.conf`
- `docker/.generated/nginx/Dockerfile`

Generated files are ignored by git.

Each deployable project owns a real `Dockerfile` and is built into its own image.
Frontend projects ship as their own nginx static-file containers; API projects
run as independent services. A gateway nginx container reverse proxies all routes
to them on a single public port:

```
PUBLIC_HTTP_PORT:9999 (唯一公开端口)
        │
   nginx 网关容器（纯反代，不含任何前端产物）
        │  前端：前缀剥离 proxy_pass（/admin/ → admin-front:80/）
        │  api：前缀透传 proxy_pass（/api/ → general-server:30010/api/）
   admin-front  front-public  login  file-server  resume-template  general-server
```

## Commands

```bash
pnpm docker:prod:deploy
pnpm docker:test:deploy
```

Jenkins entry scripts:

```bat
jenkins-build-and-deploy-prod.bat
jenkins-build-and-deploy-test.bat
```

The legacy `jenkins-build-and-deploy.bat` delegates to the production script.

Production defaults:

- compose project: `super-pro-prod`
- HTTP port: `9999`
- MySQL host port: `13306`
- Redis host port: `16379`
- runtime dir: `D:/super-pro_pro`
- API `NODE_ENV`: `production`

Test defaults:

- compose project: `super-pro-test`
- HTTP port: `29999`
- MySQL host port: `23306`
- Redis host port: `26379`
- runtime dir: `D:/super-pro_test`
- API `NODE_ENV`: `development`

Both environments generate the compose/nginx files and then run docker compose with
an explicit `-p` project name, so containers, networks, and default names stay
isolated. Override defaults with environment variables when needed:

```bash
PUBLIC_HTTP_PORT=19999 DOCKER_RUNTIME_DIR=D:/custom-runtime pnpm docker:test:deploy
```

`PROD_RUNTIME_DIR` is still accepted by the wrapper when `DOCKER_RUNTIME_DIR` is
not set, but new scripts should use `DOCKER_RUNTIME_DIR`.

## Deployment Manifest (`docker/deployment.config.json`)

The manifest is the single source of truth for deployment metadata. Each entry in
`projects` describes one deployable project:

| Field | Required | Description |
|---|---|---|
| `service` | yes | Compose service name (lowercase, dashes allowed; cannot be `nginx`/`mysql`/`redis`) |
| `kind` | yes | `frontend` or `api` |
| `dir` | no | Project directory; defaults to `service`. Dockerfile path is `${dir}/Dockerfile` |
| `port` | yes | Container port |
| `routes` | yes | URL routes served, e.g. `/admin/`. For frontends, `routes[0]` must equal the build base path |
| `rootRedirect` | no | Optional; root `/` redirects here (at most one project) |
| `health` | no | Health check path (api) |
| `depends` | no | Comma-separated dependency services |
| `runtimeVolumes` | no | Comma-separated `name:target` data volumes mounted under `${DOCKER_RUNTIME_DIR}/<service>/<name>` |

`docker/env/<service>.env` is mounted as `env_file` for api services when it
exists; `docker/config/<service>.config.json` is mounted read-only when it exists.

Current deployable projects:

- `admin-front` -> `/admin/` frontend container (nginx)
- `front-public` -> `/zwpsite/` frontend container (nginx), root redirect
- `login` -> `/login/` frontend container (nginx)
- `file-server` -> `/file-server/` frontend container (nginx)
- `resume-template` -> `/resume/` frontend container (nginx)
- `general-server` -> `/api/`, `/public/` API reverse proxy

## Adding a project

1. Add a real `Dockerfile` in the project directory. Frontend images follow the
   multi-stage pattern in `admin-front/Dockerfile`: build with
   `VITE_APP_BASE_PATH='/<route>/' pnpm --filter <pkg> build`, then an
   `nginx:1.27-alpine` runtime that `COPY`s `docker/nginx-static.conf` and the
   `dist`.
2. Add an entry to `docker/deployment.config.json`.
3. Re-run the deploy command.
