import crypto from "node:crypto";

import { and, count, desc, eq, inArray } from "drizzle-orm";

import { db } from "../db/index.js";
import { projectEvents, projects, user } from "../db/schema/index.js";
import type { AuthenticatedActor } from "../lib/authorization.js";
import type { ProjectEventType } from "../lib/status-rules.js";
import { assertProjectReadable } from "./project-scope.js";
import { parsePagination, toIsoString } from "./shared.js";

const CLIENT_VISIBLE_EVENT_TYPES = [
  "project_status_changed",
  "phase_status_changed",
  "change_order_approved",
] as const;

export const createProjectEvent = async ({
  actor,
  projectId,
  entityType,
  entityId,
  eventType,
  summary,
}: {
  actor: AuthenticatedActor;
  projectId: string;
  entityType: string;
  entityId: string;
  eventType: ProjectEventType;
  summary: string;
}) => {
  await db.insert(projectEvents).values({
    id: crypto.randomUUID(),
    projectId,
    entityType,
    entityId,
    eventType,
    summary,
    createdBy: actor.id,
  });
};

export const listProjectTimeline = async (
  actor: AuthenticatedActor,
  projectId: string,
  query: Record<string, unknown>,
) => {
  await assertProjectReadable(actor, projectId);
  const { page, limit, offset } = parsePagination(query);

  const where = and(
    eq(projectEvents.projectId, projectId),
    actor.role === "client"
      ? inArray(projectEvents.eventType, [...CLIENT_VISIBLE_EVENT_TYPES])
      : undefined,
  );

  const rows = await db
    .select({
      id: projectEvents.id,
      projectId: projectEvents.projectId,
      projectCode: projects.code,
      projectName: projects.name,
      entityType: projectEvents.entityType,
      entityId: projectEvents.entityId,
      eventType: projectEvents.eventType,
      summary: projectEvents.summary,
      createdBy: projectEvents.createdBy,
      createdByName: user.name,
      createdAt: projectEvents.createdAt,
    })
    .from(projectEvents)
    .innerJoin(projects, eq(projectEvents.projectId, projects.id))
    .leftJoin(user, eq(projectEvents.createdBy, user.id))
    .where(where)
    .orderBy(desc(projectEvents.createdAt))
    .limit(limit)
    .offset(offset);

  const total = await db
    .select({ total: count() })
    .from(projectEvents)
    .where(where)
    .then((rows) => rows[0]?.total ?? 0);

  return {
    data: rows.map((row) => ({
      ...row,
      createdAt: toIsoString(row.createdAt),
      createdBy: actor.role === "client" ? null : row.createdBy,
      createdByName: actor.role === "client" ? null : (row.createdByName ?? null),
    })),
    page,
    limit,
    total,
  };
};
