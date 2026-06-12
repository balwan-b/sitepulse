import "./lib/load-env.js";

import cors from "cors";
import express from "express";
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
import { dailyLogsRouter } from "./routes/daily-logs.js";
import { projectPhasesRouter } from "./routes/project-phases.js";
import { projectsRouter } from "./routes/projects.js";
import { usersRouter } from "./routes/users.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
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

app.disable("x-powered-by");
app.use(
  cors({
    origin: env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(attachRequestId);
app.use(attachAuthenticatedUser);

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
app.use("/api/project-phases", projectPhasesRouter);
app.use("/api/crew-assignments", crewAssignmentsRouter);
app.use("/api/daily-logs", dailyLogsRouter);
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

    const response = buildClientErrorResponse(normalizedError);
    res.status(response.statusCode).json(response.body);
  },
);

app.listen(env.PORT, () => {
  console.log(
    `SitePulse backend listening on http://localhost:${env.PORT} for ${env.FRONTEND_URL} (arcjet ${arcjet.enabled ? "enabled" : "disabled"})`,
  );
});
