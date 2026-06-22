# Docker Deployment

Docker deployment is generated from project-level Dockerfiles.

Each deployable project owns a `Dockerfile` with `super-pro.*` labels. The root
deployment command scans those Dockerfiles, skips missing projects, and writes:

- `docker/.generated/docker-compose.yml`
- `docker/.generated/nginx/default.conf`
- `docker/.generated/nginx/Dockerfile`

Generated files are ignored by git.

Frontend projects are built into the generated nginx gateway image and served as
static files by nginx. They are not deployed as separate containers. API projects
remain independent services and are reverse proxied by nginx.

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

## Dockerfile Labels

Required:

- `super-pro.deploy="true"`
- `super-pro.service="<service-name>"`
- `super-pro.kind="frontend"` or `super-pro.kind="api"`
- `super-pro.port="<container-port>"`
- `super-pro.routes="/route/"`

Optional:

- `super-pro.rootRedirect="/zwpsite/"`
- `super-pro.health="/ready"`
- `super-pro.depends="mysql,redis"`
- `super-pro.runtimeVolumes="logs:/app/logs,file:/data/file"`

Current deployable projects:

- `front-public` -> `/zwpsite/` static files in nginx
- `login` -> `/login/` static files in nginx
- `admin-front` -> `/admin/` static files in nginx
- `file-server` -> `/file-server/` static files in nginx
- `resume-template` -> `/resume/` static files in nginx
- `general-server` -> `/api/`, `/public/` API reverse proxy
