# SitePulse

SitePulse is a portfolio SaaS MVP for construction field operations. It demonstrates how a role-aware internal operations tool can coordinate project setup, field reporting, punch resolution, and commercial change-order review without exposing internal staff workflows to clients.

## Product Summary

SitePulse is designed around four roles:

- `admin`: configures the portfolio, staff access, and high-level oversight
- `project_manager`: owns project execution, change-order review, and delivery coordination
- `site_supervisor`: submits daily logs and drives field issue resolution
- `client`: sees a restricted progress view with approved commercial outcomes only

The current MVP supports:

- project setup and ownership
- project phase planning
- crew assignment scoping
- daily log drafting and submission
- punch item tracking with constrained status transitions
- change order drafting, submission, approval, and rejection
- role-specific dashboards and curated project timelines

## Architecture

The repository is split into two applications:

- `sitepulse-backend`: Express API, Better Auth, Drizzle ORM, PostgreSQL
- `sitepulse-frontend`: React 19 + Refine + Tailwind UI shell

High-level request flow:

1. Better Auth manages session and credential flows in the backend.
2. Express routes enforce RBAC and delegate business rules to service modules.
3. Drizzle models project, staffing, reporting, punch, event, and change-order data in PostgreSQL.
4. The frontend consumes the API through a small Refine-compatible data provider.
5. Dashboard and detail pages shape that raw data into role-aware operational views.

## RBAC Model

SitePulse uses scoped RBAC rather than a single global admin/staff distinction.

- `admin` can see and manage the full portfolio.
- `project_manager` can manage projects they own or are assigned to.
- `site_supervisor` can work only inside assigned projects and cannot approve change orders.
- `client` can see project context and approved change orders, but not internal staff workflows like daily logs or punch boards.

Public registration is intentionally limited to `client` accounts. Staff identities are expected to be provisioned administratively.

## Local Setup

### Backend

1. Create `sitepulse-backend/.env` with at least:
   `DATABASE_URL`, `BETTER_AUTH_SECRET`, `FRONTEND_URL`, and `ARCJET_KEY`
2. Run `pnpm install`
3. Run `pnpm --dir sitepulse-backend db:migrate`
4. Start the API with `pnpm --dir sitepulse-backend dev`

### Frontend

1. Copy `sitepulse-frontend/.env.example` to `.env` if you need to override `VITE_BACKEND_BASE_URL`
2. Run `pnpm install`
3. Start the app with `pnpm --dir sitepulse-frontend dev`

## Railway Deployment

Recommended Railway layout:

- Create one service for `sitepulse-backend`
- Create one service for `sitepulse-frontend`
- Set each service root to its own directory
- Use the Dockerfile in that directory for the build

Required production envs:

- Backend: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `FRONTEND_URL`
- Frontend: `VITE_BACKEND_BASE_URL`

Production URLs should point at the Railway domains for the other service. For example:

- `BETTER_AUTH_URL` should be the backend URL
- `FRONTEND_URL` should be the frontend URL
- `VITE_BACKEND_BASE_URL` should be the backend URL inside the frontend container proxy

Auth deployment note:

- The frontend production container now reverse-proxies `/api` to the backend so the browser stays on one origin for auth.
- Leave `PUBLIC_API_BASE_URL` unset in Railway production so the app uses same-origin `/api/...` requests.
- Keep `VITE_BACKEND_BASE_URL` pointed at the backend service URL so the frontend container knows where to proxy.

If you use a Railway PostgreSQL database, wire its connection string into `DATABASE_URL` before first deploy.

## Demo Seed Flow

The repository includes a documented demo fixture:

- [demo-seed.json](/home/balwan/Myprojects/portfolioprojects/SitePulse/sitepulse-backend/demo/demo-seed.json)
- [domain-seed.sql](/home/balwan/Myprojects/portfolioprojects/SitePulse/sitepulse-backend/demo/domain-seed.sql)

Recommended setup:

1. Review the fixture accounts and project data in `demo-seed.json`.
2. Run `node demo/reset-and-seed-neon.mjs` from `sitepulse-backend` against the target database.
3. Sign in under each role and confirm the seeded project, punch item, daily log, and approved change order appear in the expected views.

This script recreates the schema, reapplies the Drizzle migrations, seeds Better Auth credential users, and loads the deterministic domain fixture.

## Demo Walkthrough

Use this path during a portfolio presentation:

1. Sign in as `admin` and open the dashboard to show portfolio stats, staffing coverage, and recent timeline activity.
2. Open `North Yard Logistics Hub` to show project phases, assignments, and the curated timeline.
3. Sign in as `project_manager` and review the approved change order plus outstanding field issues.
4. Sign in as `site_supervisor` and show the daily log and punch-item workflow surfaces.
5. Sign in as `client` and show that only approved change orders and curated project visibility remain visible.

## Testing

Backend tests use Node’s built-in test runner:

- `pnpm --dir sitepulse-backend test`

Frontend tests also use Node’s built-in test runner with `tsx` for pure-module checks:

- `pnpm --dir sitepulse-frontend test`
- `pnpm --dir sitepulse-frontend lint`
- `pnpm --dir sitepulse-frontend typecheck`
- `pnpm --dir sitepulse-frontend build`

GitHub Actions CI:

- The workflow builds both Docker images directly, which mirrors the Railway deployment path for this repo.
- Docker image success is the current CI release gate because both frontend and backend are deployed to Railway from their Dockerfiles.

These cover:

- authorization, validation, status-rule, and HTTP helper behavior
- service-level safe error cases for daily logs, punch items, and change orders
- frontend schema parsing, provider requests, public registration policy, role-aware resource visibility, and empty-state copy

## Portfolio Packaging

A screenshot shotlist lives at [docs/screenshots/README.md](/home/balwan/Myprojects/portfolioprojects/SitePulse/docs/screenshots/README.md). Capture one dashboard per role plus the project and change-order detail pages after loading the demo fixture.

## MVP vs Production

This project is intentionally MVP-scoped.

Current MVP choices:

- client visibility is curated rather than fully self-service
- tests focus on core domain rules and safe errors, not exhaustive browser rendering
- demo seeding uses a destructive full-reset script and deterministic fixture data

Production follow-ups would likely include:

- fully automated seeded auth identities
- end-to-end browser tests
- audit logs with richer actor metadata
- attachment uploads for logs, punch items, and change orders
- notifications, reminders, and SLA tracking
- hardened tenancy and organizational boundaries
