import crypto from "node:crypto";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";

import { db } from "../db/index.js";
import { crewAssignments, projectPhases, projects, punchItems, user } from "../db/schema/index.js";
import type { AuthenticatedActor } from "../lib/authorization.js";
import { AppError, asAppError } from "../lib/http.js";
import {
  PUNCH_ITEM_SEVERITIES,
  PUNCH_ITEM_STATUSES,
  assertPunchItemTransition,
  type PunchItemStatus,
} from "../lib/status-rules.js";
import {
  assertEnumValue,
  parseDateOnly,
  sanitizeText,
} from "../lib/validation.js";
import { assertProjectReadable, listReadableProjectIds } from "./project-scope.js";
import { createProjectEvent } from "./project-events.js";
import { assertRecord, parseIdList, parsePagination, toIsoString } from "./shared.js";

const normalizeDateKey = (value: Date) => value.toISOString().slice(0, 10);

const punchItemPayload = (payload: Record<string, unknown>) => ({
  projectId: sanitizeText(payload.projectId, {
    field: "projectId",
    min: 3,
    max: 128,
  }),
  phaseId:
    typeof payload.phaseId === "string" && payload.phaseId ? payload.phaseId : null,
  title: sanitizeText(payload.title, {
    field: "title",
    min: 3,
    max: 160,
  }),
  description: sanitizeText(payload.description, {
    field: "description",
    min: 5,
    max: 4_000,
  }),
  severity: assertEnumValue(payload.severity, PUNCH_ITEM_SEVERITIES, "severity"),
  location: sanitizeText(payload.location, {
    field: "location",
    min: 2,
    max: 200,
  }),
  assigneeId:
    typeof payload.assigneeId === "string" && payload.assigneeId ? payload.assigneeId : null,
  dueDate: parseDateOnly(payload.dueDate, "dueDate"),
  status: assertEnumValue(payload.status ?? "open", PUNCH_ITEM_STATUSES, "status"),
});

const assertCanWritePunchItems = async (
  actor: AuthenticatedActor,
  projectId: string,
) => {
  if (actor.role === "client") {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "You are not allowed to create or update punch items.",
    );
  }

  if (actor.role === "admin") {
    return;
  }

  await assertProjectReadable(actor, projectId);
};

const assertCanReadPunchItems = async (
  actor: AuthenticatedActor,
  projectId: string,
) => {
  if (actor.role === "client") {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "Punch items are restricted to SitePulse staff roles.",
    );
  }

  await assertProjectReadable(actor, projectId);
};

const assertReferencedEntities = async (
  values: ReturnType<typeof punchItemPayload>,
) => {
  const [projectRecord, phaseRecord, assigneeRecord] = await Promise.all([
    db
      .select({
        id: projects.id,
        projectManagerId: projects.projectManagerId,
      })
      .from(projects)
      .where(eq(projects.id, values.projectId))
      .limit(1)
      .then((rows) => rows[0]),
    values.phaseId
      ? db
          .select({
            id: projectPhases.id,
            projectId: projectPhases.projectId,
          })
          .from(projectPhases)
          .where(eq(projectPhases.id, values.phaseId))
          .limit(1)
          .then((rows) => rows[0])
      : Promise.resolve(undefined),
    values.assigneeId
      ? db
          .select({
            id: user.id,
            role: user.role,
          })
          .from(user)
          .where(eq(user.id, values.assigneeId))
          .limit(1)
          .then((rows) => rows[0])
      : Promise.resolve(undefined),
  ]);

  const project = assertRecord(projectRecord, "Project not found.");

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

  if (values.assigneeId) {
    const assignee = assertRecord(assigneeRecord, "Assignee not found.");

    if (assignee.role !== "project_manager" && assignee.role !== "site_supervisor") {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "assigneeId must reference a project manager or site supervisor.",
      );
    }

    const collaborator =
      project.projectManagerId === values.assigneeId
        ? { id: values.assigneeId }
        : await db
            .select({ id: crewAssignments.id })
            .from(crewAssignments)
            .where(
              and(
                eq(crewAssignments.projectId, values.projectId),
                eq(crewAssignments.userId, values.assigneeId),
              ),
            )
            .limit(1)
            .then((rows) => rows[0]);

    if (!collaborator) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "assigneeId must belong to the selected project team.",
      );
    }
  }
};

