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

import { CREW_ASSIGNMENT_ROLES, PHASE_STATUSES, PROJECT_STATUSES } from "../../lib/status-rules.js";
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

export const projectRelations = relations(projects, ({ one, many }) => ({
  projectManager: one(user, {
    fields: [projects.projectManagerId],
    references: [user.id],
  }),
  phases: many(projectPhases),
  crewAssignments: many(crewAssignments),
}));

export const projectPhaseRelations = relations(projectPhases, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectPhases.projectId],
    references: [projects.id],
  }),
  crewAssignments: many(crewAssignments),
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

export type Project = typeof projects.$inferSelect;
export type ProjectPhase = typeof projectPhases.$inferSelect;
export type CrewAssignment = typeof crewAssignments.$inferSelect;
