# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY general-server ./general-server

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @super-pro/server build
RUN mkdir -p /out/general-server \
  && cp -r /workspace/node_modules /out/node_modules \
  && cp -r /workspace/general-server/node_modules /out/general-server/node_modules \
  && cp -r /workspace/general-server/dist /out/general-server/dist \
  && cp /workspace/general-server/package.json /out/general-server/package.json \
  && if [ -d /workspace/general-server/public ]; then mkdir -p /out/general-server/dist/public && cp -r /workspace/general-server/public/. /out/general-server/dist/public; fi \
  && if [ -f /workspace/general-server/siteMenu.json ]; then cp /workspace/general-server/siteMenu.json /out/general-server/siteMenu.json; fi

FROM node:22-alpine AS runtime

WORKDIR /app/general-server

ENV NODE_ENV=production
ENV TZ=Asia/Shanghai

COPY --from=builder /out/ /app/

CMD ["node", "dist/main.cjs"]
