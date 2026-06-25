import { and, count, desc, eq, inArray, lt, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  changeOrders,
  crewAssignments,
  dailyLogs,
  projectEvents,
  projectPhases,
  projects,
  punchItems,
  user,
} from "../db/schema/index.js";
import type { AuthenticatedActor } from "../lib/authorization.js";
import { listReadableProjectIds } from "./project-scope.js";
import { toIsoString } from "./shared.js";

const CLIENT_VISIBLE_EVENT_TYPES = [
  "project_created",
  "project_status_changed",
  "phase_status_changed",
  "daily_log_submitted",
  "punch_item_status_changed",
  "change_order_approved",
  "change_order_rejected",
] as const;

const ACTIVE_PUNCH_STATUSES = ["open", "in_progress", "ready_for_review"] as const;
const OPEN_CHANGE_ORDER_STATUSES = ["submitted"] as const;
const APPROVED_CHANGE_ORDER_STATUSES = ["approved"] as const;
const DRAFT_DAILY_LOG_STATUSES = ["draft"] as const;
const SUBMITTED_DAILY_LOG_STATUSES = ["submitted"] as const;

const countRows = async (builder: () => any, where?: any) => {
  let query = builder();

  if (where) {
    query = query.where(where);
  }

  const rows = await query;
  return rows[0]?.total ?? 0;
};

const combineWhere = (...conditions: Array<any>) => {
  const filters = conditions.filter(Boolean);
  if (filters.length === 0) {
    return undefined;
  }

  return and(...filters);
};

