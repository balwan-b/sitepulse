/*
Checklist: Audit implementation tasks
- [ ] Add helmet and express-rate-limit to sitepulse-backend/src/index.ts and configure safe defaults
- [ ] Enforce Secure and SameSite cookie flags for production auth cookies (Better Auth config)
- [ ] Replace console.* with a structured logger (pino/winston) and add environment gating
- [ ] Integrate Sentry (or equivalent) for error reporting and link to structured logs
- [ ] Add GitHub Actions workflow: test, lint, typecheck, build; expose badges in README
- [ ] Add readiness and /metrics endpoints (Prometheus) and a /healthz readiness check
- [ ] Implement caching for dashboard endpoints (Redis/HTTP cache) and consider read-replicas
- [ ] Add ETag/Last-Modified for list endpoints and heavy GETs
- [ ] Replace direct document.cookie usage in frontend with js-cookie abstraction and secure handling
- [ ] Add global React error boundary and consistent skeleton/loading components
- [ ] Add Dockerfile and concise deploy guide for production
- [ ] Add automated seed script guard (non-destructive flag) and safer demo tooling
- [ ] Confirm secrets are removed from all pushed remotes and rotate keys where necessary
*/
import type { Request } from "express";

const buildContext = (
  req: Request,
  event: string,
  target: string,
  metadata?: Record<string, unknown>,
) => ({
  requestId: req.requestId ?? null,
  actorId: req.user?.id ?? null,
  actorRole: req.user?.role ?? null,
  target,
  event,
  ...metadata,
});

export const auditInfo = (
  req: Request,
  event: string,
  target: string,
  metadata?: Record<string, unknown>,
) => {
  console.info("[audit]", buildContext(req, event, target, metadata));
};

export const auditWarn = (
  req: Request,
  event: string,
  target: string,
  metadata?: Record<string, unknown>,
) => {
  console.warn("[audit]", buildContext(req, event, target, metadata));
};

export const auditError = (
  req: Request,
  event: string,
  error: unknown,
  target: string,
  metadata?: Record<string, unknown>,
) => {
  console.error("[audit]", {
    ...buildContext(req, event, target, metadata),
    error: error instanceof Error ? error.message : String(error),
  });
};
