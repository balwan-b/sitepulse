import { z } from "zod";

export const projectStatuses = [
  "planning",
  "active",
  "at_risk",
  "on_hold",
  "completed",
] as const;

export const phaseStatuses = [
  "not_started",
  "active",
  "blocked",
  "completed",
] as const;

export const assignmentRoles = [
  "project_manager",
  "site_supervisor",
  "client",
] as const;

export const dailyLogStatuses = [
  "draft",
  "submitted",
  "locked",
] as const;

export const punchItemStatuses = [
  "open",
  "in_progress",
  "ready_for_review",
  "closed",
] as const;

export const changeOrderStatuses = [
  "draft",
  "submitted",
  "approved",
  "rejected",
] as const;

export const punchItemSeverities = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const projectSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  clientName: z.string(),
  location: z.string(),
  contractValue: z.number(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  status: z.enum(projectStatuses),
  projectManagerId: z.string().nullable(),
  projectManagerName: z.string().nullable().optional(),
  projectManagerEmail: z.string().nullable().optional(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const projectPhaseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectCode: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  name: z.string(),
  sequence: z.number(),
  status: z.enum(phaseStatuses),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const crewAssignmentSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectCode: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  phaseId: z.string().nullable(),
  phaseName: z.string().nullable().optional(),
  userId: z.string(),
  userName: z.string().nullable().optional(),
  userEmail: z.string().nullable().optional(),
  userRole: z.string().nullable().optional(),
  assignedRole: z.enum(assignmentRoles),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const dailyLogSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectCode: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  phaseId: z.string().nullable(),
  phaseName: z.string().nullable().optional(),
  supervisorId: z.string(),
  supervisorName: z.string().nullable().optional(),
  logDate: z.string(),
  workforceCount: z.number().optional(),
  weather: z.string().optional(),
  completedWork: z.string().optional(),
  blockers: z.string().nullable().optional(),
  safetyNotes: z.string().nullable().optional(),
  status: z.enum(dailyLogStatuses),
  submittedAt: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const punchItemSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectCode: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  phaseId: z.string().nullable(),
  phaseName: z.string().nullable().optional(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(punchItemSeverities),
  location: z.string(),
  assigneeId: z.string().nullable(),
  assigneeName: z.string().nullable().optional(),
  assigneeRole: z.string().nullable().optional(),
  dueDate: z.string(),
  status: z.enum(punchItemStatuses),
  createdBy: z.string(),
  createdByName: z.string().nullable().optional(),
  isOverdue: z.boolean(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const changeOrderSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectCode: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  phaseId: z.string().nullable(),
  phaseName: z.string().nullable().optional(),
  title: z.string(),
  description: z.string(),
  reason: z.string().nullable(),
  requestedAmount: z.number(),
  requestedDays: z.number(),
  approvedAmount: z.number().nullable(),
  approvedDays: z.number().nullable(),
  status: z.enum(changeOrderStatuses),
  createdBy: z.string().nullable(),
  createdByName: z.string().nullable().optional(),
  submittedBy: z.string().nullable(),
  submittedByName: z.string().nullable().optional(),
  reviewedBy: z.string().nullable(),
  reviewedByName: z.string().nullable().optional(),
  submittedAt: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  reviewNotes: z.string().nullable(),
  canReview: z.boolean().optional(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const siteUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
  image: z.string().nullable().optional(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const projectTimelineEventSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectCode: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  entityType: z.string(),
  entityId: z.string(),
  eventType: z.string(),
  summary: z.string(),
  createdBy: z.string().nullable(),
  createdByName: z.string().nullable().optional(),
  createdAt: z.string().nullable(),
});

export const dashboardSchema = z.object({
  role: z.string(),
  generatedAt: z.string(),
  stats: z.object({
    totalVisibleProjects: z.number(),
    activeProjects: z.number(),
    atRiskProjects: z.number(),
    openPunchItems: z.number(),
    overduePunchItems: z.number(),
    submittedDailyLogs: z.number(),
    draftDailyLogs: z.number(),
    pendingChangeOrders: z.number(),
    approvedChangeOrders: z.number(),
    totalPhases: z.number(),
    totalAssignments: z.number(),
  }),
  alerts: z.array(z.string()),
  spotlightProjects: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      clientName: z.string(),
      location: z.string(),
      status: z.enum(projectStatuses),
      projectManagerName: z.string().nullable().optional(),
      openPunchItems: z.number(),
      submittedChangeOrders: z.number(),
      approvedChangeOrders: z.number(),
      phaseCount: z.number(),
    }),
  ),
  recentEvents: z.array(projectTimelineEventSchema),
});

export type ProjectRecord = z.infer<typeof projectSchema>;
export type ProjectPhaseRecord = z.infer<typeof projectPhaseSchema>;
export type CrewAssignmentRecord = z.infer<typeof crewAssignmentSchema>;
export type DailyLogRecord = z.infer<typeof dailyLogSchema>;
export type PunchItemRecord = z.infer<typeof punchItemSchema>;
export type ChangeOrderRecord = z.infer<typeof changeOrderSchema>;
export type SiteUserRecord = z.infer<typeof siteUserSchema>;
export type ProjectTimelineEventRecord = z.infer<typeof projectTimelineEventSchema>;
export type DashboardRecord = z.infer<typeof dashboardSchema>;
