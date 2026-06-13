# SitePulse Frontend

The frontend is a React 19 + Refine application tailored to the SitePulse construction-operations demo. It provides role-aware dashboards and workflow screens for projects, phases, daily logs, punch items, change orders, and the client portal.

## Local Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

## Environment

Copy `.env.example` to `.env` when you need to point the app at a non-default backend.

```bash
VITE_BACKEND_BASE_URL=http://localhost:4000
```

## Production Notes

- `pnpm build` runs TypeScript compilation and a Vite production build.
- Route-level lazy loading keeps the initial bundle smaller for dashboard-first navigation.
- `pnpm start` serves the built app through Vite preview for local smoke testing.