const serializePunchItem = (
  record: {
    id: string;
    projectId: string;
    projectCode?: string | null;
    projectName?: string | null;
    phaseId: string | null;
    phaseName?: string | null;
    title: string;
    description: string;
    severity: (typeof PUNCH_ITEM_SEVERITIES)[number];
    location: string;
    assigneeId: string | null;
    assigneeName?: string | null;
    assigneeRole?: string | null;
    dueDate: Date;
    status: (typeof PUNCH_ITEM_STATUSES)[number];
    createdBy: string;
    createdByName?: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
) => ({
  id: record.id,
  projectId: record.projectId,
  projectCode: record.projectCode ?? null,
  projectName: record.projectName ?? null,
  phaseId: record.phaseId,
  phaseName: record.phaseName ?? null,
  title: record.title,
  description: record.description,
  severity: record.severity,
  location: record.location,
  assigneeId: record.assigneeId,
  assigneeName: record.assigneeName ?? null,
  assigneeRole: record.assigneeRole ?? null,
  dueDate: normalizeDateKey(record.dueDate),
  status: record.status,
  createdBy: record.createdBy,
  createdByName: record.createdByName ?? null,
  isOverdue:
    record.status !== "closed" &&
    normalizeDateKey(record.dueDate) < normalizeDateKey(new Date()),
  createdAt: toIsoString(record.createdAt),
  updatedAt: toIsoString(record.updatedAt),
});

export const listPunchItems = async (
  actor: AuthenticatedActor,
  query: Record<string, unknown>,
) => {
  const { page, limit, offset } = parsePagination(query);
  if (actor.role === "client") {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "Punch items are restricted to SitePulse staff roles.",
    );
  }

  const readableIds = await listReadableProjectIds(actor);
  const requestedIds = parseIdList(query);
  const projectId =
    typeof query.projectId === "string" && query.projectId ? query.projectId : null;

  if (projectId) {
    await assertCanReadPunchItems(actor, projectId);
  }

  const scopeWhere =
    readableIds == null
      ? undefined
      : readableIds.length > 0
        ? inArray(punchItems.projectId, readableIds)
        : eq(punchItems.projectId, "__no_access__");

  const requestedWhere =
    requestedIds == null
      ? undefined
      : requestedIds.length > 0
        ? inArray(punchItems.id, requestedIds)
        : eq(punchItems.id, "__no_access__");

  const whereFilters = [scopeWhere, requestedWhere, projectId ? eq(punchItems.projectId, projectId) : undefined].filter(Boolean);
  const where = whereFilters.length ? and(...whereFilters) : undefined;

  const [rows, total] = await Promise.all([
    db
      .select({
        id: punchItems.id,
        projectId: punchItems.projectId,
        projectCode: projects.code,
        projectName: projects.name,
        phaseId: punchItems.phaseId,
        phaseName: projectPhases.name,
        title: punchItems.title,
        description: punchItems.description,
        severity: punchItems.severity,
        location: punchItems.location,
        assigneeId: punchItems.assigneeId,
        assigneeName: user.name,
        assigneeRole: user.role,
        dueDate: punchItems.dueDate,
        status: punchItems.status,
        createdBy: punchItems.createdBy,
        createdAt: punchItems.createdAt,
        updatedAt: punchItems.updatedAt,
      })
      .from(punchItems)
      .innerJoin(projects, eq(punchItems.projectId, projects.id))
      .leftJoin(projectPhases, eq(punchItems.phaseId, projectPhases.id))
      .leftJoin(user, eq(punchItems.assigneeId, user.id))
      .where(where)
      .orderBy(asc(punchItems.dueDate), desc(punchItems.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(punchItems)
      .where(where)
      .then((records) => records[0]?.total ?? 0),
  ]);

  return {
    data: rows.map((record) => serializePunchItem(record as Parameters<typeof serializePunchItem>[0])),
    page,
    limit,
    total,
  };
};

export const getPunchItem = async (actor: AuthenticatedActor, id: string) => {
  const record = await db
    .select({
      id: punchItems.id,
      projectId: punchItems.projectId,
      projectCode: projects.code,
      projectName: projects.name,
      phaseId: punchItems.phaseId,
      phaseName: projectPhases.name,
      title: punchItems.title,
      description: punchItems.description,
      severity: punchItems.severity,
      location: punchItems.location,
      assigneeId: punchItems.assigneeId,
      assigneeName: user.name,
      assigneeRole: user.role,
      dueDate: punchItems.dueDate,
      status: punchItems.status,
      createdBy: punchItems.createdBy,
      createdAt: punchItems.createdAt,
      updatedAt: punchItems.updatedAt,
    })
    .from(punchItems)
    .innerJoin(projects, eq(punchItems.projectId, projects.id))
    .leftJoin(projectPhases, eq(punchItems.phaseId, projectPhases.id))
    .leftJoin(user, eq(punchItems.assigneeId, user.id))
    .where(eq(punchItems.id, id))
    .limit(1)
    .then((rows) => rows[0]);

  const item = assertRecord(
    record as Parameters<typeof serializePunchItem>[0] | undefined,
    "Punch item not found.",
  );
  await assertCanReadPunchItems(actor, item.projectId);
  return serializePunchItem(item);
};

export const createPunchItem = async (
  actor: AuthenticatedActor,
  payload: Record<string, unknown>,
) => {
  try {
    const values = punchItemPayload(payload);

    if (values.status !== "open") {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "New punch items must start in open status.",
      );
    }

    await assertCanWritePunchItems(actor, values.projectId);
    await assertReferencedEntities(values);

    const id = crypto.randomUUID();
    await db.insert(punchItems).values({
      id,
      ...values,
      status: "open",
      createdBy: actor.id,
    });

    await createProjectEvent({
      actor,
      projectId: values.projectId,
      entityType: "punch_item",
      entityId: id,
      eventType: "punch_item_created",
      summary: `Punch item created: ${values.title}.`,
    });

    return getPunchItem(actor, id);
  } catch (error) {
    throw asAppError(error);
  }
};

export const updatePunchItem = async (
  actor: AuthenticatedActor,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const existing = await db
      .select({
        id: punchItems.id,
        projectId: punchItems.projectId,
        status: punchItems.status,
      })
      .from(punchItems)
      .where(eq(punchItems.id, id))
      .limit(1)
      .then((rows) => rows[0]);

    const current = assertRecord(existing, "Punch item not found.");
    await assertCanWritePunchItems(actor, current.projectId);

    const values = punchItemPayload(payload);

    if (values.projectId !== current.projectId) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "projectId cannot be changed for an existing punch item.",
      );
    }

    if (values.status !== current.status) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Use the transition workflow to change punch item status.",
      );
    }

    await assertReferencedEntities(values);

    await db
      .update(punchItems)
      .set({
        phaseId: values.phaseId,
        title: values.title,
        description: values.description,
        severity: values.severity,
        location: values.location,
        assigneeId: values.assigneeId,
        dueDate: values.dueDate,
      })
      .where(eq(punchItems.id, id));

    return getPunchItem(actor, id);
  } catch (error) {
    throw asAppError(error);
  }
};

