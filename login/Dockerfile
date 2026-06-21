# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY login ./login

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @super-pro/login build

FROM nginx:1.27-alpine

LABEL super-pro.deploy="true" \
      super-pro.service="login" \
      super-pro.kind="frontend" \
      super-pro.port="80" \
      super-pro.routes="/login/"

RUN printf '%s\n' \
    'server {' \
    '    listen 80;' \
    '    server_name _;' \
    '    root /usr/share/nginx/html;' \
    '    index index.html;' \
    '    location / {' \
    '        try_files $uri $uri/ /index.html;' \
    '    }' \
    '}' > /etc/nginx/conf.d/default.conf

COPY --from=builder /workspace/login/dist /usr/share/nginx/html
