import "./lib/load-env.js";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import * as Sentry from "@sentry/node";
import * as promClient from "prom-client";
import logger from "./lib/logger.js";
import crypto from "crypto";
import { toNodeHandler } from "better-auth/node";
import { z } from "zod";

import { getArcjetConfig } from "./config/arcjet.js";
import { auditError } from "./lib/audit.js";
import { auth } from "./lib/auth.js";
import { buildDataResponse } from "./lib/api-response.js";
import { AppError, buildClientErrorResponse } from "./lib/http.js";
import {
  getAuthenticatedActor,
  requireAuthenticated,
} from "./lib/authorization.js";
import {
  attachAuthenticatedUser,
  attachRequestId,
  blockStaffSelfSignup,
} from "./middleware/request-context.js";
import { crewAssignmentsRouter } from "./routes/crew-assignments.js";
import { changeOrdersRouter } from "./routes/change-orders.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { dailyLogsRouter } from "./routes/daily-logs.js";
import { projectPhasesRouter } from "./routes/project-phases.js";
import { projectsRouter } from "./routes/projects.js";
import { punchItemsRouter } from "./routes/punch-items.js";
import { usersRouter } from "./routes/users.js";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
});

const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL ?? process.env.APP_ORIGIN,
});

const app = express();
const arcjet = getArcjetConfig();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: env.NODE_ENV,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
});

app.disable("x-powered-by");

// Security and hardening
app.use(Sentry.Handlers.requestHandler());
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 60_000,
    max: Number(process.env.RATE_LIMIT_MAX ?? 120),
  }),
);

app.use(
  cors({
    origin: env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

// Ensure auth cookies set by upstream handlers include secure flags in prod
app.use((req, res, next) => {
  const origSetHeader = res.setHeader.bind(res) as typeof res.setHeader;
  res.setHeader = function (
    name: string | number,
    value: string | string[] | number | readonly string[] | undefined,
  ) {
    try {
      if (String(name).toLowerCase() === "set-cookie" && value) {
        const cookies = Array.isArray(value) ? value.slice() : [String(value)];
        const flags =
          env.NODE_ENV === "production"
            ? "; Secure; SameSite=Strict; HttpOnly"
            : "; HttpOnly";
        const modified = cookies.map((c) => {
          const lc = String(c).toLowerCase();
          if (
            lc.includes("samesite") ||
            lc.includes("secure") ||
            lc.includes("httponly")
          )
            return String(c);
          return String(c) + flags;
        });
        return origSetHeader(
          "Set-Cookie",
          modified,
        );
      }
    } catch (e) {
      // If anything goes wrong here, don't break the response path.
      logger.warn({ err: e }, "cookie-flag-middleware-failed");
    }

    return origSetHeader(name, value as any);
  };

  next();
});

app.use(express.json());
app.use(attachRequestId);
app.use(attachAuthenticatedUser);

// Prometheus default metrics
try {
  promClient.collectDefaultMetrics({ prefix: "sitepulse_" });
} catch (err) {
  logger.warn({ err }, "prom-client-init-failed");
}

app.use("/api/auth/sign-up/email", blockStaffSelfSignup);
app.use("/api/auth", toNodeHandler(auth));

app.get("/health", (_req, res) => {
  res.status(200).json({
    data: {
      service: "sitepulse-backend",
      status: "ok",
      environment: env.NODE_ENV,
      arcjetEnabled: arcjet.enabled,
    },
  });
});

app.get("/ready", (_req, res) => {
  res.status(200).json({ data: { ready: true } });
});

app.get("/metrics", async (_req, res) => {
  try {
    res.setHeader("Content-Type", promClient.register.contentType);
    const metrics = await promClient.register.metrics();
    res.send(metrics);
  } catch (err) {
    logger.warn({ err }, "metrics-error");
    res.status(500).send("metrics unavailable");
  }
});

app.get("/api/session", (req, res) => {
  const actor = getAuthenticatedActor(req);

  res.status(200).json(
    buildDataResponse({
      id: actor.id,
      role: actor.role,
    }),
  );
});

app.get("/api/me", (req, res) => {
  const actor = requireAuthenticated(req, "view your SitePulse profile");

  res.status(200).json(
    buildDataResponse({
      id: actor.id,
      role: actor.role,
    }),
  );
});

app.use("/api/projects", projectsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/project-phases", projectPhasesRouter);
app.use("/api/crew-assignments", crewAssignmentsRouter);
app.use("/api/change-orders", changeOrdersRouter);
app.use("/api/daily-logs", dailyLogsRouter);
app.use("/api/punch-items", punchItemsRouter);
app.use("/api/users", usersRouter);

app.use((_req, res) => {
  res.status(404).json({
    code: "NOT_FOUND",
    message: "Route not found",
  });
});

app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const normalizedError =
      err instanceof AppError
        ? err
        : new AppError(
            500,
            "INTERNAL_ERROR",
            "An unexpected SitePulse system error occurred.",
          );
    auditError(req, "UNHANDLED_REQUEST_FAILURE", err, "express", {
      normalizedCode: normalizedError.code,
    });

    try {
      Sentry.captureException(err);
    } catch (e) {
      logger.warn({ err: e }, "sentry-capture-failed");
    }

    logger.error(
      {
        err:
          err instanceof Error
            ? { message: err.message, stack: err.stack }
            : String(err),
      },
      "unhandled_request_failure",
    );

    const response = buildClientErrorResponse(normalizedError);
    res.status(response.statusCode).json(response.body);
  },
);

app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, frontend: env.FRONTEND_URL, arcjet: arcjet.enabled },
    "sitepulse_backend_listening",
  );
});

// Attach Sentry error handler last (after our error handling) as a safety net
app.use(Sentry.Handlers.errorHandler());
