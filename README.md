# super-pro Monorepo

This repository is now managed as a `pnpm` workspace monorepo.

## Projects

- `frontend-template`: Vite + React frontend
- `login-template`: standalone login frontend template
- `general-server`: Node.js backend service

## Common Commands

Run all dev processes:

```bash
pnpm dev
```

Run a single app:

```bash
pnpm dev:frontend
pnpm dev:login-template
pnpm dev:server
```

Build all projects:

```bash
pnpm build
```

Run backend tests:

```bash
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:coverage
```
