# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY agent-front/package.json ./agent-front/package.json
COPY frontend-template/package.json ./frontend-template/package.json
COPY login-template/package.json ./login-template/package.json
COPY general-server/package.json ./general-server/package.json
COPY file-server/package.json ./file-server/package.json
COPY agent-server/package.json ./agent-server/package.json
COPY summary-front/package.json ./summary-front/package.json
COPY resume-template/package.json ./resume-template/package.json
COPY reimburse-front/package.json ./reimburse-front/package.json
COPY reimburse-server/package.json ./reimburse-server/package.json
RUN pnpm install --frozen-lockfile --prod=false

FROM deps AS builder
COPY . .
RUN pnpm build
RUN pnpm deploy --legacy --filter @super-pro/server --prod /out/general-server
RUN pnpm deploy --legacy --filter @super-pro/agent-server --prod /out/agent-server
RUN pnpm deploy --legacy --filter @super-pro/reimburse-server --prod /out/reimburse-server

FROM nginx:1.27-alpine AS web
COPY nginx.docker.conf /etc/nginx/nginx.conf
COPY --from=builder /app/frontend-template/dist /usr/share/nginx/html/zwpsite
COPY --from=builder /app/login-template/dist /usr/share/nginx/html/login
COPY --from=builder /app/agent-front/dist /usr/share/nginx/html/agent
COPY --from=builder /app/reimburse-front/dist /usr/share/nginx/html/reimburse
COPY --from=builder /app/summary-front/dist /usr/share/nginx/html/summary-front
COPY --from=builder /app/resume-template/dist /usr/share/nginx/html/resume
COPY --from=builder /app/file-server/dist /usr/share/nginx/html/file-server
EXPOSE 80

FROM node:22-bookworm-slim AS server-base
ENV NODE_ENV=production
WORKDIR /app
USER node

FROM server-base AS general-server
COPY --chown=node:node --from=builder /out/general-server ./general-server
WORKDIR /app/general-server
ENV PORT=30010
EXPOSE 30010
CMD ["node", "dist/main.cjs"]

FROM server-base AS agent-server
COPY --chown=node:node --from=builder /out/agent-server ./agent-server
WORKDIR /app/agent-server
ENV PORT=30012
EXPOSE 30012
CMD ["node", "dist/main.cjs"]

FROM server-base AS reimburse-server
COPY --chown=node:node --from=builder /out/reimburse-server ./reimburse-server
WORKDIR /app/reimburse-server
ENV PORT=30022
EXPOSE 30022
CMD ["node", "dist/main.cjs"]