export const transitionPunchItem = async (
  actor: AuthenticatedActor,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const requestedStatus = assertEnumValue(
      payload.status,
      PUNCH_ITEM_STATUSES,
      "status",
    );
    const existing = await db
      .select({
        id: punchItems.id,
        projectId: punchItems.projectId,
        title: punchItems.title,
        status: punchItems.status,
      })
      .from(punchItems)
      .where(eq(punchItems.id, id))
      .limit(1)
      .then((rows) => rows[0]);

    const current = assertRecord(existing, "Punch item not found.");
    await assertCanWritePunchItems(actor, current.projectId);

    try {
      assertPunchItemTransition(current.status as PunchItemStatus, requestedStatus);
    } catch {
      throw new AppError(
        400,
        "INVALID_STATUS_TRANSITION",
        `Punch item cannot move from ${current.status} to ${requestedStatus}.`,
      );
    }

    await db
      .update(punchItems)
      .set({
        status: requestedStatus,
      })
      .where(eq(punchItems.id, id));

    await createProjectEvent({
      actor,
      projectId: current.projectId,
      entityType: "punch_item",
      entityId: current.id,
      eventType: "punch_item_status_changed",
      summary: `Punch item moved to ${requestedStatus.replaceAll("_", " ")}: ${current.title}.`,
    });

    return getPunchItem(actor, id);
  } catch (error) {
    throw asAppError(error);
  }
};
