import crypto from "node:crypto";
import { and, count, desc, eq, inArray, ne } from "drizzle-orm";

import { db } from "../db/index.js";
import { crewAssignments, projectPhases, projects, user } from "../db/schema/index.js";
import type { AuthenticatedActor } from "../lib/authorization.js";
import { AppError, asAppError } from "../lib/http.js";
import { CREW_ASSIGNMENT_ROLES } from "../lib/status-rules.js";
import {
  assertEnumValue,
  parseIsoDate,
  sanitizeText,
} from "../lib/validation.js";
import { assertProjectManageable, assertProjectReadable, listReadableProjectIds } from "./project-scope.js";
import { assertRecord, parsePagination, toIsoString } from "./shared.js";

const assignmentPayload = (payload: Record<string, unknown>) => {
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
    projectId: sanitizeText(payload.projectId, {
      field: "projectId",
      min: 3,
      max: 128,
    }),
    phaseId:
      typeof payload.phaseId === "string" && payload.phaseId ? payload.phaseId : null,
    userId: sanitizeText(payload.userId, {
      field: "userId",
      min: 3,
      max: 128,
    }),
    assignedRole: assertEnumValue(
      payload.assignedRole,
      CREW_ASSIGNMENT_ROLES,
      "assignedRole",
    ),
    startDate,
    endDate,
  };
};

const serializeAssignment = (
  record: typeof crewAssignments.$inferSelect & {
    projectCode?: string;
    projectName?: string;
    phaseName?: string | null;
    userName?: string;
    userEmail?: string;
    userRole?: string;
  },
) => ({
  id: record.id,
  projectId: record.projectId,
  projectCode: record.projectCode ?? null,
  projectName: record.projectName ?? null,
  phaseId: record.phaseId,
  phaseName: record.phaseName ?? null,
  userId: record.userId,
  userName: record.userName ?? null,
  userEmail: record.userEmail ?? null,
  userRole: record.userRole ?? null,
  assignedRole: record.assignedRole,
  startDate: toIsoString(record.startDate),
  endDate: toIsoString(record.endDate),
  createdAt: toIsoString(record.createdAt),
  updatedAt: toIsoString(record.updatedAt),
});

const assertReferencedEntities = async (
  values: ReturnType<typeof assignmentPayload>,
) => {
  const [projectRecord, userRecord, phaseRecord] = await Promise.all([
    db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, values.projectId))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({
        id: user.id,
        role: user.role,
      })
      .from(user)
      .where(eq(user.id, values.userId))
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
  ]);

  assertRecord(projectRecord, "Project not found.");
  const assignee = assertRecord(userRecord, "Assigned user not found.");

  if (assignee.role !== values.assignedRole) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "assignedRole must match the selected user's role.",
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

const rangesOverlap = (
  aStart: Date,
  aEnd: Date | null,
  bStart: Date,
  bEnd: Date | null,
) => {
  const normalizedAEnd = aEnd ?? new Date("9999-12-31T00:00:00.000Z");
  const normalizedBEnd = bEnd ?? new Date("9999-12-31T00:00:00.000Z");

  return aStart <= normalizedBEnd && bStart <= normalizedAEnd;
};

const assertNoOverlappingAssignments = async (
  values: ReturnType<typeof assignmentPayload>,
  currentId?: string,
) => {
  const existing = await db
    .select({
      id: crewAssignments.id,
      startDate: crewAssignments.startDate,
      endDate: crewAssignments.endDate,
    })
    .from(crewAssignments)
    .where(
      and(
        eq(crewAssignments.projectId, values.projectId),
        eq(crewAssignments.userId, values.userId),
        eq(crewAssignments.assignedRole, values.assignedRole),
        currentId ? ne(crewAssignments.id, currentId) : undefined,
      ),
    );

  const hasConflict = existing.some((record) =>
    rangesOverlap(record.startDate, record.endDate, values.startDate, values.endDate),
  );

  if (hasConflict) {
    throw new AppError(
      409,
      "DUPLICATE_RECORD",
      "This assignment overlaps with an existing assignment for the same user and role.",
    );
  }
};

