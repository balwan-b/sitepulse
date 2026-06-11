import crypto from "node:crypto";
import { and, count, desc, eq, inArray } from "drizzle-orm";

import { db } from "../db/index.js";
import { projectPhases, projects } from "../db/schema/index.js";
import type { AuthenticatedActor } from "../lib/authorization.js";
import { AppError, asAppError } from "../lib/http.js";
import { PHASE_STATUSES } from "../lib/status-rules.js";
import {
  assertEnumValue,
  parsePositiveInt,
  sanitizeText,
} from "../lib/validation.js";
import { assertProjectManageable, assertProjectReadable, listReadableProjectIds } from "./project-scope.js";
import { parsePagination, assertRecord, toIsoString } from "./shared.js";

const phasePayload = (payload: Record<string, unknown>) => ({
  projectId: sanitizeText(payload.projectId, {
    field: "projectId",
    min: 3,
    max: 128,
  }),
  name: sanitizeText(payload.name, {
    field: "name",
    min: 2,
    max: 120,
  }),
  sequence: parsePositiveInt(payload.sequence, "sequence", {
    minimum: 1,
    maximum: 1_000,
  }),
  status: assertEnumValue(payload.status, PHASE_STATUSES, "status"),
});

const serializePhase = (
  record: typeof projectPhases.$inferSelect & {
    projectCode?: string;
    projectName?: string;
  },
) => ({
  id: record.id,
  projectId: record.projectId,
  projectCode: record.projectCode ?? null,
  projectName: record.projectName ?? null,
  name: record.name,
  sequence: record.sequence,
  status: record.status,
  createdAt: toIsoString(record.createdAt),
  updatedAt: toIsoString(record.updatedAt),
});

const assertProjectExists = async (projectId: string) => {
  const record = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
    .then((rows) => rows[0]);

  assertRecord(record, "Project not found.");
};

export const listProjectPhases = async (
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
        ? inArray(projectPhases.projectId, readableIds)
        : eq(projectPhases.projectId, "__no_access__");

  const where =
    projectId && scopeWhere
      ? and(scopeWhere, eq(projectPhases.projectId, projectId))
      : projectId
        ? eq(projectPhases.projectId, projectId)
        : scopeWhere;

  const [rows, total] = await Promise.all([
    db
      .select({
        id: projectPhases.id,
        projectId: projectPhases.projectId,
        projectCode: projects.code,
        projectName: projects.name,
        name: projectPhases.name,
        sequence: projectPhases.sequence,
        status: projectPhases.status,
        createdAt: projectPhases.createdAt,
        updatedAt: projectPhases.updatedAt,
      })
      .from(projectPhases)
      .innerJoin(projects, eq(projectPhases.projectId, projects.id))
      .where(where)
      .orderBy(desc(projectPhases.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(projectPhases)
      .where(where)
      .then((records) => records[0]?.total ?? 0),
  ]);

  return {
    data: rows.map(serializePhase),
    page,
    limit,
    total,
  };
};

export const getProjectPhase = async (actor: AuthenticatedActor, id: string) => {
  const record = await db
    .select({
      id: projectPhases.id,
      projectId: projectPhases.projectId,
      projectCode: projects.code,
      projectName: projects.name,
      name: projectPhases.name,
      sequence: projectPhases.sequence,
      status: projectPhases.status,
      createdAt: projectPhases.createdAt,
      updatedAt: projectPhases.updatedAt,
    })
    .from(projectPhases)
    .innerJoin(projects, eq(projectPhases.projectId, projects.id))
    .where(eq(projectPhases.id, id))
    .limit(1)
    .then((rows) => rows[0]);

  const phase = assertRecord(record, "Project phase not found.");
  await assertProjectReadable(actor, phase.projectId);

  return serializePhase(phase);
};

export const createProjectPhase = async (
  actor: AuthenticatedActor,
  payload: Record<string, unknown>,
) => {
  try {
    const values = phasePayload(payload);
    await assertProjectExists(values.projectId);
    await assertProjectManageable(actor, values.projectId);

    const id = crypto.randomUUID();
    await db.insert(projectPhases).values({
      id,
      ...values,
    });

    return getProjectPhase(actor, id);
  } catch (error) {
    throw asAppError(error);
  }
};

export const updateProjectPhase = async (
  actor: AuthenticatedActor,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const existing = await db
      .select({
        id: projectPhases.id,
        projectId: projectPhases.projectId,
        status: projectPhases.status,
      })
      .from(projectPhases)
      .where(eq(projectPhases.id, id))
      .limit(1)
      .then((rows) => rows[0]);

    const phase = assertRecord(existing, "Project phase not found.");
    await assertProjectManageable(actor, phase.projectId);

    const values = phasePayload(payload);

    if (values.projectId !== phase.projectId) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "projectId cannot be changed for an existing phase.",
      );
    }

    if (
      phase.status === "completed" &&
      values.status !== "completed" &&
      actor.role !== "admin"
    ) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Completed phases cannot move backward in v1.",
      );
    }

    await db.update(projectPhases).set(values).where(eq(projectPhases.id, id));

    return getProjectPhase(actor, id);
  } catch (error) {
    throw asAppError(error);
  }
};
