import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import {
  CREW_ASSIGNMENT_ROLES,
  DAILY_LOG_STATUSES,
  PHASE_STATUSES,
  PUNCH_ITEM_SEVERITIES,
  PUNCH_ITEM_STATUSES,
  PROJECT_EVENT_TYPES,
  PROJECT_STATUSES,
} from "../../lib/status-rules.js";
import { user } from "./auth.js";

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const projectStatusEnum = pgEnum("project_status", PROJECT_STATUSES);
export const phaseStatusEnum = pgEnum("phase_status", PHASE_STATUSES);
export const crewAssignmentRoleEnum = pgEnum(
  "crew_assignment_role",
  CREW_ASSIGNMENT_ROLES,
);
export const dailyLogStatusEnum = pgEnum("daily_log_status", DAILY_LOG_STATUSES);
export const punchItemStatusEnum = pgEnum(
  "punch_item_status",
  PUNCH_ITEM_STATUSES,
);
export const punchItemSeverityEnum = pgEnum(
  "punch_item_severity",
  PUNCH_ITEM_SEVERITIES,
);
export const projectEventTypeEnum = pgEnum(
  "project_event_type",
  PROJECT_EVENT_TYPES,
);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    clientName: text("client_name").notNull(),
    location: text("location").notNull(),
    contractValue: integer("contract_value").notNull(),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date"),
    status: projectStatusEnum("status").default("planning").notNull(),
    projectManagerId: text("project_manager_id").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    index("projects_status_idx").on(table.status),
    index("projects_created_at_idx").on(table.createdAt),
    index("projects_project_manager_id_idx").on(table.projectManagerId),
  ],
);

export const projectPhases = pgTable(
  "project_phases",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sequence: integer("sequence").notNull(),
    status: phaseStatusEnum("status").default("not_started").notNull(),
    ...timestamps,
  },
  (table) => [
    unique("project_phases_project_sequence_unique").on(
      table.projectId,
      table.sequence,
    ),
    unique("project_phases_project_name_unique").on(table.projectId, table.name),
    index("project_phases_project_id_idx").on(table.projectId),
    index("project_phases_status_idx").on(table.status),
    index("project_phases_project_status_idx").on(table.projectId, table.status),
    index("project_phases_created_at_idx").on(table.createdAt),
  ],
);

export const crewAssignments = pgTable(
  "crew_assignments",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    phaseId: text("phase_id").references(() => projectPhases.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assignedRole: crewAssignmentRoleEnum("assigned_role").notNull(),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date"),
    ...timestamps,
  },
  (table) => [
    index("crew_assignments_project_id_idx").on(table.projectId),
    index("crew_assignments_phase_id_idx").on(table.phaseId),
    index("crew_assignments_user_id_idx").on(table.userId),
    index("crew_assignments_assigned_role_idx").on(table.assignedRole),
    index("crew_assignments_project_role_idx").on(table.projectId, table.assignedRole),
    index("crew_assignments_created_at_idx").on(table.createdAt),
  ],
);

export const dailyLogs = pgTable(
  "daily_logs",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    phaseId: text("phase_id").references(() => projectPhases.id, {
      onDelete: "cascade",
    }),
    supervisorId: text("supervisor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    logDate: timestamp("log_date").notNull(),
    workforceCount: integer("workforce_count").notNull(),
    weather: text("weather").notNull(),
    completedWork: text("completed_work").notNull(),
    blockers: text("blockers"),
    safetyNotes: text("safety_notes"),
    status: dailyLogStatusEnum("status").default("draft").notNull(),
    submittedAt: timestamp("submitted_at"),
    ...timestamps,
  },
  (table) => [
    index("daily_logs_project_id_idx").on(table.projectId),
    index("daily_logs_phase_id_idx").on(table.phaseId),
    index("daily_logs_supervisor_id_idx").on(table.supervisorId),
    index("daily_logs_status_idx").on(table.status),
    index("daily_logs_project_status_idx").on(table.projectId, table.status),
    index("daily_logs_project_supervisor_date_idx").on(
      table.projectId,
      table.supervisorId,
      table.logDate,
    ),
    index("daily_logs_created_at_idx").on(table.createdAt),
  ],
);

