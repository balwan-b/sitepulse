import type { Request } from "express";
import logger from "./logger.js";

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
  logger.info(buildContext(req, event, target, metadata), "audit");
};

export const auditWarn = (
  req: Request,
  event: string,
  target: string,
  metadata?: Record<string, unknown>,
) => {
  logger.warn(buildContext(req, event, target, metadata), "audit");
};

export const auditError = (
  req: Request,
  event: string,
  error: unknown,
  target: string,
  metadata?: Record<string, unknown>,
) => {
  const errPayload =
    error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: String(error) };

  logger.error(
    { ...buildContext(req, event, target, metadata), error: errPayload },
    "audit",
  );
};
