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
