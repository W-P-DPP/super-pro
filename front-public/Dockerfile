# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY front-public ./front-public

RUN pnpm install --frozen-lockfile
RUN VITE_APP_BASE_PATH='/zwpsite/' pnpm --filter @super-pro/front-public build

FROM nginx:1.27-alpine

COPY docker/nginx-static.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/front-public/dist /usr/share/nginx/html
