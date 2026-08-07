# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY admin-front ./admin-front

RUN pnpm install --frozen-lockfile
RUN VITE_APP_BASE_PATH='/admin/' pnpm --filter @super-pro/admin-front build

FROM nginx:1.27-alpine

COPY docker/nginx-static.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/admin-front/dist /usr/share/nginx/html
