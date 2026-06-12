import crypto from "node:crypto";
import { and, count, desc, eq, inArray, ne } from "drizzle-orm";

import { db } from "../db/index.js";
import { crewAssignments, dailyLogs, projectPhases, projects, user } from "../db/schema/index.js";
import type { AuthenticatedActor } from "../lib/authorization.js";
import { AppError, asAppError } from "../lib/http.js";
import { DAILY_LOG_STATUSES } from "../lib/status-rules.js";
import {
  assertEnumValue,
  parseDateOnly,
  parsePositiveInt,
  sanitizeOptionalText,
  sanitizeText,
} from "../lib/validation.js";
import { assertProjectReadable, listReadableProjectIds } from "./project-scope.js";
import { createProjectEvent } from "./project-events.js";
import { assertRecord, parsePagination, toIsoString } from "./shared.js";

const DAILY_LOG_ALLOWED_WRITERS = ["admin", "site_supervisor"] as const;

const normalizeLogDateKey = (value: Date) => value.toISOString().slice(0, 10);

const dailyLogPayload = (payload: Record<string, unknown>) => ({
  projectId: sanitizeText(payload.projectId, {
    field: "projectId",
    min: 3,
    max: 128,
  }),
  phaseId:
    typeof payload.phaseId === "string" && payload.phaseId ? payload.phaseId : null,
  logDate: parseDateOnly(payload.logDate, "logDate"),
  workforceCount: parsePositiveInt(payload.workforceCount, "workforceCount", {
    minimum: 0,
    maximum: 10_000,
  }),
  weather: sanitizeText(payload.weather, {
    field: "weather",
    min: 2,
    max: 80,
  }),
  completedWork: sanitizeText(payload.completedWork, {
    field: "completedWork",
    min: 5,
    max: 4_000,
  }),
  blockers: sanitizeOptionalText(payload.blockers, {
    field: "blockers",
    max: 2_000,
  }),
  safetyNotes: sanitizeOptionalText(payload.safetyNotes, {
    field: "safetyNotes",
    max: 2_000,
  }),
  status: assertEnumValue(payload.status ?? "draft", DAILY_LOG_STATUSES, "status"),
});

const resolveSupervisorId = (
  actor: AuthenticatedActor,
  payload: Record<string, unknown>,
) => {
  if (actor.role !== "admin") {
    return actor.id;
  }

  if (typeof payload.supervisorId === "string" && payload.supervisorId) {
    return payload.supervisorId;
  }

  throw new AppError(
    400,
    "VALIDATION_ERROR",
    "supervisorId is required when an admin creates a daily log.",
  );
};

const assertCanWriteDailyLogs = async (
  actor: AuthenticatedActor,
  projectId: string,
) => {
  if (
    actor.role !== DAILY_LOG_ALLOWED_WRITERS[0] &&
    actor.role !== DAILY_LOG_ALLOWED_WRITERS[1]
  ) {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "You are not allowed to create or update daily logs.",
    );
  }

  if (actor.role === "admin") {
    return;
  }

  const assignment = await db
    .select({ id: crewAssignments.id })
    .from(crewAssignments)
    .where(
      and(
        eq(crewAssignments.projectId, projectId),
        eq(crewAssignments.userId, actor.id),
        eq(crewAssignments.assignedRole, "site_supervisor"),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!assignment) {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "You must be assigned to this project as a site supervisor to write daily logs.",
    );
  }
};

const assertReferencedEntities = async (
  actor: AuthenticatedActor,
  values: ReturnType<typeof dailyLogPayload>,
  supervisorId: string,
) => {
  const [projectRecord, supervisorRecord, phaseRecord] = await Promise.all([
    db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, values.projectId))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({ id: user.id, role: user.role })
      .from(user)
      .where(eq(user.id, supervisorId))
      .limit(1)
      .then((rows) => rows[0]),
    values.phaseId
      ? db
          .select({ id: projectPhases.id, projectId: projectPhases.projectId })
          .from(projectPhases)
          .where(eq(projectPhases.id, values.phaseId))
          .limit(1)
          .then((rows) => rows[0])
      : Promise.resolve(undefined),
  ]);

  assertRecord(projectRecord, "Project not found.");
  const supervisor = assertRecord(supervisorRecord, "Supervisor not found.");

  if (supervisor.role !== "site_supervisor") {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Daily logs must belong to a site supervisor.",
    );
  }

  if (values.phaseId) {
    const phase = assertRecord(phaseRecord, "Project phase not found.");

    if (phase.projectId !== values.projectId) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "phaseId must belong to the selected project.",
      );
    }
  }
};

