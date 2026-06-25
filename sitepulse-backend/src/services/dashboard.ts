import { and, count, desc, eq, inArray, lt, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { db } from "../db/index.js";
import {
  changeOrders,
  const result = {
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

  try {
    dashboardCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value: result });
  } catch (e) {
    // noop - caching failure shouldn't break the endpoint
  }

  return result;
};
  const punchScope = scopeCondition(readableProjectIds, punchItems.projectId);
  const changeOrderScope = scopeCondition(readableProjectIds, changeOrders.projectId);
  const dailyLogScope = scopeCondition(readableProjectIds, dailyLogs.projectId);
  const eventScope = scopeCondition(readableProjectIds, projectEvents.projectId);
  const phaseScope = scopeCondition(readableProjectIds, projectPhases.projectId);
  const assignmentScope = scopeCondition(readableProjectIds, crewAssignments.projectId);

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
    db
      .select({ total: count() })
      .from(projects)
      .where(projectScope)
      .then((rows) => rows[0]?.total ?? 0),
    db
      .select({ total: count() })
      .from(projects)
      .where(and(projectScope, eq(projects.status, "active")))
      .then((rows) => rows[0]?.total ?? 0),
    db
      .select({ total: count() })
      .from(projects)
      .where(and(projectScope, eq(projects.status, "at_risk")))
      .then((rows) => rows[0]?.total ?? 0),
    db
      .select({ total: count() })
      .from(punchItems)
      .where(
        and(
          punchScope,
          inArray(punchItems.status, ["open", "in_progress", "ready_for_review"]),
        ),
      )
      .then((rows) => rows[0]?.total ?? 0),
    db
      .select({ total: count() })
      .from(punchItems)
      .where(
        and(
          punchScope,
          inArray(punchItems.status, ["open", "in_progress", "ready_for_review"]),
          lt(punchItems.dueDate, new Date()),
        ),
      )
      .then((rows) => rows[0]?.total ?? 0),
    db
      .select({ total: count() })
      .from(dailyLogs)
      .where(and(dailyLogScope, eq(dailyLogs.status, "submitted")))
      .then((rows) => rows[0]?.total ?? 0),
    db
      .select({ total: count() })
      .from(dailyLogs)
      .where(and(dailyLogScope, eq(dailyLogs.status, "draft")))
      .then((rows) => rows[0]?.total ?? 0),
    db
      .select({ total: count() })
      .from(changeOrders)
      .where(and(changeOrderScope, eq(changeOrders.status, "submitted")))
      .then((rows) => rows[0]?.total ?? 0),
    db
      .select({ total: count() })
      .from(changeOrders)
      .where(and(changeOrderScope, eq(changeOrders.status, "approved")))
      .then((rows) => rows[0]?.total ?? 0),
    db
      .select({ total: count() })
      .from(projectPhases)
      .where(phaseScope)
      .then((rows) => rows[0]?.total ?? 0),
    db
      .select({ total: count() })
      .from(crewAssignments)
      .where(assignmentScope)
      .then((rows) => rows[0]?.total ?? 0),
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
        and(
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
              inArray(punchItems.status, ["open", "in_progress", "ready_for_review"]),
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

  const alerts =
    actor.role === "admin"
      ? [
          atRiskProjects > 0
            ? `${atRiskProjects} visible project${atRiskProjects === 1 ? "" : "s"} need recovery attention.`
            : "No visible projects are flagged at risk right now.",
          projectRows.filter((project) => !project.projectManagerName).length > 0
            ? `${projectRows.filter((project) => !project.projectManagerName).length} recent project${projectRows.filter((project) => !project.projectManagerName).length === 1 ? "" : "s"} still need a manager assigned.`
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

// Note: stored at the end of the function, but we cannot reference result after return.
};
