import crypto from "node:crypto";
import { count, desc, eq, inArray } from "drizzle-orm";

import { db } from "../db/index.js";
import { projects, user } from "../db/schema/index.js";
import type { AuthenticatedActor } from "../lib/authorization.js";
import { AppError, asAppError } from "../lib/http.js";
import type { ProjectStatus } from "../lib/status-rules.js";
import { PROJECT_STATUSES } from "../lib/status-rules.js";
import {
  assertEnumValue,
  parseIsoDate,
  parsePositiveInt,
  sanitizeText,
  validateIdentifier,
} from "../lib/validation.js";
import { assertProjectManageable, assertProjectReadable, listReadableProjectIds } from "./project-scope.js";
import { assertRecord, parsePagination, toIsoString } from "./shared.js";

const projectPayload = (payload: Record<string, unknown>) => {
  const startDate = parseIsoDate(payload.startDate, "startDate");
  const endDate =
    payload.endDate == null || payload.endDate === ""
      ? null
      : parseIsoDate(payload.endDate, "endDate");

  if (endDate && endDate < startDate) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "endDate must be on or after startDate.",
    );
  }

  return {
    code: validateIdentifier(payload.code, "code").toUpperCase(),
    name: sanitizeText(payload.name, {
      field: "name",
      min: 2,
      max: 120,
    }),
    clientName: sanitizeText(payload.clientName, {
      field: "clientName",
      min: 2,
      max: 120,
    }),
    location: sanitizeText(payload.location, {
      field: "location",
      min: 2,
      max: 160,
    }),
    contractValue: parsePositiveInt(payload.contractValue, "contractValue", {
      minimum: 0,
      maximum: 10_000_000_000,
    }),
    startDate,
    endDate,
    status: assertEnumValue(payload.status, PROJECT_STATUSES, "status"),
    projectManagerId:
      typeof payload.projectManagerId === "string" && payload.projectManagerId
        ? payload.projectManagerId
        : null,
  };
};

const serializeProject = (
  record: typeof projects.$inferSelect & {
    projectManagerName?: string | null;
    projectManagerEmail?: string | null;
  },
) => ({
  id: record.id,
  code: record.code,
  name: record.name,
  clientName: record.clientName,
  location: record.location,
  contractValue: record.contractValue,
  startDate: toIsoString(record.startDate),
  endDate: toIsoString(record.endDate),
  status: record.status,
  projectManagerId: record.projectManagerId,
  projectManagerName: record.projectManagerName ?? null,
  projectManagerEmail: record.projectManagerEmail ?? null,
  createdAt: toIsoString(record.createdAt),
  updatedAt: toIsoString(record.updatedAt),
});

const assertProjectManager = async (projectManagerId: string | null) => {
  if (!projectManagerId) {
    return;
  }

  const manager = await db
    .select({
      id: user.id,
      role: user.role,
    })
    .from(user)
    .where(eq(user.id, projectManagerId))
    .limit(1)
    .then((records) => records[0]);

  if (!manager) {
    throw new AppError(400, "VALIDATION_ERROR", "projectManagerId is invalid.");
  }

  if (manager.role !== "project_manager") {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "projectManagerId must reference a project manager account.",
    );
  }
};

export const listProjects = async (
  actor: AuthenticatedActor,
  query: Record<string, unknown>,
) => {
  const { page, limit, offset } = parsePagination(query);
  const readableIds = await listReadableProjectIds(actor);
  const where =
    readableIds == null
      ? undefined
      : readableIds.length > 0
        ? inArray(projects.id, readableIds)
        : eq(projects.id, "__no_access__");

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: projects.id,
        code: projects.code,
        name: projects.name,
        clientName: projects.clientName,
        location: projects.location,
        contractValue: projects.contractValue,
        startDate: projects.startDate,
        endDate: projects.endDate,
        status: projects.status,
        projectManagerId: projects.projectManagerId,
        projectManagerName: user.name,
        projectManagerEmail: user.email,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .leftJoin(user, eq(projects.projectManagerId, user.id))
      .where(where)
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(projects)
      .where(where)
      .then((records) => records[0]?.total ?? 0),
  ]);

  return {
    data: rows.map(serializeProject),
    page,
    limit,
    total: totalRows,
  };
};

export const getProject = async (actor: AuthenticatedActor, id: string) => {
  await assertProjectReadable(actor, id);

  const record = await db
    .select({
      id: projects.id,
      code: projects.code,
      name: projects.name,
      clientName: projects.clientName,
      location: projects.location,
      contractValue: projects.contractValue,
      startDate: projects.startDate,
      endDate: projects.endDate,
      status: projects.status,
      projectManagerId: projects.projectManagerId,
      projectManagerName: user.name,
      projectManagerEmail: user.email,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .leftJoin(user, eq(projects.projectManagerId, user.id))
    .where(eq(projects.id, id))
    .limit(1)
    .then((records) => records[0]);

  return serializeProject(assertRecord(record, "Project not found."));
};

export const createProject = async (
  actor: AuthenticatedActor,
  payload: Record<string, unknown>,
) => {
  try {
    if (actor.role !== "admin") {
      throw new AppError(
        403,
        "ACCESS_DENIED",
        "You are not allowed to create SitePulse projects.",
      );
    }

    const values = projectPayload(payload);
    await assertProjectManager(values.projectManagerId);

    const id = crypto.randomUUID();

    await db.insert(projects).values({
      id,
      ...values,
    });

    return getProject(actor, id);
  } catch (error) {
    throw asAppError(error);
  }
};

export const updateProject = async (
  actor: AuthenticatedActor,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    await assertProjectManageable(actor, id);
    const existing = await db
      .select({ id: projects.id, status: projects.status })
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1)
      .then((records) => records[0]);

    const current = assertRecord(existing, "Project not found.");

    const values = projectPayload(payload);
    await assertProjectManager(values.projectManagerId);

    if (
      current.status === "completed" &&
      values.status !== "completed" &&
      actor.role !== "admin"
    ) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Completed projects cannot move backward in v1.",
      );
    }

    await db.update(projects).set(values).where(eq(projects.id, id));

    return getProject(actor, id);
  } catch (error) {
    throw asAppError(error);
  }
};

export const projectStatusOptions = PROJECT_STATUSES satisfies readonly ProjectStatus[];