export const getDashboardSnapshot = async (actor: AuthenticatedActor) => {
  const readableProjectIds = await listReadableProjectIds(actor);
  const projectScope = readableProjectIds
    ? readableProjectIds.length > 0
      ? inArray(projects.id, readableProjectIds)
      : eq(projects.id, "__no_access__")
    : undefined;
  const punchScope = readableProjectIds
    ? readableProjectIds.length > 0
      ? inArray(punchItems.projectId, readableProjectIds)
      : eq(punchItems.projectId, "__no_access__")
    : undefined;
  const changeOrderScope = readableProjectIds
    ? readableProjectIds.length > 0
      ? inArray(changeOrders.projectId, readableProjectIds)
      : eq(changeOrders.projectId, "__no_access__")
    : undefined;
  const dailyLogScope = readableProjectIds
    ? readableProjectIds.length > 0
      ? inArray(dailyLogs.projectId, readableProjectIds)
      : eq(dailyLogs.projectId, "__no_access__")
    : undefined;
  const eventScope = readableProjectIds
    ? readableProjectIds.length > 0
      ? inArray(projectEvents.projectId, readableProjectIds)
      : eq(projectEvents.projectId, "__no_access__")
    : undefined;
  const phaseScope = readableProjectIds
    ? readableProjectIds.length > 0
      ? inArray(projectPhases.projectId, readableProjectIds)
      : eq(projectPhases.projectId, "__no_access__")
    : undefined;
  const assignmentScope = readableProjectIds
    ? readableProjectIds.length > 0
      ? inArray(crewAssignments.projectId, readableProjectIds)
      : eq(crewAssignments.projectId, "__no_access__")
    : undefined;

  const [
    totalVisibleProjects,
    activeProjects,
    atRiskProjects,
    openPunchItems,
    overduePunchItems,
    submittedDailyLogs,
    draftDailyLogs,
    pendingChangeOrders,
    approvedChangeOrders,
    totalPhases,
    totalAssignments,
    projectRows,
    recentEventRows,
  ] = await Promise.all([
    countRows(
      () => db.select({ total: count() }).from(projects),
      projectScope,
    ),
    countRows(
      () => db.select({ total: count() }).from(projects),
      combineWhere(projectScope, eq(projects.status, "active")),
    ),
    countRows(
      () => db.select({ total: count() }).from(projects),
      combineWhere(projectScope, eq(projects.status, "at_risk")),
    ),
    countRows(
      () => db.select({ total: count() }).from(punchItems),
      combineWhere(punchScope, inArray(punchItems.status, ACTIVE_PUNCH_STATUSES)),
    ),
    countRows(
      () => db.select({ total: count() }).from(punchItems),
      combineWhere(
        punchScope,
        inArray(punchItems.status, ACTIVE_PUNCH_STATUSES),
        lt(punchItems.dueDate, new Date()),
      ),
    ),
    countRows(
      () => db.select({ total: count() }).from(dailyLogs),
      combineWhere(dailyLogScope, inArray(dailyLogs.status, SUBMITTED_DAILY_LOG_STATUSES)),
    ),
    countRows(
      () => db.select({ total: count() }).from(dailyLogs),
      combineWhere(dailyLogScope, inArray(dailyLogs.status, DRAFT_DAILY_LOG_STATUSES)),
    ),
    countRows(
      () => db.select({ total: count() }).from(changeOrders),
      combineWhere(changeOrderScope, inArray(changeOrders.status, OPEN_CHANGE_ORDER_STATUSES)),
    ),
    countRows(
      () => db.select({ total: count() }).from(changeOrders),
      combineWhere(
        changeOrderScope,
        inArray(changeOrders.status, APPROVED_CHANGE_ORDER_STATUSES),
      ),
    ),
    countRows(
      () => db.select({ total: count() }).from(projectPhases),
      phaseScope,
    ),
    countRows(
      () => db.select({ total: count() }).from(crewAssignments),
      assignmentScope,
    ),
    db
      .select({
        id: projects.id,
        code: projects.code,
        name: projects.name,
        clientName: projects.clientName,
        location: projects.location,
        status: projects.status,
        projectManagerName: user.name,
      })
      .from(projects)
      .leftJoin(user, eq(projects.projectManagerId, user.id))
      .where(projectScope)
      .orderBy(desc(projects.updatedAt))
      .limit(4),
    db
      .select({
        id: projectEvents.id,
        projectId: projectEvents.projectId,
        projectCode: projects.code,
        projectName: projects.name,
        entityType: projectEvents.entityType,
        entityId: projectEvents.entityId,
        eventType: projectEvents.eventType,
        summary: projectEvents.summary,
        createdAt: projectEvents.createdAt,
        createdBy: projectEvents.createdBy,
        createdByName: user.name,
      })
      .from(projectEvents)
      .innerJoin(projects, eq(projectEvents.projectId, projects.id))
      .leftJoin(user, eq(projectEvents.createdBy, user.id))
      .where(
        combineWhere(
          eventScope,
          actor.role === "client"
            ? inArray(projectEvents.eventType, [...CLIENT_VISIBLE_EVENT_TYPES])
            : undefined,
        ),
      )
      .orderBy(desc(projectEvents.createdAt))
      .limit(8),
  ]);

  const projectIds = projectRows.map((project) => project.id);

  const [punchCounts, changeOrderCounts, phaseCounts] = await Promise.all([
    projectIds.length
      ? db
          .select({
            projectId: punchItems.projectId,
            total: count(),
          })
          .from(punchItems)
          .where(
            and(
              inArray(punchItems.projectId, projectIds),
              inArray(punchItems.status, ACTIVE_PUNCH_STATUSES),
            ),
          )
          .groupBy(punchItems.projectId)
      : Promise.resolve([]),
    projectIds.length
      ? db
          .select({
            projectId: changeOrders.projectId,
            submitted: sql<number>`sum(case when ${changeOrders.status} = 'submitted' then 1 else 0 end)`,
            approved: sql<number>`sum(case when ${changeOrders.status} = 'approved' then 1 else 0 end)`,
          })
          .from(changeOrders)
          .where(inArray(changeOrders.projectId, projectIds))
          .groupBy(changeOrders.projectId)
      : Promise.resolve([]),
    projectIds.length
      ? db
          .select({
            projectId: projectPhases.projectId,
            total: count(),
          })
          .from(projectPhases)
          .where(inArray(projectPhases.projectId, projectIds))
          .groupBy(projectPhases.projectId)
      : Promise.resolve([]),
  ]);

  const punchCountMap = new Map(punchCounts.map((row) => [row.projectId, row.total]));
  const changeOrderCountMap = new Map(
    changeOrderCounts.map((row) => [
      row.projectId,
      {
        submitted: Number(row.submitted ?? 0),
        approved: Number(row.approved ?? 0),
      },
    ]),
  );
  const phaseCountMap = new Map(phaseCounts.map((row) => [row.projectId, row.total]));

  const managerlessProjects = projectRows.filter((project) => !project.projectManagerName).length;

  const alerts =
    actor.role === "admin"
      ? [
          atRiskProjects > 0
            ? `${atRiskProjects} visible project${atRiskProjects === 1 ? "" : "s"} need recovery attention.`
            : "No visible projects are flagged at risk right now.",
          managerlessProjects > 0
            ? `${managerlessProjects} recent project${managerlessProjects === 1 ? "" : "s"} still need a manager assigned.`
            : "Recent projects all have manager ownership assigned.",
        ]
      : actor.role === "project_manager"
        ? [
            pendingChangeOrders > 0
              ? `${pendingChangeOrders} change order${pendingChangeOrders === 1 ? "" : "s"} are waiting on review decisions.`
              : "No submitted change orders are waiting in your queue.",
            overduePunchItems > 0
              ? `${overduePunchItems} open punch item${overduePunchItems === 1 ? "" : "s"} are overdue.`
              : "No visible punch items are overdue right now.",
          ]
        : actor.role === "site_supervisor"
          ? [
              draftDailyLogs > 0
                ? `${draftDailyLogs} draft daily log${draftDailyLogs === 1 ? "" : "s"} still need submission.`
                : "No visible daily log drafts are waiting right now.",
              openPunchItems > 0
                ? `${openPunchItems} punch item${openPunchItems === 1 ? "" : "s"} remain open in your field scope.`
                : "No visible punch items are open right now.",
            ]
          : [
              approvedChangeOrders > 0
                ? `${approvedChangeOrders} approved change order${approvedChangeOrders === 1 ? "" : "s"} are visible in your client portal.`
                : "No approved change orders are visible in your portal yet.",
              activeProjects > 0
                ? `${activeProjects} project${activeProjects === 1 ? "" : "s"} are currently active in your visible scope.`
                : "No visible projects are actively progressing right now.",
            ];

  return {
    role: actor.role,
    generatedAt: new Date().toISOString(),
    stats: {
      totalVisibleProjects,
      activeProjects,
      atRiskProjects,
      openPunchItems,
      overduePunchItems,
      submittedDailyLogs,
      draftDailyLogs,
      pendingChangeOrders,
      approvedChangeOrders,
      totalPhases,
      totalAssignments,
    },
    alerts,
    spotlightProjects: projectRows.map((project) => ({
      ...project,
      openPunchItems: punchCountMap.get(project.id) ?? 0,
      submittedChangeOrders: changeOrderCountMap.get(project.id)?.submitted ?? 0,
      approvedChangeOrders: changeOrderCountMap.get(project.id)?.approved ?? 0,
      phaseCount: phaseCountMap.get(project.id) ?? 0,
    })),
    recentEvents: recentEventRows.map((event) => ({
      id: event.id,
      projectId: event.projectId,
      projectCode: event.projectCode,
      projectName: event.projectName,
      entityType: event.entityType,
      entityId: event.entityId,
      eventType: event.eventType,
      summary: event.summary,
      createdAt: toIsoString(event.createdAt),
      createdBy: actor.role === "client" ? null : event.createdBy,
      createdByName: actor.role === "client" ? null : (event.createdByName ?? null),
    })),
  };
};
