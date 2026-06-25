import { and, count, desc, eq, inArray, ne } from "drizzle-orm";

import { db } from "../db/index.js";
import { crewAssignments, projects, user } from "../db/schema/index.js";
import type { AuthenticatedActor } from "../lib/authorization.js";
import { AppError } from "../lib/http.js";
import { assertRecord, parseIdList, parsePagination, toIsoString } from "./shared.js";

const serializeUser = (record: typeof user.$inferSelect) => ({
  id: record.id,
  name: record.name,
  email: record.email,
  role: record.role,
  image: record.image ?? null,
  createdAt: toIsoString(record.createdAt),
  updatedAt: toIsoString(record.updatedAt),
});

const assertUserDirectoryAccess = (actor: AuthenticatedActor) => {
  if (actor.role === "client") {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "You are not allowed to access the SitePulse staff directory.",
    );
  }
};

export const listUsers = async (
  actor: AuthenticatedActor,
  query: Record<string, unknown>,
) => {
  assertUserDirectoryAccess(actor);
  const { page, limit, offset } = parsePagination(query);
  const requestedIds = parseIdList(query);
  const role =
    typeof query.role === "string" && query.role.length > 0 ? query.role : null;

  if (actor.role === "admin") {
    const filters = [
      requestedIds == null
        ? undefined
        : requestedIds.length > 0
          ? inArray(user.id, requestedIds)
          : eq(user.id, "__no_access__"),
      role ? eq(user.role, role as typeof user.$inferSelect.role) : undefined,
    ].filter(Boolean);
    const where = filters.length ? and(...filters) : undefined;
    const [rows, total] = await Promise.all([
      db
        .select()
        .from(user)
        .where(where)
        .orderBy(desc(user.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(user)
        .where(where)
        .then((records) => records[0]?.total ?? 0),
    ]);

    return {
      data: rows.map(serializeUser),
      page,
      limit,
      total,
    };
  }

  const managedProjectIds = await Promise.all([
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
  ]).then(([owned, assigned]) =>
    [...new Set([...owned.map((record) => record.id), ...assigned.map((record) => record.id)])],
  );

  const collaboratorIds = managedProjectIds.length
    ? await db
        .select({ userId: crewAssignments.userId })
        .from(crewAssignments)
        .where(inArray(crewAssignments.projectId, managedProjectIds))
        .then((rows) => [...new Set(rows.map((row) => row.userId))])
    : [];

  const visibleIds = [...new Set([actor.id, ...collaboratorIds])];
  const filters = [
    inArray(user.id, visibleIds.length > 0 ? visibleIds : [actor.id]),
    ne(user.role, "admin"),
    requestedIds == null
      ? undefined
      : requestedIds.length > 0
        ? inArray(user.id, requestedIds)
        : eq(user.id, "__no_access__"),
    role ? eq(user.role, role as typeof user.$inferSelect.role) : undefined,
  ].filter(Boolean);
  const where = and(...filters);

  const [rows, total] = await Promise.all([
    db
      .select()
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(user)
      .where(where)
      .then((records) => records[0]?.total ?? 0),
  ]);

  return {
    data: rows.map(serializeUser),
    page,
    limit,
    total,
  };
};

export const getUser = async (actor: AuthenticatedActor, id: string) => {
  assertUserDirectoryAccess(actor);

  if (actor.role !== "admin") {
    const visibleUserIds = await listUsers(actor, { page: 1, limit: 200 });
    if (!visibleUserIds.data.some((record) => record.id === id)) {
      throw new AppError(
        403,
        "ACCESS_DENIED",
        "You are not allowed to access this SitePulse user.",
      );
    }
  }

  const record = await db
    .select()
    .from(user)
    .where(eq(user.id, id))
    .limit(1)
    .then((rows) => rows[0]);

  return serializeUser(assertRecord(record, "User not found."));
};