export const listCrewAssignments = async (
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
        ? inArray(crewAssignments.projectId, readableIds)
        : eq(crewAssignments.projectId, "__no_access__");

  const where =
    projectId && scopeWhere
      ? and(scopeWhere, eq(crewAssignments.projectId, projectId))
      : projectId
        ? eq(crewAssignments.projectId, projectId)
        : scopeWhere;

  const [rows, total] = await Promise.all([
    db
      .select({
        id: crewAssignments.id,
        projectId: crewAssignments.projectId,
        projectCode: projects.code,
        projectName: projects.name,
        phaseId: crewAssignments.phaseId,
        phaseName: projectPhases.name,
        userId: crewAssignments.userId,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        assignedRole: crewAssignments.assignedRole,
        startDate: crewAssignments.startDate,
        endDate: crewAssignments.endDate,
        createdAt: crewAssignments.createdAt,
        updatedAt: crewAssignments.updatedAt,
      })
      .from(crewAssignments)
      .innerJoin(projects, eq(crewAssignments.projectId, projects.id))
      .leftJoin(projectPhases, eq(crewAssignments.phaseId, projectPhases.id))
      .innerJoin(user, eq(crewAssignments.userId, user.id))
      .where(where)
      .orderBy(desc(crewAssignments.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(crewAssignments)
      .where(where)
      .then((rows) => rows[0]?.total ?? 0),
  ]);

  return {
    data: rows.map(serializeAssignment),
    page,
    limit,
    total,
  };
};

export const getCrewAssignment = async (
  actor: AuthenticatedActor,
  id: string,
) => {
  const record = await db
    .select({
      id: crewAssignments.id,
      projectId: crewAssignments.projectId,
      projectCode: projects.code,
      projectName: projects.name,
      phaseId: crewAssignments.phaseId,
      phaseName: projectPhases.name,
      userId: crewAssignments.userId,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      assignedRole: crewAssignments.assignedRole,
      startDate: crewAssignments.startDate,
      endDate: crewAssignments.endDate,
      createdAt: crewAssignments.createdAt,
      updatedAt: crewAssignments.updatedAt,
    })
    .from(crewAssignments)
    .innerJoin(projects, eq(crewAssignments.projectId, projects.id))
    .leftJoin(projectPhases, eq(crewAssignments.phaseId, projectPhases.id))
    .innerJoin(user, eq(crewAssignments.userId, user.id))
    .where(eq(crewAssignments.id, id))
    .limit(1)
    .then((rows) => rows[0]);

  const assignment = assertRecord(record, "Crew assignment not found.");
  await assertProjectReadable(actor, assignment.projectId);

  return serializeAssignment(assignment);
};

export const createCrewAssignment = async (
  actor: AuthenticatedActor,
  payload: Record<string, unknown>,
) => {
  try {
    const values = assignmentPayload(payload);
    await assertProjectManageable(actor, values.projectId);
    await assertReferencedEntities(values);
    await assertNoOverlappingAssignments(values);

    const id = crypto.randomUUID();
    await db.insert(crewAssignments).values({
      id,
      ...values,
    });

    return getCrewAssignment(actor, id);
  } catch (error) {
    throw asAppError(error);
  }
};

export const updateCrewAssignment = async (
  actor: AuthenticatedActor,
  id: string,
  payload: Record<string, unknown>,
) => {
  try {
    const existing = await db
      .select({
        id: crewAssignments.id,
        projectId: crewAssignments.projectId,
      })
      .from(crewAssignments)
      .where(eq(crewAssignments.id, id))
      .limit(1)
      .then((rows) => rows[0]);

    const current = assertRecord(existing, "Crew assignment not found.");
    await assertProjectManageable(actor, current.projectId);

    const values = assignmentPayload(payload);
    if (values.projectId !== current.projectId) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "projectId cannot be changed for an existing assignment.",
      );
    }

    await assertReferencedEntities(values);
    await assertNoOverlappingAssignments(values, id);

    await db.update(crewAssignments).set(values).where(eq(crewAssignments.id, id));

    return getCrewAssignment(actor, id);
  } catch (error) {
    throw asAppError(error);
  }
};
