import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

import { auth } from "../lib/auth.js";
import { assertCanPubliclyRegister } from "../lib/authorization.js";
import { auditWarn } from "../lib/audit.js";
import logger from "../lib/logger.js";

const hasBetterAuthSessionTokenCookie = (cookieHeader?: string) =>
  typeof cookieHeader === "string" &&
  (cookieHeader.includes("__Secure-better-auth.session_token=") ||
    cookieHeader.includes("better-auth.session_token=") ||
    cookieHeader.includes("better-auth-session_token="));

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
    const cookieHeader =
      typeof req.headers.cookie === "string" ? req.headers.cookie : undefined;

    for (const [key, value] of Object.entries(req.headers)) {
      if (value == null) continue;
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }

    const session = await auth.api.getSession({
      headers,
      query: {
        disableCookieCache: true,
      },
    });

    if (session?.user) {
      req.user = {
        id: session.user.id,
        role: session.user.role as
          | "admin"
          | "project_manager"
          | "site_supervisor"
          | "client",
      };
    } else if (hasBetterAuthSessionTokenCookie(cookieHeader)) {
      logger.warn(
        {
          requestId: req.requestId,
          path: req.path,
          origin: req.headers.origin,
          host: req.headers.host,
          hasCookieHeader: Boolean(cookieHeader),
          hasSessionTokenCookie: true,
        },
        "better_auth_session_cookie_present_but_no_user_resolved",
      );
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