export const projectEvents = pgTable(
  "project_events",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    eventType: projectEventTypeEnum("event_type").notNull(),
    summary: text("summary").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    index("project_events_project_id_idx").on(table.projectId),
    index("project_events_entity_type_idx").on(table.entityType),
    index("project_events_entity_id_idx").on(table.entityId),
    index("project_events_event_type_idx").on(table.eventType),
    index("project_events_created_by_idx").on(table.createdBy),
    index("project_events_created_at_idx").on(table.createdAt),
  ],
);

export const punchItems = pgTable(
  "punch_items",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    phaseId: text("phase_id").references(() => projectPhases.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    severity: punchItemSeverityEnum("severity").default("medium").notNull(),
    location: text("location").notNull(),
    assigneeId: text("assignee_id").references(() => user.id, {
      onDelete: "set null",
    }),
    dueDate: timestamp("due_date").notNull(),
    status: punchItemStatusEnum("status").default("open").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    index("punch_items_project_id_idx").on(table.projectId),
    index("punch_items_phase_id_idx").on(table.phaseId),
    index("punch_items_assignee_id_idx").on(table.assigneeId),
    index("punch_items_status_idx").on(table.status),
    index("punch_items_severity_idx").on(table.severity),
    index("punch_items_due_date_idx").on(table.dueDate),
    index("punch_items_project_status_idx").on(table.projectId, table.status),
    index("punch_items_created_at_idx").on(table.createdAt),
  ],
);

export const projectRelations = relations(projects, ({ one, many }) => ({
  projectManager: one(user, {
    fields: [projects.projectManagerId],
    references: [user.id],
  }),
  phases: many(projectPhases),
  crewAssignments: many(crewAssignments),
  dailyLogs: many(dailyLogs),
  punchItems: many(punchItems),
}));

export const projectPhaseRelations = relations(projectPhases, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectPhases.projectId],
    references: [projects.id],
  }),
  crewAssignments: many(crewAssignments),
  dailyLogs: many(dailyLogs),
  punchItems: many(punchItems),
}));

export const crewAssignmentRelations = relations(crewAssignments, ({ one }) => ({
  project: one(projects, {
    fields: [crewAssignments.projectId],
    references: [projects.id],
  }),
  phase: one(projectPhases, {
    fields: [crewAssignments.phaseId],
    references: [projectPhases.id],
  }),
  user: one(user, {
    fields: [crewAssignments.userId],
    references: [user.id],
  }),
}));

export const dailyLogRelations = relations(dailyLogs, ({ one }) => ({
  project: one(projects, {
    fields: [dailyLogs.projectId],
    references: [projects.id],
  }),
  phase: one(projectPhases, {
    fields: [dailyLogs.phaseId],
    references: [projectPhases.id],
  }),
  supervisor: one(user, {
    fields: [dailyLogs.supervisorId],
    references: [user.id],
  }),
}));

export const projectEventRelations = relations(projectEvents, ({ one }) => ({
  project: one(projects, {
    fields: [projectEvents.projectId],
    references: [projects.id],
  }),
  createdByUser: one(user, {
    fields: [projectEvents.createdBy],
    references: [user.id],
  }),
}));

export const punchItemRelations = relations(punchItems, ({ one }) => ({
  project: one(projects, {
    fields: [punchItems.projectId],
    references: [projects.id],
  }),
  phase: one(projectPhases, {
    fields: [punchItems.phaseId],
    references: [projectPhases.id],
  }),
  assignee: one(user, {
    fields: [punchItems.assigneeId],
    references: [user.id],
  }),
  creator: one(user, {
    fields: [punchItems.createdBy],
    references: [user.id],
  }),
}));

export type Project = typeof projects.$inferSelect;
export type ProjectPhase = typeof projectPhases.$inferSelect;
export type CrewAssignment = typeof crewAssignments.$inferSelect;
export type DailyLog = typeof dailyLogs.$inferSelect;
export type ProjectEvent = typeof projectEvents.$inferSelect;
export type PunchItem = typeof punchItems.$inferSelect;