const serializeDailyLog = (
  actor: AuthenticatedActor,
  record: typeof dailyLogs.$inferSelect & {
    projectCode?: string;
    projectName?: string;
    phaseName?: string | null;
    supervisorName?: string | null;
  },
) => {
  const base = {
    id: record.id,
    projectId: record.projectId,
    projectCode: record.projectCode ?? null,
    projectName: record.projectName ?? null,
    phaseId: record.phaseId,
    phaseName: record.phaseName ?? null,
    supervisorId: record.supervisorId,
    supervisorName: record.supervisorName ?? null,
    logDate: normalizeLogDateKey(record.logDate),
    status: record.status,
    submittedAt: toIsoString(record.submittedAt),
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };

  if (actor.role === "client") {
    return base;
  }

  return {
    ...base,
    workforceCount: record.workforceCount,
    weather: record.weather,
    completedWork: record.completedWork,
    blockers: record.blockers,
    safetyNotes: record.safetyNotes,
  };
};

const getDailyLogRecord = async (id: string) =>
  db
    .select({
      id: dailyLogs.id,
      projectId: dailyLogs.projectId,
      projectCode: projects.code,
      projectName: projects.name,
      phaseId: dailyLogs.phaseId,
      phaseName: projectPhases.name,
      supervisorId: dailyLogs.supervisorId,
      supervisorName: user.name,
      logDate: dailyLogs.logDate,
      workforceCount: dailyLogs.workforceCount,
      weather: dailyLogs.weather,
      completedWork: dailyLogs.completedWork,
      blockers: dailyLogs.blockers,
      safetyNotes: dailyLogs.safetyNotes,
      status: dailyLogs.status,
      submittedAt: dailyLogs.submittedAt,
      createdAt: dailyLogs.createdAt,
      updatedAt: dailyLogs.updatedAt,
    })
    .from(dailyLogs)
    .innerJoin(projects, eq(dailyLogs.projectId, projects.id))
    .leftJoin(projectPhases, eq(dailyLogs.phaseId, projectPhases.id))
    .innerJoin(user, eq(dailyLogs.supervisorId, user.id))
    .where(eq(dailyLogs.id, id))
    .limit(1)
    .then((rows) => rows[0]);

const assertSubmittedUniqueness = async ({
  projectId,
  supervisorId,
  logDate,
  currentId,
}: {
  projectId: string;
  supervisorId: string;
  logDate: Date;
  currentId?: string;
}) => {
  const existing = await db
    .select({
      id: dailyLogs.id,
      logDate: dailyLogs.logDate,
    })
    .from(dailyLogs)
    .where(
      and(
        eq(dailyLogs.projectId, projectId),
        eq(dailyLogs.supervisorId, supervisorId),
        eq(dailyLogs.status, "submitted"),
        currentId ? ne(dailyLogs.id, currentId) : undefined,
      ),
    );

  const duplicate = existing.some(
    (record) => normalizeLogDateKey(record.logDate) === normalizeLogDateKey(logDate),
  );

  if (duplicate) {
    throw new AppError(
      409,
      "DUPLICATE_RECORD",
      "A submitted daily log already exists for this supervisor, project, and date.",
    );
  }
};

