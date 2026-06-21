import { and, eq, inArray, or } from "drizzle-orm";

import { db } from "../db/index.js";
import { crewAssignments, projects } from "../db/schema/index.js";
import type { AuthenticatedActor } from "../lib/authorization.js";
import { AppError } from "../lib/http.js";

const dedupe = (values: string[]) => [...new Set(values)];

export const listReadableProjectIds = async (actor: AuthenticatedActor) => {
  if (actor.role === "admin") {
    return null;
  }

  if (actor.role === "project_manager") {
    const [managedProjects, assignedProjects] = await Promise.all([
      db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.projectManagerId, actor.id)),
      db
        .select({ id: crewAssignments.projectId })
        .from(crewAssignments)
        .where(
          and(
            eq(crewAssignments.userId, actor.id),
            eq(crewAssignments.assignedRole, "project_manager"),
          ),
        ),
    ]);

    return dedupe([
      ...managedProjects.map((record) => record.id),
      ...assignedProjects.map((record) => record.id),
    ]);
  }

  const assignments = await db
    .select({ id: crewAssignments.projectId })
    .from(crewAssignments)
    .where(eq(crewAssignments.userId, actor.id));

  return dedupe(assignments.map((record) => record.id));
};

export const listManagedProjectIds = async (actor: AuthenticatedActor) => {
  if (actor.role === "admin") {
    return null;
  }

  if (actor.role !== "project_manager") {
    return [];
  }

  const [managedProjects, assignmentProjects] = await Promise.all([
    db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.projectManagerId, actor.id)),
    db
      .select({ id: crewAssignments.projectId })
      .from(crewAssignments)
      .where(
        and(
          eq(crewAssignments.userId, actor.id),
          eq(crewAssignments.assignedRole, "project_manager"),
        ),
      ),
  ]);

  return dedupe([
    ...managedProjects.map((record) => record.id),
    ...assignmentProjects.map((record) => record.id),
  ]);
};

export const buildProjectScopeWhere = async (
  actor: AuthenticatedActor,
  column: typeof projects.id | typeof crewAssignments.projectId,
  mode: "read" | "manage" = "read",
) => {
  const ids =
    mode === "manage"
      ? await listManagedProjectIds(actor)
      : await listReadableProjectIds(actor);

  if (ids == null) {
    return undefined;
  }

  if (ids.length === 0) {
    return eq(column, "__no_access__");
  }

  return inArray(column, ids);
};

export const assertProjectReadable = async (
  actor: AuthenticatedActor,
  projectId: string,
) => {
  const readableIds = await listReadableProjectIds(actor);

  if (readableIds != null && !readableIds.includes(projectId)) {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "You are not allowed to access this SitePulse project.",
    );
  }
};

export const assertProjectManageable = async (
  actor: AuthenticatedActor,
  projectId: string,
) => {
  const managedIds = await listManagedProjectIds(actor);

  if (managedIds != null && !managedIds.includes(projectId)) {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "You are not allowed to manage this SitePulse project.",
    );
  }
};

export const buildProjectMembershipWhere = (
  userId: string,
  projectIds: string[],
) =>
  or(
    eq(projects.projectManagerId, userId),
    and(
      eq(crewAssignments.userId, userId),
      inArray(crewAssignments.projectId, projectIds),
    ),
  );
