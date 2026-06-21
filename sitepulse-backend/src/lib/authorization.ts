import type { Request } from "express";

import { AppError } from "./http.js";

export const SITEPULSE_ROLES = [
  "admin",
  "project_manager",
  "site_supervisor",
  "client",
] as const;

export type ActorRole = (typeof SITEPULSE_ROLES)[number];

export type AuthenticatedActor = {
  id: string;
  role: ActorRole;
};

export const getAuthenticatedActor = (req: Request): AuthenticatedActor => {
  if (!req.user?.id || !req.user?.role) {
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "You must be signed in to access this SitePulse resource.",
    );
  }

  return {
    id: req.user.id,
    role: req.user.role,
  };
};

export const requireAnyRole = (
  req: Request,
  allowedRoles: readonly ActorRole[],
  action: string,
) => {
  const actor = getAuthenticatedActor(req);

  if (!allowedRoles.includes(actor.role)) {
    throw new AppError(403, "ACCESS_DENIED", `You are not allowed to ${action}.`);
  }

  return actor;
};

export const requireAuthenticated = (req: Request, action: string) =>
  requireAnyRole(req, SITEPULSE_ROLES, action);

export const requireAdmin = (req: Request, action: string) =>
  requireAnyRole(req, ["admin"] as const, action);

export const requireStaff = (req: Request, action: string) =>
  requireAnyRole(
    req,
    ["admin", "project_manager", "site_supervisor"] as const,
    action,
  );

export const requireProjectManagerOrAdmin = (req: Request, action: string) =>
  requireAnyRole(req, ["admin", "project_manager"] as const, action);

export const requireSupervisorOrManager = (req: Request, action: string) =>
  requireAnyRole(
    req,
    ["admin", "project_manager", "site_supervisor"] as const,
    action,
  );

export const assertCanPubliclyRegister = (requestedRole: unknown) => {
  if (requestedRole == null || requestedRole === "") {
    return "client" as const;
  }

  if (requestedRole !== "client") {
    throw new AppError(
      403,
      "PUBLIC_ROLE_REGISTRATION_DISABLED",
      "Only client accounts can be created through public registration.",
    );
  }

  return "client" as const;
};

export const canAccessResource = (
  actorRole: ActorRole,
  allowedRoles: readonly ActorRole[],
) => allowedRoles.includes(actorRole);