export const listDailyLogs = async (
  actor: AuthenticatedActor,
  query: Record<string, unknown>,
) => {
  const { page, limit, offset } = parsePagination(query);
  const readableIds = await listReadableProjectIds(actor);
  const projectId =
    typeof query.projectId === "string" && query.projectId ? query.projectId : null;

  if (projectId) {
    await assertProjectReadable(actor, projectId);
  }

  const scopeWhere =
    readableIds == null
      ? undefined
      : readableIds.length > 0
        ? inArray(dailyLogs.projectId, readableIds)
        : eq(dailyLogs.projectId, "__no_access__");

  const where =
    projectId && scopeWhere
      ? and(scopeWhere, eq(dailyLogs.projectId, projectId))
      : projectId
        ? eq(dailyLogs.projectId, projectId)
        : scopeWhere;

  const [rows, total] = await Promise.all([
    db
      .select({
        id: dailyLogs.id,
        projectId: dailyLogs.projectId,
        projectCode: projects.code,
        projectName: projects.name,
        phaseId: dailyLogs.phaseId,
        phaseName: projectPhases.name,
        supervisorId: dailyLogs.supervisorId,
        supervisorName: user.name,
        logDate: dailyLogs.logDate,
        workforceCount: dailyLogs.workforceCount,
        weather: dailyLogs.weather,
        completedWork: dailyLogs.completedWork,
        blockers: dailyLogs.blockers,
        safetyNotes: dailyLogs.safetyNotes,
        status: dailyLogs.status,
        submittedAt: dailyLogs.submittedAt,
        createdAt: dailyLogs.createdAt,
        updatedAt: dailyLogs.updatedAt,
      })
      .from(dailyLogs)
      .innerJoin(projects, eq(dailyLogs.projectId, projects.id))
      .leftJoin(projectPhases, eq(dailyLogs.phaseId, projectPhases.id))
      .innerJoin(user, eq(dailyLogs.supervisorId, user.id))
      .where(where)
      .orderBy(desc(dailyLogs.logDate), desc(dailyLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(dailyLogs)
      .where(where)
      .then((records) => records[0]?.total ?? 0),
  ]);

  return {
    data: rows.map((record) => serializeDailyLog(actor, record)),
    page,
    limit,
    total,
  };
};

export const getDailyLog = async (actor: AuthenticatedActor, id: string) => {
  const record = assertRecord(await getDailyLogRecord(id), "Daily log not found.");
  await assertProjectReadable(actor, record.projectId);
  return serializeDailyLog(actor, record);
};

export const createDailyLog = async (
  actor: AuthenticatedActor,
  payload: Record<string, unknown>,
) => {
  try {
    const values = dailyLogPayload(payload);
    const supervisorId = resolveSupervisorId(actor, payload);

    if (values.status !== "draft") {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Daily logs are created as drafts and must be submitted separately.",
      );
    }

    await assertCanWriteDailyLogs(actor, values.projectId);
    await assertReferencedEntities(actor, values, supervisorId);

    const id = crypto.randomUUID();
    await db.insert(dailyLogs).values({
      id,
      ...values,
      supervisorId,
      status: "draft",
      submittedAt: null,
    });

    return getDailyLog(actor, id);
  } catch (error) {
    throw asAppError(error);
  }
};

export const updateDailyLog = async (
  actor: AuthenticatedActor,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const existing = assertRecord(await getDailyLogRecord(id), "Daily log not found.");
    await assertProjectReadable(actor, existing.projectId);

    if (existing.status !== "draft") {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Submitted daily logs are read-only in v1.",
      );
    }

    if (actor.role !== "admin" && actor.id !== existing.supervisorId) {
      throw new AppError(
        403,
        "ACCESS_DENIED",
        "You can only update your own draft daily logs.",
      );
    }

    const values = dailyLogPayload(payload);

    if (values.projectId !== existing.projectId) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "projectId cannot be changed for an existing daily log.",
      );
    }

    if (values.status !== "draft") {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Use the submit workflow to change a daily log status.",
      );
    }

    await assertCanWriteDailyLogs(actor, values.projectId);
    await assertReferencedEntities(actor, values, existing.supervisorId);

    await db
      .update(dailyLogs)
      .set({
        ...values,
        status: "draft",
        submittedAt: null,
      })
      .where(eq(dailyLogs.id, id));

    return getDailyLog(actor, id);
  } catch (error) {
    throw asAppError(error);
  }
};

export const submitDailyLog = async (
  actor: AuthenticatedActor,
  id: string,
) => {
  try {
    const existing = assertRecord(await getDailyLogRecord(id), "Daily log not found.");
    await assertProjectReadable(actor, existing.projectId);

    if (existing.status !== "draft") {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Only draft daily logs can be submitted.",
      );
    }

    if (actor.role !== "admin" && actor.id !== existing.supervisorId) {
      throw new AppError(
        403,
        "ACCESS_DENIED",
        "You can only submit your own draft daily logs.",
      );
    }

    await assertCanWriteDailyLogs(actor, existing.projectId);
    await assertSubmittedUniqueness({
      projectId: existing.projectId,
      supervisorId: existing.supervisorId,
      logDate: existing.logDate,
      currentId: existing.id,
    });

    const submittedAt = new Date();

    await db
      .update(dailyLogs)
      .set({
        status: "submitted",
        submittedAt,
      })
      .where(eq(dailyLogs.id, id));

    await createProjectEvent({
      actor,
      projectId: existing.projectId,
      entityType: "daily_log",
      entityId: existing.id,
      eventType: "daily_log_submitted",
      summary: `Daily log submitted for ${normalizeLogDateKey(existing.logDate)} by ${existing.supervisorName ?? "site supervisor"}.`,
    });

    return getDailyLog(actor, id);
  } catch (error) {
    throw asAppError(error);
  }
};
