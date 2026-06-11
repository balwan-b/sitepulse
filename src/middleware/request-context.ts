import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

import { auth } from "../lib/auth.js";
import { assertCanPubliclyRegister } from "../lib/authorization.js";
import { auditWarn } from "../lib/audit.js";

export const attachRequestId = (req: Request, _res: Response, next: NextFunction) => {
  req.requestId = crypto.randomUUID();
  next();
};

export const attachAuthenticatedUser = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (value == null) continue;
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }

    const session = await auth.api.getSession({ headers });

    if (session?.user) {
      req.user = {
        id: session.user.id,
        role: session.user.role as
          | "admin"
          | "project_manager"
          | "site_supervisor"
          | "client",
      };
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const blockStaffSelfSignup = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    assertCanPubliclyRegister(req.body?.role);
    next();
  } catch (error) {
    auditWarn(req, "STAFF_SIGNUP_BLOCKED", "auth_registration", {
      requestedRole: req.body?.role,
    });

    if (error instanceof Error) {
      return res.status(403).json({
        code: "PUBLIC_ROLE_REGISTRATION_DISABLED",
        message: error.message,
      });
    }

    next(error);
  }
};
